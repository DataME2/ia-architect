# `supabase/tests/`

_[← Repository README](../../README.md) · [Migrations](../migrations/README.md)_

## Purpose

**The tests that matter most in this repository.**

`scripts/check_rls.py` proves a policy *exists* — static analysis of the
migration text. These files apply the **real migrations to a real Postgres**
and prove the policies *work*: that a registrar at one club cannot read,
write, update or delete another club's rows, that append-only tables really
are, that a trigger refuses what it is supposed to refuse, and that a
non-member and an anonymous caller see nothing at all.

A policy can be present and wrong, and that failure is **silent** until one
club reads another's records. That is what this directory exists for.

## Key dependencies

**Depends on:** [`../migrations/`](../migrations/README.md) — the actual
files, applied in order, not a copy or a fixture — plus `psql` and a
throwaway Postgres 16.

**Depended on by:** the `rls-behaviour` job in
[`.github/workflows/code-check.yml`](../../.github/workflows/code-check.yml),
which runs on every pull request.

**Run it:**

```bash
bash scripts/test_rls.sh          # starts its own cluster
DATABASE_URL=postgres://… bash scripts/test_rls.sh   # uses that one (CI)
npm run check:full                # everything, including this
```

## Layout

Numbered by concern, run in order:

| File | Proves |
| ---- | ------ |
| `00_local_supabase_shim.sql` | Local stand-ins for what Supabase provides — enough of `auth.users`, `auth.uid()` and the `authenticated` role that the real policies resolve on a plain Postgres. **Nothing here ships** |
| `10_tenant_isolation.sql` | The core claim: 11 scenarios of one club's registrar against another club's rows |
| `11`–`16` | Pack immutability, public registration as `anon`, requirements and roles at intake, payment plans, vouchers and siblings, one creation path and merging |
| `17`–`21` | Teams and clearances, match officials and governance, committee adults, the demonstration door, marketing consent |
| `22`–`25` | Club access, platform administration, the player record, the account↔Person link |
| `26`–`30` | The referee slice: record, availability, appointments, verification and fees, claims and batches |
| `31`–`32` | Family access, and what a household may read |
| `38` | Calendar distribution — a feed carries its subscriber's commitments and nobody else's, rotation and revocation kill the URL at once, and a minor's feed belongs to their guardian |
| `39` | Reporting — a coach is **refused** each report rather than handed the zeros RLS would have produced, the checks are per report, owing and credit stay apart, and a blocker is counted once per registration rather than once per recheck |
| `40` | Club enquiry — the third public write path grants **no club, no membership and no account** (BR145), the session that wrote a lead cannot read it back, only the platform owner can, a returning club stays one lead, and an unticked box withdraws nothing |
| `37` | Carnivals — the tables carry no person column (asserted against `information_schema`), publishing opens exactly three of them, and anon reads but never writes |
| `36` | Officiating interest — a declaration creates nothing, accepting records the level **unsighted**, and only the person or a guardian with authority may declare |
| `35` | The competition catalogue — every club reads it, **no club writes it**, and a minimum cannot cross associations. These scenarios are what makes `check_rls.py`'s three new exemptions safe rather than argued |
| `34` | Privacy rights — an erasure deletes or refuses naming its reasons, the request outlives its subject, the review proposes without deleting, and a deceased life member is never proposed |
| `33` | Communications — a withdrawal is honoured, indistinguishable when refused, separate per purpose, and not undoable by an officer's ordinary update |
| `99_grants.sql` | Table privileges for the Supabase roles. **RLS decides which rows; GRANT decides whether the role may touch the table at all** — a policy without a grant denies everything, and a grant without a policy is the leak `check_rls.py` exists to catch |

## Writing one

A scenario is written as **the failure it would catch**, not as the
behaviour it confirms. And under BR122, a read policy that narrows by role
ships with a scenario asserting **the excluded role reads nothing** — a
narrowing is proved by a test that fails when it is widened.

## Where the architecture lives

Principle P5 in
[`docs/ea/1_strategy/1_motivation.md`](../../docs/ea/1_strategy/1_motivation.md),
and the tenant-isolation service in
[`docs/ea/4_application/1_application-services.md`](../../docs/ea/4_application/1_application-services.md).
