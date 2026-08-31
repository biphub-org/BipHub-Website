# Contributing to BipHub

Thanks for considering a contribution. BipHub is the free, open-source database
for Erasmus+ Blended Intensive Programs (BIPs). This guide tells you how to set
up a working local environment, what conventions the codebase enforces, and what
your PR has to look like before review.

If anything below is wrong or out of date, open a PR fixing it — this file is
the contract between maintainers and contributors, and stale onboarding is the
single biggest source of friction for new contributors.

## Section 1 — Quick start

A fresh clone should be running locally in under ten minutes.

1. Install prerequisites: **Node 22 LTS**, **npm**, and the **Supabase CLI**
   (`npm i -g supabase`, or `scoop install supabase` on Windows, or
   `brew install supabase/tap/supabase` on macOS). Docker Desktop must also be
   running — Supabase boots a local Postgres + Auth + Storage stack inside it.
2. Clone the repository and `cd biphub`.
3. `cp .env.example .env.local`.
4. `supabase start` (boots local Postgres + Auth + Storage in Docker — first
   run pulls images, takes a few minutes).
5. Run `npx supabase status` and copy the printed keys into `.env.local`:
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
6. `npm install`.
7. `npm run db:reset` to apply migrations and load `supabase/seed.sql`
   (20 demo BIPs).
8. `npm run dev` and open <http://localhost:3000>.

**Supabase CLI ≥ 2.98 note.** The CLI now emits the new key system
(`sb_publishable_*` / `sb_secret_*`) — legacy JWT-style demo keys
(`eyJ...iss=supabase-demo`) no longer authenticate against PostgREST. After
every `supabase start`, re-pull from `npx supabase status` and update
`.env.local`. This caught a previous contributor and is documented here
verbatim so it does not catch you.

Available npm scripts (verify against `package.json`):

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the Next.js dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Run the production build locally |
| `npm run lint` | ESLint over the codebase |
| `npm test` | Vitest unit suite (single run) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run db:start` | `supabase start` (Docker stack) |
| `npm run db:stop` | `supabase stop` |
| `npm run db:reset` | Tear down + re-apply migrations + seed |
| `npm run db:types` | Regenerate `lib/supabase/database.types.ts` |
| `npm run verify:seed` | Audit seed data row counts and ranges |
| `npm run build:topojson` | Rebuild `/public/eu-countries.json` from GISCO source |
| `npm run fonts:fetch` | Re-download Inter TTF files to `public/fonts/` |

`db:migrate` is intentionally not exposed — `supabase db push` is the canonical
command, and aliasing it adds noise.

## Section 2 — Project structure

A short tour of the directories you will touch most often.

- `app/(public)/` — student-facing routes (homepage, `/bips`, `/bip/[slug]`,
  `/what-is-a-bip`, `/privacy`). All inherit the public Footer, including the
  EC disclaimer.
- `app/(auth)/` — sign-in, sign-up, email-verification callback, password
  reset.
- `app/(dashboard)/` — coordinator-only routes (`/dashboard`, the multi-step
  submission wizard, `/dashboard/settings`). Auth + profile-complete gate is
  applied at the layout level.
- `app/(admin)/` — admin review queue, listing edit, basic metrics. Role gate
  is enforced server-side via `app_metadata.role = 'admin'`. **This is the
  only route group allowed to import `lib/supabase/admin.ts`.**
- `components/` is organized by feature (`bip/`, `home/`, `dashboard/`,
  `admin/`, plus `ui/` for shadcn primitives).
- `lib/queries/` holds RSC data fetchers (read paths).
- `lib/actions/` holds Server Actions (every write path; no API routes for
  coordinator or admin writes).
- `lib/supabase/{server,middleware,admin}.ts` — three Supabase client
  factories. `admin.ts` uses the service role key and must only be imported
  from `app/(admin)/` (ESLint rule `no-restricted-imports` enforces this).
- `lib/stores/` — Zustand stores. Client-side state lives here (bookmarks,
  multi-step submission draft). No Redux, no heavy Context.
- `supabase/migrations/` — numbered SQL files (`000NN_short_description.sql`).
  Apply in order via `npm run db:reset`.
- `supabase/seed.sql` — 20 demo BIPs + reference data. A separate
  `supabase/seed.e2e.sql` exists for Playwright fixtures (added in Plan
  04-07).
- `tests/e2e/` — Playwright specs (added in Plan 04-07). Vitest unit tests
  sit next to their sources as `*.test.ts(x)`.

## Section 3 — The EU emblem prohibition

> **Star count in any logo, hero illustration, or branding asset MUST NOT equal 12, regardless of arrangement.**
> Our LogoMark uses **11 stars**. The
> official 12-star EU emblem is restricted under European Commission
> visual-identity rules (see the
> [EC visual identity guidelines](https://commission.europa.eu/resources-partners/european-commission-visual-identity_en)).
> The EU palette (`#003399` blue, `#FFCC00` gold) is fine to use — only the
> 12-star ring arrangement is restricted.
>
> Reviewers will reject PRs that introduce a 12-star asset, even
> unintentionally. If you need to add brand artwork, count the stars yourself
> before opening the PR.

The footer on every public route must continue to display
"*Independent project — not affiliated with the European Commission.*"

## Section 4 — Code conventions

Locked decisions. Re-litigating any of these slows the project down and adds
nothing.

- [ ] Use `getClaims()` server-side. **NEVER** `getSession()`. The
      unvalidated session reader does not validate JWT signatures; use it
      and you have introduced an auth bypass.
- [ ] `await cookies()` in every Supabase server client factory. Next.js 15
      made `cookies()` async — synchronous calls silently never set the
      cookie, and sessions vanish on the next request.
- [ ] Tailwind class names must be **literal strings**. The v4 static
      scanner cannot resolve template literals. For variant-based classes,
      build a lookup object of complete class strings.
- [ ] Use the `motion` package, never `framer-motion` (the deprecated alias
      — same code, wrong name). Import from `motion/react`. Wrap motion
      components in `LazyMotion` to avoid the always-loaded 34 KB bundle.
- [ ] Zod v3 + `@hookform/resolvers` v3.x. `@hookform/resolvers` does
      not yet ship a TypeScript-stable adapter for Zod 4.
- [ ] Next.js **15.5.x LTS** — not 16. Next.js 16 has Supabase SSR + Zod
      resolver compatibility issues; 15.5 LTS is valid through October 2026.
- [ ] Maps use `@vnedyalk0v/react19-simple-maps` — not the original
      `react-simple-maps` (unmaintained, breaks with React 19).
- [ ] Never call `createAdminClient` outside `app/(admin)/` or
      `lib/supabase/admin.ts`. The ESLint rule `no-restricted-imports`
      enforces this — do not disable it.
- [ ] Every public-route page must inherit the public Footer with the
      disclaimer "Independent project — not affiliated with the European
      Commission".
- [ ] **No analytics scripts.** No Plausible, no GA, no Vercel Analytics.
      If you need them, also add a consent banner — talk to the maintainers
      first by opening an issue. The v1 posture (FOUN-05) is "ship zero
      trackers"; revisit only with product-market-fit evidence.
- [ ] No `<img>` tags for content images. Use `next/image` with explicit
      `width` and `height`, plus `priority` for the LCP hero.

## Section 5 — Database changes

Migration filename convention: `supabase/migrations/000NN_short_description.sql`.
The number is the next sequential integer, zero-padded to five digits.

After writing a migration, run:

```bash
npm run db:reset     # tears down and re-applies all migrations + seed
npm run db:types     # regenerates lib/supabase/database.types.ts
```

Commit the regenerated `database.types.ts` alongside the migration.

**RLS policy template.** Every `UPDATE` policy **MUST** declare both `USING`
(which rows can be targeted) and `WITH CHECK` (which post-image rows are
accepted). Without `WITH CHECK`, a coordinator can reassign `created_by` to
another user — see PITFALLS Pitfall 5 and CLAUDE.md "Critical never-do items".

Reference template, copied from `supabase/migrations/00006_rls_policies.sql`:

```sql
create policy "table_update_own"
  on public.table_name for update
  to authenticated
  using (
    (select auth.uid()) = owner_id
    and status in ('eligible_pre_states')
  )
  with check (
    (select auth.uid()) = owner_id
    and status in ('eligible_post_states')
  );
```

Two further constraints:

- Use the `(select auth.uid())` subquery form (plan-cache friendly).
- Mirror role flags into `app_metadata.role` via trigger — never trust
  `profiles.role` from the client side alone.

## Section 6 — Testing

Two suites; both are required to pass before a PR is merged.

- **Unit (Vitest 4.x).** `npm test` runs once; `npm run test:watch` for
  iteration. Tests live next to their source files as `*.test.ts(x)`.
  Coverage scope in v1 is `lib/` utilities, Zod schemas, and pure functions.
  UI rendering is not unit-tested in v1 — Playwright covers user flows.
- **E2E (Playwright).** `npm run test:e2e` (added in Plan 04-07);
  `npm run test:e2e:ui` opens the interactive runner. Specs live in
  `tests/e2e/`. Each spec is a golden-path scenario; edge cases that we
  intentionally defer to v1.1 are documented in
  `tests/e2e/EDGE-CASES-DEFERRED.md`.

Run a single Playwright spec while iterating:

```bash
npx playwright test tests/e2e/submission.spec.ts --headed
```

## Section 7 — PR checklist

Copy this checklist into your PR description and tick every applicable box.

- [ ] All Tailwind class names are literal strings — no template-literal
      class construction.
- [ ] Every `UPDATE` policy added in this PR includes both `USING` and
      `WITH CHECK`.
- [ ] Server code uses `getClaims()` everywhere — no new `getSession()`
      calls.
- [ ] No `framer-motion` imports introduced.
- [ ] `.env.example` is updated if a new environment variable was added.
- [ ] Screenshots attached for any user-facing UI change.
- [ ] If a new public route was added, the page inherits the public Footer
      disclaimer.
- [ ] If a migration was added, `npm run db:types` was re-run and the
      generated types committed.
- [ ] If a new analytics or third-party script was introduced — **STOP**,
      open an issue first to discuss the consent posture.
- [ ] No 12-star arrangement in any new artwork (see Section 3).

## Section 8 — Code of Conduct

This project follows the [Contributor Covenant v2.1](./CODE_OF_CONDUCT.md).
Reports of unacceptable behaviour go to **biphub.org@gmail.com**.

By participating in this project, you agree to abide by its terms.

---

*This file is generated and maintained as part of Phase 04 of the BipHub
build. If you spot drift between this document and the code, open a PR
fixing it.*
