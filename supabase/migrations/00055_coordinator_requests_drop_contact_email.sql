-- 00055_coordinator_requests_drop_contact_email.sql
--
-- The coordinator access request now carries a single `email`: the address
-- reachable during review AND the login/contact email once approved. The
-- temporary `contact_email` column is dropped (not kept nullable) — no live
-- rows need preserving at this stage.

alter table public.coordinator_requests drop column contact_email;
