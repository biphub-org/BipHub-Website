---
phase: 8
slug: edit-approved-request-changes
status: outstanding
created: 2026-06-26
---

# Phase 8 — Outstanding User Acceptance Tests

> Manual-only verifications that headless automation cannot assert (per 08-VALIDATION.md).
> All automated gates (tsc, build, 58 unit tests) pass. The `bip-edits.spec.ts` E2E spec
> (EDIT-01..09) exists but cannot run against the production cloud ref `zbvcpiwbopmfbjfhzprw`
> (playwright.config.ts safety guard) — run it against a local stack or a dedicated cloud
> test project to close the automated portion.

## Why these are manual

- `RESEND_API_KEY` is intentionally blanked in `playwright.config.ts` (forces the D-15 console fallback), so real email delivery is never exercised by E2E.
- "Content live within seconds" (EDIT-04) is a perceptual ISR-timing claim, not a binary assertion.

## Steps (run in a dev server or Vercel preview with `RESEND_API_KEY` set)

1. **As coordinator** — open an approved BIP's edit page (`/dashboard/bips/[id]/edit`), change the title, click **Submit Edit for Review**. Expect a success state; confirm `/bip/[slug]` still shows the ORIGINAL title (EDIT-02).
2. **As admin** — open `/admin`, click the **Edit**-badged pending item → `/admin/bip-edits/[editId]/review`. Confirm the all-fields diff highlights the changed title. Click **Approve Edit**.
3. **EDIT-04 (ISR)** — reload `/bip/[slug]`; the new title appears within a few seconds.
4. **EDIT-07 (Resend)** — confirm the coordinator inbox received "Your BIP edit is live" with a working BIP link.
5. **Reject path** — submit a second edit; reject it as admin with a note. Confirm the live BIP is unchanged (EDIT-05) and the rejection email arrives with the note embedded.
6. **Request-changes path (edit)** — submit a third edit; click **Request Changes** with a note. Confirm the coordinator edit page shows State C (the note) and **Resubmit Edit** flips it back to pending.
7. **Request-changes path (new submission, D-06a)** — on a brand-new pending submission, click **Request Changes**; confirm the coordinator can revise the wizard content and resubmit, and that the revised content is preserved (not discarded).

## Sign-off

- [ ] Steps 1–7 pass in a running environment
- [ ] `bip-edits.spec.ts` run green against a non-prod Supabase (optional but recommended)

**Status:** outstanding — deferred by user on 2026-06-26 ("verify everything, manually verify later").
