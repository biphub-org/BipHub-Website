# BipHub

## What This Is

BipHub is the free, open-source database for Erasmus+ Blended Intensive Programs (BIPs) — the EU's short-term mobility format that combines a 5-30 day physical exchange abroad with a compulsory virtual learning component. It serves students discovering BIPs, university coordinators listing them, and admins reviewing submissions. The product replaces erasmusbip.org, the only existing competitor, which is a broken WordPress site with no real search or self-service.

## Core Value

Students can reliably discover BIPs by country, field of study, and dates, and universities can self-service list their BIPs through a fast, professional submission flow with admin review.

## Current State

**Shipped:** v1.0 MVP (2026-06-14) — 4 phases, 30 plans, ~24,500 LOC.
The full three-audience product is live: students discover BIPs (map + filters + search + detail), coordinators self-service submit via a wizard, and admins review with an audit trail + email notifications. Deployed on Vercel against cloud Supabase. Playwright E2E suite passes against cloud (17/17 golden-path).

**Known deferred (non-blocking):** Phase 01 visual + Phase 03 runtime human-verify checkpoints; minor a11y colour-contrast polish (→ v1.1); `BIPS-NAV-BUG` is a local `next start`-only test artifact (deployed filters work). See `milestones/v1.0-MILESTONE-AUDIT.md`.

**Next milestone goals:** TBD — define via `/gsd-new-milestone` (candidates from Out of Scope: student accounts/bookmark sync, edit-approved-with-re-review, partner reconciliation, JSON-LD/SEO, i18n).

## Requirements

### Validated (shipped in v1.0 — 2026-06-14)

#### Public / Student-Facing
- ✓ Homepage (interactive Europe choropleth map, field categories, live stats, recent BIPs, how-it-works, university CTA, footer disclaimer) — v1.0
- ✓ BIP browse (`/bips`) — card grid, 7 filters, unaccent FTS, URL-driven shareable state, pagination — v1.0
- ✓ BIP detail (`/bip/[slug]`) — full info, host + partner universities, share/bookmark, SSR meta + OG image — v1.0
- ✓ "What is a BIP?" explainer + FAQ; `/privacy` policy — v1.0

#### University / Coordinator-Facing
- ✓ Auth via institutional email + verification (Supabase Auth + Resend) — v1.0
- ✓ 5-step submission wizard with auto-save + optimistic locking + preview — v1.0
- ✓ Coordinator dashboard with status tabs + edit/withdraw/revise-resubmit — v1.0

#### Admin-Facing
- ✓ Admin panel — review queue, approve/reject + notes, listing edit, audit log, Resend emails, analytics — v1.0

#### Foundation
- ✓ RLS on every table; GDPR (privacy page + Art-17 account erasure); Lighthouse ≥90; WCAG AA (axe sweep passed); MIT + CONTRIBUTING; Playwright E2E — v1.0

### Active

(None — next milestone scope is defined via `/gsd-new-milestone`.)

### Out of Scope

- **Server-side student accounts / saved BIPs** — bookmarks via localStorage only in v1
- **University-to-university messaging** — defer to v2
- **In-platform application submission** — link out to university contact
- **BIP reviews or ratings** — quality risk, defer
- **Public API** — no external consumers in v1
- **Multilingual UI** — English only for v1, i18n deferred
- **Automated BIP import from EU sources** — manual + outreach for seed data
- **Payment processing** — not needed
- **PDF export** — defer
- **University photo uploads** — gradient placeholders for v1
- **Official EU 12-star emblem** — restricted; palette only
- **n8n / workflow-automation platform** — single external integration (Resend) doesn't justify a second deploy target; `revalidatePath()` already replaces webhooks; CLAUDE.md "one-command local dev" constraint would break. Revisit only if integration count grows to 3+ (e.g., Slack digests, AI moderation, coordinator outreach automation).

## Context

- **Domain:** Erasmus+ KA131 mobility programme. BIPs are funded at ~€79/day physical mobility, min 10 / max 20 participants, organized by groups of HEIs (one host + N partners), award ECTS credits, must include collaborative online component.
- **Competitive landscape:** Single competitor (erasmusbip.org) — WordPress + embedded Google Sheet, frequently fails to load, zero filtering, no mobile, no self-service. Domain has organic SEO since ~2020.
- **Target users:** Students (any EU/Erasmus partner HEI), university Erasmus coordinators (host or partner institutions), admins (project maintainers).
- **Visual source of truth:** `biphub-homepage.html` in repo root — locks v1 homepage layout.
- **Open project:** MIT-licensed, single-command local setup (`supabase start` + `npm run dev`), CONTRIBUTING.md required.

## Constraints

- **Tech stack — Framework:** Next.js 15 App Router with TypeScript — RSC + Supabase server client integration, modern routing primitives
- **Tech stack — Database/Auth:** Supabase (Postgres + Auth + Storage + RLS) — single managed service, native row-level security, free tier viable for launch
- **Tech stack — Styling:** Tailwind CSS v4 + shadcn/ui — design-system productivity, matches mockup component patterns
- **Tech stack — Deployment:** Vercel — first-class Next.js host, edge network, preview deploys
- **Tech stack — Email:** Resend — transactional verification + admin notifications
- **Tech stack — Forms:** React Hook Form + Zod — validation matches Supabase schema constraints
- **Tech stack — Maps:** `react-simple-maps` or D3 with EU GeoJSON — replaces hand-drawn SVG paths in mockup
- **Tech stack — Animations:** Framer Motion — count-up stats, map hover, card lift
- **Visual:** EU palette (#003399 blue, #FFCC00 gold, #0a1735 ink) — deliberately communicates EU context. Inter font. 96px section padding desktop. Pill CTAs. Gold underline accent on key headline phrases.
- **Legal:** Footer must state "Independent project — not affiliated with the European Commission". Do **not** use the official 12-star EU emblem in any form.
- **Performance:** Core Web Vitals green. BIP listing < 1.5s on 4G mobile. Lighthouse > 90 on Performance, Accessibility, SEO.
- **Accessibility:** WCAG AA. Keyboard-navigable forms and map (with country list as fallback). Proper ARIA labels.
- **Security:** Supabase RLS on every table. Coordinators edit only their own BIPs. Admin role enforced server-side. No PII in public API surface.
- **SEO:** BIP detail pages SSR'd with meta tags + OG images. Slug-based URLs (`/bip/sustainable-cities-budapest-2025`).
- **Open source:** MIT license. Clean repo. CONTRIBUTING.md. One-command local dev setup.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router (not Pages) | Modern RSC + better Supabase server client integration | ✓ v1.0 |
| Supabase Auth (not NextAuth) | Native RLS integration, simpler stack | ✓ v1.0 |
| Cards everywhere, no tables | Mobile-first, visually consistent with mockup, competitor's table is its key failure | ✓ v1.0 |
| University self-register + admin review | Quality gate without friction, scales without manual onboarding | ✓ v1.0 |
| English-only v1 | Defer i18n complexity; English is BIP lingua franca | ✓ v1.0 |
| LocalStorage bookmarks (no student accounts v1) | Cuts auth scope; bookmarks are low-value-per-user | ✓ v1.0 |
| Slug-based BIP URLs | SEO + shareability | ✓ v1.0 |
| Interactive Europe map as core feature | Discovery UX advantage over competitor's table | ✓ v1.0 |
| Multi-step submission wizard | Reduces abandonment vs single long form | ✓ v1.0 |
| Footer disclaimer + no EU emblem | Legal requirement around EC affiliation | ✓ v1.0 |
| `biphub-homepage.html` as v1 visual source of truth | Avoids design drift during build | ✓ v1.0 |
| EU palette deliberately chosen | Communicates context immediately to target users | ✓ v1.0 |
| Vertical MVP slicing | Each phase delivers shipped user capability | ✓ v1.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-14 after v1.0 milestone*
