# Project Scope — An Appointment Grants Access

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/appointment-grants-access`.
**Status: built.**

## Why this exists

Asked directly by the club (September 2026), looking at `/registrar/access`:
*"we have many things called 'role' which can sound confusing for admin and
make an error easy."* Four unrelated things were all called a role, on four
screens, with nothing connecting them:

| Screen | What it actually is | Stored in |
| ------ | ------------------- | --------- |
| People | How someone **takes part** this season — player, coach, referee, guardian | `person_role` |
| Governance | The **office** they were elected to — President, Treasurer | `committee_position` |
| Teams | Their place in a team — player, manager | `team_member` |
| Access | What they may **do in the system** | `club_membership` |

Electing someone President gave them no access at all; an admin then chose
access levels by hand and, separately, answered *"Who is this?"* to link the
account to the person. That is the first half of [open question
#78](./open-questions.md) — *should a committee office grant system access?*
— and the club answered it.

## What the club decided (September 2026)

- **An appointment carries its access.** Appointing somebody to an office
  (elected, per term) or a **club function** (appointed: IT Manager, Blue
  Card Administrator, Program Coordinator, Referee Coordinator, Coach,
  Technical Director, the Heads of…) carries the access mapped to it.
- **An admin or the current President confirms it**, on Governance.
  Confirming sends a sign-in link; the person sets a password and arrives
  already linked to their own record, with that access. No *"Who is this?"*.
- **The mapping:** President and Vice-President → Administrator (which also
  satisfies BR124's two-administrator floor); Secretary, Treasurer, Registrar
  → the same-named access; Committee and Subcommittee member → Committee;
  each function → its own access, Referee Coordinator → Coordinator (scope
  29 WP5's decision not to split `coordinator`).
- **Access is kept when the appointment ends**, until an admin removes it —
  *not* removed automatically. The Access screen flags it instead.
- **Functions are appointed on Governance**, beside the offices.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No new goal or principle. P1 is served further: the account reaches its Person through the appointment rather than a second manual step. Decision 10 (identity asserted, never inferred) holds — the confirmer names the Person; the email only delivers the link |
| 2_business | **BR153** (an appointment, confirmed by an admin or the current President, carries its mapped access and delivers it as a link) and **BR154** (that access outlives the appointment until an admin removes it; the Access screen flags it). Glossary gains **Club Function** and **Access Level**. #78's first half resolved; per-team scoping (its second half) stays open. **WP2 restates BR126 and BR150**: their COMPLETE gate stands, their invitation becomes automatic, and BR150's deliberate 13–17 click is withdrawn |
| 3_information | Two data objects: **Club Function Appointment** (`club_function_appointment`) and **Appointment Access** (`appointment_access` — who confirmed which appointment's access, to what address, and whether it was claimed). No change to `club_membership`, `committee_position` or `account_person` |
| 4_application | Governance gains an *Access it carries* column on each office and a **Club functions** section; Access shows each access level's source and flags ended ones, names levels in words, and explains Player/Guardian; People shows each person's current office/function and whether they can sign in. `claim_staff_access` runs at sign-in beside the existing claims |
| 5_technology | No change. One migration (`0059`), run behaviourally against the linked dev project because no local Docker was available, then its fixtures removed |

## Work packages and deliverables

**Database — `supabase/migrations/0059_an_appointment_grants_access.sql`**
- `app_appointment_access_map()` — the one mapping, read by the confirm
  function and by the Governance screen, so the two cannot disagree (the
  drift the Access legend suffered in #66 cannot recur here).
- `club_function_appointment` — open-ended, ended by date; RLS: read by
  members, written by admin or current President.
- `appointment_access` — provenance and invitation in one row; read by
  members, written only by the two functions below.
- `app_is_current_president`, `app_may_confirm_appointments` — the President
  of the governing term (the latest term already started, the definition
  `governingTerm` uses), not resigned, whose account is linked to them.
- `confirm_appointment_access` — refuses non-confirmers, ended appointments
  and people with no email; grants at once to a linked account, otherwise
  records an invitation the application sends as a link. Confirming again
  resends.
- `claim_staff_access` — `claim_player_access`'s shape: links the account to
  the named Person, grants the access, and grants nothing if either side is
  already linked to someone else.

**Tests — `supabase/tests/59_an_appointment_grants_access.sql`** — 8
scenarios, plus a break test (the confirm gate replaced with `true` inside a
rolled-back transaction: a treasurer then confirmed, so scenario 2 fails as
it should).

**Screens** — `src/web/appointment-view.ts` (pure, tested), `src/data/appointments.ts`,
Governance, Access, People, the sign-in action and the auth callback.

## WP2 — A player's workspace links go out on their own

Asked the next day (September 2026): *"if a person takes part the season as
PLAYER [they] should be granted … their own workspace or parent/guardian
workspace without any other waiting assignation from admin."* The club then
decided:

- **When:** the moment a Person is **a player this season *and* their
  registration is COMPLETE** — whichever of the two happens second. COMPLETE
  stays the gate BR126 and BR150 already enforce in the database; what goes
  is the wait for someone to press Invite.
- **Who, by age:** under 13, every guardian holding authority (BR63 — no own
  account); 13 to 17, those guardians **and** the player; 18 and over, the
  player only. BR150's deliberate click for 13–17 is withdrawn.
- **Players already marked:** no surprise emails on deployment — one
  **Send all missing workspace links** button on People.

**Delivered:** `src/web/workspace-invite-view.ts` (`planWorkspaceInvites`,
7 tests) decides; `src/data/workspace-invitations.ts` records the
invitations through the existing `recordGuardianInvitation` /
`recordPlayerInvitation`, so the database triggers still stand behind every
row, and pages past Supabase's 1,000-row limit for the club-wide button. It
runs from three places: granting PLAYER on People, the federation outcome
that makes a registration COMPLETE (replacing the adults-only auto-invite
there), and the button. **No migration** — the gates were already right.

A missing email is reported by the button, never skipped silently; a guardian
of two players is invited once.

**Seeing it (asked the same day):** the club looked for Player in the Access
screen's grant dropdown. It is deliberately not there — a workspace shows one
family's own records and an access level acts on the whole club, so offering
"Player" beside "Registrar" would invite exactly the grant decision 11
refuses. Instead the Access screen gains a read-only **Player and family
workspaces** section for the current season: each player, whose workspace
(own or family), and its state — *active*, *link sent*, *waiting —
registration not COMPLETE*, *no email on record*, or *not sent* (marked
before WP2; the People button sends it). `workspaceRows` lists by the same
ages `planWorkspaceInvites` sends by, and one loader serves both, so the
screen shows exactly what would be sent. The club kept COMPLETE as the gate
when asked again.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Offices and club functions carrying access, confirmed by admin or President | **Per-team scoping** — #78's second half; a coach still reads club-wide |
| One sign-in link that also links the account to the Person | Automatically **removing** access when an appointment ends — declined by the club; flagged instead |
| Access screen saying where each access came from | |
| Readable access names; "role" disambiguated on People and Access | Inviting before COMPLETE — declined by the club (WP2) |
| WP2: automatic player and guardian workspace links, and one button for those already marked | Minors appointed to a club function — the form offers adults only, as the committee form does (BR87); a 16-year-old assistant coach is a real case |
| | Copying the look of the reference prototype (`ltd-dev.lovable.app`) — it is behind a sign-in; screenshots needed |

## Gap notes

- **A confirmation needs an email on the Person's record.** Refused, with the
  reason, when there is none — the fix is on the person's record, not here.
- **Access granted before this existed has no source**, and the Access
  screen says *granted on this screen* for it. That is true, not a gap to
  backfill: nothing recorded why it was given.
