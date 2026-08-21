# Project Scope — Teams, and Who Is Allowed to Stand in Front of Them

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/identity-and-registration`.

The club is organising several teams and had nowhere to put them. **Team**
had been named in passing since [scope 3](./3_competitions-and-calendar-per-season.md)
— by Season Competition Entry, and by the Squadi extract's role list — and
modelled nowhere. There was no screen that could answer *which players are
in which team*.

Adding teams is a small thing. Adding **Team Officials** is not, and that is
most of this document.

## Why officials are the hard half

A Team Official is a child-related role, so **BR19** applies, and
Queensland's rule is blunt: *no card, no start*. A person may not begin in a
child-related role until their Working with Children Check is verified.

**BR54** decides what "current" means, and it is the part that is easy to
get wrong. The question is not *is this card valid today* but *does it cover
the season this team plays*. A coach whose Blue Card expires in round 12 has
not passed — they have failed later, and the club finds out on a Thursday
with a fixture on Saturday and nobody to replace them. Asked at the moment
they are appointed, the club has months.

Nothing about clearances existed in the schema. **P7** and **C15** were
written in [scope 12](./12_privacy-consent-and-safeguarding.md) precisely to
close this gap, and building team officials without them would have
re-opened it — the platform would have been the thing that gave an uncleared
adult a team.

## Where the rule lives

**BR83 is a database trigger, not a screen check.** Every other structural
rule in this project protects money, tenancy or tidiness. This one is the
only one whose failure mode is a child standing in front of an uncleared
adult, and there will be more than one screen that adds an official.

Three properties are deliberate:

- **Verified, not merely recorded.** `verified_at` is separate from the card
  number, because holding a number is not a check. Collapsing them would let
  a typed digit clear a coach.
- **Fires on `update` as well as `insert`.** Promoting a player row to a
  coach row is the obvious way round an insert-only check, and the
  behavioural suite tests exactly that.
- **Measured against `season.ends_on`.** Weakening it to *valid today* makes
  `supabase/tests/17` fail, which was verified.

## The registration link, and a thing the system cannot do

The club asked for a button showing the current registration link where one
has gone missing. **There is no such button and there cannot be**: only the
token's hash is stored (BR73), so "show me the live link" is a question the
system is deliberately unable to answer. A database copy of a live token is
one leaked backup away from an open write path into the club.

The honest answer is replacement. **Reissue** revokes the old link, issues a
new one with the same name and window, and shows it once. Anyone still
holding the old URL gets nothing — the correct outcome for a credential that
has gone missing. The screen says so rather than leaving a registrar
hunting for a button that will never exist.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No change. Serves **C15** (compliance & safeguarding) and the team-shaped half of **C2**; **P7** is honoured rather than amended |
| 2_business | **BR83** added. New objects: **Team**, **Team Membership**, **Clearance** — the last one promoting BR19/BR54 from prose to something the system holds |
| 3_information | `team`, `team_member`, `clearance`. In [1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 4_application | The teams screens, the clearance form, the BR83 trigger, and the invitation reissue. In [2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology | No change |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | No Team anywhere in the schema, so no way to ask which players are in which team. No clearance record at all, so BR19 was prose. A lost registration link had no remedy but issuing an unrelated new one |
| **Target** (delivered) | Teams per season with rosters split into squad and officials; a clearance that must be verified and must cover the season before anyone can be given a team; reissue for a lost link. Proved across 13 further behavioural scenarios — 110 in total |

## Work packages and deliverables

### WP1 — Teams and rosters *(done)*

- **Deliverables:** `team`, `team_member`; `src/web/team-view.ts` (roster
  split, labels, summaries); `/registrar/teams` with a Teams button on the
  queue.
- **Outcome:** players by team, and a person appears once per role so a
  coaching parent is two rows and one Person.

### WP2 — Clearances and BR83 *(done)*

- **Deliverables:** `clearance`; `src/domain/teams/clearance.ts` with 16
  unit tests; the `assert_official_is_cleared` trigger; the clearance form
  with its separate *I have checked this against the portal* tick.
- **Outcome:** no card, no start — enforced where it cannot be forgotten.

### WP3 — Reissue *(done)*

- **Deliverables:** `reissueInvitationAction`, `ReissueButton`, and the
  explanation on the invitations screen.
- **Outcome:** a family who lost their link gets a new one; nobody goes
  looking for a button that BR73 forbids.

### WP4 — Proof *(done)*

- **Deliverables:** `supabase/tests/17_teams_and_clearances.sql`, 13
  scenarios.
- **Outcome:** verified to fail. Weakening the check to *valid today* and
  narrowing it to insert-only reports *"a coach whose card expires
  mid-season was accepted (BR54) | an uncleared adult was promoted by UPDATE
  (BR19)"*.

## In scope / out of scope

**In scope:** teams per season, rosters, team officials with clearance
enforcement, recording and verifying a WWCC, reissuing a registration link.

**Out of scope:** fixtures, results and team sheets — a team is a squad
here, not a competition entry. Also out: **BR50's automatic withdrawal**,
see below.

## Gap notes

**BR50 is half-built, and the half that is missing is the one that runs
while nobody is watching.** Expiry now *blocks* a new appointment, which is
the front door. It does not yet *withdraw* someone already appointed when
their card lapses mid-season, and it notifies nobody. Until that exists,
`expiringBeforeSeasonEnd` is the club's only warning and somebody has to
look at it. BR83's season-end check narrows the window considerably — an
official cannot be appointed with a card that will lapse during the season —
but a card **revoked** mid-season still leaves a live team membership
standing, and that is a real gap rather than a theoretical one.

**Verification is a tick, not an integration.** BR19 wants the number
checked against the state government's portal; nobody here is calling one,
because none of them offers an interface at this club's scale
([question #21](./open-questions.md)). What the tick records is that a named
officer says they looked, with a timestamp. That is weaker than a machine
check and stronger than nothing, and it is honestly labelled on the screen.

**Clearance reads are narrower than the rest of the slice.** Admin and
registrar only. A coordinator can pick a team and see that an official is
*not cleared*, without seeing the card number — the verdict is club
information, the number is a safeguarding record.

**A team is not a competition entry.** No fixtures, no ladder, no age-group
validation against a playing format (BR-none yet). Age group is free text,
which is honest configuration rather than a modelled constraint.

## Open questions

**#54 — What withdraws an official whose clearance is revoked or lapses
mid-season, and who is told?** BR50 says it should be automatic and should
notify both the holder and the responsible coordinator. That needs something
that runs on a schedule, which this platform does not yet have anywhere.
Recorded here because BR83 makes the *appointment* safe and leaves the
*continuation* unguarded, and the difference is easy to mistake for
completeness.
