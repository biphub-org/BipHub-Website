# Milestones

## v1.0 MVP (Shipped: 2026-06-14)

**Phases completed:** 4 phases, 30 plans, 80 tasks

**Stats:** 4 phases · 30 plans · 80 tasks · ~24,500 LOC · 231 commits (103 `feat`) · 2026-05-08 → 2026-06-14 (~37 days)

**Key accomplishments:**

- **Phase 1 — Discovery:** Public student experience — homepage with interactive Europe choropleth map, `/bips` browse with 7 URL-driven filters + 300ms-debounced unaccent FTS (GIN), `/bip/[slug]` detail with SSR meta + OG images + localStorage bookmarks; 20 seeded BIPs; RLS on every table (USING + WITH CHECK).
- **Phase 2 — Coordinator pipeline:** Supabase Auth (institutional email + verification), onboarding, 5-step submission wizard with debounced auto-save + `updated_at` optimistic locking, coordinator dashboard with status tabs.
- **Phase 3 — Admin editorial loop:** Triple-layer admin gate (middleware + layout + RLS), approve/reject with `bip_status_history` audit log + Resend emails + `revalidatePath()` ISR bust, all-listings + analytics.
- **Phase 4 — Polish / compliance:** `/what-is-a-bip` + `/privacy` static pages, GDPR Art-17 account erasure (SECURITY DEFINER RPC), repo health (CONTRIBUTING + MIT LICENSE + Contributor Covenant + gitleaks CI), static OG cards, Suspense/perf hardening, Playwright E2E (4 golden-path specs).
- **Milestone close:** Closed the rejected→revise→resubmit gap (cross-phase) and verified the full Playwright suite green against cloud Supabase (17 pass / 2 skip / 0 fail).

**Known deferred items at close:** 2 human-verify checkpoints (Phase 01 visual fidelity + EuropeMap; Phase 03 runtime email/ISR) — see STATE.md Deferred Items. Minor a11y colour-contrast polish deferred to v1.1. `BIPS-NAV-BUG` is a local `next start`-only artifact (deployed Vercel filters work) — not a production issue.

---
