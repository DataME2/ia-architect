# Annex — Backup, restore, and what has actually been proved

_[← Annexes](./README.md) · [Enterprise architecture](../ea/README.md)_

**Realises:** NFR-17 · [Scope 49](../scope/49_an_environment_of_its_own.md)

NFR-17 read **"Undefined — Supabase defaults; no stated RPO/RTO, no restore
rehearsal"** from the day it was written, against a project holding the only
copy of the data there is.

**A backup nobody has restored is a belief, not a capability.** This states
the targets, records the rehearsal that now runs on every change, and is
explicit about the parts still unproved — which are the parts that need a
production project to exist.

## The targets

| | Target | Basis |
| - | ------ | ----- |
| **RPO** — how much data a disaster may lose | **24 hours** today; **1 hour** once a real club is on the platform | Supabase's daily backup on the free and Pro tiers is a 24-hour window. An hour needs Point-in-Time Recovery, which is a paid add-on and a decision for the first paying club, not before |
| **RTO** — how long until the club is working again | **4 hours** | Not a technical limit: the schema restores in seconds (below). It is the time to *notice*, decide, restore, re-point the application and verify — most of which is a person, and nobody is on call |
| **Retention** | **7 days** today | Supabase's default. The [retention schedule](./retention-schedule.md) governs how long *records* live; this is how far back a mistake can be undone, which is a different question and a much shorter answer |

**The RPO is the honest weak point.** A club's registration day is the
busiest data day of its year, and losing 24 hours of it means a hundred
families registering twice. The mitigation is not technical — it is that
there is no real club yet. That stops being true with the first customer.

## What the rehearsal proves

`scripts/rehearse_restore.sh`, in `npm run check:full` and in CI on every
change. It builds a database from the real migrations, seeds rows, dumps it,
restores into an empty one, and **counts what came back on both sides**.

| Checked | Why this one |
| ------- | ------------ |
| Row-level policies | **First, and the reason the script exists.** P5 lives in the policies, so a restore that brings back every table and loses the policies restores a database with *no tenant isolation* — and reads as a clean restore until one club opens another's records |
| Tables, and tables with RLS enabled | A table restored with RLS switched off is the same failure by another route |
| Functions, triggers, check constraints | The rules that are enforced in the database rather than in code — BR74's deferred constraint, BR84's trigger, BR147's guard |
| Clubs and people | A restore that returns the schema and none of the records is the failure mode that looks most like success |
| The `SELECT` policy on `person`, by name | A restore that brought back the right *number* of policies and the wrong ones passes every count above |

Measured on a throwaway Postgres: **425 KB dumped in under a second,
restored in under a second**, 144 policies, 59 tables, 105 functions, 31
triggers and 459 check constraints identical on both sides.

It is **verified to fail**: dropping one policy after the restore turns the
run red and names the count that changed.

## What it does not prove, and is not pretended to

- **Nothing about Supabase's own backups.** That they are taken, that they
  are retained for as long as the dashboard says, that one can be restored
  from the dashboard at all — none of that is exercised here, and all of it
  needs a project to exercise it against.
- **Nothing about the real restore time.** Seconds on a 425 KB throwaway
  says nothing about a club-season database over a network.
- **Not Supabase's `auth` schema.** Locally that is a shim
  (`supabase/tests/00_local_supabase_shim.sql`); on Supabase it is theirs,
  managed separately, and **a restore of the database does not restore the
  accounts**. Whether users have to be re-invited after a restore is
  unanswered and is the first thing to find out with a real project.
- **No storage.** Identification photographs live in a Supabase Storage
  bucket, not in Postgres. `pg_dump` does not touch them, and nothing here
  backs them up or has ever restored one.
- **No off-Supabase copy.** Every backup is inside the same account as the
  data. An account-level loss — billing, suspension, a mistaken deletion —
  takes both.

## The procedure, for the day it is needed

1. **Stop writing.** Put the application into maintenance, or revoke the
   anon key. A restore that races live traffic produces a third state that
   is neither the backup nor the present.
2. **Restore into a new project**, never over the top of the damaged one.
   The damaged database is evidence, and the second-worst outcome here is a
   bad restore over the only copy.
3. **Verify before re-pointing**, with the same counts the rehearsal uses:
   policies first, then tables, then rows.
4. **Re-point the application** by changing the Vercel production
   environment variables — and note that
   `assertNotPreviewAgainstProduction` keys on the project ref, so
   `PRODUCTION_PROJECT_REF` in `src/data/env.ts` changes in the same act.
5. **Write down what was lost.** The gap between the backup and the incident
   is real data — registrations, payments, consents — and families have to
   be told rather than quietly asked to do it again.

## Outstanding, and what each needs

| Gap | Needs |
| --- | ----- |
| A restore rehearsed against **a real Supabase project** | The production project to exist |
| Point-in-Time Recovery, taking the RPO to an hour | A paid tier, justified by the first real club |
| A backup **outside** the Supabase account | A decision about where, and a job to put it there. A cron surface now exists (scope 48's `vercel.json`), so this is no longer blocked on machinery — only on deciding where a second copy of children's records may live |
| Storage-bucket backup | The same, plus a decision about photographs of children leaving the region ([P5](../ea/1_strategy/1_motivation.md), BR56) |
| Whether accounts survive a restore | Twenty minutes with a real project, and worth doing early |
