# E2E Edge Cases — Deferred to v1.1

The v1 Playwright suite (Plan 04-07) covers **golden paths only** per Phase 4 D-14. Edge cases below are documented for a v1.1 hardening pass — open a milestone issue per item before starting any of them.

## Submission

- **Two-tab draft conflict (SUBM-06)** — open the same draft in two tabs, edit in tab A, attempt save in tab B → expect Reload/Overwrite modal. Hard to instrument deterministically; needs a custom multi-context Playwright workflow.
- **Mid-form session expiry (SUBM-07)** — expire the session via admin API, attempt save → expect onAuthStateChange-triggered recovery (localStorage backup + sign-in modal). Requires JWT expiry manipulation in test setup.
- **Auto-save retry on save failure** — inject a 500 from the Server Action and verify the Saving… / Saved status indicator shows the retry toast (Plan 02-06 D-03).
- **Wizard back-navigation preserving draft** — walk to step 3, hit Back to step 1, change a field, return to step 3 → field values from step 3 must persist.
- **ISCED-F selector full-list rendering** — the wizard surfaces ~120 ISCED-F codes; verify the combobox does not paginate-clip on small viewports.

## Auth

- **Real magic-link delivery via Mailosaur / MailHog** — deferred. D-15 console-log assertion covers the send path; full inbox delivery is a v1.1 concern.
- **Rate-limit behaviour on /login** — after N failed attempts. Supabase Auth's rate-limit policy is platform-level, not app-level; not in scope for app E2E.
- **Password-reset link click-through** — clicking the link in the email, landing on /reset-password/update, setting a new password. Requires either MailHog integration or admin-API recovery-token extraction.
- **OAuth providers** — none in v1, so nothing to test; revisit when GitHub/Google login lands.
- **Concurrent sessions** — sign in from two devices, sign out one → verify the other session is unaffected (or revoked, per future policy).

## Admin

- **State-machine illegal transitions** — e.g., approved → pending directly. Phase 3 D-06 state machine enforces these at the Server Action level; an explicit test that asserts the rejection would require crafting an admin action call with a forbidden transition. Deferred.
- **Un-approve flow** (approved → rejected with reason) — covered conceptually by the reject test; a dedicated spec for an already-approved BIP getting un-approved is deferred.
- **Admin field edits via the reused wizard** (Phase 3 Plan 03-07) — wizard reuse is verified by submission.spec.ts; admin-mode edit specifics deferred.
- **Bulk approve / bulk reject** — not in v1 scope; queue is single-row review only.
- **Audit log (`bip_status_history`) renders correct actor + reason** — pending UI surface for the timeline component.

## RLS / Authorization

- **Coordinator A cannot read coordinator B's draft via direct PostgREST call** — would require asserting RLS at the API level, not the UI. Deferred. (Vitest schema tests in tests/schemas/ are the better home for this.)
- **Anonymous user cannot read non-approved BIPs** — same as above. Deferred.
- **Service-role key cannot be invoked from app/(public) routes** — covered by the ESLint `no-restricted-imports` rule on `lib/supabase/admin` (Plan 01-08); E2E redundant.
- **createAdminClient leak prevention** — verified statically by ESLint; runtime E2E redundant.

## Performance

- **Lighthouse CI regression gating** — D-20 locks this for v1.1. Manual capture documented at `.planning/phases/04-polish-static-content-performance-hardening/lighthouse/README.md`.
- **Bundle-size regression budgets** — deferred until baseline is stable (Plan 04-06 captures the baseline via `@next/bundle-analyzer`).
- **LCP across cold-cache vs warm-cache** — manual lighthouse capture only in v1.
- **Database query plan regression** — the `search_vector` GIN index and `host_university_id` FK index are tested manually via `EXPLAIN ANALYZE`; automated regression deferred.

## Visual regression

- **Playwright snapshot testing** for layout (homepage, BIP card, wizard preview, admin queue card). Deferred — pixel diffs against the v1 visual direction are manual in v1.
- **Dark mode parity** — no dark mode in v1.
- **RTL language layout** — English-only v1; deferred with i18n.

## Accessibility (beyond axe sweep)

- **Screen-reader transcripts** — manual NVDA/JAWS pass on every route. The axe DevTools sweep (D-27) covers automated WCAG AA; SR transcript review is a v1.1 enhancement.
- **High-contrast Windows mode** — manually verify EU palette renders distinguishably in Windows high-contrast.
- **Reduced-motion preference** — the `LazyMotion` boundaries honor `prefers-reduced-motion` by default; a Playwright test that emulates `prefers-reduced-motion: reduce` and asserts no transition runs is deferred.

---
*Deferred during Phase 4 Plan 04-07 execution (2026-05-14). Open a v1.1 milestone issue per item before promoting any of these to a spec.*
