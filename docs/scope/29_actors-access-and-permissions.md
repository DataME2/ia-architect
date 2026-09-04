# Project Scope — Actors, Access and Permissions

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/governance-actors-and-permissions`.
**Status: audit complete, implementation not started.**

Three questions were asked of club governance and administration: **how does
an actor sign in, what may each actor do, and what may each actor see?**
This document answers all three from the policies as they actually stand —
read out of `pg_policies` in production, not out of the documentation — and
records what the answers reveal. Two of the three answers are uncomfortable,
which is why this is a scope document and not a patch.

## 1. How an actor signs in — today

**They cannot, unless the platform owner creates them by hand.**

| Step | Where | Who can do it |
| ---- | ----- | ------------- |
| Create the account | Supabase dashboard → Authentication → Users | Platform owner only |
| Grant a role at a club | Hand-typed `insert into club_membership` | Platform owner only, through elevated SQL |
| Sign in | `/sign-in`, email and password | The person, once both above are done |

There is **no sign-up page, no invitation, no password reset, and no screen
for `club_membership`**. A club secretary who needs access phones the
platform owner, who runs SQL.

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

**Today there is exactly one account in the entire system**,
`admin@northstarfc.com.au`, holding both `admin` and `registrar`. Every
action ever taken in production was taken by it. The audit log is therefore
technically accurate and practically useless: it records *what* happened and
cannot distinguish *who* did it, because there is only one who.

## 2. What each actor may do — the real matrix

Read from `pg_policies`. **Writes are role-based; reads are not.**

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
| Club membership (who has access) | **W** | R | R | R | R | R | R |
| Submission packs | **W** | **W** | R | R | R | R | R |
| Audit log | R | — | — | — | — | — | — |
| Prospects | — | — | — | — | — | — | — |

**W** = read and write · **R** = read only · **—** = no access at all

### Three things this table says out loud

**`committee`, `coach` and `viewer` are the same role.** None of them is
named in a single write policy anywhere in the schema, and all three read
the same 21 tables. The three names differ; the permissions do not. A club
appointing someone `coach` rather than `viewer` is recording an intention
the system does not act on.

**A role restricts writing and barely restricts reading.** Twenty-one of
twenty-four tables are readable by *any member of the club, in any role*. So
a coach can read every family's outstanding balance, every consent decision,
every payment and every guardian's contact details across the whole club —
not just their own team. Nothing in the business rules asked for that; it is
what `club_id in (select app_member_club_ids())` means, applied uniformly.

**The two exceptions prove it was thought about once.** `clearance` is
narrowed to admin and registrar because a Working with Children Check number
is a safeguarding record, and `audit_event` to admin alone. Both narrowings
were deliberate and both are argued in the migrations. Nothing else was
narrowed — including money.

## 3. What each actor may see — and the gap underneath it

The read column above is the literal answer. The structural answer is worse.

**Nothing connects a login to a Person.** `club_membership` binds an
`auth.users` id to a club and a role. There is no `person_id` on it, and no
`user_id` on `person`. So the application cannot answer *"who is signed
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

## EA alignment (assessed top-down; nothing implemented)

| Layer | Impact when this is built |
| ----- | ------------------------- |
| 1_strategy | No new capability. **P1 is currently unhonoured for the sign-in identity** and this closes that gap rather than changing the principle. C19 and C10 both gain substance |
| 2_business | New rules for who may grant access, what a role restricts, and the separation between a Person and their account. The `committee` and `coach` roles need to mean something or be removed |
| 3_information | A link between `club_membership` (or `person`) and the auth user. Read-narrowing would change the classification of finance and contact data per role |
| 4_application | A club access screen (admin only), role-aware rendering so no button is offered that the database will refuse, and a self-service account route |
| 5_technology | No change. Same stack; all of this is policy and screens |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (today) | One account for the whole platform. Access granted by hand-typed SQL. Six role names, four of which have distinct permissions. Reads unrestricted within a club. No link between an account and a Person |
| **Target** | An admin grants and revokes access in the application. Every role name means something. Money and contact details are readable by the roles that need them. A signed-in officer is recognised as the Person they are, and the audit log names them |

## Work packages and deliverables

### WP1 — Say who is signed in *(prerequisite for everything else)*

- **Deliverables:** migration adding `person_id` to `club_membership`
  (nullable — an account may exist before anyone links it), backfill for the
  single existing account, `src/data/queries.ts` resolving the session to a
  Person, `SessionStrip` showing the name.
- **Outcome:** the application can say *who* rather than *which email*, and
  P1 covers the sign-in identity.

### WP2 — A club access screen

- **Deliverables:** `/registrar/access` (admin only), listing every account
  with a role at this club, with grant and revoke. Server actions in
  `src/app/registrar/access/actions.ts`. A pure `src/web/access-view.ts`
  deciding what an admin may change.
- **Outcome:** granting a registrar stops being a phone call to the platform
  owner. **No schema change and no new policy** — `club_membership_manage`
  already permits exactly this.

### WP3 — Never offer a control the database will refuse

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
