"use server"

import { createClient } from "@/lib/supabase/server"
import { subscriptionSchema } from "@/lib/schemas/bip-subscriptions"
import { ALERT_SUBSCRIPTION_CAP, ALERT_CONSENT_TEXT } from "@/lib/constants/bip-alerts"
import { revalidatePath } from "next/cache"

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const raw = data as unknown as { claims?: { sub?: unknown; claims?: { sub?: unknown } } } | null
  const claims = raw?.claims
  const sub = (claims?.sub as string | undefined) ?? ((claims?.claims as { sub?: unknown } | undefined)?.sub as string | undefined)
  if (typeof sub === "string") return sub
  // Fallback: try getUser (requires JWT validation via getClaims already done)
  const { data: userData } = await supabase.auth.getUser()
  return userData?.user?.id ?? null
}

export async function createSubscriptionAction(formData: { field?: string; country?: string; frequency?: string }) {
  const parsed = subscriptionSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" }

  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }

  const supabase = await createClient()

  // 5-cap check
  const { count, error: countErr } = await supabase
    .from("bip_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  if (countErr) return { error: countErr.message }
  if ((count ?? 0) >= ALERT_SUBSCRIPTION_CAP) return { error: `Maximum ${ALERT_SUBSCRIPTION_CAP} active subscriptions` }

  const { data, error } = await supabase
    .from("bip_subscriptions")
    .insert({
      user_id: userId,
      field: parsed.data.field || null,
      country: parsed.data.country ? parsed.data.country.toUpperCase() : null,
      frequency: parsed.data.frequency,
      consent_text: ALERT_CONSENT_TEXT,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/student-dashboard")
  return { data }
}

export async function updateSubscriptionAction(id: string, frequency: string) {
  if (!["weekly", "daily"].includes(frequency)) return { error: "Invalid frequency" }
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }
  const supabase = await createClient()
  const { error } = await supabase
    .from("bip_subscriptions")
    .update({ frequency })
    .eq("id", id)
    .eq("user_id", userId)

  if (error) return { error: error.message }
  revalidatePath("/student-dashboard")
  return { success: true }
}

export async function deleteSubscriptionAction(id: string) {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }
  const supabase = await createClient()
  const { error } = await supabase.from("bip_subscriptions").delete().eq("id", id).eq("user_id", userId)
  if (error) return { error: error.message }
  revalidatePath("/student-dashboard")
  return { success: true }
}

type SubscriptionRow = {
  id: string
  field: string | null
  country: string | null
  frequency: string
  consent_text: string
  created_at: string
}

export async function listSubscriptionsAction(): Promise<{ data: SubscriptionRow[]; error?: string }> {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" as const, data: [] as SubscriptionRow[] }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("bip_subscriptions")
    .select("id, field, country, frequency, consent_text, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
  if (error) return { error: error.message, data: [] as SubscriptionRow[] }
  return { data: (data as SubscriptionRow[] | null) ?? [] }
}
