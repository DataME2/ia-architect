# Project Scope — The Catalogue That Makes BR8 Computable

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

Two columns in this schema are free text with a comment explaining that they
become references when C11 exists. `fixture.competition` is one.
`referee_classification.level` is the other, and its comment says why the
alternative was worse: *"A check constraint listing the levels somebody
guessed would refuse the real ones."*

This initiative builds C11 and cashes both comments. The payoff is one rule:
**BR8 stops being a warning that says it cannot judge.**

## What this initiative starts from

Read `src/domain/officiating/conflicts.ts` today and BR8 is there, with an
apology:

> `// BR8 — cannot be completed. It compares a classification against the`
> `// *competition's minimum*, and no competition record exists. What can be`
> `// said is that there is nothing to compare.`

A referee with no classification produces a warning; a referee whose
classification is **below** the competition's minimum produces nothing at
all, because there is no minimum to be below. That is the gap, and closing
it needs three things that did not exist: a competition, a minimum on it,
and an **ordered** classification vocabulary so "meets or exceeds" is a
comparison rather than a string match.

**The catalogue is shared, not per-club**
([decision 15](../decisions/15_the_competition_catalogue_is_shared_reference_data.md)).
Per-club copies would make the same fixture eligible at one club and refused
at another because two registrars typed different numbers — a rule whose
answer depends on who typed the reference data.

**It also closes a loose end from [scope 36](./36_the_platform_learns_to_send_and_to_stop.md).**
BR64's fixture-change notification was built and left uncalled, because
nothing in the application edited a fixture. Giving a fixture a competition
means giving it an edit path, and the notification gets its caller.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No new goal.** C11 has been in the capability map since it was drafted, serving **G4** (full referee lifecycle). Touches **P5** and does not weaken it — see decision 15; the catalogue holds no tenant data and has no column that could |
| **2_business** | **Two new rules: BR134** (the catalogue is shared reference data, written by platform administration; a club's participation is its own row) and **BR135** (a classification level is ranked *within its association*, and levels from different associations are never compared). **BR8 becomes enforceable** for the first time. The **Competition & calendar** business service moves from Pending to partly realised |
| **3_information** | **Four new data objects** — `association`, `classification_level`, `competition` (all three **tenantless by construction**) and `club_competition` (tenant-scoped as usual). `fixture` and `referee_classification` each gain a reference beside the free text they have carried since they were written |
| **4_application** | C11 moves from *Not started* to *Partial*. New: the catalogue in `src/domain/competition/`, `src/data/competitions.ts`, catalogue maintenance on `/platform`, the club's competitions and a fixture form that selects rather than types. **`conflicts.ts` gains a real BR8** |
| **5_technology** | **No change.** No new runtime, dependency, secret or host |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | `fixture.competition` and `referee_classification.level` are free text. BR8 warns that it cannot judge. Nothing in the application edits a fixture, so BR64's notification has no caller |
| **Target** (delivered) | An association's competitions, playing formats and ranked classification levels are catalogued once and read by every club. A fixture references a competition. BR8 refuses a referee below the competition's minimum, and says by how much. A fixture can be edited, and every affected participant is told |

## Work packages and deliverables

### WP1 — The catalogue

- **Deliverables:** `supabase/migrations/0032_competition_catalogue.sql` —
  `association`, `classification_level` (ranked), `competition`,
  `club_competition`, their policies, and the three `check_rls.py`
  exemptions with their justification
- **Outcome:** BR134 holds. Reference data exists once, readable by every
  club, writable by nobody inside one.

### WP2 — BR8, computable

- **Deliverables:** `src/domain/competition/` (the ranked comparison),
  `conflicts.ts` rewritten so BR8 is a **blocker** rather than an apology
- **Outcome:** BR8 and BR135 hold. A referee below the minimum is refused,
  and the message says which level was needed.

### WP3 — A fixture references a competition

- **Deliverables:** `fixture.competition_id`; the fixture form selecting
  from the club's competitions
- **Outcome:** R27.2 holds **at the write path**, without rewriting the rows
  that predate the catalogue. The database refusal that was written for it
  was removed — see the gap note.

### WP4 — Editing a fixture, and telling everyone

- **Deliverables:** the fixture edit action, and the BR64 notification call
  scope 36 left without one
- **Outcome:** A change to a fixture's time, venue or status reaches every
  affected participant.

### WP5 — The screens

- **Deliverables:** catalogue maintenance on `/platform`; the club's
  competitions on `/registrar/season`
- **Outcome:** A platform administrator can fill the catalogue; a club can
  say which competitions it plays in.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Competitions, tiers, playing formats, minimum classification | **Competition Regulations as documents.** C11 names them; a rule engine over a PDF is not this slice |
| Ranked classification levels per association | **The Football Queensland pathway, seeded.** Shipping levels somebody guessed would refuse the real ones — the trap `referee_classification`'s own comment warns about |
| A fixture referencing a competition | **Rewriting the free text on existing fixtures.** Those rows predate the catalogue and stay as they are |
| A draw or ladder per competition | **Out.** A ladder belongs with carnivals (C12), which model a multi-club event properly |
| BR8 as a blocker | **BR12's decline-rate threshold**, which is per classification and still waits on a season of history |

## Gap notes

- **The catalogue ships empty, deliberately.** A platform administrator
  fills it. Seeding it with a guessed Football Queensland pathway would
  refuse the real levels, which is exactly why
  `referee_classification.level` was free text in the first place — and a
  wrong minimum in shared reference data is worse than none, because BR8
  now acts on it.
- **A club cannot correct the catalogue.** If an association renames a
  competition the club waits for the platform owner. Decision 15 takes that
  cost on purpose; a club editing shared data is how per-club copies start
  disagreeing again.
- **Free text is not refused by the database, and the trigger that refused
  it was written and then removed.** It broke three existing suites, which
  was the cheap signal; the expensive one was what it would do to a real
  club. **The catalogue ships empty**, so until a platform administrator
  catalogues an association, refusing free text means a club can record no
  competition at all — "U12 Div 2" becomes nothing rather than becoming a
  reference, which is worse than the free text it replaces. R27.2 is
  enforced where it costs nothing: the form writes `competition_id` only.
  This becomes a trigger the day the catalogue is reliably populated, and
  that is the condition rather than a someday.
- **BR8 is only as good as the rank.** Two levels given the same rank
  compare as equal, and nothing detects that somebody meant them to differ.
  The rank is a small integer a platform administrator sets, and it is the
  one field in the catalogue where a typo changes an eligibility decision.

## Open questions

- **[#77] Can a club play in a competition belonging to an association it
  is not affiliated with?** Adopted: **yes, and nothing prevents it.**
  Carnivals and invitational competitions cross associations routinely, and
  a constraint here would refuse a real fixture to enforce a tidiness nobody
  asked for. Revisit if an association asks for the opposite.
- **[#78] Should a fixture's competition be required?** Adopted: **no.** A
  club records friendlies and trials, and `fixture.team_id` is already
  nullable for the same reason — refusing the row would mean the game is not
  recorded at all. BR8 then has no minimum to compare against, and says so
  rather than inventing one.
