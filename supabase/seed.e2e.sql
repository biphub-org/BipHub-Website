-- =============================================================================
-- supabase/seed.e2e.sql — Playwright fixture seed (Plan 04-07 / D-13).
--
-- LOADED ONLY IN E2E MODE. The default `supabase db reset` does NOT pick
-- this up — it loads `seed.sql` only. The E2E setup script (tests/e2e/setup.ts)
-- and the CI workflow (.github/workflows/e2e.yml) apply this file explicitly
-- after `supabase db reset` to provision fixture users.
--
-- Users (all on the RFC-reserved @biphub.test domain):
--   1. e2e-coordinator@biphub.test       — verified + profile-complete
--   2. e2e-coordinator-fresh@biphub.test — verified, NO profile (forces /onboarding;
--                                          DESTRUCTIVELY consumed by auth.spec.ts)
--   3. e2e-admin@biphub.test             — app_metadata.role='admin'
--   4. e2e-student@biphub.test           — verified, role=student (Phase 5 / Plan 05-04)
--                                          NON-DESTRUCTIVE (not consumed by any spec;
--                                          student-auth.spec.ts signs in + signs out,
--                                          leaving the fixture intact for the next run)
--
-- The passwords here are DEMO PASSWORDS for local-only fixtures. gitleaks
-- allowlists this file path (.gitleaks.toml in Plan 04-04). Do NOT use
-- these passwords for anything outside the E2E suite. The @biphub.test
-- domain is RFC-reserved for testing — no risk of real mail delivery if a
-- fixture email leaks into a real send code path.
--
-- Idempotent on re-apply: delete-first cleanup at top wipes any prior
-- @biphub.test users (and the FK-cascading profiles + bip rows) before
-- re-inserting.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Step 0: idempotent cleanup
-- ----------------------------------------------------------------------------
-- Delete audit rows for fixture-owned BIPs BEFORE the BIPs themselves — the
-- bip_status_history.bip_id FK is ON DELETE SET NULL, so deleting BIPs first
-- would orphan (not remove) these rows and they'd accumulate on re-apply.
delete from public.bip_status_history
  where bip_id in (
    select id from public.bips
    where created_by in (
      select id from auth.users where email like '%@biphub.test'
    )
  );

delete from public.bips
  where created_by in (
    select id from auth.users where email like '%@biphub.test'
  );

delete from public.profiles where id in (
  select id from auth.users where email like '%@biphub.test'
);

delete from auth.users where email like '%@biphub.test';

-- ----------------------------------------------------------------------------
-- Step 1: insert 3 fixture users directly into auth.users.
--
-- Direct auth.users insert is the Supabase-local-supported method for
-- fixture seeding; production code must NEVER use this path — use
-- auth.admin.createUser via the Supabase Admin API instead.
-- ----------------------------------------------------------------------------

-- User 1: e2e-coordinator (verified, profile-complete)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'e2e-coordinator@biphub.test',
  crypt('Coordinator!Test1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now(), '', '', '', ''
);

-- User 2: e2e-coordinator-fresh (verified, NO profile — forces /onboarding;
-- this account is destructively consumed by auth.spec.ts's account-deletion test)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated',
  'e2e-coordinator-fresh@biphub.test',
  crypt('Fresh!Test1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now(), '', '', '', ''
);

-- User 3: e2e-admin (verified, role=admin in app_metadata).
-- Defense-in-depth: app_metadata.role is set both here AND propagated via
-- the migration 00002 / 00008 profiles.role trigger when the profile row is
-- inserted below — both paths converge on the same outcome.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated', 'authenticated',
  'e2e-admin@biphub.test',
  crypt('Admin!Test1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
  '{}'::jsonb,
  now(), now(), '', '', '', ''
);

-- ----------------------------------------------------------------------------
-- Step 2: profiles for users 1 and 3 (NOT user 2 — that's the "fresh"
-- coordinator with no profile, forcing /onboarding).
--
-- university_id resolves against `D MUNCHEN02` (TU München) — seeded by
-- supabase/seed.sql. erasmus_code values `TEST E2E01` / `TEST E2E03` are
-- non-overlapping with the demo seed's real Erasmus codes per Plan 01-03.
--
-- migration 00002's profiles_sync_role trigger mirrors profiles.role into
-- auth.users.raw_app_meta_data.role automatically; for the admin user, the
-- role is also set in the auth.users insert above (defense-in-depth).
-- ----------------------------------------------------------------------------
-- NOTE: migration 00015's handle_new_user trigger already materialises a
-- profiles row (id + default role) when the auth.users rows above are inserted.
-- These statements therefore UPSERT — they enrich the trigger-created row with
-- the fixture's full_name / contact_email / university_id / erasmus_code and the
-- correct role (admin's raw_user_meta_data is '{}', so the trigger defaulted it
-- to 'coordinator' — the do-update below corrects it to 'admin').
insert into public.profiles (id, full_name, contact_email, university_id, erasmus_code, role)
select
  '11111111-1111-1111-1111-111111111111',
  'E2E Coordinator',
  'e2e-coordinator@biphub.test',
  u.id,
  'TEST E2E01',
  'coordinator'
from public.universities u
where u.erasmus_code = 'D MUNCHEN02' limit 1
on conflict (id) do update set
  full_name = excluded.full_name,
  contact_email = excluded.contact_email,
  university_id = excluded.university_id,
  erasmus_code = excluded.erasmus_code,
  role = excluded.role;

insert into public.profiles (id, full_name, contact_email, university_id, erasmus_code, role)
select
  '33333333-3333-3333-3333-333333333333',
  'E2E Admin',
  'e2e-admin@biphub.test',
  u.id,
  'TEST E2E03',
  'admin'
from public.universities u
where u.erasmus_code = 'D MUNCHEN02' limit 1
on conflict (id) do update set
  full_name = excluded.full_name,
  contact_email = excluded.contact_email,
  university_id = excluded.university_id,
  erasmus_code = excluded.erasmus_code,
  role = excluded.role;

-- ----------------------------------------------------------------------------
-- Step 3: seed 2 pending BIPs owned by e2e-coordinator.
--
-- REQUIRED for admin-review.spec.ts. Both pending BIPs must exist at the
-- start of the admin specs because playwright.config.ts cannot order the
-- admin-authed project relative to the coordinator-authed project — the
-- admin spec runs WITHOUT first creating a submission via the wizard.
--
-- The approve test consumes `e2e-pending-machine-learning`; the reject test
-- consumes `e2e-pending-data-ethics`. After both tests run, both seeded
-- pending BIPs leave the pending queue. If a third admin test is added
-- later, extend this block with another pending BIP.
--
-- Required columns per 00001 + 00003: slug, title, status, plus the
-- following Phase 1 columns for a meaningfully-renderable BIP detail page.
-- ----------------------------------------------------------------------------
insert into public.bips (
  id, slug, title, status, is_seed,
  description, learning_outcomes, virtual_component_description, virtual_timing,
  physical_start_date, physical_end_date, application_deadline,
  host_city, ects_credits, max_participants,
  language_of_instruction, language_level_min,
  subject_area, isced_f_code,
  study_levels, green_travel, inclusion_support,
  contact_name, contact_email,
  how_to_apply_type, how_to_apply_value,
  host_university_id, created_by
)
select
  'e2e0bbbb-bbbb-bbbb-bbbb-000000000001',
  'e2e-pending-machine-learning',
  'E2E Pending: Machine Learning Foundations',
  'pending', false,
  'A 10-day BIP introducing ML foundations for engineering students. Covers supervised learning, linear models, basic neural networks, and a group project predicting urban mobility patterns from open data.',
  E'- Apply supervised learning algorithms to real datasets\n- Evaluate model performance using cross-validation\n- Communicate ML findings to non-specialist audiences',
  'Four online preparatory sessions (90 min each) covering Python tooling, scikit-learn, and a pre-arrival dataset exercise.',
  'before',
  '2026-10-15', '2026-10-25', '2026-09-01',
  'Munich', 4, 20,
  'en', 'B2',
  'computer-science', '0613',
  ARRAY['bachelor','master'], false, false,
  'E2E Coordinator', 'e2e-coordinator@biphub.test',
  'url', 'https://tu-berlin.example/apply',
  u.id,
  '11111111-1111-1111-1111-111111111111'
from public.universities u
where u.erasmus_code = 'D MUNCHEN02' limit 1;

insert into public.bips (
  id, slug, title, status, is_seed,
  description, learning_outcomes, virtual_component_description, virtual_timing,
  physical_start_date, physical_end_date, application_deadline,
  host_city, ects_credits, max_participants,
  language_of_instruction, language_level_min,
  subject_area, isced_f_code,
  study_levels, green_travel, inclusion_support,
  contact_name, contact_email,
  how_to_apply_type, how_to_apply_value,
  host_university_id, created_by
)
select
  'e2e0bbbb-bbbb-bbbb-bbbb-000000000002',
  'e2e-pending-data-ethics',
  'E2E Pending: Data Ethics in Practice',
  'pending', false,
  'A 10-day BIP exploring practical data ethics for emerging engineers and researchers — algorithmic bias, GDPR compliance, and ethical impact assessments.',
  E'- Apply ethical-review frameworks to AI/ML deployments\n- Critically analyse GDPR consent flows\n- Draft a Data Protection Impact Assessment',
  'Three online seminars covering ethics frameworks and pre-arrival readings.',
  'before',
  '2027-03-10', '2027-03-20', '2027-01-15',
  'Munich', 4, 18,
  'en', 'B2',
  'social-science', '0421',
  ARRAY['master','phd'], false, false,
  'E2E Coordinator', 'e2e-coordinator@biphub.test',
  'url', 'https://kuleuven.example/apply',
  u.id,
  '11111111-1111-1111-1111-111111111111'
from public.universities u
where u.erasmus_code = 'D MUNCHEN02' limit 1;

-- ----------------------------------------------------------------------------
-- Step 4: seed 1 rejected BIP owned by e2e-coordinator (for resubmit.spec.ts).
--
-- Exercises the rejected → revise → draft → resubmit loop closed after the
-- v1.0 milestone audit. The insert trigger (00010) auto-logs an
-- action_kind='submit' row; we additionally insert an explicit
-- action_kind='reject' row below so the coordinator dashboard renders the
-- rejection reason (DASH-05) via getLatestRejectionsByBipIds.
-- ----------------------------------------------------------------------------
insert into public.bips (
  id, slug, title, status, is_seed,
  description, learning_outcomes, virtual_component_description, virtual_timing,
  physical_start_date, physical_end_date, application_deadline,
  host_city, ects_credits, max_participants,
  language_of_instruction, language_level_min,
  subject_area, isced_f_code,
  study_levels, green_travel, inclusion_support,
  contact_name, contact_email,
  how_to_apply_type, how_to_apply_value,
  host_university_id, created_by
)
select
  'e2e0bbbb-bbbb-bbbb-bbbb-000000000003',
  'e2e-rejected-urban-design',
  'E2E Rejected: Urban Design Studio',
  'rejected', false,
  'A 10-day BIP on sustainable urban design — public space, mobility, and climate-adaptive planning, with a collaborative studio project on a real district brief.',
  E'- Produce a climate-adaptive district masterplan\n- Apply participatory design methods\n- Present proposals to a mixed stakeholder panel',
  'Two online kickoff sessions covering the brief and site analysis.',
  'before',
  '2027-05-12', '2027-05-22', '2027-03-20',
  'Munich', 4, 16,
  'en', 'B2',
  'engineering', '0731',
  ARRAY['master'], false, false,
  'E2E Coordinator', 'e2e-coordinator@biphub.test',
  'url', 'https://tum.example/apply',
  u.id,
  '11111111-1111-1111-1111-111111111111'
from public.universities u
where u.erasmus_code = 'D MUNCHEN02' limit 1;

-- Explicit reject audit row so the dashboard surfaces the rejection reason.
insert into public.bip_status_history
  (bip_id, from_status, to_status, actor_id, note, action_kind)
values (
  'e2e0bbbb-bbbb-bbbb-bbbb-000000000003',
  'pending', 'rejected',
  '33333333-3333-3333-3333-333333333333',
  'The virtual component needs at least three structured online sessions before the mobility week.',
  'reject'
);

-- ----------------------------------------------------------------------------
-- Step 5: Phase 5 — student fixture (user 4, Plan 05-04).
--
-- User 4: e2e-student@biphub.test (verified, role=student).
-- Magic-link only — password is kept non-null to satisfy the column shape
-- but student-auth.spec.ts authenticates via admin generate_link (type=magiclink).
-- NON-DESTRUCTIVE: student-auth.spec.ts signs in + signs out; the fixture
-- remains intact for re-runs. Do NOT use this account for destructive tests.
--
-- The existing '%@biphub.test' cleanup block (lines 32-49) covers this user —
-- NO change to the cleanup block is needed.
--
-- defense-in-depth: raw_app_meta_data.role='student' is set here; the
-- profiles_sync_role trigger (00002) mirrors profiles.role back into
-- raw_app_meta_data on any future profiles UPDATE. The Custom Access Token
-- Hook (00015) reads profiles.role at JWT issuance to stamp app_metadata.role
-- into the JWT claims.
-- ----------------------------------------------------------------------------

-- User 4: e2e-student (verified, role=student in app_metadata AND profiles).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-4444-444444444444',
  'authenticated', 'authenticated',
  'e2e-student@biphub.test',
  crypt('Student!Test1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"student"}'::jsonb,
  '{"role":"student"}'::jsonb,
  now(), now(), '', '', '', ''
);

-- Student profile: NO university_id / erasmus_code / full_name (D-08 / Pitfall 2).
-- profiles_sync_role trigger mirrors role into raw_app_meta_data; Custom Access
-- Token Hook (00015) reads this profiles.role at JWT issuance.
-- UPSERT: handle_new_user (00015) already created this row with role='student'
-- (raw_user_meta_data.role='student' is whitelisted). do-update keeps it idempotent.
insert into public.profiles (id, role)
values ('44444444-4444-4444-4444-444444444444', 'student')
on conflict (id) do update set role = excluded.role;

-- ----------------------------------------------------------------------------
-- Step 6: Phase 8 — bip-edits fixture (Plan 08-01 Wave 0).
--
-- Feeds tests/e2e/bip-edits.spec.ts.
--
-- Row a) One bips row with status='approved' owned by e2e-coordinator@biphub.test.
--   - Fixed UUID: e2e0bbbb-bbbb-bbbb-bbbb-000000000010
--   - Fixed slug: e2e-edit-target-bip
--   - Must NOT be one of the admin-review.spec.ts BIPs (Machine Learning / Data Ethics).
--   - All required NOT-NULL columns populated, mirroring the existing seed BIP shape.
--
-- Row b) One bip_edits row with status='pending' referencing the approved BIP above.
--   - The proposed title differs from the live BIP title so the diff view shows a change.
--   - partner_institutions = '[]'::jsonb (no partners in this edit).
--   - The bip_edits INSERT requires migration 00017 (applied before test run).
--
-- Idempotency: delete-then-insert (mirrors existing seed idempotency pattern).
-- bip_edits rows are cleaned up by cascade: `bips ON DELETE CASCADE` in bip_edits.bip_id.
-- The outer bips cleanup (Step 0) therefore also removes any bip_edits rows — safe.
-- ----------------------------------------------------------------------------

-- Cleanup: remove any bip_edits rows for this BIP before re-inserting the bip
-- (the outer Step 0 cleanup deletes bips rows, which cascades to bip_edits once
-- migration 00017 is applied; this explicit delete is a belt-and-suspenders guard
-- for environments where the migration has already been applied before seed re-run).
delete from public.bip_edits where bip_id = 'e2e0bbbb-bbbb-bbbb-bbbb-000000000010';

-- Row a: Approved BIP for edit flow tests
insert into public.bips (
  id, slug, title, status, is_seed,
  description, learning_outcomes, virtual_component_description, virtual_timing,
  physical_start_date, physical_end_date, application_deadline,
  host_city, ects_credits, max_participants,
  language_of_instruction, language_level_min,
  subject_area, isced_f_code,
  study_levels, green_travel, inclusion_support,
  contact_name, contact_email,
  how_to_apply_type, how_to_apply_value,
  host_university_id, created_by
)
select
  'e2e0bbbb-bbbb-bbbb-bbbb-000000000010',
  'e2e-edit-target-bip',
  'E2E Edit Target BIP',
  'approved', false,
  'A 10-day BIP on sustainable materials science for engineering students. Covers bio-composites, circular-economy design, and a hands-on lab project fabricating a prototype from recycled feedstock.',
  E'- Select appropriate bio-composite materials for a given engineering constraint\n- Apply circular-economy principles to product lifecycle analysis\n- Fabricate and test a small prototype from recycled feedstock',
  'Three online pre-mobility workshops covering materials databases, simulation tools, and a group design brief.',
  'before',
  '2027-06-09', '2027-06-19', '2027-04-01',
  'Munich', 4, 18,
  'en', 'B2',
  'engineering', '0711',
  ARRAY['bachelor','master'], false, false,
  'E2E Coordinator', 'e2e-coordinator@biphub.test',
  'url', 'https://tum.example/materials/apply',
  u.id,
  '11111111-1111-1111-1111-111111111111'
from public.universities u
where u.erasmus_code = 'D MUNCHEN02' limit 1;

-- Row b: Pending bip_edits row for the approved BIP above.
-- Requires migration 00017 (applied before test run).
-- The proposed title '[EDIT] E2E Edit Target BIP — revised' differs from the live
-- title 'E2E Edit Target BIP' so the diff view renders a changed field for tests.
insert into public.bip_edits (
  id, bip_id, status, created_by,
  title, isced_f_code, description, learning_outcomes,
  virtual_component_description, virtual_timing,
  host_city, physical_start_date, physical_end_date, application_deadline,
  ects_credits, max_participants,
  study_levels, language_of_instruction, language_level_min,
  green_travel, inclusion_support, eligibility_notes,
  how_to_apply_type, how_to_apply_value,
  contact_name, contact_email,
  partner_institutions
)
values (
  'e2e0cccc-cccc-cccc-cccc-000000000001',
  'e2e0bbbb-bbbb-bbbb-bbbb-000000000010',
  'pending',
  '11111111-1111-1111-1111-111111111111',
  '[EDIT] E2E Edit Target BIP — revised',
  '0711',
  'A 10-day BIP on sustainable materials science for engineering students. Covers bio-composites, circular-economy design, and a hands-on lab project fabricating a prototype from recycled feedstock.',
  E'- Select appropriate bio-composite materials for a given engineering constraint\n- Apply circular-economy principles to product lifecycle analysis\n- Fabricate and test a small prototype from recycled feedstock',
  'Three online pre-mobility workshops covering materials databases, simulation tools, and a group design brief.',
  'before',
  'Munich', '2027-06-09', '2027-06-19', '2027-04-01',
  4, 18,
  ARRAY['bachelor','master'], 'en', 'B2',
  false, false, null,
  'url', 'https://tum.example/materials/apply',
  'E2E Coordinator', 'e2e-coordinator@biphub.test',
  '[]'::jsonb
);
