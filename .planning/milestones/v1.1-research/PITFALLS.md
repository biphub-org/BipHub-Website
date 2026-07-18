# Pitfalls Research

**Domain:** EU Erasmus+ BIP directory — v1.1 feature additions to an existing Next.js 15 + Supabase + Resend + Vercel system
**Researched:** 2026-06-14
**Confidence:** HIGH (v1.0 codebase fully read; Supabase/Resend official docs verified; integration-specific risks derived from actual migration files and action patterns in the existing repo)

---

## Scope: v1.1 Feature Additions

These pitfalls are specific to adding the following to the **existing** BipHub system — not general web advice:

- **(A)** Student accounts: a second auth audience with no institutional-email gate, saved-BIPs sync, and email alerts for new matching BIPs
- **(B)** Coordinator edit-of-approved-BIP with a re-review gate
- **(C)** Admin tooling improvements

Each pitfall is tagged with the workstream that triggers it and the phase of the v1.1 roadmap that should address it.

---

## Critical Pitfalls

### Pitfall 1: Student Role Does Not Propagate to the JWT Immediately — Stale Claims Gate Middleware

**Workstream:** A — Student accounts

**What goes wrong:**
A student registers, the signup trigger fires and inserts a `profiles` row with `role = 'student'`. The existing `sync_role_to_app_metadata()` trigger (migration 00002 + 00008) mirrors the role into `auth.users.raw_app_meta_data`. However, the JWT that the Supabase SSR client holds in the browser cookie was issued _before_ the trigger ran. For up to one hour (the default JWT lifetime), `auth.jwt() -> 'app_metadata' ->> 'role'` inside RLS policies returns `null` for a freshly-registered student. Any RLS policy that gate-checks for `role = 'student'` to allow access to the `saved_bips` or `subscriptions` tables will silently deny writes. The student sees a mysterious "permission denied" error on their first save attempt.

**Why it happens:**
The trigger-based role mirror (00008) is correct for _subsequent_ JWT refreshes, but the signup flow issues a JWT at the moment `signUp()` completes — before the trigger has inserted the profile row that the mirror function reads. The sequence is: Auth creates `auth.users` → JWT issued → `signUp` returns to the browser → Postgres trigger fires on `profiles` INSERT → updates `raw_app_meta_data`. The JWT in the cookie does not retroactively contain the role.

**How to avoid:**
Do not gate `saved_bips` INSERT/SELECT RLS solely on `app_metadata.role = 'student'`. Instead, use `auth.uid() IS NOT NULL` (any authenticated user) as the primary guard for student-owned tables, and keep the role check only for distinguishing coordinator vs student permissions on shared tables. For the student dashboard, use `(select auth.uid()) = user_id` as the RLS predicate — this works immediately after registration because `auth.uid()` is always populated in the JWT at issuance. Optionally, force a session refresh on the `/auth/callback` route after email verification to ensure the next JWT contains the mirrored role.

```sql
-- CORRECT: saved_bips insert does not require role = 'student'
create policy "saved_bips_insert_own"
  on public.saved_bips for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- WRONG: this silently fails for new students until JWT refresh
create policy "saved_bips_insert_student"
  on public.saved_bips for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
    and (select auth.uid()) = user_id
  );
```

**Warning signs:**
- Student gets "permission denied" on first save immediately after email verification
- `saved_bips` INSERT works after the user signs out and back in (confirms stale JWT, not a policy error)
- RLS policies on student tables check `app_metadata.role` for INSERT

**Phase to address:** Phase A (student accounts) — schema design step, before any student-facing route is built.

---

### Pitfall 2: Student + Coordinator Sharing the `profiles` Table — Existing RLS Policies Silently Gate Students Out

**Workstream:** A — Student accounts

**What goes wrong:**
The existing `profiles` table has a `role` column with values `'coordinator'` and `'admin'`. The existing RLS policy `profiles_update_own_or_admin` allows a user to update their own row. The existing `bips_select_own_or_approved` policy on `bips` checks `created_by = auth.uid()`. These policies are written for coordinators and do not actively block students — but several coordinator dashboard queries join `profiles` and assume a `university_id` and `erasmus_code` are populated. If a student's `profiles` row has `university_id = NULL`, any query that does `JOIN profiles ON bips.created_by = profiles.id` returns mismatched nulls. More critically, if the onboarding flow at `/onboarding` is reached by a student (no institutional-email gate), it will try to set `university_id` and `erasmus_code` — student-specific fields that don't exist in the current schema. The onboarding flow will either break for students or create corrupted coordinator-shaped profile rows.

**Why it happens:**
Adding a third role to `profiles` without auditing which Server Actions, RSC queries, and middleware branches assume `role IN ('coordinator', 'admin')` causes silent behavioral breakage. The middleware currently redirects to `/dashboard` after sign-in for coordinators; students should land on `/student-dashboard`. If the post-login routing in `signInAction` does not check `role = 'student'` explicitly, students land on the coordinator dashboard.

**How to avoid:**
Before adding the student role: audit every location that reads `profiles.role` or `profiles.university_id` and add a branch for `'student'`. Key files to update: `lib/actions/auth.ts` (`signInAction` post-login routing), `middleware.ts` (protect `/student-dashboard` routes), `app/(dashboard)/layout.tsx` (profile-complete gate). Add a schema constraint: `role text not null check (role in ('coordinator', 'admin', 'student'))`. Student profiles should have `university_id = NULL` by design — update any NOT NULL constraint on `profiles.university_id` before the migration.

**Warning signs:**
- Students redirected to `/dashboard` (coordinator dashboard) after login
- `profiles.university_id` constraint fails on student signup
- `signInAction`'s routing logic only checks `profile?.university_id` for completeness, causing students to loop through `/onboarding` forever

**Phase to address:** Phase A (student accounts) — must be addressed in the very first plan before any student-visible route is built.

---

### Pitfall 3: Student Role Weakens Coordinator and Admin Guards by Accident

**Workstream:** A — Student accounts

**What goes wrong:**
The current middleware guards `/dashboard` with `!claims → redirect('/login')` but does NOT check `role = 'coordinator'`. It similarly guards `/admin` with `role === 'admin'`. If a student navigates to `/dashboard`, they currently pass the middleware guard (they are authenticated) and land in the coordinator dashboard — which then crashes when trying to list "their" BIPs (query returns 0 rows, but the UI may show coordinator-specific controls). Worse: if a coordinator route eventually shows form controls that call a coordinator-only Server Action, a student who has reached that page could submit the form, and the Server Action's `getClaims()` check would see a valid authenticated user — passing the auth check — but the RLS on `bips` INSERT would also pass because `bips_insert_coordinator` only checks `auth.uid() = created_by` (no role check). A student can submit a BIP as if they were a coordinator.

**Why it happens:**
The v1.0 system conflates "authenticated" with "coordinator" for the `/dashboard` route group, because in v1.0 only coordinators and admins could register. Adding students without updating the middleware role gate exposes this assumption.

**How to avoid:**
Add a `role = 'coordinator' OR role = 'admin'` guard to the `/dashboard` middleware branch (or use a separate `/student-dashboard` route group that students are redirected to). Also add a `WITH CHECK` role guard to `bips_insert_coordinator`:

```sql
-- Add role guard so students cannot accidentally insert BIPs
drop policy if exists "bips_insert_coordinator" on public.bips;
create policy "bips_insert_coordinator"
  on public.bips for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and (select auth.jwt() -> 'app_metadata' ->> 'role') in ('coordinator', 'admin')
  );
```

Note: the role timing issue from Pitfall 1 applies here too — guard the application layer (Server Action) with a role check in addition to, not instead of, the RLS policy.

**Warning signs:**
- A student account can reach `/dashboard` without a redirect
- A student can call `submitBipAction` via Playwright or curl without a permission error from the Server Action layer
- Coordinator `role in ('coordinator')` guards absent from middleware

**Phase to address:** Phase A (student accounts) — middleware and RLS migration for coordinator route group must be updated before student registration is enabled.

---

### Pitfall 4: `saved_bips` Table Missing `bip_id` Foreign Key Index — Full-Table RLS Scan

**Workstream:** A — Student accounts

**What goes wrong:**
The new `saved_bips` table links `user_id` to `bip_id`. The RLS SELECT policy is `user_id = auth.uid()`. When a student loads their saved list, Postgres must evaluate this policy for every row in the table — at 10,000 saved_bips rows across all students, this becomes a full-table scan before filtering to the calling user's rows. Response times balloon past 500ms.

**Why it happens:**
The v1.0 PITFALLS (Pitfall — missing RLS indexes) established the pattern: index all columns used in RLS predicates. When writing a new migration for a new feature table, this step is easy to omit. Also: `bip_id` in `saved_bips` is a foreign key to `bips.id` but without an index, sub-selects checking BIP status (e.g., "only save approved BIPs") also scan.

**How to avoid:**
Every migration that creates a table with a user-ownership RLS policy MUST index `user_id` and any foreign key column used in the RLS predicate:

```sql
create index saved_bips_user_id_idx on public.saved_bips (user_id);
create index saved_bips_bip_id_idx on public.saved_bips (bip_id);
create index subscriptions_user_id_idx on public.subscriptions (user_id);
```

Run `EXPLAIN (ANALYZE, BUFFERS)` on the SELECT policy path after seeding 5,000+ rows locally to confirm index usage before merging.

**Warning signs:**
- Supabase dashboard query logs show > 200ms for saved_bips SELECT with < 500 rows
- `EXPLAIN` output shows `Seq Scan` on `saved_bips`
- New tables in migration files lack `CREATE INDEX` after `CREATE TABLE`

**Phase to address:** Phase A (student accounts) — schema migration plan, same file as table creation.

---

### Pitfall 5: Email Alert Digest Sends the Same BIP to the Same Subscriber Twice (Double-Send)

**Workstream:** A — Email alerts

**What goes wrong:**
The alert pipeline: a cron job (pg_cron or Vercel cron) wakes up, queries new BIPs approved since last run, matches them against `subscriptions`, and calls `sendEmail()` via Resend for each match. If:
- The cron fires twice within its window (Vercel Hobby cron has no exactly-once guarantee)
- A deployment restarts mid-job
- A Resend call fails and the job retries from scratch

...the same subscriber receives the same "New BIP matching your field" email twice in a minute. With Resend's rate limit of 5 API requests/second, a burst retry also risks a 429 that gets swallowed in the catch block — breaking the fire-and-forget pattern already established in `lib/email/send.ts`.

**Why it happens:**
The existing `sendEmail()` is fire-and-forget transactional (no idempotency key, no delivery record). This is correct for approval/rejection emails (triggered once per status change). Alert digests are different: they are bulk, scheduled, and retryable — a different failure model.

**How to avoid:**
Create a `bip_alert_deliveries` table to record each send attempt as the deduplication token:

```sql
create table public.bip_alert_deliveries (
  id          uuid primary key default gen_random_uuid(),
  bip_id      uuid not null references public.bips(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  sent_at     timestamptz not null default now(),
  unique (bip_id, user_id)   -- prevents double-send per (BIP, subscriber) pair
);
```

In the alert job: INSERT the delivery record in the same transaction as (or immediately before) the Resend call, using `ON CONFLICT DO NOTHING`. If the row already exists for `(bip_id, user_id)`, skip the send. This is idempotent: running the job twice sends each email exactly once.

Also use a `subscriptions.last_alerted_at` high-water mark per subscriber per run, so the job query is: `WHERE bips.approved_at > subscriptions.last_alerted_at`. Never re-scan the full approved corpus on each run.

**Warning signs:**
- No `bip_alert_deliveries` table (or equivalent idempotency log) in migrations
- Alert job queries `status = 'approved'` without a high-water mark filter
- `sendEmail()` called in a loop without any deduplication guard
- Students complaining about duplicate alert emails

**Phase to address:** Phase A (email alerts) — idempotency table must exist before the first alert cron run in any environment.

---

### Pitfall 6: Resend Rate Limit Hit by Digest Job — 429 Swallowed, Emails Silently Dropped

**Workstream:** A — Email alerts

**What goes wrong:**
The existing `sendEmail()` wraps Resend in a try/catch and does NOT re-throw on failure (D-11 fire-and-forget contract). For transactional emails this is correct — a Resend outage should not reverse a committed approval. For a digest job dispatching N emails in a loop, this is catastrophic: Resend's limit is 5 API requests/second across all emails from the team. With 50 subscribers matching one popular BIP and the job firing with no rate-control, 50 calls hit Resend in ~1 second, triggering a 429 from call 6 onward. All 45 subsequent emails silently fail with no retry. The subscriber never receives the alert.

**Why it happens:**
The existing `sendEmail()` pattern was designed for individual transactional sends, not bulk loops. Copying it into an alert loop inherits its silent-fail behavior at scale.

**How to avoid:**
Add a deliberate delay between Resend calls in the alert job (100ms between sends = safe at 10/sec with headroom). Use `Promise.allSettled` with chunks of 5, not `Promise.all` on an unbounded array. Capture per-email send results and log failures to the `bip_alert_deliveries` table with a `status` column (`sent` / `failed`). On `failed`, schedule a retry pass. Do not rely on the `bip_alert_deliveries` unique constraint alone as the only failure signal — check `.ok` on each Resend response.

Alternatively, use Resend Broadcasts (their audience-based bulk sending API) once the subscriber list exceeds 100 addresses — Broadcasts handle rate control, unsubscribe headers, and deliverability automatically. This requires storing subscribers as a Resend Audience, adding complexity; weigh against the subscriber volume.

**Warning signs:**
- Alert job calls `sendEmail()` inside `Promise.all([...subscribers.map(s => sendEmail(...))])` with no chunking or delay
- Resend API logs show 429 responses followed by silence (no retry)
- Alert job does not log per-email send results anywhere
- No `status` column on the deliveries table

**Phase to address:** Phase A (email alerts) — alert job implementation, before first production run.

---

### Pitfall 7: Email Alert Subscriptions Have No Unsubscribe Mechanism — GDPR + Deliverability Failure

**Workstream:** A — Email alerts

**What goes wrong:**
Students sign up for "alert me when a BIP in Engineering in Germany is approved." BipHub sends alert emails from `noreply@biphub.eu`. The email body has no unsubscribe link. Under GDPR Article 7 (consent withdrawal), any marketing-adjacent email must offer a clear withdrawal mechanism. Under Gmail/Yahoo 2024 bulk sender requirements (enforced for > 5,000 emails/day, but spam classification applies at any volume), emails without a `List-Unsubscribe` header have significantly higher spam placement rates. Without an unsubscribe path: students who want to stop receiving alerts must delete their account (disproportionate), spam-complain (damages `biphub.eu` domain reputation and risks Resend account suspension), or ignore the email (reducing engagement but also reducing future deliverability).

**Why it happens:**
Transactional email patterns (approval/rejection) do not need unsubscribe links — GDPR treats them as legitimate interest. Alert subscriptions are opt-in preference emails — functionally marketing. Teams add alert pipelines using the existing transactional template without adding the required unsubscribe infrastructure.

**How to avoid:**
- Generate a per-subscription signed unsubscribe token (HMAC-SHA256 of `subscription_id + created_at` with a server secret): `HMAC(secret, sub_id + "|" + created_at)`. Store the token hash in the `subscriptions` table.
- Add a public `GET /api/unsubscribe?token=...` route that verifies the token and sets `subscriptions.active = false` (does NOT require auth — the token is the credential). This is the one-click `List-Unsubscribe: <URL>` target.
- Include the unsubscribe token URL in every alert email as a footer link AND in the `List-Unsubscribe` header.
- Extend the `delete_my_account()` RPC to also delete `subscriptions` rows for the departing user (currently only handles `bips` and `profiles`).
- Document in `/privacy`: "You may cancel BIP alert subscriptions at any time by clicking Unsubscribe in any alert email."

**Warning signs:**
- Alert email templates have no unsubscribe footer link
- No `List-Unsubscribe` header in Resend send call
- `subscriptions` table has no `active` boolean column
- `delete_my_account()` RPC does not delete `subscriptions` rows (check the RPC source in 00013)
- No public unsubscribe endpoint in the app

**Phase to address:** Phase A (email alerts) — must ship with the first alert email template, not added later.

---

### Pitfall 8: Double Opt-In / GDPR Consent Not Recorded for Email Subscriptions

**Workstream:** A — Email alerts

**What goes wrong:**
A student clicks "Alert me for Engineering BIPs in Germany" and is immediately enrolled. GDPR Article 7 requires that consent be freely given, specific, informed, and unambiguous. If the subscription action doesn't record:
- What the user consented to (`"Email alerts for field=engineering, country=DE"`)
- When they consented (`created_at`)
- How they consented (e.g., checked a checkbox vs implicit on form submit)

...then BipHub cannot demonstrate lawful processing if challenged by a Data Protection Authority or a user exercising their Article 15 right of access ("show me what you have on me"). The existing `/privacy` page (Plan 04-02) documents zero-analytics and article-17 erasure but does not mention subscription email consent, because subscriptions did not exist in v1.0.

**Why it happens:**
GDPR consent audit trails feel like over-engineering until a DPA inquiry arrives. The typical shortcut is to log `created_at` but not the consent purpose or mechanism.

**How to avoid:**
Add a `consent_text` column to `subscriptions` that stores the human-readable consent string at the moment of subscription:
```sql
alter table public.subscriptions add column consent_text text not null;
-- e.g., "Opted in to email alerts for field=engineering, country=DE on biphub.eu subscription form"
```

Store `subscribed_at timestamptz not null default now()`. This is the audit trail. Update `/privacy` to include a section on subscription email consent, the data stored (email, field, country preference, consent timestamp), and the unsubscribe mechanism.

**Warning signs:**
- `subscriptions` table has no `consent_text` or `consent_mechanism` column
- `/privacy` page does not mention email alert subscriptions
- Subscription action does not show the user what they are opting into before confirming

**Phase to address:** Phase A (email alerts) — schema design step and `/privacy` update in same plan.

---

### Pitfall 9: Coordinator Edits an Approved BIP — ISR Cache Serves the Old Version for Up to One Hour

**Workstream:** B — Edit-approved-BIP with re-review

**What goes wrong:**
An approved BIP at `/bip/sustainable-cities-berlin-2025` is cached by Next.js ISR with `revalidate = 3600` (one hour, set in Plan 01-07). The coordinator submits an edit. The edit moves the BIP to `status = 'pending_edit'` (or similar). The Server Action revalidates `/dashboard` and `/bips` — but does NOT call `revalidatePath('/bip/sustainable-cities-berlin-2025')`. For the next 58 minutes, the public BIP detail page serves the old (now incorrect) content. Even worse: because the BIP is still `status = 'approved'` during re-review (to keep it publicly visible), the public detail page continues to serve the pre-edit content.

**Why it happens:**
`revalidatePath()` is a targeted call — it only busts what you name. The edit action will naturally revalidate dashboard-related paths. Forgetting to revalidate the specific `/bip/[slug]` path is a common omission. The existing `approveAction` in v1.0 does call `revalidatePath('/bip/...')` correctly (as noted in STATE.md), but the new _coordinator edit_ Server Action may not reproduce this pattern.

**How to avoid:**
In the `editApprovedBipAction` Server Action: collect the BIP's slug BEFORE the update (same pattern as `delete_my_account` collects slugs before the RPC). After successfully saving the edit and moving to re-review status, call:
```typescript
revalidatePath(`/bip/${slug}`)
revalidatePath('/bips')
revalidatePath('/dashboard')
```

If the edit changes the slug (e.g., title change), also call `revalidatePath('/bip/[old-slug]')` so the old URL stops serving content. Slug changes for approved BIPs should be forbidden or trigger a redirect — see Pitfall 10.

**Warning signs:**
- `editApprovedBipAction` calls `revalidatePath('/dashboard')` but not `revalidatePath('/bip/[slug]')`
- BIP detail page shows stale content after coordinator edit (verify by checking `updated_at` in the response vs the database)
- ISR cache `revalidate` value is > 0 on `/bip/[slug]` route (it is — 3600 from Plan 01-07)

**Phase to address:** Phase B (coordinator edit flow) — every Server Action that modifies a BIP with status `approved` or `pending_edit` must call `revalidatePath('/bip/[slug]')`.

---

### Pitfall 10: Edit-Approved Flow Leaks Unapproved Content to the Public During Re-Review

**Workstream:** B — Edit-approved-BIP with re-review

**What goes wrong:**
The coordinator submits edits to an approved BIP. Two design choices exist, each with a different failure mode:

**Choice A — BIP stays `approved` + edits stored in a shadow `bip_edits` table:** The public page continues to serve the _approved_ (original) version during re-review. The admin panel shows the pending diff. After admin approves the diff, it's merged and `revalidatePath()` fires. This is the correct approach but requires a separate `bip_edits` table and a diff-merge Server Action.

**Choice B — BIP status changes to `pending_edit`:** The `bips_select_approved_public` policy (migration 00001) only returns `status = 'approved'` rows to anonymous users. If the coordinator's edit changes the status to `pending_edit`, the public BIP at `/bip/[slug]` immediately returns 404 (ISR has no row to render) or serves the now-stale ISR cache. If the coordinator then has a change of heart and withdraws, the admin never reviews — but the ISR cache still serves old content until revalidated.

**Why it happens:**
Both approaches are subtle. Choice A requires extra schema and merge logic. Choice B (simpler schema) accidentally removes the BIP from public view during re-review, which is unacceptable for a live directory.

**How to avoid:**
Use a `bip_edits` shadow table (Choice A). The BIP retains `status = 'approved'` and remains publicly accessible throughout re-review. The shadow table stores the pending delta:

```sql
create table public.bip_edits (
  id          uuid primary key default gen_random_uuid(),
  bip_id      uuid not null references public.bips(id) on delete cascade,
  editor_id   uuid not null references public.profiles(id) on delete set null,
  edit_data   jsonb not null,  -- the proposed changes as a partial BIP object
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles(id) on delete set null
);
```

The admin reviews `bip_edits` rows, not the `bips` row directly. On approval, a Server Action merges `edit_data` into `bips`, marks `bip_edits.status = 'approved'`, and calls `revalidatePath('/bip/[slug]')`. The public page is never disrupted.

**Warning signs:**
- No `bip_edits` table in the migration plan — edits written directly to `bips` status column
- `bips.status` gains a new value like `pending_edit` without a separate shadow table
- After a coordinator submits an edit, the public BIP URL returns 404 or stale content

**Phase to address:** Phase B (coordinator edit flow) — schema design decision, must be locked before any edit UI is built.

---

### Pitfall 11: Edit-Approved Audit Log Gap — `bip_status_history` Trigger Does Not Cover Edit-in-Place

**Workstream:** B — Edit-approved-BIP with re-review

**What goes wrong:**
The existing `log_bip_status_change()` trigger (migration 00010) fires on `UPDATE OF status` on `bips`. It logs `submit`, `resubmit`, `withdraw`, and implicitly admin transitions. If the edit-approved flow uses a `bip_edits` shadow table (Pitfall 10, Choice A), the `bips.status` never changes during the edit cycle — it stays `approved`. The trigger does not fire. The admin's decision (approve/reject the edit) is invisible in the audit log. An admin who rejects an edit has no recorded trace that the edit was even proposed.

**Why it happens:**
The `bip_status_history` trigger was designed for the v1.0 state machine (`draft → pending → approved → rejected → draft`). The v1.1 edit-approved cycle adds a new arc (`approved → [review in shadow table] → approved again`) that bypasses the trigger's `UPDATE OF status` predicate.

**How to avoid:**
Extend `bip_status_history` with new `action_kind` values: `edit_submitted`, `edit_approved`, `edit_rejected`. Write explicit `INSERT INTO bip_status_history` calls inside the admin Server Actions that approve/reject `bip_edits` rows. Since these Server Actions run with the existing `createServerClient` (admin role), the `bsh_insert_admin` RLS policy already permits inserts. Log:
- `action_kind = 'edit_submitted'`: when the coordinator submits an edit (INSERT into bip_edits)
- `action_kind = 'edit_approved'`: when admin merges the edit
- `action_kind = 'edit_rejected'`: when admin rejects the edit

Also check that the `action_kind` CHECK constraint on `bip_status_history` is migrated to add these new values before any inserts are attempted.

**Warning signs:**
- `bip_status_history.action_kind` CHECK constraint does not include `edit_submitted`, `edit_approved`, `edit_rejected`
- Admin approve/reject edit Server Action has no `INSERT INTO bip_status_history` call
- Admin audit trail in the UI shows no history for approved-BIP edits

**Phase to address:** Phase B (coordinator edit flow) — schema migration must extend `action_kind` constraint before edit Server Actions are written.

---

### Pitfall 12: Coordinator Can Self-Escalate a `bip_edits` Edit via Direct RLS Bypass

**Workstream:** B — Edit-approved-BIP with re-review

**What goes wrong:**
If `bip_edits` RLS allows a coordinator to UPDATE their own pending edit row (e.g., to change `edit_data`), and the UPDATE policy does NOT include a `WITH CHECK` that prevents changing `status` from `pending` to `approved`, a coordinator can approve their own edit by issuing:
```sql
UPDATE bip_edits SET status = 'approved' WHERE id = $their_edit_id
```
This is the same class of vulnerability as v1.0 Pitfall 5 (missing `WITH CHECK`) but applied to the new shadow table.

**Why it happens:**
New table, new migration, same classic mistake. The v1.0 PITFALLS doc documents it clearly, but it must be re-applied to every new table with an UPDATE policy.

**How to avoid:**
Apply the `USING + WITH CHECK` rule to `bip_edits`:

```sql
-- Coordinator can update their own PENDING edit (e.g., to revise before admin reviews)
create policy "bip_edits_update_own_pending"
  on public.bip_edits for update
  to authenticated
  using (
    (select auth.uid()) = editor_id
    and status = 'pending'
  )
  with check (
    (select auth.uid()) = editor_id
    and status = 'pending'  -- cannot self-transition to approved/rejected
  );

-- Admin can update any edit (approve or reject)
create policy "bip_edits_update_admin"
  on public.bip_edits for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

**Warning signs:**
- `bip_edits` UPDATE policy for coordinators has `USING` but no `WITH CHECK`
- A coordinator can set `bip_edits.status = 'approved'` directly via the Supabase REST API

**Phase to address:** Phase B (coordinator edit flow) — migration review step.

---

### Pitfall 13: Slug Changes During Edit Cause Permanent Broken URLs

**Workstream:** B — Edit-approved-BIP with re-review

**What goes wrong:**
A coordinator edits an approved BIP titled "Sustainable Cities – Berlin 2025" and changes it to "Sustainable Urban Planning – Berlin 2025". The admin approves the edit and the merge Server Action updates `bips.title` and also regenerates the slug: `sustainable-urban-planning-berlin-2025`. The ISR page at `/bip/sustainable-cities-berlin-2025` now returns 404. Any student who bookmarked the old URL, any link shared on social media, and any Google-indexed page for the old slug becomes dead. Since `/bip/[slug]` uses `dynamicParams = true` and ISR, the old slug's page is not deleted — it serves the last cached ISR version indefinitely until the cache expires, then returns 404.

**Why it happens:**
Slug generation at BIP creation time is permanent in v1.0 (Plan 01-07 decision: slug from title + Erasmus code). Allowing slug regeneration during an edit breaks the URL contract.

**How to avoid:**
**Lock slugs as immutable for approved BIPs.** The edit-approved flow must explicitly exclude `slug` from the editable fields in the `bip_edits.edit_data` schema, or validate in the merge Server Action that the proposed new slug is identical to the existing one. If a title change genuinely warrants a new slug, treat it as a separate admin-only operation that:
1. Creates a redirect from the old slug to the new slug (a `bip_redirects` table or Next.js `redirects` in `next.config.ts`)
2. Calls `revalidatePath('/bip/[old-slug]')` to bust the old ISR cache

For v1.1, the simplest rule: **slug is immutable after first approval.** Document this constraint in the edit UI ("Slug cannot be changed after approval — contact an admin for URL changes").

**Warning signs:**
- Edit form includes a "Slug" field or auto-regenerates slug from title
- Merge Server Action calls `generateSlug(newTitle)` and updates `bips.slug`
- No redirect in place after a slug change is merged

**Phase to address:** Phase B (coordinator edit flow) — edit form design and merge Server Action, enforce at both UI and DB layer.

---

### Pitfall 14: Student Account Erasure Does Not Cascade to `saved_bips` and `subscriptions`

**Workstream:** A — Student accounts; cross-cutting GDPR

**What goes wrong:**
The existing `delete_my_account()` RPC (migration 00013) handles coordinator erasure: anonymize approved BIPs, hard-delete drafts/pending/rejected, delete `auth.users` row (cascades to `profiles`). It does NOT handle `saved_bips` or `subscriptions` — tables that do not exist in v1.0. When a student calls `delete_my_account()`, the `auth.users` delete will succeed, but if `saved_bips.user_id` has a FK to `profiles.id` with `ON DELETE CASCADE`, the cascade chain covers it. However, `subscriptions.user_id` must also be handled. If the FK cascade is not set up correctly, the `delete from auth.users` will fail with a FK violation, leaving the account in a half-deleted state.

**Why it happens:**
The RPC was written before these tables existed. New tables added in v1.1 must be audited against the erasure RPC on creation.

**How to avoid:**
For every new table added in v1.1 that holds user PII:
1. Define the FK to `auth.users` or `profiles` with `ON DELETE CASCADE` if the row should be deleted on account deletion.
2. Update the `delete_my_account()` RPC to explicitly handle any edge cases the cascade does not cover (e.g., subscription unsubscribe token revocation, Resend audience removal if Resend Audiences are used).
3. Update `/privacy` to enumerate the new data surfaces.

```sql
-- saved_bips: cascade delete on user removal (no anonymization needed — not public)
create table public.saved_bips (
  ...
  user_id uuid not null references public.profiles(id) on delete cascade,
  ...
);

-- subscriptions: cascade delete is correct (subscription is personal preference, not public)
create table public.subscriptions (
  ...
  user_id uuid not null references public.profiles(id) on delete cascade,
  ...
);
```

Also update the `delete_my_account()` RPC to explicitly delete the user's Resend Audience contact if Resend Audiences are used, since the cascade only handles the Postgres side.

**Warning signs:**
- `saved_bips` or `subscriptions` FK to `profiles.id` has no `ON DELETE` clause (defaults to `RESTRICT` — breaks account deletion)
- `delete_my_account()` RPC source (00013) is not updated when new tables are added
- `/privacy` page still lists only v1.0 data surfaces after v1.1 ships

**Phase to address:** Phase A (schema) — on every new table creation; also an explicit cross-check task in every phase that adds a PII-bearing table.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `app_metadata.role = 'student'` as the primary RLS guard on student tables | Matches coordinator pattern | Silently blocks all student writes for up to 1 hour after signup (Pitfall 1) | Never for INSERT; acceptable for SELECT after JWT refresh |
| Reuse existing `/dashboard` route group for students | Less routing logic | Students hit coordinator UI; coordinator BIP-submit potentially accessible (Pitfall 3) | Never — use separate route group |
| Skip `bip_alert_deliveries` idempotency table | Simpler alert job | Double-sends on cron retry, no audit trail (Pitfall 5) | Never |
| Fire alert emails inside `Promise.all(subscribers.map(...))` | Faster job completion | Hits Resend 5 req/sec limit; failures silently swallowed (Pitfall 6) | Never — chunk with delay |
| Omit unsubscribe link from alert emails | Simpler email template | GDPR violation, domain reputation damage, potential Resend suspension (Pitfall 7) | Never |
| Change BIP status to `pending_edit` during re-review (no shadow table) | Simpler schema | BIP disappears from public directory during review (Pitfall 10) | Never for an active directory |
| Allow slug regeneration on approved BIP title edit | Keeps slug "fresh" | Permanent broken URLs for bookmarks and Google index (Pitfall 13) | Never after first approval |
| Copy `delete_my_account()` RPC without updating for new tables | Faster erasure implementation | FK violation on student account deletion if cascades not set up correctly (Pitfall 14) | Never — audit every new PII table at creation |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + new `student` role | Gate all student table policies on `app_metadata.role = 'student'` | Use `auth.uid() = user_id` for ownership; reserve role check for cross-role table access |
| Supabase trigger + JWT | Assume trigger-updated `app_metadata.role` is visible in current session's JWT | It is not — JWT is only updated on next session refresh. Force session refresh on `/auth/callback` for new students |
| Resend + alert digest | Use same fire-and-forget pattern as transactional emails | Add chunked sending with delay; log per-send results; implement idempotency table |
| Resend bulk emails | Use `resend.emails.send()` in a loop for > 50 recipients | Use Resend Broadcasts/Audiences API beyond 100 subscribers (auto-handles `List-Unsubscribe`) |
| Next.js ISR + edit-approved | `revalidatePath('/dashboard')` is sufficient after BIP edit | Must also call `revalidatePath('/bip/[slug]')` and `revalidatePath('/bips')` |
| Vercel cron + email digest | Vercel Hobby cron has 10-second execution timeout | Offload to Supabase Edge Function (150s timeout) or pg_cron + pg_net; do not run long email loops in Vercel serverless |
| `bip_status_history` trigger + shadow `bip_edits` table | Trigger only fires on `UPDATE OF status` on `bips`; edit cycle bypasses it | Explicit `INSERT INTO bip_status_history` in edit approve/reject Server Actions |
| `delete_my_account()` RPC + new tables | RPC was written for v1.0 tables only | Audit every new PII table at creation; update RPC or rely on `ON DELETE CASCADE` FK |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `saved_bips` / `subscriptions` missing `user_id` index | RLS scan takes 200ms+ at 1,000 rows | `CREATE INDEX saved_bips_user_id_idx` in same migration as table creation | At 500+ total rows |
| Alert digest queries full `bips` table on every run | Job takes 30s+, risks timeout | High-water mark: `approved_at > last_alerted_at` per subscriber | At 100 BIPs |
| Alert email loop with no rate limiting | 429 from Resend at call 6; subsequent emails silently dropped | Chunk sends 5 at a time with 100ms delay | At 6+ matching subscribers |
| `bip_edits.edit_data` is unbounded JSONB | Row size grows unbounded if edit history is kept | Keep only the latest pending edit per BIP; archive accepted/rejected edits | At 1,000+ edits |
| `bip_edits` table not indexed on `bip_id` + `status` | Admin review queue slow to load pending edits | `CREATE INDEX bip_edits_pending_idx ON bip_edits (bip_id, status) WHERE status = 'pending'` | At 50+ BIPs with edits |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Student reaches `/dashboard` coordinator UI | Student can potentially submit BIPs as coordinator; coordinator-only data visible | Add `role in ('coordinator', 'admin')` middleware guard on `/dashboard`; separate `/student-dashboard` route group |
| `bip_edits` UPDATE policy missing `WITH CHECK` | Coordinator self-approves own edit | Always include both `USING` and `WITH CHECK` on every UPDATE policy on new tables (v1.0 never-do carried forward) |
| Unsubscribe token not HMAC-signed | Any user can unsubscribe any other user by guessing subscription IDs | HMAC-SHA256(server_secret, subscription_id + created_at); verify server-side on unsubscribe |
| Unsubscribe endpoint requires authentication | Students who are signed out cannot unsubscribe from emails | Unsubscribe route MUST be public (token is the credential); do not call `getClaims()` |
| Alert digest Server Action or cron uses `createAdminClient` | Service-role key exposed outside `(admin)` route group | Alert digest is coordinator/student-agnostic — use `createServerClient` with service-role only if calling from a trusted Supabase Edge Function, never from a Next.js Server Action outside `(admin)` |
| `bip_edits.edit_data` contains coordinator PII | JSONB column not subject to column-level RLS | Ensure coordinator profile data is not duplicated into `edit_data`; store references (field IDs) not denormalized PII |
| Student role added to `profiles.role` CHECK without migrating coordinator routes | Students accidentally access coordinator-only Server Actions | Run through every coordinator Server Action and add explicit role assertion: `if (claims.app_metadata?.role !== 'coordinator' && claims.app_metadata?.role !== 'admin') return { error: 'Forbidden' }` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback when student saves a BIP and RLS silently rejects (Pitfall 1) | Student thinks save worked; refreshes and bookmark is gone | Always show explicit success confirmation after `saved_bips` INSERT; re-fetch to confirm persistence |
| Alert subscription created with no way to manage or cancel | Students receive irrelevant alerts forever; spam-complain | Subscription management page in student dashboard: list active subscriptions, one-click cancel |
| Coordinator edit UI does not show "currently live" vs "pending edit" distinction | Coordinator confused whether their edit has been applied | Show "Live" badge on the current approved content and "Pending admin review" on the shadow edit |
| Edit approval email goes to coordinator with no link to the live BIP | Coordinator has to navigate manually to verify | Approval notification email includes the `/bip/[slug]` link |
| Unsubscribe page shows blank/error for expired or invalid token | Student thinks they are still subscribed | Graceful "Already unsubscribed or link expired" message; never 500 on invalid unsubscribe token |

---

## "Looks Done But Isn't" Checklist

- [ ] **Student RLS:** `saved_bips` INSERT policy verified with a fresh student session (just registered, no JWT refresh) — save must succeed immediately
- [ ] **Role guard on coordinator routes:** Playwright test: create a student account, navigate to `/dashboard` — must redirect to `/student-dashboard` or `/`
- [ ] **Idempotency table:** Run alert job twice in a row — subscriber receives exactly one email, not two; `bip_alert_deliveries` has one row per (bip_id, user_id)
- [ ] **Unsubscribe:** Click unsubscribe link in an alert email (without being logged in) — `subscriptions.active` flips to false; no authentication error shown
- [ ] **List-Unsubscribe header:** Check raw email headers of an alert email — must contain `List-Unsubscribe: <https://biphub.eu/api/unsubscribe?token=...>`
- [ ] **ISR bust on edit:** Coordinator submits edit on approved BIP; check `/bip/[slug]` — still serves old approved content (shadow edit, public unaffected) AND admin panel shows pending edit
- [ ] **ISR bust on merge:** Admin approves edit; within seconds `/bip/[slug]` serves new content (revalidatePath called)
- [ ] **Audit log coverage:** After admin approves an edit, `bip_status_history` contains a row with `action_kind = 'edit_approved'`
- [ ] **Slug immutability:** Submit an edit that changes only the title — resulting merged BIP must have the same slug as before
- [ ] **Account erasure cascade:** Student deletes account — `saved_bips` rows gone, `subscriptions` rows gone, `bip_alert_deliveries` rows gone (verify via direct SQL query)
- [ ] **`/privacy` updated:** New data surfaces (`saved_bips`, `subscriptions`, `bip_alert_deliveries`, `bip_edits`) enumerated in the privacy page
- [ ] **`WITH CHECK` on `bip_edits` UPDATE:** Coordinator cannot set `bip_edits.status = 'approved'` directly via REST API (test with curl + coordinator JWT)
- [ ] **Coordinator role guard on BIP submit:** Student JWT cannot successfully call `submitBipAction` or insert into `bips` (verify RLS blocks it)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Student JWT role gap causes silent save failures | LOW | Force client session refresh in `/auth/callback` handler; no data loss (saves just failed) |
| Student reaches coordinator dashboard (Pitfall 3) | LOW | Add middleware role guard; no data corrupted if RLS was intact |
| Alert double-send triggered | MEDIUM | Send a "we sent this twice by mistake" clarification email to affected subscribers; add idempotency table; no data loss |
| Alert emails delivered with no unsubscribe link | HIGH | Resend may suspend account for CAN-SPAM violation; must immediately add `List-Unsubscribe` header and unsubscribe endpoint and re-notify all active subscribers; domain reputation damage may take weeks to recover |
| Public BIP taken offline during edit re-review (Pitfall 10, Choice B deployed by mistake) | HIGH | Emergency migration: restore `status = 'approved'` for affected BIPs; force ISR revalidation; create `bip_edits` shadow table; re-migrate edit data |
| Slug change breaks public URL (Pitfall 13) | MEDIUM | Add redirect from old slug to new slug in `next.config.ts` or a `bip_redirects` table; call `revalidatePath` on old slug; old Google index updates within days |
| Account deletion fails with FK violation (Pitfall 14) | HIGH | User's account cannot be deleted — GDPR Article 17 breach; emergency: manual deletion via admin panel + direct DB fix; long-term: correct FK cascade in migration |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Student JWT role timing — silently blocked saves (P1) | Phase A — Student auth schema | Fresh-signup INSERT test in a Playwright spec |
| Student + coordinator `profiles` table conflict (P2) | Phase A — Student auth schema, first plan | Unit test: student signup → profile row has no university_id; onboarding not triggered |
| Student weakens coordinator/admin middleware guards (P3) | Phase A — Middleware + RLS migration | Playwright: student JWT cannot access `/dashboard`; cannot insert into `bips` |
| Missing RLS indexes on `saved_bips`/`subscriptions` (P4) | Phase A — Schema migration | `EXPLAIN` on SELECT shows index scan, not seq scan |
| Email alert double-send — no idempotency table (P5) | Phase A — Alert pipeline implementation | Run job twice; verify one delivery per (bip, user) |
| Resend rate limit hit by digest loop (P6) | Phase A — Alert pipeline implementation | Monitor Resend logs after first run; no 429 responses |
| No unsubscribe mechanism (P7) | Phase A — First alert email template | Inspect email headers for `List-Unsubscribe`; test unsubscribe URL without auth |
| GDPR consent not recorded for subscriptions (P8) | Phase A — Schema + `/privacy` update | `subscriptions` table has `consent_text`; `/privacy` mentions subscriptions |
| ISR cache stale after coordinator edit (P9) | Phase B — Edit Server Action implementation | After submitting edit, reload `/bip/[slug]` — still serves approved content (correct); after admin merge, serves new content |
| Unapproved edit leaks to public (P10) | Phase B — Schema design (shadow table decision) | `bips.status` stays `approved` during re-review; public page unaffected |
| Audit log gap for edit cycle (P11) | Phase B — `bip_status_history` migration + Server Actions | After edit approval, `SELECT * FROM bip_status_history WHERE action_kind = 'edit_approved'` returns rows |
| `bip_edits` UPDATE missing `WITH CHECK` (P12) | Phase B — Schema migration review | Coordinator REST API call to set `status = 'approved'` on own edit returns 403 |
| Slug change breaks public URLs (P13) | Phase B — Edit form + merge Server Action | Submit edit with title change; slug remains unchanged in `bips` table |
| Account erasure cascade missing for v1.1 tables (P14) | Every phase that adds a PII table (A and B) | Delete student account; verify `saved_bips`, `subscriptions`, `bip_alert_deliveries` rows all removed |

---

## Sources

- [Supabase Custom Claims and RBAC Documentation](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — JWT timing for custom role claims; role propagation via access token hooks
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — role claims in JWT; hook fires before token issuance, not retroactively
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) — USING + WITH CHECK on UPDATE, view security_invoker, performance via indexed RLS predicates
- [Supabase RLS Troubleshooting — Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — index all RLS predicate columns
- [Supabase Cron Documentation](https://supabase.com/docs/guides/cron) — pg_cron scheduling, Edge Function invocation
- [Supabase Edge Function Limits](https://supabase.com/docs/guides/functions/limits) — 150s request timeout (vs Vercel Hobby's 10s)
- [Resend Usage Limits](https://resend.com/docs/api-reference/rate-limit) — 5 requests/second per team; free plan daily/monthly quotas
- [Resend Audiences / Broadcasts](https://resend.com/blog/manage-subscribers-using-resend-audiences) — bulk send API; automatic `List-Unsubscribe` header for Broadcasts
- [Gmail/Yahoo 2024 Bulk Sender Requirements](https://resend.com/blog/gmail-and-yahoo-bulk-sending-requirements-for-2024) — `List-Unsubscribe` header required for bulk; transactional excluded
- [Email Unsubscribe Requirements 2026](https://prospeo.io/s/email-unsubscribe-requirements) — one-click unsubscribe is mandatory for marketing; spam rate thresholds
- [Next.js CDN Caching Guide](https://nextjs.org/docs/app/guides/cdn-caching) — on-demand revalidation via `revalidatePath` busts Next.js server cache; CDN purge must be triggered separately for external CDN layers
- [Next.js How Revalidation Works](https://nextjs.org/docs/app/guides/how-revalidation-works) — ISR and on-demand path revalidation mechanics
- [BipHub v1.0 PITFALLS.md](../.planning/milestones/v1.0-research/PITFALLS.md) — baseline pitfalls carried forward; especially: UPDATE policy missing WITH CHECK (Pitfall 5), GDPR erasure cascade (Pitfall 10), ISR cache invalidation (integration gotchas), missing RLS indexes (performance traps)
- [BipHub migration 00006 — RLS policies](../supabase/migrations/00006_rls_policies.sql) — existing policy shapes; coordinator gate patterns; `bips_insert_coordinator` must be updated for student role
- [BipHub migration 00010 — bip_status_history](../supabase/migrations/00010_bip_status_history.sql) — trigger only fires on `UPDATE OF status`; edit-approved cycle bypasses it
- [BipHub migration 00011 — bips_update_own_editable](../supabase/migrations/00011_bips_update_own_editable.sql) — WITH CHECK clamps post-image to `draft`; edit-approved coordinator policy must not weaken this
- [BipHub migration 00013 — delete_my_account](../supabase/migrations/00013_delete_my_account.sql) — RPC must be extended for v1.1 PII tables
- [BipHub lib/email/send.ts](../lib/email/send.ts) — fire-and-forget contract (D-11); incompatible with bulk alert loops without chunking + idempotency
- [BipHub STATE.md — Accumulated Context](../.planning/STATE.md) — ISR strategy (revalidate=3600 on /bip/[slug]), slug generation decision, GDPR erasure RPC design

---
*Pitfalls research for: BipHub v1.1 — adding student accounts, email alerts, edit-approved-with-re-review, and admin tooling to an existing Next.js 15 + Supabase + Resend system*
*Researched: 2026-06-14*
