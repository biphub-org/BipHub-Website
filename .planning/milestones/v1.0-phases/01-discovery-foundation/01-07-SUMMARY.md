---
phase: "01"
plan: "07"
subsystem: "bip-detail"
tags: [detail-page, isr, og-image, share, bookmark, apply-cta, seo]
dependency_graph:
  requires: [01-02, 01-03, 01-04, 01-05]
  provides: [bip-detail-page, og-image, deadline-badge, apply-cta, share-button]
  affects: [student-discovery, seo, accessibility]
tech_stack:
  added:
    - sonner (toast library, via shadcn add)
    - next-themes (peer dep of sonner)
  patterns:
    - Next.js ISR revalidate=3600 with dynamicParams=true
    - PostgREST relational embed (one query, no N+1)
    - OG image with bundled Inter TTF (Pitfall 15)
    - Web Share API + clipboard.writeText fallback chain
    - Direct REST fetch in generateStaticParams (no cookies dependency)
key_files:
  created:
    - lib/queries/bipDetail.ts
    - lib/utils/deadline.ts
    - lib/utils/share.ts
    - app/(public)/bip/[slug]/page.tsx
    - app/(public)/bip/[slug]/loading.tsx
    - app/(public)/bip/[slug]/not-found.tsx
    - app/(public)/bip/[slug]/opengraph-image.tsx
    - components/bip/BipHeader.tsx
    - components/bip/BipBody.tsx
    - components/bip/BipSidebar.tsx
    - components/bip/BipMobileApplyBar.tsx
    - components/bip/BipApplyCta.tsx
    - components/bip/DeadlineBadge.tsx
    - components/bip/CountdownText.tsx
    - components/bip/ShareButton.tsx
    - components/bip/BipNotFound.tsx
    - components/ui/sonner.tsx
    - scripts/fetch-inter-fonts.ts
    - public/fonts/inter-bold.ttf
    - public/fonts/inter-semibold.ttf
  modified:
    - app/(public)/layout.tsx
    - package.json
decisions:
  - "ISR strategy: revalidate=3600 + dynamicParams=true; Phase 3 admin approve/reject will call revalidatePath() to bust cache immediately"
  - "Font bundling: inter-bold.ttf + inter-semibold.ttf from unpkg.com/inter-font@3.19.0 committed to public/fonts (OFL 1.1); not fetched from googleapis at runtime (GDPR + Pitfall 15)"
  - "ShareButton degradation chain: navigator.share (canShare check) -> navigator.clipboard.writeText (toast) -> silently unsupported"
  - "BipApplyCta branches: closed (disabled button) | type=url (Link target=_blank) | type=contact (mailto anchor)"
  - "Partner display: registered partners show university.name (country); free-text raw partners append (unverified) suffix"
  - "generateStaticParams uses direct REST fetch (no createClient/cookies dependency) — avoids cookies() outside request scope at build time"
metrics:
  duration: "~150min"
  completed_date: "2026-05-09"
  tasks_completed: 3
  tasks_total: 4
  files_created: 20
  files_modified: 2
---

# Phase 1 Plan 07: /bip/[slug] Detail Page Summary

**One-liner:** 2-column ISR detail page with PostgREST single-query embed, sticky 340px sidebar (deadline badge + Apply CTA + key facts), mobile fixed-bottom Apply bar, Web Share API + clipboard fallback, BookmarkHeartIsland reuse, per-BIP OG image with bundled Inter TTF, and `generateStaticParams` pre-rendering all 20 seed BIPs at build time.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Data layer, RSC page, ISR, metadata, body sections, not-found | `957095a` | Done |
| 2 | Sidebar, mobile apply bar, share button, Sonner toast | `881c6e6` | Done |
| 3 | OG image with bundled Inter fonts (Pitfall 15) | `14dbf45` | Done |
| 3b | Fix: ISR + generateStaticParams robust build-time behavior | `5aed480` | Done |
| 4 | Human verification (checkpoint) | - | Pending |

## What Was Built

### Data Layer (`lib/queries/bipDetail.ts`)
- `BipDetail` type — full BIP shape including nested `host_university` and `partners[]`
- `getBipBySlug(slug)` — single PostgREST relational embed query; avoids N+1 (Pitfall 21); uses `host_university:universities!host_university_id(...)` and `partners:bip_partner_universities(...)` in one `.select()`
- `getAllPublishedSlugs()` — direct REST fetch with anon key + `AbortSignal.timeout(5000)`; no `createClient()` or `cookies()` dependency; safe for `generateStaticParams` which runs outside request context

### Utilities
- `lib/utils/deadline.ts` — `computeDeadlineState(deadline, now?)` returns `{ state: 'urgent'|'info'|'closed'|'rolling', daysLeft, label }` using UTC midnight normalization; `formatRemaining(daysLeft)` helper
- `lib/utils/share.ts` — `shareBip({title, url})` returns `{shared: boolean, fallback?: 'clipboard'|'unsupported'}`; chain: `navigator.share` (canShare check) → `navigator.clipboard.writeText` → unsupported

### Route (`app/(public)/bip/[slug]/`)
- `page.tsx` — `revalidate = 3600`, `dynamicParams = true`, `generateStaticParams()` pre-renders 20 seed slugs, `generateMetadata()` with title template + description ≤155 chars + canonical `https://biphub.eu/bip/${slug}` + openGraph type 'article'
- `loading.tsx` — 2-col skeleton matching real layout
- `not-found.tsx` — delegates to `<BipNotFound />`
- `opengraph-image.tsx` — `runtime = 'nodejs'`, reads `inter-bold.ttf` + `inter-semibold.ttf` via `fs.readFile`; Satori-safe (flex-only, no CSS Grid, no calc, no CSS variables); gradient bg + BipHub wordmark + title + university + city/country + gold accent bar + ECTS chip; branded fallback for missing slugs

### Components
- `BipHeader.tsx` — h1 title (text-3xl/text-[44px]); "Demo data" pill for is_seed=true; subtitle with host name, city, country; badge chips for green_travel + inclusion_support
- `BipBody.tsx` — 7 conditional sections (About, Learning Outcomes, Virtual Component, Partners, Eligibility, How to Apply, Contact); partner display: registered shows `name (country)`, free-text raw appends `(unverified)` suffix; How to Apply: url=external Link, contact=mailto anchor
- `BipSidebar.tsx` — `'use client'`, `hidden lg:block sticky top-[88px]`; DeadlineBadge + BipApplyCta (fullWidth) + dl with 5 key facts + ShareButton + BookmarkHeartIsland
- `BipMobileApplyBar.tsx` — `'use client'`, `fixed bottom-0 inset-x-0 h-16 bg-white border-t z-30`; CountdownText + BipApplyCta
- `BipApplyCta.tsx` — `'use client'`; branch: closed → disabled button; type='url' → Link target=_blank; type='contact' → mailto anchor
- `DeadlineBadge.tsx` — state-based color classes; shows label from `computeDeadlineState()`
- `CountdownText.tsx` — RSC (no 'use client'); renders colored label span
- `ShareButton.tsx` — `'use client'`; 44×44px touch target (w-11 h-11); aria-label="Share this BIP"; Sonner toast on clipboard fallback
- `BipNotFound.tsx` — centered card with IconSearchOff, "BIP not found" h1, description, Browse all BIPs link

### Infrastructure
- `components/ui/sonner.tsx` — Sonner Toaster via `npx shadcn@latest add sonner`
- `scripts/fetch-inter-fonts.ts` — idempotent font downloader from unpkg.com/inter-font@3.19.0
- `public/fonts/inter-bold.ttf` (316KB) + `public/fonts/inter-semibold.ttf` (316KB) — OFL 1.1
- `app/(public)/layout.tsx` — Toaster added after Footer with `position="bottom-right"`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `getAllPublishedSlugs` cookies() dependency**
- **Found during:** Task 1 verification — `generateStaticParams` runs outside request context at build time
- **Issue:** Original implementation called `createClient()` which calls `await cookies()`; this throws "cookies() was called outside a request scope" during `generateStaticParams`
- **Fix:** Rewrote `getAllPublishedSlugs` to use direct REST fetch with anon key headers + `AbortSignal.timeout(5000)`; no cookies, no `createClient()`
- **Files modified:** `lib/queries/bipDetail.ts`
- **Commit:** `5aed480`

**2. [Rule 3 - Blocking] Font download URL 404**
- **Found during:** Task 3 — running `scripts/fetch-inter-fonts.ts`
- **Issue:** `https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.ttf` returned 404
- **Fix:** Switched to `https://unpkg.com/inter-font@3.19.0/ttf/Inter-Bold.ttf` (and SemiBold equivalent)
- **Files modified:** `scripts/fetch-inter-fonts.ts`
- **Commit:** `14dbf45`

**3. [Rule 3 - Blocking] sonner not installed when ShareButton imported toast**
- **Found during:** Task 2 build
- **Issue:** `ShareButton.tsx` imported from `'sonner'` which was not yet in package.json
- **Fix:** Ran `npx shadcn@latest add sonner` which created `components/ui/sonner.tsx` and added sonner + next-themes to package.json
- **Files modified:** `package.json`, `components/ui/sonner.tsx` (new), `app/(public)/layout.tsx`
- **Commit:** `881c6e6`

**4. [Rule 1 - Bug] DYNAMIC_SERVER_USAGE in production server**
- **Found during:** Task 1 smoke test on production build
- **Issue:** When `generateStaticParams` returned `[]` (due to cookies error), Next.js set `fallback: null`, treating all slugs as static-only, conflicting with `cookies()` in `getBipBySlug`; fix #1 (try/catch) was insufficient
- **Fix:** Full rewrite of `getAllPublishedSlugs` to use direct REST (no cookies) enabling pre-rendering of all 20 seed BIPs; added `dynamicParams = true`
- **Files modified:** `lib/queries/bipDetail.ts`, `app/(public)/bip/[slug]/page.tsx`
- **Commit:** `5aed480`

## Known Stubs

None. All sections render from live Supabase data. Partners, deadline, apply CTA, and OG image all wire to real BIP fields.

## Threat Flags

None. The `/bip/[slug]` route reads only approved BIPs via RLS + anon key. No new network endpoints, auth paths, or trust boundary changes introduced.

## Self-Check: PASSED

Files verified:
- lib/queries/bipDetail.ts — FOUND
- lib/utils/deadline.ts — FOUND
- lib/utils/share.ts — FOUND
- app/(public)/bip/[slug]/page.tsx — FOUND
- app/(public)/bip/[slug]/opengraph-image.tsx — FOUND
- components/bip/BipHeader.tsx — FOUND
- components/bip/BipBody.tsx — FOUND
- components/bip/BipSidebar.tsx — FOUND
- components/bip/BipMobileApplyBar.tsx — FOUND
- components/bip/ShareButton.tsx — FOUND
- components/bip/BipNotFound.tsx — FOUND
- public/fonts/inter-bold.ttf — FOUND
- public/fonts/inter-semibold.ttf — FOUND

Commits verified:
- 957095a — FOUND
- 881c6e6 — FOUND
- 14dbf45 — FOUND
- 5aed480 — FOUND
