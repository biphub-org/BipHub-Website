-- 00050_student_profile_country.sql
-- Student personal details (admin Students section + registration).
--
-- Context: handle_new_user (00015) materialises a bare profiles(id, role) row.
-- Coordinators fill name/email/university via /onboarding (saveProfileAction);
-- students skipped onboarding entirely (former D-08), so their rows stayed
-- empty and admins could not see who they are. Students now provide full_name
-- (required), country of residence (required) and home university (optional)
-- at registration; existing students complete them via /student-dashboard/
-- complete-profile (gated in (student)/layout.tsx).
--
-- country stores an ISO 3166-1 alpha-2 uppercase code (same convention as
-- universities.country). Validated app-side against ERASMUS_COUNTRIES
-- (lib/schemas/profile.ts); nullable so pre-existing rows stay valid.
-- university_id reuses the existing FK to universities (nullable, optional).

alter table public.profiles
  add column if not exists country text;
