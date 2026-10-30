# Project Scope — The Club's Fee Schedule

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/fee-schedule`. **WP1 to WP3 are built.**

- Migration 0099 was applied by hand to DEV (`sxsloxdtpcjpdobwpwsm`) on 30
  October 2026, with the product owner's approval. PROD follows their review
  on DEV.
- WP4, the family's checkout, is the next step. It changes how a
  registration opens, so it is reviewed on its own.

On 30 October 2026 the product owner asked for each club to set its own fees,
and for only the admin and the treasurer to set them. Their reference is the
pilot club's schedule. It has:

- 14 registration lines by programme and age group, some with a fixed
  deposit, each marked *admin only*;
- Football Queensland's four registration fees;
- a volunteer levy;
- sibling discounts.

They also supplied registration terms with placeholders (`{club}`,
`{club_email}`, `{date_in_future}`, `{check_website_link}`). Open question 118
was answered over the day:

- a sibling is another player registered by the same parent or guardian;
- the discount is settable by the club;
- by default it is **15% off each later sibling's fee, which depends on
  their team**.

Today a season has one fee (`season.registration_fee_cents`), which BR3's
opening outstanding amount reads.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves G3, consolidated player finance |
| 2_business    | **Changed.** New BR195: what a registration costs. New BR196: who may set the fees, the discount and the terms. BR3 is unchanged: a registration is still not COMPLETE with anything outstanding. Only the amount it opens with changes. BR192 to BR194 stay reserved for [scope 126](./126_match_officials_on_the_board.md)'s proposals |
| 3_information | **Changed.** New data objects: a **fee line** (club, season, name, team or age group, amount, optional deposit, admin-only flag), a **governing-body fee** (club, season, age band, amount), a **levy** (club, season, name, amount), the club's **sibling discount** (a percentage, 15 by default), and the **registration terms** (the club's text with its placeholders' values). All of them have a `club_id` and RLS |
| 4_application | **Changed.** A new page, `/registrar/registration-fees` (*Registration fees* under Money), in tabs: *Fee schedule*, *Sibling discount* and *Terms*. `/registrar/fees` stays the match officials' rates, which the 30 October request asks to join their payments. The registration's checkout will show the lines, the discount and the terms, with a box to accept the terms (WP4). The amounts are decided in `src/web/registration-price.ts`, pure and tested |
| 5_technology  | **Changed.** One migration with RLS for the new tables, applied by hand. `check_rls.py` and `test_rls.sh` cover them |

## The rules (added to the rules table)

- **BR195 — what a registration costs.** A registration opens owing the sum
  of three things:
  - the club's fee line for the player's team, or for their age group when
    the team has no line of its own;
  - the governing body's fee for the player's age band;
  - each levy.

  A player registered by the same parent or guardian as an earlier player
  in the same season and club gets the club's sibling discount off their
  **club fee line only**: 15% by default, for every sibling after the first.
  Governing-body fees and levies are never discounted. "The first" is the
  first registered that season.
- **BR196 — who sets them.** Only the club's admin and treasurer may create,
  change or retire a fee line, a levy, the discount or the terms. A change
  never reprices a registration already opened, as a match official's rate
  never reprices a played game (BR115, BR116).

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (now)     | One fee per season, typed by the registrar. Siblings pay in full. No terms are shown |
| **Target** (planned)   | The admin or treasurer builds the club's schedule. A family sees each line, the governing body's fee, the levy and any sibling discount before paying, and ticks to accept the club's terms. The registration opens owing exactly that sum |

## Work packages and deliverables

### WP1 — The rules and the price (pure) — built

- **Deliverables:** `src/web/registration-price.ts` and its tests:
  - matching a team or an age group to its line;
  - the sibling order within a guardian's registrations;
  - 15% (or the club's percentage) off the club line only;
  - rounding to the cent;
  - and the BR195 and BR196 rows in the rules table.
- **Outcome:** the sum is decided once and tested, before any screen shows it.

### WP2 — The schedule's tables — built, applied to DEV

- **Deliverables, as built:**
  - `supabase/migrations/0099_a_club_sets_its_own_fees.sql`:
    - `fee_line`: one table, whose `kind` is `club`, `governing` or `levy`, rather than one table per kind;
    - `fee_settings`, the discount in basis points, 1500 by default;
    - `registration_terms`, the body with its placeholder values.
    - Lines are retired, never deleted.
    - RLS: read by the admin, the registrar and the treasurer; written by the admin and the treasurer only (BR196).
    - It registers its receipt, and `src/data/migration-drift.ts` expects it.
  - `supabase/tests/97_a_club_sets_its_own_fees.sql`, 11 scenarios. It runs in CI, since this machine has no `psql`.
  - The database function that opens a registration at BR195's price belongs to WP4.
- **Outcome:** the schedule lives in the database, and only the two roles can
  change it.

### WP3 — Setting it up (admin and treasurer) — built

- **Deliverables, as built:**
  - `src/app/registrar/registration-fees/` (page, forms and actions), with `src/data/registration-fees.ts` and `src/web/registration-fee-form.ts` (7 tests). It is in tabs:
    - **Fee schedule:** lines grouped as the pilot club groups them (club registration, governing body fees, levies), each with its *admin only* marker, ages, amount and fixed deposit, and a *Retire* button for the two roles. Beside it, *What would a family pay?* works out the breakdown live for an age, a child number and a line, by the same rule (BR195), with the total pulsing as it changes.
    - **Sibling discount:** the percentage.
    - **Terms:** an editor in which each placeholder gets its own field and a paper preview shows the family's reading as it is typed. A club with no terms starts from the product owner's text, with the pilot club's addresses turned into placeholders.
  - *Registration fees* is in the club menu under Money.
- **Outcome:** the reference screen, kept by the club itself.

### WP4 — The family's checkout

- **Deliverables:**
  - the lines, the discount and the total on the registration's last step, counting into place;
  - the terms with a box to accept them, which a registration cannot be submitted without.
- **Outcome:** a family knows what they owe and what they agreed to before
  they pay.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Fee lines, governing-body fees, levies, the sibling discount, the terms | Payment plans' own setup (already built, BR4–BR7) |
| The checkout's breakdown and acceptance | A refund policy as a rule (the terms state it) |

## Open questions

None open. Two parts of question 118's answer are adopted, and the product
owner can overturn either:

- the discount reduces the club fee line, not the governing body's fees or
  the levy;
- "the first sibling" is the first registered that season.
