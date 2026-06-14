# Phase 1: Discovery Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 1-Discovery Foundation
**Areas discussed:** /bips browse UX, Europe map at launch scale, Detail page layout + share/bookmark, Seed catalog composition

---

## /bips browse UX

### Filter layout

| Option | Description | Selected |
|--------|-------------|----------|
| Left sidebar (desktop) + bottom drawer (mobile) | ~280px sidebar with all 7 filters always visible; mobile slide-up drawer | ✓ |
| Sticky top bar with chip rows | Filters as pills in a sticky bar above the grid; active filters become removable chips | |
| Hybrid: left sidebar + sticky chip summary | Sidebar holds full panel; thin sticky bar above grid shows active filters as removable chips | |

**User's choice:** Left sidebar (desktop) + bottom drawer (mobile)
**Notes:** Search bar lives above the grid in the main column (separate from the sidebar) — implied by the chosen mockup.

### Pagination behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Numbered pagination (24/page) | Page 1, 2, 3 with `?page=N`. Best SEO, shareable, footer reachable. | ✓ |
| Load-more button (24/click) | Initial 24 cards, "Load more" appends 24. URL doesn't track count. | |
| Infinite scroll (24/page, auto) | Auto-fetch on scroll. Breaks footer, breaks back-button restoration, hurts SEO. | |
| Load-more + URL-tracked pages | Hybrid: "Load more" UI + shallow `?page=N` updates. SEO + footer + most engineering. | |

**User's choice:** Numbered pagination (24/page)
**Notes:** None.

### Default sort + empty-state CTA

| Option | Description | Selected |
|--------|-------------|----------|
| Sort: deadline soonest — Empty: 'Clear filters' + browse-all | Default surfaces actionable BIPs (deadlines coming). Empty: clear-filters + browse-all link. | ✓ (Claude's call) |
| Sort: newest — Empty: 'Clear filters' + browse-all | Default rewards return visits. Empty same. | |
| Sort: deadline soonest — Empty: clear-filters + 'Notify me when added' tease | Empty invites email for matching BIPs. STUD-02 territory; v2. | |
| Sort: deadline soonest — Empty: 'Are you a coordinator? List a BIP' | Empty pivots to coordinator acquisition. Dead-end in Phase 1; tonal mismatch. | |

**User's choice:** "Whatever you see best" → Claude defaulted to deadline-soonest + clean clear-filters empty state.
**Notes:** Reasoning logged in CONTEXT.md D-03/D-04. Coordinator pitch and email-signup were rejected as scope-mismatched for Phase 1.

---

## Europe map at launch scale

### Choropleth scaling at low BIP counts

| Option | Description | Selected |
|--------|-------------|----------|
| Quantile bins (relative scaling) | 5 tiers auto-assigned by quantile. Map looks alive day 1. Tier meaning shifts over time. | |
| Fixed bins, but small + honest | Small fixed thresholds (1, 2–3, 4–6, 7–10, 11+). Stable semantics. Sparse but honest day 1. | ✓ (Claude's call) |
| Binary: 'has BIPs' / 'no BIPs' | Two states only. Loses concentration signal once data grows. | |
| Quantile now, fixed later | Two implementations. Phase 1 ships quantile; switch at ~100 BIPs. More engineering. | |

**User's choice:** "Whatever you see fit" → Claude defaulted to fixed-bin small-scale.
**Notes:** Reasoning logged in CONTEXT.md D-05. Avoids quantile's "tier meaning shifts" landmine and the dual-implementation cost. 0-BIP countries get pale gray + "0 BIPs yet" tooltip. Tailwind safelist must include all six fill classes (already in PITFALLS).

---

## Detail page layout + share/bookmark

### Layout shape

| Option | Description | Selected |
|--------|-------------|----------|
| 2-column with sticky 'Apply' sidebar (desktop) | 340px right sidebar: deadline countdown, Apply CTA, key facts. Mobile: sticky bottom Apply bar. | ✓ |
| Single column, hero + facts strip | Single column. Horizontal facts strip below hero. Apply CTA twice (under hero + at end). | |
| Hybrid: 2-column desktop, single column < 1024px | Same as option 1 but higher mobile breakpoint. | |

**User's choice:** 2-column with sticky 'Apply' sidebar (desktop)
**Notes:** Mobile/tablet collapses to single column with sticky bottom Apply bar (D-10).

### Share button + bookmark UX (Claude's call)

The user delegated these implementation calls per the established pattern.

- **Share:** Web Share API (feature-detected) → silent fallback to copy-to-clipboard with toast. Single affordance, not two buttons.
- **Bookmark UI:** heart icon top-right of every BipCard in lists + heart icon in the detail-page sidebar action row. Filled when bookmarked.
- **Bookmark storage:** `localStorage["biphub:bookmarks"]` as JSON array of slugs; Zustand store hydrates on client mount to avoid RSC/client hydration mismatch.
- **No `/bookmarks` viewable list page** in v1 — would be scope creep (new route). Cross-device sync deferred to STUD-01 (v2).

---

## Seed catalog composition

### Source + quality bar for the 20 seed BIPs

| Option | Description | Selected |
|--------|-------------|----------|
| Real, manually researched from public university sites | Browse Erasmus offices' public pages, copy real BIPs verbatim with attribution. Highest credibility, slowest to assemble. | |
| Plausible synthetic data — marked clearly | Real universities + cities, fabricated programs/dates. "Demo data" badge until replaced. Fastest to ship; risks looking unserious. | ✓ |
| Hybrid: 5 real + 15 plausible synthetic | Curate 5 real BIPs by hand for Recently-Added; pad to 20 with synthetic for filter/map population. | |
| Defer until coordinator outreach lands | Don't ship Phase 1 with mock data. Plan launches once 20 real BIPs exist. | |

**User's choice:** Plausible synthetic data — marked clearly
**Notes:** Implementation calls bundled into CONTEXT.md D-15 through D-18: `is_seed boolean default false` column on `bips` table; "Demo data" pill rendered where `is_seed = true`; distribution constraints (≥10 countries, all 8 ISCED categories represented, mixed open/closed status, mixed languages, mixed study levels). Sourcing legality posture: no scraping of erasmusbip.org until ToS reviewed; synthetic data uses only publicly-known university/city names.

---

## Claude's Discretion

The user invoked the delegation pattern ("whatever you see best/fit") on these decisions, captured as my calls in CONTEXT.md:

- D-03 (default sort = deadline soonest)
- D-04 (empty-state = clear-filters + browse-all, no coordinator/email-signup CTA)
- D-05 (choropleth = fixed small-bin, NOT quantile)
- D-06 (0-BIP country = pale gray + neutral "0 BIPs yet" tooltip)
- D-07 (Tailwind safelist for six fill classes — already a known pattern, reaffirmed)
- D-08 (keyboard `<select>` fallback inside the map component)
- D-11 (Web Share API + silent clipboard fallback)
- D-12 (heart icon UI in card top-right + detail sidebar)
- D-13 (`localStorage["biphub:bookmarks"]` + Zustand hydration)
- D-14 (no `/bookmarks` viewable list page in v1)

If any of these need to be re-litigated, flag before `/gsd-plan-phase 1`.

---

## Deferred Ideas

Captured for future phases / v2 — see CONTEXT.md `<deferred>` for the canonical list. Summary:

- `/bookmarks` viewable list page — STUD-01 territory (v2).
- Empty-state coordinator CTA — reconsider once Phase 2's coordinator flow ships.
- Empty-state email-signup tease — STUD-02 (v2 student deadline reminders).
- Quantile-now-fixed-later choropleth — superseded by single-const fixed bins (D-05).
- Coordinator outreach script — off-platform, owned by user, runs in parallel with build.
- Real-BIP data import — data-only flip of `is_seed` flag once outreach yields real BIPs; no code change.
