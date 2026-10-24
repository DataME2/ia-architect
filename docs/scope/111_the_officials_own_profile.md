# Project Scope — The Official's Own Profile

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/official-profile-plan`. **Status: planned,
not built.** The rules below are proposals until the product owner answers
open questions [#100–#103](./open-questions.md).

The product owner asked (October 2026) where **a match official can edit or
create things about themselves**, using the Superdesign draft *Referee
Profile Detail* (project `46a311a6`, draft `7d7bec9a`, v2) as the model.

[Scope 106](./106_the_club_dashboard_the_club_profile_and_the_workspace_card.md)
used the same draft for the read-only workspace card and left out
everything that edits: *Edit Profile*, the quick actions, and the
history. This scope plans those parts as **a profile page the official
works on themselves**.

The draft is drawn as a coordinator's screen (*Back to Roster*, *Assign to
Game*, *Admin User*). Here it is the official's own, so its actions become
the official's actions.

The official's own version is drawn in the same project as the draft *Your
Official Profile* (draft `2f0a4ebf`), on sample data, following the table
below.

## Where it lives

A new page, **`/me/official?club=<id>`**, *Your official profile*. It
resolves the active holding exactly as `/me` does (`resolveActive` with the
referee role and the club), so it opens only for a person holding a referee
record at that club (BR174's condition). The Referee workspace's head and
its workspace card link to it.

The workspace stays the weekly board: offers, the week, alerts, and what is
owed. The profile is who the official is, what they have done, and what
they keep up to date.

## The draft against the app

| The draft had | The plan keeps | Built today? |
| ------------- | -------------- | ------------ |
| Photo with a verified tick | Initials, as the identity rail draws them. No photo (see gap notes) | Initials: yes |
| Name, "Senior Referee", email, phone, team | Name; the **latest classification** (BR110) with *sighted* or *not yet sighted*; official number; club. Email as the club holds it. Phone only if [#100](./open-questions.md) says yes. The team line becomes the person's **other roles** at the club (P1) | All but phone |
| "Verified & Available", "Available for Weekend Match" | Two statuses, each a dot and a word. **Cleared to officiate** means every credential is valid today, the classification is sighted, and no suspension is current. **Available this weekend** comes from the declared week and away periods (BR174) | Inputs exist; the decision is new (`src/web/official-profile.ts`) |
| **Edit Profile** | **Propose a change to my details**: preferred name, email and phone if [#100](./open-questions.md) allows it. A registrar or coordinator confirms, as BR149 does for a player | **New** (WP4) |
| Send Message | Left out. Members do not message each other (scope 106's gap) | — |
| Reliability 98.4%, cancellation 2%, 128.5 hours, "Top 5%" | **Counts from recorded facts**, this season: matches confirmed (BR151), accepted and upcoming, declined with a reason (BR112), withdrawn. A decline **rate** only once BR12's window and maximum exist ([#101](./open-questions.md)). No hours, no ranking (scope 100) | Counts: data exists |
| Volunteer history table with Export CSV | **Your matches**: past appointments with date, fixture, role, and the outcome as a dot and a word (*Confirmed*, *Not confirmed*, *Declined*, *Withdrawn*). Download as CSV | Data exists |
| Recent communications | Left out (no messaging between members) | — |
| Upcoming schedule, dark card | **Coming up**: accepted and offered appointments, with the conflict and card check (`appointmentAlerts`) beside each | Yes (the workspace's data) |
| Quick action *Request Swap* | **Withdraw from a match** (BR42): an accepted appointment, with a reason, which notifies the coordinator. BR42 has always required this. Only the coordinator could do it until now | **New** (WP2) |
| Quick action *Assign to Game* | Left out here. It is the coordinator's job (`/registrar/designations`) | — |
| Quick action *View Documents* | **Your credentials**: every accreditation and clearance with its expiry and whether it is sighted (`credentialStanding`), plus **Add a renewal** | List: yes. Renewal: **new** (WP3) |
| — (not in the draft) | **Your officiating preferences**: roles you take, how many matches a day, and age groups, shown to the coordinator when designating, as information only ([#102](./open-questions.md)) | **New** (WP5) |

## EA alignment (assessed top-down; to be applied when built)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** P1 (one Person; other roles shown, not duplicated), P3 (the coordinator still decides every designation), P5 (own rows only), P7 (no photo of a 13 to 17 year old official). Scope 100's rule against invented figures governs the counts |
| 2_business    | **Proposed new rules**, numbered when approved: **(a)** an official of eighteen or over may propose a change to their own details, confirmed by a registrar or coordinator, extending BR149 beyond players; **(b)** an official may declare a renewed accreditation or clearance, which counts toward BR8 and BR111 only once a registrar or coordinator has sighted it; **(c)** an official keeps their own officiating preferences, which inform a designation and never block one. **BR42 gets its first self-service path:** a withdrawal by the official, with its reason, notifying every coordinator (BR159's inbox). Glossary: *officiating preference* |
| 3_information | **New data objects:** `official_detail_correction`, `credential_declaration` and `referee_preference`. Each holds the club and the Person, is readable by the official and the reviewing roles, and keeps its review history. **`person.phone`** only if [#100](./open-questions.md) says yes: new personal data, which needs its classification and retention row |
| 4_application | **New:** the `/me/official` page and its components; `src/web/official-profile.ts` (statuses, counts, history rows, CSV), with tests; loaders in `src/data/official-profile.ts`; actions in `src/app/me/_officiating/actions.ts`; a preferences column on the designation screen. A new row in [application components](../ea/4_application/2_application-components.md) |
| 5_technology  | **No change** to runtimes or dependencies. Three or four migrations, each **applied by hand with approval** before its PR merges, each with its RLS test in `supabase/tests/` |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | The Referee workspace shows offers, the week, alerts, credentials and claims. The official edits only their week and away periods (BR174), answers offers (BR113) and confirms matches (BR151). An accepted match can be given up only by asking the coordinator; an expiring card can only be renewed by telling the club |
| **Target** | A profile page where the official sees their standing and their record, withdraws from a match with a reason, declares a renewed credential, proposes corrections to their details and keeps their preferences. The coordinator confirms or sights everything that becomes the club's record |

## Work packages and deliverables

Ordered so each ships on its own; WP1 needs no migration.

### WP1 — The profile page, read-only

- **Deliverables:**
  - `src/app/me/official/page.tsx`, in the draft's layout: header card,
    figures row, *Your matches* with CSV, the dark *Coming up* card,
    *Your credentials*.
  - `src/web/official-profile.ts` and its tests: `clearedToOfficiate`,
    `availableThisWeekend`, `seasonCounts`, `historyRows` and
    `historyCsv`.
  - `src/data/official-profile.ts`: past appointments with fixture and
    confirmation, reusing `loadOwnCredentials`,
    `loadDeclaredAvailability` and `loadFamilyDesignations`.
  - Links from `RefereeWorkspace.tsx` and the workspace card.
- **Outcome:** the official's standing and record in one place, every
  figure counted.
- **No migration.** The tables are readable by the official since 0045,
  0071 and 0087. **Check first:** that the official can read their own past
  fixtures and confirmations under RLS. Where they cannot, the page says so
  (BR142) rather than showing a short count.

### WP2 — Withdraw from a match (BR42)

- **Deliverables:**
  - Migration `withdraw_own_appointment(p_appointment_id, p_reason)`, a
    `security definer` function. It accepts only the caller's own
    `accepted` appointment, for a fixture not yet played, with a reason.
    It sets `withdrawn` and writes a `notification` to every coordinator
    and admin at the club (0050). The cut-off is
    [#103](./open-questions.md).
  - `withdrawOwnAction` and a form on each *Coming up* card.
  - RLS test: another official's appointment, a declined one, a past one
    and an empty reason are all refused.
- **Outcome:** the draft's *Request Swap*, as the rule already written
  says it works.

### WP3 — Declare a renewed credential

- **Deliverables:**
  - Migration: `credential_declaration`, holding the kind (an
    accreditation, or a clearance such as a Blue Card), the number, issue
    and expiry dates, the state (*pending*, *sighted* or *declined*) and
    who reviewed it.
  - Insert-own and select-own policies. Registrar and coordinator read
    and review.
  - `sight_credential_declaration`, which writes the
    `referee_accreditation` or `clearance` row with `verified_at`. The
    club's record is written only by the club.
  - *Add a renewal* on the profile, and a queue on `/registrar/referees`
    beside `InterestQueue`, with BR159's inbox item.
- **Outcome:** an official whose card expires next month says so
  themselves, and the designation check counts it once it is sighted.
- **Why a separate table:** `credentialStanding` reads unsighted rows as
  *warn*, not *stop*. Letting the official insert into
  `referee_accreditation` would put an unchecked number into the
  appointment check.

### WP4 — Propose a change to my details

- **Deliverables:**
  - Migration: `official_detail_correction`, with preferred name, email
    and (if [#100](./open-questions.md) allows) phone, following 0052's
    shape without its `registration_id`, since an official may have no
    registration (scope 73).
  - Confirm and decline for the registrar and coordinator.
  - The email path keeps 0062's claim-follows-email behaviour.
- **Outcome:** *Edit Profile*, the way BR149 already lets a player do it.

### WP5 — Officiating preferences

- **Deliverables:**
  - Migration: `referee_preference`, one row per official per club,
    holding roles out of `match_official_appointment.role`'s three, a
    maximum number of matches a day, and age groups. Insert and update
    own; read by coordinator, registrar and admin.
  - A form on the profile.
  - A *Prefers* column on `/registrar/designations`, shown and never
    enforced.
- **Outcome:** the coordinator offers matches the official wants, and
  stays the one who decides (P3).

### WP6 — Docs

- **Deliverables:** the approved rules (a)–(c) in the rules table, the
  three data objects, the components row, the open questions resolved,
  and this document's status updated.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The official's own profile page, WP1–WP5 | A coordinator's profile page for any official (`/registrar/referees/[personId]`). It would reuse WP1's components, and the draft is drawn for it |
| Counts from recorded facts | Reliability, hours or ranking scores |
| Withdrawal, renewal, detail corrections, preferences | Messaging between an official and the coordinator |
| Initials | A profile photo |

## Gap notes

- **Photo.** Officials can be 13. A photo of a minor needs its own consent
  (BR56's reasoning for the identification photograph) and storage rules.
  Initials carry the identity until both exist.
- **Hours.** No match length is recorded against a fixture, so hours would
  be a guess. Counts are exact.
- **A coordinator's version** of the same page is the natural next step,
  because the draft is drawn as one. WP1's decisions in `src/web/` are
  written to serve both.

## Open questions

Mirrored in [the open-questions log](./open-questions.md).

- **#100** Should the club hold an official's **phone number**? It would be
  new personal data; the draft shows one.
- **#101** **BR12's decline rate:** what window, and what maximum for each
  classification? Until set, the profile shows counts, not a rate.
- **#102** Which **officiating preferences** does the club want? The
  adopted set is roles, matches per day and age groups.
- **#103** **Withdrawal cut-off:** may an official withdraw on match day,
  or only up to a set number of hours before kick-off?
