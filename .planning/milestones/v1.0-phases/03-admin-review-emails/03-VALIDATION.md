---
phase: 3
slug: admin-review-emails
status: draft
nyquist_compliant: true
wave_0_complete: false  # set true after Plan 03-00 ships
created: 2026-05-12
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (not yet installed — Wave 0 gap) |
| **Config file** | `vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `npx vitest run tests/utils/ tests/schemas/ tests/email/ --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds (unit tests only — no async RSC tests; Playwright deferred to Phase 4) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/utils/ tests/schemas/ tests/email/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-00-T1 | 03-00 | 0 | infrastructure | — | N/A | install | `npx vitest --version` (after `npm install -D vitest @vitejs/plugin-react @testing-library/react jsdom vite-tsconfig-paths`) | ❌ W0 | ⬜ pending |
| 03-01-T1 | 03-01 | 1 | ADMN-03/04/08 | T-03-03 | rejected→approved blocked at app layer; reject reason min 10 chars | unit | `npx vitest run tests/utils/status-transitions.test.ts tests/schemas/admin-bips.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-T1 | 03-03 | 3 | ADMN-09 | T-03-05/06 | console fallback when RESEND_API_KEY unset (D-15); ApprovalEmail renders without note block when note undefined; EC disclaimer present | unit | `npx vitest run tests/email/send.test.ts tests/email/templates.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-T1 | 03-04 | 4 | ADMN-10 | T-03-06 | RejectionEmail reason verbatim + gold callout + EC disclaimer | unit | `npx vitest run tests/email/templates.test.ts` | ❌ W0 | ⬜ pending |
| 03-05-T1 | 03-05 | 5 | ADMN-11 | T-03-06 | AdminNotificationEmail + dynamic subject "New BIP pending review: {title}" | unit | `npx vitest run tests/email/` | ❌ W0 | ⬜ pending |
| 03-02-T4 | 03-02 | 2 | ADMN-01 | T-03-01/08 | non-admin JWT redirected at middleware + layout (manual checkpoint) | smoke (manual) | Plan 03-02 Task 4 checkpoint (9 steps) | — | ⬜ pending |
| 03-06-T4 | 03-06 | 5 | ADMN-07 | — | analytics excludes is_seed=true (manual SQL check) | integration (manual) | Plan 03-06 Task 4 checkpoint steps 9-11 | — | ⬜ pending |
| 03-06-T4 | 03-06 | 5 | ADMN-05/06 | — | all-listings status filter + FTS (manual smoke) | smoke (manual) | Plan 03-06 Task 4 checkpoint steps 1-7 | — | ⬜ pending |
| 03-01-T3 | 03-01 | 1 | ADMN-08 | T-03-02 | `bips_update_own_editable` USING+WITH CHECK blocks direct rejected→pending (manual SQL via psql) | integration (manual SQL) | `supabase db inspect db --schema public --table bips` post-push | — | ⬜ pending |
| 03-04-T4 | 03-04 | 4 | ADMN-11/D-09 | T-03-11 | revalidatePath busts ISR cache on approve/reject/admin-edit (manual browser test) | smoke (manual) | Plans 03-03/04/07 Task 4 checkpoints; verify /bips updates within seconds | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs marked TBD will be assigned by the planner once PLAN.md files exist; the planner will update this VALIDATION.md to bind each row to a concrete `{padded_phase}-{plan_id}-{task_id}` task.*

---

## Wave 0 Requirements

- [ ] `package.json` — `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `jsdom`, `vite-tsconfig-paths` installed as devDependencies
- [ ] `vitest.config.ts` — Vitest config with `jsdom` environment + path alias resolution
- [ ] `tests/utils/status-transitions.test.ts` — stubs for ADMN-03, ADMN-04, ADMN-08 (state machine `validateTransition()`)
- [ ] `tests/schemas/admin-bips.test.ts` — stubs for ADMN-04 (RejectBipSchema min-10 chars; ApproveBipSchema optional note ≤500)
- [ ] `tests/email/send.test.ts` — stubs for ADMN-09/10 (D-15 console-log fallback when RESEND_API_KEY unset)
- [ ] `tests/email/templates.test.ts` — stubs for ADMN-09 (ApprovalEmail conditional note block; RejectionEmail reason rendering)
- [ ] `tests/setup.ts` — shared test setup (env reset, mock factories)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Triple-layer admin guard blocks non-admin JWT | ADMN-01 | Requires full Next.js middleware + RSC + RLS chain; unit tests can't cover the full integration | 1) Sign in as coordinator → visit `/admin` → expect redirect to `/`. 2) Sign in as admin → visit `/admin` → expect queue render. 3) With admin JWT, query `bips` with `service_role` stripped from headers; verify `bips_update_admin` policy allows the update. |
| Resend email actually delivers in production | ADMN-09, ADMN-10 | Requires live RESEND_API_KEY + DNS records (SPF/DKIM); not safe to automate | 1) Set RESEND_API_KEY in `.env.local`. 2) Approve a BIP. 3) Confirm coordinator receives email at their `profiles.contact_email`. 4) Reject a BIP. 5) Confirm rejection email arrives with reason in body. 6) Coordinator submits a new BIP. 7) Confirm admin notification arrives at `ADMIN_NOTIFICATION_EMAIL`. |
| `revalidatePath()` busts ISR cache on approve | ADMN-11 | Requires running dev server + browser request to confirm cache hit/miss | 1) `npm run build && npm start`. 2) Approve a BIP. 3) Visit `/bips` and `/bip/[slug]` — confirm new BIP appears within seconds without full rebuild. |
| Analytics `Total BIPs` correctly excludes `is_seed = true` | ADMN-07 | Requires SQL inspection against live DB; trivially verifiable but not worth Vitest integration test in v1 | `select count(*) from bips where is_seed = false;` — must match `/admin/analytics` Total BIPs card. |
| `bips_update_own_editable` policy blocks coordinator from setting status='approved' directly | ADMN-08 | DB-level RLS test requires Supabase client + JWT; covered by manual SQL test | As coordinator JWT: `update bips set status='approved' where id='...'` — must fail (RLS denies). |
| Coordinator dashboard surfaces latest rejection reason | GROW-01 / D-09 | Visual UI assertion; covered by manual smoke test | Reject a BIP with reason "must add hosting info"; sign in as coordinator; verify card shows reason inline. |
| Admin auto-advance to next pending BIP after action | D-05 | Stateful navigation flow; unit-testable only via component test which is high-cost for low value | Manual: approve a BIP → expect redirect to next oldest pending; if none, expect empty-state on `/admin`. |
| Admin edit does NOT trigger coordinator email | D-18 | Side-effect verification; manual check is sufficient | Edit an approved BIP as admin; confirm no email received at coordinator address. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (vitest install + 5 test files)
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** planned by planner 2026-05-12 — pending Plan 03-00 + 03-01 execution to validate Wave 0 stubs
