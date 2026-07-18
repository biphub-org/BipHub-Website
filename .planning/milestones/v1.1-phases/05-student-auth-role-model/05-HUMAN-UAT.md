---
status: partial
phase: 05-student-auth-role-model
source: [05-04-SUMMARY.md]
started: 2026-06-15
updated: 2026-06-15
---

## Current Test

[1 of 2 resolved — only the cloud Dashboard hook (user action) remains]

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
result: [pending] — USER ACTION (cloud Dashboard). Note: locally the hook is
active via config.toml and the student JWT-role flow is proven green.

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
