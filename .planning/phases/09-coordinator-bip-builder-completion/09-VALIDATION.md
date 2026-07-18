---
phase: 9
slug: coordinator-bip-builder-completion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-18
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Sourced from `09-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit framework** | Vitest `4.1.6` (`vitest.config.ts`, tests in `tests/**/*.test.ts`) |
| **E2E framework** | Playwright `^1.60.0` (`playwright.config.ts`, specs in `tests/e2e/*.spec.ts`, `workers: 1` — serial) |
| **Quick run command** | `npm run test` (`vitest run`) |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Seed check** | `npm run verify:seed` |
| **E2E safety guard** | `playwright.config.ts` refuses any Supabase target except local or the cloud TEST project ref `zbvcpiwbopmfbjfhzprw`. Confirm `.env.local` points at one before running. |

---

## Sampling Rate

- **After every schema-touching task commit:** `npx vitest run tests/schemas/bip-wizard.test.ts` (fast, no server)
- **After every plan wave:** full `npx playwright test` (serial, `workers: 1` — budget accordingly)
- **Phase gate (before `/gsd-verify-work`):** full unit + E2E suite green **and** `npm run verify:seed` green
- **Max feedback latency:** unit ~seconds; E2E minutes (serial)

---

## Requirement → Test Map

| Req ID | Behavior to prove | Test Type | Command | File |
|--------|-------------------|-----------|---------|------|
| SUBM-12 | All 5 `virtual_timing` options parse; legacy `'concurrent'` rejected | unit | `npx vitest run tests/schemas/bip-wizard.test.ts` | ❌ NEW (Wave 0) |
| SUBM-13 | `max_participants` floor is 10 in **both** `step2Schema` and `fullBipSchema` **and** `submitSchema` (Pitfall 0) | unit | same | ❌ NEW (Wave 0) |
| SUBM-09 | Create BIP with `virtual_sessions_count` + `virtual_duration_notes`, submit, approve → values live | e2e | `npx playwright test tests/e2e/submission.spec.ts` | ✅ extend |
| SUBM-10 | `partner_institutions_only` (Partners step) round-trips on create | e2e | `npx playwright test tests/e2e/submission.spec.ts` | ✅ extend |
| SUBM-09/10/11 | Edit each new field on an **approved** BIP, admin approves, live row reflects it (D-08) | e2e | `npx playwright test tests/e2e/bip-edits.spec.ts` | ✅ extend |
| SUBM-14 | **No field silently dropped at merge** — one read-back assertion **per new field** (the binding anti-Pitfall-1 proof) | e2e | per-field assertions in the extended `bip-edits.spec.ts` flow (read live `/bip/[slug]` or `bips` row via the service-role pattern in `assertAuditRow()`) | ✅ extend |
| BROW-14 | `/bips` card shows the amber partner-only badge **only** for `partner_institutions_only = true` rows | e2e | new/extended `/bips`-scoped assertion (confirm `map-filter.spec.ts` scope at Wave 0) | ⚠ confirm |
| FOUN-14 | All three seed sources carry the 4 new fields with a non-default value exercised | script | `npm run verify:seed` after extending `scripts/verify-seed.ts` | ✅ extend |

---

## Wave 0 Gaps (build these first)

- [ ] `tests/schemas/bip-wizard.test.ts` — NEW; no unit coverage exists for `lib/schemas/bip-wizard.ts` today. Must cover **all three** schema definitions (`step2Schema`, `fullBipSchema`, `submitSchema`) for the `virtual_timing` + `max_participants` fixes — Pitfall 0 means fixing one is not enough.
- [ ] Extend `tests/e2e/submission.spec.ts` — fill + assert the 3 new create-path fields and the corrected `virtual_timing` options.
- [ ] Extend `tests/e2e/bip-edits.spec.ts` — per-field edit→approve→persist assertion block (D-08), reusing `E2E_BIP_ID` / `assertAuditRow`.
- [ ] Confirm `/bips` card-render coverage (read `map-filter.spec.ts`) before deciding new-file vs extend for BROW-14.
- [ ] Extend `scripts/verify-seed.ts` with a distribution check for ≥1 new field.

*No framework install needed — Vitest and Playwright are already configured.*

---

## Per-Task Verification Map

*Filled during planning — one row per plan task, mapping task → requirement → test command. The planner populates this from the Requirement → Test Map above.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| _(planner fills)_ | | | | | | |
