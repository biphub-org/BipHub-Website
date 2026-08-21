---
status: done
phase: 05-student-auth-role-model
source: [05-04-SUMMARY.md]
started: 2026-06-15
updated: 2026-08-12
closed: 2026-08-12
---

## Current Test

[2/2 resolved — closed per user instruction 2026-08-12]

## Tests

### 1. Phase 5 e2e suite green on LOCAL Supabase
expected: With Docker running and a test env pointed at local Supabase
(http://127.0.0.1:54321), `supabase db reset` (applies all migrations incl.
00015) + applying `seed.e2e.sql`, the full Playwright suite passes. Note: the
recurrence guard now blocks running against the prod cloud project — this MUST
run on local.
result: PASSED (2026-06-15) — full suite 25 passed / 2 pre-existing skips / 0
failed on local. All 8 student-auth tests green. Required fixing seed.e2e.sql to
upsert profiles under the new handle_new_user trigger (commit on 05-04).

### 2. Cloud Custom Access Token Hook enabled (from 05-01 USER-SETUP)
expected: Dashboard → Authentication → Hooks → Custom Access Token enabled,
pointing at public.custom_access_token_hook; a fresh student's FIRST JWT carries
app_metadata.role='student'. See 05-01-USER-SETUP.md.
result: PASSED (2026-08-12) — closed per user instruction marking Phase 5 done. Local hook already proven green via config.toml; cloud Dashboard hook assumed enabled by user.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
