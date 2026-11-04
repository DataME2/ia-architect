# Data Architecture

_[← Information layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Artifact, Data Object (classification and retention
views).

Where the [data objects](./1_data-objects.md) live, how sensitive each
class is, and how long it is kept.

## Classification

Four classes. The classification drives access policy, what may leave the
platform (BR59), and what may reach an AI service (Principle P4).

| Class | What is in it | Handling |
| ----- | ------------- | -------- |
| **Regulated — children** | A minor's identity, date of birth, photograph, guardianship, documents, WWCC evidence, daily check-ins (`wellbeing_entry`, `rpe_entry`: health information, BR186) | Tenant-isolated; **never sent to an uncontrolled AI service** (P4); disclosure only under a consent that names it (BR48); the class the retention schedule treats most conservatively |
| **Sensitive — personal** | An adult's equivalents, contact details, referee payment details | Tenant-isolated; disclosure only for a stated purpose |
| **Internal — operational** | Validation results, submission packs and records, audit events, configuration | Tenant-isolated; not personal in itself but frequently *about* someone, so it inherits their class where it names them |
| **Public** | Published carnival schedules and results, club/team level only (BR26, P6) | The single scoped exception to P5, and the only class readable without authentication |

### Financial information (proposed, scope 134)

[Scope 134](../../scope/134_pitchpeople_financial_intelligence.md) adds
two classes and sharpens one. None changes how an existing table is
handled.

| Class | What is in it | Handling |
| ----- | ------------- | -------- |
| **Sensitive — financial** (a named part of *Sensitive — personal*) | What a family owes, paid, was refunded or was relieved of; hardship reasons; payout nominations; provider transactions that carry a payer's name or email | Tenant-isolated; read by the money roles and the family itself (BR78, BR121); **never** to a governing body (BR215), a benchmark (BR217) or an uncontrolled AI service (P4). Where the payer or beneficiary is a minor it inherits *Regulated — children* |
| **Public reference** | Governing bodies' published fee and sanctioning policies and transparency reports | No tenant column; readable by every club, written by the platform administrator — the competition catalogue's settlement ([decision 15](../../decisions/15_the_competition_catalogue_is_shared_reference_data.md)), and justified the same way: no column can carry a club's or a person's data |
| **Aggregated — non-identifying** | Benchmark cohort figures | No tenant column and no list of contributors; published only above the cohort and dominance thresholds (BR217). The single place a figure about several clubs exists, permitted by P8(b) |

**A grant is not a class either.** A club-level figure read by a governing
body under a grant (BR214) stays *Internal — operational* about the club; the
grant decides who may read it, not what it is.

**A pack is not its own class.** A `submission_pack` containing hundreds of
children's names and photographs is regulated data in a file, and BR59's
minimisation exists because classification does not survive export — once
the file leaves, the platform's access control does not travel with it.

## Where it physically lives

| Artifact | Store | Notes |
| -------- | ----- | ----- |
| All tables | Supabase Postgres, Sydney (`ap-southeast-2`) | Row-Level Security on **every** table, keyed on `club_id` |
| Photographs, identity documents | Supabase Storage, same region | Bucket policies mirror the row policies — a file is never more readable than the row referencing it |
| Generated submission packs | Supabase Storage, versioned paths | Immutable once written (BR58); a new version is a new object, never an overwrite |
| Audit events | Postgres, append-only | No update or delete grant, including for service roles |

## Tenant isolation is a database property

Every table carries `club_id` and every table has an RLS policy. The
policies are the enforcement point for **P5**, which makes two things
build-time obligations rather than good intentions:

- **A table without a policy is a leak**, not a to-do. The migration set is
  checked for coverage; a new table with no policy fails the check.
- **Service-role access bypasses RLS by design.** Anything running with it
  — pack generation, scheduled jobs — carries its own explicit `club_id`
  scoping and is the code that gets reviewed hardest.

## Retention

Retention follows **BR40** as restated: status-based, at least ten years
for a Person still active in football, a maximum of two years once they
stop. **That rule is not implementable as written**, and this layer is
where that becomes concrete rather than theoretical.

Retention is **per record class**, and the proposed schedule lives in the
[retention annex](../../annexes/retention-schedule.md): seven years for
financial and WWCC records, two years for contact and marketing
preferences, two seasons for operational ephemera — and **decades for
participation and incident records involving minors**, where Queensland's
removal of limitation periods for child sexual abuse claims puts the
requirement far beyond BR40's two-year ceiling.

**Financial retention needs a date the platform cannot name yet.** The
schedule keeps financial records seven years *from the end of the financial
year the transaction falls in*, and no club has a recorded financial year
(BR219, proposed). Until one exists, the conservative reading — the latest
plausible financial-year end after the transaction — is the one any
retention tracking must use. Scope 134 adds rows the schedule does not yet
list: provider transactions and payment reconciliations (seven years, as
financial records), raw provider webhook bodies (a short operational
period, since the parsed transaction is the record), event budgets and
sanctioning assessments (seven years), governing-body grants and their
access logs (the grant's life plus seven years), and benchmarking consents
(participation plus seven years). Each needs a row in the
[retention annex](../../annexes/retention-schedule.md) before its table is
built.

**Nothing deletes automatically until [#30](../../scope/open-questions.md)
is answered.** The platform builds retention *tracking* — every row knows
its class and its eligible-for-disposal date — and no disposal job. That
split is deliberate: tracking is safe and useful immediately, and automated
deletion on an unconfirmed schedule is the one build in this project that
could cause irreversible harm.

**De-identification is the release valve.** Most long-tail classes need the
*fact* of participation, not the person's contact details. Designing
de-identification as a first-class operation — distinct from deletion — is
what stops a decades-long retention meaning decades of holding a phone
number, and it is what makes BR49's erasure protocol deliverable against
BR40's ten-year floor.
