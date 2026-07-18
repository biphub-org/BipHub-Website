---
phase: 8
slug: edit-approved-request-changes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-26
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 08-RESEARCH.md §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (`@playwright/test`) — existing |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/e2e/bip-edits.spec.ts` |
| **Full suite command** | `npm run build && npx playwright test` |
| **Estimated runtime** | ~60–120 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/e2e/bip-edits.spec.ts` (once the spec exists from Wave 0)
- **After every plan wave:** Run `npm run build && npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Requirement | Wave | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|------|----------|-----------|-------------------|-------------|--------|
| EDIT-01 | 0 | Coordinator submits edit; `bip_edits` row created; public page unchanged | E2E (coordinator) | `npx playwright test tests/e2e/bip-edits.spec.ts -g "submit edit"` | ❌ W0 | ⬜ pending |
| EDIT-02 | 0 | `/bip/[slug]` serves original approved content while edit pending | E2E (public) | `... -g "public page unchanged"` | ❌ W0 | ⬜ pending |
| EDIT-03 | 0 | Admin sees diff view with "Edit" badge + field comparison | E2E (admin) | `... -g "diff view"` | ❌ W0 | ⬜ pending |
| EDIT-04 | 0 | Admin approves; merged content live within seconds (ISR) | E2E (admin) | `... -g "approve edit"` | ❌ W0 | ⬜ pending |
| EDIT-05 | 0 | Admin rejects edit; live BIP unchanged | E2E (admin) | `... -g "reject edit"` | ❌ W0 | ⬜ pending |
| EDIT-06 | 0 | Admin requests changes on a new pending submission | E2E (admin) | `... -g "request changes new submission"` | ❌ W0 | ⬜ pending |
| EDIT-06 | 0 | Admin requests changes on an approved-BIP edit | E2E (admin) | `... -g "request changes edit"` | ❌ W0 | ⬜ pending |
| EDIT-07 | 0 | Email D-15 console fallback fires for each outcome (approve/reject/changes) | E2E (console assert) | included in `bip-edits.spec.ts` | ❌ W0 | ⬜ pending |
| EDIT-08 | 0 | `bip_status_history` gains correct `action_kind` row per action | E2E + service-role DB assert | included in `bip-edits.spec.ts` | ❌ W0 | ⬜ pending |
| EDIT-09 | 0 | Slug unchanged after edit+approve; edit form omits slug field | E2E | `... -g "slug immutable"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/bip-edits.spec.ts` — covers EDIT-01 through EDIT-09 (coordinator-authed + admin-authed contexts; multi-context pattern from `admin-review.spec.ts` test 3)
- [ ] Extend `playwright.config.ts` testMatch patterns to include `bip-edits.spec.ts` on both the coordinator-authed and admin-authed projects
- [ ] Extend `supabase/seed.e2e.sql` with a pre-seeded `status='approved'` BIP owned by `e2e-coordinator@biphub.test` (the existing approve test consumes "Machine Learning Foundations"), plus optionally a pre-seeded `bip_edits` row in `status='pending'` so diff/approve/reject tests are independent of the submit test
- [ ] `tests/e2e/admin-review.spec.ts` may need a "Request Changes" assertion added for the EDIT-06 new-submission path

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Resend email delivery (prod) | EDIT-07 | D-15 dev fallback logs to console; live Resend send requires a real API key + inbox | Set `RESEND_API_KEY`, submit→approve an edit, confirm the coordinator inbox receives the "edit is live" email with a working BIP link |
| ISR public-page refresh timing | EDIT-04 | "within seconds" is a perceptual timing claim; E2E asserts content changed but not wall-clock latency | After approving an edit, reload `/bip/[slug]` and confirm merged content appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (the `bip-edits.spec.ts` spec + seed + config wiring)
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
