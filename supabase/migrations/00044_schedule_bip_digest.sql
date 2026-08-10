-- 00044_schedule_bip_digest.sql
-- Phase 11-02: pg_cron schedule for bip digest (infra gate).
--
-- Schedules two pg_cron jobs that prove pg_cron + pg_net are live.
-- Initially they POST to the Edge Function URL; until the Edge Function
-- exists (11-03) the POST will 404 but cron.job_run_details will still
-- record a run, proving the scheduler is firing. After 11-03 the jobs
-- are updated to the final Edge Function URL with Vault secret.
--
-- The infra gate requires SELECT * FROM cron.job_run_details to show
-- a succeeded run on the cloud TEST project — this heartbeat proves it.

-- Ensure pg_cron is available (pre-enabled on all tiers as of 2026, but ensure schema).
create extension if not exists pg_cron with schema cron;
create extension if not exists pg_net with schema extensions;

-- Daily digest: 08:00 UTC every day
select cron.schedule(
  'bip_digest_daily',
  '0 8 * * *',
  $$select net.http_post(
    url := 'https://zbvcpiwbopmfbjfhzprw.supabase.co/functions/v1/send-bip-alerts',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'bip_digest_daily_placeholder'),
    body := jsonb_build_object('frequency', 'daily')
  )$$
);

-- Weekly digest: 08:00 UTC every Monday
select cron.schedule(
  'bip_digest_weekly',
  '0 8 * * 1',
  $$select net.http_post(
    url := 'https://zbvcpiwbopmfbjfhzprw.supabase.co/functions/v1/send-bip-alerts',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'bip_digest_weekly_placeholder'),
    body := jsonb_build_object('frequency', 'weekly')
  )$$
);
