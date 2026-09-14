# Project Scope — Carnivals, and the One Thing the Public May See

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

Regional carnivals span several clubs by design and exist to be followed by
people who do not have — and should not need — an account. Today they have
no support at all: families rely on ad hoc social media posts and printed
programs, which is how a parent ends up at the wrong ground.

This initiative builds C12, and it is the **only deliberate exception to
Principle P5** in the product ([decision 3](../decisions/3_public-event-data-crosses-tenant-isolation.md),
P6). Everything else here has been about keeping one club's data away from
another's; this is about publishing something on purpose.

## What an exception to P5 has to earn

P6 permits a published event's schedule, draw and results to be visible to
anyone, across every participating club. That is a large thing to grant in a
system holding children's records, so the grant is made **as narrow as the
schema can make it** rather than as narrow as the policies remember to be.

**The tables behind the public view have no `person_id` column** (BR139).
Not "the policy excludes personal data" — there is no column in which
personal data could sit. A carnival fixture knows a club, a team, a date, a
time and a venue. Reading every row of it in full discloses nothing about
any child, because nothing about any child is there. The same instinct as
`payment` being append-only through the *absence* of an update policy: the
property holds because of what is missing, not because of what is
remembered.

**Publication is a single explicit act** (BR140), and reversible. Without
one act to point at, "public" becomes a default that leaks in; and a
coordinator who has published a wrong draw needs to be able to take it down.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No new goal or principle.** Realises **G7** and exercises **P6**, the exception the strategy layer has carried since it was drafted. P5 itself is untouched: club registration, finance and compliance data stay fully isolated |
| **2_business** | **Two new rules: BR139** (no personal data by construction) and **BR140** (publication is explicit and reversible). BR26–BR29 gain code. The **Carnival & event management** business service moves from Pending to partly realised |
| **3_information** | **Three new data objects** — `carnival_event`, `carnival_entry` (a club and a team taking part) and `carnival_fixture`. All three carry the **host** club's `club_id`, so they are ordinary tenant-scoped tables with an *additive* public read policy — no `check_rls.py` exemption, unlike [scope 38](./38_the_catalogue_that_makes_br8_computable.md)'s catalogue |
| **4_application** | C12 moves from *Not started* to *Partial*. New: `src/domain/carnival/` (the ladder and the next unplayed fixture, pure), `src/data/carnivals.ts`, the coordinator's screens under `/registrar/carnivals`, and the account-free `/events/[eventId]` |
| **5_technology** | **No change.** The public view is a route in the same app, reachable by `anon` through the same Supabase client every other page uses |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | No carnival support. A multi-club event lives in a spreadsheet and a Facebook post |
| **Target** (delivered) | An Events Coordinator creates an event, enters clubs and teams, schedules fixtures, and publishes. A visitor with no account sees the draw, each team's next unplayed fixture and the ladder — and no child's name, because there is none to see |

## Work packages and deliverables

### WP1 — The event, and what the public may read

- **Deliverables:** `supabase/migrations/0034_carnivals.sql` —
  `carnival_event`, `carnival_entry`, `carnival_fixture`, the additive
  public policies keyed on `published_at`, and BR29's coordinator
  constraint; `supabase/tests/37_carnivals.sql`
- **Outcome:** BR26, BR27, BR139 and BR140 hold, and the last is provable
  by reading the `create table` statements.

### WP2 — The pure half

- **Deliverables:** `src/domain/carnival/` — the ladder from results, and
  each team's next unplayed fixture
- **Outcome:** A ladder that is wrong is wrong in a test rather than in
  front of four hundred families.

### WP3 — The coordinator

- **Deliverables:** `/registrar/carnivals` — create, enter clubs and teams,
  schedule, record results, publish and unpublish
- **Outcome:** BR29 holds: only the recorded Events Coordinator changes the
  conditions, whatever else they hold at the club.

### WP4 — The public view

- **Deliverables:** `/events/[eventId]`, reachable with no account
- **Outcome:** G7. A parent follows the weekend on their phone.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Draw, results, ladder, next fixture | **Individual results and scorers.** BR26 is club- and team-level only, and BR139 makes that structural |
| Publication as an explicit, reversible act | **Scheduled publication.** There is no scheduler ([scope 37](./37_forgetting_and_the_reasons_not_to.md) wants one too) |
| Officials appointed to carnival fixtures | **Reusing the conflict checks in full.** BR28 asks for the same checks a season appointment gets; only the fixture reference differs, and that is a gap note rather than a claim |
| A public URL anyone may open | **Discovery.** There is no index of published events, deliberately: a visitor follows a link their club sent them |

## Gap notes

- **BR28 is not fully honoured.** A match official appointed to a carnival
  fixture should pass the same eligibility and conflict checks a season
  appointment does. `match_official_appointment` references `fixture`, and a
  carnival fixture is a different table — so the appointment path is not
  wired to carnivals at all rather than wired loosely. Naming it here
  because a half-checked appointment would be worse than an unbuilt one.
- **There is no index of published events**, so a visitor needs the link. A
  club sends it. Building a directory would mean deciding whether one club's
  event is discoverable from another's page, which is a P6 question nobody
  has asked yet.
- **A ladder assumes three points for a win.** Carnival Conditions are meant
  to carry the points system (BR29), and the column exists; the computation
  reads it and falls back to 3–1–0. A carnival using a different system gets
  the right table only if somebody sets it.
- **Unpublishing does not un-tell anybody.** A draw that was public for an
  hour was copied, screenshotted and shared. The platform's record becomes
  authoritative again (BR34's instinct), and nothing recalls what left.

## Open questions

- **[#81] May a club that is not entered in a carnival read its unpublished
  draw?** Adopted: **no.** Before publication an event is the host club's
  own data and nothing else, which keeps P5 intact right up to the moment
  P6's exception is deliberately invoked.
- **[#82] Should a published event stay readable after it finishes?**
  Adopted: **yes, indefinitely**, because a carnival's results are the kind
  of club history BR70 exists to protect elsewhere — and nothing in the view
  is personal, so retention costs nothing under BR40.
