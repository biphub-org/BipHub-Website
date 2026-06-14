---
phase: 04-polish-static-content-performance-hardening
plan: 02
subsystem: ui
tags: [privacy, gdpr, static-content, rsc, footer, force-static]

# Dependency graph
requires:
  - phase: 01-discovery-foundation
    provides: Footer.tsx (INFO-03 disclaimer host) and Eyebrow component, both consumed unchanged by the new privacy page
  - phase: 04-polish-static-content-performance-hardening (Plan 04-01)
    provides: Static RSC content-page pattern (`force-static`, Eyebrow + clamp() heading rhythm, canonical metadata) reused verbatim
provides:
  - Static /privacy RSC page documenting all storage surfaces, GDPR Art 15–17 rights, and the zero-analytics posture
  - Footer Project-column link to /privacy reachable from every public-route page
  - Reference posture statement that justifies skipping a consent banner (FOUN-05 satisfied by absence)
affects: [04-04 (CONTRIBUTING.md may cross-reference the privacy page), 04-05 (account deletion vertical slice — /dashboard/settings is named in this policy)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RSC static page with `export const dynamic = 'force-static'` and explicit `alternates.canonical`"
    - "Single-column long-form legal layout at max-w-[800px] (vs the 2-column jump-link layout used by /what-is-a-bip)"
    - "GDPR storage-surface enumeration: list every cookie/localStorage key/table by name with purpose + legal basis"

key-files:
  created:
    - "app/(public)/privacy/page.tsx"
  modified:
    - "components/home/Footer.tsx"

key-decisions:
  - "Single-column 800px layout (no jump-link sidebar) because privacy policies are read top-to-bottom"
  - "Inline mailto links to team@hexonasystems.com in 4 places (Data Controller, Your rights, How to exercise, Updates) so the contact channel is unmissable"
  - "No consent banner shipped — documented in the 'No analytics' paragraph and 'Legal basis' section; the absence is the FOUN-05 mitigation"
  - "Date '2026-05-13' hard-coded as a literal string (no dynamic Date computation) so force-static prerender stays stable"

patterns-established:
  - "Storage-surface enumeration: when a feature adds a new cookie, localStorage key, or PII table column, the privacy page's 'What we collect' section must gain a matching named paragraph"
  - "Legal-page rhythm: Eyebrow → h2 (clamp 24–32px) → text-ink-2 leading-relaxed prose body in space-y-4"

requirements-completed: [FOUN-05, FOUN-06]

# Metrics
duration: 18min
completed: 2026-05-14
---

# Plan 04-02: /privacy static policy page + Footer link Summary

**Static privacy policy at /privacy enumerating every storage surface (Supabase Auth cookies, biphub:bookmarks, bip-draft, profile/submission content) and documenting the zero-analytics posture; Footer Project column gains a Privacy policy link above GitHub.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-13 (late session)
- **Completed:** 2026-05-14
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 edited)

## Accomplishments
- Shipped `/privacy` as a static (○) route — 772-word body inside the locked 600–900 range
- Documented every storage surface by name with its legal basis and retention behaviour
- Named team@hexonasystems.com as data controller contact across four sections
- Established zero-analytics posture in writing, removing the requirement for a consent banner in v1 (FOUN-05 mitigated by absence-of-trackers)
- Linked the privacy page from the public Footer Project column on every (public) route while preserving the INFO-03 disclaimer verbatim

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /privacy static RSC** — `21ec9bc` (feat)
2. **Task 2: Add /privacy link to Footer Project column** — `16e8e45` (feat)

## Files Created/Modified
- `app/(public)/privacy/page.tsx` — created; 8-section static RSC privacy policy with force-static + canonical metadata
- `components/home/Footer.tsx` — added a single `<li>` with `<Link href="/privacy">` above the existing GitHub link in the Project column

## Decisions Made
- **Single-column 800px layout** instead of the 2-column jump-link layout used by /what-is-a-bip — long-form legal copy reads top-to-bottom and a sticky sidebar would distract.
- **Mailto link, not plain text**, for team@hexonasystems.com — friction-free exercise of GDPR rights is a soft UX requirement on top of the strict GDPR Art 13 transparency obligation.
- **Hard-coded "Last updated: 2026-05-13"** — `force-static` prerender must be stable; future updates bump the literal manually.
- **No consent banner** — the privacy page itself is the artefact that proves no consent-requiring data is collected, so a cookie banner would be both unnecessary and misleading.

## Deviations from Plan

None — plan executed exactly as written. Word count landed at 772 (within the 600–900 D-03 lock); all acceptance-criteria greps return their expected matches; INFO-03 disclaimer string preserved byte-for-byte; the `/what-is-a-bip` link, GitHub link, em-dash, and lack of trailing period in the disclaimer are all unchanged.

## Issues Encountered

None. `npm run build` clean on both task commits; `/privacy` listed as a static (○) route in the build output at 146 B First Load + 102 kB shared chunks.

## User Setup Required

None — no external services touched.

## Next Phase Readiness
- Plan 04-03 (static OG PNGs) ready to start; no shared state with this plan.
- Plan 04-05 (account deletion) is now coupled to this policy: the /dashboard/settings → Delete account path is referenced in two sections (Retention, Your rights, How to exercise). When 04-05 ships, no edits to /privacy are needed because the policy already describes the behaviour 04-05 will implement.

---
*Phase: 04-polish-static-content-performance-hardening*
*Completed: 2026-05-14*
