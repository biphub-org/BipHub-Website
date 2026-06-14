# Running the E2E suite

Playwright drives the app at `localhost` while the app talks to whichever
Supabase the dev server's env points at. Pick the setup that matches your
environment.

## Against cloud Supabase (current dev environment)

1. Point `.env.local` at the cloud project (`vercel env pull`, or Supabase
   dashboard → Settings → API).
2. Ensure the cloud DB has migrations applied (`supabase db push` if the project
   is linked) and the demo seed (`supabase/seed.sql` — the 20 approved BIPs that
   `map-filter.spec` relies on).
3. Apply the fixtures: paste `supabase/seed.e2e.sql` into the Supabase **SQL
   editor**, or run it against the connection string:
   ```bash
   psql "<cloud-pooler-or-direct-connection-string>" -f supabase/seed.e2e.sql
   ```
4. Run the suite:
   ```bash
   npm run test:e2e
   ```
   Playwright starts the app (which reads cloud from `.env.local`), signs in
   through it to capture storage-state, and runs every spec — including
   `resubmit.spec` (the rejected → revise → resubmit flow).

> ⚠ The fixtures use demo passwords + `@biphub.test` emails and grant an admin
> role via `app_metadata`. This project becomes production — **purge the
> fixtures before launch**: re-run the seed's Step 0, or
> `delete from auth.users where email like '%@biphub.test'`.

## Against local Supabase (contributors / CI)

```bash
supabase start
npm run db:reset                       # migrations + demo seed (seed.sql)
psql "$(supabase status -o json | jq -r '.DB_URL')" -f supabase/seed.e2e.sql
npm run test:e2e
```

CI (`.github/workflows/e2e.yml`) does exactly this with an ephemeral local stack.
Local JWT signing keys rotate on every `supabase start`, so storage-state is
regenerated per run and never committed (see `tests/e2e/setup.ts`).
