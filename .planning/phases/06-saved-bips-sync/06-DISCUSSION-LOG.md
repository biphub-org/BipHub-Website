# Phase 6: Saved BIPs Sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 6-saved-bips-sync
**Areas discussed:** Save control, localStorage migration, Saved list, Account deletion

---

## Save control — audience & affordance

| Option | Description | Selected |
|--------|-------------|----------|
| Signed-in only, heart on card + detail | Heart toggle on BipCard + /bip/[slug]; signed-out → sign-in prompt; saves always server-side. No localStorage source to migrate. | ✓ |
| Save for everyone (localStorage when signed-out) | Signed-out → localStorage, signed-in → server; gives STUD-06 a real migration source; more moving parts. | |
| You decide | Claude picks grounded default. | |

**User's choice:** Signed-in only, heart on card + detail.
**Notes:** This supersedes locked research (ARCHITECTURE.md:164,255), which assumed a v1.0 Zustand localStorage bookmark store would be kept as an anon fallback. That store was never shipped, and the user chose server-only/signed-in-only — captured as D-01/D-01a.

---

## localStorage migration (STUD-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Build localStorage save now, migrate it | Ship signed-out localStorage save + first-sign-in merge. | |
| Best-effort legacy sweep only | One-time defensive import of any biphub:bookmarks key; no new signed-out UI. | |
| You decide | Claude chooses. | ✓ |

**User's choice:** You decide.
**Notes:** Given the locked signed-in-only decision, Claude selected the best-effort legacy sweep (D-02) and flagged that STUD-06 has no real v1.0 data to migrate in practice (D-02a) — acceptance is an idempotent sweep test, not an E2E against a non-existent v1.0 UI.

---

## Saved list — /student-dashboard/saved

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse BipCard grid | Same card grid as /bips, recently-saved sort, live metadata, Closed pill for expired. | |
| Compact list rows | Denser dashboard-only row layout. | |
| You decide | Claude chooses. | ✓ |

**User's choice:** You decide.
**Notes:** Claude chose reuse-BipCard-grid (D-03), most-recently-saved sort, live metadata read, silent exclusion of now-non-public saved BIPs (row retained), empty-state CTA, dashboard "coming soon" paragraph replaced.

---

## Account deletion (STUD-08 / FOUN-09)

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse Phase 4 delete pattern on student dashboard | Typed-email confirm modal → deleteAccountAction; extend cascade to saved_bips. | |
| Defer delete UI, just wire cascade | Cascade only; delete button later (under-delivers STUD-08). | |
| You decide | Claude chooses. | ✓ |

**User's choice:** You decide.
**Notes:** Claude chose to reuse the Phase 4 delete pattern on the student dashboard Account card (D-04). Confirmed the cascade is FK-driven (saved_bips.user_id → auth.users ON DELETE CASCADE), so delete_my_account() needs no edit (D-04a); existing deleteAccountAction already works for students.

## Claude's Discretion

- localStorage migration interpretation (STUD-06) → best-effort idempotent legacy sweep (D-02/D-02a)
- Saved-list layout/sort/empty/stale handling (D-03/D-03a/D-03b)
- Account-deletion surface + reuse of existing RPC/action (D-04/D-04a)

## Deferred Ideas

- Anonymous/signed-out localStorage save with server-sync-on-login — rejected for this phase by D-01; revisit in a later UX-polish milestone.
- Alert subscriptions + bip_subscriptions + digest email — Phase 7.
- Saved-search persistence — Phase 7.
- Coordinator/admin save-BIP UI — RLS permits it, but the affordance stays student-scoped this phase.
