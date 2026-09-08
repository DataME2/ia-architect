# Project Scope — Actors, Access and Permissions

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/governance-actors-and-permissions`.
**Status: WP1 and WP2 delivered, September 2026. WP3 on hold by decision.
WP4 waits on open questions #58 and #59.**

Three questions were asked of club governance and administration: **how does
an actor sign in, what may each actor do, and what may each actor see?**
This document answers all three from the policies as they actually stand —
read out of `pg_policies` in the development project, not out of the
documentation — and
records what the answers reveal. Two of the three answers are uncomfortable,
which is why this is a scope document and not a patch.

## 1. How an actor signs in

> **This section records the baseline as it stood when this document was
> written, in September 2026. The paragraphs marked *Since* say what has
> changed.** The baseline is kept rather than rewritten, because the
> arguments in §2 and §3 were made against it.

**The baseline: they cannot, unless the platform owner creates them by
hand.**

| Step | Where | Who can do it |
| ---- | ----- | ------------- |
| Create the account | Supabase dashboard → Authentication → Users | Platform owner only |
| Grant a role at a club | Hand-typed `insert into club_membership` | Platform owner only, through elevated SQL |
| Sign in | `/sign-in`, email and password | The person, once both above are done |

There was **no sign-up page, no invitation, no password reset, and no
screen for `club_membership`**. A club secretary who needed access phoned
the platform owner, who ran SQL.

**Since — all four exist.** `/platform` provisions a club and emails its
named contacts a magic link (`signInWithOtp` with `shouldCreateUser`, so the
account is created by the person who follows the link and no page ever holds
a service-role key); `claim_club_access()` reads the email out of the
caller's own session and attaches the membership the club recorded against
it; `/set-password` prompts on first arrival and is the way back in when a
password is forgotten; and `/registrar/access` is the `club_membership`
screen this section called the cheapest gap on the list. See
[decision 7](../decisions/7_tenant-provisioning-by-owner-issued-invitation.md),
whose shape this follows, and
[decision 9](../decisions/9_platform_administration_provisions_but_never_reads.md).

Two observations that matter more than the inconvenience:

**The policy already permits what the UI does not offer.**
`club_membership_manage` allows an admin of a club to add and remove
memberships. Nothing architectural blocks a membership screen — it was
simply never built. This is the cheapest gap on the list to close.

**Account creation is a different problem from role granting.** Creating an
`auth.users` row needs the Auth admin API and therefore the service-role
key, which no page may hold. Supabase sign-up *is* enabled on this project
(`disable_signup: false`), so the shape of [decision 7](../decisions/7_tenant-provisioning-by-owner-issued-invitation.md)
applies one level down: **the person creates their own account, and an admin
attaches the role.** A signed-in user with no membership already sees
exactly what a stranger sees, so this is safe today and needs no new
mechanism.

**At the baseline there was exactly one account in the entire system**,
`admin@northstarfc.com.au`, holding both `admin` and `registrar`. Every
action ever taken had been taken by it. The audit log was therefore
technically accurate and practically useless: it recorded *what* happened
and could not distinguish *who* did it, because there was only one who.

**Since — there are several accounts, and the audit log is worse off, not
better.** It now records several user ids, none of which resolves to a name
a club would recognise. That is §3, and it is what WP1 exists to close.

## 2. What each actor may do — the real matrix

Read from `pg_policies`, and **re-read after scope 30 landed** — the three
player-record tables are included, and they changed one of the findings
below.

**Writes are role-based; reads are not.**

| | admin | registrar | treasurer | coordinator | committee | coach | viewer |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| People, roles, guardianship | **W** | **W** | R | R | R | R | R |
| Registrations & documents | **W** | **W** | R | R | R | R | R |
| Seasons & requirements | **W** | **W** | R | R | R | R | R |
| Registration links | **W** | **W** | R | R | R | R | R |
| Consents | **W** | **W** | R | R | R | R | R |
| Payment plans & instalments | **W** | R | **W** | R | R | R | R |
| Payments | **W** | R | **W** | R | R | R | R |
| Vouchers — attach | **W** | **W** | **W** | R | R | R | R |
| Vouchers — verify / reject | **W** | R | **W** | R | R | R | R |
| Teams & rosters | **W** | **W** | R | **W** | R | R | R |
| Clearances (WWCC) | **W** | **W** | — | — | — | — | — |
| Committee terms & positions | **W** | R | R | R | R | R | R |
| Fixtures | **W** | **W** | R | **W** | R | **W** | R |
| Appearances & statistics | **W** | **W** | R | **W** | R | **W** | R |
| Player physique (height, weight) | **W** | **W** | — | **W** | — | R | — |
| Club membership (who has access) | **W** | R | R | R | R | R | R |
| Submission packs | **W** | **W** | R | R | R | R | R |
| Audit log | R | — | — | — | — | — | — |
| Prospects | — | — | — | — | — | — | — |

**W** = read and write · **R** = read only · **—** = no access at all

### Three things this table says out loud

**`committee` and `viewer` are the same role — `coach` no longer is.** When
this document was first written all three were identical: none appeared in a
single write policy anywhere in the schema. Scope 30 then gave `coach` write
access to `fixture` and `appearance`, and read access to `player_profile`,
which is the first time any of the three has meant something. `committee`
and `viewer` are still named in no write policy at all, and still read the
same tables as each other. A club appointing someone `committee` rather than
`viewer` is still recording an intention the system does not act on —
[#59](./open-questions.md) asks whether it should.

**A role restricts writing and barely restricts reading.** Twenty-five of
thirty-one tables are readable by *any member of the club, in any role* —
and the proportion has grown, not shrunk, since this was written. So a coach
can read every family's outstanding balance, every consent decision, every
payment and every guardian's contact details across the whole club — not
just their own team. Nothing in the business rules asked for that; it is
what `club_id in (select app_member_club_ids())` means, applied uniformly.

**The three exceptions prove it was thought about, three times.**
`clearance` is narrowed to admin and registrar because a Working with
Children Check number is a safeguarding record; `audit_event` to admin
alone; and `player_profile` to the roles that pick teams, because a child's
height and weight are health-adjacent (BR99). All three narrowings were
deliberate and all three are argued in the migrations. Nothing else was
narrowed — including money.

**And the narrowing stopped one table short of where the documentation says
it reaches.** [#64](./open-questions.md) records the adopted answer that a
player's *statistics* are for admin, registrar, coordinator and coach. The
policies do not say that: `fixture_select` and `appearance_select` are both
`club_id in (select app_member_club_ids())`, so every member of the club —
a treasurer, a committee member, a demonstration `viewer` — reads every
child's goals, assists and minutes today. Only the physique was narrowed.
This is recorded here rather than quietly fixed because it is the same shape
as BR56: an answer written down and never enforced, which is exactly the
failure this document exists to catch. Closing it is a WP4 question, not a
patch, because it decides what a coach may see (#58) at the same time.

## 3. What each actor may see — and the gap underneath it

The read column above is the literal answer. The structural answer is worse.

**Nothing connects a login to a Person.** `club_membership` binds an
`auth.users` id to a club and a role. There is no `person_id` on it, and no
`user_id` on `person`. *(Still true — WP1 below specifies the fix and the
migration is not written.)* So the application cannot answer *"who is signed
in?"* beyond an email address — it cannot say that this account **is** Grace
Tupou, the President recorded in `committee_position`.

That has three consequences, and the third is the one that matters for
governance:

- The session strip can show a club and a role, never a name.
- The audit log records a user id that resolves to nothing a club would
  recognise.
- **A committee member cannot be shown "their" governance record**, because
  the system does not know which committee member they are. C19 records who
  governs; it cannot recognise them when they log in.

This is also the one place where **P1 is not honoured**. The principle says
one `Person`, many roles — but sign-in identity was modelled as a separate
thing entirely, and a club officer is therefore two unrelated records.

## EA alignment (assessed top-down; WP2 implemented, WP1 aligned September 2026)

| Layer | Impact when this is built |
| ----- | ------------------------- |
| 1_strategy | No new capability, and **no change to any principle**. P1 was unhonoured for the sign-in identity; WP1 closes that gap and P1 gained a sentence saying an account is a credential rather than an identity. C19 and C10 both gain substance |
| 2_business | **BR106–BR108 added** for WP1: one link per account per club in both directions, asserted by an administrator and never inferred from an email address, and unlinked shown as unlinked. Glossary gained *Account* and *Account Link*. The `committee` role still needs to mean something or be removed ([#59](./open-questions.md)); `coach` now does, via scope 30 |
| 3_information | **`account_person` added** as a data object, pending WP1 — its own table rather than a column, and a composite foreign key rather than a trigger, both argued in [1_data-objects.md](../ea/3_information/1_data-objects.md). The four access and platform tables built earlier and never modelled here (`club_membership`, `club_licence`, `platform_admin`, `user_password_set`) were added in the same pass. Read-narrowing would change the classification of finance and contact data per role |
| 4_application | **Delivered for WP2:** `/registrar/access` (admin only), `src/web/access-view.ts`, `supabase/migrations/0015_club_access_management.sql`. **Specified for WP1:** *Account identification*, listed under *Documented, not built* in [1_application-services.md](../ea/4_application/1_application-services.md). Still to come: role-aware rendering (WP3) and a self-service account route |
| 5_technology | **No change** — for WP2 or WP1. WP1 is one migration and two `security definer` functions on the stack that already exists; it needs no runtime, build, CI or hosting change, and the RLS test suite it extends is already wired into CI. Fixed ports were added for running dev and a local production build side by side ([2_deployment.md](../ea/5_technology/2_deployment.md)), which surfaced that local development has no database of its own |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (September 2026, before WP2) | One account for the whole platform. Access granted by hand-typed SQL. Six role names, four of which have distinct permissions. Reads unrestricted within a club. No link between an account and a Person |
| **Now** (WP2 delivered) | Clubs are provisioned from `/platform` and their named contacts claim their own access; an admin grants and revokes at `/registrar/access`. Seven role names, five with distinct permissions — `coach` gained writes from scope 30, `committee` and `viewer` still mean nothing. Reads still unrestricted within a club, on twenty-five of thirty-one tables. **Still no link between an account and a Person** |
| **Target** | An admin grants and revokes access in the application. Every role name means something. Money and contact details are readable by the roles that need them. A signed-in officer is recognised as the Person they are, and the audit log names them |

## Work packages and deliverables

### WP1 — Say who is signed in *(DELIVERED)*

Held in September 2026 to be decided after WP2 was in use. It has been; the
cost of holding it went up as predicted, so WP1 was taken through the EA
layers, specified, and its database half built:
`supabase/migrations/0022_account_person.sql` and
`supabase/tests/25_account_person.sql` (19 scenarios).

The screens followed in a second commit: the session strip names a person,
`/registrar/access` lists names with the address beneath, and each unlinked
account carries the picker that links it. **Delivery is one migration, one
behavioural suite, three pure functions and their tests, and no new
route.**

The cost, restated: the audit log names a uuid rather than a person, and the
access screen delivered in WP2 lists **email addresses rather than names** —
an admin removing access reads `h.bell@…` and has to know that is the
treasurer. Tolerable at one club with three accounts, and no longer one club
with three accounts.

#### What the alignment changed

The original deliverable was **wrong**, and the alignment is what caught it.
It proposed `person_id` as a column on `club_membership`. That table is
unique on `(club_id, user_id, role)`, so an account holding both `admin` and
`registrar` is **two rows**: the column would be stored twice, could
disagree with itself, and revoking one role would drop half the link. The
fact being recorded is one per account per club, not one per role.

It also left the harder question unasked — *how does the platform learn that
this account is that Person?* — where the cheap answer (match the email
addresses) is available, silent, and wrong. That is now
[decision 10](../decisions/10_identity_is_asserted_never_inferred.md).

#### Deliverables

| | |
| --- | --- |
| **Migration** *(delivered)* | `account_person (club_id, user_id, person_id, linked_at, linked_by)`. Unique on `(club_id, user_id)` **and** on `(club_id, person_id)` — BR106 in both directions. A composite `foreign key (club_id, person_id) references person (club_id, id)` refuses a Person from another club in the database rather than in a screen, which needs a `unique (club_id, id)` on `person` first. RLS: read by any member (names are already club-readable), write by `admin` only, matching `club_membership_manage` |
| **Functions** *(delivered)* | `link_account_to_person(p_user_id, p_person_id)`, `unlink_account(p_user_id)` and `app_who_am_i(p_club_id)`, both `security definer`, both taking the club from `app_admin_club()` rather than as an argument — decision 6's shape, reused in decisions 8 and 9 and again here. `app_club_accounts()` gains the linked name, which means dropping and recreating it (a return-type change; migration 0017 learned this) |
| **Reads** *(delivered)* | `loadTenantContext` resolves the session through `app_who_am_i`; `SessionStrip` shows the name with the address alongside; `/registrar/access` shows a name with the email beneath it and **"Not linked" where there is none** (BR108). `loadLinkCandidates` is a thin read rather than `loadPeople`, which needs a season and builds roles and guardianships this screen decides nothing with, and it excludes merged-away records so an account cannot be linked to a tombstone BR82 retired |
| **Screen decisions** *(delivered)* | `src/web/access-view.ts` — `accountIdentity` (no fallback to the email address, ever), `linkableCandidates` (a Person another account already claims is not offered, because the database would refuse it — the WP3 defect, not repeated), `candidateLabel`. Twelve unit tests, each proved by breaking it |
| **Tests** *(delivered)* | 19 scenarios. A non-admin cannot link — not a registrar, not a member, not a stranger, not another club. An admin cannot link a Person from another club. One account cannot be two People; one Person cannot be two accounts. Unlinking removes the link and neither the Person nor the account, and frees the Person to be claimed again. Five guarantees were broken deliberately first — see below |
| **Rules** | BR106, BR107, BR108 |

#### Out of scope, deliberately

- **No self-service linking.** Proving your own identity needs an email the
  platform can send, which it cannot do at all yet. See decision 10.
- **No backfill by email matching.** That is the thing decision 10 refuses;
  doing it once "just to seed the data" is the same mistake with a smaller
  blast radius. Existing accounts start unlinked and an admin links them.
- **No permission follows the link.** Being linked to a Person who holds a
  committee office is not the `committee` role — [#59](./open-questions.md).
- **No change to `audit_event`.** It stores a uuid, the uuid is stable, and
  the link resolves it at read time.

#### What breaking each guarantee said

Each of these was removed from the migration, the suite re-run, and the
migration restored.

| Broken | What the suite said |
| ------ | ------------------- |
| `unique (club_id, person_id)` — the reverse direction | *two accounts both claimed to be the same person* |
| The admin-only write policy, widened to registrar | *a registrar inserted a link directly* · *a registrar deleted a link* |
| The membership filter in `app_who_am_i()` | *a link was readable at a club the caller does not belong to* |
| The composite foreign key **and** the function's own check, together | *an admin linked an account to another club's person* |
| The `left join` in `app_club_accounts()`, made an inner join | Caught one suite earlier, by `22_club_access.sql`: *the admin could not see their own account* |

Two of those are worth the words. **Removing either half of the cross-club
guard alone changed nothing** — the foreign key covers the function and the
function covers the message, which is the belt-and-braces working rather
than a redundant check. And the membership filter needed the suite
*strengthened* before it could fail: the original assertion asked whether a
link at another club was readable when no such link existed, so it would
have passed with the filter deleted. A link at Rival is now planted as the
table owner so the assertion has something to refuse.

#### What it does not do

**No permission follows the link**, which is worth saying on the screen and
is said there. Being recorded as the Person who holds a `committee_position`
is not the `committee` role, and does not become one — [#59](./open-questions.md).

**The picker lists every unclaimed person at the club.** At the pilot club
that is several hundred options in a `select`. It is the right amount of
machinery for a screen used a handful of times per season, and the honest
upgrade if that stops being true is a search field rather than a longer
list.

- **Outcome:** the application says *who* rather than *which email*, and P1
  reaches the sign-in identity — the last of the three findings in §3 to be
  closed.

### WP2 — A club access screen *(DELIVERED)*

- **Deliverables:** `/registrar/access` (admin only) with
  `AccessForms.tsx` and `actions.ts`; the pure `src/web/access-view.ts`;
  `supabase/migrations/0015_club_access_management.sql` with
  `app_admin_club()`, `app_club_accounts()`, `grant_club_role()` and
  `revoke_club_role()`; `supabase/tests/22_club_access.sql` (13 scenarios).
- **Outcome:** granting a registrar stops being a phone call to the platform
  owner.

**One correction to the plan.** It was scoped as needing no schema change,
because `club_membership_manage` already permits the writes. That was true
of the writes and wrong about the reads: `club_membership` stores a bare
`user_id` and `auth.users` is not readable through the API, so a screen
built on the policy alone would have listed uuids and nothing a human
recognises. Hence three `security definer` functions, each deriving the club
from the caller's own admin membership rather than accepting one — the shape
[decision 6](../decisions/6_public-registration-through-a-scoped-function.md)
and [decision 8](../decisions/8_demo_access_by_anonymous_session_and_a_read_only_role.md)
both use.

**`app_club_accounts()` is not a directory.** It returns email addresses
only for accounts that already hold a membership at the caller's own club,
and the test asserts that another club's account never appears. Granting by
email does reveal *whether an address has an account* to someone who already
administers a club; that disclosure is deliberate and narrow, and the
alternative — failing identically for a typo and for a real person — leaves
an admin unable to act.

**A club cannot lock itself out.** Removing the last `admin` is refused in
the database and explained in the interface rather than offered and denied.
Whether an admin may appoint *another* admin is left exactly as the policy
has it, because that is [open question #60](./open-questions.md) and not
mine to answer.

### WP3 — Never offer a control the database will refuse *(ON HOLD)*

**Held deliberately, September 2026.**

The defect is real and reproduced: a `viewer` in the demonstration club was
shown a *Resigned* button, pressed it, the database correctly refused, and
**the page said nothing at all**. The data was safe; the interface lied.

Two things make holding it defensible for now. It is cosmetic in the strict
sense — no data is at risk, because the refusal happens in the database
where it belongs. And it partly depends on WP4: hiding controls per role
means first agreeing what each role is *for*, and `committee`, `coach` and
`viewer` currently mean the same thing.

What it does affect is the demonstration club, where every prospect who
clicks a button that silently does nothing is forming a view about the
product. **WP2 does not have this defect** — its one refusal, removing the
last administrator, is explained in place rather than offered and denied.


- **Deliverables:** a pure `canWrite(roles, subject)` in `src/web/`, applied
  across the registrar screens; write controls hidden rather than shown and
  silently failing.
- **Outcome:** closes the defect found while testing the demonstration club
  — a `viewer` was shown a *Resigned* button, clicked it, the database
  correctly refused, and **the page said nothing at all**. Security held;
  the interface lied.

### WP4 — Make `committee` and `coach` mean something

- **Deliverables:** business rules first, then policies. What a committee
  member may see is a governance question, not a technical one.
- **Outcome:** six role names with six distinct meanings, or fewer names.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Linking an account to a Person | Creating `auth.users` rows from the app — needs the service-role key, which no page may hold |
| An admin granting and revoking roles at their own club | Self-service sign-up UI: enabled at the provider, no page, and it needs a decision about who may create an account at all |
| Hiding controls a role cannot use | Per-team scoping — "this coach sees only their own team" — which is a different and larger model than roles |
| Narrowing reads per role | Password reset and account recovery |
| Naming the actor in the audit log | Central super-administration — still a P5 exception needing its own decision record ([scope 28 §2](./28_onboarding-a-club-and-its-history.md)) |

## Gap notes

- **Per-team scoping is the big one.** "A coach sees their own team" cannot
  be expressed by a role, because it depends on a row in `team_member`. It
  is a genuinely different authorisation model — predicate-based rather than
  role-based — and it is what a club will ask for the first time a coach
  complains about seeing another team's families.
- **Password reset is absent and will be noticed immediately** once more
  than one person has an account. Supabase provides it; no page calls it.
- **There is no *production* database — the one everything points at is
  development.** Confirmed September 2026, correcting an assumption made
  earlier in this document's own branch. So local development writing to it
  is intended rather than dangerous. What remains true is the shape of the
  problem *later*: the first real club's data needs a project of its own,
  and the rule that a preview deployment must never point at it only starts
  to bite then ([5_technology/2_deployment.md](../ea/5_technology/2_deployment.md)).
- **Narrowing reads is a breaking change to every screen** that currently
  assumes a member sees everything. It should be done once, deliberately,
  with the business asked what a coach and a committee member ought to see —
  not incrementally per screen.

## Open questions

**#58 — What should a `coach` be able to see?** Today: every family's
balance, consents and contact details across the entire club. The plausible
answers range from "their own team's players only" to "the same as any
member, because a small club is a small room". This is a privacy decision
about children's data, so it belongs to the club and its jurisdiction (BR52)
rather than to an engineering preference.

**#59 — Should `committee` carry any write permission at all?** BR21 says a
Voucher Program needs Committee approval, and BR85–BR88 model the committee
as a record. But a committee member holding the `committee` role can write
nothing, so "the Committee approved it" is recorded *by an admin on their
behalf*. Either the role gains the ability to record its own decisions, or
the rules should stop implying it acts in the system.

**#60 — May a club admin grant `admin` to someone else?** The policy
currently allows it, so any admin can create another admin, and an admin can
revoke their own access and lock the club out. Whether that is correct is a
governance question the club should answer, not a default that arrived with
the policy.
