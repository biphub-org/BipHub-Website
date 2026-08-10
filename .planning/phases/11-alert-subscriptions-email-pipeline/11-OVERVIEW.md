---
phase: 11-alert-subscriptions-email-pipeline
plan: 00
type: overview
status: approved
date: 2026-08-10
requirements: [ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05, ALRT-06, ALRT-07, ALRT-08, ALRT-09, FOUN-11, FOUN-12, FOUN-13]
source: .agents/plans/2026-08-10-phase-11-alerts.md
---

# Phase 11 — Alert Subscriptions + Email Digest Pipeline — Overview

**Parent plan:** `.agents/plans/2026-08-10-phase-11-alerts.md` (7 sequenced plans, approved 2026-08-10)
**GSD directory:** `.planning/phases/11-alert-subscriptions-email-pipeline/`
**Parallel contract:** Phase 11 owns migrations `00042+` and `lib/supabase/database.types.ts` regen (STATE.md 2026-07-26)
**Related close:** Phase 10 (`10-bip-detail-page`) closed 2026-08-10 — 0 code, 17/17 render verification

## Execution Order

We move step by step, one plan at a time, with explicit approval after each. No plan starts until the prior's validation gate is green.

| # | Plan file | Goal | Gate (must be green before next) |
|---|-----------|------|-----------------------------------|
| 1 | `11-01-PLAN.md` | DDL + RLS + `approved_at` + `pg_net` enable | `supabase db push --linked` succeeds, `SELECT extname FROM pg_extension WHERE extname='pg_net'` true, `approved_at` non-null on approved BIPs, `tsc` green |
| 2 | `11-02-PLAN.md` | `pg_cron` schedule + `pg_net.http_post` wiring | `SELECT * FROM cron.job WHERE jobname LIKE 'bip_digest%'` exists + `SELECT * FROM cron.job_run_details` shows `succeeded` on cloud TEST project (`zbvcpiwbopmfbjfhzprw`) — infra gate, blocking |
| 3 | `11-03-PLAN.md` | Edge Function: anti-join matcher + HMAC + Resend batch + idempotency | Two consecutive manual `curl` runs → second sends 0 emails, `resend.batch.send` spy shows `List-Unsubscribe` headers |
| 4 | `11-04-PLAN.md` | Server Actions create/update/delete/list (5-cap + consent + RLS WITH CHECK) | `vitest` + RLS 403 check (cross-user), 6th subscription rejected |
| 5 | `11-05-PLAN.md` | Student dashboard UI (subscribe + manage) | Playwright `student-authed` create/edit/delete/6th-rejected, axe sweep on `/student-dashboard` |
| 6 | `11-06-PLAN.md` | No-login unsubscribe Route Handler (HMAC) | Anonymous `GET /api/unsubscribe?token=` deletes row, invalid token 403 |
| 7 | `11-07-PLAN.md` | `/privacy` + GDPR cascade + E2E throwaway | `DELETE FROM auth.users` cascades both tables, `/privacy` snapshot |

Each plan file follows the GSD template: `objective`, `must_haves` (truths/artifacts/key_links), ordered `tasks`, and `validation` commands.

## How to run step by step

```bash
# one plan at a time — e.g.:
/gsd-execute-phase 11 --plan 11-01
# or manually:
npx tsx scripts/verify-cron.ts   # 11-02 gate
supabase db push --linked
npm run db:types
npm run test
```

Full decision rationale, risks, and stack lock are in the parent plan. This overview is the GSD entry point — individual `11-XX-PLAN.md` files contain the executable slices.
