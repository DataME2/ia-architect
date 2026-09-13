# Project Scope — Forgetting, and the Reasons Not To

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

The platform holds children's personal data across two legal regimes and,
until now, **could not honour an erasure request or say why it refused
one**. BR40's retention and BR49's erasure have been in the business layer
since it was drafted, and neither had a line of code. This initiative builds
both — plus the two rules that hang off them: authority transferring at
eighteen (BR67) and the life-member register that BR70 exempts from the
clock entirely (BR69–BR71).

These are statutory rather than desirable. That is the whole argument for
doing them now, ahead of competitions, carnivals and dashboards, all of
which are more visible and none of which a regulator asks about.

## What this initiative starts from

**Erasure and retention are one piece of machinery seen from two
directions.** Both ask the same question — *is there a reason this record
must stay?* — and differ only in who is asking and what happens when the
answer is no. Building them apart would have produced two answers to that
question, which is the shape that eventually disagrees with itself. So
there is one table of reasons, `retention_basis`, and one pure function over
it.

**Two decisions were settled before any code.**
[Decision 13](../decisions/13_erasure_is_all_or_nothing.md): erasure deletes
or refuses, and never redacts in place — a blanked row is re-identifiable
from any team sheet, and calling that erasure is a claim the platform cannot
support. [Decision 14](../decisions/14_retention_proposes_a_person_disposes.md):
the schedule flags and a person disposes, because a wrong predicate in an
unattended job destroys a club's history and leaves nothing to notice it by.

**And Phase 8 had to come first.** Both of these need to *tell* somebody —
a parent the outcome of their request, a club that a record is past its
period. Until [scope 36](./36_the_platform_learns_to_send_and_to_stop.md)
the platform could not send anything, which is why erasure waited behind a
mailing feature that looked less important.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No new goal.** Serves **P7** (safeguarding and privacy built in, per jurisdiction, from day one) whose clause (b) — a right-to-erasure protocol that records the basis when it refuses — is exactly what was missing. **G8** (life members recognised and never lost to a retention job) becomes real rather than stated |
| **2_business** | **Two new rules: BR132** (an erasure request is a record that survives the erasure, carrying none of the erased Person's data) and **BR133** (retention proposes, a person disposes). BR40, BR49, BR52, BR67 and BR69–BR71 gain code. The **Consent & privacy rights** business service moves from partial to realised for its erasure clause |
| **3_information** | **Three new data objects** — `retention_basis` (the reasons a record must stay, each with an expiry), `erasure_request` (the question and its answer), `retention_review` (what the schedule proposed). `person_role` admits a **seasonless** `life_member`; `club` gains a `privacy_framework` derived from the `jurisdiction` it has carried since 0001 |
| **4_application** | C15 moves from *Partial* to substantially delivered. New: `src/domain/privacy/` (the verdict, the retention state, the jurisdiction map), `src/data/privacy.ts`, `/registrar/privacy`, and the club data export BR68 has promised since the strategy layer |
| **5_technology** | **One new runtime shape: scheduled execution.** Supabase's scheduler, invoked under the `scheduled-job` bypass reason that has been enumerated in `RlsBypassReason` since the client module was written and never used. No new dependency |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | No erasure, no retention, no disposal. A guardian's authority never ends. A life member is indistinguishable from a lapsed player. `club.jurisdiction` is recorded and read by nothing. BR68's export is "nearly free" and absent |
| **Target** (delivered) | An erasure request is answered — honoured, or refused naming every basis and its expiry. Records past their retention period are proposed to a club officer and disposed of by one. Authority ends at eighteen on its own. A life member is seasonless, a deceased one is exempt from the clock, and a living one is flagged when their details go stale. A club can export everything it holds |

## Work packages and deliverables

### WP1 — The reasons a record must stay

- **Deliverables:** `retention_basis` and its policies;
  `src/domain/privacy/bases.ts`; the jurisdiction → framework map and the
  statutory minimums it carries (BR52)
- **Outcome:** *Why* a record is kept becomes a row with an expiry date,
  rather than an argument someone has to reconstruct.

### WP2 — Erasure

- **Deliverables:** `erasure_request`; `erasureVerdict()` in
  `src/domain/privacy/erasure.ts`; `app_request_erasure()` and
  `app_decide_erasure()`; the intake and decision screens
- **Outcome:** BR49 and BR132 hold. A refusal names its bases in words a
  parent can read, and says when each expires.

### WP3 — Retention

- **Deliverables:** `retention_review`; `retentionState()` in
  `src/domain/privacy/retention.ts`; `app_run_retention_review()`; the
  disposal screen
- **Outcome:** BR40 and BR133 hold. The schedule proposes; a person
  disposes.

### WP4 — What the clock does not reach

- **Deliverables:** seasonless `life_member` on `person_role`;
  `deceased_on` on `person`; BR71's contact-review flag; BR67's automatic
  transfer of authority at eighteen
- **Outcome:** G8 is real. A deceased life member is never proposed for
  disposal, and a living one's stale contact details are surfaced.

### WP5 — The club owns its data

- **Deliverables:** `export_club_data()` and the download route
- **Outcome:** BR68 stops being a claim. A club can take everything it
  holds and leave.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Erasure, refused or honoured | **Partial redaction** — refused outright, [decision 13](../decisions/13_erasure_is_all_or_nothing.md) |
| Retention computed and proposed | **Automatic disposal** — refused outright, [decision 14](../decisions/14_retention_proposes_a_person_disposes.md) |
| The statutory minimums as configuration | **Legal advice.** The minimums shipped are the ones a club can point at; they are defaults a club's own counsel may raise, not a compliance opinion |
| A club-scoped export of everything | **Import of that export elsewhere.** Portability is the export; the other end is not ours |
| Authority ending at eighteen | **Re-consent at eighteen.** Authority transfers; whether the young person is then *asked again* about publicity is a product question nobody has answered |

## Gap notes

- **The scheduled job needs a scheduler, and there is no production
  environment to run one in.** `app_run_retention_review()` is idempotent
  and callable by hand, and a club officer can run it from the screen. Until
  a production project exists (and `pg_cron` with it), "nightly" is a
  button. That is honest and it is not the intended end state.
- **The statutory minimums are defaults, not advice.** Seven years for
  financial records and until-25 for child-safety records are the figures a
  club can point at in Australia and New Zealand; the framework map makes
  them per-jurisdiction configuration rather than constants, so a club's own
  counsel can move them. Nobody here is a lawyer, and the code says so.
- **An erased Person's message log survives, carrying an email address.**
  `message_log.to_email` is a record of what was sent, and the cascade does
  not reach it once `subscriber_id` goes null. Left deliberately: BR127's
  log is the answer to "did you contact this person", which is a question an
  erasure request does not dissolve. Flagged because it is the one place an
  erased Person's address persists, and a reader should not have to find
  that out from the schema.
- **Re-consent at eighteen is not asked.** Authority transfers on the
  birthday; the publicity consent a guardian granted stays granted. BR67
  says the rights transfer, not that the answers reset, and inventing a
  re-consent prompt would be the platform deciding a product question.

## Open questions

- **[#75] Who may decide an erasure request — any administrator, or the
  club's Member Protection Officer?** Adopted: **an administrator**, because
  most clubs in the pilot's tier have no Member Protection Officer and a
  permission nobody holds is a request nobody answers. Revisit when a club
  has one.
- **[#76] Should a refused erasure be re-proposed automatically when its
  last basis expires?** Adopted: **no, but the expiry is recorded and the
  request stays queryable**, so a club can see what became honourable and a
  family can ask again knowing the date. Re-opening it automatically would
  mean acting on a request a family may have abandoned years earlier.
