/**
 * BIP detail page query layer (Plan 01-07).
 *
 * getBipBySlug: single PostgREST relational embed query — avoids N+1 (PITFALLS Pitfall 21).
 * getAllPublishedSlugs: seed-only slugs for generateStaticParams.
 *
 * RLS enforces status='approved' for the anon key; only approved BIPs are visible.
 */
import { createClient } from '@/lib/supabase/server'

/**
 * The full shape returned by getBipBySlug, used across Phase 1 detail page
 * and reused by Phase 2 coordinator preview + Phase 3 admin review.
 */
export type BipDetail = {
  id: string
  slug: string
  title: string
  external_bip_id: string | null
  target_group: string | null
  description: string | null
  learning_outcomes: string | null
  virtual_component_description: string | null
  virtual_timing: string | null
  virtual_session_dates: string[] | null
  virtual_sessions_count: number | null
  virtual_duration_notes: string | null
  physical_start_date: string | null
  physical_end_date: string | null
  host_city: string | null
  ects_credits: number | null
  max_participants: number | null
  language_of_instruction: string | null
  language_level_min: string | null
  study_levels: string[]
  fees: string | null
  eligibility_notes: string | null
  how_to_apply_type: string | null
  how_to_apply_value: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  application_deadline: string | null
  green_travel: boolean
  inclusion_support: boolean
  is_seed: boolean
  status: string
  created_at: string
  subject_areas: string[]
  accommodation_notes: string | null
  card_image_path: string | null
  partner_institutions_only: boolean | null
  host_university: {
    id: string
    name: string
    country: string | null
    city: string | null
    erasmus_code: string | null
  } | null
  partners: Array<{
    id: string
    partner_name_raw: string | null
    partner_country_raw: string | null
    partner_erasmus_code_raw: string | null
    university_id: string | null
    university: {
      name: string
      country: string | null
      erasmus_code: string | null
    } | null
  }>
  attachments: Array<{
    id: string
    storage_path: string
    file_name: string
    mime_type: string
    kind: string
  }>
}

/**
 * Fetch a single BIP by slug with all relations embedded in ONE query.
 * Returns null if no approved BIP with the given slug exists.
 *
 * Pattern: host_university:universities!host_university_id (Pitfall 21)
 * Pattern: partners:bip_partner_universities (Pitfall 21)
 */
export async function getBipBySlug(slug: string): Promise<BipDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bips')
    .select(`
      id, slug, title, external_bip_id, target_group, description, learning_outcomes,
      virtual_component_description, virtual_timing, virtual_session_dates,
      virtual_sessions_count, virtual_duration_notes,
      physical_start_date, physical_end_date, host_city,
      ects_credits, max_participants, language_of_instruction, language_level_min,
      study_levels, fees, eligibility_notes,
      how_to_apply_type, how_to_apply_value,
      contact_name, contact_email, contact_phone, application_deadline,
      green_travel, inclusion_support, is_seed, status, created_at, subject_areas,
      accommodation_notes, partner_institutions_only, card_image_path,
      host_university:universities!host_university_id(id, name, country, city, erasmus_code),
      partners:bip_partner_universities(
        id, partner_name_raw, partner_country_raw, partner_erasmus_code_raw, university_id,
        university:universities(name, country, erasmus_code)
      ),
      attachments:bip_attachments(id, storage_path, file_name, mime_type, kind)
    `)
    .eq('slug', slug)
    .maybeSingle()

  // PGRST116 = "no rows" — treat as not found
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  if (!data) return null

  // Cast through unknown to handle the PostgREST embedded shape
  const raw = data as unknown as BipDetail
  return raw
}

/**
 * Fetch a single BIP by id with all relations embedded in ONE query.
 *
 * Mirrors `getBipBySlug` field-for-field so BipBody / BipSidebar / BipHeader
 * render against the same `BipDetail` shape. Used by Phase 3 admin review
 * (Plan 03-03) and admin edit (Plan 03-07).
 *
 * Returns null when no row matches (PGRST116) or on any non-fatal error.
 * Authorization is enforced by RLS:
 *   - The admin route group guards `app_metadata.role === 'admin'` at the layout,
 *     so the admin JWT triggers the `bips_select_own_or_approved` admin clause
 *     and returns all rows regardless of status.
 *   - For non-admin callers, RLS strips drafts/pending/rejected rows owned by
 *     someone else, returning null effectively.
 */
export async function getBipById(id: string): Promise<BipDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bips')
    .select(`
      id, slug, title, external_bip_id, target_group, description, learning_outcomes,
      virtual_component_description, virtual_timing, virtual_session_dates,
      virtual_sessions_count, virtual_duration_notes,
      physical_start_date, physical_end_date, host_city,
      ects_credits, max_participants, language_of_instruction, language_level_min,
      study_levels, fees, eligibility_notes,
      how_to_apply_type, how_to_apply_value,
      contact_name, contact_email, contact_phone, application_deadline,
      green_travel, inclusion_support, is_seed, status, created_at, subject_areas,
      accommodation_notes, partner_institutions_only, card_image_path,
      host_university:universities!host_university_id(id, name, country, city, erasmus_code),
      partners:bip_partner_universities(
        id, partner_name_raw, partner_country_raw, partner_erasmus_code_raw, university_id,
        university:universities(name, country, erasmus_code)
      ),
      attachments:bip_attachments(id, storage_path, file_name, mime_type, kind)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[getBipById] supabase error:', error.message)
    return null
  }

  if (!data) return null

  return data as unknown as BipDetail
}

/**
 * Returns all slugs where status='approved'.
 * Used by generateStaticParams to pre-render all published BIPs at build time.
 *
 * Uses a direct REST fetch (no cookies() dependency) so it works during
 * generateStaticParams which is called outside a request context.
 * Falls back to [] gracefully if Supabase is not reachable (CI builds).
 */
export async function getAllPublishedSlugs(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return []

  try {
    const res = await fetch(
      `${url}/rest/v1/bips?select=slug&status=eq.approved`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        // Short timeout for build-time — if Supabase isn't running locally, ISR handles all slugs
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!res.ok) return []
    const data = await res.json() as Array<{ slug: string }>
    return data.map((row) => row.slug)
  } catch {
    // Build-time: no Supabase available — ISR fallback handles all slugs at runtime
    return []
  }
}
