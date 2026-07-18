# Feature Research

**Domain:** Erasmus+ BIP directory — v1.2 milestone: complete coordinator BIP builder, redesign BIP detail page, ship carried-forward alert subscriptions
**Researched:** 2026-07-18
**Confidence:** HIGH (builder/detail-page gap analysis — grounded directly in live schema, wizard code, and rendered components); HIGH (alert pipeline mechanics — carried from v1.1 research, Supabase/Resend docs, re-verified against current migrations); MEDIUM (external "what makes a program listing good" benchmarks — WebSearch-verified, no single authoritative source for EU short-mobility format specifically)

This file does **not** re-litigate what v1.0/v1.1 already shipped (see `.planning/milestones/v1.1-research/FEATURES.md` for that gap analysis — most of it is now closed). Everything below is scoped to the three v1.2 workstreams.

---

## Ground Truth: The Builder/Detail-Page Gap Is Concrete, Not Speculative

Before any external benchmarking, direct inspection of the codebase found that the `bips` table (`supabase/migrations/00003_bips_full_schema.sql`, confirmed live in `lib/supabase/database.types.ts`) already has **four columns that are dead on arrival** — present in the schema, absent from the coordinator wizard (`lib/schemas/bip-wizard.ts`, `components/forms/steps/*`), and absent from the public detail page (`components/bip/BipHeader.tsx`, `BipBody.tsx`, `BipSidebar.tsx`):

| Column | Type | Wizard collects it? | Detail page renders it? | What it's for |
|--------|------|---------------------|--------------------------|----------------|
| `virtual_sessions_count` | integer | No | No | How many virtual sessions make up the compulsory online component |
| `virtual_duration_notes` | text | No | No | Free-text on session length/cadence (e.g. "6 sessions × 2 hours, weekly") |
| `accommodation_notes` | text | No | No | Practical logistics — where students stay, roughly what it costs |
| `partner_institutions_only` | boolean | No | No | Whether the BIP is closed to non-partner-institution applicants |

`partner_institutions_only` is the most consequential of the four: without it, a student browsing `/bips` has no way to know a listing is closed to them until they email the coordinator and get told no. This is a real trust/quality problem, not a cosmetic one — it is exactly the kind of gap that made the competitor (erasmusbip.org) feel broken.

There is also a **live data-integrity bug**, not just a missing field: `step2Schema`'s `VIRTUAL_TIMINGS` enum is `['before', 'after', 'concurrent']`, but the database CHECK constraint on `bips.virtual_timing` only permits `('before', 'during', 'after', 'before_and_after', 'mixed')`. `'concurrent'` is not a valid DB value. Any coordinator who selects "concurrent" in the wizard will have their submission rejected by the CHECK constraint at save time (silent failure surfaced only as a generic save error, since `saveDraftAction`/`submitBipAction` don't map CHECK violations to field-level messages). This must be reconciled — either widen the wizard enum to match the DB's five values (recommended: DB values are the more complete/correct set for how virtual components actually run) or narrow the DB CHECK to match the wizard (loses "during," which is the most common real-world BIP virtual-component pattern — not recommended).

There is a second, lower-severity mismatch: `step2Schema.max_participants` enforces `min(5).max(20)`, but the DB CHECK allows `1–30`, and `CLAUDE.md`/`PROJECT.md` state the actual Erasmus+ domain rule is **min 10 / max 20**. The wizard's floor of 5 is neither the DB's floor (1) nor the domain rule's floor (10) — it should be corrected to 10 as part of "completing the builder," since this is a domain-fidelity bug, not a design choice.

**Implication for v1.2 requirements:** "Complete the BIP builder" is not purely a net-new-fields exercise — a nontrivial share of the work is *closing the gap between the schema that already exists and the UI that exposes it*, plus fixing the two mismatches above. This should be sequenced before any new-field work, since new fields extending a wizard that already has an enum/constraint drift bug compound the same class of error.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Wire `virtual_sessions_count` + `virtual_duration_notes` into wizard Step 2 and render on detail page | External research on program pages consistently flags "contact hours / how workload translates to credits" as core academic information students use to judge time commitment (Carnegie Mellon, NAFSA short-term program guides). BipHub already modeled this in schema; it is simply unbuilt. | LOW | Additive to Step 2's virtual-component fields; no new migration needed |
| Wire `partner_institutions_only` into wizard Step 4 (or Step 2) and surface a visible badge/notice on the detail page and `/bips` card | Prevents students from wasting time on listings they cannot apply to — a discovery-quality issue, and BipHub's core value prop is reliable discovery. | LOW | Boolean already exists; needs a checkbox + a conditional "Open to [host university] partner institutions only" notice near "Who can apply" |
| Wire `accommodation_notes` into wizard Step 4 and render as a "Practical information" block on the detail page | External research: "know what's included in program costs," "housing, meals, excursions" are named as decision-critical, absence-penalized information on comparable study-abroad program pages. Do NOT turn this into a cost calculator (that's the anti-feature, see below) — a free-text logistics note is the correct-sized version. | LOW | Consider renaming the rendered label to "Practical information" (accommodation + rough cost expectations + visa/travel notes) rather than narrowly "Accommodation," since the column can carry all three without a schema change |
| Fix `virtual_timing` enum mismatch between wizard and DB CHECK constraint | Currently a live bug: selecting "concurrent" fails silently at save. Must ship before any other Step 2 changes to avoid stacking new fields on a known-broken validator. | LOW | Widen wizard enum to the DB's five values (`before`, `during`, `after`, `before_and_after`, `mixed`); update `fullBipSchema` in the same change (per the file's own "keep in sync" comment) |
| Fix `max_participants` floor (5 → 10) to match the documented Erasmus+ domain rule | CLAUDE.md and PROJECT.md both state min 10 / max 20 as the funding-eligibility rule. A wizard that permits 5 lets coordinators submit non-compliant BIPs. | LOW | One-line Zod bound change in `step2Schema` and `fullBipSchema` |
| Green-travel / inclusion-support badges rendered on the public detail page | Carried forward, unresolved gap from v1.1 research (flagged then as "data present, UI weak" — still true after v1.1 shipped). `BipHeader.tsx` has an explicit code comment stating these are deliberately NOT shown because the grant perk is administered by the *sending* institution, not the host programme — this is a real nuance, not an oversight, but it means the current state (collected in wizard, shown nowhere, not even to admins) throws the data away entirely. Resolve by showing them with corrected framing (e.g. "Your sending university may offer a green-travel top-up for this destination" rather than implying the host programme grants it). | LOW | UI-only; needs copy that doesn't misattribute the grant source |
| BIP detail page shows application deadline in the main content flow, not only the sidebar badge | Sidebar `DeadlineBadge` is mobile-hidden context (`hidden lg:block`); `BipMobileApplyBar` likely repeats it, but the "How to apply" body section currently has no deadline restated inline — a student reading body content top-to-bottom on mobile scroll may miss it entirely if they don't reach the sticky bottom bar context first. | LOW | Add deadline line to the "How to apply" section in `BipBody.tsx` |
| Alert Subscriptions: field + country + "both" criteria matching | Core mechanic already scoped in prior research and required by ALRT-01..08. Students subscribe to combinations, not just a single dimension — a "Sustainable Engineering" student who doesn't care about country, or a "Germany" -focused student who doesn't care about field, are both real patterns. | MEDIUM | `bip_subscriptions` table (not yet migrated — confirmed absent from current migration list 00015–00021) |
| Alert Subscriptions: idempotent digest ("once per BIP per subscriber," never duplicate) | Standard requirement for any queue-and-retry email pipeline; pg_cron has no exactly-once guarantee. Missing this risks visible duplicate emails and spam complaints on day one. | MEDIUM | `bip_alert_deliveries` with `UNIQUE(bip_id, user_id)`, must exist before first cron run (carried HIGH-confidence finding from v1.1 research, re-verified: no such table exists yet) |
| Alert Subscriptions: one-click, no-login unsubscribe with signed token | Legal requirement (GDPR Art. 7(3): withdrawing consent must be as easy as giving it) and deliverability requirement (Resend/most ESPs suspend accounts that lack functioning unsubscribe). Verified: GDPR guidance is explicit that the unsubscribe process must require no more than two clicks and never demand login. | MEDIUM | Public route (no auth), signed HMAC token scoped to one subscription |
| Alert Subscriptions: explicit consent capture at subscribe time | GDPR requires consent be specific and unambiguous — a generic "sign up" checkbox bundled with account creation does not qualify as marketing/notification consent. Must be its own affirmative action, separate from account creation. | LOW | `consent_text` + timestamp column on `bip_subscriptions`, shown at the point of subscribing, not buried in ToS |
| Alert Subscriptions: manage-from-dashboard (view/edit/delete subscriptions, no email round-trip required) | Table stakes for any B2C alert product — students should not have to click an unsubscribe link and re-subscribe from scratch to adjust one criterion. Verified via search: granular self-service preference centers reduce unwanted full opt-outs by a meaningful margin (cited: up to ~30% reduction in cited industry sources) compared to unsubscribe-only flows. | LOW | Student-dashboard section: list active subscriptions, edit or delete each |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Duplicate this BIP" — start a new wizard draft pre-filled from a past submission | BIPs are annually recurring by nature (same host + partners, same virtual-component structure, new dates/deadline). No comparable-platform search surfaced this pattern explicitly, but it is a standard SaaS/marketplace pattern for recurring listings (recurring job postings, recurring events) and is a strong fit for BipHub's actual data shape — confirmed no existing "duplicate" affordance exists in the current dashboard (`app/(dashboard)/dashboard`). Reduces coordinator re-entry effort for the majority of BIPs, which repeat year over year. | MEDIUM | Reuses existing wizard + Zustand draft store; new Server Action clones an approved/expired BIP's field values (minus dates/deadline/slug) into a fresh draft owned by the same coordinator |
| Field-level guidance / "why this matters" microcopy in the wizard | Comparable-platform research consistently names sparse, marketing-only listings as the failure mode BipHub is explicitly trying to avoid (erasmusbip.org's own failure pattern). Contextual hints ("Students use this to judge time commitment") nudge coordinators toward the level of detail the new detail-page content blocks need to not look empty. | LOW | Tooltip/helper text only, no schema or validation change |
| "Program maturity" signal — "Running since [year]" or "Nth edition" derived from prior approved BIPs sharing the same host + title lineage | v1.1 research proposed this as the correct alternative to reviews/ratings (an anti-feature — see below): signals trust without opening a moderation surface. Not yet built in either milestone. | MEDIUM | Requires a way to link a BIP to its prior-year predecessor — natural byproduct of the "duplicate this BIP" feature above if the clone retains a `predecessor_bip_id` FK |
| Detail-page "Practical information" as its own named section (accommodation + visa + local cost expectations bundled) | Positions BipHub above a bare field-and-date listing; matches the pattern named repeatedly in study-abroad program-page research as decision-critical but currently entirely absent from BipHub's detail page. | LOW | UI section only, reusing `accommodation_notes` — see table stakes above; the differentiator is the framing/section design, not the data |
| Weekly digest email as the default cadence, daily/immediate as opt-in upgrade | BipHub students are low-frequency users (one session every few weeks during application season, per v1.1 research's user-behavior analysis) — an aggressive default (immediate) risks unsubscribes before value is demonstrated. Prior v1.1 research already recommended daily/weekly only, no instant, for the same audience-frequency reasoning; this research reaffirms that as still correct given no new BIP-submission-volume data has emerged since. | LOW | Digest cadence enum on `bip_subscriptions`; default `weekly` |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Structured cost/funding calculator (per-country grant amounts) | External study-abroad research repeatedly names "financial information" and "what's included in program costs" as decision-critical | Already an explicit v1 anti-feature in `PROJECT.md` and reaffirmed by v1.1 research: grant amounts are set annually per National Agency across 29 programme countries; a wrong number is worse than none, and BipHub cannot maintain 29 country-specific tables | The `accommodation_notes`/"Practical information" free-text field (table stakes above) plus a link to the official Erasmus+ grant calculator — coordinator-authored prose, not a platform-computed number |
| Structured day-by-day itinerary builder (per-day agenda entries) | Comparable long-form study-abroad programs (semester exchanges) commonly show week-by-week itineraries | BIPs are 5–30 days, already compressed; a rigid per-day structured builder adds wizard complexity disproportionate to the format's length, and coordinators would need to re-enter it every year even with duplication, since day-by-day content is the part most likely to change | `virtual_duration_notes` + `description` free text already cover this at the appropriate level of granularity for a short-format program; do not add structured schedule rows |
| University/coordinator photo uploads on BIP listings | Comparable platforms (GoAbroad, GoOverseas) use imagery heavily; a text-and-badge-only listing can look sparse next to them | Explicit v1 (and unchanged v1.2) `PROJECT.md` out-of-scope item — gradient placeholders were a deliberate decision, and Supabase Storage + moderation for user-uploaded images is new infrastructure and a new abuse surface not currently justified by BipHub's scale. **Flagging for revisit**, not permanently ruled out: if coordinator or student feedback after v1.2 launch specifically calls out the visual sparseness of listings (rather than missing informational fields, which this research addresses), it is the next lever to reconsider — but should not enter v1.2 scope. | Gradient placeholders (current) remain correct for v1.2; university logo (not photo) could be a lighter-weight future step if this resurfaces |
| BIP reviews / past-participant ratings, surfaced instead of or alongside "program maturity" | Same rationale as v1.1 research — students want social proof | Already a confirmed v1.0/v1.1 anti-feature: institutional-politics risk from negative reviews of a named university program, annual content churn makes past reviews misleading, and moderation of review spam is a burden BipHub cannot sustain | "Program maturity" signal (differentiator above) gives a trust proxy without opening a review surface |
| Instant/immediate alert delivery (send the moment a BIP is approved) as the only or default cadence | Feels most "real-time" and technically simplest (no batching logic) | Wrong fit for a low-frequency-visit audience; industry guidance on subscription frequency management consistently identifies frequency mismatch as the top driver of unsubscribes, and BipHub's own user-behavior pattern (checked once every few weeks) supports batching over immediate | Weekly digest default, daily as an explicit opt-in upgrade (table stakes/differentiator above) |
| Bundling alert-subscription consent into general account ToS/creation flow | Reduces friction — one checkbox at signup instead of a separate subscribe step | GDPR-non-compliant: consent for a specific processing purpose (marketing/notification emails) must be separate, informed, and unambiguous — bundling with account-creation consent risks invalidating it entirely, which is a compliance regression, not a UX win | Explicit subscribe action inside the student dashboard or on `/bips`, with its own consent text and timestamp (table stakes above) |
| Login-gated or multi-step unsubscribe (e.g., "sign in to manage your subscriptions" as the only unsubscribe path) | Keeps unsubscribe inside the authenticated dashboard, simpler backend (no signed public token) | Directly conflicts with GDPR guidance that withdrawing consent must be at least as easy as giving it, and with deliverability norms (`List-Unsubscribe` header expects a working, no-auth link) | Signed HMAC unsubscribe token in every alert email works without login; dashboard management is an *additional* convenience, not a replacement (table stakes above) |

---

## Feature Dependencies

```
Fix virtual_timing enum mismatch (wizard vs DB CHECK)
    └──must precede──> Wire virtual_sessions_count / virtual_duration_notes into wizard
                            (both touch Step 2 — fix known bug before adding fields to the same step)

Fix max_participants floor (5 → 10)
    └──independent──> can ship alongside the virtual_timing fix in the same Step 2 pass

Wire partner_institutions_only into wizard + detail page
    └──independent of the above──> Step 4 + BipBody "Who can apply" section

Wire accommodation_notes into wizard + "Practical information" detail-page section
    └──independent──> Step 4 + new BipBody section

Green-travel / inclusion-support badges on detail page
    └──requires──> corrected copy (sending-institution framing) before rendering
                       (do not just remove the existing suppression comment verbatim)

"Duplicate this BIP"
    └──requires──> completed builder (new fields above should exist before cloning logic
                     is written, or the clone will silently drop them)
    └──enables──> "Program maturity" signal (via predecessor_bip_id lineage)

Alert Subscriptions (ALRT-01..08)
    └──requires──> Student accounts (already shipped, v1.1 Phase 5)
    └──requires──> bip_subscriptions table + consent_text column (net new — not yet migrated)
    └──requires──> bip_alert_deliveries idempotency table (net new, must exist before first
                     cron run — build before the email template, not after)
    └──requires──> signed public unsubscribe route (build before the email template — do not
                     send a single alert email without a working unsubscribe link)
    └──enhances──> BIP detail-page completeness indirectly: a richer detail page (from the
                     builder work above) makes the digest email itself more useful, since the
                     digest links back to pages that now answer more student questions
```

### Dependency Notes

- **Builder-completion work should land before detail-page redesign, which should land before alerts.** This matches `PROJECT.md`'s own stated sequencing ("Finish the coordinator BIP builder... which unblocks designing the BIP detail page... then land alerts"). The gap analysis above confirms *why*: several detail-page content blocks (practical info, workload/session count, partner-institutions-only notice) cannot be designed sensibly today because the underlying wizard doesn't collect the data — designing the detail page first would mean designing empty-state UI for fields nobody can fill in yet.
- **The two schema/enum bugs (`virtual_timing`, `max_participants`) should be fixed in the same pass as the new Step 2 fields**, not as a separate cleanup phase — they live in the same file (`step2Schema`) and the same DB row, and shipping new fields on top of a known-broken validator compounds the debugging surface for whoever plans that phase.
- **"Duplicate this BIP" depends on the builder being complete**, not the other way around — cloning a BIP that's missing fields just propagates the gap into every future annual re-submission.
- **Alert idempotency and unsubscribe infrastructure must both exist before the first alert email is sent** — this was the single highest-severity pitfall carried from v1.1 research (P5, P7) and remains true; it is a hard ordering constraint within the alerts workstream, not just a preference.

---

## MVP Definition

### Launch With (v1.2)

- [ ] Fix `virtual_timing` wizard/DB enum mismatch — currently a live bug, blocks any coordinator selecting "concurrent"
- [ ] Fix `max_participants` floor (5 → 10) to match documented Erasmus+ domain rule
- [ ] Wire `virtual_sessions_count` + `virtual_duration_notes` into Step 2 + detail page
- [ ] Wire `partner_institutions_only` into Step 4 + detail page + `/bips` card badge — closes a real discovery-trust gap
- [ ] Wire `accommodation_notes` into Step 4 + a new "Practical information" detail-page section
- [ ] Resolve green-travel/inclusion-support badge suppression with corrected (sending-institution) framing
- [ ] Show application deadline inline in the "How to apply" body section, not sidebar-only
- [ ] Alert Subscriptions: `bip_subscriptions` (field + country + both criteria, consent_text, cap at 5 per student — carried recommendation from v1.1 research), `bip_alert_deliveries` idempotency table, weekly-digest default with daily opt-in, signed no-login unsubscribe, dashboard subscription management (ALRT-01..08)

### Add After Validation (v1.2.x or v1.3)

- [ ] "Duplicate this BIP" — depends on builder completion above; high value once the full field set exists to clone
- [ ] Field-level guidance/microcopy in the wizard — low cost, can land opportunistically once new fields are in place
- [ ] "Program maturity" / "Nth edition" signal — depends on "duplicate this BIP" providing a predecessor link

### Future Consideration (v2+)

- [ ] University/coordinator photo/logo uploads — explicitly deferred; revisit only if feedback specifically names visual sparseness (not informational gaps, which v1.2 addresses) as a problem
- [ ] Structured day-by-day itinerary builder — format-mismatch for 5–30 day programs; free text remains correct
- [ ] Cost/funding calculator — permanent anti-feature per `PROJECT.md`, not a "later" item; grant tables are the wrong maintenance burden for BipHub at any scale
- [ ] BIP reviews/ratings — permanent anti-feature; "program maturity" signal is the correct substitute, not an interim one

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Fix `virtual_timing` enum mismatch | HIGH (bug) | LOW | P1 |
| Fix `max_participants` floor | MEDIUM (compliance) | LOW | P1 |
| Wire `partner_institutions_only` | HIGH | LOW | P1 |
| Wire `virtual_sessions_count`/`virtual_duration_notes` | MEDIUM | LOW | P1 |
| Wire `accommodation_notes` / Practical information section | MEDIUM | LOW | P1 |
| Green-travel/inclusion-support badges (corrected framing) | MEDIUM | LOW | P1 |
| Inline deadline in "How to apply" section | LOW | LOW | P2 |
| Alert Subscriptions core pipeline (ALRT-01..08) | HIGH | HIGH | P1 |
| "Duplicate this BIP" | HIGH (coordinator retention) | MEDIUM | P2 |
| Field-level wizard guidance/microcopy | LOW-MEDIUM | LOW | P2 |
| "Program maturity" signal | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.2 launch
- P2: Should have, add when possible within v1.2 or immediately after
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | erasmusbip.org (competitor) | GoAbroad / GoOverseas (study-abroad comparators) | BipHub v1.2 Approach |
|---------|------------------------------|----------------------------------------------------|------------------------|
| Practical info (accommodation, local cost expectations) | Absent (embedded Google Sheet has no room for prose) | Present, prominent — named repeatedly as decision-critical in program-page research | Add as a named "Practical information" detail-page section using the existing but unused `accommodation_notes` column |
| Eligibility clarity (who can actually apply) | Absent — no structured eligibility beyond raw text in the sheet | Present — GPA/language/partner-status requirements clearly separated | Wire `partner_institutions_only` + existing `eligibility_notes`/`study_levels` into a single "Who can apply" block that includes partner-only status |
| Workload/contact-hours transparency | Absent | Present in accredited-program listings (contact hours drive credit-transfer decisions) | Wire `virtual_sessions_count`/`virtual_duration_notes`; physical-mobility workload remains covered by ECTS + description, appropriately sized for a 5–30 day format |
| Recurring-listing re-entry (annual BIPs) | N/A (competitor has no submission flow at all) | Not directly comparable — semester-exchange catalogs don't recur the same way | "Duplicate this BIP" — a BipHub-specific differentiator, not copied from either comparator |
| New-listing alerts | Absent | Present (both ship saved-search email alerts) | `bip_subscriptions` + weekly digest default, GDPR-correct consent/unsubscribe (ALRT-01..08) |
| Reviews/ratings | Absent | Present on both comparators | Deliberately not copied — institutional-politics and moderation-burden risk outweigh the social-proof value at BipHub's scale; "program maturity" signal instead |

---

## Sources

- Direct codebase inspection (HIGH confidence, primary source for all schema-gap findings): `supabase/migrations/00003_bips_full_schema.sql`, `00020_bip_subject_areas.sql`, `lib/supabase/database.types.ts`, `lib/schemas/bip-wizard.ts`, `components/forms/BipSubmissionWizard.tsx`, `components/bip/BipHeader.tsx`, `components/bip/BipBody.tsx`, `components/bip/BipSidebar.tsx`
- `.planning/PROJECT.md` — v1.2 milestone scope, out-of-scope list (2026-07-18)
- `.planning/milestones/v1.1-research/FEATURES.md` and `SUMMARY.md` — prior gap analysis and alert-pipeline architecture decisions, re-verified against current migration list to confirm `bip_subscriptions`/`bip_alert_deliveries` remain unbuilt (2026-06-14, carried forward)
- WebSearch: study-abroad program page best practices — Carnegie Mellon Study Abroad, NAFSA short-term program development guides, CollegeData program-choice guide (verified 2026-07-18; MEDIUM confidence — general study-abroad guidance, not BIP-specific, but directly names the same content categories — eligibility, cost/what's-included, workload/credit transfer — found missing in BipHub's schema-to-UI gap)
- WebSearch: email alert/digest subscription GDPR consent and unsubscribe best practices — ComplyDog, TermsFeed, 4TM subscription-management guidance (verified 2026-07-18; MEDIUM-HIGH confidence — consistent across multiple independent sources on the two-click unsubscribe and separate-consent requirements)
- WebSearch: multi-step form draft/auto-save UX best practices — FormAssembly, Reform, Growform (verified 2026-07-18; confirms BipHub's existing auto-save wizard already follows current best practice — no changes needed there, only used to confirm no regression risk)

---

*Feature research for: BipHub v1.2 — Coordinator BIP Builder Completion + BIP Detail Page + Alert Subscriptions*
*Researched: 2026-07-18*
