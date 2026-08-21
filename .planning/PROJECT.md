# BipHub

## What This Is

BipHub is the free, open-source database for Erasmus+ Blended Intensive Programs (BIPs) — the EU's short-term mobility format that combines a 5-30 day physical exchange abroad with a compulsory virtual learning component. It serves students discovering BIPs, university coordinators listing them, and admins reviewing submissions. The product replaces erasmusbip.org, the only existing competitor, which is a broken WordPress site with no real search or self-service.

## Core Value

Students can reliably discover BIPs by country, field of study, and dates, and universities can self-service list their BIPs through a fast, professional submission flow with admin review.

## Current State

**Shipped:** v1.2 Coordinator BIP Builder (2026-08-10) — Phases 9–11, 16/16 plans, on top of v1.1 (2026-07-18, 3 phases, 17 plans) and v1.0 MVP (2026-06-14, 4 phases, 30 plans, ~24,500 LOC).
v1.2 delivered: builder wire-up of 4 orphaned columns (`virtual_sessions_count`, `virtual_duration_notes`, `accommodation_notes`, `partner_institutions_only`) + 2 live-bug fixes (`virtual_timing` 5-value enum, `max_participants` floor 10) with FOUN-14 anti-drift (3 seed sources + shared `BIP_EDIT_CONTENT_COLUMNS`), 0-code detail-page verification (17/17 `renderToStaticMarkup`, 1874ms), and Alert Subscriptions pipeline (field/country, weekly default + daily, 5-cap, HMAC unsubscribe, `pg_cron→pg_net→Edge Function→Resend` on `approved_at`, `cron.job_run_details` heartbeat 17:58 UTC, 4/4 E2E, 110 tests).

**Deferred at v1.2 close:** Phase 8 edit-outcome email (EDIT-07) + ISR revalidate timing (EDIT-04) manual UAT still outstanding — carried to v1.3 as Day-0 gate (see `STATE.md` Deferred Items). Phase 05 human-UAT closed 2026-08-12 per user instruction (cloud Custom Access Token hook).

**Next milestone:** v1.3 — Growth & Operational Efficiency — see Current Milestone below.

## Current Milestone: v1.3 Growth & Operational Efficiency (planning — plan approved 2026-08-12, see `.agents/plans/2026-08-12-v1-3-growth-ops.md`)

**Goal:** Close the shipped-but-unverified Phase 8 debt, then make BipHub retain coordinators year-over-year and make students compare/share BIPs — without adding a public API or rich-text editor.

**Target features (workstreams):**
- **Day 0 — Phase 8 verification gate** — run the 7-step `08-UAT.md` with `RESEND_API_KEY` set (EDIT-04 ISR within seconds + EDIT-07 all 3 emails). Must pass before new feature work counts as done.
- **Phase 12 — Duplicate BIP + Program Maturity (SUBM-15/16)** — `Duplicate` on approved/rejected/changes_requested → new draft (slug regen, `duplicated_from_bip_id` FK `ON DELETE SET NULL`, derived `Edition N` on detail page when `N>1`)
- **Phase 13 — Discovery: exclude partner-only + compare + shortlist (BROW-15, DISC-08/09, GROW-01 shortlist)** — `?partnerOnly=exclude` filter, client-state compare `?ids=a,b,c` (max 3, no table), shareable URL
- **Phase 14 — Admin ops (TOOL-01/02)** — CSV export + bulk approve/reject with per-row audit/ISR; TOOL-03 (view/save counts) deferred to v1.4

**Deferred to a later milestone:** Public read API + JSON-LD/SEO ("data layer for devs") — still postponed until audience (see `PROJECT.md` Out of Scope). Rich-text, photo uploads, funding calculator, reviews/ratings remain permanent anti-features.

*Requirements for v1.3 are at `.planning/REQUIREMENTS.md` (to be generated next). Roadmap: `.planning/ROADMAP.md`.*

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

#### Student Accounts & Coordinator Edit Flow (shipped in v1.1 — 2026-07-18)
- ✓ Student role + magic-link auth + dedicated `/student-dashboard`, role guards tightened (STUD-01/02/03, FOUN-07/08) — v1.1 Phase 5
- ✓ Server-side saved BIPs with cross-device sync + localStorage migration + GDPR cascade + `/privacy` enumeration (STUD-04..08, FOUN-09/10) — v1.1 Phase 6
- ✓ Coordinator edit of approved BIPs via admin re-review (live page stays public) + third "request changes" moderation state + audit trail + slug immutability (EDIT-01..09) — v1.1 Phase 8

### Active (v1.2 — scoping)

Requirements being defined for v1.2: coordinator BIP builder + BIP detail page, plus the carried-forward Phase 7 Alert Subscriptions + Email Pipeline (ALRT-01..08). See `.planning/REQUIREMENTS.md` once generated.

### Out of Scope

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
| Student role minted via Custom Access Token Hook | Role lands in the first JWT; RLS reads it without an extra round-trip | ✓ v1.1 |
| Magic-link (OTP) sign-in for students | No passwords for the low-friction student audience; institutional email not required | ✓ v1.1 |
| Shadow `bip_edits` table for approved-BIP edits | Live public page stays up during re-review; never mutate the approved row directly (PITFALLS approach, not snapshot) | ✓ v1.1 |
| `changes_requested` as a third moderation state | Lets admins request revisions without a hard reject; full audit trail in `bip_status_history` | ✓ v1.1 |
| `editMode` no-save wizard path (BUG-001 fix) | Approved-edit wizard advances on the Zustand draft alone; avoids widening RLS to let coordinators mutate live rows | ✓ v1.1 |
| Defer Phase 7 (alerts) to v1.2, ship v1.1 with 3/4 phases | Coordinator BIP-builder work unblocks BIP detail-page design; alerts are additive engagement, independent of shipped features | — v1.2 |

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
*Last updated: 2026-07-18 — completed v1.1 Product Depth & Engagement (Phases 5, 6, 8); Phase 7 deferred to v1.2*
