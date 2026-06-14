# Phase 04 Verification

**Verified:** 2026-05-14
**Phase:** 04 — polish-static-content-performance-hardening
**Mode:** goal-backward (start from phase goal → check delivery)

## Phase Goal

From ROADMAP.md: *"Everything that exists works perfectly. Lighthouse > 90 on all page types. GDPR-compliant. Open-source-ready."*

Phase status line: *"All 7 plans implementation-complete; awaiting verify-phase + 2 manual gates (axe sweep, Lighthouse capture) before v1 launch."*

Phase requirements: INFO-01, INFO-02, INFO-04, FOUN-05, FOUN-06, FOUN-07, FOUN-10.

## Requirements Coverage

| Req ID | Status | Evidence |
|--------|--------|----------|
| INFO-01 | PASS | `app/(public)/what-is-a-bip/page.tsx` ships 5 sections covering Erasmus+ KA131, virtual+physical 5–10 day requirement, ECTS, eligibility, language (Plan 04-01 SUMMARY accomplishments; build lists `○ /what-is-a-bip 450 B / 120 kB`). |
| INFO-02 | PASS | 8 inline `<AccordionItem>` FAQ blocks in `app/(public)/what-is-a-bip/page.tsx` per D-06 locked list (Plan 04-01 SUMMARY "FAQ inlined, not mapped"). |
| INFO-04 | PASS | Outbound link to `https://erasmus-plus.ec.europa.eu/programme-guide/...` with `rel="noopener noreferrer"` and affiliation-safe link text in `app/(public)/what-is-a-bip/page.tsx` (Plan 04-01 SUMMARY accomplishments). |
| FOUN-05 | PASS | Zero-analytics posture satisfies FOUN-05 by absence-of-trackers (D-01/D-02 + Plan 04-02 + CONTRIBUTING.md Section 4). `/privacy` documents the posture; no banner needed. |
| FOUN-06 | PASS | `app/(public)/privacy/page.tsx` exists with `export const dynamic = 'force-static'`, 8 sections, ~772 words inside the 600–900 lock; `components/home/Footer.tsx:79` links it (build lists `○ /privacy`). |
| FOUN-07 | PASS | `supabase/migrations/00013_delete_my_account.sql` (SECURITY DEFINER, search_path locked, EXECUTE→authenticated only) + `lib/actions/account.ts` + `components/dashboard/DeleteAccountDialog.tsx` + `/dashboard/settings` page + `AccountDeletedToastIsland`. Anonymizes approved (`contact_name='—'`, `contact_email=NULL`), hard-deletes drafts/pending/rejected, removes `auth.users` row atomically. |
| FOUN-10 | PASS (impl) / PARTIAL (runtime) | `playwright.config.ts` + `tests/e2e/{setup,auth,submission,admin-review,map-filter}.spec.ts` (17 tests) + `supabase/seed.e2e.sql` (3 fixture users + 2 pending BIPs) + `.github/workflows/e2e.yml` single-shard CI. Runtime execution deferred to user local-dev + CI gate; `npx playwright test --list` per Plan 04-07 SUMMARY confirms parse OK. One TS error in `map-filter.spec.ts:46` (RegExp vs string in `selectOption`) — non-blocking for `next build` but blocks `tsc --noEmit` clean. |

## Guardrail Spot-Checks

| Guardrail | Result | Evidence |
|-----------|--------|----------|
| Footer EC disclaimer present | PASS | `components/home/Footer.tsx:79` — `"Independent project — not affiliated with the European Commission"` |
| No `framer-motion` imports anywhere | PASS | `grep "from ['\"]framer-motion['\"]" **/*.{ts,tsx}` returns 0 matches. The two source hits (`StatsSection.tsx:7`, `WizardStep4ApplicationInfo.tsx:10`) are comments enforcing the rule. `package-lock.json` reference is a transitive entry only. |
| No `getSession()` server-side | PASS | All `getSession()` mentions in `lib/supabase/{server,middleware}.ts` are doc comments explicitly forbidding it. No call sites in `app/`, `lib/actions/`, RSC, or Server Actions. |
| Migration 00013 hardening | PASS | `supabase/migrations/00013_delete_my_account.sql`: line 27 `language plpgsql`, line 28 `security definer`, line 29 `set search_path = public, auth, pg_temp`, lines 58–59 `revoke all ... from public, anon; grant execute ... to authenticated`. |
| LogoMark star count ≠ 12 | PASS | `components/home/LogoMark.tsx:17` — `const STAR_COUNT = 11`. |
| `/privacy` + `/what-is-a-bip` static | PASS | Both have `export const dynamic = 'force-static'`; `next build` reports `○ /privacy` (146 B) and `○ /what-is-a-bip` (450 B). |
| Playwright config + 4 specs + storage-state setup + e2e.yml | PASS | `playwright.config.ts`, `tests/e2e/setup.ts`, 4 spec files (`auth`, `submission`, `admin-review`, `map-filter`), `.github/workflows/e2e.yml` all present. |
| `.env.example` contains no real secrets | PASS | No `eyJ…` JWT, no `re_…` Resend key, no `sb_secret_…` value. The single `sb_publishable_*` mention is in an instructional comment, not a value. |
| CONTRIBUTING.md + CODE_OF_CONDUCT.md + .gitleaks.toml + secret-scan workflow | PASS | All four files present at repo root / `.github/workflows/`. |
| Static OG fixtures | PASS | `public/og-home.png` and `public/og-bips.png` committed (1200×630, EU palette per Plan 04-03 SUMMARY); `metadataBase` + `openGraph.images` wired on `/` and `/bips`. |

## Manual Gates Outstanding

1. **Lighthouse capture (D-20).** 4 PNGs awaited at `.planning/phases/04-polish-static-content-performance-hardening/lighthouse/` for `/`, `/bips`, `/bip/{slug}`, `/what-is-a-bip`. Targets locked at FOUN-02: Performance/Accessibility/SEO ≥ 90, LCP < 1.5s mobile 4G simulated. README staged with capture protocol; user runs locally and commits PNGs.
2. **axe-DevTools sweep (D-27, Plan 04-07 Task 10).** 13 route screenshots awaited at `.planning/phases/04-polish-static-content-performance-hardening/axe/` with 0 critical / 0 serious findings + verified skip-to-content link Tab order. README staged with procedure.
3. **Local Playwright spec runtime verification.** Plan 04-07 SUMMARY notes the 17 tests parse via `--list` but were not executed in a live local stack during plan execution; user runs `npm run test:e2e` once locally before merge.

## Build / Typecheck

- `npm run build` → **PASS**. 39 routes generated; `/privacy` and `/what-is-a-bip` listed as `○ (Static)`; `/dashboard/settings`, `/admin/*`, `/bips` listed as `ƒ (Dynamic)`. No build errors; Middleware compiled at 88.8 kB.
- `npx tsc --noEmit` → **1 ERROR** (non-blocking for `next build`):
  - `tests/e2e/map-filter.spec.ts(46,31)`: `selectOption({ label: /…/ })` passes a `RegExp` where the Playwright type signature expects `string`. Fix is a one-line spec edit (use literal label or filter then click); the production build path strips the `tests/` tree, hence build succeeded. This must be patched before the E2E suite runs cleanly in CI but does not block phase verification because:
    1. The failing token is in an E2E spec, not application code.
    2. `next build`'s own type pass (which scopes to `app/`, `lib/`, `components/`) passes clean.
    3. The fix is one line.

## Verdict

**READY_FOR_MERGE — with two clearly documented manual gates + one trivial E2E typecheck patch outstanding before v1 launch.**

Rationale:
- All 7 phase requirements (INFO-01/02/04, FOUN-05/06/07/10) are implementation-complete in source. Code is auditable, decisions are documented per-plan, and atomic commits are recorded for each task.
- All CLAUDE.md guardrails spot-checked PASS: 11-star LogoMark, no `framer-motion` imports, no `getSession()` server-side, footer disclaimer intact, migration 00013 hardened, no real secrets in `.env.example`.
- `next build` succeeds across 39 routes.
- `npx tsc --noEmit` surfaces a single E2E-spec type error in `tests/e2e/map-filter.spec.ts:46` — non-blocking for the production build pipeline but should be fixed before the next E2E CI run to keep the suite green.
- Two manual gates remain (Lighthouse capture, axe sweep) and are explicitly staged with executable READMEs. These are the "manual followup" decisions taken in Plans 04-06 D-20 and 04-07 D-27 — both are intentional human-in-the-loop gates, not deferrals.
- No source-code changes were made during verification (read-only on the codebase per instructions).

---
*Phase: 04-polish-static-content-performance-hardening*
*Verified: 2026-05-14*
