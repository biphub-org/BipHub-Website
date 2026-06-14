---
phase: 04-polish-static-content-performance-hardening
plan: 01
subsystem: ui
tags: [nextjs, static-rsc, accordion, base-ui, seo, info-pages]

# Dependency graph
requires:
  - phase: 01-discovery-foundation
    provides: "(public) layout with StickyNav + Footer + Toaster; Eyebrow component; @base-ui/react Accordion shadcn wrapper; Footer link href=\"/what-is-a-bip\" forward-declared in Plan 01-04"
provides:
  - "/what-is-a-bip static RSC route (force-static)"
  - "Resolved forward-declared Footer link from Plan 01-04 (no more 404 from public footer)"
  - "Locked v1 FAQ copy for BIP explainer (8 items, D-06 verbatim)"
  - "Outbound EC programme-guide link with affiliation-safe link text"
affects: [04-02-PLAN.md (mirror /privacy static page structure), 04-03-PLAN.md (static OG metadata pattern), 04-07-PLAN.md (a11y axe sweep over /what-is-a-bip)]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Static RSC info page pattern: force-static + canonical alternates + Eyebrow + h2 clamp() + section ids matching desktop sidebar jump-links + literal Tailwind class names throughout"]

key-files:
  created:
    - "app/(public)/what-is-a-bip/page.tsx"
  modified:
    - ".planning/STATE.md"
    - ".planning/ROADMAP.md"

key-decisions:
  - "FAQ items inlined as 8 literal AccordionItem blocks rather than .map() iteration — keeps the locked v1 copy auditable in source control and satisfies the literal-grep acceptance criterion (8 AccordionItem occurrences)"
  - "@base-ui/react Accordion uses multiple prop (not type='single') — replicates the exact API shipped in Plan 01-06 BipFiltersSidebar; multiple FAQ items can stay expanded simultaneously"
  - "Desktop jump-link sidebar uses native <a href=\"#id\"> anchors with scroll-mt-24 utility for offset under StickyNav — no client JS needed"
  - "Outbound EC link text locked to 'Read the official Erasmus+ programme guide entry on BIPs' (no EC affiliation claim per CLAUDE.md never-do)"
  - "Inline <Link href=\"/bips\"> within FAQ answer 4 and 'How to find one' section reuses the existing /bips browse route; no new client islands needed"

patterns-established:
  - "Static info-page shell: container max-w-[1200px] + 2-col lg grid (200px sidebar / 1fr content) + sticky top-24 jump-link nav on desktop only — reusable by /privacy in Plan 04-02"
  - "Static OG-free pages still set metadata.alternates.canonical for SEO; openGraph images are added in Plan 04-03 via static PNGs"

requirements-completed: [INFO-01, INFO-02, INFO-04]

# Metrics
duration: ~25min
completed: 2026-05-13
---

# Phase 04-01: /what-is-a-bip static explainer Summary

**Static RSC explainer at /what-is-a-bip with 5 anchored sections, 8-item FAQ accordion (@base-ui/react multiple), and an outbound link to the EC Erasmus+ programme guide — all rendered as a single static route (force-static) with desktop jump-link sidebar.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-13
- **Completed:** 2026-05-13
- **Tasks:** 1
- **Files modified:** 3 (1 created, 2 planning files updated)

## Accomplishments

- New `/what-is-a-bip` static route shipped, listed by `next build` as `○ (Static)` with First Load JS = 120 kB
- Forward-declared footer link from Plan 01-04 now resolves to a real page — no more 404 for the "What is a BIP?" footer entry
- INFO-01 covered: KA131 context, 5–10 day physical mobility, mandatory virtual component, ECTS, eligibility, language requirements all explained in plainspoken prose
- INFO-02 covered: 8-item locked FAQ accordion per D-06, each answer 2–4 sentences
- INFO-04 covered: outbound link to the official Erasmus+ programme guide with `rel="noopener noreferrer"` and affiliation-safe link text
- Desktop sidebar with sticky jump-links to all 5 sections; mobile collapses cleanly to a single column

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /what-is-a-bip static RSC with 5 sections + 8-item FAQ + EC outbound link** — `0baeef6` (feat)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `app/(public)/what-is-a-bip/page.tsx` — created. Server Component, `export const dynamic = 'force-static'`, metadata with canonical alternate, 2-column grid (desktop sidebar + main content), 5 anchored sections, 8 inline AccordionItem FAQs, EC outbound link section.
- `.planning/STATE.md` — updated stopped_at + last_activity + progress counters (24/30 plans, 80%).
- `.planning/ROADMAP.md` — marked 04-01-PLAN.md as `[x]` complete and updated Phase 4 plan count to 1/7.

## Decisions Made

- **FAQ inlined, not mapped** — the plan's acceptance criterion `grep -c "AccordionItem" → 8` was written assuming literal inline JSX. An initial implementation used a `.map()` over a FAQS array (returning grep count 3: import + open tag + close tag). Refactored to 8 inline `<AccordionItem value="faq-N">` blocks so the locked v1 copy is auditable in source control and the AC holds verbatim. No runtime behaviour change.
- **`multiple` prop, not `type='single'`** — confirmed against the existing `BipFiltersSidebar` consumer; `@base-ui/react/accordion` exposes `Accordion.Root` with a `multiple` boolean prop, not Radix-style `type` discriminator.
- **Desktop sidebar uses native `<a href="#id">`** with `scroll-mt-24` on each section — no smooth-scroll JS, no client island, fully static.

## Deviations from Plan

None - plan executed exactly as written. The inlining refactor described above brought the implementation into stricter literal conformance with an AC; behaviour matches the plan.

## Issues Encountered

- The literal-grep `AccordionItem` AC initially returned 3 (import + JSX open + JSX close) when the FAQ was generated via `.map()`. Resolved by inlining all 8 AccordionItem JSX blocks — see Decisions above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-02 (`/privacy` static policy page) can reuse the same static info-page shell pattern established here: `container max-w-[1200px]` + 2-col `lg:grid-cols-[200px_1fr]` + sticky top-24 jump-link sidebar + `Eyebrow` + `h2 clamp(28px,3.5vw,40px)` headings + literal Tailwind classes.
- Plan 04-03 will add `metadata.openGraph.images` to homepage and `/bips`; the canonical-alternate pattern used here is the template.
- Plan 04-07 a11y axe sweep should include `/what-is-a-bip` — accordion focus rings + section heading hierarchy already conform to the existing `BipFiltersSidebar` pattern.

---
*Phase: 04-polish-static-content-performance-hardening*
*Completed: 2026-05-13*
