---
phase: 02-coordinator-auth-submission
plan: "01"
subsystem: infra
tags: [supabase, postgres, security-definer, shadcn, tailwind-v4, types]

requires:
  - phase: 01-discovery-foundation
    provides: profiles table, RLS policies, customized Button/Sheet primitives, EU palette tokens
provides:
  - profiles.erasmus_code column (text, nullable)
  - insert_university_if_not_exists(name, country, erasmus_code) SECURITY DEFINER RPC, callable by authenticated only
  - regenerated lib/supabase/database.types.ts reflecting both
  - 13 shadcn UI primitives (input, textarea, form, label, checkbox, switch, tabs, badge, dialog, popover, command, separator, alert) plus transitive input-group
  - 8 status color tokens in app/globals.css @theme inline (--color-status-{draft,pending,approved,rejected}{,-bg})
  - lib/utils/status.ts with STATUS_BADGE_CLASSES literal Tailwind v4 lookup
affects: [02-02-auth, 02-03-perimeter, 02-04-dashboard-onboarding, 02-05-bip-list, 02-06-wizard-core, 02-07-wizard-submit]

tech-stack:
  added: [@radix-ui/react-checkbox, @radix-ui/react-dialog, @radix-ui/react-popover, @radix-ui/react-separator, @radix-ui/react-switch, @radix-ui/react-tabs, cmdk]
  patterns:
    - SECURITY DEFINER + SET search_path lock + GRANT to authenticated only (never to anon)
    - Tailwind v4 literal class lookup keyed by enum (no template literals)
    - Coordinator-callable RPC instead of createAdminClient outside admin path

key-files:
  created:
    - supabase/migrations/00009_profiles_erasmus_code.sql
    - lib/utils/status.ts
    - components/ui/input.tsx
    - components/ui/textarea.tsx
    - components/ui/form.tsx
    - components/ui/label.tsx
    - components/ui/checkbox.tsx
    - components/ui/switch.tsx
    - components/ui/tabs.tsx
    - components/ui/badge.tsx
    - components/ui/dialog.tsx
    - components/ui/popover.tsx
    - components/ui/command.tsx
    - components/ui/separator.tsx
    - components/ui/alert.tsx
    - components/ui/input-group.tsx
  modified:
    - lib/supabase/database.types.ts
    - app/globals.css
    - package.json
    - package-lock.json

key-decisions:
  - "Use `set search_path = public` on the SECURITY DEFINER function to defeat search-path hijacking (RESEARCH.md Pitfall + CLAUDE.md never-do compliance)."
  - "Use Postgres CHECK against a fixed Erasmus+ programme-country whitelist rather than a separate table for country validation — 33 codes, no growth, simpler."
  - "Install form.tsx from shadcn 'new-york' style URL because base-nova registry returns an empty form.json regression. Standard react-hook-form + Zod resolver pattern; no style mismatch."
  - "Strip '\\nConnecting to db 5432\\n' prefix and '<claude-code-hint .../>' suffix from `supabase gen types typescript --local` stdout on Windows — without stripping, tsc fails TS1005/TS1109."
  - "STATUS_BADGE_CLASSES literal-string lookup at module scope keeps Tailwind v4 static scanner happy (CLAUDE.md never-do: no dynamic class names)."

patterns-established:
  - "Coordinator-callable SECURITY DEFINER pattern: server action -> anon-key Supabase client -> rpc('insert_university_if_not_exists') -> function runs with elevated privileges and search_path=public; only authenticated grant. Replaces createAdminClient outside admin path."
  - "Tailwind v4 literal status-class lookup: STATUS_BADGE_CLASSES = { draft: 'bg-status-draft-bg text-status-draft border-status-draft', ... } — no template literals."

requirements-completed: [AUTH-07]

duration: 14min
completed: 2026-05-09
---

# Phase 02-01: Foundational Plumbing Summary

**Migration 00009 adds profiles.erasmus_code + a coordinator-callable SECURITY DEFINER RPC for universities; types regenerated; 13 shadcn primitives installed; Tailwind v4 status tokens + literal STATUS_BADGE_CLASSES lookup live.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-05-09T16:46:01+03:00
- **Completed:** 2026-05-09T17:00:03+03:00
- **Tasks:** 3 of 4 executed; task 4 (human-verify checkpoint) skipped per user direction
- **Files modified:** 19 files (1 migration, 1 types, 1 globals.css, 1 status util, 14 shadcn, 2 lockfiles)

## Accomplishments

- AUTH-07 unblocked: `profiles.erasmus_code` column populated for new coordinator profiles, with no RLS policy change required (existing `profiles_update_own_or_admin` covers it).
- `insert_university_if_not_exists(p_name, p_country, p_erasmus_code)` SECURITY DEFINER + search_path-locked + EXECUTE-grant-to-authenticated-only — coordinators can self-register universities without `createAdminClient` outside `app/(admin)/`.
- Phase 2 UI vocabulary in place: 13 shadcn primitives + transitive `input-group`, all tsc-clean.
- Tailwind v4 status tokens (`--color-status-draft/pending/approved/rejected` + `-bg` pairs) appended to `app/globals.css` `@theme inline`; `lib/utils/status.ts` exposes a literal-string `STATUS_BADGE_CLASSES` lookup so the v4 static scanner retains them.

## Task Commits

1. **Task 1: Migration 00009** — `3f6a003` (feat) — column add + SECURITY DEFINER function + search_path lock + GRANT to authenticated.
2. **Task 2: Types regen + status tokens + status util** — `c0febb1` (feat) — `npx supabase db reset && supabase gen types typescript --local`, append 8 `@theme` tokens, materialize `STATUS_BADGE_CLASSES`.
3. **Task 3: shadcn primitives** — `685d75c` (feat) — install 13 + 1 transitive components.
4. **Task 4: Human-verify checkpoint** — skipped per user instruction ("Move on with all the waves, no need for verification now.").

## Files Created/Modified

- `supabase/migrations/00009_profiles_erasmus_code.sql` — additive migration (column + function + grant).
- `lib/supabase/database.types.ts` — regenerated; `erasmus_code` and `insert_university_if_not_exists` both present.
- `app/globals.css` — 8 status color tokens appended to `@theme inline`.
- `lib/utils/status.ts` — `STATUS_BADGE_CLASSES` literal Tailwind v4 lookup keyed by status enum.
- `components/ui/{input,textarea,form,label,checkbox,switch,tabs,badge,dialog,popover,command,separator,alert,input-group}.tsx` — shadcn install.
- `package.json`, `package-lock.json` — peer dep additions from shadcn install.

## Decisions Made

- See key-decisions in frontmatter. Three notable adaptations:
  - Stripped Windows-only stdout noise from `supabase gen types` (`Connecting to db 5432` prefix, `<claude-code-hint .../>` suffix) — without this strip, tsc fails on the regenerated types.
  - `form.tsx` installed from shadcn's `new-york` style URL because the project's `base-nova` registry returns an empty `form.json` (upstream regression).
  - shadcn's new `dialog.tsx` referenced `<Button size="icon-sm" />` but Plan 01-04's customized Button only declares `'sm' | 'md' | 'lg' | 'icon' | 'default'` — switched to `size="icon"` (Plan 01-04's `button.tsx` and `sheet.tsx` are unmodified).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule — Environmental] Windows stdout contamination of supabase gen types output**
- **Found during:** Task 2 (regen types)
- **Issue:** `npx supabase gen types typescript --local` on Windows leaks a `Connecting to db 5432\n` line at the start and a `<claude-code-hint v="1" .../>` tag at the end of stdout, both of which produce TS1005/TS1109 errors when the file is consumed.
- **Fix:** Strip both prefix and suffix from stdout before writing the file.
- **Files modified:** `lib/supabase/database.types.ts` (output content only).
- **Verification:** `npx tsc --noEmit` exits 0.
- **Committed in:** `c0febb1`.

**2. [Rule — Registry regression] base-nova returns empty form.json**
- **Found during:** Task 3 (shadcn install).
- **Issue:** `npx shadcn@latest add form` returned an empty file when sourced from the project's configured `base-nova` registry.
- **Fix:** Installed `form.tsx` from `https://ui.shadcn.com/r/styles/new-york/form.json`. Standard RHF + Zod-resolver pattern; no style mismatch with the rest of the registry's components.
- **Files modified:** `components/ui/form.tsx`.
- **Committed in:** `685d75c`.

**3. [Rule 1 — API mismatch] Dialog used non-existent Button size variant**
- **Found during:** Task 3 (shadcn install).
- **Issue:** New `dialog.tsx` referenced `<Button size="icon-sm" />`, but Plan 01-04's customized `button.tsx` declares only `'sm' | 'md' | 'lg' | 'icon' | 'default'`. tsc errored.
- **Fix:** Replaced `size="icon-sm"` with `size="icon"` in `dialog.tsx`. `button.tsx` and `sheet.tsx` left unmodified per plan instruction.
- **Files modified:** `components/ui/dialog.tsx`.
- **Committed in:** `685d75c`.

---

**Total deviations:** 3 auto-fixed (1 environmental, 1 registry regression, 1 API mismatch).
**Impact on plan:** All three were necessary for correctness. No scope creep.

## Issues Encountered

- Two cases of absolute-path drift wrote files to the main repo's working tree before being relocated to the worktree (`supabase/migrations/00009_*.sql`, `app/globals.css` edit). Caught and corrected before any commit. No contamination of main repo's tracked tree.

## User Setup Required

None — all Phase 2 plumbing is local to the repo and the local Supabase instance.

## Next Phase Readiness

- Wave 2 (02-02 auth pages, 02-03 perimeter middleware) can compose freely from `Form`, `Input`, `Label`, `Alert`, `Button` (Phase 1).
- Wave 3 (02-04 onboarding, 02-05 dashboard) can call `supabase.rpc('insert_university_if_not_exists', ...)` from a server action with the anon-key client.
- Wave 4 (02-06 wizard core) can color status badges via `STATUS_BADGE_CLASSES`.
- Verification of the migration was deferred per user direction; downstream waves assume the migration applied cleanly. If `npm run build` or runtime errors surface a missed migration, run `npx supabase db reset` before continuing.

---
*Phase: 02-coordinator-auth-submission*
*Completed: 2026-05-09*
