# BipHub

The free, open-source directory of Erasmus+ Blended Intensive Programs (BIPs)
across Europe.

→ Live site: **<https://biphub-website.vercel.app>**

BIPs are short, fully-funded Erasmus+ programs combining a 5–10 day in-person
mobility with a virtual learning component, worth 3–6 ECTS credits. They are
one of the best things the European Union does for higher-education students,
and they have been buried until now in scattered institutional pages and a
single broken sortable table. BipHub replaces that with a real directory — a
country map, accent-aware full-text search, sensible filters, shareable URLs,
proper detail pages, and bookmarks that work without an account.

> **Independent project — not affiliated with the European Commission.** The
> Erasmus+ name and palette are descriptive only.

## Status

The repository ships v1: discovery (Phase 1), coordinator submission (Phase 2),
admin review with email notifications (Phase 3), and static content + GDPR
+ Lighthouse hardening (Phase 4). All four phases are implementation-complete;
manual gates (Lighthouse capture, axe-DevTools sweep) and custom SMTP
configuration remain before a public announcement.

## Stack

- **Next.js 15.5 LTS** (App Router) on the Node.js runtime, deployed on Vercel
- **Supabase** for Postgres + Auth + RLS — hosted in production, optional Docker
  stack for local development
- **Tailwind CSS v4** with a locked EU palette and `clamp()`-based type ramps
- **shadcn/ui** (Base UI primitives) for accessible building blocks
- **Zod v3** + **react-hook-form** for forms; **Zustand** for the bookmark store
- **@vnedyalk0v/react19-simple-maps** + Eurostat NUTS 2024 TopoJSON for the
  Europe choropleth
- **Resend** + **react-email** for transactional mail (approve/reject notices,
  admin new-submission alerts)
- **Playwright** for end-to-end coverage; **Vitest** for unit tests

Locked technical decisions (do not relitigate) live in
[`CLAUDE.md`](./CLAUDE.md). The product context, the original brief, the
design tokens, and the visual mockup live in [`CONTEXT.md`](./CONTEXT.md) and
[`biphub-homepage.html`](./biphub-homepage.html).

## Repository layout

```
app/                  Next.js App Router pages (public, auth, dashboard, admin)
components/           Server + client components, grouped by feature
lib/                  Server actions, Supabase client factories, queries, schemas
supabase/migrations/  Versioned SQL migrations (00001..00014)
supabase/seed.sql     20 synthetic BIPs for local development
public/               TopoJSON, fonts, country flag SVGs, static OG images
tests/e2e/            Playwright golden-path specs
.planning/            GSD workflow artefacts — phase plans, decisions, research
```

## Quick start

Full setup, conventions, and PR checklist are in
[`CONTRIBUTING.md`](./CONTRIBUTING.md). Short version:

```bash
git clone https://github.com/biphub-org/BipHub-Website.git biphub
cd biphub
cp .env.example .env.local           # fill in Supabase keys from npx supabase status
npm install
supabase start && npm run db:reset   # boots local Postgres + applies migrations + seed
npm run dev                          # http://localhost:3000
```

The Supabase CLI ≥ 2.98 emits `sb_publishable_*` / `sb_secret_*` keys —
re-pull from `npx supabase status` after every `supabase start`. Legacy
demo JWTs no longer authenticate against PostgREST.

## Contributing

PRs welcome. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first — it covers the
local environment, the coding conventions enforced in review (RLS on every
table, `getClaims()` over `getSession()`, `await cookies()`, the LazyMotion
import contract for `motion`, the EU emblem prohibition), and the PR checklist.
By contributing you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md)
(Contributor Covenant v2.1).

For security issues, contact <biphub.org@gmail.com> directly rather than
filing a public issue.

## License

[MIT](./LICENSE). The MIT licence covers the source code only — it does not
transfer rights to the BipHub name, the BipHub logo, or content submitted by
university coordinators. The visual identity uses the Erasmus+ palette but
deliberately uses a star count different from the 12-star European emblem to
avoid implying EU endorsement.
