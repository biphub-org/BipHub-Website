---
phase: 3
slug: admin-review-emails
status: approved
shadcn_initialized: true
preset: b2fA
created: 2026-05-11
reviewed_at: 2026-05-11
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for Phase 3 admin surfaces and email templates: `(admin)` route group chrome (left sidebar nav), pending queue (`/admin`), review page (`/admin/bips/[id]/review`) with admin-actions panel + approve/reject confirmation modals, all-listings (`/admin/bips`), admin edit (`/admin/bips/[id]/edit` — wizard reused with `mode='admin'`), analytics (`/admin/analytics` — three stat cards), coordinator-facing rejection-reason callout wiring, and three React Email templates (`ApprovalEmail`, `RejectionEmail`, `AdminNotificationEmail`).
>
> **In scope:** admin route group layout, queue card, review-page layout + actions panel, approve/reject modals, all-listings filters + search, admin-edit wizard banner + replaced submit CTA, three stat cards, three email templates, rejection-callout data wiring on coordinator dashboard card.
>
> **Out of scope:** analytics charts (deferred to v2), audit-log timeline UI for coordinators, multi-admin `/admin/users`, Resend webhooks, GDPR consent, Playwright E2E (Phase 4).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui CLI (base-nova style — initialized in Phase 1) |
| Preset | b2fA — same project preset; no re-init needed |
| Component library | shadcn/ui (Radix / Base UI primitives) |
| Icon library | Lucide React (locked — `components.json` `iconLibrary: "lucide"`) |
| Font | Inter (400/600), self-hosted via `next/font/google` — inherited from Phase 1 |

**Already installed shadcn components (Phase 1 + 2 — verified via `components/ui/`):** `accordion`, `alert`, `badge`, `button`, `calendar`, `checkbox`, `command`, `dialog`, `drawer`, `form`, `input`, `input-group`, `label`, `popover`, `select`, `separator`, `sheet`, `skeleton`, `slider`, `sonner`, `switch`, `tabs`, `textarea`.

**New components required in Phase 3 (run `npx shadcn add` before implementing):**

- `dropdown-menu` — row-level quick-action menu on `/admin/bips` listings (Edit / Review / Open public).
- `avatar` — admin avatar in sidebar footer (Lucide fallback if image absent).

No other shadcn primitives required. Modals (approve/reject) use the existing `dialog`. Status filter on `/admin/bips` uses the existing `tabs`. Stat cards on `/admin/analytics` are hand-built using existing tokens.

**New dependencies (planner installs in package.json):**

| Package | Purpose | Version constraint |
|---------|---------|-------------------|
| `resend` | Node SDK for transactional email — called directly inside Server Actions (D-11) | latest stable |
| `react-email` | CLI for local preview (`npx email dev`) of templates | latest stable |
| `@react-email/components` | Typed primitives used inside `.tsx` templates (`<Html>`, `<Body>`, `<Container>`, `<Button>`, etc.) | latest stable |

No third-party shadcn registries declared. Registry safety gate: not triggered.

**Tailwind v4 `@theme` additions for Phase 3:** **None required.** All Phase 3 surfaces compose from existing EU palette + Phase 2 status tokens. The email-template inline styles use the same hex literals as the web UI tokens (React Email runs outside Tailwind — see Email Template Contract below for hex map).

---

## Spacing Scale

Inherited from Phase 1 + 2 — unchanged. The 4-point scale applies to all Phase 3 surfaces.

| Token | Value | Phase 3 Usage |
|-------|-------|---------------|
| xs   | 4px  | Status-badge internal padding, sidebar icon-to-label gap, stat-card delta gap |
| sm   | 8px  | AdminBipCard meta-row gaps, sidebar nav item internal vertical padding (compact), email body inline gap |
| md   | 16px | AdminBipCard internal padding (vertical), admin-actions panel field gap, modal body padding, email content lateral padding |
| lg   | 24px | Review-page main column padding (mobile), sidebar nav item full padding (resting), all-listings table-row vertical padding, stat-card padding |
| xl   | 32px | Admin-actions panel outer padding (desktop), review page two-column gap, email container outer padding |
| 2xl  | 48px | Analytics stat-card grid gap (desktop), empty-state vertical centering offset |
| 3xl  | 64px | Not used in admin surfaces (no marketing-style section breaks; admin is an app shell) |

**Phase 3 exceptions (pre-approved):**

- **Sidebar nav width (desktop, ≥ md / 960px):** **240px** (D-16). Fixed; not collapsible at desktop. Internal padding `px-4 py-6`.
- **Sidebar nav (mobile, < md):** Collapses to a 56px-tall **top bar with a burger button** (Claude's call — drawer is simpler than route-aware sticky variants; opens a shadcn `Sheet` from the left containing the same nav items + sign-out at bottom). No bottom-tab variant.
- **Admin-actions panel width (review page, ≥ lg / 1024px):** 340px right column — mirrors the Phase 1 `BipSidebar` width exactly so the page layout stays balanced when both panels appear side-by-side.
- **AdminBipCard padding:** `p-5` (20px) — slightly **roomier than coordinator DashboardBipCard's `p-5`** but the same density token. (Claude's call: roomy density. AdminBipCard surfaces coordinator-identifying metadata and "submitted X days ago" — a denser card would crowd the secondary info.) No bespoke padding.
- **Modal width (approve / reject confirmation):** `max-w-[480px]` — narrower than the wizard two-tab conflict modal (which is also 480px). Tight, focused decision UI.
- **Modal padding:** `p-6` (24px all sides) — shadcn `DialogContent` default. No override.
- **Stat-card padding:** `p-6` (24px). Grid gap on desktop: `gap-6` (24px). On mobile: stack with `gap-4` (16px).
- **Sticky admin-actions panel:** sticky at `top: 80px` (Claude's call: panel sticks on scroll inside review page — admin is reviewing a long detail page and needs the actions visible without scroll). Falls back to inline at `< lg` (mobile/tablet) where panel renders below `BipBody` in a single column.
- **Sign-out CTA in sidebar:** ghost button (full-width, left-aligned, `text-muted hover:text-ink hover:bg-bg-soft`) (Claude's call: ghost button — more affordance than a plain text link in a denser sidebar context; matches the other nav-item visual rhythm).

---

## Typography

Phase 3 admin surfaces use 4 text sizes + 1 analytics display size, and 2 text weights + 1 display weight — identical to Phase 2's coordinator scale plus the analytics-only stat-card display token (size `clamp(36px, 4vw, 48px)`, weight 700), inherited from Phase 1's homepage stat-card pattern and restricted to `/admin/analytics` stat-card big numbers. Phase 1 marketing display sizes are NOT used elsewhere in the `(admin)` route group.

| Role | Size | Weight | Line Height | Phase 3 Usage |
|------|------|--------|-------------|---------------|
| Subsection (h3) | 22px | 600 | 1.25 | Page h1 (`Pending review`, `All BIPs`, `Analytics`), modal title, stat-card label heading, review-page admin-actions panel heading |
| Body | 16px | 400 | 1.6 | Modal body copy, AdminBipCard title, stat-card description |
| Body-sm / Form label | 14px | 400 or 600 | 1.5 | AdminBipCard meta rows, sidebar nav item label (600), button text, "Submitted X days ago" timestamp, action panel field labels (600), reject-reason char counter |
| Pill/Badge | 11px | 600 | 1.4 | Status badge on AdminBipCard + all-listings rows, coordinator role chip, "Demo data" pill (inherited) |

**Stat-card big number (analytics only):**
- Size: `clamp(36px, 4vw, 48px)` (Claude's call: smaller than Phase 1's homepage 44px stat numbers — admin analytics is functional, not hero-marketing).
- Weight: 700.
- Line height: 1.1.
- Tracking: `-0.5px`.
- Color: `text-ink`.

**Sidebar nav item active state:** 14px / 600 / `text-eu-blue` + `bg-eu-blue-50` background. Resting: 14px / 400 / `text-ink-2`. Hover: 14px / 400 / `text-ink` + `bg-bg-soft`.

**Admin-actions panel heading:** h3 role at 22px / 600 / -0.3px tracking. Single instance ("Admin actions"). 16px below: the two action buttons stacked, full-width.

---

## Color

EU palette + Phase 2 status tokens are fully inherited. **No new tokens introduced.**

| Role | Value | Phase 3 Usage |
|------|-------|---------------|
| Dominant (60%) | `#ffffff` / `#f7f8fc` (`--bg` / `--bg-soft`) | Sidebar surface (`#ffffff`), main content area background (`#f7f8fc`), modal surface (`#ffffff`), stat-card surface (`#ffffff`), AdminBipCard surface (`#ffffff`), email body background (`#f7f8fc`) |
| Secondary (30%) | `#0a1735` (`--ink`) / `#2c3658` (`--ink-2`) for text; `#003399` (`--eu-blue`) for interactive | All body + heading text; sidebar active-state highlight (`--eu-blue` + `--eu-blue-50`); primary CTA fill; review-page links; email CTA fill |
| Accent (10%) | `#FFCC00` (`--eu-gold`) + `#003399` (`--eu-blue`) | Reserved-for list below |
| Destructive | `#dc2626` (`--status-rejected`) | Reject button fill + reject confirmation modal confirm action; "Un-approve" action on approved BIPs in admin all-listings; email rejection-reason callout border (gold, not red — see note) |
| Status: Draft / Pending / Approved / Rejected | Phase 2 status tokens | AdminBipCard status pill, all-listings status pill, status filter tabs count badges |

### Accent reserved for (Phase 3 — extends Phase 1 + 2 lists):

EU **gold** (`#FFCC00`) — Phase 3 adds:

1. **Approve confirmation modal — primary confirm button** (`bg-eu-gold text-ink hover:bg-eu-gold-dark rounded-pill`). This is the one "positive" admin action; gold (not blue) marks it as the celebratory outcome — aligns with the existing Phase 2 wizard "Submit for review →" gold CTA.
2. **Stat-card icon square** (analytics): 40px square `bg-eu-gold-soft text-eu-gold-dark rounded-md` — matches the Phase 1 stat-card icon pattern from the homepage but at a smaller scale.
3. **Email rejection-reason callout border** (`RejectionEmail` template only): 4px gold left border on the reason block — frames it as "important info from BipHub", consistent with the coordinator dashboard rejection callout from Phase 2.

EU **blue** (`#003399`) — Phase 3 adds:

1. **Sidebar nav active state:** `bg-eu-blue-50 text-eu-blue` on the active nav item.
2. **Review-page admin-actions panel heading underline:** none — panel uses the same `border border-border` card chrome; heading is `text-ink`, only the action buttons fill blue.
3. **Primary Server Action buttons** (across admin surfaces — e.g., All-listings "Edit"): inherit Phase 1 `Button` `default` variant — `bg-eu-blue text-white rounded-pill`.
4. **Email CTA fill** (all three templates): `#003399` background, `#ffffff` text — primary CTA fills only; secondary links use `#003399` underlined.
5. **Coordinator dashboard rejection-reason callout** (Phase 2 surface, data-wired in Phase 3): retains the gold border from Phase 2 — no color change. Phase 3 only wires the data source (latest `bip_status_history` row `to_status='rejected'`).

### Destructive — Phase 3 specifically:

- **Reject confirmation modal — confirm button:** `bg-status-rejected text-white hover:bg-red-700 rounded-pill` — red because rejecting is a hard, coordinator-impacting decision. Mirrors Phase 2 delete-draft confirm pattern.
- **Reject button (on review page admin-actions panel, before modal opens):** Ghost outline variant — `border border-status-rejected text-status-rejected hover:bg-red-50 rounded-pill`. The full red-fill is reserved for the modal confirm step (gives the admin one chance to back out).
- **"Un-approve" on approved BIPs in `/admin/bips` row quick-actions:** menu item with red text — `text-status-rejected`. Confirms via the same Reject modal (D-06 supports `approved → rejected`).

### Contrast verification (WCAG AA, Phase 3 net-new):

- White text on `#003399` (eu-blue) email CTA: 8.6:1 ✓ (well above AA)
- White text on `#FFCC00` (eu-gold) approve button: **2.0:1 — FAIL**. Mitigation: `text-ink` (`#0a1735`) on gold = 14.2:1 ✓. **Locked: gold buttons always use `text-ink`, never `text-white`.** (Same rule as Phase 1 + 2.)
- `text-eu-blue` on `bg-eu-blue-50` (`#003399` on `#eef2fb`) — sidebar active state: 10.2:1 ✓
- White text on `#dc2626` (reject modal confirm): 5.1:1 ✓
- `text-status-rejected` (`#dc2626`) on `bg-white` (review-panel reject ghost button): 5.1:1 ✓

---

## `(admin)` Sidebar Chrome Contract (D-16)

The `(admin)` route group layout renders its own left-sidebar nav, distinct from public `StickyNav` and coordinator `DashboardNav`.

### Desktop (≥ md / 960px)

- **Width:** 240px (D-16). Fixed `position: sticky; top: 0; height: 100vh`. `bg-white border-r border-border`.
- **Internal padding:** `px-4 py-6`.
- **Layout (top to bottom):**
  1. **Logo block** (top, links to `/`): `<LogoMark>` (32px) + `BipHub` wordmark + `text-xs text-muted ml-1` label `Admin`. Total height ~48px. 24px gap below.
  2. **Nav items** (vertical list, 4px gap between items): three links — `Queue` (`/admin`) / `All BIPs` (`/admin/bips`) / `Analytics` (`/admin/analytics`). Each item: full-width row, `px-3 py-2 rounded-md`, Lucide icon (20px) + label (14px / 400). Active state per D-16 typography.
  3. **Spacer** (`flex-1`).
  4. **Admin identity block** (bottom, just above sign-out): 32px shadcn `Avatar` (initials fallback `bg-eu-blue-50 text-eu-blue`) + name (`text-sm text-ink truncate`) + email (`text-xs text-muted truncate`). 12px gap below.
  5. **Sign-out button:** ghost button, full-width, left-aligned, Lucide `LogOut` icon (16px) + `Sign out` (14px / 400). `text-muted hover:text-ink hover:bg-bg-soft rounded-md`. Implemented as `<form action={signOutAction}>` (same Server Action as `DashboardNav`).

### Mobile (< md / 960px)

- Sidebar **collapses to a 56px-tall top bar** (Claude's call: drawer pattern is the simplest cross-route option).
- Top bar: `bg-white border-b border-border h-14 flex items-center justify-between px-4`.
  - Left: Lucide `Menu` icon button (`size="icon"` variant — 40px square tap target). Opens shadcn `Sheet` from the left containing the full sidebar contents.
  - Center: `<LogoMark>` (24px) + `BipHub Admin` (14px / 600 / ink).
  - Right: 32px Avatar (initials only — no name + email; surfaced inside the drawer).
- Drawer (`Sheet`): 280px wide, slides from left. Contains the same nav items + identity block + sign-out button as desktop. Closing icon top-right.

### Cross-route behavior

- The sidebar **does NOT replace** the public StickyNav or coordinator DashboardNav. It only renders when the user is inside `app/(admin)/`. Public pages still show StickyNav (with session-aware admin link — see below).
- **Public StickyNav for admins:** When a logged-in admin visits the public site, the StickyNav right-side slot shows `Admin` text link (14px / 600 / `text-eu-blue` — replaces the coordinator's `Dashboard` link) + initials avatar. The `(public)/layout.tsx` already fetches `getClaims()` (Phase 2 D-15); Phase 3 extends the conditional to check `claims.app_metadata.role === 'admin'`.

---

## Pending Queue Contract (`/admin`)

### Layout

- **Page header:** Full-width row inside the admin main content area. `bg-white border-b border-border px-6 py-5`.
  - Left: h3 `Pending review` (22px / 600 / ink) + sub-line `{n} BIPs awaiting review` (14px / 400 / muted). If `n === 0`: `You're all caught up`.
  - Right: none (no "+ new" or filter controls — queue is FIFO; admin doesn't sort or filter the queue itself, only the all-listings view).
- **Queue list:** Vertical stack of `<AdminBipCard>` items inside the main content area. Container `max-w-[1200px] mx-auto px-6 py-6`. Cards stacked with `gap-4` (16px).
- **Pagination:** None in v1. Phase 3 ships with FIFO + no sort + no pagination (queue grows beyond ~20 only at high coordinator volume; revisit if real-world queue depth becomes a problem).
- **Empty state (no pending BIPs):** Centered within main content area, `py-24 px-8`:
  - Icon: Lucide `Inbox` (Claude's call — clean inbox metaphor; no illustration library introduced for one empty state).
  - Icon styling: 48px, `text-muted`, inside a 96px `bg-bg-soft rounded-full` circle (matches Phase 1 EuropeMap empty-region rendering pattern).
  - Heading: `No pending BIPs` (22px / 600 / ink).
  - Body: `You're all caught up. New submissions will appear here automatically.` (16px / 400 / muted, `max-w-md mx-auto text-center`).
  - No CTA — admin's next action is to navigate via the sidebar.

### `<AdminBipCard>`

A list-row card built fresh — does NOT extend `DashboardBipCard` (different metadata, different actions; cleaner to keep them separate).

- **Container:** `bg-white border border-border rounded-md p-5 shadow-sm hover:border-border-strong hover:shadow-md transition`.
- **Layout (desktop ≥ md):** Single row, 3 visual columns.
  - **Column 1 (flex-1):** Title (16px / 600 / ink, truncate) + below it `coordinator full name · university name` (14px / 400 / muted, truncate). Below that, a 4-item meta row (8px gap, wraps on narrow widths): host city · physical dates (`9 Jun – 14 Jun 2026` — Phase 2 date format) · `Submitted X days ago` (relative time, e.g. `Submitted 3 days ago`).
  - **Column 2 (auto width):** Status pill — `Pending` (Phase 2 status token, but on this card always renders pending; the pill is still rendered for visual rhythm with the all-listings view).
  - **Column 3 (auto width):** Single `Review →` button — `Button` `default` variant — `bg-eu-blue text-white rounded-pill px-4 py-2`. Clicking navigates to `/admin/bips/[id]/review`.
- **Layout (mobile < md):** Stack column 1 → 2 → 3 vertically. `Review →` becomes a full-width button at the bottom of the card.
- **No bookmark heart, no `is_seed` pill, no public-page link** on admin queue cards — the admin context is reviewing, not browsing.
- **Hover:** `border-border-strong shadow-md` — slightly lifts, no translateY (matches `DashboardBipCard` Phase 2 hover; the queue is a list-management surface).

---

## Review Page Contract (`/admin/bips/[id]/review`)

This is the central admin surface. It reuses Phase 1 `BipBody` + `BipSidebar` for content rendering, and adds an admin-actions panel.

### Page layout

- **Page header:** Same chrome as Pending Queue header. h3 `Review BIP` (22px / 600 / ink). Sub-line: `Submitted by {coordinator name} · {university name} · {X days ago}` (14px / 400 / muted).
- **Above the BIP content (banner row):** 32px height row with three controls:
  - Left: `← Back to queue` text link (14px / `text-eu-blue` hover underline).
  - Center: empty.
  - Right: `Auto-advance` toggle indicator — text-only (14px / muted) reading `Next pending: {title}` if more pending BIPs exist; or `No more pending after this one` if this is the last. Informational only (no toggle to disable auto-advance in v1 — D-05).
- **Main content area:** `max-w-[1200px] mx-auto px-6 py-6`. Two-column grid on `≥ lg`: `grid-cols-[minmax(0,1fr)_340px] gap-x-8`.
- **Left column:** Phase 1 `<BipBody>` rendered against the BIP being reviewed (RSC fetches via `getAdminBipById(id)`). Identical visual to `/bip/[slug]` so the admin sees exactly what students will see post-approval.
- **Right column:** Two sticky-positioned panels stacked, 16px gap:
  1. Phase 1 `<BipSidebar>` — deadline countdown, key facts (no Apply CTA in admin review context: the sidebar is read-only here; the Apply CTA from Phase 1's `BipApplyCta` is **suppressed** via a `mode='admin-review'` prop on `BipSidebar`).
  2. **Admin-actions panel** (see below).
- **Mobile/tablet (< lg):** Single column. `BipBody` first, then `BipSidebar` (Apply CTA still suppressed), then admin-actions panel inline (NOT sticky — full-width card at the page bottom). Same component, different layout.

### Admin-actions panel

- **Container:** `bg-white border border-border rounded-md p-6 shadow-sm sticky top-20` (sticky on `≥ lg` only).
- **Heading:** h3 `Admin actions` (22px / 600 / ink). 16px below.
- **Two buttons, stacked, full-width, 12px gap between them:**
  1. **Approve button:** `Button` variant `default` styled as gold pill — `bg-eu-gold text-ink hover:bg-eu-gold-dark rounded-pill px-5 py-3 font-semibold`. Label: `Approve BIP`. Lucide `Check` icon (16px) on left.
  2. **Reject button:** Ghost outline destructive — `border border-status-rejected text-status-rejected bg-white hover:bg-red-50 rounded-pill px-5 py-3 font-semibold`. Label: `Reject BIP`. Lucide `X` icon (16px) on left.
- **Below buttons (16px gap):** Helper text (14px / 400 / muted) — `Approving publishes the BIP. Rejecting returns it to the coordinator with your feedback.` Inside a `bg-bg-soft rounded-sm px-3 py-2` block.
- **Clicking either button opens the matching confirmation modal (D-04).** No inline form expansion; the modal is the single decision point.
- **Auto-advance hint** (small text at bottom of panel): `After this action you'll be taken to the next pending BIP.` (14px / 400 / muted) — only shown when `nextPendingId !== null`.

---

## Approve Confirmation Modal (D-04)

shadcn `Dialog`. Triggered by Approve button on the admin-actions panel.

- **Width:** `max-w-[480px]`.
- **Title:** `Approve BIP` (22px / 600 / ink).
- **Body (16px / 400 / ink, 16px gap between elements):**
  1. Description line: `You're about to approve:` (14px / 400 / muted).
  2. **BIP title verbatim** (16px / 600 / ink, inside a `bg-bg-soft border-l-4 border-eu-blue rounded-r px-4 py-3` block) — title is shown unmodified per D-04.
  3. **Note textarea (optional):** Label `Note for the coordinator (optional)` (14px / 600). shadcn `<Textarea>`, 3 rows. Placeholder: `Add a short congratulatory note or context (e.g. "Great work — looking forward to seeing the outcomes.")`. Character counter below: `{n}/500 characters`. Max 500 chars enforced via Zod.
  4. Helper text below textarea (14px / 400 / muted): `If set, this note will appear in the approval email under "Note from the BipHub team."`
- **Buttons (right-aligned, side-by-side, 12px gap):**
  - **Cancel:** ghost button — `Cancel` (14px / 400). Closes modal without action.
  - **Confirm:** `Approve BIP` (gold pill — `bg-eu-gold text-ink hover:bg-eu-gold-dark rounded-pill px-5 py-2 font-semibold`). Calls `approveBipAction`.
- **Loading state on confirm:** Button disabled + Lucide `Loader2` rotating spinner (16px, `text-ink`). Label changes to `Approving…`.
- **Success:** Modal closes → Sonner toast `BIP approved. Email sent to {coordinator name}.` (3s, default variant) → navigate to next pending (or `/admin` if queue empty).
- **Error:** Modal stays open, inline `<Alert variant="destructive">` above the textarea with the error message (e.g., `Failed to approve. Please try again.`). Toast NOT used for errors here (inline placement is clearer in a modal context).
- **Escape and overlay-click:** Allowed (the approve action is non-destructive in v1; if admin changes mind they can re-trigger).

---

## Reject Confirmation Modal (D-04)

shadcn `Dialog`. Triggered by Reject button on the admin-actions panel or "Un-approve" action on `/admin/bips`.

- **Width:** `max-w-[480px]`.
- **Title:** `Reject BIP` (22px / 600 / ink).
- **Body (16px / 400 / ink, 16px gap between elements):**
  1. Description line: `You're about to reject:` (14px / 400 / muted).
  2. **BIP title verbatim** (16px / 600 / ink, inside a `bg-bg-soft border-l-4 border-status-rejected rounded-r px-4 py-3` block).
  3. **Reason textarea (required):** Label `Reason (required, shown to the coordinator)` (14px / 600). shadcn `<Textarea>`, 4 rows. Placeholder: `Explain what needs to change before this BIP can be approved. Be specific — the coordinator will see this verbatim and use it to revise their submission.`. Character counter below: `{n}/1000 characters`. Min 10 / max 1000 enforced via Zod.
  4. Validation message (only shown when reason length < 10 and user has interacted): `Reason must be at least 10 characters. Coordinators need actionable feedback.` (14px / `text-status-rejected` / 400, with `role="alert"`).
  5. Helper text below textarea (14px / 400 / muted): `This reason will be included in the rejection email and shown on the coordinator's dashboard.`
- **Buttons (right-aligned, side-by-side, 12px gap):**
  - **Cancel:** ghost button — `Cancel` (14px / 400). Closes modal.
  - **Confirm:** `Reject BIP` — `bg-status-rejected text-white hover:bg-red-700 rounded-pill px-5 py-2 font-semibold`. Disabled until `reason.length >= 10`. Calls `rejectBipAction`.
- **Loading state on confirm:** Button disabled + Lucide `Loader2` rotating spinner. Label changes to `Rejecting…`.
- **Success:** Modal closes → Sonner toast `BIP rejected. Email sent to {coordinator name}.` (3s, default variant) → auto-advance.
- **Error:** Same inline `<Alert variant="destructive">` pattern as approve modal.
- **Escape and overlay-click:** Allowed (no destructive enough to require force-confirm — the reject is reversible by coordinator edit + resubmit).

---

## All-Listings Contract (`/admin/bips`) (D-19)

A dedicated admin page — NOT a fork of `/bips`. Same query patterns as `lib/queries/bips.ts` but admin RLS context.

### Layout

- **Page header:** Same chrome as Pending Queue header. h3 `All BIPs` (22px / 600 / ink). Sub-line: `{n} BIPs across all statuses` (14px / 400 / muted).
- **Filter + search row** (below header, sticky on scroll): `bg-white border-b border-border px-6 py-3 flex items-center gap-4`.
  - **Status filter** (left): shadcn `Tabs` with five tabs: `All` / `Draft` / `Pending` / `Approved` / `Rejected`. Each tab same style as Phase 2 dashboard tabs (14px / 400 active = 14px / 600 / `text-ink` with `border-b-2 border-eu-blue`). Count badge per tab using the existing `STATUS_BADGE_CLASSES` lookup (just the bg+text colors, not the border — applied to a small 11px pill).
  - **Search input** (right, `max-w-[320px] ml-auto`): shadcn `<Input>` with Lucide `Search` icon. Placeholder: `Search by title, description, or university…`. Reuses the FTS `.textSearch('search_vector', q, { type: 'websearch' })` infrastructure from Phase 1 Plan 01-06. Debounced 300ms.
- **Listings:** Vertical stack of admin-listing rows inside `max-w-[1200px] mx-auto px-6 py-6`. Rows stacked with `gap-3` (12px — tighter than queue cards to support visual scanning of larger sets).

### Admin listing row (shared row layout)

A simplified row — denser than `AdminBipCard` because this view is for management at scale, not focused review.

- **Container:** `bg-white border border-border rounded-md px-4 py-3 hover:border-border-strong transition`.
- **Layout (desktop ≥ md):** Single row, 4 visual columns.
  - **Column 1 (flex-1, min-w-0):** Title (14px / 600 / ink, truncate) + sub-line `coordinator name · university name` (12px / 400 / muted, truncate).
  - **Column 2 (auto):** Status pill — `STATUS_BADGE_CLASSES` lookup applied to a small 11px pill (`rounded-full border px-2 py-0.5 text-xs font-semibold`).
  - **Column 3 (auto):** `Updated {date}` (12px / 400 / muted).
  - **Column 4 (auto):** Row quick-action menu — shadcn `<DropdownMenu>` triggered by a Lucide `MoreHorizontal` icon button (`Button` variant `ghost` `size="icon"`). Menu items vary by status:
    - **Draft:** `Edit` (links to `/admin/bips/[id]/edit`)
    - **Pending:** `Review` (links to `/admin/bips/[id]/review`) + `Edit` (links to `/admin/bips/[id]/edit`)
    - **Approved:** `Edit` + `View public page →` (opens `/bip/[slug]` new tab) + `Un-approve` (red, `text-status-rejected` — opens the Reject modal seeded with the BIP)
    - **Rejected:** `Edit` (admin can adjust even rejected entries)
- **Layout (mobile < md):** Stack column 1 → 2 + 3 (on one row, justify-between) → 4 (full-width text button at row bottom instead of dropdown).
- **Empty state (no BIPs match current tab + search):** Centered, `py-16 px-8` — Lucide `SearchX` icon (32px, muted), heading `No BIPs match these filters` (16px / 600), body `Try clearing the search or switching to a different status.` (14px / 400 / muted). CTA: `Clear search` ghost text-button (only shown if search query is non-empty).

---

## Admin Edit Contract (`/admin/bips/[id]/edit`) (D-17)

Reuses Phase 2 `BipSubmissionWizard` with a new `mode: 'coordinator' | 'admin'` prop.

### Visual differences from coordinator wizard

- **Wizard page background:** Same `bg-bg-soft` as coordinator mode. No change.
- **Wizard card container:** Same `bg-white rounded-lg shadow-md w-full max-w-[760px] mx-auto my-8`. No change.
- **Persistent banner (NEW — replaces the Phase 2 wizard header sub-line):** Above the wizard card, a 48px banner row:
  - `bg-eu-blue-50 border border-eu-blue-100 rounded-md px-4 py-3 mx-auto mb-4 max-w-[760px] flex items-center gap-3`
  - Lucide `Shield` icon (20px, `text-eu-blue`)
  - Text (14px / 600 / `text-eu-blue`): **`Editing as admin — coordinator will not be notified.`** (verbatim from D-17 — no edits permitted to this copy).
- **Wizard header:** Same as coordinator mode except the step counter sub-line reads `Editing BIP "{title}"` (14px / 400 / muted) instead of `Submit a new BIP`. The save-status indicator is in the same position but reads `Auto-saved` instead of `Saved` (subtle copy distinction to reinforce admin-edit-as-trusted).
- **Wizard footer on Step 5 — REPLACED admin-actions panel:** The Phase 2 "Submit for review →" gold CTA is replaced by the same two-button admin-actions panel from the review page (Approve / Reject), positioned in the footer in full-width side-by-side layout — **plus** a third "Save changes" button (Claude's call: keeps the in-flight wizard pattern; admin can save the edit without changing status, which matches D-18 "admin edit does NOT change status").
  - Layout (full-width row, 3 buttons): `[Save changes (ghost)] [Reject BIP (destructive outline)] [Approve BIP (gold)]`
  - **Save changes** ghost: `bg-bg-soft text-ink rounded-pill px-5 py-3`. Triggers `adminUpdateBipAction` — writes the wizard data + a `bip_status_history` row with `action_kind='admin_edit'` and a short diff in `note`. Does NOT change status. On success: Sonner `Changes saved. {N} fields updated.` + redirect to `/admin/bips`.
  - **Reject BIP**: same as the review-page reject button. Opens the Reject modal.
  - **Approve BIP**: same as the review-page approve button. Only enabled if current status is `pending` (admin cannot approve a BIP that's already approved or rejected from this surface — they'd have to first un-approve / save as draft and resubmit).
- **Steps 1–4 footers:** Identical to coordinator mode (`Save & continue →`) — admin uses the same step-by-step navigation. The action-buttons row only appears on Step 5.
- **No "submitted X days ago" banner, no rejection-reason rendering inside admin wizard:** The wizard is a pure editor in admin mode. Status context is on the all-listings page and the review page; the wizard is "in the data."

### Two-tab conflict modal in admin mode

- Same shadcn Dialog as Phase 2 D-04, same `Reload to get latest` / `Overwrite with this version` buttons. Same copy. Same behavior. Phase 3 adds no admin-specific variant.

---

## Analytics Contract (`/admin/analytics`) (D-20)

### Layout

- **Page header:** Same chrome as Pending Queue. h3 `Analytics` (22px / 600 / ink). Sub-line: `Updated every 5 minutes` (14px / 400 / muted) — reflects `export const revalidate = 300` per D-20.
- **Stat-card grid:** `max-w-[1200px] mx-auto px-6 py-8`. Grid layout: `grid grid-cols-1 md:grid-cols-3 gap-6`. Three cards, equal width on desktop.
- **No charts. No "view details" buttons. No filter controls.** v1 ships exactly three stat cards (D-20).

### Stat-card pattern (shared)

- **Container:** `bg-white border border-border rounded-md p-6 shadow-sm`.
- **Layout (top to bottom):**
  1. **Icon square** (40px, top-left): `bg-eu-gold-soft rounded-md flex items-center justify-center`, Lucide icon (20px, `text-eu-gold-dark`). 16px gap below.
  2. **Label** (small heading): 14px / 600 / `text-ink-2` / uppercase letter-spacing `0.5px` (eyebrow-light). E.g., `TOTAL BIPS`. 8px gap below.
  3. **Big number:** `clamp(36px, 4vw, 48px)` / 700 / `text-ink` / line-height 1.1.
  4. **Description** (small text, top-aligned with the number on mobile / new line on desktop): 14px / 400 / muted. E.g., `Real submissions (seed data excluded).`

### The three cards (locked content per D-20 + Specific Ideas)

| Card | Label | Icon | Big number source | Description |
|------|-------|------|-------------------|-------------|
| 1 | `TOTAL BIPS` | Lucide `Database` | `count(bips)` where `is_seed = false` | `Real submissions (seed data excluded).` |
| 2 | `SUBMISSIONS THIS MONTH` | Lucide `TrendingUp` | `count(bip_status_history)` where `action_kind = 'submit'` AND `created_at >= date_trunc('month', now())` | `New submissions since the start of {current month name}.` |
| 3 | `TOP 5 COUNTRIES` | Lucide `Globe` | A small vertical list (not a single number — special card variant) | `Most BIPs by host country.` |

### Top 5 Countries card variant

This card breaks the single-number pattern. Layout:

- Icon square + label (same as above).
- Replaces big number with a **vertical list of 5 rows**, 8px gap between rows. Each row: `{rank}. {country flag emoji} {country name}` (14px / 600 / ink, left-aligned) + `{count} BIPs` (14px / 400 / muted, right-aligned). Country flag emoji from `lib/countries.ts` (already exists from Phase 1 Plan 01-02).
- If fewer than 5 countries have BIPs: render only the available rows. No empty rows or placeholder.
- If zero BIPs at all: replace list with `No BIPs yet` (14px / 400 / muted).

### Empty state (entire analytics page)

- Pre-launch (no real BIPs yet): show all three cards with `0` values. Card 3 shows the `No BIPs yet` row. No global empty state — the cards are self-explanatory at zero.

---

## Coordinator Dashboard — Rejection Reason Wiring (Phase 3 surface)

Phase 2's `DashboardBipCard` already renders a rejection-reason callout (currently using placeholder data per the Phase 2 code review). Phase 3 wires the real data source per D-09.

### Visual: unchanged from Phase 2

- The callout in `DashboardBipCard` (rejected status only) stays exactly as built in Phase 2:
  - `border-l-4 border-eu-gold pl-3 py-1 bg-eu-gold/5 rounded-r-sm` container
  - `Reason: ` (14px / 600 / ink-2) + reason text (14px / 400 / ink-2)
- **No CSS / token changes. No copy changes.** Phase 3 only changes the data source.

### Data wiring (planner spec)

- New query `getLatestRejection(bipId): { reason: string, created_at: string } | null` in `lib/queries/bipStatusHistory.ts`.
  - Query: SELECT `note, created_at` FROM `bip_status_history` WHERE `bip_id = $1` AND `to_status = 'rejected'` ORDER BY `created_at` DESC LIMIT 1.
  - Coordinator RLS already permits this (D-08).
- `getCoordinatorBips()` (Phase 2 query) augmented with a left join / sub-select to pull `latest_rejection_reason` per BIP. The augmented `CoordinatorBip` type adds `rejection_reason: string | null` (Phase 2 already has this field in the type — Phase 3 just populates it from the audit log instead of returning placeholder).
- Card behavior:
  - `bip.status === 'rejected' && bip.rejection_reason` → show callout with real reason.
  - `bip.status === 'rejected' && !bip.rejection_reason` (legacy data, shouldn't occur post-Phase-3 but defensive): show callout with fallback copy `This BIP was rejected. The admin team will provide a reason in a future update.` — keeps Phase 2's defensive fallback intact.

---

## Email Template Visual Contract (D-12, D-13, D-14)

Three React Email templates in `lib/email/templates/*.tsx`. Each is a single `.tsx` file exporting a function component that returns a complete email document.

### Template style (Claude's call): **brand-aligned, NOT minimal text-first**

- Reasoning: the web UI is highly brand-aligned (EU palette, distinctive eyebrow + gold accents, pill buttons). A minimal text-only email would feel disconnected from the BipHub product. The brand-aligned email is recognized as "from BipHub" before reading the subject. Critically, brand styling is restrained — no images, no hero banners, no gradient backgrounds — to maximize inbox client compatibility (Gmail, Outlook, Apple Mail all render React Email's table-based layout reliably).

### Shared email design tokens (verbatim — used inline in all templates)

React Email runs outside Tailwind. Inline styles use these hex literals (sourced from Phase 1 `globals.css`):

```typescript
// lib/email/tokens.ts
export const EMAIL_TOKENS = {
  // Colors
  euBlue: '#003399',
  euBlueDark: '#002270',
  euGold: '#FFCC00',
  euGoldSoft: '#fff4cc',
  ink: '#0a1735',
  ink2: '#2c3658',
  muted: '#6b7390',
  border: '#e5e8f0',
  bgSoft: '#f7f8fc',
  white: '#ffffff',

  // Spacing
  pad: '24px',       // outer container padding
  gap: '16px',       // between blocks
  smallGap: '8px',   // inline

  // Type
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  bodySize: '16px',
  bodyLineHeight: '1.6',
  smallSize: '14px',
  smallLineHeight: '1.5',
  headingSize: '22px',
  headingWeight: 700,
  bodyWeight: 400,
  semiboldWeight: 600,

  // Radii
  borderRadius: '6px',
  pillRadius: '999px',
} as const
```

> **Note:** Inter is NOT used in email templates — system font stack (`-apple-system, ...`) renders correctly across all major inbox clients without web-font loading. The brand reads through color + layout, not font.

### Shared email layout (skeleton — applied identically across all three templates)

```
+============================================================+
| {Email body background: #f7f8fc, fontFamily, lineHeight}   |
|                                                            |
|   +======================================================+ |
|   | {Container: max-width 600px, mx auto, bg white,      | |
|   |  border 1px solid #e5e8f0, borderRadius 6px,         | |
|   |  padding 32px}                                       | |
|   |                                                      | |
|   |   {Header row}                                       | |
|   |   - BipHub wordmark (text-only "BipHub" 22px,        | |
|   |     weight 700, color #003399, no logo image)        | |
|   |   - Eyebrow chip below: e.g. "BIP UPDATE" — 11px,    | |
|   |     uppercase, letter-spacing 1px, color #003399     | |
|   |                                                      | |
|   |   {16px gap}                                         | |
|   |                                                      | |
|   |   {h1: 22px / 700 / ink — email subject reflected}   | |
|   |                                                      | |
|   |   {16px gap}                                         | |
|   |                                                      | |
|   |   {Body paragraphs: 16px / 400 / ink / lh 1.6}       | |
|   |                                                      | |
|   |   {Optional callout / note block — see per-template} | |
|   |                                                      | |
|   |   {24px gap}                                         | |
|   |                                                      | |
|   |   {Primary CTA button}                               | |
|   |   - Anchor styled as: bg #003399, color white,       | |
|   |     padding 12px 24px, borderRadius 999px,           | |
|   |     fontWeight 600, fontSize 14px, no underline      | |
|   |                                                      | |
|   |   {16px gap}                                         | |
|   |                                                      | |
|   |   {Secondary link (optional, no button styling)}     | |
|   |   - color #003399, fontSize 14px, underlined         | |
|   |                                                      | |
|   |   {32px gap}                                         | |
|   |                                                      | |
|   |   {Divider: 1px border-top #e5e8f0}                  | |
|   |                                                      | |
|   |   {16px gap}                                         | |
|   |                                                      | |
|   |   {Footer block: 12px / 400 / muted #6b7390}         | |
|   |   - "You're receiving this because…" context line    | |
|   |   - "Independent project — not affiliated with the   | |
|   |      European Commission." (INFO-03)                  | |
|   |   - {linkBase}/bip-hub.eu link                        | |
|   |                                                      | |
|   +======================================================+ |
|                                                            |
+============================================================+
```

### `ApprovalEmail.tsx`

| Field | Value |
|-------|-------|
| Subject | `Your BIP is live on BipHub` (D-14 — verbatim) |
| From | `BipHub <noreply@biphub.eu>` (D-13) |
| Reply-To | `process.env.ADMIN_REPLY_TO_EMAIL` or `noreply@biphub.eu` |
| Recipient | Coordinator's `profiles.contact_email` |
| Eyebrow | `BIP APPROVED` (11px uppercase, letter-spacing 1px, color `#003399`) |
| h1 | `Your BIP is live` |
| Body para 1 | `Hi {coordinator first name},` |
| Body para 2 | `Your BIP "{title}" has been approved by the BipHub team and is now visible on the public catalog. Students can discover it right away.` |
| **Optional note block** (only if admin provided a note in approve modal) | `bg #fff4cc (eu-gold-soft), border-left 4px solid #FFCC00, padding 16px, borderRadius 0 4px 4px 0`. Heading line: `Note from the BipHub team` (14px / 600 / ink). Body: the admin's note verbatim (14px / 400 / ink-2 / lh 1.5). |
| Primary CTA | `View your BIP →` button — links to `https://biphub.eu/bip/{slug}` |
| Secondary link | `Go to dashboard` — links to `https://biphub.eu/dashboard` |
| Footer context | `You're receiving this email because you submitted a BIP to BipHub.` |

### `RejectionEmail.tsx`

| Field | Value |
|-------|-------|
| Subject | `Update needed on your BIP submission` (D-14 — verbatim) |
| From | `BipHub <noreply@biphub.eu>` |
| Reply-To | `process.env.ADMIN_REPLY_TO_EMAIL` or `noreply@biphub.eu` |
| Recipient | Coordinator's `profiles.contact_email` |
| Eyebrow | `ACTION NEEDED` (11px uppercase, letter-spacing 1px, color `#003399`) |
| h1 | `Your BIP needs a few changes` |
| Body para 1 | `Hi {coordinator first name},` |
| Body para 2 | `Thanks for submitting "{title}" to BipHub. Before we can publish it, we need a few changes.` |
| **Required reason block** | `bg #fff4cc (eu-gold-soft), border-left 4px solid #FFCC00, padding 16px, borderRadius 0 4px 4px 0`. Heading line: `What needs to change` (14px / 600 / ink). Body: the rejection reason verbatim from `bip_status_history.note` (14px / 400 / ink-2 / lh 1.5 / `white-space: pre-wrap` so coordinator newlines render). |
| Body para 3 | `Once you've made the updates, you can resubmit your BIP for review. We're here to help if you need anything.` |
| Primary CTA | `Edit and resubmit →` button — links to `https://biphub.eu/dashboard/bips/{id}/edit` |
| Secondary link | `Reply to this email if you have questions` — `mailto:{Reply-To}?subject=Re: Your BIP submission` (only shown if `ADMIN_REPLY_TO_EMAIL` env is set and ≠ `noreply@biphub.eu`) |
| Footer context | `You're receiving this email because you submitted a BIP to BipHub.` |

> **Note on callout color:** The rejection callout uses gold (not red). Reasoning: red signals "failure / error" — but rejection in BipHub is "needs revision, please resubmit," a constructive editorial outcome. Gold matches the coordinator dashboard's rejection callout (Phase 2 D-10 / `DashboardBipCard`) — visual consistency across surfaces.

### `AdminNotificationEmail.tsx`

| Field | Value |
|-------|-------|
| Subject | `New BIP pending review: {title}` (D-14 — verbatim, `{title}` interpolated) |
| From | `BipHub <noreply@biphub.eu>` |
| Reply-To | `noreply@biphub.eu` (no reply expected) |
| Recipient | `process.env.ADMIN_NOTIFICATION_EMAIL` (v1: single admin per "Specifics") |
| Eyebrow | `PENDING REVIEW` (11px uppercase, letter-spacing 1px, color `#003399`) |
| h1 | `New BIP awaiting your review` |
| Body para 1 | `A new BIP has been submitted to BipHub and is waiting for review.` |
| **Submission details block** | Plain bordered box: `border 1px solid #e5e8f0, padding 16px, borderRadius 4px, bg #f7f8fc`. Three label/value rows (label 14px / 600 / ink-2; value 14px / 400 / ink): `Title: {title}` · `Coordinator: {full name} ({university name})` · `Submitted: {formatted timestamp, e.g. 11 May 2026, 14:32 UTC}` |
| Primary CTA | `Review this BIP →` — links to `https://biphub.eu/admin/bips/{id}/review` |
| Secondary link | `Open queue` — links to `https://biphub.eu/admin` |
| Footer context | `You're receiving this email because you're a BipHub admin.` |

### Email template implementation notes

- **No tracking pixels.** No `<img>` for branding (text-only "BipHub" wordmark suffices). Avoids the cookie/privacy entanglement; aligns with the FOUN-05 GDPR posture (Phase 4).
- **Plain-text alternative:** React Email's `render(..., { plainText: true })` auto-generates the plain-text version. Resend sends both. No separate template authoring needed.
- **Local preview:** `npx email dev` runs at `localhost:3000/preview` and lists all three templates with sample props. Planner should include a default `previewProps` export on each template.
- **`text-decoration` on anchors:** primary CTA button anchor has `text-decoration: none`. Secondary link anchors have `text-decoration: underline`.
- **Tested inbox clients (acceptance — planner runs a smoke test):** Gmail web, Gmail iOS, Outlook web, Apple Mail macOS. Resend's "Preview & Test" feature provides browser screenshots; the planner should screenshot all three templates with realistic props before merging Phase 3.
- **Dark-mode behavior:** Email clients with dark mode (Gmail iOS, Apple Mail) auto-invert backgrounds. The container's white surface inverts to dark; text inverts to light. Brand color `#003399` retains adequate contrast on dark surfaces (5.0:1 on inverted dark). No `@media (prefers-color-scheme: dark)` override needed — relying on client behavior is the React Email recommended pattern.

---

## Copywriting Contract

Tone: professional, direct, helpful, editorial. Sentence-case throughout. No emojis in admin or email surfaces. Consistent with Phase 2 voice.

### `(admin)` chrome

| Element | Copy |
|---------|------|
| Sidebar logo subtitle | `Admin` |
| Sidebar nav: Queue | `Queue` |
| Sidebar nav: All BIPs | `All BIPs` |
| Sidebar nav: Analytics | `Analytics` |
| Sidebar sign-out button | `Sign out` |
| Mobile top bar wordmark | `BipHub Admin` |
| Public StickyNav for admins (D-15 extension) | `Admin` (replaces `Dashboard` link) |

### Pending Queue (`/admin`)

| Element | Copy |
|---------|------|
| Page h3 | `Pending review` |
| Sub-line (n > 0) | `{n} BIPs awaiting review` |
| Sub-line (n === 0) | `You're all caught up` |
| AdminBipCard meta date | `Submitted {X} days ago` (relative; if today: `Submitted today`; if yesterday: `Submitted yesterday`) |
| AdminBipCard review button | `Review →` |
| Empty state heading | `No pending BIPs` |
| Empty state body | `You're all caught up. New submissions will appear here automatically.` |

### Review page (`/admin/bips/[id]/review`)

| Element | Copy |
|---------|------|
| Page h3 | `Review BIP` |
| Sub-line | `Submitted by {coordinator name} · {university} · {X days ago}` |
| Back link | `← Back to queue` |
| Next-pending indicator (n > 1) | `Next pending: {title}` |
| Next-pending indicator (last) | `No more pending after this one` |
| Actions panel heading | `Admin actions` |
| Approve button | `Approve BIP` |
| Reject button | `Reject BIP` |
| Actions helper text | `Approving publishes the BIP. Rejecting returns it to the coordinator with your feedback.` |
| Auto-advance hint | `After this action you'll be taken to the next pending BIP.` |

### Approve modal

| Element | Copy |
|---------|------|
| Title | `Approve BIP` |
| Description | `You're about to approve:` |
| Note label | `Note for the coordinator (optional)` |
| Note placeholder | `Add a short congratulatory note or context (e.g. "Great work — looking forward to seeing the outcomes.")` |
| Note char counter | `{n}/500 characters` |
| Note helper | `If set, this note will appear in the approval email under "Note from the BipHub team."` |
| Cancel button | `Cancel` |
| Confirm button (idle) | `Approve BIP` |
| Confirm button (loading) | `Approving…` |
| Success toast | `BIP approved. Email sent to {coordinator name}.` |
| Error inline alert | `Failed to approve. Please try again.` |

### Reject modal

| Element | Copy |
|---------|------|
| Title | `Reject BIP` |
| Description | `You're about to reject:` |
| Reason label | `Reason (required, shown to the coordinator)` |
| Reason placeholder | `Explain what needs to change before this BIP can be approved. Be specific — the coordinator will see this verbatim and use it to revise their submission.` |
| Reason char counter | `{n}/1000 characters` |
| Reason min-length error | `Reason must be at least 10 characters. Coordinators need actionable feedback.` |
| Reason helper | `This reason will be included in the rejection email and shown on the coordinator's dashboard.` |
| Cancel button | `Cancel` |
| Confirm button (idle) | `Reject BIP` |
| Confirm button (loading) | `Rejecting…` |
| Success toast | `BIP rejected. Email sent to {coordinator name}.` |
| Error inline alert | `Failed to reject. Please try again.` |

### All-listings (`/admin/bips`)

| Element | Copy |
|---------|------|
| Page h3 | `All BIPs` |
| Sub-line | `{n} BIPs across all statuses` |
| Status filter: All | `All` |
| Status filter: Draft | `Draft` |
| Status filter: Pending | `Pending` |
| Status filter: Approved | `Approved` |
| Status filter: Rejected | `Rejected` |
| Search placeholder | `Search by title, description, or university…` |
| Row updated label | `Updated {date}` |
| Quick-action: Edit | `Edit` |
| Quick-action: Review | `Review` |
| Quick-action: View public | `View public page →` |
| Quick-action: Un-approve | `Un-approve` |
| Empty state heading (with filters) | `No BIPs match these filters` |
| Empty state body | `Try clearing the search or switching to a different status.` |
| Clear search button | `Clear search` |
| Empty state heading (no BIPs at all) | `No BIPs in the catalog yet` |
| Empty state body (no BIPs at all) | `Submissions will appear here once coordinators start using BipHub.` |

### Admin edit wizard (`/admin/bips/[id]/edit`)

| Element | Copy |
|---------|------|
| Banner (verbatim per D-17) | `Editing as admin — coordinator will not be notified.` |
| Wizard step counter sub-line | `Editing BIP "{title}"` |
| Save-status (idle) | `Auto-saved` |
| Save-status (saving) | `Saving…` |
| Save-status (failed) | `Save failed — Retry` |
| Step 5 — Save changes button (NEW) | `Save changes` |
| Step 5 — Reject button (reuse) | `Reject BIP` |
| Step 5 — Approve button (reuse) | `Approve BIP` |
| Save success toast | `Changes saved. {N} fields updated.` |
| Approve-from-edit success toast | `BIP approved and updated. Email sent to {coordinator name}.` |

### Analytics

| Element | Copy |
|---------|------|
| Page h3 | `Analytics` |
| Sub-line | `Updated every 5 minutes` |
| Card 1 label | `TOTAL BIPS` |
| Card 1 description | `Real submissions (seed data excluded).` |
| Card 2 label | `SUBMISSIONS THIS MONTH` |
| Card 2 description | `New submissions since the start of {current month name}.` |
| Card 3 label | `TOP 5 COUNTRIES` |
| Card 3 description | `Most BIPs by host country.` |
| Card 3 empty row | `No BIPs yet` |

### Error states (admin Server Actions)

| Trigger | Copy |
|---------|------|
| Approve failed (network/server) | `Failed to approve. Please try again.` (inline alert in modal) |
| Reject failed (network/server) | `Failed to reject. Please try again.` (inline alert in modal) |
| Email send failed (after DB succeeded) | (silent — admin sees success toast for the DB action; email failure logged server-side per D-11, surfaced in admin via Sonner warning toast: `BIP approved, but email delivery failed. The coordinator may not have been notified.`) (5s, warning variant) |
| Adminless / unauthorized | `Your session has expired. Please sign in again.` (redirects to /login) |

---

## Interaction Contracts

### Modals (approve / reject)

- **Trigger:** Action panel button click.
- **Open animation:** shadcn Dialog default — fade + scale 0.95→1, 200ms ease-out. Reduced-motion: instant.
- **Focus:** First focusable element on mount — `Cancel` button (NOT the destructive confirm). Reasoning: prevents accidental Enter-press confirms; user must deliberately click the confirm.
- **Escape behavior:** Closes modal without action (both modals — both actions are reversible at the DB level).
- **Overlay click:** Closes modal without action.
- **Loading state:** Confirm button disabled + spinner. Cancel still enabled (user can abort while in-flight — Server Action races are handled server-side).
- **Validation timing:** `onBlur` for reason textarea (min-length check). `onSubmit` for full check.

### Admin-actions panel

- **Sticky behavior (≥ lg):** `position: sticky; top: 80px` — relative to the page-level main content area. Top offset accounts for the 56–64px admin sidebar header on mobile (none on desktop since sidebar is left-positioned, not top).
- **Reduced motion:** Sticky still applies (sticky is not an animation). Smooth scroll opt-in does NOT apply to the page (`scroll-behavior: smooth` was never set globally per Phase 1).

### All-listings — status filter + search

- **Status filter:** Tab change updates URL `?status={status}` (shareable). RSC re-renders with filtered data.
- **Search:** 300ms debounce (same as `/bips`). Updates URL `?q={query}`. RSC re-renders.
- **Filter + search combined:** URL params combine. Empty status defaults to `All`.

### Admin edit wizard — Step 5 actions

- **Save changes button:** Calls `adminUpdateBipAction(bipId, draftData)`. Status unchanged. Sonner success toast. Redirects to `/admin/bips` (NOT to next pending — admin edit is not part of the review queue auto-advance).
- **Approve / Reject buttons:** Open the same modals as the review page. On approve/reject success, redirect to `/admin/bips` (not to next pending — admin edit explicitly chose THIS BIP; auto-advance would feel wrong).
- **Step 1–4 auto-save:** Same `adminUpdateBipAction` pattern. No status change ever.

### Auto-advance after approve/reject

- **Logic:** `getNextPendingBipId(excludeId)` query returns the oldest `pending` BIP `id != excludeId`.
- **Animation:** Page-level fade transition (`opacity-0 → opacity-100`, 200ms) when navigating to the next BIP, so the admin sees a brief visual reset rather than an instant content swap. Reduced-motion: instant.
- **End-of-queue:** `null` from query → redirect to `/admin`. Sonner: `Queue cleared. No pending BIPs remain.` (3s, default variant).
- **No "skip" button** in v1: admin reviews FIFO. If they want a different order, they navigate from `/admin/bips`.

### Toast (Sonner — same instance as Phase 1 + 2)

Phase 3 new toast cases:

| Trigger | Duration | Variant |
|---------|----------|---------|
| BIP approved | 3s | Default |
| BIP rejected | 3s | Default |
| Admin save (edit) | 3s | Default |
| Queue cleared (last BIP actioned) | 3s | Default |
| Email send failed (DB succeeded) | 5s | Warning |
| Generic Server Action error | 5s | Error |

### Focus management

- Page navigation: focus moves to the page h3 element on route change (matches Phase 2 pattern).
- Modal open: focus moves to Cancel button (first focusable).
- Modal close: focus returns to the trigger button (Approve / Reject button on actions panel).
- Sidebar nav active: matches `aria-current="page"` on active item.
- Drawer (mobile sidebar): focus moves to first nav item when opened; trapped inside drawer until closed.

### Accessibility (Phase 3 additions to FOUN-03 + Phase 2 baselines)

| Requirement | Implementation |
|-------------|----------------|
| Sidebar nav landmark | `<aside role="navigation" aria-label="Admin navigation">` |
| Mobile drawer (sheet) | shadcn `Sheet` uses Radix `Dialog.Root` — `aria-modal`, focus trap, Escape closes |
| Modal destructive distinction | Reject modal `<DialogContent>` has `data-variant="destructive"` for any future styling hooks; visually the red border-l on the title block + red confirm button reinforces |
| Live region for save-status (admin edit wizard) | Inherited from Phase 2 — `aria-live="polite"` on save-status element |
| Status badge label | Each status pill has an `aria-label="Status: {status name}"` so SR users hear "Status: Pending" not just "Pending" |
| Sticky admin-actions panel | NOT trapped — keyboard tab order continues through the panel naturally; no special role beyond `<aside aria-label="Admin actions">` |
| Email plain-text alternative | React Email auto-generates; verifies inbox screen-reader fallback path |

---

## Borders, Radii, Shadows, Z-Index

**No new tokens.** All Phase 3 surfaces use existing Phase 1 + 2 tokens.

Phase 3 uses:
- `--radius-sm` (6px): status badges (inherited), email container.
- `--radius-md` (10px): AdminBipCard, modal, stat card, admin-actions panel, all-listings rows.
- `--radius-pill` (999px): all buttons, status pill (admin variants).
- `--shadow-md`: AdminBipCard hover, modal, admin-actions panel (sticky).
- `--shadow-sm`: AdminBipCard resting, stat card resting, all-listings rows.

**Z-index (extends Phase 2 ladder):**

| Layer | Z | Surface |
|-------|---|---------|
| 10 | `z-10` | Filter+search row sticky on `/admin/bips` |
| 20 | `z-20` | Mobile admin top bar |
| 30 | `z-30` | Sticky admin-actions panel (≥ lg, inside content area) |
| 40 | `z-40` | Page h3 header sticky (if implemented; currently NOT sticky in v1) |
| 50 | `z-50` | Mobile sidebar drawer (`Sheet`) |
| 70 | `z-70` | Approve / Reject modal overlay (shadcn Dialog default) |
| 80 | `z-80` | Email send failure toast (Sonner — within Sonner stack; relative to viewport not z-index) |

---

## Responsive Breakpoints

Inherited from Phase 1 + 2. `md: 960px`, `lg: 1024px` overrides.

| Breakpoint | Phase 3 Behavior |
|------------|------------------|
| `< 600px` | AdminBipCard fully stacked. Admin sidebar = top bar + drawer. Stat cards single column. Modal: `mx-4` (16px side padding); width auto. |
| `≥ 600px` | Modal: centered, max-w-[480px]. Stat cards still single column. |
| `≥ 960px` (md:) | Sidebar visible (240px fixed). AdminBipCard single-row layout. All-listings row single-row layout. Stat cards 3-column grid. |
| `≥ 1024px` (lg:) | Review page 2-column layout (BipBody + BipSidebar + admin-actions panel as third element stacked in right column). Sticky admin-actions panel activates. |
| `≥ 1200px` | Container max-w ceiling (matches Phase 1 + 2). |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `dropdown-menu` (NEW Phase 3 install), `avatar` (NEW Phase 3 install). All other shadcn primitives already installed in Phase 1 + 2 (`dialog`, `tabs`, `input`, `textarea`, `form`, `alert`, `badge`, `button`, `sheet`, `sonner`, `popover`, `command`). | not required (official registry) |

**No third-party shadcn registries declared for Phase 3.** Registry vetting gate not triggered.

**React Email is NOT a shadcn registry** — it's a separate React component library installed via npm (`react-email`, `@react-email/components`). It does not enter shadcn's `npx shadcn view` or registry signature path. Safety review (manual, by planner before merging): confirm the `@react-email/components` import surface is restricted to `lib/email/templates/*.tsx` only (ESLint `no-restricted-imports` rule, matching the `lib/supabase/admin.ts` isolation pattern from Phase 1) — prevents accidental web-UI use of email-only primitives.

---

## Component Inventory

### `(admin)` route group

| Component | Path | Design Pattern |
|-----------|------|----------------|
| `app/(admin)/layout.tsx` | RSC | Auth guard (`getClaims()`) + admin-role guard (`claims.app_metadata.role === 'admin'` — second of three layers per ADMN-01). Non-admin → `redirect('/')`. Renders `<AdminSidebar>` desktop or `<AdminTopBar>` mobile + `{children}` |
| `<AdminSidebar>` | `components/admin/AdminSidebar.tsx` | RSC. Logo + nav items + identity + sign-out (Server Action form). Hidden `< md`. |
| `<AdminTopBar>` | `components/admin/AdminTopBar.tsx` | `'use client'` (drawer state). Visible `< md`. Burger button + wordmark + avatar. Opens drawer. |
| `<AdminMobileDrawer>` | `components/admin/AdminMobileDrawer.tsx` | `'use client'`. shadcn `Sheet` containing the same nav items + identity + sign-out. |

### Queue surface (`/admin`)

| Component | Path | Design Pattern |
|-----------|------|----------------|
| `app/(admin)/admin/page.tsx` | RSC | Calls `getPendingBips()` → renders `<AdminQueueHeader>` + `<AdminBipCard>` list or `<AdminQueueEmpty>` |
| `<AdminBipCard>` | `components/admin/AdminBipCard.tsx` | RSC (`Review →` is a `<Link>`; no client state needed) |
| `<AdminQueueEmpty>` | `components/admin/AdminQueueEmpty.tsx` | RSC. Centered empty-state with Lucide `Inbox` icon. |

### Review surface (`/admin/bips/[id]/review`)

| Component | Path | Design Pattern |
|-----------|------|----------------|
| `app/(admin)/admin/bips/[id]/review/page.tsx` | RSC | Calls `getAdminBipById(id)` + `getNextPendingBipId(id)`. Renders `<BipBody>` + `<BipSidebar mode="admin-review">` + `<AdminActionsPanel>` |
| `<AdminActionsPanel>` | `components/admin/AdminActionsPanel.tsx` | `'use client'` (modal trigger state). Two buttons + helper text + auto-advance hint. |
| `<ApproveBipDialog>` | `components/admin/ApproveBipDialog.tsx` | `'use client'`. shadcn Dialog + Textarea + counter. Calls `approveBipAction`. |
| `<RejectBipDialog>` | `components/admin/RejectBipDialog.tsx` | `'use client'`. shadcn Dialog + Textarea + counter + min-length validation. Calls `rejectBipAction`. |

### All-listings surface (`/admin/bips`)

| Component | Path | Design Pattern |
|-----------|------|----------------|
| `app/(admin)/admin/bips/page.tsx` | RSC | Parses search params (status filter + query) via Zod. Calls `getAdminBips(filters)`. Renders `<AdminListingsHeader>` + `<AdminListingsFilters>` + row list or empty state. |
| `<AdminListingsFilters>` | `components/admin/AdminListingsFilters.tsx` | `'use client'`. shadcn Tabs + debounced Input. Updates URL via `useRouter`. |
| `<AdminListingRow>` | `components/admin/AdminListingRow.tsx` | `'use client'` (dropdown menu interactivity). shadcn DropdownMenu for quick-actions. |
| `<AdminListingsEmpty>` | `components/admin/AdminListingsEmpty.tsx` | RSC. Two variants based on whether filters are active. |

### Admin edit surface (`/admin/bips/[id]/edit`)

| Component | Path | Design Pattern |
|-----------|------|----------------|
| `app/(admin)/admin/bips/[id]/edit/page.tsx` | RSC | Calls `getAdminBipById(id)`. Renders `<AdminEditBanner>` + `<BipSubmissionWizard mode="admin" bip={bip}>` |
| `<AdminEditBanner>` | `components/admin/AdminEditBanner.tsx` | RSC. Single-instance banner with locked copy. |
| `<BipSubmissionWizard>` | `components/forms/BipSubmissionWizard.tsx` (Phase 2 — EXTENDED) | `'use client'`. Add `mode: 'coordinator' \| 'admin'` prop. Step 5 footer behavior branches on `mode`. |
| `<WizardStep5AdminActions>` | `components/forms/steps/WizardStep5AdminActions.tsx` (NEW) | `'use client'`. Replaces Step 5 footer's coordinator "Submit for review →" with the 3-button admin row. Reuses `<ApproveBipDialog>` + `<RejectBipDialog>` from review-page components. |

### Analytics surface (`/admin/analytics`)

| Component | Path | Design Pattern |
|-----------|------|----------------|
| `app/(admin)/admin/analytics/page.tsx` | RSC + `export const revalidate = 300` | Calls `getAdminAnalytics()` (returns `{ totalBips, submissionsThisMonth, topCountries }`). Renders three stat cards. |
| `<StatCard>` | `components/admin/StatCard.tsx` | RSC. Generic — used for cards 1 and 2 (single big number). |
| `<TopCountriesCard>` | `components/admin/TopCountriesCard.tsx` | RSC. Specialized variant for card 3 (5-row list). |

### Coordinator dashboard — rejection wiring (Phase 3 data, Phase 2 visual)

| Component | Path | Change in Phase 3 |
|-----------|------|-------------------|
| `<DashboardBipCard>` | `components/dashboard/DashboardBipCard.tsx` | No visual change. Consumes `bip.rejection_reason` from the Phase-3-augmented `CoordinatorBip` type. |
| `getCoordinatorBips()` | `lib/queries/coordinatorBips.ts` | Augment to left-join the latest `bip_status_history` rejection row per BIP, populating `rejection_reason`. |
| `getLatestRejection(bipId)` | `lib/queries/bipStatusHistory.ts` (NEW) | Helper query for any future single-BIP reuse. |

### Email templates

| Template | Path | Design Pattern |
|----------|------|----------------|
| `<ApprovalEmail>` | `lib/email/templates/ApprovalEmail.tsx` | React Email component. Props: `coordinatorFirstName`, `bipTitle`, `bipSlug`, `note?`. |
| `<RejectionEmail>` | `lib/email/templates/RejectionEmail.tsx` | React Email component. Props: `coordinatorFirstName`, `bipTitle`, `bipId`, `reason`, `replyToEmail?`. |
| `<AdminNotificationEmail>` | `lib/email/templates/AdminNotificationEmail.tsx` | React Email component. Props: `bipTitle`, `bipId`, `coordinatorName`, `universityName`, `submittedAtUtc`. |
| `lib/email/send.ts` | helper | Wraps `resend.emails.send`. Reads `RESEND_API_KEY`. If unset, logs HTML to console (D-15 — local dev path). |
| `lib/email/tokens.ts` | constants | `EMAIL_TOKENS` map (per Email Template Contract). |

---

## Open Issues / Blockers This Spec Does Not Resolve

1. **`@react-email/components` import isolation:** ESLint `no-restricted-imports` rule restricting `@react-email/components` to `lib/email/templates/*.tsx` should be added in the same migration as the Resend dependency install. Planner specifies the exact rule shape.

2. **Sticky admin-actions panel on long BIP detail pages:** The sticky panel may collide with the Phase 1 `BipSidebar`'s own sticky behavior (both at `top: 80px` on `≥ lg`). Planner verifies during implementation that the two sticky panels stack correctly inside the right column (admin-actions panel below `BipSidebar`, both within the same scrolling parent). If they conflict, the fix is to make the admin-actions panel non-sticky and the `BipSidebar` retain its sticky — but this is a low-risk concern given the right column is a single scrolling context.

3. **Top-5 Countries card — flag rendering across email clients:** Email templates do NOT use flag emojis (Outlook + Apple Mail render emojis inconsistently). Web UI card 3 uses flag emojis from `lib/countries.ts`; emails do not surface this data anyway. No conflict — flagged only because the planner should NOT copy the Top-5 card pattern into any future email template.

4. **Auto-advance edge: BIP actioned while two admins are on the queue simultaneously:** If admin A and admin B both have `/admin/bips/[id]/review` open for the same BIP, admin A approves first, admin B's approve action fails with a "BIP already approved" error. UI surfaces this as the generic Server Action error toast (`Failed to approve. Please try again.`) — sufficient for v1. Multi-admin coordination is deferred (v2 — `/admin/users` page).

5. **`AdminBipCard` vs `AdminListingRow` deduplication:** Two card components with similar inner layout. Planner decides whether to abstract a `<AdminBipBase>` or keep them separate. Recommendation: keep separate — `AdminBipCard` (queue, roomy) and `AdminListingRow` (all-listings, dense) serve different cognitive purposes; shared abstraction would obscure that intent.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS (with FLAG — analytics stat-card adds a 5th display size + 3rd display weight, inherited from Phase 1 homepage scale, restricted to `/admin/analytics`; framing in §Typography updated to document the exception)
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

Reviewed by `gsd-ui-checker` on 2026-05-11. One non-blocking FLAG on Dimension 4 addressed inline.

**Approval:** pending
