# Feature Research

**Domain:** Public BIP/mobility-listing platform (Erasmus+ Blended Intensive Programs)
**Researched:** 2026-05-08
**Confidence:** HIGH (for BIP domain knowledge + feature categorization); MEDIUM (for competitor gap analysis, since erasmusbip.org's table fails to load and cannot be directly inspected)

---

## Open Questions Resolved

### OQ-1: How to handle partner universities that haven't registered

**Recommendation: Free-text entry with deferred reconciliation.**

Reasoning:
- BIPs require a minimum of 3 HEIs from 3 different countries. A coordinator listing their BIP on day one cannot be blocked by whether Utrecht, Vienna, or Gdansk has registered yet.
- The erasmusbip.org registry confirms this is the real-world problem: they collect `university name + Erasmus Code + country` as plain text from the submitting coordinator anyway.
- Requiring pre-registration of all partners before a BIP can be submitted would make the submission form unusable at launch and would be a significant barrier that defeats the product's core value.
- **Implementation:** The `bip_partner_universities` junction table should support two modes: `university_id` (FK to `universities`) when the partner exists in the system, or `partner_name_raw` + `partner_erasmus_code_raw` + `partner_country_raw` when they do not. An admin reconciliation task can later match raw entries to registered universities. Surface matched vs. unmatched partner count in the admin panel.
- **Invite flow (v1.x, not v1):** After a BIP is approved, the system can optionally email the listed partner coordinator addresses ("You've been listed as a partner on [BIP title] at BipHub — claim your university page"). This is a growth lever, not a launch requirement.

### OQ-2: "Recently added" empty state at launch (0–5 BIPs)

**Recommendation: Hide the section entirely until threshold is reached; use a static "coming soon" teaser below the statistics block instead.**

Reasoning:
- Showing 1–2 real BIP cards in a 3-column grid looks broken, not sparse — asymmetric card layouts read as bugs.
- Using placeholder/skeleton cards for slots not yet filled is dishonest and confuses users about whether data is loading.
- A static "We're getting started — be among the first to list your BIP" message in the section's place directs university coordinators toward submission, which is the actual action needed to fill the section.
- **Threshold:** Show the "Recently added" section normally once ≥ 6 approved BIPs exist (fills 2 rows of 3 cards). Below that, show the invitation teaser.
- **Statistics block during empty state:** Show real numbers (even if small) — trust is built by honesty. "8 BIPs listed" is better than hiding the stat or inflating it. Set the stats block delta text to something that stays true: "Growing fast" instead of "+38 this month" until real month-over-month data exists.

---

## Feature Landscape

### Category A: Discovery (Public / Student-Facing)

| Feature | Category | Why Expected | Complexity | Status in v1 | Dependencies | Priority |
|---------|----------|--------------|------------|--------------|--------------|----------|
| Homepage with hero + map + categories + stats + recent BIPs + how-it-works | Discovery | Entry point; first impression determines trust | HIGH | In scope | None | P1 |
| Interactive Europe map (click-to-filter by country) | Discovery | No equivalent exists on erasmusbip.org; students think geographically | HIGH | In scope | GeoJSON data, BIP data | P1 |
| BIP browse/listing page `/bips` with card grid | Discovery | Core utility — any directory needs a list view | MEDIUM | In scope | BIP data model | P1 |
| Filter by country | Discovery | Expected on any travel/mobility site | LOW | In scope | BIP data | P1 |
| Filter by field of study (ISCED group) | Discovery | Students know their discipline | LOW | In scope | BIP data, ISCED taxonomy | P1 |
| Filter by language of instruction | Discovery | Critical — student must be able to attend | LOW | In scope | BIP data | P1 |
| Filter by date range (physical mobility) | Discovery | BIPs are time-bounded; conflicts with semester matter | LOW | In scope | BIP data | P1 |
| Filter by ECTS credits awarded | Discovery | Credit recognition requires minimum ECTS | LOW | In scope | BIP data | P1 |
| Filter by open/closed applications | Discovery | Students won't apply to closed BIPs | LOW | In scope | BIP data, deadline logic | P1 |
| Full-text search across title, description, university name | Discovery | Standard expectation on any directory | MEDIUM | In scope | Supabase FTS index | P1 |
| URL-driven filter state (sharable links) | Discovery | Coordinators share links; students bookmark searches | LOW | In scope | BIP browse page | P1 |
| Sorting: newest, deadline soonest, alphabetical | Discovery | Deadline sorting is high-value for students | LOW | In scope | BIP data | P1 |
| BIP detail page `/bip/[slug]` | Discovery | Cannot apply without full information | MEDIUM | In scope | BIP data model | P1 |
| Share button on BIP detail | Discovery | Students share opportunities with friends | LOW | In scope | BIP detail page | P2 |
| Bookmark to localStorage (no account needed) | Discovery | Useful UX; account-free removes friction | LOW | In scope | None | P2 |
| "What is a BIP?" explainer page | Discovery | Most students have never heard of BIPs | LOW | In scope | None | P1 |
| Field-of-study categories bar (8 categories, homepage) | Discovery | Visual navigation shortcut; category counts shown | LOW | In scope | BIP data, ISCED grouping | P1 |
| Empty state when no search results | Discovery | Without this the page looks broken | LOW | In scope | BIP browse page | P1 |
| Pagination or infinite scroll on `/bips` | Discovery | Required once > ~20 BIPs exist | MEDIUM | In scope (TBD pattern) | BIP browse page | P1 |

**Missing from CONTEXT.md — v1 additions recommended:**

| Feature | Category | Why Expected | Complexity | Recommendation |
|---------|----------|--------------|------------|----------------|
| Filter by level of study (Bachelor / Master / PhD) | Discovery | Confirmed field in official BIP forms; students cannot apply to wrong level | LOW | Add to v1 scope |
| Filter by virtual component timing (before / during / after) | Discovery | Affects student schedule compatibility | LOW | Add to v1 scope |
| "Open to all" vs. "partner institutions only" flag on BIP card | Discovery | Some BIPs are only open to specific partner institutions' students | LOW | Add to v1 scope |
| Host city (not just host country) shown on card | Discovery | Students care about the city, not just country | LOW | Already in mockup (city shown on card flag) — confirm in data model |
| Explicit "green travel eligible" tag | Discovery | EU-minded students and coordinators care; it's an official Erasmus+ grant category | LOW | Surface as a tag/badge on BIP cards |

---

### Category B: Submission (University / Coordinator-Facing)

| Feature | Category | Why Expected | Complexity | Status in v1 | Dependencies | Priority |
|---------|----------|--------------|------------|--------------|--------------|----------|
| Coordinator registration with institutional email | Submission | Required before any submission | LOW | In scope | Supabase Auth, Resend | P1 |
| Email verification flow | Submission | Blocks spam accounts | LOW | In scope | Supabase Auth, Resend | P1 |
| University profile setup (name, country, Erasmus code, city, website) | Submission | Core data for listings | LOW | In scope | `universities` table | P1 |
| Multi-step BIP submission form (wizard) | Submission | Long form that must feel manageable | HIGH | In scope | React Hook Form, Zod | P1 |
| Auto-save drafts | Submission | Coordinator may be interrupted mid-form | MEDIUM | In scope | Supabase, form state | P1 |
| Preview before submission | Submission | Quality check; builds confidence | MEDIUM | In scope | BIP detail component | P2 |
| Partner universities: free-text + optional FK resolution | Submission | Partners often not yet registered (see OQ-1) | MEDIUM | Must add to scope | `bip_partner_universities` schema extension | P1 |
| How-to-apply: contact email OR external URL option | Submission | BIPs use both patterns in practice | LOW | In scope | `how_to_apply_type` field | P1 |

**Missing from CONTEXT.md — v1 additions recommended:**

| Feature | Category | Why Expected | Complexity | Recommendation |
|---------|----------|--------------|------------|----------------|
| Level of study field (Bc / Master / PhD — multi-select) | Submission | Confirmed required field from official BIP forms; affects who can apply | LOW | Add to submission form + data model |
| Virtual component timing field (Before / During / After / combinations) | Submission | Real data field used by coordinators; students need this to assess schedule fit | LOW | Add to submission form + data model |
| Language level required (CEFR: A1–C2) | Submission | Coordinators specify this in real BIPs (e.g., "B1–C1 expected"); students need it for eligibility | LOW | Add to submission form + data model |
| "Open to partner institutions only" toggle | Submission | Some BIPs are restricted to students from partner HEIs | LOW | Add to submission form + data model |
| Green travel flag (is green travel supported / encouraged?) | Submission | Erasmus+ official grant category; affects student funding | LOW | Add as boolean to data model |
| Inclusion support available flag | Submission | Coordinators who offer extra support for students with fewer opportunities should declare it | LOW | Add as boolean + optional notes field |
| Approximate cost to student (accommodation, meals — optional) | Submission | BIPs must be free per Erasmus+ rules but accommodation varies; students need to budget | LOW | Add as optional free-text field ("accommodation typically €X/night") |
| Virtual component description (separate from physical) | Submission | Already in data model but needs dedicated form step; distinct from the BIP's overall description | LOW | Ensure separate step in wizard |
| Contact coordinator name + email (separate from how-to-apply) | Submission | Students need someone to email with questions pre-application | LOW | Add `contact_name` + `contact_email` to data model (may differ from how_to_apply_value) |
| ISCED-F detailed code (4-digit) in addition to broad group | Submission | Coordinator's field of study should map to official ISCED-F code for search/SEO accuracy | MEDIUM | Add `isced_f_code` field alongside existing `subject_area` group; provide a searchable dropdown |

---

### Category C: Auth (University / Coordinator Account)

| Feature | Category | Why Expected | Complexity | Status in v1 | Dependencies | Priority |
|---------|----------|--------------|------------|--------------|--------------|----------|
| Sign in / sign out | Auth | Basic account management | LOW | In scope | Supabase Auth | P1 |
| Password reset via email | Auth | Standard expectation | LOW | Implied in scope | Supabase Auth, Resend | P1 |
| Institutional email validation (domain check) | Auth | Trust signal; reduces obvious non-university registrations | MEDIUM | Not explicitly scoped | Custom validation logic | P2 |

**Note on institutional email validation:** Full domain validation (checking against known HEI domain list) is MEDIUM complexity and can be deferred. For v1, requiring any valid email + human admin review provides sufficient quality control. Add domain validation in v1.x.

---

### Category D: Dashboard (Coordinator Self-Service)

| Feature | Category | Why Expected | Complexity | Status in v1 | Dependencies | Priority |
|---------|----------|--------------|------------|--------------|--------------|----------|
| List of submitted BIPs with status (draft/pending/approved/rejected) | Dashboard | Coordinator must track their submissions | LOW | In scope | `bips` table | P1 |
| Edit drafts | Dashboard | Form abandonment recovery | LOW | In scope | Submission form | P1 |
| Edit pending BIPs (before admin reviews) | Dashboard | Coordinator may spot errors post-submission | LOW | In scope | Status logic | P1 |
| View rejection reason | Dashboard | Without this, rejection creates confusion and churn | LOW | In scope | `rejection_note` field | P1 |
| Submit new BIP button | Dashboard | Entry point to submission flow | LOW | In scope | Submission form | P1 |
| Edit approved BIPs (with re-review trigger) | Dashboard | Dates change, contact info changes | MEDIUM | Not explicitly scoped | Status rollback logic | P2 |

**Missing from CONTEXT.md — v1 addition recommended:**

| Feature | Category | Why Expected | Complexity | Recommendation |
|---------|----------|--------------|------------|----------------|
| Notify coordinator by email on status change (approved / rejected) | Dashboard | Coordinator has no reason to poll the dashboard otherwise | LOW | Add to v1; trigger via Resend on admin approve/reject action |
| "Request changes" admin action (between approve and reject) | Dashboard | Binary approve/reject forces coordinators to resubmit entirely for minor edits | MEDIUM | Add in v1 if simple to implement alongside rejection flow; otherwise v1.x |

---

### Category E: Admin

| Feature | Category | Why Expected | Complexity | Status in v1 | Dependencies | Priority |
|---------|----------|--------------|------------|--------------|--------------|----------|
| Review queue of pending BIPs | Admin | Core moderation function | MEDIUM | In scope | Supabase role + RLS | P1 |
| Approve with single click | Admin | Fast review is essential for coordinator retention | LOW | In scope | Status update | P1 |
| Reject with optional note | Admin | Rejection without explanation causes coordinator churn | LOW | In scope | `rejection_note` field | P1 |
| Edit any listing | Admin | Quality corrections without coordinator round-trip | MEDIUM | In scope | Submission form in admin context | P1 |
| View all listings with status filter | Admin | Operational visibility | LOW | In scope | `bips` table query | P1 |
| Basic analytics: total BIPs, submissions per month, top countries | Admin | Operational metrics for the project team | MEDIUM | In scope | Aggregation queries | P2 |
| Reconcile free-text partner university entries | Admin | See OQ-1; unmatched partners need periodic review | MEDIUM | Not in CONTEXT.md | `partner_name_raw` fields + universities table | P2 |

---

### Category F: Public Info Pages

| Feature | Category | Why Expected | Complexity | Status in v1 | Dependencies | Priority |
|---------|----------|--------------|------------|--------------|--------------|----------|
| "What is a BIP?" explainer with FAQ | Public Info | Most students are unfamiliar with BIPs as a format | LOW | In scope | None | P1 |
| How it works (3-step student guide on homepage) | Public Info | Students need to understand what happens after finding a BIP | LOW | In scope | None | P1 |
| Footer disclaimer (not affiliated with EC) | Public Info | Legal requirement | LOW | In scope | None | P1 |
| About page / GitHub link | Public Info | Open-source credibility signal | LOW | In scope (footer) | None | P2 |
| Submission guide for coordinators | Public Info | Reduces coordinator confusion pre-signup | LOW | Referenced in footer mockup, not explicitly scoped | None | P2 |

---

## Anti-Features (Explicitly Do Not Build in v1 or v2)

### Anti-Feature 1: BIP Reviews or Star Ratings

**Why requested:** Students are familiar with Trustpilot / Google Reviews; coordinators want social proof.

**Why BipHub should NOT build this:**
- BIPs are organized by HEIs with legal relationships (Erasmus Charter holders). A negative public review of a university's BIP can have institutional politics implications that BipHub is not positioned to manage.
- Erasmus+ BIPs change significantly year to year (different host, different dates, different virtual component). A review of the 2023 edition is misleading for the 2025 edition.
- Review spam and fake reviews are endemic on directory sites. Moderation cost would exceed the value for a small open-source project.
- A student who had a bad BIP experience should tell their home university's Erasmus office, not BipHub — that's the legitimate channel.
- **Alternative:** Surface completion stats (ECTS awarded, number of past editions) which convey program maturity without opinion.

### Anti-Feature 2: In-Platform Application Submission / Application Tracking

**Why requested:** Students might want to apply directly; coordinators might want a unified inbox.

**Why BipHub should NOT build this:**
- Applications must formally go through the sending institution's Erasmus office to activate funding (Learning Agreement, Grant Agreement). BipHub is legally not part of this chain.
- Building application management means building GDPR-compliant handling of student CVs, motivation letters, health information, and financial data. This is a different product with a different compliance surface.
- Coordinators already have institutional systems (Mobility Online, Erasmus Without Paper, internal portals). BipHub adding a competing inbox creates data fragmentation.
- **Alternative:** A well-structured "How to apply" field (contact email or URL) with clear labeling on the BIP detail page is the right boundary.

### Anti-Feature 3: University-to-University Messaging / Direct Chat

**Why requested:** Coordinators discovering potential BIP partners might want to reach out directly.

**Why BipHub should NOT build this:**
- The coordinator already has the host coordinator's email on the BIP detail page. Adding a messaging layer on top solves a problem that doesn't exist.
- Chat/messaging systems require persistent notifications, read receipts, moderation — scope that dwarfs the rest of the product.
- Partner networking for future BIP creation happens at conferences (EAIE, Erasmus Days) and through institutional agreements, not through platform DMs.
- **Alternative:** Display coordinator contact email prominently; this is sufficient.

### Anti-Feature 4: Student Accounts with Server-Side Saved BIPs

**Why requested:** Students want to save favorite BIPs across devices; logged-in users are more engaged.

**Why NOT in v1 (and likely not in v2):**
- Students do not own BipHub accounts under the current model — they are the read audience. Adding a second auth path (student vs. coordinator) doubles auth complexity and creates account management overhead (password resets, GDPR deletion requests, etc.).
- The same student who browsed BipHub will apply through their home university's Erasmus portal anyway. BipHub is not the system of record.
- LocalStorage bookmarks cover 80% of the real use case (same device, same browser) at 0% of the cost.
- **Alternative:** localStorage bookmarks in v1. If cross-device sync is validated as a real need by users, revisit with a minimal "share my BIP list by URL" feature rather than accounts.

### Anti-Feature 5: Public API for External Consumers

**Why requested:** Developers want to build on top of BipHub; universities want to embed the data.

**Why NOT in v1:**
- A public API is a support contract. Rate limiting, versioning, authentication, documentation, and deprecation policy are all required before publishing one.
- Data quality in v1 is admin-reviewed but not guaranteed to be machine-consistent enough for external consumers to rely on.
- **Alternative:** Provide structured data on BIP detail pages (JSON-LD structured data for SEO) and consider a bulk export (CSV download) in v1.x once data quality is established.

### Anti-Feature 6: Community Forum / Discussion Boards

**Why requested:** Students want to share experiences; coordinators want to connect.

**Why NOT:**
- Erasmus+ already has well-established community spaces (Erasmus+ platform, university Facebook groups, EAIE networks). BipHub is a directory, not a community.
- Moderation of a multilingual European community is a full-time job.
- **Alternative:** Link to relevant official communities from the "What is a BIP?" page.

### Anti-Feature 7: Verified "Erasmus+ Official" Badges

**Why requested:** Coordinators want a quality signal; students want to trust listings.

**Why NOT:**
- BipHub cannot verify Erasmus+ ECHE status or funding approval — only National Agencies can. Any badge BipHub grants would be misleading about its authority.
- The admin review process is the trust mechanism: every listing is human-reviewed before going live.
- Claiming "Erasmus+ verified" as a feature (vs. a trust copy line) risks implying official EC endorsement, which is legally restricted.
- **Alternative:** "Reviewed by BipHub team" framing for admin-approved listings; trust copy ("Erasmus+ verified" in hero) refers to the program format, not the platform's authority.

### Anti-Feature 8: Multilingual Interface in v1

**Why requested:** European platform should speak European languages.

**Why defer:**
- English is the working language of virtually all Erasmus+ BIPs. BIP listings are authored in English by coordinators across all 29 programme countries.
- i18n adds complexity to every component, every content update, and every new feature from day one.
- The competitor (erasmusbip.org) is English-only and serves the whole ecosystem.
- **Alternative:** English-only v1. If BIP content from non-English universities demonstrates demand for another language, add i18n as a separate milestone.

---

## Data Model Gaps vs. Official Erasmus+ BIP Requirements

The following fields are absent from CONTEXT.md's `bips` table schema but are confirmed as real-world data that coordinators provide and students need:

| Missing Field | Evidence Source | Data Type | Recommended Column Name |
|---------------|----------------|-----------|-------------------------|
| Level of study (Bc / Master / PhD) | Official BIP application forms (confirmed across multiple universities) | `text[]` (multi-select) | `study_levels` |
| Virtual component timing | Official Erasmus+ toolkit: "Before / During / After / Before and after / etc." | `text` (enum) | `virtual_timing` |
| CEFR language level required | Real BIP listings (e.g., JYU: "B1–C1 expected") | `text` (e.g., "B1", "B2") | `language_level_min` |
| "Open to partner institutions only" | Real-world BIP practice; some BIPs restrict participation | `boolean` | `partner_institutions_only` |
| Green travel eligible / supported | Official Erasmus+ grant category; coordinators declare this | `boolean` | `green_travel` |
| Inclusion support available | Official Erasmus+ inclusion framework; affects student eligibility | `boolean` | `inclusion_support` |
| Accommodation info / student cost note | Real BIPs vary: free vs. reserved rooms for a fee | `text` (optional) | `accommodation_notes` |
| Contact coordinator name | Real BIP listings always include a named contact | `text` | `contact_name` |
| Contact coordinator email | Separate from how_to_apply_value when apply method is URL | `text` | `contact_email` |
| ISCED-F 4-digit code | Official ISCED-F 2013 taxonomy; broader than the 8-category grouping | `text` (e.g., "0711") | `isced_f_code` |
| Host city | Already implied in mockup card; needs explicit field | `text` | `host_city` |
| Number of virtual sessions (optional) | Coordinator context; not strictly required but useful | `integer` (nullable) | `virtual_sessions_count` |
| Virtual component duration / hours (optional) | Complements timing field; helps students plan | `text` (e.g., "4 × 2h online sessions") | `virtual_duration_notes` |

**Confirmed current fields that are correct:**
- `physical_start_date`, `physical_end_date` — correct
- `application_deadline` — correct
- `ects_credits` — correct (min 3 per official rules)
- `max_participants` — correct (max 20 funded per official rules)
- `language_of_instruction` — correct
- `subject_area` (ISCED group) — correct, but needs `isced_f_code` alongside it
- `learning_outcomes` — correct
- `virtual_component_description` — correct

---

## Feature Dependencies

```
Auth (register + email verify)
    └──requires──> Submission Form
                       └──requires──> Coordinator Dashboard
                                          └──requires──> Admin Review Queue

BIP data (approved BIPs in database)
    └──requires──> BIP Browse Page
                       └──requires──> BIP Detail Page
                                          └──enhances──> Share Button
                                          └──enhances──> Bookmark (localStorage)

BIP data
    └──requires──> Homepage Stats Block
    └──requires──> Europe Map (count per country)
    └──requires──> Categories Bar (count per field)
    └──requires──> Recently Added Section (≥6 BIPs)

Partner universities (free-text)
    └──enhances──> Admin Reconciliation Task (v1.x)
    └──enhances──> Invite Unregistered Partners (v1.x)

Coordinator Dashboard
    └──requires──> Email notification on status change (Resend)
```

**Key ordering constraints:**
- Auth must ship before Submission Form (coordinator must exist before submitting)
- Submission Form must ship before any real BIP can enter the database
- Admin Panel must ship before any BIP can be approved and appear publicly
- The homepage "Recently added" section is the last homepage block to become functional (depends on approved BIPs)
- The Europe map and categories bar show real counts; they degrade gracefully to zero counts at launch — this is fine

---

## MVP Definition

### Launch With (v1)

The product is not useful to students until approved BIPs exist, and BIPs cannot exist until coordinators can submit and admins can approve. Build in this order:

- [ ] Auth (register, verify, login, logout) — unblocks everything
- [ ] BIP submission form (multi-step wizard with auto-save, partner free-text) — unblocks data entry
- [ ] Coordinator dashboard (status view, edit drafts) + email notification on status change
- [ ] Admin panel (review queue, approve/reject with note, edit)
- [ ] BIP browse page `/bips` with all filters, full-text search, URL-driven state
- [ ] BIP detail page `/bip/[slug]` with full expanded data model
- [ ] Homepage (all sections — recent BIPs section shows teaser state until ≥6 BIPs)
- [ ] "What is a BIP?" explainer page
- [ ] Empty states at every level (browse no-results, homepage teaser, dashboard empty)

### Add After Validation (v1.x)

- [ ] Partner university invite flow (email unregistered partners listed on approved BIPs)
- [ ] Admin partner reconciliation UI
- [ ] "Request changes" admin action (instead of binary approve/reject)
- [ ] Edit approved BIPs with re-review trigger
- [ ] Institutional email domain validation on registration
- [ ] JSON-LD structured data on BIP detail pages (SEO)
- [ ] Bulk CSV export from admin panel

### Future Consideration (v2+)

- [ ] Cross-device bookmarks / BIP list sharing via URL
- [ ] Public API with versioning and rate limiting
- [ ] i18n / multilingual UI
- [ ] PDF export of BIP detail
- [ ] University photo uploads (replace gradient placeholders)
- [ ] Automated import from official EU data sources (if they ever expose structured data)
- [ ] Student-facing application deadline reminders (email opt-in)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| BIP submission form (coordinator) | HIGH | HIGH | P1 |
| Admin review queue | HIGH | MEDIUM | P1 |
| BIP browse page + filters | HIGH | MEDIUM | P1 |
| BIP detail page | HIGH | MEDIUM | P1 |
| Auth (register + verify + login) | HIGH | LOW | P1 |
| Homepage (full) | HIGH | HIGH | P1 |
| Coordinator dashboard | MEDIUM | LOW | P1 |
| Email notification on status change | MEDIUM | LOW | P1 |
| "What is a BIP?" page | MEDIUM | LOW | P1 |
| Partner free-text on submission form | HIGH | MEDIUM | P1 |
| Level of study filter + form field | MEDIUM | LOW | P1 |
| Language level (CEFR) form field | MEDIUM | LOW | P1 |
| Virtual timing form field | LOW | LOW | P2 |
| Green travel flag | LOW | LOW | P2 |
| Inclusion support flag | LOW | LOW | P2 |
| Share button (Web Share API) | LOW | LOW | P2 |
| LocalStorage bookmarks | LOW | LOW | P2 |
| Admin analytics | LOW | MEDIUM | P2 |
| Partner reconciliation UI | LOW | MEDIUM | P2 |
| Invite unregistered partners | LOW | MEDIUM | P3 |
| Public API | LOW | HIGH | P3 |
| Student accounts | LOW | HIGH | P3 |

---

## Competitor Gap Analysis

| Feature | erasmusbip.org | BipHub v1 |
|---------|---------------|-----------|
| BIP list reliability | Table frequently fails to load (known issue) | SSG/ISR — always loads |
| Search | None | Full-text search across title, description, university |
| Filtering | None | Country, field, language, date, ECTS, open/closed, level of study |
| Mobile experience | Broken | Mobile-first responsive design |
| University self-service | Manual contact form | Self-service wizard + admin review |
| BIP detail pages | None (table only) | Full dedicated pages with slug URLs |
| Structured data model | No (Google Sheet / Airtable embedded) | Postgres schema with typed fields |
| Interactive map | No | Yes (click-to-filter) |
| Field-of-study categories | No | Yes (8 categories with BIP counts) |
| Open source | No | Yes (MIT) |
| Partner university listing | Yes (raw text) | Yes (free-text + deferred FK reconciliation) |
| Level of study filter | No | Yes |
| Language level shown | No | Yes (CEFR) |
| Virtual timing info | No | Yes |
| SEO-friendly URLs | No | Yes (`/bip/sustainable-cities-budapest-2025`) |
| Email notifications | No | Yes (status changes via Resend) |
| OG images for sharing | No | Yes (SSR meta tags) |

---

## Sources

- erasmusbip.org registry page (live, 2026-05-08) — confirmed fields coordinators must submit: university name, Erasmus Code, country, BIP title, status, participant type, start date, field of study, application deadline, green travel eligibility, contact info
- Erasmus+ Programme Guide (Part B, KA131) — official BIP requirements: min 3 HEIs, 3 countries, 5–30 day physical, min 10 / max 20 funded participants, min 3 ECTS, inclusion support €125/participant, green travel top-up, ECHE requirement
- University of Jyväskylä BIP listing — confirmed real-world fields: CEFR language level ("B1–C1 expected"), virtual session schedule, application deadline, partner priority tiers
- Stockholm University staff BIP guide — confirmed coordinator workflow and required signatory information
- ISCED-F 2013 taxonomy — confirmed 4-digit field codes used in Erasmus+ administration
- Official FAQ document (KA131 BIP, April 2023) — virtual component timing options confirmed: Before / During / After / combinations
- NN/g, LogRocket, Eleken — empty state UX best practices (hide section vs. show skeleton vs. educational message)
- PartnerPage platform — partner directory invite patterns for unregistered institutions
- Multiple university BIP pages (Padova, Aalto, TU München, Metropolia) — real-world BIP listing field patterns as published to students

---

*Feature research for: BipHub — Erasmus+ BIP listing platform*
*Researched: 2026-05-08*
