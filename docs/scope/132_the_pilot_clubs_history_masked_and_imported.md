# Project Scope — The Pilot Club's History, Masked and Imported

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/pilot-history-import` (local, not pushed).

- Migration 0101 was dry-run on DEV inside a rolled-back transaction, and
  all 10 scenarios of its test passed. It is **not applied** anywhere yet.
- The pilot club's 2024, 2025 and 2026 exports are staged and masked on the
  platform owner's machine. Nothing has been loaded.

On 1 November 2026 the product owner shared the pilot club's Power BI model
(`ns_data_transform.pbix`). It is built from the club's Majestri exports for
the 2024, 2025 and 2026 seasons. They asked for four things:

- which important columns are missing from the database;
- names and personal details masked, for the test environment only, so the
  current features can be tested on the club's real shape;
- a process for migrating the history, and a list of the columns to request
  from the club's admin;
- better reports.

They decided the same day:

- the masked history goes into a **separate test club on DEV**;
- the database gains **gender and FFA number, a mobile and an emergency
  contact, and a playing group and a team category**;
- the first import is **run by the platform owner**, with an in-app upload
  later;
- the reports become **multi-season trends**. That is scope 133, next, on its own branch,
  because it needs this scope's data first.

## What the club's data holds

The model reads five kinds of export: registrations, invoices, debts, team
lists and team details. Staged, they hold:

| Season | Registration rows | Players | Guardians | Invoices | Teams | Players in a team |
| ------ | ----------------- | ------- | --------- | -------- | ----- | ----------------- |
| 2024 | 696 | 817 | 564 | 795 | 69 | 813 |
| 2025 | 633 | 729 | 511 | 667 | 59 | 688 |
| 2026 | 694 | 783 | 494 | 754 | 67 | 773 |

A registration row is one family, with up to five players. Team lists and
team details exist **for 2026 only**. For 2024 and 2025 a player's team
comes from the debts export. Every column, where it lands, and what the
admin should and should not send is in the
[historical import annex](../annexes/historical-import.md).

**What was missing, and is now added:**

| Missing | Why it matters | Now |
| ------- | -------------- | --- |
| A player's **gender** | The club's first report is players by gender; girls' teams depend on it | `person.gender` |
| The **FFA number** | Filled for 92% of 2025 and 2026 players: the closest thing to a shared key, so most matches across seasons are exact | `person.ffa_number` |
| A family's **mobile** | The platform held no phone number for anyone in a club | `person.mobile`, current season only |
| An **emergency contact** | Every registration names one. A children's club had nowhere to keep it | `emergency_contact`, current season only |
| The **playing group** asked for | "MiniRoos - Girls - Under 10". For 2024 and 2025 it is the only age-group history | `registration.playing_group` |
| A team's **category** | Miniroos, Academy, Metro Junior Boys and others | `team.category` |
| **Imported history** itself | BR90 existed with nothing to attach to | `historical_import`, `registration.imported_from` |
| What a season **invoiced and collected** | Every finance chart the club already draws | `historical_invoice`, `historical_invoice_line` |

Address, school, previous club, volunteering, how the family heard of the
club, sponsor interest and notes are **not imported**. The product owner
left them out on 1 November, and leaving them in the export is data
minimisation.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves C9 and the value stream's *Validate* stage. C9 was restated by [scope 28](./28_onboarding-a-club-and-its-history.md) as a repeatable import from a club-supplied export; this builds the first one |
| 2_business    | **Changed.** **BR90 built and restated**: *any* imported registration is history, not only one from a previous season. **BR197** (who an imported row is) is new and adopts an answer to open question 56. **BR198** (a masked copy) is new and allows the test copy while open question 57 stays open for real data |
| 3_information | **Changed.** `person.gender`, `person.ffa_number` and `person.mobile`; `registration.playing_group` and `registration.imported_from`; `team.category`; and four tables: `historical_import`, `historical_invoice`, `historical_invoice_line` and `emergency_contact`. In the [data objects](../ea/3_information/1_data-objects.md#a-clubs-history) |
| 4_application | **Changed.** `import_history_season` (one season, all or nothing) and `scripts/import_history.py` (stage, mask, load). C9 moves from *Designed* to *Partial* in the [application services](../ea/4_application/1_application-services.md) |
| 5_technology  | **Changed.** Migration 0101 with its test `supabase/tests/91_*`, and a CI step running the masking self-test. The [deployment](../ea/5_technology/2_deployment.md) records that DEV may now hold masked data, in its own tenant |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | The club's three seasons live in Majestri exports and a Power BI model on the owner's laptop. The database has no gender, phone, emergency contact or history, and BR90 is a sentence |
| **Target** (delivered) | The exports are staged by one script, masked for a test project or not, and loaded one season at a time by a function that makes them history. Every family, child and invoice is the club's past, never its work |

## Work packages and deliverables

### WP1 — What to ask the admin for

- **Deliverables:** [`docs/annexes/historical-import.md`](../annexes/historical-import.md):
  - the exports per season and the columns read from each;
  - the columns not to send;
  - the steps from export to load, and the checks after;
  - what this club's data showed when it was staged.
- **Outcome:** an admin can be sent one page and return what the import
  needs, and nothing more.

### WP2 — The history in the database (0101)

- **Deliverables:** `supabase/migrations/0101_a_clubs_history_is_imported.sql`:
  - the new columns, with checks;
  - `historical_import`, read by the admin, registrar and treasurer, and
    written only by the import;
  - `registration.imported_from`, guarded by
    `registration_imported_is_history`. An imported registration's status and
    balance never change, and only the import may set the column (BR90);
  - `price_new_registration`, `app_preview_season_prices` and
    `app_reprice_season` re-created to pass history by;
  - `emergency_contact`, read and kept by the admin and registrar;
  - `historical_invoice` and `historical_invoice_line`, read by the admin,
    registrar and treasurer;
  - `import_history_season(club, batch)`: run with the owner's key only, it
    creates the season if needed, matches people by BR197, and refuses a
    season already imported.
- **Tests:** `supabase/tests/91_a_clubs_history_is_imported.sql`, 10
  scenarios. `99_grants.sql` narrows the test harness's blanket grant on the
  import, as 0070's did for the balance.
- **Outcome:** history can come in, and cannot be mistaken for work.

### WP3 — Staging and masking

- **Deliverables:** `scripts/import_history.py`:
  - **stage:** reads only the annex's columns and links invoice lines,
    debts and team lists to players by name. It writes one batch per
    season, with keys that carry no names, and a report of what linked;
  - **`--mask`:** BR198, with one random key per run that is never kept;
  - **`--load`:** sends each season to `import_history_season` with the
    service-role key;
  - **`--self-test`:** an invented family across two seasons. Run by
    `npm run check` and CI.
- **Outcome:** the same tool makes the real import and the test copy, so
  testing the copy tests the import.

### WP4 — The masked test club on DEV *(waiting on approval)*

- **Deliverables:**
  - 0101 applied to DEV;
  - a club named *North Star FC (masked history)*, provisioned the usual way,
    with an admin account the product owner signs in with;
  - the three masked seasons loaded into it, and the counts compared with
    the staging report.
- **Outcome:** the current screens can be tried against the club's real
  shape: 2,329 player registrations across three seasons, siblings,
  duplicates, and teams.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The six missing columns, the history tables and BR90's guard | Address, school, previous club, volunteering, discovery and sponsor interest |
| A season imported once, all or nothing, by the platform owner | An in-app upload for the club's admin |
| Players in teams | Coaches and managers: a clearance cannot be imported |
| What each invoice billed, collected and left owing | Each individual payment; Majestri exports totals and a count |
| A masked copy on DEV, in its own tenant | The real import into PROD, which waits on open question 57 |
| | Multi-season reports (scope 133) |

## Gap notes

- **The real import waits on open question 57.** BR198 lets a masked copy
  onto a test project. It does not say the platform may hold three years
  of real children's records; that is still the lawful-basis question.
- **Officials are not imported.** Linking a coach to a team needs a
  Working with Children Check (BR10, BR19), and the export cannot show
  one. The 2026 team lists hold 158 official roles.
- **Payments are totals.** Majestri's debts export gives each invoice's
  paid amount, number of payments and last payment date, not each payment.
  `historical_invoice` keeps exactly that.
- **About 80 invoice lines a season name nobody in the registrations
  export.** The surname is known, the first name is not, which suggests
  nicknames. They stay on their invoice, unlinked, and the report counts
  them.
- **An imported debt is not chased.** BR90 says history never triggers fee
  chasing, so a 2025 balance imported from Majestri is reported, not
  collected. Until the club moves, Majestri chases its own debts. Bringing
  an arrear across to collect it would be a decision for the treasurer, and
  its own scope.
- **Registration times are Brisbane time.** That is right for the pilot. A
  club in a state with daylight saving needs its offset in the script.
- **A masked copy is not anonymous.** Names, contacts and numbers are gone,
  but each child keeps their birth year, gender, team and registration
  date. In a small team that can still point at one child, which is why
  BR198 keeps the copy in its own tenant, which only an account holding
  a membership of it can read (P5).
- **A next test once it is loaded:** compare what BR195 would charge each
  2026 player with what Majestri invoiced them. The club's own invoices
  check the pricing engine.

## Open questions

- **#56, duplicate resolution at import scale:** adopted for now as BR197.
  A match needs the FFA number and birth date, or an email and both names,
  or both names, the birth date and a shared guardian. A name and birth
  date alone make a new Person, left for the duplicates screen. Recorded in
  the [open-questions log](./open-questions.md).
- **#57, the lawful basis for imported data:** still open for real data.
  Adopted for now, for test copies only, as BR198.
