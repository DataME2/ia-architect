# Historical Import

_[← Annexes](./README.md) · [Scope 132](../scope/132_the_pilot_clubs_history_masked_and_imported.md) · [EA home](../ea/README.md)_

**Realises:** C9, BR90, BR197 and BR198
([rules](../ea/2_business/5_domain-context-and-rules.md)).

This annex is for two readers:

- **the club's admin**, who exports the club's past seasons from Majestri;
- **the platform owner**, who stages, checks and loads them.

The tool is `scripts/import_history.py` and the database function is
`import_history_season` (migration 0101).

## Before a real import

A real club's history goes into production only once
[open question 57](../scope/open-questions.md) is answered: what lawful
basis lets the platform hold years of children's records, and for how
long. A **masked copy for a test project** does not wait for it (BR198).

## What the admin sends

For **each season**, these Majestri exports as CSV, the whole season, with
names unchanged:

| Export (file name starts with) | One row per | Needed |
| ------------------------------ | ----------- | ------ |
| `Registrations_<year>Season` | family registration, players 1 to 5 | **Yes** |
| `RegistrationInvoices_<year>Season` | invoice line | **Yes** |
| `PlayersDebts_<year>Season` | player on an invoice | **Yes** |
| `TeamLists_<year>Season` | person in a team | Strongly wanted: without it, teams come from the debts export |
| `TeamDetails_<year>Season` | team | Wanted: it gives each team's category |

Send them through a folder the club controls, such as its SharePoint or
OneDrive, not as email attachments.

## The columns read

The script reads only these columns. Everything else in an export is
ignored and never leaves the file.

### Registrations

| Column | Lands in | Notes |
| ------ | -------- | ----- |
| `RegistrationDate`, `RegistrationTime` | `registration.created_at` | Read as Brisbane time |
| `PrimaryMemberFirstName`, `PrimaryMemberSurname` | `person` (the guardian) | When the name is a player's own, that player is an adult registering themselves |
| `PrimaryMemberEmailAddress` | `person.email` | Matches the family across seasons (BR197) |
| `PrimaryMemberMobileNumber` | `person.mobile` | Current season only |
| `EmergencyContactFirstName`, `EmergencyContactSurname`, `EmergencyContactMobileNumber`, `EmergencyContactEmailAddress` | `emergency_contact` | Current season only |
| `Player<n>FirstName`, `Player<n>MiddleName`, `Player<n>Surname` | `person.legal_given_names`, `person.legal_family_name` | |
| `Player<n>DateofBirth` | `person.date_of_birth` | A player without one is skipped and counted |
| `Player<n>Gender` | `person.gender` | |
| `Player<n>FFANumber` | `person.ffa_number` | The strongest match across seasons (BR197) |
| `Player<n>PreferredPlayingGroup` | `registration.playing_group` | |

### Registration invoices

| Column | Lands in | Notes |
| ------ | -------- | ----- |
| `Reference` | `historical_invoice.reference` | Majestri leaves it empty on every line after an invoice's first |
| `Date` | `historical_invoice.invoiced_on` | |
| `First Name`, `Surname` | `historical_invoice.payer_person_id` | The family's primary member, or a player whose guardian pays |
| `Invoice Amount`, `Paid Amount`, `Outstanding Amount` | `invoice_cents`, `paid_cents`, `outstanding_cents` | |
| `Line Description` | `historical_invoice_line` | The fee line, then the player's name after a line break. The category follows the club's own Power BI reading: club fee, governing body, levy, discount, or adjustment |
| `Line Amount` | `historical_invoice_line.amount_cents` | |

### Players' debts

| Column | Lands in | Notes |
| ------ | -------- | ----- |
| `InvoiceRef` | joins the invoice | |
| `TotalCreditAmount`, `NumberOfPayments`, `LastPaymentDate` | `credit_cents`, `payments`, `last_paid_on` | Majestri exports totals, not each payment |
| `PlayerFirstName`, `PlayerSurname`, `TeamName` | `team`, `team_member` | Read only when the season has no team list |

### Team lists and team details

| Column | Lands in | Notes |
| ------ | -------- | ----- |
| `TeamName`, `Category` | `team.name`, `team.category` | The *(2026 Season - …)* suffix is dropped |
| `Role` | | Only `Player` rows are read. An official needs a Working with Children Check the export cannot show (BR10) |
| `FirstName`, `Surname`, `DateOfBirth` | `team_member` | |

## What not to send

If the export lets the admin leave columns out, these can go. If it does
not, the script ignores them.

- **Notes and history:** `PrimaryMemberNotes`, `EmergencyContactNotes`,
  `Player<n>Notes`, `RegistrationChangesMade`, `RegistrationChangeHistory`,
  `NotifyEmailAddresses`. Typed notes name children.
- **Where a family lives and studies:** `Address`, `Suburb`, `State`,
  `Postcode`, `Player<n>SchoolName`, `Player<n>OtherSchool`,
  `Player<n>SchoolGrade`.
- **Marketing and volunteering:** `PrimaryMemberDiscoveryMethod`,
  `PrimaryMemberVolunteerPreference`, `PrimaryMemberVolunteerOther`,
  `PrimaryMemberSponsorInterest`, `PrimaryMemberReceivesponsorinformation`.
- **Consents:** `PrimaryMemberPublishphotographsconsent` and the team lists'
  `MediaRelease`. A consent is recorded when it is given to this platform
  (BR48); importing Majestri's answer would invent one.
- **The rest:** `PrimaryMemberPhoneNumber`,
  `PrimaryMemberAlternateEmailAddress`, `Player<n>PlayedLastSeason` (the
  history shows it), `Player<n><year>ClubName`, `Player<n>FQFeeBypassCode`,
  the invoices' commitment, pending and payable amounts, and the team
  lists' primary-contact, Squadi and PlayFootball columns.

## The steps

1. **Save the exports** in a folder of your own, outside the repository.
2. **Stage them:**

   ```bash
   python3 scripts/import_history.py --in EXPORTS --out STAGED
   ```

   Add `--mask` for a copy going to a test project. It stops without
   writing anything if a real value survives masking.
3. **Read `STAGED/report.md`.** Compare each season's counts with what the
   club expects. Look into any count of unlinked or ambiguous rows before
   loading.
4. **Have a club to load into.** A new club is provisioned as the
   [tenant provisioning annex](./tenant-provisioning.md) says. Note its id.
5. **Load:**

   ```bash
   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
     python3 scripts/import_history.py --load STAGED --club <club id>
   ```

   Seasons go in oldest first, each all or nothing. A season already
   imported is refused.
6. **Check:**
   - each season's printed `registrations` plus `alreadyRegistered` equals
     the report's `registrations`;
   - the registrar's queue holds none of them (BR90);
   - the duplicates screen shows the pairs BR197 left for a person to decide.
7. **Delete the staged folder** once the load is checked. The exports stay
   under the club's own retention.

## A masked copy

`--mask` replaces every name, email, FFA number and invoice reference, and
every typed note on an invoice. A mobile becomes 0491 570 006, a number
ACMA reserves for fiction. A birth date keeps its year, so no age group
changes, and the same date always masks to the same date. Siblings keep a
shared masked surname, and one child keeps one masked identity across
seasons. The key is random for each run and never written down.

A masked copy is **not anonymous**. Gender, birth year, team, playing group
and registration date stay. That is why BR198 keeps it in its own tenant.

## What the pilot club's data showed

Staged on 1 November 2026 from the exports behind the club's Power BI model:

| | 2024 | 2025 | 2026 |
| - | - | - | - |
| Players with an FFA number | 597 of 817 (73%) | 674 of 729 (92%) | 723 of 783 (92%) |
| Invoice lines naming nobody in the registrations export | 76 | 76 | 84, and 6 matching two players |
| Invoices whose payer could not be identified | 16 | 10 | 21 |
| A player listed twice in the season | 4 | 0 | 2 |
| Team list available | No | No | Yes: 773 of 783 players in a team |

**Ask the club for** the 2024 and 2025 team lists and team details.
Without them those seasons' teams come from the debts export, with no
category.
