---
phase: 01-discovery-foundation
plan: "02"
subsystem: database-schema
tags: [supabase, postgres, rls, full-text-search, unaccent, migrations, typescript-types, domain-types]
dependency_graph:
  requires:
    - "01-01 (walking-skeleton bips table, supabase client factories)"
  provides:
    - supabase/migrations/00002–00007 (complete Phase 1 schema applied to local Supabase)
    - lib/supabase/database.types.ts (generated types — all 4 tables)
    - lib/types/bip.ts (domain type contracts — Bip, BipWithRelations, University, etc.)
    - lib/isced.ts (8-category ISCED-F constant)
    - lib/countries.ts (33 Erasmus+ countries, getCountryFlagEmoji)
  affects:
    - Plan 01-03 (seed catalog imports University type + ERASMUS_COUNTRIES)
    - Plan 01-05 (homepage imports ISCED_FIELDS, ERASMUS_COUNTRIES, BipWithRelations)
    - Plan 01-06 (/bips imports same + BipStatus, StudyLevel)
    - Plan 01-07 (/bip/[slug] imports BipWithRelations, getCountryFlagEmoji)
tech_stack:
  added:
    - "unaccent Postgres extension (native FTS accent stripping)"
    - "immutable_unaccent() wrapper function (required for GENERATED ALWAYS AS STORED)"
  patterns:
    - "GENERATED ALWAYS AS ... STORED for search_vector (auto-maintained tsvector)"
    - "app_metadata.role mirror via Postgres trigger (JWT-based role check without DB round-trip)"
    - "Partial indexes on status='approved' (optimized for public read path)"
    - "PostgREST relational embedding compatible FK indexes on bips.host_university_id"
key_files:
  created:
    - supabase/migrations/00002_universities_profiles.sql
    - supabase/migrations/00003_bips_full_schema.sql
    - supabase/migrations/00004_bip_partner_universities.sql
    - supabase/migrations/00005_full_text_search.sql
    - supabase/migrations/00006_rls_policies.sql
    - supabase/migrations/00007_indexes.sql
    - lib/supabase/database.types.ts
    - lib/types/bip.ts
    - lib/isced.ts
    - lib/countries.ts
  modified:
    - supabase/migrations/00005_full_text_search.sql (bug fix: immutable_unaccent wrapper)
decisions:
  - "immutable_unaccent() wrapper function required — unaccent() is STABLE not IMMUTABLE; GENERATED ALWAYS AS STORED requires all expressions to be IMMUTABLE"
  - "search_vector weights: title=A, description=B, host_city=C (most specific to least specific)"
  - "coordinator UPDATE on bips restricted to draft/pending status only — WITH CHECK prevents self-promotion to approved/rejected"
  - "bip_partner_universities uses FOR ALL policy for admins (covers INSERT/UPDATE/DELETE in one policy with WITH CHECK)"
  - "partial indexes filtered on status='approved' for all public filter paths (smaller index, faster scans)"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-09T01:00:00Z"
  tasks_completed: 3/3
  files_created: 10
  files_modified: 1
---

# Phase 1 Plan 02: Complete Phase 1 Data Model Summary

Complete Erasmus+ BIP database schema — four tables, full RLS policy set with USING + WITH CHECK on every UPDATE policy, unaccent full-text search, 7 composite indexes, and generated TypeScript types with domain helper modules for all downstream Phase 1 plans.

## What Was Built

### Task 1 — Six migration files (commit `670437a`, amended by `612aa72` for 00005 bug fix)

#### `00002_universities_profiles.sql`
- `universities` table: id, name, country (ISO 3166-1 alpha-2), city, erasmus_code (unique), website_url, created_at
- `profiles` table: id (FK → auth.users CASCADE), full_name, contact_email, university_id (FK → universities), role (coordinator|admin), created_at, updated_at
- RLS enabled on both tables
- `sync_role_to_app_metadata()` trigger: mirrors `profiles.role` → `auth.users.raw_app_meta_data.role` so RLS can read role from JWT without a DB round-trip per request

#### `00003_bips_full_schema.sql`
All 12 added Erasmus+ fields from FEATURES.md plus standard BIP fields via ALTER TABLE:

| Field | Type | Notes |
|-------|------|-------|
| `description` | text | |
| `learning_outcomes` | text | |
| `virtual_component_description` | text | |
| `virtual_timing` | text | check in ('before','during','after','before_and_after','mixed') |
| `virtual_sessions_count` | integer | nullable |
| `virtual_duration_notes` | text | |
| `physical_start_date` | date | |
| `physical_end_date` | date | |
| `application_deadline` | date | |
| `host_city` | text | |
| `ects_credits` | integer | check >= 3 |
| `max_participants` | integer | check 1..30 |
| `language_of_instruction` | text | ISO 639-1 |
| `language_level_min` | text | CEFR A1–C2 |
| `subject_area` | text | ISCED group id |
| `isced_f_code` | text | 4-digit ISCED-F 2013 |
| `study_levels` | text[] | default '{}', constrained via <@ operator |
| `partner_institutions_only` | boolean | default false |
| `green_travel` | boolean | default false |
| `inclusion_support` | boolean | default false |
| `accommodation_notes` | text | |
| `eligibility_notes` | text | |
| `contact_name` | text | |
| `contact_email` | text | |
| `how_to_apply_type` | text | check in ('url','contact') |
| `how_to_apply_value` | text | |
| `host_university_id` | uuid | FK → universities RESTRICT |
| `created_by` | uuid | FK → auth.users SET NULL |
| `published_at` | timestamptz | |
| `updated_at` | timestamptz | auto-updated by trigger |

Plus `touch_updated_at()` trigger for Phase 2 optimistic locking (PITFALLS Pitfall 17).

#### `00004_bip_partner_universities.sql`
Junction table: bip_id (FK → bips CASCADE), university_id (FK → universities SET NULL), partner_name_raw, partner_erasmus_code_raw, partner_country_raw. Constraint: university_id OR partner_name_raw must be non-null. RLS enabled.

#### `00005_full_text_search.sql`
- `unaccent` extension installed
- `immutable_unaccent(text)` wrapper function (IMMUTABLE, parallel safe) — required because unaccent() is STABLE by default and GENERATED ALWAYS AS STORED requires IMMUTABLE
- `search_vector tsvector` GENERATED ALWAYS AS STORED with weighted fields (title=A, description=B, host_city=C)
- `bips_search_idx` GIN index

#### `00006_rls_policies.sql`
Full policy set for all 4 tables. Every UPDATE policy has both USING and WITH CHECK (FOUN-01 spine):

**universities:** select (public), insert/update/delete (admin only)
**profiles:** select (own or admin), insert (own), update (own or admin — WITH CHECK enforces row identity preservation)
**bips:** select approved (anon, from 00001) + select own or admin (authenticated), insert (coordinator owns row), update own draft/pending (coordinator — WITH CHECK prevents status escalation + ownership reassignment), update admin, delete own draft, delete admin
**bip_partner_universities:** select public (via approved BIP join), select own or admin, insert own, update own (WITH CHECK), delete own, admin all (WITH CHECK)

#### `00007_indexes.sql`
7 indexes for filter performance and FK joins:
- `bips_status_deadline_idx` (status, application_deadline WHERE status='approved') — D-03 default sort
- `bips_status_subject_idx` (status, subject_area WHERE status='approved') — BROW-03
- `bips_status_country_idx` (status, host_university_id WHERE status='approved') — BROW-02
- `bips_status_language_idx` (status, language_of_instruction WHERE status='approved') — BROW-04
- `bips_status_created_idx` (status, created_at desc WHERE status='approved') — newest sort
- `bips_host_university_idx` (host_university_id) — PostgREST relational embedding (PITFALLS Pitfall 21)
- `bips_created_by_status_idx` (created_by, status) — coordinator dashboard + RLS policy column

### Task 2 — Schema push verification (no files, all automated checks)

All 7 migrations applied cleanly via `npx supabase db reset`.

**RLS verification:** All 4 tables `relrowsecurity = true`

**UPDATE policy audit (FOUN-01 spine):**

| Policy | Table | has_using | has_with_check |
|--------|-------|-----------|----------------|
| bip_partners_update_own | bip_partner_universities | true | true |
| bips_update_admin | bips | true | true |
| bips_update_own_draft_or_pending | bips | true | true |
| profiles_update_own_or_admin | profiles | true | true |
| universities_update_admin | universities | true | true |

All 5 UPDATE policies have both USING and WITH CHECK. Zero Pitfall 5 violations.

**FTS smoke test (BROW-09):** Inserted row with title "Studieren in München mit Łódź", queried with `plainto_tsquery('simple', immutable_unaccent('Munchen'))` — returned 1 row (slug='fts-test-row'). "Munchen" → "München" resolves correctly.

**RLS isolation test (T-02-05):** Inserted pending row via service role, queried via anon publishable key — REST response contained only the `approved` skeleton-canary row. Pending row was not disclosed.

### Task 3 — Generated types and domain helpers (commit `612aa72`)

**`lib/supabase/database.types.ts`** — Generated from live local schema. Contains `export type Database` with all 4 tables (bips, universities, profiles, bip_partner_universities) and all 12+ added Erasmus+ field names (confirmed: 39 occurrences of the 12 field names across Row/Insert/Update types).

**`lib/types/bip.ts`** — 12 domain type exports:
```typescript
export type Bip = Database['public']['Tables']['bips']['Row']
export type BipInsert = Database['public']['Tables']['bips']['Insert']
export type BipUpdate = Database['public']['Tables']['bips']['Update']
export type University = Database['public']['Tables']['universities']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type BipPartner = Database['public']['Tables']['bip_partner_universities']['Row']
export type BipWithRelations = Bip & { host_university: ..., partners: [...] }
export type BipStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export type StudyLevel = 'bachelor' | 'master' | 'phd'
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type VirtualTiming = 'before' | 'during' | 'after' | 'before_and_after' | 'mixed'
export type HowToApplyType = 'url' | 'contact'
```

**`lib/isced.ts`** — 8-category ISCED-F constant (engineering, business, sciences, arts, health, social-sciences, environment, humanities). Exports `ISCED_FIELDS`, `IscedField`, `IscedFieldId`, `ISCED_FIELD_BY_ID`.

**`lib/countries.ts`** — 33 Erasmus+ countries with ISO alpha-2 codes and English names. Exports `ERASMUS_COUNTRIES` (length=33), `ERASMUS_COUNTRY_CODES`, `ErasmusCountryCode`, `getCountryName()`, `isErasmusCountry()`, `getCountryFlagEmoji()`. Canonical property is `code` (not `iso2` — locked contract).

## Importable Contracts

| Export | File | Consumed By |
|--------|------|-------------|
| `Database` | `lib/supabase/database.types.ts` | `lib/types/bip.ts` (base) |
| `Bip`, `BipInsert`, `BipUpdate`, `BipWithRelations` | `lib/types/bip.ts` | 01-03, 01-05, 01-06, 01-07 |
| `University`, `Profile`, `BipPartner` | `lib/types/bip.ts` | 01-03, 01-06, 01-07 |
| `BipStatus`, `StudyLevel`, `CEFRLevel` | `lib/types/bip.ts` | 01-06, 01-07, 01-08 |
| `ISCED_FIELDS`, `IscedFieldId` | `lib/isced.ts` | 01-05 (CategoriesBar), 01-06 (filter) |
| `ERASMUS_COUNTRIES`, `ERASMUS_COUNTRY_CODES` | `lib/countries.ts` | 01-05 (map), 01-06 (filter) |
| `getCountryName`, `getCountryFlagEmoji` | `lib/countries.ts` | 01-07 (detail page, OG image) |

## Build and Lint Status

| Check | Status |
|-------|--------|
| `npm run build` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0, no warnings) |
| `npx supabase db reset` | PASS (all 7 migrations applied) |
| All 4 tables RLS enabled | PASS |
| All UPDATE policies have USING + WITH CHECK | PASS (5/5) |
| FTS smoke test (Munchen → München) | PASS |
| GIN index `bips_search_idx` exists | PASS |
| Anon REST hides non-approved rows | PASS |
| `lib/supabase/database.types.ts` has all 12 added fields | PASS (39 occurrences) |
| `lib/types/bip.ts` exports 12 symbols | PASS |
| `lib/countries.ts` exports `code` (not `iso2`) | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `unaccent()` not IMMUTABLE — GENERATED ALWAYS AS STORED fails**
- **Found during:** Task 2 — `npx supabase db reset` with error "generation expression is not immutable (SQLSTATE 42P17)"
- **Issue:** Postgres requires all functions in a GENERATED ALWAYS AS ... STORED expression to be marked IMMUTABLE. `unaccent()` is STABLE by default (not IMMUTABLE), so the stored generated column definition was rejected.
- **Fix:** Added `immutable_unaccent(text)` wrapper function to `00005_full_text_search.sql` marked `IMMUTABLE PARALLEL SAFE`. This is standard Postgres practice for using unaccent in generated columns/indexes.
- **Files modified:** `supabase/migrations/00005_full_text_search.sql`
- **Commit:** `612aa72`
- **Security note:** The IMMUTABLE marking is safe — `unaccent()` does only text normalization with no side effects or environment-sensitive behavior. The wrapper does not bypass any RLS boundary.

## Threat Flags

None — all threats T-02-01 through T-02-08 from the plan's threat model are mitigated:
- T-02-01: RLS enabled on all 4 tables (verified via pg_class query)
- T-02-02: bips_update_own_draft_or_pending WITH CHECK enforces created_by = auth.uid() (ownership theft blocked)
- T-02-03: profiles_update_own_or_admin WITH CHECK enforces row identity (role escalation blocked)
- T-02-04: bip_partners_update_own has both USING and WITH CHECK on BIP ownership
- T-02-05: Anon REST isolation test passed (pending rows not disclosed)
- T-02-06: No views created in Phase 1 (deferred to Phase 3 with security_invoker=true)
- T-02-07: 7 composite indexes created for filter + FK performance
- T-02-08: `is_seed` not referenced in any RLS policy (confirmed zero occurrences in 00006)

## Known Stubs

None — this plan creates schema infrastructure and data contracts. No UI components were built.

## Self-Check: PASSED

### Files Verified

- [x] `supabase/migrations/00002_universities_profiles.sql` — exists, contains universities/profiles tables, sync_role_to_app_metadata trigger, raw_app_meta_data
- [x] `supabase/migrations/00003_bips_full_schema.sql` — exists, contains all 12 Erasmus+ added fields
- [x] `supabase/migrations/00004_bip_partner_universities.sql` — exists, contains partner_name_raw, bip_id FK, RLS enable
- [x] `supabase/migrations/00005_full_text_search.sql` — exists, contains immutable_unaccent, generated always as, using gin
- [x] `supabase/migrations/00006_rls_policies.sql` — exists, 5 UPDATE policies all with both USING and WITH CHECK
- [x] `supabase/migrations/00007_indexes.sql` — exists, 7 create index statements
- [x] `lib/supabase/database.types.ts` — exists, contains export type Database, all 4 tables, all 12+ added fields
- [x] `lib/types/bip.ts` — exists, exports 12 symbols
- [x] `lib/isced.ts` — exists, exports ISCED_FIELDS (8 entries)
- [x] `lib/countries.ts` — exists, exports ERASMUS_COUNTRIES (33 entries), getCountryFlagEmoji

### Commits Verified

- [x] `670437a` — feat(01-02): write all six migration files
- [x] `612aa72` — feat(01-02): generate database types and write domain helper modules

### Build/Lint

- [x] `npm run build` exits 0
- [x] `npm run lint` exits 0
