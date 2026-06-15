# Phase 5: Student Auth + Role Model - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 5-student-auth-role-model
**Areas presented:** Entry points & sign-in, Role assignment safety, Cross-role access matrix, Student dashboard shell

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Entry points & sign-in | How returning students sign in; separation from coordinator auth | |
| Role assignment safety | Guaranteeing `role='student'`; one role per account; email collisions | |
| Cross-role access matrix | Full wrong-role redirect topology; where guards fire | |
| Student dashboard shell | What `/student-dashboard` shows before Phase 6/7 features exist | |

**User's choice:** "you decide for all" (delegated all four gray areas to Claude)
**Notes:** User declined to discuss individually and delegated every decision. All decisions in CONTEXT.md (D-01..D-15) were made by Claude, grounded in the locked v1.1 research (`SUMMARY.md`, `PITFALLS.md` Pitfalls 1–3, `ARCHITECTURE.md`) and the existing v1.0 auth code, then recorded under "Claude's Discretion."

---

## Claude's Discretion

All four areas. Key locked invariants Claude committed to (not free to relitigate downstream):
- Magic-link only for students (no password) — confirmed by research Open Questions table.
- `/register/student` is a single signup+sign-in entry via `signInWithOtp` (`shouldCreateUser: true`).
- New student-route signups get `role='student'`; existing account roles are never overwritten by the student flow.
- Custom Access Token Hook (PL/pgSQL) injects role into the JWT at issuance (PITFALLS Pitfall 1 fix).
- Redirect matrix per CONTEXT.md D-11; `bips_insert_coordinator` tightened to `role IN ('coordinator','admin')` (D-12).
- Dashboard ships as a minimal real shell (welcome + account/sign-out + Browse CTA) — no fake placeholders.

Flexibility left to planner/researcher: profile-row materialization (trigger vs callback), middleware-matcher edit vs layout-only guard, sign-out variant vs redirect param.

## Deferred Ideas

- Server-side saved BIPs / heart persistence — Phase 6
- Alert subscriptions + digest email — Phase 7
- Institutional-email domain validation — v1.2+
- Unified "student vs coordinator" auth landing chooser — optional UI polish, decide during `/gsd-ui-phase 5`
