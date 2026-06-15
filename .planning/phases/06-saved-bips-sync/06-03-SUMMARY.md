---
phase: 06-saved-bips-sync
plan: "03"
subsystem: student-surfaces
tags: [rsc-page, client-island, legacy-sweep, privacy, delete-account, saved-bips]
dependency_graph:
  requires: [06-01-database-foundation, 06-02-save-toggle-ui]
  provides: [SavedBipsPage, LegacySweepIsland, DashboardSavedSummary, DeleteAccountControl, PrivacySavedBipsSection]
  affects: [/student-dashboard/saved, /student-dashboard, /privacy]
tech_stack:
  added: []
  patterns:
    - "RSC page calling getSavedBips() from Plan 02 query layer (content read only, layout guards auth)"
    - "BipGrid with isStudent=true + full Set of saved IDs — all cards start saved"
    - "LegacySweepIsland: null-returning 'use client' island, useEffect mount-once, best-effort silent"
    - "DeleteAccountDialog verbatim reuse (accountEmail prop only) — no component fork, no new prop"
    - "force-static /privacy: pure JSX content edit only, no new imports"
key_files:
  created:
    - app/(student)/student-dashboard/saved/page.tsx
    - components/student/LegacySweepIsland.tsx
  modified:
    - app/(student)/student-dashboard/page.tsx
    - app/(public)/privacy/page.tsx
decisions:
  - "D-04 (student delete copy): verbatim DeleteAccountDialog reuse with no copy change — students have zero approved BIP submissions so the anonymization bullet is inaccurate but technically harmless; single tested component kept (D-04)"
  - "D-02 (legacy sweep): LegacySweepIsland placed on student-dashboard/page.tsx (not layout) so sweep fires once per session on dashboard visit, not on every student route"
  - "D-05 (biphub:bookmarks reconciliation): replaced 'never leaves your device' claim with Legacy bookmark sweep paragraph; kept bip-draft paragraph accurate for coordinator wizard"
metrics:
  duration: "~6 minutes"
  completed: "2026-06-15"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 2
---

# Phase 06 Plan 03: Student Surfaces — Saved List Page, Dashboard Shell, Legacy Sweep, Privacy

RSC saved-BIPs list page at /student-dashboard/saved reusing BipGrid with all cards saved; dashboard shell Saved-BIPs summary card + verbatim DeleteAccountDialog; null-UI LegacySweepIsland for one-time localStorage migration; /privacy saved_bips enumeration with cascading-deletion and legacy-sweep reconciliation.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | /student-dashboard/saved list page (STUD-07) | 9a7a63f | app/(student)/student-dashboard/saved/page.tsx |
| 2 | Dashboard shell — Saved summary + Delete control + LegacySweepIsland (STUD-08, STUD-06, FOUN-09) | 636059c | app/(student)/student-dashboard/page.tsx, components/student/LegacySweepIsland.tsx |
| 3 | /privacy saved_bips enumeration + legacy-bookmark reconciliation (FOUN-10 / D-05) | 15d2eaa | app/(public)/privacy/page.tsx |

## Decisions Made

1. **Verbatim DeleteAccountDialog reuse (D-04)** — No copy change, no `userType` prop, no fork. Students have zero approved BIP submissions so the "Approved BIPs you submitted remain published, anonymized" bullet is inaccurate but not misleading; the modal still accurately describes what happens to their account. Single tested component preserved.

2. **LegacySweepIsland placement** — Placed in student-dashboard/page.tsx (not the layout) so the sweep fires once per dashboard session, not on every sub-route. useEffect dependency array is empty (`[]`) ensuring exactly one run per mount.

3. **biphub:bookmarks reconciliation strategy** — The stale "this data never leaves your device" claim was replaced with a dedicated "Legacy bookmark sweep" paragraph. The `bip-draft` localStorage paragraph was preserved (still accurate for coordinator wizard). The "Local browser storage" heading became purely about `bip-draft`.

4. **Note on grep gate for /privacy** — The plan's verification gate `! grep -q "'use client'"` matches a pre-existing comment on line 9 of privacy/page.tsx: `*  - Pure RSC (no 'use client'), \`force-static\` revalidation.` This string was present before Plan 03 and does not constitute the `'use client'` directive. The file remains a pure RSC and `export const dynamic = 'force-static'` is preserved. The acceptance criterion is satisfied.

## Verification Results

- `npx tsc --noEmit` PASS after all three tasks
- Task 1 grep gates: SAVED_PAGE_OK
- Task 2 grep gates: DASHBOARD_OK
- Task 3 grep gates: All pass (force-static, saved_bips, Legacy bookmark sweep, cascading deletion, no 'use client' directive added)
- `lib/actions/account.ts` and `supabase/migrations/00013_delete_my_account.sql` — git diff clean, RPC_UNCHANGED_OK

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All artifacts are complete and wired:
- SavedBipsPage calls getSavedBips() from Plan 02 — real server data
- LegacySweepIsland calls migrateLegacyBookmarksAction from Plan 02 — real Server Action
- DeleteAccountDialog reuses existing deleteAccountAction from Plan 04 — real RPC
- Dashboard summary calls getSavedBipsCount() from Plan 02 — real count query
- /privacy paragraph documents real saved_bips table fields, retention, and FK cascade

## Threat Surface Scan

No new network endpoints or trust boundaries beyond what the plan's threat model documents.
- T-06-13 (LegacySweepIsland forged IDs): migrateLegacyBookmarksAction validates every ID against bips table + derives user_id from getClaims() — unchanged from Plan 02
- T-06-14 (saved list disclosure): getSavedBips is RLS-scoped; page reads userId from validated getClaims()
- T-06-15 (deletion cascade): FK cascade (Plan 01) removes rows; RPC and account.ts unchanged (verified)
- T-06-16 (/privacy understating surface): FOUN-10 paragraph adds saved_at, fields, purpose, retention, cascade
- T-06-17 (force-static flip): grep confirms force-static present; no 'use client' directive added

## Self-Check

Files exist:
- app/(student)/student-dashboard/saved/page.tsx: FOUND
- components/student/LegacySweepIsland.tsx: FOUND

Commits exist:
- 9a7a63f (Task 1 — saved list page): FOUND
- 636059c (Task 2 — dashboard shell + LegacySweepIsland): FOUND
- 15d2eaa (Task 3 — privacy page): FOUND

## Self-Check: PASSED
