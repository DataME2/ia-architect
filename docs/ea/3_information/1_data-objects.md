# Data Objects

_[← Information layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Data Object.

The persisted form of the
[business objects](../2_business/4_business-objects.md), scoped to the
**registration slice** ([scope document 17](../../scope/17_mvp-registration-slice.md)).
Objects outside that slice — finance, referee appointments, carnivals,
calendar — are modeled in the business layer and deliberately not here yet.

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
| **`team`** | Team | Club- and season-scoped, unique on name within a season |
| **`team_member`** | Team Membership | One row per person per team per role, so a parent who also coaches is two rows and one Person |
| **`clearance`** | Clearance | `kind`, `identifier`, `issued_on`, `expires_on`, and **`verified_at` separately from the card number** — null means someone typed a number and nobody checked it (BR19). Superseded cards are kept rather than overwritten. **Read is narrower than the rest of the slice**: admin and registrar only, because a card number is a safeguarding record rather than ordinary club information, while the roster it gates is readable by any member |
| **`validation_result`** | — (realises C6) | One row per rule evaluation against a registration: which rule, pass or fail, and the message. Persisted rather than computed on the fly, so the club can see *why* a registration is not ready without re-running anything |
| **`submission_pack`** | Registration Submission Pack | Immutable and versioned (BR58): `version`, `generated_at`, `generated_by`, `club_id`, `season_id`, `channel`, `handed_over_at`, and **`manifest`** — the frozen rows exactly as generated. The single permitted update is stamping the handover, and only while `handed_over_at` is still null. **`manifest` was added while building the submission screen**: BR58 requires the pack to answer "did we submit this player, *and with what values*?", and without it a name corrected after submission would make the pack appear to have carried the corrected one — which is precisely the disputed-eligibility case the rule exists for |
| **`submission_record`** | Submission Record | One person per pack, with `state` ∈ {sent, confirmed_present, rejected} and `rejection_reason`. **The table that keeps *sent* and *registered* apart** (BR60) |
| **`audit_event`** | — (realises BR15, BR59, BR67) | Append-only. Who did what, when, to which row. Overrides of conflict warnings, pack generation and handover, and the transfer of authority at 18 all land here |

## Three modelling decisions worth defending

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

**Validation results are persisted.** The alternative — recomputing on
render — is cheaper until the registrar asks "what was wrong with this in
March?", or until [#32](../../scope/open-questions.md)'s measurement needs
the failure history that nobody kept. Storing them makes the baseline
decomposition a query rather than a new instrumentation project.

## Not yet modeled

Finance (`invoice`, `payment_plan`, `voucher_*`), referee appointments and
payment, competitions and fixtures, carnivals, calendar subscriptions, and
the mobile client's `participation_response` and active role context. All
exist as business objects; none are in the registration slice.
