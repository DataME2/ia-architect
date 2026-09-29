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

**The Access screen as a list of people (same day).** The club asked for the
People screen's shape — search, filter chips, one row per person with chips on
the right — instead of an accounts table with a *"Who is this?"* picker on
every row. `src/web/access-directory.ts` (`buildDirectory`, tested) merges
staff accounts and workspace holders into one entry per Person (P1): a
treasurer who is also a guardian is one row with two chips. Filters: *All*,
*Staff access*, *Workspaces*, *Needs attention* (an unlinked account, access
whose appointment has ended, a missing email, a link not sent). Opening a row
shows why each access is held, Remove/Add, and each workspace's state. The
picker now appears **only** inside an unlinked account's row. Checked in the
running app: an admin login that was never linked to its own Person record
shows as a second row flagged *needs attention* — linking it once merges the
two, which is the one case the picker is still for. Grant-by-email and the
access legend fold into collapsible panels below the list.

**A guardian's login linked to her son (found the same day).** The club
reported a guardian of three whose workspace showed none of her children.
Her login had been linked, through the picker, to her twelve-year-old son —
they share a surname and the picker listed people by name alone — so she was
shown his player view. BR63 already said a child under thirteen holds no
account; nothing enforced it on `account_person`. Now:

- **`supabase/migrations/0060_no_account_for_a_child_under_thirteen.sql`** — a
  trigger on `account_person`, so every path that links a login (the picker,
  and the family, player and staff claims) refuses a child under 13. The
  1900-01-01 import placeholder counts as old, not young. Test
  `supabase/tests/60_no_account_for_a_child_under_thirteen.sql`: 4 scenarios,
  plus a rolled-back break test (trigger dropped: the link to the child
  succeeded, so scenario 1 would fail). Existing links are not touched — the
  trigger fires on insert and on re-pointing only.
- **The picker** no longer offers anyone under 13, and labels each person with
  age and email (`Karen Alfonso — 39 · karen@…`), so a parent and a child who
  share a surname can be told apart.
- **Every staff account** now shows *Whose account is this?* with **Not this
  person** when linked, so a wrong link is correctable here; a login already
  linked to a child is flagged *needs attention* with what to do.

The existing wrong link itself was left for the club's admin to correct on the
Access screen — a data change to a real person's identity, made by the person
entitled to make it (decision 10).

**Then she could not get back in (same day).** Correcting it with *Not this
person* removed the wrong link — and left her linked to nobody, because an
earlier unlink had already removed the right one. Three defects made that a
dead end: `link_account_to_person` accepts only logins holding staff access,
so a guardian's login can never be linked from this screen; her guardian
invitation was marked claimed, so `claim_family_access` would never link her
again; and the Access screen said *Family workspace — active* because it
checked only that the invitation had once been claimed. Now:

- **`supabase/migrations/0061_reissue_a_workspace_invitation.sql`** —
  `reissue_workspace_invitation(person)` clears the claim on a Person's
  guardian and player invitations **only where the login that claimed them is
  no longer linked**, so it can repair a removed link and can never detach a
  working one; with nothing to repair, it resends an invitation still waiting
  to be opened. Admin or registrar only. Test
  `supabase/tests/61_reissue_a_workspace_invitation.sql`: 4 scenarios, plus a
  rolled-back break test (guard removed: a working link was reissued).
- **A new workspace state, *link removed — send a new one***: claimed by a
  login no longer linked to that Person. Never shown as *active* again; flagged
  *needs attention*.
- **Send a new link / Resend link** on the person's row sends the link; on
  arrival the existing family or player claim links the login to the Person
  the invitation names (decision 10 — the registrar's original assertion,
  re-sent, not a new inference).

## Correcting a person's details (same day)

Asked while fixing a record whose email was the club's own admin mailbox:
*"should exist the possibility to edit peoples names in case of any mistake."*
Nothing did — a player could propose corrections to their own record
(BR149), but no club officer could fix a typo in a name, email or birth date.
Each People row now has **Edit details** (admin, registrar and IT Manager —
the roles `person_manage` already allows; no migration). `src/web/person-edit.ts`
validates (both legal names required, a real email, a real past date; a blank
birth date keeps the 1900-01-01 import placeholder rather than inventing one)
and `src/data/person-edit.ts` saves with an audit entry naming the fields
changed. **BR55 shapes it:** changing the legal name withdraws its document
check, so the person reads *Name unverified* again until someone looks — a
typo fix must not carry a verification the new name never had.

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
