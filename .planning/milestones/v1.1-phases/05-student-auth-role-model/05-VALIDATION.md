---
phase: 5
slug: student-auth-role-model
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-15
completed: 2026-06-15
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 05-RESEARCH.md §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (confirmed from `tests/e2e/*.spec.ts`) |
| **Config file** | `playwright.config.ts` (exists) |
| **Quick run command** | `npx playwright test tests/e2e/student-auth.spec.ts` |
| **Full suite command** | `npx playwright test tests/e2e/` |
| **Estimated runtime** | ~60–120 seconds (full e2e suite) |

---

## Sampling Rate

- **After every task commit:** Not applicable — Phase 5 is too integrated for partial-suite runs until Wave 1 (migration + auth wiring) completes. Type/lint check (`npm run typecheck`) is the per-commit signal.
- **After every plan wave:** Run `npx playwright test tests/e2e/student-auth.spec.ts`
- **Before `/gsd-verify-work`:** Full suite must be green — `npx playwright test tests/e2e/`
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Req / Criterion | Behavior / Success Criterion | Test Type | Automated Command | File Exists | Status |
|-----------------|------------------------------|-----------|-------------------|-------------|--------|
| STUD-01 / SC-1 | Student navigates to `/register/student`, submits email, receives magic link, lands on `/student-dashboard` | e2e | `npx playwright test tests/e2e/student-auth.spec.ts` | ❌ W0 | ⬜ pending |
| STUD-01 / SC-2 | Expired/invalid magic link redirects to `/register/student?error=expired`; Alert renders; form pre-focused | e2e | `npx playwright test tests/e2e/student-auth.spec.ts --grep "expired"` | ❌ W0 | ⬜ pending |
| STUD-02 / SC-3 | Session persists across browser restart (cookie-based SSR session) | e2e | `npx playwright test tests/e2e/student-auth.spec.ts --grep "session persistence"` | ❌ W0 | ⬜ pending |
| STUD-03 / SC-4 | Authenticated student visiting `/dashboard` is redirected to `/student-dashboard` | e2e | `npx playwright test tests/e2e/student-auth.spec.ts --grep "role redirect"` | ❌ W0 | ⬜ pending |
| FOUN-08 / SC-5 | Student JWT cannot insert a row into `bips` (RLS blocks with permission error) | e2e + RLS | `npx playwright test tests/e2e/student-auth.spec.ts --grep "bips insert blocked"` | ❌ W0 | ⬜ pending |
| FOUN-07 | `profiles_update_own_or_admin` WITH CHECK prevents student setting `role='coordinator'` via REST API | e2e (API level) | `npx playwright test tests/e2e/student-auth.spec.ts --grep "role self-escalation blocked"` | ❌ W0 | ⬜ pending |
| D-11 matrix | Unauthenticated user visiting `/student-dashboard` redirects to `/register/student` | e2e | `npx playwright test tests/e2e/student-auth.spec.ts --grep "unauthenticated redirect"` | ❌ W0 | ⬜ pending |
| D-15 | Student sign-out redirects to `/` not `/login` | e2e | `npx playwright test tests/e2e/student-auth.spec.ts --grep "sign out"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/student-auth.spec.ts` — covers all 5 success criteria + STUD-01/02/03 + FOUN-07/08 + D-11/D-15
- [ ] Test fixture: student test user email (`e2e-student@biphub.test`) added to `supabase/seed.e2e.sql`
- [ ] Test helper: auto-confirm magic link via admin API (analogous to the coordinator auto-confirm pattern in `auth.spec.ts` lines ~44–60)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real magic-link email delivery (Resend) | STUD-01 | Transactional email delivery is environment-dependent; e2e uses admin-API auto-confirm | Trigger `/register/student` against a staging Supabase with Resend configured; confirm the email arrives and the link resolves to `/student-dashboard` |

*All other phase behaviors have automated verification via the e2e suite.*

---

## Validation Sign-Off

- [ ] All success criteria have an `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (e2e suite covers the integrated slice)
- [ ] Wave 0 covers all MISSING references (`student-auth.spec.ts`, seed fixture, auto-confirm helper)
- [ ] No watch-mode flags in commands
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
