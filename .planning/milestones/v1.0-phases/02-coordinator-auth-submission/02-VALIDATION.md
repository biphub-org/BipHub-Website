---
phase: 2
slug: coordinator-auth-submission
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured — Phase 2 is primarily manual verification (auth flows, wizard forms) |
| **Config file** | none — Wave 0 not required for this phase |
| **Quick run command** | `npx tsc --noEmit` (type-check only) |
| **Full suite command** | `npx tsc --noEmit && npm run lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit && npm run lint`
- **Before `/gsd-verify-work`:** Full manual verification checklist below must be complete
- **Max feedback latency:** 15 seconds (type-check) / manual verification per behavior

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-??-01 | auth-pages | 1 | AUTH-01, AUTH-03 | T-02-01 | signUp/signIn use getClaims(), never getSession() | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 02-??-02 | callback | 1 | AUTH-02, AUTH-05 | T-02-02 | PKCE exchange sets session cookie; redirects to /onboarding | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 02-??-03 | onboarding | 1 | AUTH-07, SUBM-04 | T-02-03 | saveProfileAction uses getClaims() + await cookies() | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 02-??-04 | middleware | 1 | AUTH-03, AUTH-04 | T-02-04 | /dashboard → /login redirect for unauthenticated | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 02-??-05 | wizard | 2 | SUBM-01..08 | T-02-05 | saveDraftAction checks getClaims(); updated_at guard | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 02-??-06 | dashboard | 2 | DASH-01..06 | T-02-06 | RLS enforces coordinator only sees own BIPs | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 02-??-07 | sticky-nav | 3 | AUTH-06, DASH-01 | — | getClaims() server-side; no client-side session leak | manual | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No new test framework scaffolding required. Phase 2 follows the Phase 1 pattern: TypeScript strict mode (`tsc --noEmit`) is the automated gate; auth flows, wizard forms, and session behavior are manual-verified.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Register + email verification | AUTH-01, AUTH-02 | Requires live email delivery (Resend/Inbucket) | 1. POST /register → verify email arrives in Inbucket (local) or inbox (prod). 2. Click link → verify redirect to /onboarding. |
| Sign in + session persistence | AUTH-03, AUTH-06 | Requires browser cookie state | 1. POST /login → verify redirect to /dashboard. 2. Close tab, reopen → verify still logged in. |
| Sign out from any page | AUTH-04 | Requires cookie clearing | 1. Click Sign out → verify redirect to /login. 2. Navigate to /dashboard → verify redirect to /login. |
| Password reset flow | AUTH-05 | Requires live email delivery | 1. POST /forgot-password → verify email arrives. 2. Click link → verify /auth/callback?type=recovery → new password form. |
| Onboarding gate | AUTH-07 | Requires DB state check | 1. Sign in with unfinished profile → verify redirect to /onboarding. 2. Complete form → verify profile row in DB; redirect to /dashboard. |
| Wizard 5-step navigation | SUBM-01 | Requires browser interaction | 1. Navigate all 5 steps via Next/Back. 2. Verify step indicator updates. 3. Verify no data loss on navigation. |
| Auto-save (field blur) | SUBM-02 | Requires timing + DB check | 1. Blur a field → wait 1.5s → verify bips row in Supabase dashboard. 2. Verify Saving… → Saved indicator. |
| Auto-save (step navigation) | SUBM-02 | Requires DB check | 1. Navigate Next → verify immediate save before step change. |
| Save failure + retry | SUBM-02, D-03 | Requires network failure simulation | 1. Block saveDraftAction network call. 2. Verify toast error + retry button. 3. Retry → verify success. |
| Partner university free-text | SUBM-05 | Requires UI interaction | 1. Type unregistered university name → verify free-text chip added with (unverified) suffix. |
| Two-tab conflict | SUBM-06 | Requires 2 browser tabs | 1. Open same BIP in Tab A and Tab B. 2. Save from Tab A. 3. Save from Tab B → verify Reload/Overwrite modal. |
| Session expiry recovery | SUBM-07 | Requires manual session expiry | 1. Fill wizard. 2. Expire session in Supabase dashboard. 3. Blur field → verify SIGNED_OUT event caught → redirect to /login with draft recovery message. 4. Re-login → verify localStorage draft available. |
| Submit to pending | SUBM-08 | Requires DB state check | 1. Complete Step 5 Preview. 2. Click Submit → verify bips.status = 'pending' in Supabase. 3. Verify redirect to /dashboard. |
| Dashboard BIP list | DASH-01, DASH-02 | Requires seeded BIPs in all statuses | 1. Seed BIPs in draft/pending/approved/rejected. 2. Verify each tab shows correct count + cards. |
| Edit draft BIP | DASH-03 | Requires wizard re-entry | 1. Click Edit on draft card → verify wizard pre-populated. 2. Edit + save → verify updated in DB. |
| Edit pending BIP | DASH-04 | Requires wizard re-entry | Same as DASH-03 but with pending status BIP. |
| Withdraw pending BIP | DASH-04, D-10 | Requires DB state check | 1. Click Withdraw → verify bips.status = 'draft' in DB. |
| Rejected BIP reason | DASH-05 | Requires admin pre-action | 1. Reject a BIP from Supabase dashboard (or SQL). 2. Verify rejection reason callout visible on coordinator's dashboard card. |
| StickyNav session awareness | AUTH-06, D-15 | Requires coordinator session | 1. Sign in as coordinator. 2. Navigate to /bips → verify Dashboard link + initials in StickyNav. 3. Sign out → verify Dashboard link removed. |

---

## Security Verification Checklist

| Control | Requirement | Verification |
|---------|-------------|--------------|
| `getClaims()` used, never `getSession()` | CLAUDE.md | `grep -r "getSession" app/ lib/actions/ --include="*.ts"` → no results |
| `await cookies()` in all server client factories | CLAUDE.md | Confirm factory calls use `await cookies()` |
| RLS: coordinator only sees own BIPs | SUBM-08, DASH-01 | Query bips with a different coordinator's JWT → 0 rows returned |
| RLS: bips UPDATE only on draft/pending | SUBM-08 | Attempt SQL UPDATE of approved BIP as coordinator → RLS violation |
| `createAdminClient` not used in non-admin paths | CLAUDE.md | `grep -r "createAdminClient" app/ --include="*.ts" --exclude-dir="(admin)"` → no results |
| Middleware redirects: `/dashboard → /login` for unauthenticated | AUTH-03 | Visit /dashboard without cookie → verify redirect to /login |
| No `/login` redirect loop | CLAUDE.md, Pitfall 2 | Middleware matcher excludes /login, /register, /auth/callback |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual test instructions
- [ ] Sampling continuity: TypeScript type-check runs after every task
- [ ] No watch-mode flags in automated commands
- [ ] Feedback latency < 15s (type-check) for automated gate
- [ ] Manual verification checklist complete before `/gsd-verify-work`
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
