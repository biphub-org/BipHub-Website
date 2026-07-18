# 05-01 User Setup — Cloud Custom Access Token Hook

The migration `00015_student_role.sql` is applied to the cloud project
`zbvcpiwbopmfbjfhzprw`, which **creates** the `public.custom_access_token_hook`
function. But enabling the hook is a project-level Auth setting that is **not**
carried by `supabase db push` — the `[auth.hook.custom_access_token]` block in
`config.toml` only applies to *local* Supabase.

Until this is enabled, a brand-new student's first JWT will **not** carry
`app_metadata.role`, which breaks middleware role routing (D-11) for newly
signed-up students until their token refreshes.

## Steps (one-time, cloud Dashboard)

1. Open: https://supabase.com/dashboard/project/zbvcpiwbopmfbjfhzprw/auth/hooks
2. Under **Custom Access Token (Auth Hook)** → **Enable**.
3. Hook type: **Postgres function**.
4. Schema: `public` · Function: `custom_access_token_hook`.
5. Save.

## Verify

After enabling, sign up a fresh test student (magic link) and decode the issued
JWT — `app_metadata.role` must equal `student` on the **first** token (not only
after a refresh).

Alternatively (needs DB password), confirm the function exists on cloud:

```sql
select proname from pg_proc where proname = 'custom_access_token_hook';
select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'profiles_role_check';
select tgname from pg_trigger where tgname = 'on_auth_user_created';
```

## Status

- [ ] Custom Access Token Hook enabled in cloud Dashboard
- [ ] First-JWT role verified for a fresh student signup
