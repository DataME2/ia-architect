# Project Scope — The Player Record, and What a Statistic Costs

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/player-record-and-statistics`.

A player profile with a headshot, physique, position and a season's record —
appearances, minutes, goals, assists — plus a written design for the
advanced metrics (xG, shots, big chances created) that a paid data pipeline
would supply later. The headshot already exists. **Nothing else on that list
has a source**, and that is what this initiative is mostly about.

## What has to be built before a statistic can exist

The platform has twenty-eight tables and **not one of them knows that a game
happened.** There is no fixture, no result, no appearance. C11 (competition
& calendar management) was never started, so "games played" and "minutes
played" cannot be read, derived or estimated from anything currently stored.

So this is not a screen. A player statistic requires a **match record**, and
the smallest honest one is two tables: a fixture, and one row per player per
fixture. Everything else — the profile card, the season totals, the whole
premium tier below — hangs off those two.

## The line between what is built and what is bought

The requested metrics split cleanly along the line of **what a volunteer can
record from the touchline**.

| | Recorded by | Built here |
| --- | --- | --- |
| Appearances, minutes, goals, assists | A coach or manager after the game, from memory and the team sheet | **Yes** |
| Shots on target, shots off target | Somebody watching *only* for that, all game | No — see below |
| Big chances created | A judgement call requiring a definition the club would have to agree | No |
| xG | A model over event data with pitch coordinates | No |

The first row is four numbers a manager already knows walking off the pitch.
The rest need somebody whose entire job during the match is data entry, or a
camera and a subscription — which is the premium pipeline, designed in §5 and
deliberately not built.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | **New capability C20 — player performance record.** Not covered by C1 (identity), C2 (registration) or C8 (dashboards): none of them holds what a player did on a pitch. Serves G1, and gives C8 something to report on |
| 2_business | New **Player Performance** service. New objects: Fixture, Appearance, Player Profile. New rules **BR99–BR104** covering physique as health-adjacent data about children, the photograph's purpose, statistic provenance, and the ineligible-appearance flag |
| 3_information | `player_profile`, `fixture`, `appearance`. Physique is **narrowed on read** like `clearance` is — it is a measurement of a child, not ordinary club information |
| 4_application | A player profile screen, a fixture and appearance recording surface, and pure season-aggregation in `src/domain/performance/` |
| 5_technology | No change. Same stack, three more tables, no new dependency |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A registration knows a player's name, age, guardian, documents, money and clearance. It does not know they played. The headshot column exists and no screen shows it |
| **Target** | A player has a season record — appearances, minutes, goals, assists — entered by the club, shown on a profile with their photograph, physique and position. Advanced metrics are designed and unbuilt, with the cost of each one written down |

## Work packages and deliverables

### WP1 — The player profile *(physique, position, photograph)*

- **Deliverables:** `player_profile` table (season-scoped, one per
  registration): `height_cm`, `weight_kg`, `preferred_position`,
  `secondary_position`, `preferred_foot`, `squad_number`, `recorded_on`.
  Read policy narrowed to admin, registrar, coordinator and coach.
- **Outcome:** the static half of the card, without touching a match model.

**Season-scoped deliberately.** A twelve-year-old's height in 2026 and 2027
are different facts, and overwriting the first with the second destroys the
only interesting thing about it. It hangs off the registration, which is
already the per-season record.

### WP2 — Fixtures and appearances

- **Deliverables:** `fixture` (date, opponent, home/away, competition as free
  text, optional team, score, status) and `appearance`
  (fixture, person, minutes, started, goals, assists). Screens to record
  both.
- **Outcome:** the four numbers that were asked for, from the only source
  that exists — a human who was there.

**Counts, not events.** An appearance carries `goals` and `assists` as
integers rather than a row per goal with a minute and a scorer. That is the
difference between a manager filling in four boxes and a match-event system,
and it is exactly where the premium tier starts.

### WP3 — Season aggregation and the profile screen

- **Deliverables:** `src/domain/performance/` (pure: totals, availability,
  the minutes-threshold guard), `src/web/player-view.ts`, and
  `/registrar/players/[registrationId]`.
- **Outcome:** the card.

### WP4 — The premium pipeline *(documented, not built — see §5)*

## §5 — The premium tier, and what each metric actually costs

Recorded now so the idea survives, and so nobody later mistakes it for a
feature that is nearly finished.

### What the advanced metrics require

**Shots on and off target** need an observer watching only for shots, for
the whole match, distinguishing a shot from a cross and on-target from a
save. That is a person per match, per pitch. A club running fourteen teams
on a Saturday needs fourteen of them.

**Big chances created** needs a *definition* before it needs data. Opta's is
"a situation where a player should reasonably be expected to score" — a human
judgement, applied consistently. Two volunteers will not apply it the same
way, and a statistic that means something different per observer is worse
than no statistic, because it will still be compared.

**Expected goals (xG)** needs event data with **pitch coordinates** for every
shot, plus the model. This is the one that cannot be approximated by a
keener volunteer: the input is geometry, not observation.

### Three sources, honestly priced

| Source | What it gives | The problem |
| ------ | ------------- | ----------- |
| **Manual event logging** in-app | Shots, chances, coordinates if the logger taps a pitch map | A dedicated person per match. Volunteer clubs do not have one, and the data quality collapses when the person is also the manager |
| **A data provider** (Opta, StatsBomb, Wyscout) | Everything, including xG, modelled properly | Priced and scoped for professional and semi-professional competitions. **Grassroots and junior fixtures are not in their coverage at any price** — the matches are not filmed or scouted |
| **Computer vision on club video** (Veo, Trace, Spiideo and similar) | Automated tracking from a fixed camera, increasingly including shot events | A camera per pitch and a subscription per team. Real, and the only plausible route at this level — but it is a hardware purchase by the club, not a platform feature |

### The caveat that matters most

**An xG model trained on adult professional football is meaningless applied
to under-9s playing 7v7 on a quarter pitch.** The model encodes the finishing
ability and goalkeeping of professionals at distances and angles from a
full-size pitch. Run it over MiniRoos and it produces confident numbers
about children that describe nothing — and they will be quoted, because they
have a decimal point.

If advanced metrics are ever built, **the model has to be either calibrated
to the format or labelled as not applicable to it.** That is a rule, not a
preference, and it is why this is documented rather than shipped.

### What would make it viable

The realistic path is not a provider deal. It is: a club buys a fixed camera
for its main pitch, the platform ingests that vendor's event export for the
fixtures it covers, and **advanced metrics exist for some fixtures and not
others** — which the profile must then show honestly rather than averaging
across an inconsistent base. That is designed in BR102.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Physique, position, squad number, foot | Growth tracking or any physical-development analysis over seasons |
| Fixtures entered by the club | Fixture import from a governing body (C11, unbuilt — [#19](./open-questions.md)) |
| Appearances, minutes, goals, assists | Cards, injuries, substitution minutes, opposition detail |
| Season totals per player | Team-level or club-level statistics, ladders, form |
| The premium tier as a written design | Any event model, any coordinate capture, any provider integration |
| The photograph shown to club staff | The photograph or statistics shown to families, players, or anyone outside the club |

## Gap notes

- **A statistic here is somebody's recollection.** There is no verification
  step, no opposition cross-check and no correction workflow beyond editing
  the row. That is honest for a club recording its own games, and it is why
  BR101 requires every statistic to carry who recorded it.
- **Nothing shows a player their own record.** The mobile experience (C17)
  is where that belongs, and it is unbuilt — so this is a staff-facing
  screen only, which also keeps the photograph inside its existing consent.
- **Team and club aggregates are absent.** Adding them is arithmetic over
  the same tables, deliberately deferred so the first version does not
  invent a leaderboard of children.

## Open questions

**#62 — Should physique be recorded at all, and by whom?** Height and weight
of a child are health-adjacent data. A football club has a legitimate use
(equipment sizing, age-group and format placement, safety in contact), and
this initiative treats them as optional and narrowly readable. But the club
should confirm it wants them stored at all — the alternative is that a coach
knows them and the platform does not, which is a defensible answer.

**#63 — Is a season leaderboard acceptable for junior age groups?** Totals
per player exist as soon as appearances do, and ranking them is trivial. For
MiniRoos it is also, in many clubs' view, against the point of the format —
Football Australia's MiniRoos guidance discourages published results and
ladders. Deliberately not built; the club should say whether it ever should
be.

**#64 — Who may see a player's statistics?** Currently the same people who
may see the physique: admin, registrar, coordinator, coach. Whether a parent
sees their own child's record, and whether a player sees their own, is a
product decision that interacts with [#58](./open-questions.md) and with C17.
