# Phase 6: Saved BIPs Sync - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Signed-in **students** can save and unsave BIPs to their account (server-side, synced across devices), see all of them in one place at `/student-dashboard/saved`, and delete their own account with every saved row cascading away — with the new `saved_bips` PII table enumerated on `/privacy`.

**In scope:** `00016_saved_bips.sql` migration (table + RLS, per ARCHITECTURE.md); a heart/save toggle client island on `BipCard` (grid) and `/bip/[slug]` (detail); save/unsave Server Actions; the `/student-dashboard/saved` list page; replacing the dashboard "coming soon" paragraph with a real Saved-BIPs surface; a student "Delete my account" control; a best-effort one-time legacy `localStorage` bookmark sweep (STUD-06); a `saved_bips` paragraph on `/privacy` (FOUN-10).

**Out of scope (later phases):** alert subscriptions + digest email (Phase 7), edit-approved-BIP flow (Phase 8). No saved-searches table here (that is Phase 7's `bip_subscriptions`).
</domain>

<decisions>
## Implementation Decisions

### Save Control & Audience
- **D-01 (locked by user):** The save/unsave control is **signed-in students only**. A heart/save toggle appears on `BipCard` (the `/bips` grid card) and on the `/bip/[slug]` detail page. Saves are **always server-side** (`saved_bips` table) — there is **no signed-out / anonymous localStorage save path**. A signed-out (or coordinator/admin) visitor who clicks save is prompted to sign in (route to `/register/student`). `BipCard` is currently a pure RSC `<Link>`; the toggle must be a small client island layered into/over the card without turning the whole card into a client component.
- **D-01a:** This decision **supersedes locked research** (`ARCHITECTURE.md:164` and `:255`), which assumed a v1.0 Zustand `useBookmarkStore` would be "kept as the anonymous/pre-signup fallback" and "modified to add server-sync on login." **That store was never shipped** (see code_context). There is no anon localStorage fallback to keep or modify — save is server-only for authenticated students. The `saved_bips` table DDL/RLS in `ARCHITECTURE.md` (lines 166–204) is still authoritative; only the localStorage-fallback narrative is overridden.

### localStorage Migration — STUD-06 (Claude's discretion)
- **D-02:** STUD-06 ("existing localStorage bookmarks migrate on first sign-in") is honored as a **best-effort, idempotent, one-time legacy sweep**, NOT a parallel signed-out save feature (which D-01 rejects). On first authenticated dashboard load, a client island reads any legacy `localStorage['biphub:bookmarks']` value, sends the slugs/ids to a Server Action that upserts valid ones into `saved_bips` (defensive: validate each against `bips`, skip unknowns, `ON CONFLICT DO NOTHING` via the `unique(user_id, bip_id)` constraint), then clears the localStorage key. If the key is absent (the **expected** case — the feature never shipped) it is a silent no-op.
- **D-02a — substance flag for planner/verifier:** Because no v1.0 localStorage bookmark feature ever shipped, **STUD-06 has no real data to migrate in practice.** Acceptance should be: "the sweep runs, is idempotent, validates against `bips`, and clears the key — proven by a unit/integration test that seeds a fake `biphub:bookmarks` value and asserts it lands in `saved_bips` exactly once." Do NOT write an E2E that depends on a pre-existing v1.0 bookmark UI; none exists. Surface this requirement-vs-reality gap in VERIFICATION.md rather than silently passing.

### Saved List — `/student-dashboard/saved` (Claude's discretion)
- **D-03:** Reuse the existing **`BipCard` grid** for visual consistency with `/bips`, sorted **most-recently-saved first** (`saved_at desc`). Each card gains an unsave affordance (filled heart → click removes). Metadata is read **live** from `bips` at render (satisfies SC4 "showing current BIP metadata").
- **D-03a:** Saved BIPs whose source row is no longer publicly visible (status ≠ `approved`, or unpublished) are **silently excluded** from the rendered list — the `saved_bips` row is **retained** (so the BIP reappears if re-approved) but not shown while non-public. No broken/ghost cards.
- **D-03b:** Empty state = friendly message + "Browse BIPs →" CTA. Pagination deferred unless trivially needed (students realistically save < 100; render all or a simple "show more" — planner decides). The `/student-dashboard` shell's "coming soon" paragraph (`page.tsx:92-94`) is **replaced** with a Saved-BIPs summary/section linking to `/student-dashboard/saved`.

### Account Deletion — STUD-08 / FOUN-09 (Claude's discretion)
- **D-04:** Add a **"Delete my account" control to the student dashboard Account card** (`app/(student)/student-dashboard/page.tsx`), reusing the Phase 4 coordinator pattern: typed-email confirmation modal → `deleteAccountAction`. The existing `deleteAccountAction` (`lib/actions/account.ts`) **already works for a student** — the approved-BIP slug query returns empty, the RPC deletes `auth.users`, signs out, and redirects to `/?deleted=1`. Planner decides reuse-as-is vs a student redirect variant (landing on `/` is acceptable for students).
- **D-04a — cascade is FK-driven, no RPC change:** `saved_bips.user_id references auth.users(id) on delete cascade` (per `ARCHITECTURE.md:171`) means `delete_my_account()`'s `delete from auth.users` already removes all `saved_bips` rows. **FOUN-09 is satisfied by the FK** — do NOT add `saved_bips` deletion logic inside the RPC. Verify with a direct SQL "no orphan rows" check (SC5).

### `/privacy` Enumeration — FOUN-10
- **D-05:** Add a `saved_bips` paragraph to the `/privacy` storage-surface enumeration (`app/(public)/privacy/page.tsx`), documenting: fields (`user_id`, `bip_id`, `saved_at`), purpose (server-side bookmarks synced across devices), retention (until the student unsaves or deletes their account), and deletion (cascades on account deletion). Note: the page currently documents `biphub:bookmarks` as a localStorage surface — given D-01a (no anon store shipped), the planner should **correct or remove that stale `biphub:bookmarks` mention** unless the legacy-sweep island (D-02) actually touches the key, in which case keep a one-line "read once on sign-in, then cleared" note.

### Schema (locked by research — for planner, not re-decided here)
- **D-06:** Migration `00016_saved_bips.sql` follows `ARCHITECTURE.md` lines 166–204 verbatim: `saved_bips(id, user_id → auth.users ON DELETE CASCADE, bip_id → bips ON DELETE CASCADE, saved_at, unique(user_id, bip_id))`; RLS `ENABLE ROW LEVEL SECURITY` with `saved_bips_select_own`, `saved_bips_insert_own`, `saved_bips_delete_own`, and `saved_bips_select_admin`. No UPDATE policy (save/unsave is insert/delete only). Apply via `db push` to the linked cloud project, then `gen types --linked` (never local docker) — see project memory.

### Claude's Discretion
The user explicitly **locked D-01** (signed-in-only, heart on card + detail) and delegated **D-02, D-03, D-04** ("you decide"). The decisions above are grounded in locked research + existing code, not invented; the planner may refine materialization (island composition, pagination, redirect variant) but must preserve: signed-in-only server-side save, the `00016_saved_bips.sql` schema/RLS, FK-driven cascade (no RPC edit), live-metadata saved list, and the `/privacy` enumeration.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 6: Saved BIPs Sync" — goal, 6 success criteria, requirement IDs (STUD-04/05/06/07/08, FOUN-09/10)
- `.planning/REQUIREMENTS.md` — STUD-04 (save/remove), STUD-05 (server-side, cross-device sync), STUD-06 (localStorage migration), STUD-07 (one saved list), STUD-08 (delete account + all data), FOUN-09 (cascade all new v1.1 PII), FOUN-10 (`/privacy` enumerates every new data surface) + the FOUN-09/10 cross-cutting distribution note (lines ~123)

### Locked v1.1 research (authoritative)
- `.planning/research/ARCHITECTURE.md` §"Workstream B: Data Model for `saved_bips`" (lines 160–204) — **authoritative `saved_bips` DDL + 4 RLS policies + no-UPDATE note**, migration pre-named `00016_saved_bips.sql` (line 722). ⚠ Lines 164 & 255 (Zustand `useBookmarkStore` + localStorage anon fallback) are **overridden by D-01a** — that store was never shipped.
- `.planning/research/ARCHITECTURE.md` §student route group (lines 136–140, 748) — `/student-dashboard/page.tsx` (saved BIPs summary) + `/student-dashboard/saved/page.tsx` (full list)
- `.planning/research/SUMMARY.md` / `.planning/research/PITFALLS.md` — RLS USING+WITH CHECK discipline, JWT role-timing caveat (use `auth.uid()` in `saved_bips` RLS, already reflected in the research DDL)

### Project standards
- `CLAUDE.md` — never-do items: `getClaims()` only (never `getSession()`), `await cookies()` in client factories, every table `ENABLE ROW LEVEL SECURITY` + policies, UPDATE policies need USING+WITH CHECK (n/a here — no UPDATE), `createAdminClient` confined to `app/(admin)/` + `lib/supabase/admin.ts`, footer disclaimer on every page

### Existing code to extend (read before modifying)
- `components/bip/BipCard.tsx` — pure RSC `<Link>` card; the save toggle island layers in here (and on `/bip/[slug]`)
- `app/(student)/student-dashboard/page.tsx` — dashboard shell; replace the "coming soon" paragraph (lines 92–94) with the Saved-BIPs surface; add the Account-card delete control
- `app/(student)/student-dashboard/layout.tsx` — existing student auth+role guard (covers the new `/saved` subroute)
- `lib/actions/account.ts` — `deleteAccountAction` (typed-email confirm → `delete_my_account()` RPC → signOut → `/?deleted=1`); reusable for students
- `supabase/migrations/00013_delete_my_account.sql` — SECURITY DEFINER RPC; deletes `auth.users` → FK cascade does the rest (no edit needed for `saved_bips`)
- `supabase/migrations/00015_student_role.sql` — student role + Custom Access Token Hook (role claim present at issuance for `saved_bips` RLS)
- `supabase/migrations/00002_universities_profiles.sql` — `profiles.id → auth.users ON DELETE CASCADE` (cascade chain context)
- `app/(public)/privacy/page.tsx` — storage-surface enumeration to extend with `saved_bips` (and reconcile the stale `biphub:bookmarks` mention per D-05)
- `lib/supabase/server.ts` — `await createClient()` factory; reuse verbatim for the new Server Actions and the saved-list RSC
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`BipCard.tsx`** — reused for both `/bips` and `/student-dashboard/saved`. Currently a pure RSC; the save toggle must be an additive client island so the card stays server-rendered where possible.
- **`deleteAccountAction` (`lib/actions/account.ts`)** — works for students as-is (empty approved-BIP set → RPC → signout → `/?deleted=1`); satisfies STUD-08 with at most a redirect-target tweak.
- **`delete_my_account()` RPC (00013)** — cascade engine; `saved_bips.user_id → auth.users ON DELETE CASCADE` makes FOUN-09 automatic with zero RPC changes.
- **`Card`/`Button` chrome + student layout guard + EC footer disclaimer** — saved-list and delete UI reuse these; no net-new visual primitives expected.
- **`lib/supabase/server.ts` factory + `getClaims()` pattern** — verbatim for save/unsave Server Actions and the saved-list RSC.

### Established Patterns
- **Server Actions for all mutations; `getClaims()` everywhere; `await cookies()` in factories** — save/unsave/migrate follow this.
- **Route groups segment access** — `/student-dashboard/saved` lives under `(student)`, inheriting the Phase 5 auth+role guard.
- **Every table `ENABLE ROW LEVEL SECURITY` + own-only policies** — `saved_bips` uses own-only CRUD (insert/select/delete) + admin-read, exactly as the research DDL specifies.
- **GDPR cascade via FK + a single SECURITY DEFINER RPC** — Phase 4's deletion model extends to `saved_bips` purely through the FK.

### Integration Points
- `components/bip/BipCard.tsx` + `/bip/[slug]` page — host the save toggle island (signed-in students only).
- `app/(student)/student-dashboard/` — new `saved/page.tsx`; `page.tsx` gains a Saved-BIPs surface + Account-card delete control.
- `supabase/migrations/00016_saved_bips.sql` — new table + RLS (cloud `db push` + `gen types --linked`).
- `app/(public)/privacy/page.tsx` — `saved_bips` enumeration paragraph (FOUN-10).
- First-sign-in legacy sweep island → a new Server Action that upserts validated legacy bookmark ids into `saved_bips`.

### ⚠ Codebase-vs-research discrepancy (must inform planning)
- **No v1.0 Zustand `useBookmarkStore` / heart UI / `localStorage['biphub:bookmarks']` write path exists.** `BipCard` has no save control; `biphub:bookmarks` appears only in `/privacy` *documentation copy*, never in a store or component. Locked research (`ARCHITECTURE.md:164,255`) is wrong about this baseline. Consequences: (1) save is built fresh, server-side, signed-in-only (D-01); (2) STUD-06 migration is a best-effort sweep with no real source (D-02/D-02a); (3) the `/privacy` `biphub:bookmarks` line is stale and should be reconciled (D-05).
</code_context>

<specifics>
## Specific Ideas

- Save affordance is a **heart** toggle (matches the original Phase 1 intent), on both the grid card and the detail page — not a separate "saved" page-only action.
- The saved list visually mirrors `/bips` (same `BipCard` grid) rather than introducing a denser dashboard-only row layout — consistency over density.
- Account deletion reuses the Phase 4 typed-email confirmation modal verbatim in look and behavior.
</specifics>

<deferred>
## Deferred Ideas

- **Anonymous / signed-out localStorage save (server-sync-on-login)** — explicitly rejected by D-01 for this phase; the locked research assumed it but the user chose signed-in-only. Could be revisited in a later UX-polish milestone if casual-visitor bookmarking is desired.
- **Alert subscriptions + `bip_subscriptions` table + digest email** — Phase 7.
- **Saved-search persistence** — Phase 7 (`bip_subscriptions`), not `saved_bips`.
- **Coordinator/admin "save BIP" usage** — research RLS allows any authenticated user to save, but the UI affordance is scoped to students this phase; non-student save UI is not built.

### Reviewed Todos (not folded)
None — STATE.md "Pending Todos" was empty at phase start.
</deferred>

---

*Phase: 6-saved-bips-sync*
*Context gathered: 2026-06-15*
