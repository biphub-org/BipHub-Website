# Phase 8: Edit-Approved + Request-Changes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-26
**Phase:** 8-Edit-Approved + Request-Changes
**Areas discussed:** Edit storage model, Request-changes flow, Diff view + admin queue, Edit entry + slug + emails

> Session note: The user first ran discuss-phase on **Phase 7 (Alert Subscriptions + Email Pipeline)**, reviewed a plain-language summary of what that phase delivers, and chose to **defer Phase 7** and discuss **Phase 8** instead (Phase 8 depends only on Phase 5, so no rework). No CONTEXT.md was written for Phase 7.

---

## Edit storage model

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `bip_edits` table | Proposed content as its own row; live `bips` row stays `approved` & untouched; no public-read change; matches ROADMAP SC1 | ✓ |
| `published_snapshot` column + `pending_edit` status | research's in-place design; mutates `bips`, changes public read policy + content coalescing | |

**User's choice:** Separate `bip_edits` table (overrides research Workstream D storage mechanism).

| Option | Description | Selected |
|--------|-------------|----------|
| Full proposed content, all editable fields | Edit row carries all editable fields; merge = straight copy; diff vs live row | ✓ |
| Only changed fields (sparse/JSONB delta) | Smaller rows but partial-merge + null-vs-unset complexity | |

**User's choice:** Full proposed content, all editable fields.

| Option | Description | Selected |
|--------|-------------|----------|
| At most one open edit per BIP | Partial unique constraint on open states; CTA opens/loads the single edit | ✓ |
| Allow multiple open edits | Flexible but merge-order ambiguity + queue clutter | |

**User's choice:** At most one open edit per BIP.

---

## Request-changes flow

| Option | Description | Selected |
|--------|-------------|----------|
| On the `bip_edits` row | status enum + `admin_note` column on the same row; history via `bip_status_history` | ✓ |
| Separate review/notes table | Dedicated per-verdict table; partly duplicates the audit trail | |

**User's choice:** On the `bip_edits` row.

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse same edit row, reset to pending | Revise the same row; `changes_requested → pending`; keeps one-open-edit constraint | ✓ |
| New edit row each resubmit | Per-attempt rows; complicates constraint + queue | |

**User's choice:** Reuse the same edit row, reset to pending.

| Option | Description | Selected |
|--------|-------------|----------|
| Both new submissions and edits | Third verdict applies to any queue item (ROADMAP SC5) | ✓ |
| Only on approved-BIP edits | Narrower than SC5 wording | |

**User's choice:** Both new submissions and edits.
**Notes:** Captured the asymmetry — new submissions have no `bip_edits` row, so `changes_requested` becomes a new `bips` status for that case (D-06a).

---

## Diff view + admin queue

| Option | Description | Selected |
|--------|-------------|----------|
| Changed fields only, side-by-side | Just the differing fields as old → new (recommended) | |
| All fields side-by-side | Every editable field in two columns, changes highlighted | ✓ |
| Summary list of changed fields | Compact textual list, no inline values | |

**User's choice:** All fields side-by-side (chose completeness over the recommended changed-only view).

| Option | Description | Selected |
|--------|-------------|----------|
| One unified queue with an 'Edit' badge | New + edit re-reviews together, badge distinguishes (ROADMAP SC2) | ✓ |
| Separate tab/section for edits | Distinct lists; splits admin attention | |

**User's choice:** One unified queue with an 'Edit' badge.

---

## Edit entry + slug + emails

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing dashboard edit form | "Submit Edit for Review" CTA on the existing form when BIP is approved | ✓ |
| New dedicated edit-for-review page | Separate surface; duplicates a large form | |

**User's choice:** Reuse the existing dashboard edit form.

| Option | Description | Selected |
|--------|-------------|----------|
| Form omits slug + server rejects changes | Dual guard (belt-and-suspenders) | ✓ |
| Server-side enforcement only | Visible-but-locked field; worse UX | |

**User's choice:** Form omits slug + server rejects changes.

| Option | Description | Selected |
|--------|-------------|----------|
| 3 templates, reject + changes include the admin note | Note embedded inline so coordinator knows what to fix | ✓ |
| 3 minimal templates, no note inline | Generic; forces a dashboard round-trip | |

**User's choice:** 3 templates, reject + changes include the admin note inline.

---

## Claude's Discretion

- Exact `action_kind` audit values (D-12), precise `bip_edits` RLS predicates (D-14), and where the new-submission `changes_requested` admin note is stored (D-06a) — delegated to research/planning.

## Deferred Ideas

- **Phase 7 — Alert Subscriptions + Email Pipeline:** deferred this session; remains "not started". Outstanding research-vs-roadmap tensions noted in 08-CONTEXT.md `<deferred>` for when it's picked up.
- No scope creep surfaced during Phase 8 discussion.
