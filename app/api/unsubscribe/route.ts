import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUnsubscribeToken, verifyUnsubscribeHmac } from '@/lib/constants/unsubscribe'

// Phase 11 exception: public unsubscribe must work without session.
// This Route Handler uses service_role to delete the subscription after HMAC verification.
// It is intentionally outside app/(admin)/ and creates its own service client —
// the only sanctioned non-admin service-role usage (see plan 11-06).

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new NextResponse('Missing token', { status: 400 })

  const parsed = verifyUnsubscribeToken(token)
  if (!parsed) return new NextResponse('Invalid token', { status: 403 })

  const { subscriptionId, hmac } = parsed

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!supabaseUrl || !serviceKey) return new NextResponse('Server misconfigured', { status: 500 })

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // New preferences model: token may be userId-based (hamming userId:userId) or legacy subscriptionId-based.
  // Try preferences first: verify HMAC as userId:userId.
  // If that matches a preferences row, delete the whole preferences row.
  // Otherwise fall back to legacy bip_subscriptions lookup.
  const { data: pref } = await admin.from('bip_alert_preferences').select('user_id').eq('user_id', subscriptionId).maybeSingle()
  if (pref) {
    const okPref = verifyUnsubscribeHmac(pref.user_id, pref.user_id, hmac)
    if (okPref) {
      const { error: delPrefErr } = await admin.from('bip_alert_preferences').delete().eq('user_id', pref.user_id)
      if (delPrefErr) return new NextResponse(delPrefErr.message, { status: 500 })
      return new NextResponse(
        `<html><body style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px;">
          <h1 style="color:#003399;">Unsubscribed</h1>
          <p>You have been unsubscribed from alerts. Manage alert preferences in your <a href="/student-dashboard" style="color:#003399;">dashboard</a>.</p>
          <p style="font-size:11px;color:#888;">BipHub · Independent project — not affiliated with the European Commission</p>
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } },
      )
    }
  }

  const { data: sub, error: fetchErr } = await admin.from('bip_subscriptions').select('id, user_id').eq('id', subscriptionId).maybeSingle()

  if (fetchErr || !sub) return new NextResponse('Subscription not found', { status: 404 })

  const ok = verifyUnsubscribeHmac(sub.user_id, subscriptionId, hmac)
  if (!ok) return new NextResponse('Invalid signature', { status: 403 })

  const { error: delErr } = await admin.from('bip_subscriptions').delete().eq('id', subscriptionId)
  if (delErr) return new NextResponse(delErr.message, { status: 500 })

  // One-click POST support (RFC 8058): also handle POST with List-Unsubscribe-Post
  return new NextResponse(
    `<html><body style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px;">
      <h1 style="color:#003399;">Unsubscribed</h1>
      <p>You have been unsubscribed from this alert. Manage remaining alerts in your <a href="/student-dashboard" style="color:#003399;">dashboard</a>.</p>
      <p style="font-size:11px;color:#888;">BipHub · Independent project — not affiliated with the European Commission</p>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  )
}

export async function POST(req: NextRequest) {
  // RFC 8058 one-click: POST with List-Unsubscribe=One-Click
  return GET(req)
}
