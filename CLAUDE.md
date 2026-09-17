# BipHub — Claude Code Project Guide

The free database for Erasmus+ Blended Intensive Programs. Three audiences (students discovering BIPs, university coordinators submitting them, admins reviewing). Built with Next.js 15 App Router + Supabase + Tailwind v4 + shadcn/ui, deployed on Vercel.

## Source-of-truth files

When working in this repo, read these first — they are authoritative over training data or assumptions:

- `CONTEXT.md` — original project brief from the user (visual direction, scope, decisions)
- `CONTEXT.md` §§ Homepage Sections / Decisions — locked v1 visual direction (EU palette, 96px sections, pill CTAs); do not deviate without user approval
- `.planning/PROJECT.md` — current synthesized project context
- `.planning/REQUIREMENTS.md` — 76 v1 requirements with REQ-IDs and phase mappings
- `.planning/ROADMAP.md` — 4-phase build order
- `.planning/research/SUMMARY.md` — synthesized research with locked stack and resolved open questions
- `.planning/research/STACK.md` / `FEATURES.md` / `ARCHITECTURE.md` / `PITFALLS.md` — per-dimension detail
- `.planning/STATE.md` — current phase + blockers + recent decisions

## GSD workflow

This project uses the Get-Shit-Done planning workflow. Available commands:

- `/gsd-progress` — situational status check; tells you what to do next
- `/gsd-plan-phase 1` — create the plan for Phase 1 (Discovery Foundation)
- `/gsd-execute-phase 1` — execute the plan once approved
- `/gsd-help` — list all GSD commands
- `/gsd-stats` — phases, plans, requirements, git metrics

Mode is **YOLO** with vertical-MVP slicing. Each phase ships an end-to-end user capability.

## Stack — locked decisions (do not relitigate)

| Choice | Reason |
|--------|--------|
| Next.js **15.5.x LTS** (NOT 16) | Next.js 16 has Supabase SSR + Zod resolver compatibility issues; 15.5 LTS valid through Oct 2026 |
| `motion` package (NOT `framer-motion`) | `framer-motion` is the deprecated alias; import from `motion/react` |
| Zod **v3** (NOT v4) | `@hookform/resolvers` v3.x has TS overload failures with Zod 4 |
| `@vnedyalk0v/react19-simple-maps` (NOT original) | Original is unmaintained, breaks with React 19 |
| Postgres native FTS + `unaccent` | No external search service needed below 500 BIPs |
| Supabase Auth (NOT NextAuth) | Native RLS integration |
| Server Actions for all mutations | No API routes for coordinator/admin writes |
| `revalidatePath()` in approve/reject (NOT webhooks) | Simpler ISR strategy; works inside Server Actions |
| Eurostat GISCO NUTS 2024 LEVL_0 GeoJSON | Official EU country boundaries; commit filtered TopoJSON to `/public` |

## Critical never-do items

- **Never use `getSession()` server-side** — it does not validate JWT signatures. Use `getClaims()` in middleware, RSC, and Server Actions.
- **Never call `cookies()` synchronously in Next.js 15** — must `await cookies()` in every Supabase server client factory; otherwise sessions silently never set.
- **Never import GeoJSON as a static module** — `dynamic(() => import('./EuropeMap'), { ssr: false })` and fetch TopoJSON at runtime, or LCP collapses.
- **Never use the official EU 12-star emblem** — palette is fine; the 12-star ring arrangement is restricted under EC visual identity rules. Logo "gold star ring" must use a count ≠ 12.
- **Never omit the footer disclaimer** — every page must show "Independent project — not affiliated with the European Commission".
- **Never use `framer-motion`** — use `motion` package, import from `motion/react`. Always wrap in `LazyMotion` to avoid the 34KB always-loaded bundle.
- **Never use dynamic Tailwind class names** — Tailwind v4 static scanner cannot resolve template literals. Use complete class strings in lookup objects; safelist EU map intensity classes.
- **Never use `createAdminClient` outside `app/(admin)/` and `lib/supabase/admin.ts`** — service-role key bypasses RLS.
- **Never create a table without `ENABLE ROW LEVEL SECURITY`** and policies — Supabase tables are public-readable by default via the anon key.
- **Never write an UPDATE policy without both `USING` and `WITH CHECK`** — without `WITH CHECK`, coordinators can reassign `created_by` to other users.

## Visual + brand constraints

- **EU palette:** `#003399` blue, `#FFCC00` gold, `#0a1735` ink. Background `#ffffff`, soft `#f7f8fc`. Full token list in `CONTEXT.md`.
- **Inter font** via `next/font` (self-hosted to avoid Google Fonts cross-origin GDPR issue).
- **96px section padding** on desktop; pill CTAs (`border-radius: 999px`); subtle shadows (`0 4px 16px rgba(10, 23, 53, 0.06)`).
- **Eyebrow labels** are uppercase blue with a gold leading dash; section titles use `clamp(30px, 4vw, 44px)` and `letter-spacing: -1px`.
- **Cards everywhere, no tables.** The competitor's broken table is the failure pattern.

## Open blockers (resolve before they block)

- **Logo star count** must be verified `≠ 12` before Phase 1 homepage build. Document in `CONTRIBUTING.md`.
- **erasmusbip.org ToS** must be reviewed before any seed scraping. Fallback: coordinator outreach for 20 launch BIPs.
- **`@supabase/ssr` beta** — pin exact minor version; monitor changelog before upgrading.

## Default behavior expectations

- Use existing files in `.planning/` as ground truth before asking the user about scope, requirements, or stack.
- Reference REQ-IDs (e.g. "DISC-02") in commits and discussion when the work maps to a tracked requirement.
- Atomic commits per plan/task — never bundle unrelated changes.
- Type checking and tests verify code correctness, not feature correctness; for UI changes, run the dev server and exercise the feature.

---
*Generated during `/gsd-new-project` initialization on 2026-05-09.*
