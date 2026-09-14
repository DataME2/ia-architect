# Data Objects

_[← Information layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Data Object.

The persisted form of the
[business objects](../2_business/4_business-objects.md). This document
opened with the **registration slice**
([scope document 17](../../scope/17_mvp-registration-slice.md)) and has
grown with every initiative since: finance, governance, the player record,
platform administration, family access, and — from September 2026 — the
referee slice. What is still only a business object is listed at the end.

## The tension this layer had to resolve first

**Principle P1 says one `Person`. Principle P5 says a club never sees
another club's data.** Those collide the moment the same child plays for
two clubs, and the collision had to be settled before a single table was
drawn.

**Resolution: `person` is tenant-scoped.** One row per club, carrying
`club_id`, isolated by Row-Level Security like everything else. P1 holds
*within* a club — the player who is also a referee and whose mother is on
the committee are one Person each, which is exactly the duplication P1 was
written to prevent.

Cross-club identity is a **different problem with an existing answer**: it
is what BR44's matching and Capability C14 are for, and it is unsolved for
the same reason there — no shared identifier exists since SQUADI dropped
the FA ID. Making `person` global would not solve it either; it would
merely move the matching problem into the primary key while breaking P5 on
the way. Recording the boundary here so nobody later "fixes" P1 by
de-scoping the table.

## Core objects

| Data Object | Realises | Notes |
| ----------- | -------- | ----- |
| **`club`** | Club / Organisation | The tenant. Every other table carries `club_id` and every RLS policy keys off it |
| **`season`** | Season | Club-scoped operating period. Registrations, roles, and packs all reference one. Also carries the club's registration configuration for that year: **`required_document_types`** (BR2) and **`registration_fee_cents`** (BR3), both copied onto a registration at the moment it is created. **These were added while building the requirements screens**, because both rules were unenforceable without them — a rule asking which required documents are missing has no answer, and reports *pass*, when nothing was ever required |
| **`person`** | Person | `legal_given_names`, `legal_family_name` — as on the passport or birth certificate — **and** `preferred_name`, a separate first-class column (BR55). Also `legal_name_verified_at`, `date_of_birth`, contact details, and `photo_path` into Storage (BR56). Tenant-scoped, see above. **`merged_into_person_id`** points at the surviving record when a human resolved this row as a duplicate (BR82) — a tombstone, never a delete, and every lookup filters on it being null. **`legal_name_verified_at` was added while writing the rules engine** — BR55 is unenforceable without it, because "we hold a legal name" and "we checked it against a document" are different claims and only the second survives contact with the federation |
| **`person_role`** | Person Role | One row per role per season: player, referee, coach, guardian, committee member. Overlapping by design — this table is what makes P1 true. Written **at registration**, not by a later screen: a public submission records the child's `player` role and the guardian's `guardian` role as it creates them, so P1 holds for every Person the moment they exist |
| **`guardianship`** | Guardianship | `person_id` ↔ `guardian_person_id`, both rows in `person`. Carries `is_authority` (true while the child is under 18) and `is_contact` (stays true after, BR67) — **two flags, not one**, because BR67 separates who may consent from who the club phones |
| **`registration`** | Player Registration | Season-scoped, with a `status` enum whose `PENDING_EXTERNAL_REGISTRATION` value is an **eligibility gate** and not paperwork (BR43) |
| **`registration_document`** | Person Document | Required documents attached to a registration; the file itself in Storage. **One row per requirement, created with the registration** from the season's checklist, with `provided_at` — a *time*, not a flag, because "when did the club receive the working-with-children check" is a question a safeguarding audit asks. Without these rows BR2 compares an empty list against an empty list and passes on everything |
| **`consent`** | Consent Record | **One row per purpose**, never a boolean column on `person`. `purpose` ∈ {registration collection notice, identification photograph, publicity}, plus `granted_by_person_id`, `granted_at`, `revoked_at`, and the channels for publicity (BR48, BR56, BR57). Modelling this as flags is the mistake that makes BR48 unimplementable |
| **`registration_invitation`** | Registration Invitation | The club's write-only public link (BR72): `club_id`, `season_id`, `token_hash` — **the hash, never the token** (BR73) — `label`, `expires_at`, `use_count`, `revoked_at`, `created_by_user_id`. `anon` holds no `select` on it, so tokens cannot be enumerated; the only anonymous access is through the `security definer` function that consumes one ([decision 6](../../decisions/6_public-registration-through-a-scoped-function.md)) |
| **`payment_plan`** | Payment Plan | `registration_id`, `total_cents`, `cadence`, who agreed it, and `cancelled_at`. A **partial unique index** on `(registration_id) where cancelled_at is null` is what makes BR75's "at most one live plan" a fact rather than an intention |
| **`payment_installment`** | Installment | `sequence` (1-based and stable — it is how a family refers to one on the phone), `due_on`, `amount_cents`. **BR74 is a deferred constraint trigger**, not application code: the instalments must sum to the plan total at commit, from either side of the relationship, so a plan a few cents short cannot be written by any route — a future screen, a migration, or a hand-typed `UPDATE` |
| **`payment`** | Payment | Amount, date received, method, reference, and `reverses_payment_id`. **Append-only by the absence of a policy**: with RLS on, an operation with no policy is denied, so `update` and `delete` are impossible through the API rather than merely discouraged (BR77). `amount_cents` may be negative — that is what a refund or a correction *is* |
| **`registration_voucher`** | Voucher | `program`, `code`, `face_value_cents`, `state`, `file_path` into Storage, who attached it and who decided. **`relief_payment_id` is the load-bearing column**: a database check constraint requires it to be set when the state is `VERIFIED` or `CLAIMED` and null otherwise, so a voucher cannot be marked verified without the receipt that carries its relief — a discount nobody can trace is unwritable rather than merely discouraged (BR81). Unique on `(club_id, code)`: a government voucher is single-use |
| **`arrears_action`** | Arrears Follow-up | The Treasurer's recorded response to a prior-season debt (BR79): `person_id`, `season_id`, `action` ∈ {`payment_requested`, `amendment_recorded`}, `reason`. **Append-only, like `payment`**, and `reason` is enforced twice — a check constraint requiring it non-empty whenever `action = 'amendment_recorded'`, holding even against a caller that bypasses `app_record_arrears_action` and inserts directly. One row per attempt rather than a status column, so a family chased twice shows two entries, never one edited note |
| **`committee_term`** | Committee Term | `agm_held_on`, `starts_on`, `next_agm_due_on`. The last is a column rather than arithmetic, deliberately (BR86) |
| **`committee_position`** | Committee Position | One person, one office, one term. A trigger refuses a holder who was not an adult at the term's start (BR87). `resigned_on` records an early exit, distinct from the term simply ending |
| **`team`** | Team | Club- and season-scoped, unique on name within a season |
| **`team_member`** | Team Membership | One row per person per team per role, so a parent who also coaches is two rows and one Person |
| **`clearance`** | Clearance | `kind`, `identifier`, `issued_on`, `expires_on`, and **`verified_at` separately from the card number** — null means someone typed a number and nobody checked it (BR19). **`reminder_sent_at`** (BR51) is kept separate from `verified_at` for the same reason: "we reminded the Secretary" and "somebody re-verified it" are different facts, and folding them into one column would make a reminder read as a check. **`file_path`** holds a scan of the card in a private bucket narrower than the vouchers one: this is a government identity document, so only admin and registrar reach it. Superseded cards are kept rather than overwritten. **Read is narrower than the rest of the slice**: admin and registrar only, because a card number is a safeguarding record rather than ordinary club information, while the roster it gates is readable by any member |
| **`validation_result`** | — (realises C6) | One row per rule evaluation against a registration: which rule, pass or fail, and the message. Persisted rather than computed on the fly, so the club can see *why* a registration is not ready without re-running anything |
| **`submission_pack`** | Registration Submission Pack | Immutable and versioned (BR58): `version`, `generated_at`, `generated_by`, `club_id`, `season_id`, `channel`, `handed_over_at`, and **`manifest`** — the frozen rows exactly as generated. The single permitted update is stamping the handover, and only while `handed_over_at` is still null. **`manifest` was added while building the submission screen**: BR58 requires the pack to answer "did we submit this player, *and with what values*?", and without it a name corrected after submission would make the pack appear to have carried the corrected one — which is precisely the disputed-eligibility case the rule exists for |
| **`submission_record`** | Submission Record | One person per pack, with `state` ∈ {sent, confirmed_present, rejected} and `rejection_reason`. **The table that keeps *sent* and *registered* apart** (BR60) |
| **`club_contact`** | Club Responsibility | Who is answerable for a club: `kind` ∈ {primary, secondary}, `full_name`, `email`, `phone` — and **`claimed_at`, which is the difference between "we intend you to have access" and "you have it"** (BR94, BR95). Unique on `(club_id, kind)`, because a club with two primaries has no primary. Doubles as a **pending grant**: the row exists before the person has an account, and `claim_club_access()` turns it into an `admin` membership when they sign in. A repeat provision updates it **only while unclaimed**, so correcting a typo in a name cannot silently revoke a working login |
| **`fixture`** | Fixture | A game the club played: date, opponent, home/away, score, status, and the competition as **free text** because C11 does not exist and a dropdown nobody has filled in would stay empty. `team_id` is nullable so a friendly or a trial can be recorded before the team exists |
| **`appearance`** | Appearance | One row per player per fixture, carrying `minutes_played`, `started`, `goals` and `assists` as **counts, not events**. A trigger refuses an appearance whose fixture, registration and person disagree about the club, the season or the human — otherwise last season's enrolment quietly accumulates this season's games. What it deliberately does *not* refuse is an appearance by an ineligible player (BR103) |
| **`player_profile`** | Player Profile | Height, weight, positions, foot and squad number, one per registration and therefore **per season** (BR99) — a twelve-year-old's height in two seasons is two facts. **Read is narrowed** to admin, registrar, coordinator and coach, following `clearance` rather than the schema-wide default: a treasurer has no use for a child's weight |
| **`prospect`** | Prospect | **The only table in the schema with no `club_id`**, deliberately: a prospect belongs to no tenant and giving them one would drag the marketing surface into the world it exists to stay out of (BR92). Isolated by having *no API access in either direction* rather than by a tenant column — its writers are `enter_demo()` and, since [scope 44](../../scope/44_a_club_says_it_is_interested.md), `record_interest()`, both of which own it — which is why it is the one entry in `check_rls.py`'s `TENANTLESS_ALLOWED`. **The lead list was readable by nobody until scope 44**: correct isolation, and in practice every lead captured since 0013 was visible only from a `psql` prompt, so `app_enquiries()` is now the platform owner's door to it. An enquiry adds what the club *is* — name, jurisdiction, contact and role, size, and what it runs today — all nullable, because only the club's name and one address are required (BR144), and a returning enquirer's blank field never erases what an earlier visit supplied. Since [scope 45](../../scope/45_telling_somebody_a_club_asked.md) it also carries **whether anybody was told** — `notified_at` and `notify_error`, the outcome pair `message_log` uses, with a constraint forbidding a row that claims both. It is not in `message_log` because that table's `club_id` is `not null` and an operator alert is about no club (BR146). [Scope 46](../../scope/46_trying_the_alert_again.md) adds `notify_attempts` and `notify_attempted_at`, because a row that failed once is a provider hiccup and one that failed four times with the same message means stop retrying and fix the provider — and the count **accumulates across enquiries** rather than resetting when a club writes in again, which is against the pattern of every other field here and right for the same reason: a club enquiring twice because nobody answered is when the history matters most. One row per address, not per visit: `created_at` is the first look and `last_seen_at` the most recent. Marketing consent is recorded as **`marketing_consent_at` plus the exact `marketing_consent_wording` shown** (BR93), never a boolean — consent to words that were later edited is not evidence. `marketing_consent_revoked_at` exists and **nothing sets it yet**: no unsubscribe mechanism is built, and an unticked box on a return visit is not treated as a withdrawal, because somebody who did not notice a checkbox has not withdrawn anything |
| **`club_membership`** | Account ↔ Club Membership | Which Account may act for which club, and in what role. Unique on `(club_id, user_id, role)`, so **two roles are two rows** — which is why the WP1 link could not live here (see below) |
| **`guardian_invitation`** | Family Access Invitation | The magic link that lets a guardian claim their own workspace. **A trigger refuses the row** unless a child under that guardian's authority already has a registration at COMPLETE (BR126) — sending a link to an empty workspace reads as broken rather than as early |
| **`account_person`** | Account Link | `(club_id, user_id, person_id)`, written only by an administrator through `link_account_to_person()` ([decision 10](../../decisions/10_identity_is_asserted_never_inferred.md)), unique in **both** directions (BR106), with a composite foreign key to `person (club_id, id)` so the database refuses a Person from another club rather than trusting a screen |
| **`club_licence`** | Licence | Term, state, fee and currency for one club's right to use the product. Read by the platform console only; a lapsed licence is **shown and not enforced** (BR97, [#61](../../scope/open-questions.md)) |
| **`platform_admin`** | — | The cross-tenant allowlist. Its policy is `for all using (false) with check (false)`, so **the API can neither read it nor write it in either direction** — it is reachable only from inside a `security definer` function ([decision 9](../../decisions/9_platform_administration_provisions_but_never_reads.md)) |
| **`user_password_set`** | — | One row per account that has chosen its own password (BR98). No `club_id`, and unreachable through the API in both directions, for the same reason `platform_admin` is |
| **`audit_event`** | — (realises BR15, BR59, BR67) | Append-only. Who did what, when, to which row. Overrides of conflict warnings, pack generation and handover, and the transfer of authority at 18 all land here |

## Four modelling decisions worth defending

**Two name columns, not a name and an alias.** `preferred_name` is not a
nickname field bolted on — it is what every human-facing surface reads,
while the legal columns are what external registration and cross-system
matching use. One column with a "display as" override would let the
preferred name leak into a submission pack, which is precisely the failure
BR55 exists to prevent.

**Consent is rows, not columns.** Three purposes with independent grant,
revocation, and authority mean three lifecycles. A boolean cannot record
*who* granted it, *when*, or that it was revoked on Tuesday — and BR48
requires all three. It also means adding a fourth purpose later is a row,
not a migration.

**The account link is its own table, not a column on `club_membership`.**
The obvious place to say which Person an account belongs to is the row that
already joins the account to the club — and it is the wrong place.
`club_membership` is unique on `(club_id, user_id, role)`, so an account
holding both `admin` and `registrar` is two rows: a `person_id` column would
be stored twice and could disagree with itself, and a club that revokes one
role would silently drop half the link. The relationship being recorded is
*account ↔ Person at a club*, which is one fact per account per club, not
one per role. It gets a table whose uniqueness says exactly that — in both
directions, because the failure of the reverse direction (two accounts both
claiming to be the treasurer) is the one nobody looks for.

**Validation results are persisted.** The alternative — recomputing on
render — is cheaper until the registrar asks "what was wrong with this in
March?", or until [#32](../../scope/open-questions.md)'s measurement needs
the failure history that nobody kept. Storing them makes the baseline
decomposition a query rather than a new instrumentation project.

## Communications

Added September 2026 by [scope 36](../../scope/36_the_platform_learns_to_send_and_to_stop.md),
which built the withdrawal before anything that sends.

| Data Object | Realises | Notes |
| ----------- | -------- | ----- |
| **`message_subscriber`** | Contactable Party | One row per Person per club: the address, the suppression state of **each purpose separately** (BR130), and the salt behind their unsubscribe link. **Person-scoped, not address-scoped** — families share an inbox, which is why decision 10 refuses to infer identity from an email, and suppressing "this address" would silence a parent because their partner unsubscribed |
| **`message_log`** | — (realises BR127) | Append-only, by the absence of an update policy. Records the **suppressed and the failed as well as the sent**, because an absent row would mean both "never attempted" and "correctly withheld", and telling those apart is the only reason the log exists. Carries the template key **and version** — the wording lives in code, so a row holding a copy of it would be a second source of the same truth |

`prospect` gains an unsubscribe salt and token hash so a prospect — who
belongs to no tenant (BR92) — walks through the same door as everyone else,
withdrawing the `marketing_consent_revoked_at` that 0014 already modelled.

**The token is derived rather than stored**
([decision 12](../../decisions/12_an_unsubscribe_link_is_derived_not_stored.md)):
the row keeps a non-secret salt and the token's hash, and the secret that
joins them lives only in the server's environment. BR73's hash-only pattern
was refused here for a reason worth recording — with only a hash, the
plaintext exists for one message and every older message's link is dead,
which is precisely the failure BR128 exists to prevent.

## The referee slice

Added September 2026 by [scope 33](../../scope/33_the-referee-record-and-what-an-appointment-rests-on.md)
and [scope 34](../../scope/34_paying_the_officials.md), on the same terms as
everything above: club-scoped, under RLS, and history rather than current
values wherever a past answer has to stay answerable.

| Data Object | Realises | Notes |
| ----------- | -------- | ----- |
| **`referee_profile`** | Match Official | A profile on a Person who is already one (P1) — never a second identity |
| **`referee_classification`** | Classification | **One row per classification, dated** (BR110). The current standing is the latest row, never an overwritten column — so "what were they in 2024?" stays a query |
| **`referee_accreditation`** | Accreditation | Checked against the **fixture's** date rather than today (BR111), for the reason BR54 gives for a Working with Children Check |
| **`referee_suspension`** | Suspension | Disciplinary status; blocks a designation outright (BR9) |
| **`referee_availability`** / **`referee_unavailability`** | Availability | Two tables, because "has not said" and "has said no" are different answers and only the second is a fact (BR62) |
| **`match_official_appointment`** | Match Official Appointment | Carries the **appointing party** (BR114), which is what BR16 pays on, and the reason recorded with any decline or withdrawal — without which nothing is recorded at all (BR42, BR112) |
| **`appointment_verification`** | — (realises BR13) | The verified match a claim requires. **Nobody verifies the match they were paid for** (BR119) |
| **`referee_fee_schedule`** / **`referee_fee_rate`** | Fee Schedule | A **dated version, not an edited row** (BR115). Raising a rate publishes a new schedule; the old one stays readable |
| **`referee_payment_claim`** | Payment Claim | Stores **the amount it was computed at**, alongside the schedule it came from (BR116) — never a rate resolved at read time |
| **`referee_payment_batch`** | Payment Batch | **Closed before it is paid**, and a closed batch admits no further claims (BR117) |

## Privacy rights

Added September 2026 by [scope 37](../../scope/37_forgetting_and_the_reasons_not_to.md).
Erasure and retention are one piece of machinery seen from two directions —
both ask *is there a reason this record must stay?* — so there is **one**
table of reasons and both directions read it.

| Data Object | Realises | Notes |
| ----------- | -------- | ----- |
| **`retention_basis`** | Retention Basis | Why a record must be kept, and until when. `expires_on` null is indefinite (BR70 and a legal hold); everything else lapses, which is what turns a refusal from *no* into *no, until this date* |
| **`erasure_request`** | Erasure Request | The question and its answer (BR49, BR132). **`person_id` is `on delete set null`, not cascade** — the request has to survive the erasure it authorised, because "we deleted them" and "we were asked and refused" are both answers a regulator may want years later. It carries no name, so what survives records *that* an erasure happened and never *whose* |
| **`retention_review`** | — (realises BR40, BR133) | What the schedule proposed and what a person did about it. Kept rather than recomputed, because over-retention needs evidence of *when* a record was flagged and who acted |

`person_role` admits a **seasonless** `life_member` (BR69) — enforced in
both directions by a check constraint, because a nullable column with a
convention attached is a column that holds a season for a life member by
Friday — plus `contact_confirmed_at` for BR71. `person` gains `deceased_on`,
a date rather than a flag because an honour roll and an anniversary both
need *when*. `club` gains `privacy_framework`, derived from the
`jurisdiction` it has carried since 0001 and then recorded, so a club that
changes jurisdiction does not retroactively change the framework its
existing records were collected under (BR52).

**Erasure deletes; it never redacts**
([decision 13](../../decisions/13_erasure_is_all_or_nothing.md)). A blanked
`person` row still joins to a team sheet and is re-identifiable in a minute,
so the schema relies on the `on delete cascade` it has had since 0001 rather
than adding a redaction path. BR82's merge tombstone is deliberately not
reused: a tombstone that identified the erased Person would defeat the
erasure.

## The competition catalogue

Added September 2026 by [scope 38](../../scope/38_the_catalogue_that_makes_br8_computable.md).
**The first three tables in this schema with no tenant column**, and the
only ones every club can read — see
[decision 15](../../decisions/15_the_competition_catalogue_is_shared_reference_data.md).

| Data Object | Realises | Notes |
| ----------- | -------- | ----- |
| **`association`** | Governing Body | The body that runs competitions. **No `club_id`** — it belongs to no tenant |
| **`classification_level`** | Classification | Ranked within its association (BR135). The rank is what makes BR8 a comparison rather than a string match, and **the one field in the catalogue where a typo changes an eligibility decision** |
| **`competition`** | Competition | Tier and playing format as free text beside the reference, for the reason `referee_classification.level` was free text: a constraint listing the formats somebody guessed would refuse the real ones. `minimum_classification_id` is BR8's floor, and a trigger keeps it inside the competition's own association |
| **`club_competition`** | Competition Participation | Which competitions this club plays in. **Tenant-scoped like everything else** — participation is the club's own business even though the catalogue is not |

`fixture` gains `competition_id` and `referee_classification` gains
`classification_level_id`, each **beside** the free text rather than
instead of it: rows recorded before the catalogue stay readable exactly as
the club entered them.

**Why the three tenantless tables do not weaken P5**, structurally rather
than by argument: they have **no column that could carry tenant data** — no
person, no club, no registration, no money. There is nothing in them to
leak, and a reader verifies that by reading twelve lines of `create table`.
RLS is still on; the read policy is `using (true)` for `authenticated`
rather than club-keyed, and writes are refused to everyone but a platform
administrator. `scripts/check_rls.py` carries the same reasoning as the
justification for its three new exemptions.

## Officiating interest

Added September 2026 by [scope 39](../../scope/39_asking_at_the_door_whether_they_also_officiate.md).

| Data Object | Realises | Notes |
| ----------- | -------- | ----- |
| **`officiating_interest`** | Officiating Declaration | What a family said at registration, **who said it** (BR137) and what a coordinator decided. Every column naming a declared value is prefixed `declared_` so nobody reads it as verified. A trigger enforces who may declare: the person themselves at thirteen (BR63's threshold), or a guardian holding authority (BR48). Who may be *declared* is unrestricted — MiniRefs are children ([#80](../../scope/open-questions.md)) |

**It creates nothing** (BR136). Accepting a declaration creates the referee
profile and the season role, and records the declared level as a
`referee_classification` with **`sighted_at` null** — which BR138 then
refuses to count. That is the whole design in one sentence: the club gains a
referee and gains nothing it has not verified.

## Carnivals, and the one public surface

Added September 2026 by [scope 40](../../scope/40_carnivals_and_the_one_thing_the_public_may_see.md).
The product's **only deliberate exception to P5** (P6,
[decision 3](../../decisions/3_public-event-data-crosses-tenant-isolation.md)).

| Data Object | Realises | Notes |
| ----------- | -------- | ----- |
| **`carnival_event`** | Carnival/Grassroots Event | Host club, dates, venue, the Carnival Conditions and the points system (BR29), and `published_at` — the single explicit, reversible act that invokes P6 (BR140) |
| **`carnival_entry`** | Event Entry | A club and a team taking part. The entrant is free text as well as an optional club reference, because a carnival's whole point is that clubs outside this platform take part |
| **`carnival_fixture`** | Carnival Fixture | The draw. A team cannot play itself, and half a score is refused — a ladder computed from one is a guess |

**These tables carry no `person_id` column, and that is the exception's
safety property** (BR139). Not "the policy excludes personal data" — there
is no column in which personal data could sit, so reading every row in full
discloses nothing about any child. `supabase/tests/37` asserts it against
`information_schema` rather than trusting it, because the whole grant rests
on it.

All three carry the **host** club's `club_id` and have ordinary
membership policies, with the public read *added* beside them — so unlike
[the competition catalogue](#the-competition-catalogue) they needed no
`check_rls.py` exemption and took none.

## Calendar distribution

Added September 2026 by [scope 41](../../scope/41_the_feed_a_referee_already_has_a_calendar_for.md),
implementing [decision 4](../../decisions/4_calendar-distribution-by-feed-not-account-access.md).

| Data Object | Realises | Notes |
| ----------- | -------- | ----- |
| **`calendar_subscription`** | Calendar Subscription | Whose appointments the feed carries, **who holds the URL** (BR33 — a minor's belongs to a guardian with authority, enforced by a trigger), and the salt behind it. The token is [decision 12](../../decisions/12_an_unsubscribe_link_is_derived_not_stored.md)'s construction reused: rotating the salt kills the previous URL immediately (BR31), with no revocation list to maintain |

**No calendar event is stored.** The feed is generated on read, so a
cancelled fixture cannot linger in a table waiting to be forgotten — and
`app_calendar_feed` is a **projection rather than a table read** (BR141):
the holder of the URL is by definition unauthenticated, so there is no
parameter they can vary to widen it.

BR34 is enforced by absence: no function accepts calendar data, so editing
or deleting the event in a personal calendar accepts, declines and cancels
nothing. The feed is one-way because there is no other way for it to be.

## Not yet modeled

Competition **Regulations** as documents (the catalogue above holds names,
tiers, formats and minimum classifications, not the rulebooks C11 also
names) and their public view, calendar subscriptions, and the
mobile client's `participation_response`. All exist as business objects and
none has a table.

A **campaign** is the near one: `message_subscriber` now records who may be
sent marketing and `message_log` records what was, but nothing models the
thing being sent — so the consent the demonstration door collects is
withdrawable and still not usable.

Three further absences are worth naming separately, because they are rules
rather than features: **BR40's retention** and **BR49's erasure** have no
persisted lawful-basis record to evaluate against, and **BR52's per-tenant
privacy framework** is not a column on `club` yet. A schema that holds
children's personal data and cannot yet express why it is keeping a row
should say so here.
