---
status: resolved
phase: 06-saved-bips-sync
source: [06-VERIFICATION.md]
started: "2026-06-15T17:30:00.000Z"
updated: "2026-06-15T20:00:00.000Z"
---

## Current Test

[resolved — see Test 1 result]

## Tests

### 1. /bips CDN caching for anonymous visitors holds (D-bip-02-03)

expected: On a deployed instance, an unauthenticated request to `/bips` returns a CDN-cached response. The build reports `/bips` as `ƒ` Dynamic because `createClient()` reads `await cookies()` unconditionally, which opts the route out of Next.js 15 App Router's ISR for all visitors. `export const revalidate = 3600` is preserved in source and no save/unsave action calls `revalidatePath('/bips')`, so the documented invariant (no ISR bust) holds. The open question is whether Vercel's CDN still edge-caches the dynamic route's response.

**How to verify:** `curl -sI https://<deployment>/bips` twice without auth cookies and inspect headers.
- If `Cache-Control: public, s-maxage=3600` (or `X-Vercel-Cache: HIT` on the 2nd call) → CDN caching holds → mark VERIFIED.
- If `Cache-Control: private`/`no-cache` → `/bips` is truly dynamic (SSR) for every visitor → not a blocker, but update D-bip-02-03 to drop the "unauthenticated stays ISR-cached" claim, and consider the better alternative the 06-02 plan left on the table: gate the `getClaims()` read so anonymous requests skip it and the page returns to true ISR for the common case (relevant to FOUN-02 perf / LCP < 1.5s on this key page).

result: RESOLVED 2026-06-15. `curl -sI https://biphub-website.vercel.app/bips` (twice, no cookies) returned `Cache-Control: private, no-cache, no-store, must-revalidate` and `X-Vercel-Cache: MISS` both times — `/bips` is genuinely dynamic (SSR) for every visitor, not CDN-cached. The SUMMARY's "unauthenticated stays ISR-cached" claim was false. BUT `/bips` reads `searchParams` (filters), so it was always dynamic (since Phase 1) — not a Phase 6 regression. The real regression was `/bip/[slug]` (● → ƒ via `getClaims()`), now fixed back to `●` (commit 5722e2b): per-user saved hearts on the ISR pages are hydrated client-side via `SavedBipsHydrator` + `useSavedBipsStore`. Build confirms `/bip/[slug]` → `●`; 13/13 E2E + 51/51 unit green.

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
