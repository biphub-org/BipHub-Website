# Pitfalls Research

**Domain:** EU academic program directory (Erasmus+ BIPs) — Next.js 15 App Router + Supabase + open-source
**Researched:** 2026-05-08
**Confidence:** HIGH (stack pitfalls from official Supabase/Next.js docs; legal from EC guidance; performance from bundlephobia/community reports)

---

## Critical Pitfalls

### Pitfall 1: Using `getSession()` Instead of `getClaims()` in Server Code

**What goes wrong:**
Server Components and middleware call `supabase.auth.getSession()` to check auth state. This reads the JWT from the cookie but does NOT revalidate the token signature against Supabase's public keys. A tampered or replayed token will pass the check, granting unauthorized access to coordinator and admin routes.

**Why it happens:**
`getSession()` is the obvious function name and appears in older blog posts and tutorials. The Supabase SSR docs for Next.js 15 explicitly deprecated this pattern for server-side use but many code snippets in the wild still use it.

**How to avoid:**
In all middleware, Server Components, and Server Actions that gate access, use `supabase.auth.getClaims()` exclusively. `getClaims()` validates the JWT signature against published public keys on every request. Only use `getSession()` in Client Components where session freshness is less critical.

```typescript
// WRONG — in middleware or Server Component
const { data: { session } } = await supabase.auth.getSession()
if (!session) redirect('/login')

// CORRECT
const { data: { claims }, error } = await supabase.auth.getClaims()
if (error || !claims) redirect('/login')
```

**Warning signs:**
- Auth route protection done in RSC files using `getSession()`
- Middleware files imported from auth tutorials dated before 2025
- Any server-side code path that checks `session?.user` instead of `claims`

**Phase to address:** Foundation / Auth setup phase — establish `getClaims()` as the project standard before any protected routes are built.

---

### Pitfall 2: Supabase Middleware Infinite Redirect Loop

**What goes wrong:**
The Next.js middleware refreshes the Supabase auth token on every request. If the middleware logic also redirects unauthenticated users to `/login`, and the middleware runs on the `/login` route itself (or fails to set cookies correctly after redirect), you get: Error → `/login` → middleware sees no valid session → redirects to `/login` → infinite loop. Users see ERR_TOO_MANY_REDIRECTS.

**Why it happens:**
Middleware `matcher` config is missing the exclusion for auth routes, OR the `setAll` cookie write fails silently in the try/catch wrapper and the browser never receives the refreshed token, so the next request still looks unauthenticated.

**How to avoid:**
1. Exclude `/login`, `/register`, `/auth/callback`, and all static paths from auth-redirect logic in the matcher:

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|auth).*)',
  ],
}
```

2. In the middleware, always call the Supabase client's `getAll`/`setAll` cookie refresh BEFORE any redirect logic — the token must be refreshed first.
3. Pass both `request.cookies` (for Server Components) and `response.cookies` (for browser) — missing either breaks the chain.

**Warning signs:**
- Browser console shows ERR_TOO_MANY_REDIRECTS after login
- Network tab shows `/login` being hit repeatedly with 307 responses
- Users report being logged out immediately after signing in

**Phase to address:** Auth setup phase — write an integration test or manual checklist: "sign in, close tab, reopen, still logged in."

---

### Pitfall 3: Session Cookie Not Written After `signInWithPassword` — Auth State Invisible to Middleware

**What goes wrong:**
Next.js 15 made `cookies()` and `headers()` from `next/headers` asynchronous. If the Supabase SSR client is initialized with the old synchronous cookie pattern (`cookies().get(...)` without `await`), the auth cookie is never set after sign-in. The browser holds no session cookie, middleware sees no user, and every post-login navigation redirects back to `/login`.

**Why it happens:**
Next.js 15 introduced async Dynamic APIs. The `@supabase/ssr` package updated its Next.js examples to use `await cookies()`, but old snippets or older package versions use the synchronous form. This compiles without error — it silently does nothing.

**How to avoid:**
Always initialize the server Supabase client with the async cookie pattern:

```typescript
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createClient() {
  const cookieStore = await cookies() // await is required in Next.js 15
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll(cookiesToSet) { ... } } }
  )
}
```

Pin `@supabase/ssr` to a version that explicitly supports Next.js 15 async cookies.

**Warning signs:**
- `cookies().get()` calls without `await` in any server utility file
- Sign-in succeeds (no error returned) but user is immediately redirected back to `/login`
- Auth works in development but breaks after Vercel deployment (different Node.js behavior)

**Phase to address:** Auth setup phase — first thing checked in code review of `/lib/supabase/server.ts`.

---

### Pitfall 4: RLS Disabled on New Tables — Coordinator Data Publicly Accessible

**What goes wrong:**
Any table created via the SQL editor or a migration file without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is fully readable and writable via the public API using the anon key. This means coordinator profile data, draft BIPs, and rejection notes are accessible to anyone who calls the Supabase REST endpoint directly.

**Why it happens:**
Supabase Dashboard warns about missing RLS in its table browser, but the SQL editor and migration files do not auto-add RLS. Developers writing migrations often forget. The Supabase free tier's default for new tables is RLS disabled.

**How to avoid:**
Add RLS + base policies as a standard template appended to every migration file:

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bip_partner_universities ENABLE ROW LEVEL SECURITY;

-- At minimum, block all access until explicit policies are added
```

Write a CI check using `supabase db diff` or a custom SQL assertion that verifies `rowsecurity = true` for all tables in the `public` schema.

**Warning signs:**
- Supabase Dashboard shows orange shield icon on any table
- `SELECT relrowsecurity FROM pg_class WHERE relname = 'table_name'` returns false
- `curl https://<project>.supabase.co/rest/v1/profiles?apikey=<anon>` returns data without auth

**Phase to address:** Database schema phase — encode RLS enable as a non-negotiable step in the migration template.

---

### Pitfall 5: RLS UPDATE Policy Missing `WITH CHECK` — Coordinators Can Reassign BIP Ownership

**What goes wrong:**
An RLS UPDATE policy using only `USING (created_by = auth.uid())` allows a coordinator to UPDATE a BIP they own, but the policy doesn't prevent them from changing `created_by` to another user's ID. After the update, the BIP belongs to a different user — effective ownership theft.

**Why it happens:**
`USING` controls which rows can be targeted for update. `WITH CHECK` controls what the row can look like after the update. Most tutorials only show `USING`. Supabase's own docs call this out as a gotcha but it's easy to miss.

**How to avoid:**
Every UPDATE policy on `bips` must include both clauses:

```sql
CREATE POLICY "coordinators_update_own_bips"
ON public.bips
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());
```

Also: coordinators must not be able to change `status` to `approved` directly. The status column should be updatable to `draft` only from coordinator context; `approved`/`rejected` transitions happen only via admin actions.

**Warning signs:**
- UPDATE policies in migrations that have `USING` but no `WITH CHECK`
- No explicit policy restricting `status` field transitions

**Phase to address:** Database schema phase — review every UPDATE policy before merging migrations.

---

### Pitfall 6: Views Silently Bypass RLS

**What goes wrong:**
If admin analytics queries or the BIP listing query are implemented as Postgres views, those views bypass RLS by default (they run as the `postgres` superuser). Any coordinator or anonymous user who discovers the view's API endpoint can read all data regardless of policies.

**Why it happens:**
Postgres views are created with `SECURITY DEFINER` behavior by default, which means they execute with the privileges of the creator (usually `postgres`), not the caller. This is a Postgres design choice — Supabase inherits it.

**How to avoid:**
For Postgres 15+ (Supabase's current default): add `WITH (security_invoker = true)` to any view that should respect RLS:

```sql
CREATE VIEW public.approved_bips WITH (security_invoker = true) AS
  SELECT * FROM public.bips WHERE status = 'approved';
```

Alternatively, do not expose views through the public schema. Use functions with `SECURITY DEFINER` only when intentionally bypassing RLS for admin reads, and keep those in a restricted schema.

**Warning signs:**
- Views defined in `public` schema without `security_invoker = true`
- Admin analytics using `CREATE VIEW` without RLS consideration

**Phase to address:** Database schema phase and Admin panel phase.

---

### Pitfall 7: Service-Role Client Used in the Wrong Place

**What goes wrong:**
The admin panel needs to approve/reject BIPs regardless of coordinator ownership, which requires bypassing coordinator-scoped RLS. A developer creates a Supabase client with the service-role key and uses it in a Server Action or API route. Later, a contributor copies that client pattern into a coordinator-facing route, now coordinators can read/write anything.

**Why it happens:**
The service-role client is the "just make it work" escape hatch. It's easy to copy-paste. No RLS violation will surface during testing because the tests also use the service-role client.

**How to avoid:**
Create exactly two clearly named client factories and enforce them via ESLint rules or code review:
- `createServerClient()` — uses publishable key, respects RLS, safe for all coordinator/public routes
- `createAdminClient()` — uses service-role key, marked with a comment warning, only imported from `/app/(admin)/` route group

Never let `createAdminClient` be imported outside of the `(admin)` route group. A lint rule can enforce this:

```
// .eslintrc: no-restricted-imports rule on createAdminClient outside of app/(admin)
```

**Warning signs:**
- `SUPABASE_SERVICE_ROLE_KEY` used in any file outside `/app/(admin)/` or `/lib/supabase/admin.ts`
- Coordinator dashboard Server Actions that "just work" without RLS policies being present

**Phase to address:** Auth/security setup phase — establish the two-client pattern before the admin panel is built.

---

### Pitfall 8: EU 12-Star Emblem Use Creating False EC Affiliation Impression

**What goes wrong:**
BipHub uses the EU color palette and targets Erasmus+ students. A contributor adds what looks like a decorative ring of 12 gold stars to the logo, header, or favicon — directly reproducing or closely mimicking the official EU emblem. This constitutes unauthorized use of a protected symbol that implies EU institutional endorsement.

**Why it happens:**
The palette (#003399 blue, #FFCC00 gold) is visually identical to the EU flag. The temptation to add stars as a design element is high. Contributor PRs may add this without understanding the legal restriction.

**How to avoid:**
- Document in `CONTRIBUTING.md` and the design system: "The EU 12-star circular emblem is restricted — do not use it in any form. The palette is permitted."
- In the CONTEXT.md logo description: "blue square, gold star ring" — the logo concept uses a ring but must NOT reproduce the exact 12-star arrangement of the EU emblem. Use a different number of stars or a non-circular arrangement.
- The footer disclaimer "Independent project — not affiliated with the European Commission" must appear on every page (at minimum, in the footer).
- Review all contributor PRs that touch the logo, favicon, or header for any star-circle combinations.

**Warning signs:**
- Logo or favicon contains exactly 12 stars in a circle
- Missing footer disclaimer in any page layout
- Marketing copy that says "official," "endorsed by," "partnered with" the EC or Erasmus+ programme

**Phase to address:** Phase 1 / Homepage build — establish compliant logo and footer disclaimer from the first commit.

---

### Pitfall 9: GDPR Cookie Consent Absent for EU-Targeted Platform

**What goes wrong:**
BipHub uses Vercel Analytics, possibly Google Fonts, and potentially third-party tracking. Since BipHub explicitly targets EU students and university coordinators, the ePrivacy Directive and GDPR apply regardless of where the project is hosted. Deploying without a cookie consent mechanism violates EU law.

**Why it happens:**
Open-source side projects skip cookie banners as a "deal with it later" item. Vercel Analytics and self-hosted Google Fonts may be assumed to be "not cookies" — but any tool that fingerprints users or sets persistent identifiers requires consent under the ePrivacy Directive.

**How to avoid:**
- Use `next/font` with `Inter` loaded from the Next.js font optimization pipeline — this serves fonts from Vercel's CDN (no Google request, no cookie from Google). Do NOT use a direct `<link>` to `fonts.googleapis.com`.
- For Vercel Analytics: enable only after consent is given, or use Vercel Web Analytics in privacy-first mode (no cookies, IP anonymization).
- Add a minimal cookie consent banner before launch. Use a lightweight library (e.g., `react-cookie-consent`, or a custom banner) — avoid heavy solutions like OneTrust for a project of this scale.
- Privacy policy page must cover: what data is collected, for how long, and how users can request deletion.

**Warning signs:**
- `<link href="https://fonts.googleapis.com/..." rel="stylesheet">` in any layout file (triggers cross-origin request on first load)
- Vercel Analytics script loading without consent check
- No `/privacy` page or cookie banner in the layout

**Phase to address:** Phase 1 / Homepage — implement font self-hosting and privacy baseline before any analytics are added.

---

### Pitfall 10: GDPR Right to Erasure on Submitted BIPs

**What goes wrong:**
A university coordinator registers, submits a BIP that gets approved and is publicly listed. The coordinator later requests deletion of their account under GDPR Article 17 (right to erasure). Simply deleting the `profiles` row leaves orphaned BIPs with no coordinator, or the BIP must also be deleted — removing public content that students may have bookmarked. The cascade behavior is undefined.

**Why it happens:**
Auth user deletion in Supabase cascades to `auth.users` but does NOT automatically cascade to `profiles` or `bips` unless foreign keys with `ON DELETE CASCADE` are explicitly set. Without a defined erasure policy, developers improvise inconsistently.

**How to avoid:**
Define the erasure policy upfront:
- **Profile row**: delete on user deletion via `ON DELETE CASCADE` from `auth.users`
- **Draft BIPs**: delete on user deletion (personal data, not yet public)
- **Approved BIPs**: anonymize rather than delete — set `created_by = NULL` (nullable FK), keep the listing active, set `contact_email` to a generic `[removed]` placeholder
- Implement a Server Action `deleteAccount()` that runs this logic explicitly rather than relying on FK cascades alone
- Add to the privacy policy: "Approved BIP listings may be retained in anonymized form after account deletion"

**Warning signs:**
- `created_by` FK defined with no `ON DELETE` clause (defaults to `RESTRICT` — will error on deletion)
- No `deleteAccount` flow in the coordinator dashboard
- Privacy policy that promises "all data deleted" without specifying BIP listing exceptions

**Phase to address:** Auth/profile setup phase — define the FK cascade policy in the initial migration.

---

### Pitfall 11: GeoJSON Bundle Shipped in JS — Breaks Lighthouse Performance Score

**What goes wrong:**
The EU countries GeoJSON file (`/public/eu-countries.geojson`) is imported directly into the `EuropeMap` component at the top of the file. Webpack bundles it into the JS chunk. A full GeoJSON file for Europe's country boundaries is typically 500KB–2MB. This blows the Lighthouse performance score and violates the < 1.5s load target.

**Why it happens:**
`import data from '/public/eu-countries.geojson'` is the natural way to load data in a Next.js component. Most tutorials do it this way. The map component is rendered on the homepage, so it lands in the critical bundle path.

**How to avoid:**
1. Use TopoJSON instead of GeoJSON — TopoJSON is 60–80% smaller for the same geometry.
2. Lazy-load the map component with `next/dynamic` and `ssr: false`:

```typescript
const EuropeMap = dynamic(() => import('@/components/home/EuropeMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
})
```

3. Fetch the TopoJSON file at runtime (inside the component or via a Server Component data prop), not as an import — this defers the network request past LCP.
4. Simplify the topology: use a 110m resolution file for the homepage map (country-level is sufficient; city-level detail is wasted data).

**Warning signs:**
- `import geojson from '../public/eu-countries.geojson'` in any component file
- Lighthouse shows JS bundle > 500KB on initial load
- `next build` output shows the map chunk > 200KB gzipped

**Phase to address:** Homepage build phase — apply dynamic import and TopoJSON from the first implementation.

---

### Pitfall 12: Framer Motion Bundled in Full — 34KB Gzipped Always Present

**What goes wrong:**
Framer Motion's full bundle is ~34KB gzipped and cannot be tree-shaken below that floor due to its declarative API design. BipHub uses Framer Motion for count-up stats, map hover animations, and card lift effects. If imported naively (`import { motion } from 'framer-motion'`), the full library loads on every page including the public BIP listing which has no heavy animations — violating the Lighthouse > 90 performance target.

**Why it happens:**
`motion` is the entry point everyone uses. Bundlers cannot eliminate unused animation features because Framer Motion's API relies on runtime feature discovery.

**How to avoid:**
Use `LazyMotion` with async feature loading to reduce the initial render to ~4.6KB:

```typescript
import { LazyMotion, domAnimation, m } from 'framer-motion'

// In the stats section
<LazyMotion features={domAnimation}>
  <m.div animate={{ opacity: 1 }}>...</m.div>
</LazyMotion>
```

Only load `domAnimations` (not `domMax`) since BipHub doesn't need complex gestures. Keep Framer Motion out of Server Components entirely — wrap animated sections in `'use client'` components with lazy loading.

**Warning signs:**
- `import { motion } from 'framer-motion'` in any file without `LazyMotion` wrapping
- `next-bundle-analyzer` showing `framer-motion` in the main chunk
- Any Server Component file importing from `framer-motion`

**Phase to address:** Homepage build phase — set the `LazyMotion` pattern as the project standard before any animation work begins.

---

### Pitfall 13: Tailwind v4 Dynamic Class Names Purged in Production

**What goes wrong:**
BipHub's BIP cards display country flags using dynamic class names like `bg-${countryCode}-flag` or computed Tailwind classes built from data. In production, Tailwind v4's content scanner does not see these dynamically concatenated strings — the classes are purged and the styles are absent. This appears locally (where all classes are generated) but breaks in production builds.

**Why it happens:**
Tailwind v4 uses static analysis to determine which classes to keep. String concatenation defeats the scanner. `bg-${x}` will never be in the output because Tailwind cannot know the value of `x` at build time.

**How to avoid:**
Use complete class strings in data/config files, never concatenate:

```typescript
// WRONG
const cls = `bg-${country.code}-500`

// CORRECT — full strings that Tailwind can statically detect
const countryColors: Record<string, string> = {
  de: 'bg-eu-blue',
  fr: 'bg-eu-blue-light',
}
const cls = countryColors[country.code]
```

For EU intensity tiers on the map, define an explicit safelist in `tailwind.config.ts`:

```typescript
safelist: ['fill-eu-blue-50', 'fill-eu-blue-100', 'fill-eu-blue-light', 'fill-eu-blue', 'fill-eu-blue-dark']
```

**Warning signs:**
- Any `className={\`...\${variable}...\`}` pattern in JSX
- Styles present in `npm run dev` but missing after `npm run build`
- Country flag colors or map fill tiers missing on the deployed site

**Phase to address:** Homepage build phase, and again during BIP card implementation.

---

### Pitfall 14: Duplicate Content on `/bips` Due to Filter URL Parameters

**What goes wrong:**
The BIP listing page is URL-driven: `/bips?country=de&field=engineering&lang=en`. Each unique filter combination is a separate URL. Search engines index `/bips`, `/bips?country=de`, `/bips?country=de&field=engineering` as separate pages with overlapping or identical content — this is textbook duplicate content, which causes Google to suppress all but one variant and potentially penalize the domain.

**Why it happens:**
URL-driven filter state is a deliberate design decision for shareability, but it has an implicit SEO cost that must be explicitly mitigated. Next.js does not auto-generate canonical tags for parameterized pages.

**How to avoid:**
In `/app/bips/page.tsx`, set a canonical pointing to the clean base URL regardless of query params:

```typescript
export async function generateMetadata({ searchParams }) {
  return {
    alternates: {
      canonical: 'https://biphub.eu/bips',
    },
  }
}
```

Additionally, add `<meta name="robots" content="noindex, follow">` to deeply filtered combinations (e.g., 3+ active filters) to prevent indexing of near-empty result sets.

For the BIP detail pages (`/bip/[slug]`), the slug must be stable and unique — slugs generated from titles risk collisions (two BIPs titled "Sustainable Cities" from different universities). Append the host university's Erasmus code to the slug: `sustainable-cities-erasmus-code-2025`.

**Warning signs:**
- Google Search Console showing "Duplicate, Google chose different canonical than user" warnings
- `/bips` page with no canonical tag in page source
- BIP slugs that are just `slugify(title)` without university disambiguation

**Phase to address:** Phase 1 (BIP listing build) for the canonical tag; slug generation strategy must be set in the database schema phase.

---

### Pitfall 15: Missing OG Images on BIP Detail Pages

**What goes wrong:**
BIP detail pages at `/bip/[slug]` have all the data for rich social sharing but no `og:image`. When a coordinator shares their BIP link on LinkedIn or a student shares it in a WhatsApp group, the preview shows a blank gray box. This is a significant trust signal failure for a directory competing against a WordPress site.

**Why it happens:**
OG image generation is a late-phase concern that gets deprioritized. Next.js 15 makes it available via `opengraph-image.tsx` collocated route files, but developers skip it because it requires extra Satori setup.

**How to avoid:**
Create `/app/bip/[slug]/opengraph-image.tsx` using Next.js's built-in image generation:
- Show BIP title, host university name, country flag emoji, ECTS count
- Use EU blue background with white text — simple enough to avoid Satori CSS limitations
- Avoid CSS Grid, calc(), or CSS variables in the Satori template (not supported)
- Use bundled Inter font (not Google Fonts URL) — system fonts are unavailable in Vercel's serverless runtime

Also generate a fallback static OG image for the homepage and `/bips` listing page.

**Warning signs:**
- `opengraph-image.tsx` missing from `/app/bip/[slug]/`
- Checking any BIP detail URL with a social debugger tool (e.g., opengraph.xyz) shows no image
- Font rendering broken in OG image (blank/corrupt text)

**Phase to address:** BIP detail page phase — implement OG image when the detail page is built.

---

### Pitfall 16: Auto-Save Losing Data When Session Expires Mid-Form

**What goes wrong:**
A coordinator spends 45 minutes filling the multi-step BIP submission form. The Supabase session expires (default JWT lifetime is 1 hour). The auto-save fires, the Server Action returns a 401, the coordinator sees no visible error, and when they finally click Submit, the draft is either unsaved or the submission fails. All work is lost.

**Why it happens:**
The auto-save writes to Supabase via a Server Action. If the session expires while the user is on the page, the browser's cookie has an expired JWT. The Server Action silently fails or returns an auth error that the form doesn't handle. The middleware doesn't catch it because there's no navigation — it's an in-page fetch.

**How to avoid:**
1. On the client, use `supabase.auth.onAuthStateChange` to detect `SIGNED_OUT` events and immediately warn the user ("Your session has expired — please save and sign in again").
2. Implement optimistic local backup: store the current form state in `localStorage` on every field change. On page load, check for a saved draft and offer to restore it. This survives both session expiry and browser crashes.
3. The auto-save Server Action must return explicit error types — distinguish between auth errors (session expired) and validation errors (invalid data). The form must show a visible "Session expired" banner, not silently fail.
4. Supabase sessions auto-refresh when the browser is active (the SDK polls every few seconds). Ensure `createBrowserClient()` is initialized on the dashboard page so this refresh is running.

**Warning signs:**
- Auto-save Server Action returns 401 silently with no UI feedback
- No `onAuthStateChange` listener on the dashboard page
- Form state not persisted in localStorage as a fallback

**Phase to address:** Dashboard/submission form phase.

---

### Pitfall 17: Draft Conflicts — Same BIP Opened in Two Tabs

**What goes wrong:**
A coordinator has their BIP edit form open in two browser tabs (common when copy-pasting from another source). Tab A auto-saves version 1, Tab B auto-saves version 2 (overwriting version 1), Tab A auto-saves again (overwriting version 2). The last-write-wins behavior silently destroys one version of edits.

**Why it happens:**
The auto-save writes the full BIP draft object to the database row. There is no optimistic locking or `updated_at` comparison. This is a standard last-write-wins race condition.

**How to avoid:**
Add an `updated_at` check to the auto-save upsert:

```sql
UPDATE bips
SET title = $1, ..., updated_at = NOW()
WHERE id = $id
  AND updated_at <= $last_known_updated_at
RETURNING *;
```

If the update returns 0 rows, the form knows a conflict occurred and shows a banner: "This BIP was modified in another tab. Reload to see the latest version." This is a lightweight optimistic locking approach that doesn't require WebSockets.

**Warning signs:**
- Auto-save using `upsert()` or `update()` without any `updated_at` guard
- No conflict detection on the form's save response

**Phase to address:** Dashboard/submission form phase.

---

### Pitfall 18: Approved BIPs Accidentally Re-Published After Rejection

**What goes wrong:**
An admin rejects a BIP with a note. The coordinator edits and resubmits. An admin clicks the wrong button and accidentally re-approves a BIP that was in the rejection discussion queue. Or: an admin directly edits the `status` column via Supabase's table editor (for "quick fixes") and incorrectly sets a rejected BIP to `approved` without going through the review flow.

**Why it happens:**
Admin UI with two close-together "Approve" and "Reject" buttons is a classic mis-click hazard. Direct database editing bypasses any application-level validation.

**How to avoid:**
1. Status transitions must be enforced by the application layer as a state machine, not just by the UI. A Server Action for `approveBip(id)` should check current status first — a `rejected` BIP can only transition to `pending` (resubmit) then `approved`, not directly from `rejected` to `approved`.
2. Require confirmation for destructive transitions: "Are you sure you want to approve this BIP?" modal with the BIP title displayed.
3. Build a minimal audit log: a `bip_status_history` table (`bip_id`, `from_status`, `to_status`, `changed_by`, `changed_at`, `note`). Written by the approve/reject Server Actions. This makes mistakes recoverable and provides accountability.
4. Write a Postgres trigger or constraint that rejects invalid `status` transitions at the DB level as a safety net.

**Warning signs:**
- No confirmation modal on approve/reject in the admin panel
- No audit log table in the schema
- Status column updated directly via `update()` without a state machine check

**Phase to address:** Admin panel phase.

---

### Pitfall 19: Supabase Service-Role Key or Resend API Key in `.env.example`

**What goes wrong:**
The repo is public (MIT open source). A developer sets up `.env.example` with placeholder values but accidentally uses actual production keys as "examples" or a contributor tests with real keys and commits them. The service-role key bypasses all RLS. The Resend key allows sending email from the project's domain. Both are critical security breaches.

**Why it happens:**
Developers copy their working `.env.local` to create `.env.example`, forgetting to scrub real values. Or they assume Supabase's automatic key detection (which revokes publicly committed service keys) will catch it — it won't catch it before other actors scrape it.

**How to avoid:**
- `.env.example` must use descriptive placeholder strings only: `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here`
- Add `*.env.local`, `.env.production`, `.env.*.local` to `.gitignore` — never the example file
- Add a pre-commit hook (e.g., `detect-secrets` or `gitleaks`) that scans for Supabase URL patterns (`supabase.co`) combined with API key patterns in committed files
- Rotate keys immediately if a real key appears in any commit — even briefly before deletion, GitHub's crawlers and third-party secret scanning tools may have already indexed it

**Warning signs:**
- `.env.example` contains values with `eyJ` prefix (JWT format)
- `.env.example` contains a string matching `sb_secret_` or `service_role` followed by a JWT
- Any commit touching `.env` files from a new contributor

**Phase to address:** Project initialization / open-source setup phase.

---

### Pitfall 20: Scraping erasmusbip.org for Seed Data — Legal and Accuracy Risk

**What goes wrong:**
The obvious seed data strategy is to scrape erasmusbip.org's embedded table (which is a Google Sheet iframe). This creates two problems: (1) possible Terms of Service violation or copyright claim from the erasmusbip.org operators, even though BIP data is ultimately publicly funded EU programme information; (2) the data in erasmusbip.org is known to be unreliable — outdated BIPs, duplicate entries, incorrect ISCED codes, name inconsistencies for universities (same institution listed under three different spellings).

**Why it happens:**
It's the fastest path to having real data at launch. The site has 200+ BIPs listed and scraping is technically straightforward.

**How to avoid:**
- Check erasmusbip.org's Terms of Service before any scraping. Reach out to their operators first — they may share a data export willingly, which is cleaner and builds goodwill.
- Treat scraped data as a starting point requiring manual validation, not production-ready seed data.
- For university names, normalize against the official ECHE (Erasmus Charter for Higher Education) database or ErasmusCode lookup — these are authoritative and public.
- Build the seed pipeline to flag imported BIPs with a `seed_confidence` field (`high`/`medium`/`low`) based on data completeness. Only `high` confidence BIPs go live immediately.
- Consider legal exposure: if erasmusbip.org operators object, a cease-and-desist would mean removing all scraped data at launch. Mitigate by getting at least 20 BIPs from direct university coordinator outreach as a non-scraped baseline.

**Warning signs:**
- Seed script that hits erasmusbip.org URLs without checking ToS first
- University names in seed data with "(1)", "(2)" suffixes indicating deduplication conflicts
- ISCED codes that don't match the 2013 ISCED-F standard classification table

**Phase to address:** Seed data / launch preparation phase.

---

### Pitfall 21: N+1 Queries on BIP Listing with Partner Universities

**What goes wrong:**
The `/bips` listing page renders each BIP card with the host university name. If the BIP query returns 50 BIPs, and the card component then separately fetches `universities.name` for each `host_university_id`, that's 51 database round-trips per page load. With RLS enabled, each round-trip also evaluates the RLS policy per row.

**Why it happens:**
Component-level data fetching is natural in React. `BipCard` receives a `bip` prop and fetches its own university data. This works in development with 5 BIPs but degrades quadratically in production.

**How to avoid:**
Use PostgREST's relational embedding to join in a single query:

```typescript
const { data: bips } = await supabase
  .from('bips')
  .select(`
    id, slug, title, application_deadline, ects_credits, language_of_instruction, status,
    host_university:universities!host_university_id(name, country, city),
    partners:bip_partner_universities(university:universities(name))
  `)
  .eq('status', 'approved')
  .order('created_at', { ascending: false })
  .range(0, 49)
```

Ensure indexes exist on: `bips.host_university_id`, `bips.status`, `bips.application_deadline`, `bip_partner_universities.bip_id`, `bip_partner_universities.university_id`.

**Warning signs:**
- Supabase dashboard showing 40+ queries per page load in the API logs
- `BipCard` component fetching its own university data instead of receiving it as a prop
- Missing foreign key indexes in migrations

**Phase to address:** BIP listing page phase — design the query shape before implementing the card component.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip audit log on admin actions | Faster admin panel build | No accountability; mistakes unrecoverable | Never — implement from the start |
| Use `getSession()` instead of `getClaims()` on server | Less refactoring from tutorials | Auth bypass vulnerability | Never in server code |
| Import GeoJSON directly (not TopoJSON via fetch) | Simpler code | 500KB+ in JS bundle, LCP failure | Never — use dynamic import + TopoJSON |
| Full `framer-motion` import without `LazyMotion` | Simpler imports | 34KB always loaded, Lighthouse penalty | Acceptable in local prototype only |
| Hard-code service-role client in coordinator routes | Works immediately | Any coordinator can access all data | Never |
| Scrape seed data without ToS check | Fast seed population | Legal exposure at launch | Only after ToS review and with confidence tagging |
| Slug from title only (no university disambiguation) | Simpler slug generation | Slug collisions on duplicate BIP names | Never — always include Erasmus code |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + Next.js 15 | `cookies()` called without `await` | `const cookieStore = await cookies()` in every server client factory |
| Supabase Auth + Next.js 15 | `getSession()` used in middleware/RSC | `getClaims()` only in server contexts |
| Supabase RLS + views | Views created without `security_invoker` | Add `WITH (security_invoker = true)` to all public views |
| Supabase + ISR/CDN | Cached response contains `Set-Cookie` auth header | Disable ISR caching for authenticated routes; use `Cache-Control: no-store` |
| Resend + Supabase Auth | Email verification link points to wrong redirect URL | Set `redirectTo` to your production domain's `/auth/callback`, not localhost |
| react-simple-maps + Next.js | SSR rendering a client-only SVG map | `dynamic(() => import(), { ssr: false })` always |
| Google Fonts direct link | Sets cookies on EU users without consent | Use `next/font` to self-host Inter (zero cross-origin request) |
| Framer Motion + RSC | Importing `motion` in a Server Component | All Framer Motion code must be in `'use client'` components |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full GeoJSON in JS bundle | Lighthouse LCP > 4s, bundle > 500KB | TopoJSON + `dynamic()` + runtime fetch | Day 1 deployment |
| N+1 BIP+university queries | 40+ DB calls per list page, slow TTFB | Single relational embedding query with `.select()` joins | At 10+ BIPs listed |
| Full Framer Motion in main bundle | JS parse time visible on mobile, Lighthouse < 85 | `LazyMotion` + `domAnimation` features | At first Lighthouse audit |
| Missing RLS indexes | RLS policy evaluation scans full table | Index all RLS columns (`created_by`, `status`, `host_university_id`) | At 1000+ rows |
| Dynamic Tailwind class names purged | CSS missing in production, works in dev | Full class strings or safelist | First production build |
| Missing ISR/cache strategy on `/bips` | Every page visit hits Supabase DB | ISR with `revalidate` or Supabase webhook revalidation | At 100+ concurrent users |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Service-role key in coordinator route | Any coordinator reads all data, bypasses RLS | Two-client pattern; lint rule restricting import of admin client |
| `getSession()` in server code | Tampered JWTs bypass auth | `getClaims()` only in middleware and Server Components |
| Missing RLS on any table | Full public read/write via API | CI assertion checking all tables have `rowsecurity = true` |
| No `WITH CHECK` on UPDATE policies | Coordinators can reassign BIP ownership | Every UPDATE policy must include both `USING` and `WITH CHECK` |
| Real API key in `.env.example` | Public repo exposes keys | Pre-commit hook (`gitleaks`); key rotation procedure documented |
| EU 12-star emblem in logo/favicon | Legal claim of false EC affiliation | CONTRIBUTING.md prohibition; PR review checklist |
| No GDPR erasure procedure | Legal obligation unmet for EU users | Define cascade/anonymize policy in schema; document in privacy policy |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Session expiry during form — silent fail | Coordinator loses 45 mins of BIP data | `onAuthStateChange` listener + localStorage draft backup |
| Two-tab draft conflict — last write wins | Silent data loss, coordinator confused | Optimistic locking with `updated_at` guard on auto-save |
| BIP status transition without confirmation | Admin accidentally approves/rejects | Confirmation modal showing BIP title before destructive action |
| Map not keyboard navigable | Accessibility violation (WCAG AA) | Country select `<select>` element as fallback, map has `role="application"` with instructions |
| Filter URL with no canonical | Students share filtered URLs; SEO penalized | Canonical always points to `/bips` base regardless of params |
| Empty "Recently Added" at launch | Homepage looks incomplete with 0 BIPs | Seed at least 5 BIPs before deploying homepage; add skeleton that shows category placeholders |

---

## "Looks Done But Isn't" Checklist

- [ ] **Auth protection:** Protected routes use `getClaims()` not `getSession()` — verify server-side
- [ ] **RLS enabled:** Run `SELECT relname FROM pg_class WHERE relrowsecurity = false AND relnamespace = 'public'::regnamespace` — result must be empty
- [ ] **UPDATE policies:** Every UPDATE policy has both `USING` and `WITH CHECK` — check migrations
- [ ] **OG images:** Visit any BIP detail URL in a social debugger — image must render
- [ ] **Canonical tags:** View source of `/bips?country=de` — `<link rel="canonical">` must point to `/bips`
- [ ] **Footer disclaimer:** "Independent project — not affiliated with the European Commission" visible on every page including `/admin`
- [ ] **No 12-star emblem:** Logo and favicon inspected — no circular arrangement of exactly 12 stars
- [ ] **No Google Fonts direct link:** `view-source` of any page — no `fonts.googleapis.com` request
- [ ] **Service-role client isolation:** `grep -r "createAdminClient\|service_role" app/` — only appears in `app/(admin)/` files
- [ ] **Auto-save error handling:** Expire session manually, trigger auto-save, verify visible error banner appears
- [ ] **GeoJSON not in bundle:** `next build` output — map chunk must be in a separate lazy chunk, not `page.js`

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Service-role key committed to public repo | HIGH | Rotate key immediately in Supabase dashboard; audit access logs; force-push cannot remove from GitHub history — key is compromised |
| RLS disabled discovered post-launch | HIGH | Enable RLS immediately; audit access logs for data exposure; add restrictive deny-all default policy first, then add permissive policies |
| EU emblem legal complaint | MEDIUM | Remove emblem from all assets; redeploy; document in public changelog; reach out proactively to complainant |
| Session expiry data loss reported by coordinator | MEDIUM | Add localStorage backup in next release; apologize directly if coordinator lost real submission work |
| Scraped seed data ToS complaint | MEDIUM | Remove flagged data within 24h; pivot to coordinator outreach for replacement data; document source policy |
| OG images missing post-launch | LOW | Add `opengraph-image.tsx` files; deploy; no data loss, just missed social impressions |
| Duplicate Tailwind classes purged | LOW | Add to safelist; rebuild and redeploy; no data impact |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| `getSession()` vs `getClaims()` in server code | Auth setup phase | Code review of `/lib/supabase/server.ts` and all middleware |
| Middleware infinite redirect | Auth setup phase | Manual test: sign in, navigate to protected route, check no redirect loop |
| Async cookies not awaited (Next.js 15) | Auth setup phase | `grep -r "cookies()" lib/supabase` — all must have `await` |
| RLS disabled on tables | Database schema phase | CI SQL assertion on `pg_class.rowsecurity` |
| UPDATE policy missing `WITH CHECK` | Database schema phase | Review all `CREATE POLICY ... FOR UPDATE` statements |
| Views bypassing RLS | Database schema phase + Admin panel phase | `SELECT * FROM pg_views WHERE viewname NOT LIKE 'pg_%'` — check security_invoker |
| Service-role client in wrong place | Auth/security setup phase | Lint rule on `createAdminClient` imports |
| EU 12-star emblem | Phase 1 / Homepage | Visual review checklist in PR template |
| GDPR cookie consent absent | Phase 1 / Homepage | No Google Fonts direct link; consent banner present before analytics |
| GDPR right to erasure undefined | Auth/profile setup phase | FK cascade policy documented in migration comments |
| GeoJSON in JS bundle | Homepage build phase | `next build` chunk size check; map in separate lazy chunk |
| Framer Motion full bundle | Homepage build phase | `LazyMotion` pattern enforced; bundle analyzer report |
| Tailwind dynamic class purging | Homepage + BIP card build phase | Production build test with all filter combinations |
| Duplicate content / missing canonical | BIP listing page phase | Social debugger check on parameterized URL |
| Missing OG images | BIP detail page phase | Social debugger on any `/bip/[slug]` URL |
| Auto-save session expiry data loss | Dashboard / form phase | Session expiry simulation test |
| Two-tab draft conflict | Dashboard / form phase | Open same BIP in two tabs, edit both, verify conflict banner |
| Approved/rejected status mis-click | Admin panel phase | Confirmation modal present; audit log table in schema |
| API key in `.env.example` | Project initialization | Pre-commit hook; `.env.example` review in first PR |
| Seed data scraping ToS risk | Seed data / launch prep phase | ToS reviewed and documented; coordinator outreach as backup |
| N+1 BIP + university queries | BIP listing page phase | Supabase API logs show ≤ 3 queries per page load |

---

## Sources

- [Supabase Auth Server-Side Next.js Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs) — `getClaims()` vs `getSession()`, cookie proxy pattern, CDN caching risk
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS disabled by default, views bypassing RLS, UPDATE without WITH CHECK
- [Supabase SSR — GitHub Issue #30030: Next.js 15 not working with Supabase](https://github.com/supabase/supabase/issues/30030) — async cookies() requirement
- [Supabase Auth Middleware Troubleshooting](https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV) — infinite redirect patterns
- [Supabase RLS Best Practices — makerkit.dev](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — WITH CHECK requirement, service role misuse
- [Next.js Canonical Tags Documentation](https://nextjs.org/learn/seo/canonical) — duplicate content with filter params
- [Next.js OG Image Generation](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) — opengraph-image.tsx, Satori CSS limitations
- [Framer Motion Bundle Size Reduction](https://motion.dev/docs/react-reduce-bundle-size) — LazyMotion pattern, 34KB floor
- [react-simple-maps Performance Issue #219](https://github.com/zcreativelabs/react-simple-maps/issues/219) — GeoJSON vs TopoJSON size difference
- [EC EU Emblem Rules](https://commission.europa.eu/system/files/2021-05/eu-emblem-rules_en.pdf) — restrictions on 12-star emblem, false affiliation prohibition
- [EACEA Visual Identity — European Flag and Disclaimer](https://www.eacea.ec.europa.eu/grants/visual-identity/visual-identity-programming-period-2021-2027/european-flag-emblem-and-multilingual-disclaimer_en) — required disclaimer text
- [GDPR Cookie Consent Requirements](https://gdpr.eu/cookies/) — ePrivacy Directive applicability to EU-targeted sites
- [Tailwind CSS v4 Purge Configuration](https://github.com/tailwindlabs/tailwindcss/discussions/17570) — dynamic class detection, safelist
- [Supabase API Keys — Understanding anon vs service role](https://supabase.com/docs/guides/api/api-keys) — service role bypass behavior
- [Web Scraping Legality — ScrapingBee](https://www.scrapingbee.com/blog/is-web-scraping-legal/) — ToS and copyright considerations for seed data

---
*Pitfalls research for: BipHub — EU Erasmus+ BIP directory (Next.js 15 + Supabase + open-source)*
*Researched: 2026-05-08*
