# Phase 8: Edit-Approved + Request-Changes - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Coordinators can edit an **already-approved** BIP and submit that edit for admin re-review, while the live public `/bip/[slug]` page keeps serving the **original approved content unchanged** the entire time the edit is pending. Admins get a **third moderation verdict — "request changes"** (alongside approve and reject) with a note, available on both new submissions and pending edits. Every edit and re-review action is recorded in the `bip_status_history` audit log, and a BIP's slug is **immutable** after first approval.

**In scope:** a new `bip_edits` table (proposed-content rows + RLS); a "Submit Edit for Review" path on the existing coordinator edit form for approved BIPs; admin `approve-edit` / `reject-edit` / `request-changes` Server Actions; a `changes_requested` state + admin note; merge-on-approve with `revalidatePath`; an all-fields side-by-side diff view; a unified admin review queue with an "Edit" badge; 3 outcome notification emails; slug-immutability enforcement; `bip_status_history` action_kind extensions.

**Out of scope (other phases):** alert subscriptions + digest email pipeline (Phase 7, deferred). No new public-facing BIP fields, no versioned edit history UI beyond the audit log, no multi-coordinator collaboration on a single edit.
</domain>

<decisions>
## Implementation Decisions

### Edit Storage Model
- **D-01 (locked by user):** Pending edits live in a **separate `bip_edits` table**, NOT the research's `published_snapshot` column + `pending_edit` status. Each edit is its own row (FK to `bips`, `created_by`, status, proposed content). The live `bips` row stays exactly `approved` and **untouched** until an admin approves the edit. This satisfies EDIT-02 (BIP stays publicly visible showing the live approved version) for free: **no change to the public read policy (`bips_select_approved_public` stays `status = 'approved'`), no `bips` status enum change for the edit case, no snapshot coalescing in public RSC queries.** Matches ROADMAP SC1 verbatim ("creates a `bip_edits` row in `pending` status").
  - **D-01a — overrides locked research:** This supersedes `ARCHITECTURE.md` Workstream D (lines 418–542), which proposed the `published_snapshot` JSONB column + `pending_edit` status approach. The `bip_edits` table replaces it. The research's RLS analysis, ISR table, audit-log extension reasoning, and admin-queue notes remain useful **context** but the storage mechanism is the table, not the in-place snapshot. Do not add `published_snapshot` or a `pending_edit` status to `bips`.
- **D-02 (locked by user):** A `bip_edits` row stores the **full proposed content — every editable BIP field** (slug excluded; see D-09). Merge-on-approve is a straight column copy from the edit row into `bips`; the diff view is computed by comparing the edit row against the live `bips` row. No sparse/delta payload (avoids partial-merge and null-vs-unset edge cases).
- **D-03 (locked by user):** **At most one open edit per BIP.** Enforce with a partial unique constraint on `bip_edits(bip_id)` `WHERE status IN ('pending','changes_requested')`. The "Submit Edit for Review" CTA opens/loads that single edit; it does not create a second concurrent edit.

### Request-Changes Flow (EDIT-06 — undesigned by research)
- **D-04 (locked by user):** The third verdict + admin note live **on the relevant row, not a separate reviews table.** For an approved-BIP edit: the `bip_edits` row's status enum is `pending → approved | rejected | changes_requested`, plus an `admin_note` text column on the same row. Full per-transition history comes from `bip_status_history`, so no separate `bip_edit_reviews` table.
- **D-05 (locked by user):** **Resubmit reuses the same edit row.** When changes are requested, the coordinator revises the same open `bip_edits` row and resubmitting flips `changes_requested → pending` again. This keeps the D-03 one-open-edit constraint intact and the admin queue clean. Every transition is logged to `bip_status_history`.
- **D-06 (locked by user):** "Request changes" applies to **both new submissions AND approved-BIP edits** (ROADMAP SC5 says "request changes on a pending submission").
  - **D-06a — asymmetry the planner MUST handle:** A brand-new pending submission has **no `bip_edits` row**. For that case, `changes_requested` is a **new `bips` status value** (extend the `bips` status CHECK in 00001 to add `'changes_requested'`), behaving like a softer, note-bearing variant of the existing `rejected → revise` loop. For an approved-BIP edit, `changes_requested` lives on the **`bip_edits` row** (D-04) and the `bips` row stays `approved`. Two code paths, one verdict concept. The admin note for the new-submission case needs a home too (planner: column on `bips`, or a status-history note field — decide during planning, but it must be retrievable for the coordinator's dashboard and the email).

### Diff View + Admin Queue
- **D-07 (locked by user):** The admin diff view renders **all editable fields side-by-side (live | proposed)** with changed fields visually highlighted — not changed-fields-only. (User chose the more complete view over the recommended changed-only view.) Diff is computed live by comparing the `bip_edits` row to the `bips` row at render.
- **D-08 (locked by user):** **One unified admin review queue.** New pending submissions and pending edits appear together; each card carries a badge distinguishing **"New submission"** vs **"Edit"** (and surfaces `changes_requested` items). Matches ROADMAP SC2. Extends the existing review queue rather than adding a separate tab.

### Edit Entry, Slug Immutability, Emails
- **D-09 (locked by user):** Coordinators initiate edits via the **existing dashboard edit form** (`app/(dashboard)/dashboard/bips/[id]/edit/page.tsx`). When the BIP is `approved`, the form shows a **"Submit Edit for Review" CTA** that writes to `bip_edits` instead of mutating the live row, prefilled from current live content; if an edit is already open (D-03), the form loads that open edit. No new dedicated edit-for-review page.
- **D-10 (locked by user):** **Slug immutability (EDIT-09) is dual-guarded:** the edit form omits the slug field entirely AND the submit-edit / merge Server Action rejects/ignores any incoming slug change. Slug is never part of the `bip_edits` payload.
- **D-11 (locked by user):** **3 outcome notification emails (EDIT-07)** added as new variants on the existing `lib/email/send.ts` `EmailPayload` union (reusing the Phase 3 Resend infra + D-15 dev console fallback): **approved** ("your edit is live" + BIP link), **rejected**, and **changes-requested** — the rejected and changes-requested emails **embed the admin's note inline** so the coordinator knows what to fix. Mirror the existing `ApprovalEmail` / `RejectionEmail` template style.

### Audit & ISR (locked by research + existing patterns — for planner, not re-decided)
- **D-12:** Extend `bip_status_history.action_kind` CHECK (00010) with the new edit kinds (e.g. `submit_edit`, `approve_edit`, `reject_edit`, `request_changes` — exact names planner's call, but every edit/re-review action MUST be logged per EDIT-08). Admin verdict Server Actions write audit rows explicitly (same pattern as `approveBipAction`/`rejectBipAction`); coordinator-initiated transitions may use the 00010 trigger.
- **D-13:** On **approve-edit**, merge the `bip_edits` content into `bips`, set the edit row to `approved`, and call `revalidatePath('/bip/${slug}')` + `revalidatePath('/bips')` + `revalidatePath('/admin')` to bust ISR so live content updates within seconds (SC3). On **reject-edit**, leave `bips` unchanged (SC4) and set the edit row to `rejected`. The live `bips` row is never mutated while an edit is pending (D-01), so no snapshot rollback is needed.

### RLS (locked by research discipline — for planner)
- **D-14:** `bip_edits` gets `ENABLE ROW LEVEL SECURITY` with coordinator self-CRUD policies (insert/select/update own where `created_by = auth.uid()` and the edit is in an editable state), an admin select/update policy, and **UPDATE policies with both `USING` and `WITH CHECK`** (CLAUDE.md never-do). Coordinators cannot self-approve their own edit (post-image status restricted to `pending`/`changes_requested`→`pending`). FK to `bips(id)` and to the creating user, GDPR-cascade-wired consistent with FOUN-09 patterns (an orphaned edit must not survive BIP or account deletion).

### Claude's Discretion
User locked the substance of all four discussed areas (D-01 through D-11). The planner/researcher may refine **materialization** but must preserve: the `bip_edits` table model (no `published_snapshot`), full-content payload, one-open-edit constraint, verdict+note on the row, same-row resubmit, request-changes on both submission types (with the D-06a asymmetry), all-fields side-by-side diff, unified badged queue, existing-edit-form reuse, dual-guarded slug immutability, and 3 note-bearing emails. Items D-06a (new-submission note storage), D-12 (exact action_kind names), and D-14 (precise RLS predicates) are explicitly delegated to planning.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 8: Edit-Approved + Request-Changes" — goal, 6 success criteria, requirement IDs (EDIT-01…EDIT-09). **SC1 names the `bip_edits` table and `pending` status — authoritative over research's snapshot design.**
- `.planning/REQUIREMENTS.md` — EDIT-01 (submit edit for re-review), EDIT-02 (stays publicly visible), EDIT-03 (diff view), EDIT-04 (approve→merge→refresh), EDIT-05 (reject→unchanged), EDIT-06 (request-changes third state + note), EDIT-07 (coordinator emailed on each outcome), EDIT-08 (audit log), EDIT-09 (slug immutable). Plus FOUN-09 (cascade new PII / orphan-free) for `bip_edits` deletion wiring.

### Locked v1.1 research (context — storage mechanism overridden by D-01a)
- `.planning/research/ARCHITECTURE.md` §"Workstream D: Edit-Approved-BIP with Re-Review" (lines 401–620) — state-machine analysis, RLS reasoning, ISR/`revalidatePath` table, audit-log extension, and admin-queue notes are **useful context**. ⚠ Its core storage design (`published_snapshot` JSONB column + `pending_edit` status, lines 418–542) is **REPLACED by the `bip_edits` table** per D-01/D-01a — do not implement the snapshot column.
- `.planning/research/SUMMARY.md` / `.planning/research/PITFALLS.md` — RLS `USING`+`WITH CHECK` discipline, `getClaims()` (never `getSession()`) server-side, admin/service-role boundaries.

### Existing code to extend (from codebase scout)
- `supabase/migrations/00001_skeleton_bips_table.sql` — `bips.status` CHECK = `('draft','pending','approved','rejected')` (extend with `'changes_requested'` per D-06a) and `bips_select_approved_public` = `status = 'approved'` (**leave unchanged** under D-01).
- `supabase/migrations/00010_bip_status_history.sql` — `action_kind` CHECK (6 values) + `log_bip_status_change()` trigger (extend per D-12).
- `supabase/migrations/00006_rls_policies.sql`, `00011_bips_update_own_editable.sql`, `00012_bips_update_to_pending.sql` — existing coordinator UPDATE policies / state machine to mirror for `bip_edits`.
- `lib/actions/admin-bips.ts` (approve/reject), `lib/actions/bip-status.ts`, `lib/actions/bip-revise.ts`, `lib/actions/bip-submit.ts` — Server Action patterns to mirror for edit submit/approve/reject/request-changes.
- `lib/email/send.ts` + `lib/email/templates/{ApprovalEmail,RejectionEmail,AdminNotificationEmail}.tsx` — email infra + template style to extend with 3 edit-outcome variants (D-11).
- `app/(dashboard)/dashboard/bips/[id]/edit/page.tsx` — coordinator edit form to extend with the "Submit Edit for Review" CTA (D-09).
- `app/(admin)/admin/bips/[id]/edit/page.tsx` + the admin review queue components — diff view (D-07) + unified badged queue (D-08).

### CLAUDE.md hard constraints (apply throughout)
- `CLAUDE.md` §"Critical never-do items" — `getClaims()` not `getSession()`; `await cookies()`; every new table `ENABLE ROW LEVEL SECURITY`; UPDATE policies need both `USING` and `WITH CHECK`; `createAdminClient` only under `app/(admin)/` + `lib/supabase/admin.ts`; `revalidatePath()` in approve/reject (not webhooks).
- Project memory: schema changes via `db push` to the **linked cloud project** + `gen types --linked` — never local docker (see `[[supabase-cloud-not-docker]]`).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`lib/email/send.ts`** — typed `EmailPayload` discriminated union + `resolveSubject()` + Resend-or-console-fallback. Add 3 variants (`edit-approved`, `edit-rejected`, `edit-changes-requested`); the exhaustive-switch pattern forces compile-time coverage.
- **Existing approve/reject Server Actions** (`lib/actions/admin-bips.ts`) — establish the getClaims → ownership/role check → DB write → audit-log → `revalidatePath` → fire-and-forget email pattern to mirror for the edit verdicts.
- **Coordinator + admin edit forms already exist** — the dashboard form is the entry point (D-09); no new large form needed.
- **`bip_status_history` + `log_bip_status_change()` trigger** — audit infrastructure already in place; extend the action_kind set (D-12) rather than building new logging.

### Established Patterns
- **State machine via status CHECK + RLS USING/WITH CHECK** (00011/00012) — the `bip_edits` lifecycle and the new-submission `changes_requested` transition follow the same shape.
- **ISR via `revalidatePath` in Server Actions** (locked stack) — merge-on-approve busts the public cache (D-13).
- **FK `on delete cascade` to `auth.users` / `bips`** (Phase 6 D-04a) — drives GDPR/orphan-free deletion of `bip_edits` without RPC edits.

### Integration Points
- Public read path (`/bips`, `/bip/[slug]`) is **deliberately untouched** under D-01 — the win of the table model.
- Admin review queue is the single surface that must learn about `bip_edits` + the new-submission `changes_requested` state (D-08).
- Coordinator dashboard must surface an open edit's status + admin note (D-04/D-06a) for the request-changes loop.
</code_context>

<specifics>
## Specific Ideas

- User explicitly preferred the **all-fields side-by-side** diff (D-07) over the leaner changed-fields-only option — completeness over compactness for admin review.
- User deferred **Phase 7 (Alert Subscriptions + Email Pipeline)** to focus on Phase 8 first; Phase 8 is independent of Phase 7 (depends only on Phase 5), so no rework results.
</specifics>

<deferred>
## Deferred Ideas

- **Phase 7 — Alert Subscriptions + Email Pipeline:** deferred this session, remains "not started" in ROADMAP.md. When picked up, three research-vs-roadmap tensions still need decisions: idempotency model (`bip_alert_deliveries` ledger vs queue `processed_at`), pipeline runner (Supabase Edge Function vs Next.js/Vercel cron route reusing Node email infra), and the daily/weekly scheduling + consent_text column. Not part of Phase 8.
- No scope creep surfaced during Phase 8 discussion — all decisions stayed within the edit/re-review boundary.
</deferred>

---

*Phase: 8-Edit-Approved + Request-Changes*
*Context gathered: 2026-06-26*
