import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { BipFilterState } from './parseSearchParams'
import { PAGE_SIZE } from './parseSearchParams'

type BipsQuery = ReturnType<
  ReturnType<SupabaseClient<Database>['from']>['select']
>

/**
 * Apply BipFilterState to a chained .from('bips').select(...) query.
 * Pure: returns a new builder; does not mutate.
 *
 * RLS already enforces status='approved' for anon (see 01-02 RLS policy).
 * Admin all-listings (Phase 3) calls this with statusOverride='pending'|...
 */
export function applyFilters(
  query: BipsQuery,
  filters: BipFilterState,
  opts: { statusOverride?: 'draft' | 'pending' | 'approved' | 'rejected' } = {},
): BipsQuery {
  let q = query

  // BROW-02 Country (filters host_university.country, OR'd via PostgREST .in())
  if (filters.country && filters.country.length > 0) {
    const upper = filters.country.map((c) => c.toUpperCase())
    q = q.in('host_university.country', upper)
  }

  // BROW-03 Field — array overlap on subject_areas (the canonical field ids).
  // A BIP can carry multiple fields; a row matches if ANY of its fields is in
  // the selected set. Same column the homepage counts key off (getBipCountsByField).
  if (filters.field && filters.field.length > 0) {
    q = q.overlaps('subject_areas', filters.field)
  }

  // BROW-04 Language
  // Values are already lowercase ISO 639-1 (Zod-validated; the DB stores them lowercase per
  // 01-02 schema comment line 266 and 01-03 seed lines 115, 212-213). DO NOT call .toUpperCase()
  // here — that produces 'EN'/'DE'/etc which never match the lowercase DB rows (BROW-04 zero-results bug).
  if (filters.lang && filters.lang.length > 0) {
    q = q.in('language_of_instruction', filters.lang)
  }

  // BROW-05 Date range (physical_start_date overlaps with [dateFrom, dateTo])
  if (filters.dateFrom) q = q.gte('physical_start_date', filters.dateFrom)
  if (filters.dateTo) q = q.lte('physical_start_date', filters.dateTo)

  // BROW-07 Status (open = future deadline; closed = past)
  if (filters.status === 'open') {
    q = q.gte('application_deadline', new Date().toISOString().split('T')[0])
  } else if (filters.status === 'closed') {
    q = q.lt('application_deadline', new Date().toISOString().split('T')[0])
  }

  // BROW-08 Study level (Postgres array overlap on study_levels text[])
  if (filters.level && filters.level.length > 0) {
    q = q.overlaps('study_levels', filters.level)
  }

  // BROW-15 Partner filter (?partnerOnly=exclude → hide partner-only, =only → show only partner-only)
  if (filters.partnerOnly === 'exclude') {
    q = q.eq('partner_institutions_only', false)
  } else if (filters.partnerOnly === 'only') {
    q = q.eq('partner_institutions_only', true)
  }

  // BROW-09 Full-text search via the search_vector tsvector + GIN index from 01-02
  if (filters.q) {
    q = q.textSearch('search_vector', filters.q, { type: 'websearch', config: 'english' })
  }

  // Status default: 'approved' for public; admin can override
  q = q.eq('status', opts.statusOverride ?? 'approved')

  // BROW-10 Sort
  if (filters.sort === 'deadline-soonest') {
    q = q.order('application_deadline', { ascending: true, nullsFirst: false })
  } else if (filters.sort === 'newest') {
    q = q.order('created_at', { ascending: false })
  } else if (filters.sort === 'alphabetical') {
    q = q.order('title', { ascending: true })
  }

  // BROW-13 Pagination
  const offset = (filters.page - 1) * PAGE_SIZE
  q = q.range(offset, offset + PAGE_SIZE - 1)

  return q
}
