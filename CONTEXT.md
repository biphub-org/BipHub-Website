# BipHub — Project Context File
> Feed this file to `/gsd-new-project` in Claude Code to initialize the project.

---

## Project Overview

**Name:** BipHub
**Tagline:** The free database for Erasmus+ Blended Intensive Programs
**Type:** Full-stack web application (public-facing + university dashboard)
**License:** Proprietary — all rights reserved (see LICENSE)
**Status:** Greenfield — starting from zero
**Reference homepage mockup:** `biphub-homepage.html` represented the v1 visual direction; removed after the v1 build — the live homepage is now canonical

---

## The Problem

There is currently only one website that lists Blended Intensive Programs (BIPs): [erasmusbip.org](https://erasmusbip.org). It is a WordPress site with severe UX problems:

- The BIP list page literally displays "loading… if the table does not load, please contact administrator" — the data table often fails to load entirely
- No real search or filtering capability
- No standardized BIP data schema
- No university self-service — submissions go through manual contact
- Mobile experience is broken
- The site looks and feels like it was built in 2012
- There is no API or structured data export

Students currently have no reliable way to discover BIPs. Universities have no good way to list them. **This is the gap BipHub is filling.**

---

## What is a BIP?

A **Blended Intensive Program (BIP)** is an Erasmus+ mobility format that combines:
- A **short-term physical mobility** abroad (min 5 days, max 30 days)
- A **compulsory virtual/online component** before or after the physical part

Key facts for the data model:
- Funded under Erasmus+ KA131 programme
- Physical mobility rate: ~€79/day
- Minimum 10 participants (9 with 10% flexibility), maximum 20 funded participants
- Open to students and staff from any participating HEI (Higher Education Institution)
- Must have collaborative online learning component (not just supplementary)
- Students get travel cost reimbursement based on fixed distance-calculator rates
- Green travel bonus: +€50, up to 6 travel days covered
- BIPs are organized by groups of HEIs — there is a **host university** and **partner universities**
- BIPs award ECTS credits and have defined learning outcomes

---

## Target Users

### Primary: Students
- Looking for short-term international mobility opportunities
- Want to filter by country, subject area, dates, language, ECTS credits
- Need to understand eligibility and application process
- May be coming from any EU/Erasmus partner country university

### Secondary: University Coordinators / Erasmus Officers
- Want to list their BIP to attract applicants from partner universities
- Need a dashboard to manage their BIP listing(s)
- Need a submission flow that is fast, clear, and professional
- May represent either host or partner institutions

### Tertiary: Admins (us)
- Review and approve new BIP submissions
- Moderate/edit listings for quality and accuracy
- View analytics (submissions, searches, popular filters)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 15** (App Router) |
| Language | **TypeScript** |
| Database + Auth | **Supabase** (Postgres + Auth + Storage + RLS) |
| Styling | **Tailwind CSS v4** |
| UI Components | **shadcn/ui** |
| Deployment | **Vercel** |
| Email | **Resend** (transactional emails) |
| Forms | **React Hook Form + Zod** |
| State | **Zustand** (client state where needed) |
| Search/Filtering | Supabase full-text search + client-side filters |
| Maps | **react-simple-maps** or **D3** with EU GeoJSON for the Europe map |
| Animations | **Framer Motion** (count-up stats, map hover, etc.) |

---

## Design System

### Color Palette — EU Palette

This is a deliberate choice. BipHub is for European students discovering European programs — using the EU palette communicates the context immediately.

```
--eu-blue: #003399        Primary brand, CTAs, accents, map base
--eu-blue-dark: #002270   Hover states for primary buttons
--eu-blue-light: #1a4dab  Secondary blue accents
--eu-blue-50: #eef2fb     Backgrounds, lightest tint
--eu-blue-100: #dde6f7    Subtle backgrounds, tags
--eu-gold: #FFCC00        Secondary accent, highlights, hover states, deadline pills
--eu-gold-dark: #e6b800   Hover state for gold
--eu-gold-soft: #fff4cc   Subtle gold tints
--ink: #0a1735            Primary text (deep navy, not pure black)
--ink-2: #2c3658          Secondary text
--muted: #6b7390          Tertiary text, captions
--bg: #ffffff             Default background
--bg-soft: #f7f8fc        Section background variation
--bg-hero: #f4f6fc        Hero background
--border: #e5e8f0         Standard borders
--border-strong: #d1d6e3  Hover-state borders
```

### Important Legal Note

We use the EU palette but **must clearly state we are not affiliated with the European Commission**. Add this disclaimer in the footer: "Independent project — not affiliated with the European Commission". Do not use the official EU emblem (12 stars in a circle). The palette is fine; the official emblem is restricted.

### Typography

- **Font:** Inter (Google Fonts), weights 400/500/600/700
- **Headings:** Tight letter-spacing (-0.5px to -1.5px), bold (700) for h1/h2, semibold (600) for h3/h4
- **Body:** 16px, line-height 1.6, weight 400
- **Sentence case** for everything except eyebrow labels (which are uppercase with letter-spacing)

### Visual Style

- **Generous whitespace** — sections use 96px vertical padding on desktop
- **Subtle shadows** — `0 4px 16px rgba(10, 23, 53, 0.06)` for cards, never harsh
- **Rounded corners** — 10px standard, 16px for large cards, 999px for pills/buttons
- **Pill-shaped CTAs** — buttons are fully rounded (`border-radius: 999px`)
- **Eyebrow labels** — small uppercase blue text with a gold leading dash, used above section titles
- **Gold underline accent** — selected words in headlines get a gold highlight bar behind them (see hero in mockup)
- **Hover transforms** — cards lift 2-3px on hover with shadow increase
- **Smooth transitions** — 0.2s ease for all interactive elements

### Component Patterns

- **BIP Card** — gradient header with country flag pill (top-left) and gold deadline pill (top-right), then field tag, title, university name, and meta row with icons (duration / ECTS / language)
- **Stat Card** — gold icon square, large number, label, delta indicator
- **Category Item** — square icon background that flips to gold on hover
- **Section Eyebrow** — `▬ UPPERCASE LABEL` in EU blue with letter-spacing 1.2px

---

## Homepage Sections (v1 — Final)

The homepage flow is **locked** as follows. Reference: the original v1 mockup (removed post-build; the live page is canonical).

### 1. Sticky Navigation
- Logo (BipHub wordmark with EU-themed mark — blue square, gold star ring)
- Links: Browse BIPs · By country · How it works · What is a BIP?
- Sign in (ghost) + List your BIP (primary)
- Translucent white background with backdrop blur on scroll

### 2. Hero
- Pill badge with "New" tag + tagline
- Large headline (clamp 40-68px) with gold underline accent on key phrase
- Subhead lede (max 600px width)
- Two CTAs: "Browse all BIPs" (primary blue) + "List your BIP" (ghost)
- Trust indicators row: 33 programme countries · Fully funded by Erasmus+ · Independent project
- Scroll indicator at the bottom (animated mouse + horizontal lines + "Scroll to explore" label)
- Background: subtle radial gradients in blue and gold (no harsh mesh)

### 3. Interactive Europe Map
- SVG-based map of all 29 Erasmus+ countries
- Color intensity scales with BIP count per country (5 tiers: 50/100/200/blue-light/blue)
- Hover: country fills gold, tooltip appears with country name and BIP count
- Click: filters the BIP list page by that country (`/bips?country=de`)
- Below the map: legend (less BIPs → more BIPs gradient), and hint text
- **Implementation note:** The hand-drawn SVG paths from the v1 mockup were replaced with proper GeoJSON via `react-simple-maps`

### 4. Field of Study Categories Bar
- 8 category cards in a single row (collapses to 3 columns on mobile)
- Each card: icon in a soft-blue square (turns gold on hover), category label, BIP count
- Categories: Engineering, Business, Sciences, Arts & Design, Health, Social Sciences, Environment, Humanities
- Click filters the BIP list by ISCED field group

### 5. Statistics Section (Full-bleed Blue)
- Deep EU-blue background with subtle gold radial accent
- 4 stat cards: BIPs listed, Universities, Countries, Open applications
- Numbers count up from 0 when scrolled into view (Intersection Observer)
- Each card has a gold icon, big number (44px), label, and delta indicator

### 6. Recently Added BIPs
- "Fresh opportunities" section with 3-card grid (responsive to 2 then 1 column)
- Cards use the BIP Card pattern described above
- "View all" ghost button in section header, "Browse all 284 BIPs" primary CTA below
- For now, card headers use gradient placeholders. In production, universities will upload images.

### 7. How It Works (3-Step)
- "For students" eyebrow
- 3 numbered steps: Find → Apply → Go
- Step numbers in blue circles with gold rings
- Dashed connector lines between steps on desktop
- Each step has a 1-2 sentence description

### 8. University CTA Section
- Dark navy card (`--ink` background) with EU-themed radial accents
- Two-column layout: left = pitch + CTAs, right = 3 small mock feature rows
- Primary CTA in gold ("Get started"), secondary ghost button
- Mock rows with gold icon squares: 10-minute setup, European reach, Quality reviewed

### 9. Footer
- Dark navy background
- 4-column grid: Brand + tagline / For Students / For Universities / Project
- Bottom bar: copyright ("© 2026 BipHub") plus the **"Independent project — not affiliated with the European Commission" disclaimer**

---

## Core Features — v1 Scope

### Public / Student-Facing

1. **Homepage** — As specified above
2. **BIP Listing/Browse Page** (`/bips`)
   - Card-based grid layout (NOT a table)
   - Filters: country, subject area (ISCED), language, date range, ECTS, open/closed applications
   - Full-text search across title, description, university name
   - Sorting: newest, deadline soonest, alphabetical
   - URL-driven filters (sharable links: `/bips?country=de&field=engineering`)
   - Empty state when no results
   - Pagination or infinite scroll (TBD during planning)
3. **BIP Detail Page** (`/bip/[slug]`)
   - Full BIP info: description, learning outcomes, virtual component details, physical mobility details
   - Host university + partner universities listed
   - Application deadline, start/end dates
   - How to apply (contact info or external link)
   - ECTS credits awarded, language requirements, eligibility
   - Share button, bookmark (local storage v1)
4. **What is a BIP?** Information page
   - Explainer for students unfamiliar with the program
   - FAQ section
   - Link to official EC documentation

### University / Coordinator-Facing

5. **Authentication** (`/login`, `/register`)
   - Sign up with institutional email
   - Email verification required (Supabase + Resend)
   - Profile setup: university, country, Erasmus code, coordinator name + contact
6. **BIP Submission Form** (`/dashboard/bips/new`)
   - Multi-step form (wizard pattern, not one giant page)
   - Auto-save drafts to Supabase
   - Preview before submission
   - Submitted BIPs go into pending review queue
7. **Coordinator Dashboard** (`/dashboard`)
   - List of submitted BIPs with status (draft / pending / approved / rejected)
   - Edit drafts or pending BIPs
   - View rejection reason if rejected
   - Submit new BIP button

### Admin-Facing

8. **Admin Panel** (`/admin`)
   - Protected by Supabase role (`admin`)
   - Review queue: pending BIPs
   - Approve / Reject with optional note
   - Edit any listing
   - View all listings with status filter
   - Basic analytics: total BIPs, submissions per month, top countries

---

## Out of Scope for v1

- Student accounts / saved BIPs server-side (bookmarks via localStorage only)
- University-to-university messaging
- Application submission through the platform (link out to university contact)
- BIP reviews or ratings
- Public API for external consumers
- Multilingual UI (English only for v1)
- Automated BIP data import from official EU sources
- Payment processing
- PDF export of BIP info
- University photo uploads (use gradient placeholders in v1; can add to v2)

---

## Data Model (Key Entities)

### `bips` table
```
id, slug, title, description, learning_outcomes, virtual_component_description,
host_university_id, subject_area (ISCED), language_of_instruction,
physical_start_date, physical_end_date, application_deadline,
ects_credits, max_participants, eligibility_notes,
how_to_apply_type (contact|url), how_to_apply_value,
status (draft|pending|approved|rejected), rejection_note,
created_by (user_id), created_at, updated_at, published_at
```

### `universities` table
```
id, name, country, erasmus_code, city, website, created_at
```

### `bip_partner_universities` table (junction)
```
bip_id, university_id
```

### `profiles` table (extends Supabase auth.users)
```
id, university_id, full_name, role (coordinator|admin), email_verified
```

---

## Competitive Analysis

**erasmusbip.org (only competitor):**
- Built on WordPress + Elementor
- BIP list is an embedded Google Sheet/Airtable that frequently fails to load
- Zero filtering capability
- No university self-service
- No mobile support
- Domain has been active since ~2020, has some organic SEO value

**BipHub's advantages:**
- Actually works reliably
- Structured data model (not a spreadsheet)
- Real search and filtering
- Beautiful, modern UI with EU brand alignment
- Interactive Europe map for discovery
- University self-service with review workflow
- Will be faster and more trustworthy

---

## Non-Functional Requirements

- **Performance:** Core Web Vitals green. BIP listing page should load < 1.5s (SSG/ISR). Homepage should achieve Lighthouse Performance > 90.
- **SEO:** BIP detail pages fully SSR'd with proper meta tags, OG images. `/bip/[slug]` URLs are human-readable.
- **Accessibility:** WCAG AA. All forms keyboard-navigable. Proper ARIA labels. Map must be keyboard-navigable with country list as a fallback.
- **Security:** Supabase RLS on all tables. Coordinators can only edit their own BIPs. Admin role enforced server-side. No PII exposed in public API.
- **Reliability:** Vercel + Supabase — targeting 99.9% uptime.
- **License:** Proprietary — all rights reserved (see LICENSE). Clean repo, CONTRIBUTING.md, easy local dev setup with a single `supabase start` + `npm run dev`.
- **Legal:** Footer disclaimer required: "Independent project — not affiliated with the European Commission". Do not use the official 12-star EU emblem.

---

## Project Structure (Suggested)

```
/app
  /(public)
    /page.tsx                  ← Homepage
    /bips/page.tsx             ← BIP browse/listing
    /bip/[slug]/page.tsx       ← BIP detail
    /what-is-a-bip/page.tsx    ← Explainer page
  /(auth)
    /login/page.tsx
    /register/page.tsx
  /(dashboard)
    /dashboard/page.tsx        ← Coordinator dashboard
    /dashboard/bips/new        ← BIP submission wizard
    /dashboard/bips/[id]/edit
  /(admin)
    /admin/page.tsx
    /admin/bips/[id]/review
/components
  /home       ← Hero, EuropeMap, CategoriesBar, StatsBlock, RecentBips, HowItWorks, UniversityCTA
  /bip        ← BipCard, BipFilters, BipDetail
  /forms      ← BipSubmissionForm steps
  /ui         ← shadcn components
/lib
  /supabase   ← client, server, middleware
  /validations
  /utils
/supabase
  /migrations
  /seed.sql
/public
  /eu-countries.geojson        ← For the Europe map
```

---

## Key Decisions Already Made

1. **Name:** BipHub
2. **Color palette:** EU blue (#003399) + EU gold (#FFCC00), with dark navy ink (#0a1735) for text
3. **Font:** Inter
4. **App Router** (not Pages Router) — modern Next.js, better for RSC + Supabase server client
5. **Supabase Auth** — not NextAuth. Simpler, native RLS integration
6. **Cards not tables** — BIP listing is a card grid everywhere
7. **University self-register + admin review** — universities sign up, BIPs are reviewed before going live
8. **English-only v1** — i18n deferred
9. **No student accounts in v1** — bookmarks via localStorage only
10. **Slug-based BIP URLs** — `/bip/sustainable-cities-budapest-2025`
11. **Interactive Europe map** is a core homepage feature, not a nice-to-have
12. **Multi-step submission form** (wizard), not single scrolling form
13. **Footer disclaimer** about non-affiliation with EC is mandatory
14. **Homepage visual direction** (EU palette, 96px sections, pill CTAs) was locked from the v1 mockup; the live page is now canonical

---

## Open Questions for GSD to Help Resolve

- ISR revalidation strategy for BIP pages (on-demand via Supabase webhook vs. time-based)?
- How to handle universities that are partners on BIPs but haven't registered — allow free-text partner input that gets reconciled later?
- Should the admin panel be a separate route group in the same Next.js app, or a completely separate app?
- Best library for the Europe map: `react-simple-maps`, raw D3, or custom SVG with GeoJSON?
- Seed data strategy — scrape erasmusbip.org's table, manual entry, or outreach to universities at launch?
- How should "Recently added" handle empty state at launch (when there are 0-5 BIPs)?

---

## Success Metrics for v1 Launch

- At least 20 real BIPs listed at launch (manually seeded or via outreach)
- Page loads in under 1.5s on 4G mobile
- University can go from registration to submitted BIP in under 10 minutes
- Zero broken features — everything that exists works
- Lighthouse score > 90 on Performance, Accessibility, SEO
- Homepage follows the locked v1 visual direction (EU palette, 96px sections, pill CTAs)
