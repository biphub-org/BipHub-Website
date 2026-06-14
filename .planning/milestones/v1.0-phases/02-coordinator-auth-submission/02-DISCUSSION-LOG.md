# Phase 2: Coordinator Auth + Submission - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 2-Coordinator-Auth-Submission
**Areas discussed:** Wizard step structure, Onboarding gate, Dashboard BIP list, Auth page chrome

---

## Wizard Step Structure

### Q1: Field grouping across 5 steps

| Option | Description | Selected |
|--------|-------------|----------|
| Use proposed 5-step grouping | Basic info → Program details → Partners → Application info → Preview/Submit | |
| Split Step 2 (too many fields) | Break into 2a virtual component + 2b physical dates/ECTS/participants/language | |
| Merge partners into Step 4 | Fold partner universities into Application info step | |
| **You decide** | Claude picks the grouping | ✓ |

**User's choice:** You decide  
**Notes:** Claude chose the 5-step grouping as proposed — logical Erasmus+ field progression. Captured as D-01.

---

### Q2: Auto-save strategy

| Option | Description | Selected |
|--------|-------------|----------|
| **Save on step nav + 1.5s debounce on field blur** | Step-navigation saves + debounced typing saves, Saving… / Saved indicator | ✓ |
| Save on step navigation only | No per-field saves; simpler but risky on idle sessions | |
| Save on field blur only | Every field exit fires a save; chattier with Supabase | |

**User's choice:** Save on step navigation + 1.5s debounce on field blur (Recommended)  
**Notes:** `Saving… / Saved` indicator in wizard header. Captured as D-02.

---

### Q3: Save failure UX

| Option | Description | Selected |
|--------|-------------|----------|
| **Toast error + retry button, draft stays in Zustand store** | User sees "Failed to save — Retry"; no input lost | ✓ |
| Silent retry (3 attempts), then toast | Hides transient failures; shows error only after all retries fail | |
| Block wizard navigation on unsaved changes | Nav disabled while unsaved; frustrating on slow connections | |

**User's choice:** Toast error + retry button, draft stays in Zustand store (Recommended)  
**Notes:** Captured as D-03.

---

### Q4: Two-tab draft conflict UX (SUBM-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Modal: Reload / Overwrite | Non-destructive: user chooses which version wins | |
| Auto-reload from DB silently | Losing tab refreshes automatically; changes lost without warning | |
| **You decide** | Claude picks safest conflict resolution | ✓ |

**User's choice:** You decide  
**Notes:** Claude chose Reload/Overwrite modal — non-destructive, no silent data loss. Captured as D-04.

---

## Onboarding Gate

### Q1: Profile completion requirement

| Option | Description | Selected |
|--------|-------------|----------|
| **Hard gate — redirect to /onboarding until profile complete** | Dashboard + wizard inaccessible until profile done; clean invariant | ✓ |
| Soft gate — interstitial banner on first /dashboard visit | Dashboard accessible immediately; wizard start disabled | |
| No gate — profile fields inline in wizard | Profile data tied to BIP rather than coordinator | |

**User's choice:** Hard gate — redirect to /onboarding until profile is complete (Recommended)  
**Notes:** `(dashboard)` layout checks for complete profile; incomplete → redirect to /onboarding. Captured as D-05.

---

### Q2: Route group for /onboarding

| Option | Description | Selected |
|--------|-------------|----------|
| **Inside (dashboard) route group** | Same auth guard; sits between auth guard and profile-complete guard | ✓ |
| Inside (auth) route group | Treated as registration step 2 | |
| You decide | Claude picks route group placement | |

**User's choice:** Inside (dashboard) route group (Recommended)  
**Notes:** `app/(dashboard)/onboarding/page.tsx`. Captured as D-06.

---

### Q3: Post-verification redirect

| Option | Description | Selected |
|--------|-------------|----------|
| **/onboarding directly** | auth/callback → /onboarding; natural next step | ✓ |
| /dashboard (let guard redirect) | Two redirects; slightly worse UX | |
| /verify-email success page first | "Email verified!" confirmation screen, then Continue to /onboarding | |

**User's choice:** /onboarding directly (Recommended)  
**Notes:** auth/callback exchanges PKCE code → redirects to /onboarding. Captured as D-07.

---

### Q4: University selector on /onboarding

| Option | Description | Selected |
|--------|-------------|----------|
| **Searchable autocomplete from universities table** | Coordinator selects or adds new; populates table for partner autocomplete | ✓ |
| Free-text only | Simpler; universities table not populated by coordinators | |
| You decide | Claude picks the approach | |

**User's choice:** Searchable autocomplete from the universities table (Recommended)  
**Notes:** "Add new university" if not found. Planner must resolve `universities_insert_admin` RLS — either relax to `authenticated` or use service-role in Server Action. Captured as D-08.

---

## Dashboard BIP List

### Q1: Status filter approach

| Option | Description | Selected |
|--------|-------------|----------|
| **Status tabs: All / Draft / Pending / Approved / Rejected** | Tab row with count badges; All default | ✓ |
| Flat list with status badge chips | All BIPs in one list; no filter UI | |
| Grouped sections by status | Collapsible sections per status | |

**User's choice:** Status tabs (Recommended)  
**Notes:** Count badge on each tab. Captured as D-09.

---

### Q2: Per-status card actions

| Option | Description | Selected |
|--------|-------------|----------|
| **Edit on draft + pending; View on approved; View + reason on rejected** | Draft: Edit+Delete; Pending: Edit+Withdraw; Approved: View; Rejected: View+inline reason | ✓ |
| Edit-only on draft; view-only on all others | Contradicts DASH-04 (edit pending) | |
| You decide | Claude picks action set per status | |

**User's choice:** Edit on draft + pending; View on approved; View + reason on rejected (Recommended)  
**Notes:** Withdraw sets status back to draft. Captured as D-10.

---

### Q3: New BIP entry point

| Option | Description | Selected |
|--------|-------------|----------|
| **Prominent button in dashboard header** | Gold/primary `+ Submit a BIP` CTA; always visible | ✓ |
| Empty state only | CTA shown only when no BIPs exist | |
| Floating action button | Persistent FAB bottom-right | |

**User's choice:** Prominent button in the dashboard header (Recommended)  
**Notes:** Always visible regardless of active status tab. Captured as D-11.

---

## Auth Page Chrome

### Q1: Auth page layout

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal centered card — no StickyNav, no Footer | Standard auth-page pattern; clean isolation | |
| Full public layout (StickyNav + Footer) | Shares public shell; unusual for auth flows | |
| **You decide** | Claude picks the standard | ✓ |

**User's choice:** You decide  
**Notes:** Claude chose minimal centered card layout — industry standard, isolates coordinator auth from public browsing. Captured as D-12.

---

### Q2: Auth card background

| Option | Description | Selected |
|--------|-------------|----------|
| Soft #f7f8fc background, white card with shadow | Consistent with Phase 1 card pattern | |
| Dark navy (#0a1735) full-bleed background | Dramatic; matches homepage university CTA section | |
| **You decide** | Claude picks best fit for EU palette | ✓ |

**User's choice:** You decide  
**Notes:** Claude chose soft `#f7f8fc` + white card with `box-shadow: 0 4px 16px rgba(10, 23, 53, 0.06)` — consistent with Phase 1 card pattern. Captured as D-13.

---

### Q3: Coordinator dashboard nav

| Option | Description | Selected |
|--------|-------------|----------|
| **Separate coordinator nav — logo + Dashboard + Sign out** | Distinct from public nav; coordinator context | ✓ |
| Same public StickyNav + Dashboard link when logged in | Reuses component; mixes coordinator + public links | |
| You decide | Claude picks nav pattern | |

**User's choice:** Separate coordinator nav (Recommended)  
**Notes:** `app/(dashboard)/layout.tsx` renders a stripped-down nav; no StickyNav reuse. Captured as D-14.

---

### Q4: Public StickyNav when coordinator is logged in

| Option | Description | Selected |
|--------|-------------|----------|
| **Add Dashboard link + avatar/initials** | Easy escape hatch back to dashboard while browsing | ✓ |
| No change — public nav stays the same | Simpler; no session check in nav component | |
| You decide | Claude picks | |

**User's choice:** Add a 'Dashboard' link + avatar/initials in the public StickyNav (Recommended)  
**Notes:** Requires `StickyNav` to receive session claims from `(public)` layout RSC (preferred over client-side flash). Captured as D-15.

---

## Claude's Discretion

- **D-01 (wizard step grouping):** User said "you decide." Claude chose the 5-step Erasmus+ logical grouping.
- **D-04 (two-tab conflict UX):** User said "you decide." Claude chose Reload/Overwrite modal — non-destructive.
- **D-12 (auth page layout):** User said "you decide." Claude chose minimal centered card.
- **D-13 (auth card background):** User said "you decide." Claude chose `#f7f8fc` soft background + white card — consistent with Phase 1.

## Deferred Ideas

- **"Are you a coordinator? List a BIP" CTA on empty-state filter results** — flagged in Phase 1, now viable since Phase 2 ships `/register`. Consider as Phase 2 polish plan or Phase 3 item.
- **Coordinator invite flow for unregistered partners** (GROW-01) — v2 requirement.
- **Admin "Request changes" action** (GROW-03) — v2 requirement.
- **Edit approved BIPs with re-review trigger** (GROW-04) — v2 requirement.
