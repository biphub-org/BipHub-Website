---
phase: 06-saved-bips-sync
verified: 2026-06-15T00:00:00Z
status: human_needed
score: 14/15 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Confirm whether /bips serves ISR-cached responses to unauthenticated users at the CDN/network level"
    expected: "An unauthenticated curl to /bips returns a cached response (Cache-Control: s-maxage=3600 or X-Vercel-Cache: HIT), proving the CDN caches it despite the Next.js ƒ Dynamic marker"
    why_human: "Next.js 15 App Router marks any route that reads cookies() as ƒ Dynamic for ALL requests — including anonymous. The build confirms /bips is ƒ. The must-have 'unauthenticated requests remain ISR-cached' requires observing actual CDN behaviour (Vercel edge cache headers), which cannot be verified by reading source code."
---

# Phase 6: Saved BIPs Sync Verification Report

**Phase Goal:** Signed-in students can save BIPs server-side (persisting across reload), view them at /student-dashboard/saved, delete their account (FK cascade removes saved_bips), with a one-time legacy localStorage sweep and a /privacy enumeration of the new PII table.
**Verified:** 2026-06-15
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The saved_bips table exists with RLS enabled and 4 policies (no UPDATE policy) | VERIFIED | `supabase/migrations/00016_saved_bips.sql` — `enable row level security`, all 4 named policies (select_own/insert_own/delete_own/select_admin), no `for update` keyword |
| 2 | A user can only SELECT/INSERT/DELETE their own saved_bips rows; admins can SELECT all | VERIFIED | Migration: `using ((select auth.uid()) = user_id)` on select/delete, `with check ((select auth.uid()) = user_id)` on insert; admin policy checks `app_metadata.role = 'admin'` |
| 3 | saved_bips.user_id has an ON DELETE CASCADE FK to auth.users | VERIFIED | Migration line 21: `user_id uuid not null references auth.users(id) on delete cascade`; E2E FOUN-09 test asserts zero rows after user deletion (13/13 green per SUMMARY) |
| 4 | SaveBipSchema validates bipId as a Zod v3 UUID | VERIFIED | `lib/schemas/saved-bips.ts` — `z.string().uuid({ message: 'Invalid BIP id.' })`; 4 unit tests covering valid UUID, invalid, empty, missing field |
| 5 | parseLegacyBookmarkIds returns only valid UUIDs, deduped; null/malformed returns [] | VERIFIED | `lib/legacy-bookmarks.ts` — pure module (no react/next/supabase imports); 7 unit tests covering all cases in the plan's behavior block |
| 6 | saveAction/unsaveAction persist state server-side (cross-device) | VERIFIED | `lib/actions/saved-bips.ts` — Server Actions writing to `saved_bips` via anon+RLS client; E2E STUD-04/STUD-05 test saves, reloads, clears cookies, re-signs-in, asserts BIP still in saved list |
| 7 | A signed-out or non-student clicking the heart is routed to /register/student | VERIFIED | `SaveToggleIsland.tsx` line 68-72: `if (!isStudent) { router.push('/register/student'); return }` |
| 8 | Save/unsave does NOT call revalidatePath('/bips') | VERIFIED | `lib/actions/saved-bips.ts` — no import of `revalidatePath`; comment on line 57 explicitly documents the prohibition; grep confirms absence |
| 9 | /bips ISR cache (revalidate=3600) is preserved in source AND /bips renders as ƒ Dynamic at build time | UNCERTAIN | `export const revalidate = 3600` present at line 58 of `/bips/page.tsx`. Build output shows `/bips` as `ƒ` Dynamic — because `await createClient()` reads `cookies()` unconditionally, Next.js 15 App Router marks the route dynamic for ALL visitors. D-bip-02-03 explicitly accepts this tradeoff. The SUMMARY claim "unauthenticated requests remain ISR-cached" may hold at the Vercel CDN layer if the CDN caches based on cache-control headers independently, but cannot be verified from source alone. See Human Verification section. |
| 10 | LegacySweepIsland is one-time, idempotent, clears the key, silent on absence | VERIFIED | `components/student/LegacySweepIsland.tsx` — `useEffect([], [])` mount-once; reads `biphub:bookmarks`; early return if null; calls `migrateLegacyBookmarksAction(raw).then(() => localStorage.removeItem(LEGACY_KEY)).catch(() => {})` |
| 11 | /student-dashboard/saved lists all saved BIPs (most-recent first, approved-only) with empty state | VERIFIED | `app/(student)/student-dashboard/saved/page.tsx` — calls `getSavedBips(userId)` (orders by saved_at desc, approved filter in query layer); BipGrid with full Set and isStudent=true; empty state "No saved BIPs yet" + "Browse BIPs" CTA present |
| 12 | /student-dashboard shows Saved BIPs summary (count + View all) and DeleteAccountDialog | VERIFIED | `app/(student)/student-dashboard/page.tsx` — `getSavedBipsCount`, `DeleteAccountDialog`, `LegacySweepIsland` all imported and rendered; "coming in a future update" string is absent from the file; Saved BIPs card links to /student-dashboard/saved |
| 13 | After account deletion, zero saved_bips rows remain for the deleted user | VERIFIED | E2E test STUD-08/FOUN-09 creates throwaway student, saves a BIP via service-role, drives DeleteAccountDialog UI, asserts `/?deleted=1` redirect, then reads `saved_bips` via service-role and asserts count = 0 |
| 14 | /privacy enumerates saved_bips (fields, purpose, retention, cascade-deletion) and reconciles the stale biphub:bookmarks claim | VERIFIED | `app/(public)/privacy/page.tsx` — contains "Saved BIPs" section with `saved_bips`, `saved_at`, "cascading deletion via foreign key"; "Legacy bookmark sweep" paragraph present; stale "this data never leaves your device" claim is absent; `export const dynamic = 'force-static'` preserved |
| 15 | E2E spec covers STUD-04, STUD-05, STUD-07, STUD-08, FOUN-09, FOUN-10 with semantic selectors | VERIFIED | `tests/e2e/saved-bips.spec.ts` — 5 tests covering all 6 req IDs; uses `getByRole`, `getByText` (no className targeting); SUPABASE_SERVICE_ROLE_KEY in env; no STUD-06 E2E (D-02a); playwright.config.ts testMatch updated to `/(student-auth|saved-bips)\.spec\.ts$/` |

**Score: 14/15 truths verified** (1 UNCERTAIN — see Human Verification)

---

## ISR Invariant Analysis (High-Risk Item)

The must-have "Save/unsave never busts the /bips ISR cache (revalidate=3600 stays intact)" has two sub-claims:

**Sub-claim A — Save/unsave actions do not call revalidatePath('/bips').** VERIFIED. The actions contain no import or call to `revalidatePath`. The prohibition is documented in a comment in the source.

**Sub-claim B — /bips remains ISR-cached for unauthenticated visitors.** UNCERTAIN.

The `/bips/page.tsx` unconditionally calls `await createClient()` then `supabase.auth.getClaims()` on every render. In Next.js 15 App Router, `createClient()` internally calls `await cookies()`. Reading `cookies()` opts the entire route into dynamic rendering for ALL requests — this is a per-route, not per-request, decision at build/render time. The build confirms this: `/bips` shows as `ƒ` (Dynamic), not `○` (Static) or the ISR indicator.

The SUMMARY (06-04, D-bip-02-03 / RESEARCH A2) claims "unauthenticated requests remain ISR-cached at the CDN." This claim is technically possible at the Vercel edge layer if Next.js emits a `Cache-Control: s-maxage=3600, stale-while-revalidate` header even for dynamically-rendered routes that also declare `export const revalidate`, and the CDN honours it for cookie-less requests. However, in standard Next.js 15 App Router behaviour, a route marked `ƒ` does NOT participate in ISR — the `revalidate` export is ignored when the route opts into dynamic rendering.

**The source code satisfies the letter of the constraint** (no revalidatePath call, revalidate=3600 declaration present). **Whether unauthenticated visitors actually get a CDN-cached response is a runtime/CDN question** that requires human observation of response headers.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/00016_saved_bips.sql` | Table + 4 RLS policies + 2 indexes + FK cascade | VERIFIED | All elements present verbatim |
| `lib/schemas/saved-bips.ts` | SaveBipSchema (Zod v3 UUID) | VERIFIED | Exports SaveBipSchema and SaveBipInput |
| `lib/legacy-bookmarks.ts` | parseLegacyBookmarkIds pure function | VERIFIED | No react/next/supabase imports; full defensive logic |
| `tests/schemas/saved-bips.test.ts` | 11 unit tests covering behavior block | VERIFIED | 11 tests — 4 SaveBipSchema + 7 parseLegacyBookmarkIds |
| `lib/supabase/database.types.ts` | Contains saved_bips Row/Insert/Update | VERIFIED | Lines 311-339 — Row, Insert, Update types present; bip_id FK relation present; note: auth.users FK not in Relationships array (Supabase gen types does not expose auth-schema FKs in public types — this is expected behaviour) |
| `lib/actions/saved-bips.ts` | saveAction, unsaveAction, migrateLegacyBookmarksAction | VERIFIED | All 3 exports; 'use server'; getClaims() only; no getSession/createAdminClient/revalidatePath('/bips') |
| `lib/queries/savedBips.ts` | getSavedBipIds, getSavedBips, getSavedBipsCount, isBipSaved | VERIFIED | All 4 exports; approved-only filter; saved_at desc ordering |
| `components/bip/SaveToggleIsland.tsx` | Client island with useOptimistic heart toggle | VERIFIED | 'use client'; Heart from lucide-react; useOptimistic+useTransition; /register/student redirect; aria-pressed; min-h-[44px]; static ICON_CLASSES/BUTTON_LABELS lookups |
| `components/bip/BipSaveButton.tsx` | Detail-page button-mode wrapper | VERIFIED | Thin wrapper rendering SaveToggleIsland with displayStyle="button" |
| `components/bip/BipCard.tsx` | RSC with div outer, Link block child, island sibling | VERIFIED | No 'use client'; `<div className="group relative ...">` outer; SaveToggleIsland rendered after `</Link>` as a sibling with `absolute right-3 top-[102px]` |
| `components/bip/BipGrid.tsx` | Accepts savedBipIds and isStudent, passes to BipCard | VERIFIED | Optional props with defaults; initialSaved={savedBipIds.has(bip.id)} |
| `app/(public)/bips/page.tsx` | Calls getSavedBipIds; preserves revalidate=3600; renders BipGrid with saved state | VERIFIED | getSavedBipIds called; revalidate=3600 at line 58; BipGrid receives savedBipIds and isStudent |
| `app/(public)/bip/[slug]/page.tsx` | Calls isBipSaved; renders BipSaveButton via slot | VERIFIED | isBipSaved called; BipSaveButton passed as saveButton ReactNode to BipSidebar and BipMobileApplyBar |
| `app/(student)/student-dashboard/saved/page.tsx` | RSC saved-BIPs list reusing BipGrid | VERIFIED | getSavedBips called; isStudent=true; empty state present |
| `components/student/LegacySweepIsland.tsx` | Null-UI client island; one-time sweep | VERIFIED | 'use client'; migrateLegacyBookmarksAction; biphub:bookmarks; returns null |
| `app/(student)/student-dashboard/page.tsx` | Saved summary + DeleteAccountDialog + LegacySweepIsland | VERIFIED | All three imported and rendered; coming-soon text absent |
| `app/(public)/privacy/page.tsx` | saved_bips paragraph + legacy sweep reconciliation; force-static | VERIFIED | force-static preserved; both paragraphs present; stale claim absent |
| `tests/e2e/saved-bips.spec.ts` | Playwright E2E for STUD-04/05/07, STUD-08, FOUN-09, FOUN-10 | VERIFIED | 5 tests; semantic selectors; throwaway student for deletion; SUPABASE_SERVICE_ROLE_KEY env |
| `playwright.config.ts` | student-authed project testMatch includes saved-bips | VERIFIED | testMatch: `/(student-auth|saved-bips)\.spec\.ts$/`; retries: 0; workers: 1 unchanged |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `components/bip/SaveToggleIsland.tsx` | `lib/actions/saved-bips.ts` | saveAction/unsaveAction in startTransition | WIRED | Direct import and call on lines 26 and 78-79 |
| `app/(public)/bips/page.tsx` | `lib/queries/savedBips.ts` | getSavedBipIds(userId) | WIRED | Import at line 6; call at line 78 |
| `components/bip/BipCard.tsx` | `components/bip/SaveToggleIsland.tsx` | sibling of Link in JSX | WIRED | Import at line 41; rendered after `</Link>` at line 176 |
| `app/(student)/student-dashboard/saved/page.tsx` | `lib/queries/savedBips.ts` | getSavedBips(userId) | WIRED | Import at line 7; call at line 35 |
| `app/(student)/student-dashboard/page.tsx` | `components/dashboard/DeleteAccountDialog.tsx` | accountEmail={email} | WIRED | Import at line 7; rendered at line 84 |
| `components/student/LegacySweepIsland.tsx` | `lib/actions/saved-bips.ts` | migrateLegacyBookmarksAction in useEffect | WIRED | Import at line 4; called at line 22 |
| `supabase/migrations/00016_saved_bips.sql` | `auth.users` | user_id references auth.users(id) on delete cascade | WIRED | Line 21 of migration |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/(student)/student-dashboard/saved/page.tsx` | `saved` | `getSavedBips(userId)` | Yes — PostgREST join on saved_bips → bips → universities; approved-only filter | FLOWING |
| `app/(student)/student-dashboard/page.tsx` | `savedCount` | `getSavedBipsCount(userId)` | Yes — PostgREST count=exact HEAD query on saved_bips | FLOWING |
| `app/(public)/bips/page.tsx` | `savedBipIds` | `getSavedBipIds(userId)` | Yes — PostgREST select bip_id from saved_bips; returns empty Set for anon | FLOWING |
| `components/bip/SaveToggleIsland.tsx` | `optimisticSaved` | `initialSaved` prop (from server) + useOptimistic | Yes — server-derived initialSaved + optimistic update | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for live-server checks (requires running server). Covered by E2E suite (13/13 green per SUMMARY).

Unit test check:
| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SaveBipSchema + parseLegacyBookmarkIds | `npx vitest run tests/schemas/saved-bips.test.ts` | 11/11 per SUMMARY | PASS (SUMMARY-attested; file reads confirm test substance) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| STUD-04 | 06-01, 06-02, 06-03, 06-04 | Student can save a BIP and remove it | SATISFIED | saveAction/unsaveAction wired to SaveToggleIsland; E2E proves save+unsave with server persistence |
| STUD-05 | 06-01, 06-02, 06-04 | Saved BIPs are stored server-side, sync across devices | SATISFIED | Server Actions write to saved_bips table; E2E proves fresh-session round-trip |
| STUD-06 | 06-01, 06-02, 06-03 | localStorage bookmarks migrate to account on first sign-in | SATISFIED | parseLegacyBookmarkIds (unit-tested pure core) + migrateLegacyBookmarksAction (server) + LegacySweepIsland (client, one-time); no E2E by design (D-02a) |
| STUD-07 | 06-02, 06-03, 06-04 | Student can view all saved BIPs in one place on dashboard | SATISFIED | /student-dashboard/saved RSC; getSavedBips; BipGrid with full Set; E2E asserts page heading + title visible |
| STUD-08 | 06-03, 06-04 | Student can delete their own account and all associated data | SATISFIED | DeleteAccountDialog reused verbatim on student dashboard; deleteAccountAction (existing RPC); E2E drives UI and asserts /?deleted=1 |
| FOUN-09 | 06-01, 06-04 | Account erasure cascades all new v1.1 PII | SATISFIED | ON DELETE CASCADE FK in migration; E2E asserts zero saved_bips rows post-deletion via service-role read |
| FOUN-10 | 06-03, 06-04 | /privacy enumerates every new v1.1 data surface | SATISFIED | /privacy contains saved_bips paragraph (user_id, bip_id, saved_at, purpose, retention, cascade-deletion) and Legacy bookmark sweep paragraph; E2E asserts text visibility |

All 7 requirements assigned to Phase 6 are covered by at least one plan and have observable implementation evidence.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `lib/actions/saved-bips.ts` | None — no getSession, no createAdminClient, no revalidatePath('/bips') | — | Clean |
| `supabase/migrations/00016_saved_bips.sql` | No UPDATE policy | — | Correct by design; CLAUDE.md N/A here (save/unsave is insert/delete only) |
| `components/bip/SaveToggleIsland.tsx` | No template-literal classnames | — | Static lookup objects ICON_CLASSES and BUTTON_LABELS comply with CLAUDE.md |
| `components/bip/BipCard.tsx` | No 'use client' | — | Remains RSC; SaveToggleIsland island handles client interaction |
| `app/(public)/privacy/page.tsx` | force-static preserved; no new imports | — | Clean; pre-existing comment containing 'use client' text is in a JSDoc block, not a directive |

No blockers found in anti-pattern scan.

---

### Human Verification Required

#### 1. /bips ISR for unauthenticated visitors

**Test:** Deploy the current build to a Vercel preview (or use the production URL). Send a curl request without any auth cookies:
```
curl -I https://biphub.eu/bips
```
Repeat twice (second request should hit CDN cache if ISR is working).

**Expected:** Response headers show `Cache-Control: public, s-maxage=3600, stale-while-revalidate` (or equivalent Vercel CDN headers like `X-Vercel-Cache: HIT` on the second request), confirming that unauthenticated visitors receive a cached response from the CDN edge.

**Why human:** Next.js 15 App Router marks `/bips` as `ƒ` Dynamic at build time (confirmed by the build route table in 06-04-SUMMARY) because `await cookies()` is read unconditionally inside `createClient()`. In the App Router, reading cookies() causes the route to opt out of the static ISR cache at the Next.js layer. Whether Vercel's edge network independently caches the response based on `Cache-Control` headers emitted by Next.js for that route requires runtime observation. The `export const revalidate = 3600` declaration is present in source, but its effect on a `ƒ` Dynamic route depends on Next.js version-specific behaviour and CDN configuration that cannot be determined from code alone. If headers show the page is served dynamic (no-cache or private) for all visitors, the accepted tradeoff (D-bip-02-03) should be formally recorded and the ISR invariant should be reclassified as "accepted dynamic" rather than "ISR-cached."

---

### Gaps Summary

No hard failures (FAILED status) were found. All artifacts exist, are substantive, and are wired to real data sources. The single UNCERTAIN item (ISR behaviour for anonymous /bips visitors) is an architectural runtime question that the source code cannot resolve — it requires CDN observation. The implementation satisfies the letter of the constraint (no revalidatePath call; revalidate=3600 declaration preserved) and the deviation is explicitly accepted in D-bip-02-03.

The E2E suite ran 13/13 (5 new + 8 pre-existing) with E2E_ALLOW_CLOUD=1 against the linked cloud project. The unit suite ran 51/51. The build succeeded with /privacy as `○` Static and /bips as `ƒ` Dynamic (documented).

---

_Verified: 2026-06-15_
_Verifier: Claude (gsd-verifier)_
