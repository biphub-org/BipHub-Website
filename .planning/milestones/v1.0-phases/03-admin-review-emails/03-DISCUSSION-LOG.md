# Phase 3 Discussion Log

**Date:** 2026-05-11
**Phase:** 3 — Admin Review + Email Notifications
**Mode:** discuss (default), all four gray areas selected via multiSelect

This log captures the question-by-question flow of the Phase 3 discussion for audit and retrospective purposes. The canonical decisions live in `03-CONTEXT.md`; this file is NOT consumed by downstream agents (researcher, planner, executor).

---

## Gray-Area Selection

**Presented to user:** 4 phase-specific gray areas.
**User selected:** all 4.
- Review flow + queue UX
- State transitions + audit log
- Email design + delivery
- Analytics + admin edit + nav chrome

---

## Area 1 — Review flow + queue UX

**Claude's proposed defaults (locked unless user pushed back):**
- Queue display: card list using `AdminBipCard` variant (CLAUDE.md "Cards everywhere" locks this).
- Queue sort: oldest pending first (FIFO).
- Actions: dedicated `/admin/bips/[id]/review` page (per ROADMAP naming) reusing `BipBody` + `BipSidebar`.
- Confirmation modal: shows BIP title verbatim; approve = optional note; reject = required reason min 10 chars.

**Q1.1 — Post-action navigation**

Options:
1. Auto-advance to next pending (Recommended)
2. Back to /admin queue
3. Stay on the detail page

**User answer:** Auto-advance to next pending.

Decision → **D-05** in CONTEXT.md.

---

## Area 2 — State transitions + audit log

**Claude's proposed defaults:**
- `bip_status_history` schema: minimal (`id`, `bip_id`, `from_status`, `to_status`, `actor_id`, `note`, `created_at`) + added `action_kind` discriminator during write-up.
- Rejection reason surfaces on coordinator dashboard card (Phase 2 D-10 already locked this).
- RLS: select own + admin all; insert via Server Action; no update/delete (audit immutability).

**Q2.1 — Coordinator resubmit policy**

Options:
1. Yes — edit rejected → status flips to draft → resubmit → pending (Recommended)
2. Yes — edit + resubmit goes straight to pending (no draft round-trip)
3. No — rejection is terminal

**User answer:** Option 1 (recommended).

Decision → **D-06** (state transitions) + **D-10** (RLS extension) in CONTEXT.md.

**Q2.2 — Admin un-approve policy**

Options:
1. Yes — admin can transition approved → rejected (Recommended)
2. Approved → pending (force re-review by another admin)
3. No — admin can only edit fields, never change approved status

**User answer:** Option 1 (recommended).

Decision → **D-06** (state transitions: approved → rejected admin-only with required reason).

---

## Area 3 — Email design + delivery

**Claude's proposed defaults:**
- 3 emails: coordinator approval, coordinator rejection, admin new-submission notification.
- Template approach: React Email components in `lib/email/templates/*.tsx`.
- Sender: `BipHub <noreply@biphub.eu>`.
- Local dev: log HTML to console when `RESEND_API_KEY` unset (no Inbucket — auth-only).
- Content sketches per email type drafted in CONTEXT.md.

### Tangent: n8n discussion

User asked whether n8n should be used for "automated tasks" — first scoped to Phase 3, then expanded to the whole project.

Claude's verdict (accepted by user):
- **No for v1.** BipHub talks to exactly one external service (Resend). Single integration doesn't justify n8n's operational cost (second deploy target, secret-split across Vercel/Supabase/n8n, breaks CLAUDE.md "one-command local dev").
- Every plausible in-scope automation (3 transactional emails, ISR cache busting, account deletion, deadline-passed status flips) is solved more directly with Server Actions, `revalidatePath()`, or `pg_cron`.
- Project explicitly rules out the workloads where n8n shines (automated BIP imports = out-of-scope per PROJECT.md).
- Revisit when integration count grows to 3+ (coordinator outreach automation, multi-channel admin digests, AI moderation, partner-university invite flows).

**Actions taken:**
- Added n8n entry to `.planning/PROJECT.md` → "Out of Scope" with rationale.
- Added "Evaluate n8n for v2 outreach automation" to `.planning/STATE.md` → Deferred Items table.

**Q3.1 — Email trigger** (resumed after n8n tangent)

Options:
1. Resend Node SDK inside the Server Action (Recommended)
2. Supabase Edge Function triggered by DB webhook on bip_status_history insert
3. pg_net + cron outbox (queue-based, eventual)

**User answer:** Option 1 (recommended).

Decision → **D-11** in CONTEXT.md.

---

## Area 4 — Analytics + admin edit + nav chrome

**Claude's proposed defaults:**
- Analytics: 3 stat cards verbatim per ADMN-07 (Total BIPs, Submissions this month, Top 5 countries). No charts in v1.
- Admin edit: reuse `BipSubmissionWizard` per ROADMAP wording.
- All-listings view: dedicated `/admin/bips` page (NOT a fork of `/bips`).
- `(admin)` chrome: distinct from coordinator `(dashboard)` chrome.

**Q4.1 — Admin-edit status policy**

Options:
1. Stays approved — admin edits are trusted (Recommended)
2. Approved → pending (force re-review)
3. Admin chooses at save time

**User answer:** Option 1 (recommended).

Decision → **D-18** in CONTEXT.md (admin edits do not change status; revalidatePath() fires for approved BIPs; no coordinator email; audit log captures via `action_kind = 'admin_edit'`).

**Q4.2 — `(admin)` route-group nav layout**

Options:
1. Sidebar nav (Queue / All BIPs / Analytics) (Recommended)
2. Top bar (same shape as DashboardNav)
3. Top bar + collapsible sidebar

**User answer:** Option 1 (recommended).

Decision → **D-16** in CONTEXT.md.

---

## Claude's-Discretion Decisions (delegated by user)

Per the user's standing preference (memory: `feedback_delegation.md`), contained implementation calls were decided and stated rather than re-asked. These are explicitly listed in CONTEXT.md's "Claude's Discretion" subsection:

- **D-01** Queue layout: AdminBipCard variant (CLAUDE.md "Cards everywhere" locked it).
- **D-02** Queue sort: FIFO oldest-first.
- **D-03** Review actions location: dedicated `/admin/bips/[id]/review` page.
- **D-04** Modal content: title-verbatim + optional approve note + required reject reason ≥ 10 chars.
- **D-07** Audit log schema: minimal + `action_kind` discriminator (not field-diff JSONB).
- **D-08** Audit log RLS: select own + admin all; insert via Server Action; no update/delete.
- **D-09** Rejection-reason source: latest `bip_status_history` row with `to_status = 'rejected'`.
- **D-12** Template approach: React Email components.
- **D-13** Sender identity: single `BipHub <noreply@biphub.eu>` + configurable reply-to env var.
- **D-14** Email content sketches drafted for all three templates.
- **D-15** Local dev email handling: console log when `RESEND_API_KEY` unset.
- **D-17** Admin edit pattern: reuse `BipSubmissionWizard` with `mode: 'admin'` prop.
- **D-19** All-listings view: dedicated `/admin/bips`, NOT a fork of `/bips`.
- **D-20** Analytics: 3 stat cards verbatim, no charts in v1.

---

## Deferred Ideas (captured during discussion)

- n8n / workflow automation — recorded in PROJECT.md + STATE.md.
- Resend delivery-status webhooks — v2.
- Multi-admin + `/admin/users` UI — v2.
- "Request changes" action (GROW-03) — v2.
- Analytics charts/sparklines — v2.
- Coordinator-side audit timeline view — v2.
- Admin BCC on coordinator status emails — v2 if requested.
- Field-diff JSONB snapshots in audit log — v2.
- Email bounce/unsubscribe handling — out-of-scope (transactional emails are mandatory).

---

## Next Steps

After this discussion:
1. `/gsd-plan-phase 3` — create the executable plan from this CONTEXT.md.
2. Or `/gsd-ui-phase 3` first if a UI design contract is wanted before planning.

Plan will need to address:
- Migration for `bip_status_history` table (new).
- Migration to replace `bips_update_own_draft_or_pending` policy with `bips_update_own_editable` (per D-10).
- New `(admin)` route group + layout + middleware extension.
- 5 new Server Actions: `approveBipAction`, `rejectBipAction`, `adminUpdateBipAction`, plus extensions to `submitBipAction` for `bip_status_history` insert on submit/resubmit, plus admin-context wizard mode.
- React Email setup + 3 template components.
- `resend` SDK install + `lib/email/send.ts` wrapper.
- Wizard `mode` prop extension for admin reuse.
- `AdminBipCard` component.
- `/admin/analytics` RSC with the 3 stat queries.
- Documentation update to CONTRIBUTING.md (admin bootstrap SQL) — possibly deferred to Phase 4.
