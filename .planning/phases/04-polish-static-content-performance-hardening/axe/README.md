# axe-DevTools manual a11y sweep — Plan 04-07 Task 10 (D-27)

Status: **PASS (minor findings accepted)** — sweep run against the cloud dev
environment on 2026-06-14. The only findings were minor colour-contrast items,
reviewed and accepted for v1 and deferred to v1.1 (tracked in
`.planning/v1.0-MILESTONE-AUDIT.md`). No other blocking violations. The
procedure below is retained for re-runs / regression checks.

## How to run

1. Install axe DevTools (Chrome / Edge): <https://www.deque.com/axe/devtools/>
2. Point the app at the **cloud** Supabase project and start the dev server.
   `.env.local` must hold the cloud project's `NEXT_PUBLIC_SUPABASE_URL` + keys
   (pull via `vercel env pull` or copy from the Supabase dashboard → Project
   Settings → API).

   The signed-in routes below need an **admin** + **coordinator** account. Admin
   role is granted via `app_metadata` (not self-registerable through the UI), so
   apply the fixture seed to the cloud DB once — paste `supabase/seed.e2e.sql`
   into the Supabase **SQL editor**, or run it against the cloud connection
   string:

   ```bash
   psql "<cloud-pooler-or-direct-connection-string>" -f supabase/seed.e2e.sql
   npm run dev
   ```

   > ⚠ The fixtures use demo passwords and `@biphub.test` emails. This project
   > will become production — **purge them before launch** (re-run the seed's
   > Step 0, or `delete from auth.users where email like '%@biphub.test'`).

3. For each route below, open in Chrome → DevTools → axe DevTools tab → "Scan ALL of my page":

   - `/` (homepage, anonymous)
   - `/bips` (anonymous)
   - `/bip/{any-slug}` (anonymous; BIP detail — pick any approved BIP from the seed)
   - `/what-is-a-bip` (anonymous; Plan 04-01)
   - `/privacy` (anonymous; Plan 04-02)
   - `/login` (anonymous)
   - `/register` (anonymous)
   - `/reset-password` (anonymous)
   - `/dashboard` (signed in as e2e-coordinator@biphub.test)
   - `/dashboard/bips/new` (signed in; wizard)
   - `/dashboard/settings` (signed in; Plan 04-05)
   - `/admin` (signed in as e2e-admin@biphub.test)
   - `/admin/bips/{id}/review` (signed in as e2e-admin)

4. For each scan, capture a screenshot showing **0 critical / 0 serious** WCAG AA violations. Save as `{route-slug}.png` in this directory.
5. Categorise findings:
   - **Critical / Serious** → fix inline (small edits expected — aria-label on icon buttons, focus rings, contrast tweaks).
   - **Moderate / Minor** → list in the plan SUMMARY for v1.1; don't block launch.
6. Keyboard verification on every public route (Tab from page load):
   - First Tab must move focus to the skip-to-content link.
   - skip-to-content link visible on focus (existing CSS in `app/globals.css`).
   - All interactive elements reachable via Tab; no focus traps; visible focus indicator on every element.
7. EuropeMap-specific: Tab to the map; the keyboard fallback `<select>` ("Filter by country") must be the focused element; selecting "Germany" navigates to `/bips?country=DE`.

## Exit criteria

- 13 screenshots saved here (one per major route) showing **0 critical / 0 serious** violations.
- Fixes (if any) committed as small inline edits prior to declaring D-27 satisfied.
- Type "approved" in the GSD resume prompt once the sweep is clean; otherwise list outstanding findings.

---
*Procedure staged 2026-05-14 during Plan 04-07 execution. Manual sweep deferred to the user; SUMMARY.md surfaces this as an outstanding checkpoint.*
