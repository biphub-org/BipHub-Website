# Lighthouse Audits — Plan 04-06 Task 6 (D-20)

**Status:** PASS — user confirmed all four routes meet the FOUN-02 targets
(Performance / Accessibility / SEO ≥ 90, LCP < 1.5s simulated 4G mobile) on 2026-06-13.
Screenshot baselines (`home.png`, `bips.png`, `bip-detail.png`, `what-is-a-bip.png`)
not yet committed — optional for v1, recommended before v1.1 regression gating.

This directory is the destination for four Chrome Lighthouse screenshots that
validate Phase 4's locked performance target (FOUN-02 from Phase 1): Performance,
Accessibility, and SEO each ≥ 90, with LCP < 1.5s on simulated 4G mobile.

## How to capture (≈ 15 min total)

1. Point `.env.local` at the **cloud** Supabase project (`vercel env pull`, or
   copy from the Supabase dashboard → Settings → API). The cloud DB is already
   seeded, so no local reset is needed.
2. Production build + start:
   ```
   npm run build
   npm start
   ```
3. Open Chrome (reference Lighthouse implementation; NOT Edge).
4. Open DevTools → Lighthouse panel. Configure:
   - Mode: **Navigation** (default)
   - Device: **Mobile**
   - Categories: Performance, Accessibility, Best Practices, SEO
   - Throttling: **Simulated** (default; satisfies the "4G mobile" clause)
5. Audit each route, save the resulting full-page report screenshot:

   | Route | Save as |
   |-------|---------|
   | http://localhost:3000/ | `home.png` |
   | http://localhost:3000/bips | `bips.png` |
   | http://localhost:3000/bip/{any-seed-slug} | `bip-detail.png` |
   | http://localhost:3000/what-is-a-bip | `what-is-a-bip.png` |

6. Verify each report meets ≥ 90 Perf / A11y / SEO and LCP < 1.5s. If any
   metric fails, **investigate before approving** — log findings in
   `04-06-SUMMARY.md` under "Lighthouse findings".

7. Commit the four PNGs:
   ```
   git add .planning/phases/04-polish-static-content-performance-hardening/lighthouse/*.png
   git commit -m "docs(04-06): capture Lighthouse baselines (D-20)"
   ```

## Why this is captured manually (not in CI)

D-20 explicitly defers Lighthouse CI to v1.1; v1 captures a manual baseline.
Regression gating depends on first having a stable baseline.
