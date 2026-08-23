# Annex — Provisioning a New Club (Tenant)

_[← Annexes](./README.md) · [Enterprise architecture](../ea/README.md)_

Realises **C10** (multitenant platform operations) and **P5** (strict tenant
isolation).

A new club is **data, not a deployment**. One Supabase project, one
Postgres, one Next.js application serve every club; a new tenant is a row in
`club` and the rows that hang off it. There is no new environment, no new
connection string, no new build.

## Why the first two steps cannot be done in the application

This is the part worth understanding before following the steps, because it
looks like a gap and is a decision.

```sql
-- supabase/migrations/0002_rls_policies.sql
create policy club_modify on club
  for all using (false) with check (false);
```

**Nobody can create a club through the API. Ever.** Not a registrar, not a
club admin, not the platform owner signed in as a user. The policy denies
every write unconditionally, and the only route left is a connection that
bypasses Row-Level Security — the service role, or SQL run as the table
owner.

The second obstacle follows from the first:

```sql
create policy club_membership_manage on club_membership
  for all using (app_has_role(club_id, array['admin']))
  with check (app_has_role(club_id, array['admin']));
```

Adding a membership requires **already being an admin of that club**. So the
*first* membership at a brand-new club cannot be created by anyone either.
The club has no admins yet, and the only person who could appoint one is an
admin.

That is a genuine bootstrap paradox and it is deliberate. The alternative —
letting a signed-in user create a club, or grant themselves a membership —
would mean a compromised session could manufacture a tenant, or attach
itself to an existing one. **P5 is enforced by the database rather than by
application code precisely so that a mistake in application code cannot
reach across tenants**, and provisioning is the one operation where that
protection has to be stepped around on purpose, by a human, out of band.

The cost is honest: **tenant provisioning is an operator task, and C10 is
unbuilt.** There is no self-service sign-up, and there should not be one
until somebody decides who is allowed to create clubs and how that is
authorised.

## Before you start

You need access to the Supabase project's SQL editor or service-role
connection. Everything in steps 1–4 runs with Row-Level Security bypassed,
so **read each statement before running it** — nothing below is protected by
the policies that protect the running application.

Never paste a service-role key or a database URL into a shared document, a
chat, or this repository. The repository is public.

## Step 1 — Create the club *(elevated)*

```sql
insert into club (name, jurisdiction)
values ('Example United FC', 'AU-QLD')
returning id;
```

`jurisdiction` drives the privacy framework the club operates under (BR52).
Keep the returned id — the next steps need it.

## Step 2 — Create the first user *(Supabase Auth)*

In the Supabase dashboard, **Authentication → Users → Add user**, with an
email and password. Or use the Auth admin API.

This creates a row in `auth.users`. It grants no access to anything: without
a membership, `app_member_club_ids()` returns nothing and every policy in
the schema denies. A signed-in user with no membership sees exactly what a
stranger sees, which is the correct answer to give a stranger.

## Step 3 — Seed the first membership *(elevated — the bootstrap)*

```sql
insert into club_membership (club_id, user_id, role)
values ('<club id from step 1>', '<user id from step 2>', 'admin');
```

**This is the step that cannot be repeated from inside the application, and
the only one that has to be done this way.** Give the first person `admin`:
they can then appoint everybody else.

Roles are additive and a person may hold several — one row each. Small clubs
routinely have one human who is both registrar and treasurer:

```sql
insert into club_membership (club_id, user_id, role)
values ('<club id>', '<user id>', 'registrar'),
       ('<club id>', '<user id>', 'treasurer');
```

The available roles are `admin`, `registrar`, `treasurer`, `committee`,
`coach`, `coordinator`. They decide what the screens allow: only admin or
treasurer may verify a voucher or record a payment (BR78); only admin may
change the committee (BR85); clearance card numbers are readable by admin
and registrar alone (BR83).

## Step 4 — Create the first season *(elevated, for now)*

```sql
insert into season (club_id, name, starts_on, ends_on)
values ('<club id>', '2027', date '2027-01-01', date '2027-12-01');
```

Unlike steps 1 and 3, **this one is not architecturally out of bounds** —
the policy already permits an admin or registrar to create a season. There
is simply no screen for it yet. When one is built this step moves into the
application; the others cannot.

A season is required before almost anything else: registrations, teams,
roles, committee terms and registration links are all season-scoped.

## Step 5 onward — inside the application

Sign in as the user from step 2. Everything below is ordinary in-app work.
The session strip at the top of every screen shows which club and which
roles you are acting with, the menu beneath it reaches every screen in the
table below, and if the club is the demonstration tenant
(`supabase/demo/seed.sql`) the strip says so — no screen should ever leave
you guessing whether the data in front of you is real.

| Order | Screen | What it establishes |
| ----- | ------ | ------------------- |
| 5 | `/registrar/season` | The season's **registration fee** and **document checklist**. Do this first — both are stamped onto every registration at the moment it is created, and a registration made before they are set carries neither (BR2, BR3) |
| 6 | `/registrar/governance` | Open a **committee term** and record who governs. Other rules point at this: a Voucher Program needs Committee approval (BR21), and until somebody is recorded here that approval has nothing to point at. Adults only (BR87) |
| 7 | `/registrar/teams` | Record **Working with Children Checks** first, then create teams and add officials. A coach cannot be added without a verified card covering the end of the season (BR83) — so the cards come before the teams |
| 8 | `/registrar/invitations` | Issue a **registration link** per cohort and send it to families. They register with no account (BR72). The link is shown once and only its hash is stored (BR73); if one is lost, *Reissue* replaces it |
| 9 | `/registrar` | The queue fills as families submit. Work the blockers, verify legal names (BR55), resolve duplicates at `/registrar/duplicates` |
| 10 | `/registrar/pack` | Generate the submission pack when registrations are ready, and record the handover (BR58–BR60) |

## Ordering that matters

Two of these are not merely conventional:

**Season requirements before any registration.** The checklist and fee are
copied onto a registration when it is created, not read live. Registrations
made before step 5 carry an empty checklist and a zero fee, and the fix is
the *Apply this season's checklist* button on each one — deliberately
manual, because a family cannot be held to a requirement they were never
told about.

**Clearances before officials.** BR83 refuses a coach, assistant coach,
manager or team official without a verified card covering the season's end.
Creating teams first and discovering this at the point of adding coaches is
the same work in a more annoying order.

## Verifying the tenant is isolated

Worth doing once on a new deployment, not once per club — but this is the
claim the whole architecture rests on, so it should be checked at least
once against real data:

```sql
-- As the new club's admin, from the SQL editor with a JWT set, or simply
-- by signing in and looking: the counts should show only this club.
select count(*) from person;        -- only this club's people
select count(*) from registration;  -- only this club's registrations
```

A member of one club querying without a `club_id` filter returns **their own
club's rows only** — never zero, never another club's. That is the property
`supabase/tests/10_tenant_isolation.sql` proves across 11 scenarios, and
`scripts/test_rls.sh` runs it against a real Postgres in CI.

## What is deliberately missing

- **No self-service sign-up.** By design, and it stays that way until
  somebody decides who may create clubs and how that is authorised.
- **No screen for `club_membership`.** Adding a second registrar is step 3
  again, by hand. The policy allows an admin to do it; no UI exists.
- **No screen for creating a season.** See step 4.
- **No club deletion.** `on delete cascade` runs throughout the schema, so
  deleting a club row would remove every registration, payment, consent and
  audit record beneath it. Nothing offers that, and nothing should without
  the retention questions ([#30](../scope/open-questions.md)) being answered
  first.
