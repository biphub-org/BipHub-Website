---
phase: 04-polish-static-content-performance-hardening
plan: 04
subsystem: infra
tags: [contributing, code-of-conduct, env, gitleaks, github-actions, open-source]

requires:
  - phase: 04-polish-static-content-performance-hardening
    provides: prior plans established the public Footer privacy link (04-02) and the EU-emblem 11-star LogoMark (Phase 1 Plan 01-04) referenced from CONTRIBUTING.md
provides:
  - CONTRIBUTING.md with 8 mandated sections (D-25) including EU emblem prohibition, locked stack rules, RLS USING+WITH CHECK template, PR checklist, and CoC reference
  - CODE_OF_CONDUCT.md as Contributor Covenant v2.1 verbatim (D-26) with team@hexonasystems.com as the report contact
  - Annotated .env.example (D-23) with placeholder-only audit and a header explaining population from `npx supabase status`
  - .gitleaks.toml extending the v8 default ruleset with a path-scoped allowlist (D-22) for known-safe demo fixtures only
  - .github/workflows/secret-scan.yml running gitleaks-action@v2 on every PR and main push with fetch-depth: 0
affects: [04-05, 04-06, 04-07, post-launch onboarding, contributor PR pipeline]

tech-stack:
  added:
    - gitleaks (via gitleaks/gitleaks-action@v2 in CI)
  patterns:
    - "Open-source repo health docs (CONTRIBUTING + CODE_OF_CONDUCT + audited .env.example) shipped together"
    - "CI-only secret scanning — no Husky / lefthook / pre-commit hooks per D-22"
    - "Path-scoped gitleaks allowlists only — pattern-scoped allowlists explicitly rejected"

key-files:
  created:
    - CODE_OF_CONDUCT.md
    - .gitleaks.toml
    - .github/workflows/secret-scan.yml
  modified:
    - CONTRIBUTING.md
    - .env.example

key-decisions:
  - "CONTRIBUTING.md uses checkbox-style code conventions list so contributors can copy it into PR descriptions; 11-star LogoMark constraint stated as a hard MUST NOT in Section 3"
  - "CODE_OF_CONDUCT.md is the Contributor Covenant v2.1 source verbatim, only changing the [INSERT CONTACT METHOD] placeholder to team@hexonasystems.com (per D-26 interoperability requirement with the CC reporting ecosystem)"
  - ".env.example header block written above existing vars (not as an inline comment) so the populate-from-supabase-status instructions are unmissable; no real-key prefixes found during audit"
  - ".gitleaks.toml path-scoped allowlist forward-declares supabase/seed.e2e.sql (Plan 04-07 will create the file) so the allowlist is stable across Phase 4"
  - "secret-scan workflow uses fetch-depth: 0 to scan all commits in a PR (not just the merge commit); no continue-on-error so findings block the merge; tag-pinned to gitleaks-action@v2 — SHA pinning deferred to v1.1 hardening pass with Dependabot"

patterns-established:
  - "Repo-root open-source docs (CONTRIBUTING / CODE_OF_CONDUCT / LICENSE) sit alongside CLAUDE.md so first-time contributors see them immediately"
  - "Path-scoped allowlists in .gitleaks.toml — never pattern-scoped — so a real secret in app/, lib/, or components/ always triggers"

requirements-completed: [FOUN-05]

duration: 25 min
completed: 2026-05-14
---

# Phase 04 Plan 04: Open-source repo health (CONTRIBUTING, CoC, env audit, gitleaks CI) Summary

**Shipped the contributor-facing repo health surface: CONTRIBUTING.md (8 sections), Contributor Covenant v2.1 verbatim, audited .env.example, and CI-only gitleaks secret scanning — no Husky.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-14
- **Completed:** 2026-05-14
- **Tasks:** 5
- **Files created/modified:** 5

## Accomplishments

- CONTRIBUTING.md now matches D-25 verbatim: all 8 sections present, EU emblem prohibition cites EC visual-identity rules and the 11-star LogoMark, code conventions list mirrors CLAUDE.md "Critical never-do items", RLS template includes both `USING` and `WITH CHECK`, and the PR checklist covers Tailwind static classes, `getClaims()`, `framer-motion` ban, `.env.example` updates, and the 12-star artwork prohibition.
- CODE_OF_CONDUCT.md adopts Contributor Covenant v2.1 verbatim (D-26), starting with the canonical `# Contributor Covenant Code of Conduct` heading; only the `[INSERT CONTACT METHOD]` placeholder was substituted with `team@hexonasystems.com`.
- `.env.example` audit (D-23) verified every value is a placeholder (no `eyJ...` JWTs, no `re_*` Resend keys, no `sb_publishable_*` / `sb_secret_*` Supabase keys) and added a 23-line header comment block explaining how to populate from `npx supabase status` plus the gitleaks deterrent.
- `.gitleaks.toml` (D-22) extends gitleaks v8 defaults with a strictly path-scoped allowlist for `supabase/seed.sql`, `supabase/seed.e2e.sql` (forward-declared for Plan 04-07), all numbered migrations, `public/fonts/*.ttf`, and `.env.example`. No pattern-scoped allowlists, no `app/` or `lib/` exclusions.
- `.github/workflows/secret-scan.yml` runs gitleaks-action@v2 on every PR and main push with `fetch-depth: 0`, minimum permissions (`contents: read`, `pull-requests: write`), and no `continue-on-error` — so a finding blocks the merge.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite CONTRIBUTING.md with 8 mandated sections (D-25)** — `8685190` (docs)
2. **Task 2: Adopt Contributor Covenant v2.1 verbatim (D-26)** — `0629c89` (docs)
3. **Task 3: Annotate .env.example with header + audit (D-23)** — `4a0a8a3` (docs)
4. **Task 4: Add .gitleaks.toml with path-scoped allowlist (D-22)** — `7dce75a` (chore)
5. **Task 5: Add gitleaks secret-scan workflow (D-22)** — `62b8f7b` (ci)

## Files Created/Modified

- `CONTRIBUTING.md` (modified) — replaced abbreviated 64-line doc with full 232-line 8-section structure per D-25
- `CODE_OF_CONDUCT.md` (created) — 83 lines, Contributor Covenant v2.1 verbatim
- `.env.example` (modified) — header comment block + audited placeholder values
- `.gitleaks.toml` (created) — extends gitleaks v8 defaults, path-scoped allowlist
- `.github/workflows/secret-scan.yml` (created) — gitleaks-action@v2 on PR + main push

## Decisions Made

See `key-decisions` in frontmatter — five decisions logged covering CONTRIBUTING.md tone, verbatim CoC adoption, .env.example header placement, gitleaks allowlist forward-declaration of seed.e2e.sql, and the no-continue-on-error / fetch-depth posture for the workflow.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Acceptance criterion regex] CONTRIBUTING.md line-wrap broke literal-phrase greps**
- **Found during:** Task 1 (acceptance verification loop)
- **Issue:** Two acceptance criteria (`grep -q "MUST NOT equal 12"` and `grep -q "Zod v3"`) initially failed because the phrases were split across two lines by my prose wrapping (e.g., `MUST NOT\nequal 12`) and the `Zod **v3**` markdown-bold form contained intervening asterisks.
- **Fix:** Rewrapped the two affected lines so each literal phrase appears on a single line, and dropped the markdown bold around `v3`. Plan D-25 wording semantics are preserved — only line-wrapping changed.
- **Files modified:** CONTRIBUTING.md (lines 95-96, 127-128)
- **Verification:** Re-ran both `grep -q` checks — both PASS.
- **Committed in:** `8685190` (Task 1 commit; the fix happened before that commit was created).

---

**Total deviations:** 1 auto-fixed (Rule 1 — minor acceptance-criterion grep failure caused by line wrapping)
**Impact on plan:** Pure formatting fix; plan semantics preserved verbatim. No scope creep.

## Issues Encountered

- **WebFetch sanitisation of the Contributor Covenant text.** The default `WebFetch` tool returned a refusal-style summary instead of the verbatim policy. Mitigation: pulled the raw markdown via `Invoke-WebRequest` from the canonical `EthicalSource/contributor_covenant` GitHub source on the `release` branch and stripped the Hugo `+++` frontmatter — the body of the policy is identical to the v2.1 release, so verbatim adoption per D-26 is preserved.

## User Setup Required

None — no external service configuration required. The gitleaks workflow uses the default `GITHUB_TOKEN` and is free for public repos and small orgs per gitleaks-action v2 licensing; no `GITLEAKS_LICENSE` needs to be set.

## Next Phase Readiness

- The repo is now open-source-ready on the documentation surface: CONTRIBUTING.md guides new contributors, CODE_OF_CONDUCT.md provides the reporting channel, .env.example is the canonical env reference, and gitleaks CI catches accidental secret commits before merge.
- `supabase/seed.e2e.sql` is forward-declared in `.gitleaks.toml`; Plan 04-07 can create that file without further allowlist changes.
- Plan 04-05 (account deletion) is now unblocked from the documentation side — coordinator-facing deletion UX can land knowing the gitleaks workflow will catch any test fixtures that leak credentials.

---
*Phase: 04-polish-static-content-performance-hardening*
*Completed: 2026-05-14*
