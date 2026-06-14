# Phase 4: Polish + Static Content + Performance Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 4-Polish-Static-Content-Performance-Hardening
**Areas discussed:** Full delegation — user said "you decide" for all gray areas after a candid-disagreement check.

---

## Discussion Flow

1. Claude loaded prior context (PROJECT.md, REQUIREMENTS.md, STATE.md, all three prior CONTEXT.md files) and scouted the codebase (`components/home/`, `app/`, `package.json`, `.env.example`, `supabase/migrations/`).
2. Claude identified four primary gray areas (GDPR consent + analytics, account deletion, Playwright E2E strategy, `/what-is-a-bip` content) and a "discretion bundle" (pre-commit secret scanning, bundle analyzer, OG images, Suspense scope, CONTRIBUTING.md sections).
3. Before sending the multiSelect AskUserQuestion, the user paused and asked: "do you think there would be something I would not agree with, from what you are doing?"
4. Claude responded with five candid pushback points: (a) ship without analytics → no consent banner at all (not a foregone conclusion); (b) Husky pre-commit is intrusive — CI-only is cleaner; (c) reusing the dynamic `opengraph-image.tsx` for static pages is over-engineering vs hand-designed PNGs; (d) drafting `/what-is-a-bip` copy is normally a founder-controlled artifact; (e) the "delegate bundle" was too aggressive.
5. The user replied: "actually, you decide."
6. Claude committed all 27 decisions (D-01..D-27) directly into CONTEXT.md without re-asking.

---

## GDPR Consent + Analytics (Claude's call)

| Option | Description | Selected |
|--------|-------------|----------|
| Ship with no analytics, no banner | Privacy policy only; FOUN-05 trivially satisfied | ✓ |
| Plausible / Umami + minimal banner | Privacy-friendly analytics with a small consent UI | |
| GA4 + full cookiebot-style banner | Maximum data, maximum friction | |

**Selected:** Option 1 — D-01, D-02.
**Rationale:** Banner is friction (a11y, Lighthouse, layout-shift) that buys nothing without traffic data. Revisit when product-market fit signals analytics is worth the cost.

---

## Account Deletion (FOUN-07) (Claude's call)

| Option | Description | Selected |
|--------|-------------|----------|
| Typed-email confirmation modal + SECURITY DEFINER RPC | Friction matches irreversibility; RPC handles cross-table atomically | ✓ |
| Single checkbox + button | Simpler, but too easy to mis-click an irreversible PII operation | |
| Email confirmation link (2-step) | Defeated by the fact we're about to destroy the email address | |
| Grace period (soft-delete, purge after N days) | Adds state machine + cron complexity for marginal benefit | |

**Selected:** Option 1 — D-07..D-11.
**Anonymization strategy:** approved BIPs keep `created_by = NULL` (via existing ON DELETE SET NULL); `contact_name → '—'`, `contact_email → NULL`. Drafts/pending/rejected hard-deleted. `bip_status_history` rows survive with `actor_id = NULL` (Phase 3 D-07).

---

## Playwright E2E Strategy (FOUN-10) (Claude's call)

| Option | Description | Selected |
|--------|-------------|----------|
| Local Supabase + programmatic auth via storageState | Fast, reliable, no email infrastructure dependency | ✓ |
| Real magic-link flow via Mailosaur | Highest fidelity, slow, third-party dependency | |
| Mocked Supabase client | Fast but doesn't exercise RLS — defeats the test purpose | |
| Dedicated staging project | Production-shaped but adds infra setup before launch | |

**Selected:** Option 1 — D-12..D-16.
**Coverage:** Golden-path-only for the four FOUN-10 flows (auth, submission, admin review, map filter). Edge cases documented in `tests/e2e/EDGE-CASES-DEFERRED.md` for v1.1.

---

## `/what-is-a-bip` Content (Claude's call)

| Option | Description | Selected |
|--------|-------------|----------|
| Claude drafts, founder reviews | Fast; voice can drift from founder's intent — single review pass mitigates | ✓ |
| Founder writes, Claude structures | More authentic voice; blocks Phase 4 until copy lands | |
| Paste EC docs verbatim | Legally cleanest but flat and unappealing | |

**Selected:** Option 1 — D-04, D-05, D-06.
**Page structure:** Single static RSC with 5 sections + 8-item FAQ accordion. External link to EC programme guide (verified live before commit).

---

## Static OG Images for `/` and `/bips` (Claude's call)

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-designed static PNGs in `/public` | No runtime cost, no font bundling, designer-controlled | ✓ |
| Reuse Phase 1 `opengraph-image.tsx` pattern | Consistency, but bundles Inter TTF for pages that never change | |
| Skip OG images for these routes | Misses social-share polish that matters at launch | |

**Selected:** Option 1 — D-17.
**Reserves the dynamic `opengraph-image.tsx` pattern for `/bip/[slug]` where per-BIP variance justifies it.**

---

## Pre-commit Secret Scanning (Claude's call)

| Option | Description | Selected |
|--------|-------------|----------|
| CI-only via gitleaks GitHub Action | No `.husky/` directory, no commit-time friction, catches all leaks before merge | ✓ |
| Husky + gitleaks pre-commit | Local-first, but adds friction every commit | |
| trufflehog | Slower, more thorough — overkill for v1 | |
| No automated scanning | `.env.example` discipline plus reviewer attention | |

**Selected:** Option 1 — D-22.

---

## Bundle Analyzer + Lighthouse Targets (Claude's call)

| Option | Description | Selected |
|--------|-------------|----------|
| `@next/bundle-analyzer` behind `ANALYZE=true` + manual Lighthouse runs | Tools available when needed; humans interpret reports | ✓ |
| Lighthouse CI gating PRs | Automation, but needs a stable baseline first | |
| Skip analyzer, rely on Vercel insights | Less control, no offline workflow | |

**Selected:** Option 1 — D-19, D-20, D-21.

---

## CONTRIBUTING.md Scope (Claude's call)

| Option | Description | Selected |
|--------|-------------|----------|
| 8 sections + Contributor Covenant v2.1 CoC | Standard OSS shape; covers the EU emblem rule explicitly | ✓ |
| Minimal "how to run + how to PR" | Faster to write, weaker for contributor onboarding | |
| Long-form architectural deep-dive | Belongs in DOCS.md / a wiki, not CONTRIBUTING | |

**Selected:** Option 1 — D-25, D-26.

---

## Suspense Boundary Scope (Claude's call)

| Option | Description | Selected |
|--------|-------------|----------|
| Wrap every `useSearchParams()` consumer with per-feature Suspense | Granular, no layout-shift fallbacks | ✓ |
| Single page-level Suspense at `/bips` | Coarser, more likely to flash empty page | |
| Skip — let Next.js handle | Builds fail with current Next.js 15 behavior | |

**Selected:** Option 1 — D-18.

---

## Accessibility Audit Scope (Claude's call)

| Option | Description | Selected |
|--------|-------------|----------|
| Manual + axe DevTools sweep on every public + auth'd route | Catches WCAG AA without CI overhead | ✓ |
| Lighthouse a11y category only | Less thorough; misses focus / keyboard issues | |
| Pa11y CI integration | Automation overhead premature in v1 | |

**Selected:** Option 1 — D-27.

---

## Claude's Discretion

The user explicitly delegated the entire Phase 4 decision set ("you decide"). All 27 decisions (D-01..D-27) are Claude's calls. Pushback points raised before delegation (and acted on in the decisions):
- Banner-less GDPR posture (no analytics in v1).
- CI-only secret scanning (no Husky).
- Static OG PNGs over dynamic route handlers.
- Claude drafts `/what-is-a-bip` copy with a founder review pass.

## Deferred Ideas

See `04-CONTEXT.md` `<deferred>` section for the full list (14 items). Notable: analytics + banner, Lighthouse CI, multi-language UI, JSON-LD, admin-initiated deletion, audit log timeline, `/admin/users` UI, Husky, Playwright shard/retry/visual regression, E2E edge-case coverage.
