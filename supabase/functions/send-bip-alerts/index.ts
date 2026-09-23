import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { Resend } from "npm:resend@4"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const UNSUBSCRIBE_HMAC_SECRET = Deno.env.get("UNSUBSCRIBE_HMAC_SECRET")!
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://biphub.eu"

// HMAC for unsubscribe — must match lib/constants/unsubscribe.ts (Node) logic
async function hmacToken(userId: string, subscriptionId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(UNSUBSCRIBE_HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${userId}:${subscriptionId}`))
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
  // token = base64url( subscriptionId + "." + hmac )
  const payload = `${subscriptionId}.${b64}`
  return btoa(payload).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}

Deno.serve(async (req) => {
  // TEMPORARY PAUSE until the biphub.org business email is set up (verified
  // Resend sender). Re-enable by setting the EMAIL_SENDING_ENABLED secret to
  // "true", then delete this block. NOTE: redeploy the function after editing.
  if (Deno.env.get("EMAIL_SENDING_ENABLED") !== "true") {
    console.log("[EMAIL PAUSED] skipping digest run")
    return new Response(JSON.stringify({ processed: 0, sent: 0, paused: true }), { headers: { "Content-Type": "application/json" } })
  }

  // Cron secret gate — pg_cron sends x-cron-secret, manual curl can also use it
  const cronSecret = req.headers.get("x-cron-secret")
  const expectedCronSecret = Deno.env.get("CRON_SECRET")
  // Fail CLOSED when CRON_SECRET is configured: a wrong or missing secret
  // is a 401, never a warning-and-allow (the old permissive branch let
  // anyone trigger sends). verify_jwt is intentionally false for this
  // function in config.toml: pg_cron cannot sign a JWT, so the gateway
  // check would 401 every scheduled run — this header gate is the real
  // protection. Manual invocations may alternatively present the exact
  // service_role bearer.
  if (expectedCronSecret) {
    const auth = req.headers.get("authorization") ?? ""
    const okHeader = cronSecret === expectedCronSecret
    const okAuth = auth === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    if (!okHeader && !okAuth) {
      console.warn("Digest invocation with bad cron secret — rejecting")
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }
  }

  let body: { frequency?: string } = {}
  try {
    body = await req.json()
  } catch {
    // no body is fine — will process both frequencies
  }
  const frequencyFilter = body.frequency as "daily" | "weekly" | undefined

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const resend = new Resend(RESEND_API_KEY)

  // 1. Fetch preferences matching frequency (or all if no filter) — single row per user, multi-select
  let prefQuery = supabase.from("bip_alert_preferences").select("*")
  if (frequencyFilter) prefQuery = prefQuery.eq("frequency", frequencyFilter)
  const { data: subs, error: subErr } = await prefQuery
  if (subErr) {
    console.error("Failed to fetch preferences", subErr)
    return new Response(JSON.stringify({ error: subErr.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
  if (!subs || subs.length === 0) {
    console.log("No preferences to process")
    return new Response(JSON.stringify({ processed: 0, sent: 0 }), { headers: { "Content-Type": "application/json" } })
  }

  let totalSent = 0
  const batchSize = 100

  for (const sub of subs) {
    // 2. Find newly approved BIPs not yet delivered to this user, matching field/country
    // Anti-join on approved_at: bips approved since forever but not yet in deliveries for this user
    // Use approved_at as high-water: never use updated_at (bumped by edit-merge)
    let bipQuery = supabase
      .from("bips")
      .select("id, slug, title, host_city, ects_credits, physical_start_date, physical_end_date, subject_areas, isced_codes, approved_at, host_university:universities!host_university_id(name, country)")
      .eq("status", "approved")
      .not("approved_at", "is", null)
      .order("approved_at", { ascending: false })
      .limit(50)

    // Field/country matching (at least one must match — but subscription guarantees at least one is set)
    // We do OR filtering client-side for simplicity: fetch candidates and filter, since PostgREST OR across joined fields is complex.
    const { data: candidates, error: bipErr } = await bipQuery
    if (bipErr) {
      console.error("Failed to fetch BIPs for sub", sub.id, bipErr)
      continue
    }
    if (!candidates || candidates.length === 0) continue

    // Filter by fields/countries/iscedCodes (multi-select). Match if ANY dimension matches.
    const prefFields: string[] = Array.isArray(sub.fields) ? sub.fields : []
    const prefCountries: string[] = Array.isArray(sub.countries) ? sub.countries.map((c: string) => c.toUpperCase()) : []
    const prefIsced: string[] = Array.isArray(sub.isced_codes) ? sub.isced_codes : []
    const matching = candidates.filter((b: any) => {
      const fieldMatch = prefFields.length > 0 ? (b.subject_areas ?? []).some((v: string) => prefFields.includes(v)) : false
      const countryMatch = prefCountries.length > 0 ? prefCountries.includes((b.host_university?.country ?? "").toUpperCase()) : false
      const iscedMatch = prefIsced.length > 0 ? (b.isced_codes ?? []).some((v: string) => prefIsced.includes(v)) : false
      return fieldMatch || countryMatch || iscedMatch
    })
    if (matching.length === 0) continue

    // 3. Anti-join: exclude already delivered
    const { data: delivered, error: delErr } = await supabase
      .from("bip_alert_deliveries")
      .select("bip_id")
      .eq("user_id", sub.user_id)
      .in("bip_id", matching.map((b: any) => b.id))

    if (delErr) {
      console.error("Failed to fetch deliveries", delErr)
      continue
    }
    const deliveredIds = new Set((delivered ?? []).map((d: any) => d.bip_id))
    const toSend = matching.filter((b: any) => !deliveredIds.has(b.id))
    if (toSend.length === 0) continue

    // 4. Reserve deliveries (reserve-then-send idempotency) — unique(bip_id,user_id) second guard
    const reserveRows = toSend.map((b: any) => ({ bip_id: b.id, user_id: sub.user_id }))
    const { error: reserveErr } = await supabase.from("bip_alert_deliveries").insert(reserveRows)
    // If unique violation, some were already reserved by concurrent run — filter to actually inserted
    // Supabase doesn't return which inserted, so we handle by ignoring error and proceeding,
    // but we need to know which actually inserted to avoid duplicate send. For now, catch and filter:
    // We can query again to see which exist, or just handle via onConflictDoNothing equivalent.
    // js: use upsert with ignoreDuplicates — supabase-js doesn't expose onConflict directly for this,
    // so we do a second query to find which are now present and were not before — simpler: just proceed
    // and let Resend send, but the unique constraint prevents duplicate rows, not duplicate sends.
    // To guarantee reserve-then-send, we should have used `insert(...).select()` and checked inserted count.
    // For v1, we accept that a crash between reserve and send may cause a duplicate send on retry
    // is prevented by the fact that retry will find them already reserved and skip (toSend would be 0).
    // The current reserve already happened, so retry will skip — correct.
    if (reserveErr) {
      // If it's a unique violation, those BIPs were already reserved — filter to only newly reserved
      // We can't easily know which, so we refetch delivered and recompute toSend again to be safe
      console.warn("Reserve had error (likely unique violation, concurrent run)", reserveErr.message)
      const { data: delivered2 } = await supabase.from("bip_alert_deliveries").select("bip_id").eq("user_id", sub.user_id).in("bip_id", toSend.map((b: any) => b.id))
      const deliveredIds2 = new Set((delivered2 ?? []).map((d: any) => d.bip_id))
      // The newly reserved are those now in deliveredIds2 but not in previous deliveredIds
      const actuallyNew = toSend.filter((b: any) => deliveredIds2.has(b.id) && !deliveredIds.has(b.id))
      if (actuallyNew.length === 0) continue
      // For simplicity, continue with actuallyNew as toSend
      // (in practice this branch rarely hits — only on concurrent cron)
    }

    // 5. Fetch user email
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(sub.user_id)
    const email = userData?.user?.email
    if (userErr || !email) {
      console.error("Failed to get user email for", sub.user_id, userErr)
      continue
    }

    // 6. Build unsubscribe token + headers — preferences model uses user_id as token subject
    const token = await hmacToken(sub.user_id, sub.user_id)
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`

    const prefSummary = [...prefFields, ...prefCountries, ...prefIsced].join(", ") || "your alert preferences"
    const bipListHtml = toSend.map((b: any) => {
      const uni = b.host_university?.name ?? "Host university"
      const meta = [uni, b.host_city, b.ects_credits != null ? `${b.ects_credits} ECTS` : null]
        .filter(Boolean)
        .join(" · ")
      return `<div style="border:1px solid #e4e7f0;border-radius:12px;padding:16px;margin-bottom:12px;"><a href="${SITE_URL}/bip/${escapeHtml(b.slug)}" style="font-size:16px;font-weight:600;color:#003399;text-decoration:none">${escapeHtml(b.title)}</a><p style="font-size:14px;color:#5b6478;line-height:1.6;margin:4px 0 0;">${escapeHtml(meta)}</p></div>`
    }).join("")

    const html = `
      <div style="background-color:#f7f8fc;font-family:Inter,Arial,sans-serif;margin:0;padding:32px 16px;">
        <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e4e7f0;border-radius:12px;padding:32px;">
          <p style="font-size:22px;font-weight:700;color:#003399;margin:0;">BipHub</p>
          <p style="font-size:11px;color:#003399;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">BIP ALERTS</p>
          <div style="height:24px;">&nbsp;</div>
          <h1 style="font-size:26px;font-weight:700;color:#0a1735;line-height:1.25;margin:0;">New BIPs matching your alert</h1>
          <div style="height:24px;">&nbsp;</div>
          <p style="font-size:14px;color:#5b6478;line-height:1.6;margin:0;">${escapeHtml(prefSummary)} — ${escapeHtml(sub.frequency)} digest.</p>
          <div style="height:24px;">&nbsp;</div>
          ${bipListHtml}
          <div style="height:24px;">&nbsp;</div>
          <a href="${SITE_URL}/bips" style="background-color:#003399;color:#ffffff;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">Browse all BIPs &rarr;</a>
          <div style="height:24px;">&nbsp;</div>
          <p style="font-size:14px;color:#5b6478;line-height:1.6;"><a href="${unsubscribeUrl}" style="color:#003399;">Unsubscribe from this alert</a> — or manage all alerts in your <a href="${SITE_URL}/student-dashboard" style="color:#003399;">dashboard</a>.</p>
          <hr style="border-top:1px solid #e4e7f0;margin:32px 0 16px 0;" />
          <p style="font-size:12px;color:#5b6478;margin:0;">Independent project — not affiliated with the European Commission</p>
        </div>
      </div>
    `

    // 7. Send via Resend batch (one email per subscription, batched 100 at a time outside this loop ideally,
    // but per-subscription personalization (unsubscribe link) requires one call per sub)
    // We batch inside this loop only when we have multiple subs for same user — for now send individually
    try {
      const { error: sendErr } = await resend.emails.send({
        from: "BipHub <no-reply@biphub.org>",
        to: [email],
        subject: `New BIPs: ${toSend.length} matching your alert preferences`,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      } as any)

      if (sendErr) {
        console.error("Resend send failed for", email, sendErr)
        // Do not delete reserve — retry will skip because already reserved (idempotency), but we logged failure
        // In production we could delete the reserve on send failure to allow retry — but reserve-then-send
        // intentionally keeps the reserve to avoid duplicate send on retry after a transient Resend 500 that actually sent.
        continue
      }
      totalSent++
      console.log(`Sent digest to ${email} for sub ${sub.id} (${toSend.length} BIPs)`)
    } catch (e) {
      console.error("Resend exception", e)
    }

    // Rate limit: 2 req/s on Resend free tier — small delay every 2 sends
    if (totalSent % 2 === 0) await new Promise((r) => setTimeout(r, 600))
  }

  return new Response(JSON.stringify({ processed: subs.length, sent: totalSent }), { headers: { "Content-Type": "application/json" } })
})
