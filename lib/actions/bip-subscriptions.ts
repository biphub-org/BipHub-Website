"use server"

import { createClient } from "@/lib/supabase/server"
import { subscriptionSchema, alertPreferencesSchema } from "@/lib/schemas/bip-subscriptions"
import { ALERT_CONSENT_TEXT } from "@/lib/constants/bip-alerts"
import { revalidatePath } from "next/cache"

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const raw = data as unknown as { claims?: { sub?: unknown; claims?: { sub?: unknown } } } | null
  const claims = raw?.claims
  const sub = (claims?.sub as string | undefined) ?? ((claims?.claims as { sub?: unknown } | undefined)?.sub as string | undefined)
  if (typeof sub === "string") return sub
  const { data: userData } = await supabase.auth.getUser()
  return userData?.user?.id ?? null
}

// ── New preferences model (single row per user, multi-select) ──────────────

export type AlertPreferences = {
  user_id: string
  fields: string[]
  countries: string[]
  iscedCodes: string[]
  frequency: string
  consent_text: string
  updated_at: string
}

export async function getAlertPreferencesAction(): Promise<{ data: AlertPreferences | null; error?: string }> {
  const userId = await getUserId()
  if (!userId) return { data: null, error: "Not authenticated" }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("bip_alert_preferences")
    .select("user_id, fields, countries, isced_codes, frequency, consent_text, updated_at")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) return { data: null, error: error.message }
  if (!data) return { data: null }
  // Normalize snake_case -> camelCase for UI
  const row = data as unknown as Record<string, unknown>
  return {
    data: {
      user_id: row.user_id as string,
      fields: (row.fields as string[]) ?? [],
      countries: (row.countries as string[]) ?? [],
      iscedCodes: (row.isced_codes as string[]) ?? [],
      frequency: row.frequency as string,
      consent_text: row.consent_text as string,
      updated_at: row.updated_at as string,
    },
  }
}

export async function saveAlertPreferencesAction(input: { fields?: string[]; countries?: string[]; iscedCodes?: string[]; frequency?: string }) {
  const normalized = {
    fields: (input.fields ?? []).map((s) => s.trim()).filter(Boolean),
    countries: (input.countries ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean),
    iscedCodes: (input.iscedCodes ?? []).map((s) => s.trim()).filter(Boolean),
    frequency: input.frequency ?? "weekly",
  }
  const parsed = alertPreferencesSchema.safeParse(normalized)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" }

  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }

  const supabase = await createClient()

  // If all arrays empty, delete the preferences row (opt-out)
  if (parsed.data.fields.length === 0 && parsed.data.countries.length === 0 && parsed.data.iscedCodes.length === 0) {
    const { error } = await supabase.from("bip_alert_preferences").delete().eq("user_id", userId)
    if (error) return { error: error.message }
    revalidatePath("/student-dashboard")
    return { success: true }
  }

  const { error } = await supabase.from("bip_alert_preferences").upsert(
    {
      user_id: userId,
      fields: parsed.data.fields,
      countries: parsed.data.countries.map((c) => c.toUpperCase()),
      isced_codes: parsed.data.iscedCodes,
      frequency: parsed.data.frequency,
      consent_text: ALERT_CONSENT_TEXT,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
  if (error) return { error: error.message }
  revalidatePath("/student-dashboard")
  return { success: true }
}

export async function clearAlertPreferencesAction() {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }
  const supabase = await createClient()
  const { error } = await supabase.from("bip_alert_preferences").delete().eq("user_id", userId)
  if (error) return { error: error.message }
  revalidatePath("/student-dashboard")
  return { success: true }
}

// ── Deprecated per-row subscription actions (kept for backward compat, no-op) ─
// The old 5-cap, single field/country model is superseded by the preferences
// model above. These wrappers map the old call shape to the new table so
// existing e2e scripts don't hard-fail during the transition window.

export async function createSubscriptionAction(formData: { field?: string; country?: string; frequency?: string }) {
  const fields = formData.field ? [formData.field] : []
  const countries = formData.country ? [formData.country] : []
  // Merge with existing preferences (additive, so old tests that create 5 rows still produce a merged set)
  const existing = await getAlertPreferencesAction()
  const mergedFields = Array.from(new Set([...(existing.data?.fields ?? []), ...fields]))
  const mergedCountries = Array.from(new Set([...(existing.data?.countries ?? []), ...countries.map((c) => c.toUpperCase())]))
  const res = await saveAlertPreferencesAction({ fields: mergedFields, countries: mergedCountries, frequency: formData.frequency })
  if ('error' in res && res.error) return { error: res.error }
  return { data: { id: "preferences" } }
}

export async function updateSubscriptionAction(_id: string, frequency: string) {
  if (!["weekly", "daily"].includes(frequency)) return { error: "Invalid frequency" }
  const existing = await getAlertPreferencesAction()
  if (!existing.data) return { error: "No preferences to update" }
  return saveAlertPreferencesAction({ fields: existing.data.fields, countries: existing.data.countries, iscedCodes: existing.data.iscedCodes, frequency })
}

export async function deleteSubscriptionAction(_id: string) {
  // Deleting a single old subscription now clears the whole preferences set (single-row model).
  // This keeps the unsubscribe flow working without per-row semantics.
  return clearAlertPreferencesAction()
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
  const prefs = await getAlertPreferencesAction()
  if (prefs.error) return { data: [], error: prefs.error }
  if (!prefs.data) return { data: [] }
  // Expand the single preferences row back into the old per-row shape for legacy consumers (e.g. old edge function reads).
  // This keeps the old list UI working if still rendered, but the new UI uses getAlertPreferencesAction directly.
  const rows: SubscriptionRow[] = []
  // Represent as one row per distinct field/country combination for backward compat — simplest: one row reflecting the whole set.
  rows.push({
    id: "preferences",
    field: prefs.data.fields[0] ?? null,
    country: prefs.data.countries[0] ?? null,
    frequency: prefs.data.frequency,
    consent_text: prefs.data.consent_text,
    created_at: prefs.data.updated_at,
  })
  return { data: rows }
}
