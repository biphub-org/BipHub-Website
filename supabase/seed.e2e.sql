-- supabase/seed.e2e.sql — intentionally empty.
-- All E2E fixture users (@biphub.test) and fixture BIPs have been removed per user request.
-- E2E tests that depend on these fixtures (admin-review, submission, bip-edits) will need
-- to be updated or will fail until new fixtures are provisioned.
-- To restore, use: git show HEAD:supabase/seed.e2e.sql

-- Idempotent cleanup: remove any legacy fixture rows if applied on a DB that still has them.
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
