# Project Scope — Every Registration Priced from the Schedule

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/fee-checkout`.

- Migration 0100 was dry-run on DEV inside a rolled-back transaction, with
  every scenario of its test passing.
- It was applied by hand to DEV (`sxsloxdtpcjpdobwpwsm`) on 31 October 2026,
  with the product owner's approval. PROD follows their review.
- North Star FC's schedule is loaded on DEV (WP4). The season's existing
  registrations were **not** re-priced: the product owner left that to the
  treasurer, through *Current players*.

[Scope 130](./130_the_clubs_fee_schedule.md) gave each club a fee schedule,
but a registration still opened owing the season's single fee. On 30 October
2026 the product owner asked for five things:

- every registration, at any age, to be priced from the schedule the
  treasurer sets;
- the fee to leave Season requirements;
- the pilot club's fees (their two screenshots) to be loaded;
- current players to be adjusted;
- the calculator to allow for siblings in different teams.

They also asked for Season requirements to be livelier.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves G3 |
| 2_business    | **Changed.** BR195 is built and made precise. A player's club line is their **team's** line, else the cheapest **standard** line for their age, else the cheapest that fits. The governing body's fee is chosen the same way. A player's age is the age they turn in the season's year, as the governing body counts age groups. BR196 also covers the team mapping and re-pricing. BR3 is unchanged |
| 3_information | **Changed.** `fee_line.standard`, `team_fee_line` and `registration_price` (every pricing kept), in the [data objects](../ea/3_information/1_data-objects.md) with 0099's tables. `season.registration_fee_cents` stays, read only for a club with no schedule |
| 4_application | **Changed.** *Registration fees* gains *Teams* and *Current players* tabs and a family calculator. *Season requirements* drops its fee for a season timeline, a live family checklist and a fees card |
| 5_technology  | **Changed.** Migration 0100, with RLS and its test `supabase/tests/98_*` |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | A registration opened owing the season's fee, typed under Season requirements. The schedule was only a calculator. Siblings paid in full |
| **Target** (delivered) | A registration opens owing BR195's price, recorded in `registration_price`. The treasurer maps each team to a line and brings the season's existing registrations onto the schedule from a preview, deciding whether completed ones are included. A live payment plan is never re-priced |

## Work packages and deliverables

### WP1 — Pricing in the database (0100)

- **Deliverables:** `supabase/migrations/0100_a_registration_is_priced_from_the_schedule.sql`:
  - `fee_line.standard`;
  - `team_fee_line`, with RLS: read by the admin, registrar and treasurer, written by the admin and treasurer;
  - `registration_price`, read by the same three and written only by the functions below;
  - `registration_breakdown(registration)`: BR195, internal, with execute revoked from every API role;
  - the `registration_priced_from_the_schedule` trigger, which prices each new registration whoever opens it (the family's link, the club's form, a merge). Only a club with no schedule keeps the season's fee;
  - `app_preview_season_prices` and `app_reprice_season` (admin and treasurer). A registration on a live payment plan is shown but never changed; each re-pricing is kept and audited.
- **Tests:** `supabase/tests/98_a_registration_is_priced_from_the_schedule.sql`, 9 scenarios.
- **Outcome:** what a registration owes comes from one rule, in one place.

### WP2 — The treasurer's tabs

- **Deliverables:** `src/app/registrar/registration-fees/`:
  - **Teams:** each team's line, saved as it is chosen.
  - **Current players:** every registration's price, paid amount, and what it owes now and would owe. Rows that would change are marked. A tick includes registrations already complete, with the warning that they would then owe the difference (BR3, BR79). Applying needs a confirming tick.
  - **The standard tick** on a line, with a hint on how ages count.
  - **The family calculator:** each child has an age and a team; each pays their own line, the first in full and every later one less the discount on their own line, with the family's total.
  - `src/data/registration-fees.ts` and `src/web/registration-price.ts` (`defaultLine` and `ageThisSeason`, which give the same answer as the database).
- **Outcome:** the treasurer sets every price, and sees every change before it
  is applied.

### WP3 — Season requirements

- **Deliverables:**
  - The fee field is removed from `RequirementsForm`, the action and `updateSeasonRequirements`. The checklist is all they save.
  - A **season timeline** fills in chalk yellow from the first day to today, pulsing at today (`src/web/season-progress.ts`, 3 tests).
  - **The family's checklist** is drawn on a paper card as the documents are typed, each ticking in.
  - **What a registration costs**: the schedule's lines and discount counting up, linking to Registration fees.
  - Motion is off under reduced motion.
- **Outcome:** Season requirements says what a season asks of a family, and
  where its price is set.

### WP4 — The pilot club's schedule on DEV

- **Deliverables:** North Star FC's 2026 season on DEV holds the schedule from
  the product owner's screenshots: 14 club lines, Football Queensland's four
  fees, the volunteer levy and the 15% sibling discount. The ages are read as
  the governing body reads them; for example, *U8 to U12* is ages 7 to 11.
  The standard lines are the community ones: MiniRoos, Metro, Seniors
  Metro, and FQ MiniRoos, Juniors and Seniors.
- **Loaded on 31 October 2026.** The product owner chose to retire their two
  test lines that the screenshots repeat (the FQ MiniRoos fee and the levy),
  so the levy is not charged twice. Their two Academy lines are kept, not
  standard, so they are charged only through the teams mapped to them.
- **What *Current players* will show,** read on DEV without changing anything:
  - ages 12 to 17: Metro $0, FQ Juniors $66 and the levy $50, so $116.00;
  - age 10: MiniRoos $530, FQ MiniRoos $50 and the levy, so $630.00;
  - a third and a fourth sibling at 8 and 9: $630.00 less 15% of $530, so $550.50 each;
  - adults: Seniors Metro $440, FQ Seniors $130 and the levy, so $620.00.
- **Outcome:** the club's real prices to review with.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Pricing at opening, the team mapping, re-pricing from a preview | Choosing a line for one player outside their team (by putting them in the team instead) |
| Season requirements' timeline, checklist and fees card | The family's own screen showing the breakdown and accepting the terms (the registration flow) |

## Gap notes

- **The family's view.** The registration now opens at the right price, but
  the family's form does not yet show the breakdown or ask them to accept the
  terms. That is a change to the public registration flow (decision 6), and
  its own scope.
- **A Masters player.** Pays the seniors' governing fee unless their team is
  mapped to a masters line, or the club makes the masters fee standard.
