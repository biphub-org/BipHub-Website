# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Product Depth & Engagement

**Shipped:** 2026-07-18
**Phases:** 3 of 4 planned (5, 6, 8) | **Plans:** 17 | **Commits:** 127 (42 `feat`)

### What Was Built
- Student accounts: magic-link sign-in, dedicated `/student-dashboard`, role minted into the JWT via a Custom Access Token Hook, tightened RLS (Phase 5).
- Server-side saved BIPs with cross-device sync, localStorage-bookmark migration, and GDPR cascade (Phase 6).
- Coordinator edit-of-approved-BIP through admin re-review via a shadow `bip_edits` table (live page stays public), plus a third `changes_requested` moderation state with full audit trail (Phase 8).

### What Worked
- **Shadow-table strategy for edits** kept the public BIP live throughout re-review — chosen over the snapshot approach in ARCHITECTURE.md and validated in practice.
- **Vertical-slice phases** again each shipped an end-to-end capability; Phase 8's 9-plan wave structure held up.
- **Post-hoc bug discipline** — BUG-001 and BUG-002 were documented in KNOWN-BUGS.md with symptom → root cause → fix → affected tests before fixing, which made the cascade (one flake → four failures) legible.

### What Was Inefficient
- **Deferred manual UAT accumulated silently.** Phase 8 shipped with Resend+ISR UAT "deferred," and it stayed deferred through milestone close — the same pattern as v1.0's Phase 03 runtime checkpoint. Deferred human-verify items need an owner and a deadline, not just a note.
- **E2E suite was green pre-merge but red on fresh CI** (BUG-002). The author's stateful cloud test project had accumulated favorable state; a fresh seed exposed shared-state coupling between the withdraw test and admin-review fixtures. Cost four failures from one flake.
- **Two seed files drifted** (`supabase/seed.e2e.sql` vs the cloud `.mjs` seed) — a fresh cloud re-seed dropped fixtures and broke specs. Duplicated sources of truth for seed data bit twice.
- **Phase 7 was planned but never built** — carried a full phase of roadmap weight through the milestone before being deferred. Earlier resequencing would have kept the milestone scope honest from the start.

### Patterns Established
- **`editMode` no-save wizard path** — approved-edit wizard advances on the client draft alone rather than widening RLS to let coordinators mutate live rows. Security-preserving pattern for edit-review flows.
- **In-test resilience over global retries** — `clickUntil()` / single-click-save helpers fixed hydration and conflict-dialog flakes without bumping Playwright `retries` (respecting the no-blanket-retry decision).
- **Dedicated disposable fixtures per destructive test** — the withdraw/request-changes tests now own their own seeded BIPs instead of scavenging shared pending rows.

### Key Lessons
1. Deferred human-verify items should be tracked with an owner and revisited at the next milestone boundary — not silently rolled forward. (Recurred v1.0 → v1.1.)
2. Test against a fresh seed before merge, not just the accumulated cloud project — stateful test DBs hide shared-state coupling.
3. Collapse duplicated seed sources to one source of truth, or add a drift check in CI.
4. Resequence deferred scope out of a milestone as soon as the decision is made, so roadmap weight reflects reality.

### Cost Observations
- Model mix: not instrumented this milestone.
- Notable: post-milestone stabilization (BUG-001/002, e2e revival) consumed meaningful effort after the phases were nominally "complete" — verification debt, not new features.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 MVP | 4 | Established vertical-slice phases + YOLO mode |
| v1.1 Product Depth & Engagement | 3 of 4 | First deferred phase (7 → v1.2); first post-milestone bug-stabilization cycle |

### Recurring Themes

1. **Deferred runtime/human-verify checkpoints** recur every milestone (Phase 03 in v1.0, Phase 08 in v1.1). Needs a standing owner + deadline, not per-milestone re-deferral.
2. **Seed/test-state fragility** — shared cloud DB and drifting seed files have each caused breakage. Consolidation + fresh-seed CI is the standing fix.
