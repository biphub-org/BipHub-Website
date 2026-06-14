# Feature Research

**Domain:** Public BIP/mobility-listing platform — Erasmus+ Blended Intensive Programs; subsequent milestone v1.1
**Researched:** 2026-06-14
**Confidence:** HIGH (gap analysis grounded in v1.0 shipped feature set + named comparable platforms); MEDIUM (student engagement specifics — Erasmus+ student behavior not directly measurable)

---

## Context: What v1.0 Already Ships (Do Not Rebuild)

These are DONE. Every candidate below is additive.

- Homepage: choropleth map, field categories, live stats, recent BIPs, how-it-works, footer disclaimer
- /bips: card grid, 7 filters (country, field, language, dates, ECTS, status, level), unaccent FTS, URL-shareable state, pagination
- /bip/[slug]: full detail, host + partner universities, share button, localStorage bookmarks, SSR meta + OG image
- /what-is-a-bip: explainer + FAQ; /privacy
- Coordinator: institutional-email auth + verification, 5-step submission wizard (auto-save, optimistic locking, preview), dashboard (status tabs, edit/withdraw/revise-resubmit)
- Admin: review queue, approve/reject + notes, listing edit, audit log, Resend email notifications, analytics dashboard

---

## Gap Analysis: What Mature Comparable Platforms Have That BipHub v1.0 Lacks

Platform comparators used: GoAbroad (study abroad program catalog), GoOverseas (study abroad wishlist + comparison), Eventbrite (event listing + coordinator analytics), Airbnb (host listing analytics + wishlist + edit workflow), LinkedIn Jobs (saved searches + alerts), Smart Job Board (email alerts + saved searches), Modern Campus CourseLeaf (course catalog comparison), TopUniversities (program comparison tool).

### Gaps Confirmed as Table Stakes on Comparable Platforms

| Gap | Evidence Platform(s) | v1.0 Status |
|-----|---------------------|-------------|
| Email alerts for new listings matching saved criteria | LinkedIn Jobs, Smart Job Board, GoAbroad, GoOverseas | Absent |
| Saved-search / saved-filter persistence (server-side) | Every job board, GoAbroad, GoOverseas | Absent (URL state only, not saved) |
| Cross-device bookmark sync | GoAbroad MyGoAbroad, GoOverseas Wish List, LinkedIn Jobs | localStorage only |
| Side-by-side program comparison | GoAbroad, GoOverseas, TopUniversities | Absent |
| Edit-approved-listing with re-review trigger | Airbnb, WPRentals, Facebook Marketplace, every marketplace | Absent (v1 deferred) |
| Coordinator listing performance metrics (views, clicks) | Airbnb Insights, LinkedIn Job post analytics, Eventbrite organizer dashboard | Absent |
| "Request changes" admin action (not binary approve/reject) | SharePoint/Microsoft approval workflows, Optimizely CMS, modern moderation systems | Absent (v1 noted as P2) |
| Partner university "claim your listing" / invite flow | PartnerStack, eDirectory, PartnerPage — standard growth loop | Absent (v1 explicitly deferred) |
| Admin bulk actions (bulk approve, bulk reject) | Wisetail, Drupal admin, every CMS moderation queue | Absent |
| Admin data export (CSV) | Standard table stakes on any admin panel | Absent |
| Shareable BIP shortlist / "my list" URL | GoOverseas comparison share, BipHub v1 itself suggested this as account alternative | Absent |
| Notification frequency preference (immediate vs. daily digest) | Courier, SuprSend, Smashing Magazine UX guidelines — standard alongside any email alert system | Not applicable without alerts |

### Gaps That Are Differentiators (Not Table Stakes) on Comparable Platforms

| Gap | Evidence | v1.0 Status |
|-----|----------|-------------|
| Magic-link / passwordless student auth (vs. no account) | Supabase native feature; Calendly 43%→71% registration lift; industry standard for low-engagement audiences | Absent |
| AI-powered BIP matching / recommendation ("Programs like this one") | Pinnaclyst, GoAbroad Online Advisor — emerging but not yet table stakes | Absent |
| Grant simulator (how much Erasmus+ funding would I receive) | Erasmus Generation Portal — unique to EU mobility domain | Absent |
| Green-travel badge prominence (visual on cards) | Erasmus+ official grant category; v1 has field but no UI prominence | Data present, UI weak |
| Inclusion-support badge (visual on cards) | Same as above | Data present, UI weak |

---

## Feature Landscape for v1.1

### Table Stakes (Missing From v1.0 — Users Expect These on Any Discovery Platform)

| Feature | Why Expected | Complexity | Dependencies on v1.0 | v1.1 Candidate? |
|---------|--------------|------------|----------------------|-----------------|
| Server-side student accounts (magic-link auth) | Cross-device bookmarks require an identity. Every major opportunity platform has accounts. Supabase Auth already built; adding student role is incremental. | M | Supabase Auth (coordinator auth already exists) | YES — enables all below |
| Saved-BIP sync across devices | GoAbroad MyGoAbroad, GoOverseas Wish List — students expect their shortlist to persist. localStorage is a workaround, not a solution. | S | Student accounts | YES |
| Email alerts for new BIPs matching saved field/country | Smart Job Board, LinkedIn Jobs, GoAbroad — the defining engagement hook on every opportunity platform. Without it, there is no reason for a student to give their email. | M | Student accounts + Resend (already integrated) | YES |
| Notification frequency preference (immediate vs. weekly digest) | Standard UX requirement alongside any alert system. Binary "alert or no alert" is not sufficient; students need digest control to avoid unsubscribing. | S | Email alert system | YES — bundle with alerts |
| Edit-approved-BIP with re-review trigger | Dates change. Contact emails change. BIP descriptions need corrections. No edit path = coordinator must withdraw and resubmit; churn risk. Standard pattern on Airbnb, WPRentals, every marketplace. | M | Coordinator dashboard + Admin review queue | YES |
| Admin CSV export of all BIPs | Every admin panel on any listing platform has data export. Admins need this for reporting, outreach, and seed data for partner universities. | S | Admin analytics (already exists) | YES |
| "Request changes" admin action (third moderation state) | Modern moderation flows (Microsoft approval workflows, Optimizely CMS, Drupal content moderation) all support a "needs revision" state. Binary approve/reject forces full resubmissions for minor corrections — coordinator churn. | M | Admin review queue + Resend | YES |

### Differentiators (Valuable, Not Universally Expected — BipHub-Specific Wins)

| Feature | Value Proposition | Complexity | Dependencies on v1.0 | v1.1 Candidate? |
|---------|-------------------|------------|----------------------|-----------------|
| Side-by-side BIP comparison (up to 3 BIPs) | GoAbroad has it, GoOverseas has it, TopUniversities has it. BipHub's niche is exactly "help students choose between BIPs." Comparison differentiates from erasmusbip.org by a mile. | M | /bip/[slug] detail + BIP data model | YES |
| Shareable BIP shortlist URL (no account required) | Students already share opportunities with classmates. A /list?ids=abc,def,ghi URL lets them do this without any signup. Previewed in v1 research as account alternative; can coexist with accounts. | S | localStorage bookmarks (existing) | YES — low cost, high signal |
| Coordinator listing performance metrics (views, impressions) | Airbnb gives hosts: search impressions, page views, wishlist adds. Coordinators who can see "your BIP was viewed 47 times this week" are retained coordinators. Cost is low (page-view counter on approved BIPs). | S | Admin analytics (server already counts) + coordinator dashboard | YES |
| Partner university invite/claim flow | "You were listed as a partner on [BIP Title] at BipHub — claim your university profile." Classic growth loop. eDirectory, PartnerStack use this pattern. Converts listed-partner-universities into registered coordinators without ad spend. | M | Approved BIP data + university registration + Resend | YES |
| Green-travel + inclusion-support visual badges on cards | Data fields exist but are buried. Surfacing them as visible badges on /bips cards is a zero-schema-change differentiator that signals EU-value alignment. | S | Existing data fields (`green_travel`, `inclusion_support`) | YES |
| Institutional email domain validation on registration | Was a v1.x item. Reduces spam coordinator accounts. Matched against known .edu / .ac.xx domain patterns. | M | Coordinator auth (existing) | MAYBE — depends on coordinator volume |

### Anti-Features (Do Not Build — Commonly Requested But Wrong for BipHub)

| Feature | Why Requested | Why Not for BipHub | Alternative |
|---------|---------------|---------------------|-------------|
| BIP reviews and star ratings | Students familiar with Trustpilot; coordinators want social proof | BIPs are institutionally-linked programs with legal standing. A negative review of a university's BIP has institutional politics implications BipHub cannot manage. BIPs change annually so past reviews mislead. Spam/fake reviews would require moderation BipHub cannot sustain. | Surface number of past editions and ECTS completion count as program-maturity signals |
| In-platform application submission / application tracking | Students want to apply directly; coordinators want a unified inbox | Applications must formally go through the sending institution's Erasmus office to activate funding (Learning Agreement, Grant Agreement). BipHub is legally not in this chain. Handling CVs, motivation letters, health data = entirely different GDPR compliance surface. | Well-structured "How to apply" field (contact email or URL) is the correct boundary |
| University-to-university messaging / direct chat | Coordinators discovering potential BIP partners want to reach out | The coordinator already has the host coordinator's email on the BIP detail page. Chat/messaging requires persistent notifications, read receipts, moderation — scope that dwarfs the product. Partner networking happens at EAIE/Erasmus Days, not through platform DMs. | Display coordinator contact email prominently |
| AI-powered BIP matching / recommendations | Modern platforms have AI; users expect personalization | Premature at current BIP volume. At <500 BIPs, manual filters outperform ML matching. Recommendation quality requires user behavior data (clicks, saves) that doesn't exist yet. Building AI recommendations before behavioral data = pseudoscience. | High-quality filters + comparison tool is the right answer at this scale |
| Multilingual interface (UI in multiple EU languages) | European platform should speak European languages | English is the working language of virtually all BIPs. i18n adds complexity to every component and every future feature. Erasmusbip.org is English-only and serves the whole ecosystem. No evidence of demand. | English-only through v1.x; revisit if non-English-speaking coordinator volume grows |
| Public API for external consumers | Developers want to build on BipHub data; universities want to embed | A public API is a support contract (versioning, rate limiting, auth, documentation, deprecation). Data quality not yet guaranteed machine-consistent. No external consumers exist yet. | JSON-LD structured data on BIP detail pages for SEO; bulk CSV export from admin panel is the right interim data access path |
| Community forum / discussion boards | Students want to share experiences; coordinators want to connect | EU already has established community spaces (Erasmus+ platform, EAIE, ESN). Moderating a multilingual European community is a full-time job. BipHub is a directory, not a community. | Link to official communities from /what-is-a-bip |
| Push notifications (browser / mobile PWA) | More engaging than email | BipHub is not a daily-use app; push notifications from an infrequently-visited directory would immediately be denied by users. Email is the correct channel for a low-frequency engagement pattern. | Email digest is the correct notification channel |
| Grant simulator (how much Erasmus+ funding would I get) | Erasmus Generation Portal has this; students care about cost | Grant amounts are set by National Agencies and change annually. BipHub cannot maintain accurate grant tables for 29 programme countries. A wrong simulator is worse than no simulator. | Link to official Erasmus+ grant calculator; display "green travel top-up available" badge where applicable |

---

## Feature Candidates Grouped by Audience (v1.1 Scoping View)

### Workstream 1: Student Value (New Audience Capability)

**Goal:** Give students a reason to create an account and return to BipHub.

| Candidate Feature | Classification | Complexity | Dependency |
|------------------|----------------|------------|------------|
| Student account creation via magic link (passwordless email) | Table stakes (for cross-device) | M | Supabase Auth (existing), new `students` role/profile table |
| Saved-BIP sync to server-side account | Table stakes | S | Student accounts |
| Email alerts: new BIPs matching saved field + country criteria | Table stakes | M | Student accounts + Resend (existing) |
| Notification frequency preference (immediate / weekly digest) | Table stakes (alongside alerts) | S | Email alert system |
| Shareable BIP shortlist URL (no account required) | Differentiator | S | localStorage bookmarks (existing) + URL encoding |
| Side-by-side BIP comparison (up to 3 BIPs) | Differentiator | M | /bip/[slug] data (existing) |

**User behavior pattern (informed by GoAbroad, GoOverseas, LinkedIn Jobs):**
A typical student: discovers BipHub via Google → browses /bips with field+country filters → opens 2-3 BIP detail pages → bookmarks favorites → leaves. Without alerts, they never return. The re-engagement loop is: save search criteria → receive weekly digest "3 new BIPs in Sustainable Engineering" → click back to BipHub → apply. This loop requires: (a) account or email capture, (b) stored filter criteria, (c) Resend-triggered digest.

Magic link is the right auth pattern for students. They are low-frequency users (one session every few weeks during application season). Password-based auth has ~40% abandonment at password-creation step (Calendly data). Magic link sends a one-time URL to their student email — zero password, zero friction, and the email address itself becomes the notification channel.

### Workstream 2: Coordinator / Admin UX (Existing Audience Deepening)

**Goal:** Reduce coordinator churn and admin friction for the flows that maintain BIP data quality.

| Candidate Feature | Classification | Complexity | Dependency |
|------------------|----------------|------------|------------|
| Edit-approved-BIP with re-review trigger | Table stakes | M | Coordinator dashboard (existing) + admin review queue (existing); needs status state machine update |
| "Request changes" admin action (third moderation state: draft → pending → changes_requested → pending → approved) | Table stakes | M | Admin review queue (existing) + Resend (existing); needs new status enum value + coordinator notification |
| Coordinator listing performance metrics (view count, saves count) | Differentiator | S | Coordinator dashboard (existing); needs page-view counter on approved BIP pages |
| Admin bulk actions: bulk approve, bulk reject with shared note | Table stakes (admin productivity) | M | Admin review queue (existing); needs multi-select UI |
| Admin CSV export (all BIPs with all fields) | Table stakes (admin productivity) | S | Admin analytics (existing); server action streaming CSV |
| Partner university invite/claim flow | Differentiator | M | Approved BIP data (existing) + university registration flow (existing) + Resend (existing) |

**User behavior pattern (edit-approved-BIP):**
Standard pattern: coordinator submits → admin approves → BIP goes live → coordinator discovers a date error or updated contact email → currently has no path except full withdraw + re-submit. Expected: coordinator clicks "Edit listing" → changes status to `changes_pending` → listing stays live until admin approves changes (or admin can hide during review — configurable). Admin sees "1 BIP with pending changes" in queue. This matches the WPRentals and Airbnb host listing edit pattern.

**User behavior pattern ("request changes"):**
Admin reviews BIP → sees title is misleading but content is fine → instead of rejecting (forces full resubmit), clicks "Request changes" → writes specific note "Please rename to include host city" → coordinator receives email "Your BIP has been returned for revisions: [admin note]" → coordinator edits + resubmits → admin reviews again. This is the Microsoft/SharePoint "request revision" pattern and reduces coordinator abandonment on first rejection.

### Workstream 3: Gap-Fill (Platform Completeness)

**Goal:** Close the specific table-stakes gaps that make BipHub feel incomplete vs. comparable platforms.

| Candidate Feature | Classification | Complexity | Dependency |
|------------------|----------------|------------|------------|
| Green-travel + inclusion-support visual badges on /bips cards | Differentiator | S | Existing data fields in schema; UI-only change |
| Shareable BIP shortlist URL (no account) | Differentiator | S | localStorage bookmarks (existing) + URL serialization |
| Admin partner reconciliation UI (match `partner_name_raw` to registered universities) | Table stakes (data quality) | M | `bip_partner_universities` `partner_name_raw` column (v1 data model) |
| Institutional email domain validation on coordinator registration | Table stakes (trust/quality) | M | Coordinator auth (existing); needs domain allowlist logic |
| JSON-LD structured data on /bip/[slug] (Course schema or Event schema) | Table stakes (SEO) | S | BIP detail page (existing); structured data markup only |

---

## Feature Dependencies for v1.1

```
Student accounts (magic-link auth)
    └──enables──> Saved-BIP server-side sync
    └──enables──> Email alerts (new BIPs matching criteria)
                      └──requires──> Notification frequency preference
                      └──requires──> Resend (already integrated)

Saved-BIP sync
    └──enhances──> Shareable shortlist URL (works with or without accounts)

Edit-approved-BIP
    └──requires──> Status state machine update (adds `changes_pending` state)
    └──requires──> Admin review queue (existing, sees change requests)
    └──triggers──> Resend notification to admin (existing email path)

"Request changes" admin action
    └──requires──> New status enum value (`changes_requested`)
    └──triggers──> Resend coordinator notification (existing email path)
    └──enables──> Coordinator revise-and-resubmit (existing dashboard path)

Coordinator listing performance metrics
    └──requires──> Page-view counter on approved BIP detail pages
    └──displays in──> Coordinator dashboard (existing)

Admin bulk actions
    └──requires──> Admin review queue (existing)
    └──extends with──> Multi-select + batch status update

Admin CSV export
    └──reads from──> `bips` table (existing)
    └──streams via──> Server Action (Next.js 15 streaming pattern)

Partner invite/claim flow
    └──reads──> Approved BIP partner_name_raw data (existing)
    └──requires──> Resend (existing)
    └──resolves into──> University registration flow (existing)
    └──enhances──> Admin partner reconciliation UI
```

### Dependency Order for Roadmap

1. Student accounts must precede saved-BIP sync and email alerts (they are the identity layer)
2. Status state machine update (add `changes_pending`, `changes_requested`) must precede edit-approved-BIP AND "request changes" — they share the schema change
3. Admin CSV export and bulk actions are independent — can be in any phase
4. Coordinator listing metrics, green-travel badges, shareable shortlist URL, and JSON-LD are all independent, can be bundled into a "polish" phase

---

## Feature Prioritization Matrix for v1.1

| Feature | User Value | Implementation Cost | Priority | Workstream |
|---------|------------|---------------------|----------|------------|
| Email alerts (new BIPs matching saved criteria) | HIGH | M | P1 | Student |
| Student accounts (magic-link auth) | HIGH | M | P1 | Student — prerequisite for alerts |
| Edit-approved-BIP with re-review | HIGH | M | P1 | Coordinator |
| "Request changes" admin action | HIGH | M | P1 | Admin |
| Saved-BIP server-side sync | MEDIUM | S | P1 | Student |
| Notification frequency preference | MEDIUM | S | P1 | Student — bundle with alerts |
| Admin CSV export | MEDIUM | S | P1 | Admin |
| Side-by-side BIP comparison | HIGH | M | P2 | Student / Gap-fill |
| Admin bulk approve/reject | MEDIUM | M | P2 | Admin |
| Coordinator listing performance metrics | MEDIUM | S | P2 | Coordinator |
| Shareable BIP shortlist URL | MEDIUM | S | P2 | Gap-fill |
| Green-travel + inclusion badges on cards | MEDIUM | S | P2 | Gap-fill |
| Partner university invite/claim flow | HIGH (growth) | M | P2 | Gap-fill |
| Admin partner reconciliation UI | LOW | M | P3 | Gap-fill |
| JSON-LD structured data on BIP detail | MEDIUM (SEO) | S | P2 | Gap-fill |
| Institutional email domain validation | LOW-MEDIUM | M | P3 | Gap-fill |

---

## Comparable Platform Feature Analysis

| Feature | GoAbroad | GoOverseas | Eventbrite (organizer) | Airbnb (host) | LinkedIn Jobs (user) | BipHub v1.0 |
|---------|----------|------------|------------------------|---------------|----------------------|-------------|
| Saved/bookmarked programs | YES (MyGoAbroad) | YES (Wish List) | YES (interests) | YES (Wishlist) | YES (Saved Jobs) | localStorage only |
| Email alerts for new matches | YES | YES | YES (event reminders) | YES (price alerts) | YES (job alerts) | NO |
| Notification frequency control | YES | PARTIAL | YES | YES | YES (daily/weekly) | N/A |
| Cross-device sync of saved items | YES (account) | YES (account) | YES (account) | YES (account) | YES (account) | NO |
| Side-by-side comparison | YES (up to 3) | YES (wishlist compare) | NO | NO | NO | NO |
| Shareable shortlist URL | YES | PARTIAL | YES (event share) | YES (Wishlist share) | PARTIAL | NO |
| Coordinator/organizer analytics | N/A | N/A | YES (views, sales, conversion) | YES (search impressions, page views, wishlist adds) | YES (post analytics) | NO |
| Edit approved listing | YES | YES | YES | YES | YES | NO (v1 deferred) |
| Admin "request changes" state | N/A | N/A | N/A | YES (review flagging) | N/A | NO |
| Bulk admin actions | N/A | N/A | YES | YES (multi-listing) | N/A | NO |
| Data export (CSV) | YES | PARTIAL | YES | YES | YES | NO |
| Partner/provider invite flow | N/A | N/A | YES (co-hosts) | YES (co-host invite) | YES (company page) | NO (v1 deferred) |

---

## MVP Definition for v1.1

### Must Ship (v1.1 — unlocks return engagement and coordinator retention)

- [ ] Student accounts (magic-link auth) — prerequisite for everything below
- [ ] Saved-BIP sync to server-side account (migrate localStorage bookmarks on first sign-in)
- [ ] Email alerts for new BIPs matching saved field + country (with frequency preference: immediate or weekly digest)
- [ ] Edit-approved-BIP with re-review trigger (status: `changes_pending`)
- [ ] "Request changes" admin action (status: `changes_requested` + coordinator notified by email)
- [ ] Admin CSV export
- [ ] JSON-LD structured data on /bip/[slug] — SEO table stake, S-complexity, high leverage

### Should Ship in v1.1 (high value, manageable scope)

- [ ] Side-by-side BIP comparison (up to 3 BIPs, modal or dedicated /compare route)
- [ ] Shareable BIP shortlist URL (no account required, localStorage → URL serialization)
- [ ] Coordinator listing performance metrics (view count, save count on coordinator dashboard)
- [ ] Green-travel + inclusion-support badges on /bips cards (UI-only, data already in schema)
- [ ] Admin bulk approve / bulk reject with shared note

### Defer to v1.2 or Later

- [ ] Partner university invite/claim flow — growth lever, higher coordination cost; better after coordinator base is larger
- [ ] Admin partner reconciliation UI — operational, not user-facing; defer until coordinator volume grows
- [ ] Institutional email domain validation — moderate complexity, manual admin review is still sufficient quality gate
- [ ] AI-powered BIP matching — no behavioral data exists yet; premature

---

## Sources

- GoAbroad.com — MyGoAbroad features: saved programs, comparison, matching (verified via WebFetch 2026-06-14)
- GoAbroad article "11 Things to Look for When Comparing Study Abroad Programs" — comparison tool pattern (verified via WebFetch 2026-06-14)
- Smart Job Board product features page — email alerts, saved searches, candidate profiles as table stakes (verified via WebSearch 2026-06-14)
- Airbnb Insights / Autorank / RankBreeze — host analytics: search impressions, page views, wishlist adds confirmed metrics (verified via WebSearch 2026-06-14)
- WPRentals listing moderation docs — edit-approved-listing sends to Pending for re-review; confirmed pattern (verified via WebSearch 2026-06-14)
- SuprSend / Courier / Smashing Magazine — notification frequency preference UX best practices (verified via WebSearch 2026-06-14)
- Supabase magic link docs — passwordless auth native feature, low-friction for low-frequency users (confirmed via WebSearch 2026-06-14)
- Calendly case study — 43%→71% registration completion with magic links vs. password creation (cited in SuperTokens blog, verified via WebSearch 2026-06-14)
- Microsoft / SharePoint approval workflows — "request changes" as third moderation state alongside approve/reject (verified via WebSearch 2026-06-14)
- Wisetail / Drupal / Veeva Vault — bulk admin actions pattern for moderation queues (verified via WebSearch 2026-06-14)
- Erasmus Generation Portal — grant simulator as differentiated feature; BipHub cannot replicate due to annual country-specific grant tables (verified via WebSearch 2026-06-14)
- Pinnaclyst.net — AI-powered opportunity matching; evidence that AI matching is emerging but not table stakes at sub-500-listing scale (verified via WebSearch 2026-06-14)
- Modern Campus CourseLeaf — university course catalog comparison and filtering as expected features (verified via WebSearch 2026-06-14)
- eDirectory "Claim Your Listing" — partner invite/claim as growth loop pattern for directory platforms (verified via WebSearch 2026-06-14)
- BipHub v1.0-research/FEATURES.md — prior feature research; gap analysis builds on this (internal, 2026-05-08)
- PROJECT.md v1.1 milestone context — target feature workstreams (internal, 2026-06-14)

---

*Feature research for: BipHub v1.1 Product Depth & Engagement*
*Researched: 2026-06-14*
