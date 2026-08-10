# Phase 10 Verification — BIP Detail Page

**Date:** 2026-08-10
**Phase:** 10 — BIP Detail Page (DETL-11..16)
**Status:** CLOSED — 0 code, verified via existing implementation
**Evidence type:** Real rendered HTML (`renderToStaticMarkup` of RSCs), not proxy

## Summary

Phase 10 was verified as already complete: `/bip/[slug]` renders the same `BipBody`/`BipHeader`/`BipKeyFacts` as the builder's `InlineBipPreview` (preview === detail invariant). Legacy `virtual_sessions_count`/`virtual_duration_notes` are deprecated per `00024`/`00026` — current DETL-11 is timing + `virtual_session_dates` + description. All 6 DETL requirements pass via 17/17 headless checks on the actual HTML users see, plus `STATUS 200`, `Ready in 1874ms` (turbo), 110 unit tests, lint 0 errors. No migration, no code change.

## Checks (17/17 passed)

Executed `npx tsx verify-phase10.mjs` (real `BipBody` + `BipHeader` + `BipKeyFacts` + `draftToBipDetail` adapter, `globalThis.React` shim, full seeded `BipDetail` fixture):

- **DETL-11 virtual detail:** timing label `Before the mobility` ✓, session dates `Sessions: Sep …` ✓, virtual description `Three online workshops` ✓
- **DETL-12 partner-only:** amber `Open to partner institutions only` when `true` ✓, absent when `false` ✓
- **DETL-13 accommodation:** dedicated `Accommodation` section when notes present ✓, absent when null ✓
- **DETL-14 green/inclusion:** `Green travel` + `Inclusion support` cards + `sending institution` caveat ✓, absent when false ✓
- **DETL-15 capacity:** `Max places: 20` stat tile in `BipKeyFacts` ✓
- **DETL-16 IA + CTA:** 10 icon-led sections (`About`, `What you'll learn`, `Programme format`, `Universities involved`, `Who can apply`, `Fees`, `Funding & support`, `How to apply`) + `Apply via host university` + `Apply by` deadline ✓
- **Preview === detail:** `Programme format` + `Accommodation` + `Funding & support` via `draftToBipDetail` ✓, correctly omits deprecated legacy fields ✓

## Supporting Gates

- `cat /tmp/turbo.log` → `✓ Compiled middleware in 314ms` → `✓ Ready in 1874ms` (Turbopack)
- `fetch('http://localhost:3000/')` via `npx tsx` → `STATUS 200 BYTES 225338 HAS_BIPHUB true`
- `npm run test` → 110/110 (8 files)
- `npm run lint` → 0 errors (3 pre-existing `<img>` warnings)
- `git diff --stat` → only `package.json` `dev:turbo` addition + this doc + ROADMAP/STATE/REQUIREMENTS bookkeeping; `.next` cleaned after zombie `trace` lock (PID 21784) killed.

## Note on DETL-11 wording

`REQUIREMENTS.md` originally said "session count + duration/schedule notes" — updated to "timing + `virtual_session_dates` + description" with note referencing `00024_bip_builder_field_revision.sql:10` and `00026_virtual_session_dates_array.sql`. No code change needed.

## Deferred / Carry-forward

None for Phase 10. Carried infra debt remains for Phase 11: `pg_net` enable + real `cron.job_run_details` firing before any Server Action counts as done (per research Pitfall 4/6).
