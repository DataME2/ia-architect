# Project Scope — A Migration Proves It Ran

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/a-migration-proves-it-ran`.

Asked directly, after the second time this happened: *"create a trigger or
automatic detection code when something similar happen."* Twice now a
migration merged to `main` and never reached the connected Supabase
project's schema cache, and nothing told anyone until a human hit the
gap directly:

| When | Migration | Found by |
| ---- | ---------- | -------- |
| [Scope 61](./61_a_committee_office_that_does_not_take_down_me.md) | `committee_resolution` (0049, scope 57) | A registrar's crash report |
| [Scope 93](./93_a_player_reads_their_own_role.md) | `person_role_select_family` (0089) | A QA pass against `qa.adultplayer@northstarfc.test` |

Both times the fix was reactive — a person noticed a product defect, and
tracing it back eventually reached "the database doesn't actually have
this yet." This initiative makes that gap something the platform notices
on its own, between an hour and a day after it opens rather than after
somebody hits it.

## Why not read Supabase's own `supabase_migrations` schema

The obvious shortcut — query the table Supabase's own migration tooling
already keeps — was rejected on inspection. This codebase has no verified
knowledge of that schema's exact shape, whether it is exposed to
PostgREST at all, or whether its `version` column's format matches what a
naive text comparison would assume. Building an alert on an unverified
assumption about someone else's internal table would risk repeating the
exact failure this initiative exists to catch: a thing that looks like it
works until the one time it is asked to.

So the receipt is this repository's own: `schema_migration_log` (migration
0090), a table this codebase creates, owns, and can prove the shape of in
`scripts/test_rls.sh`. Every migration from 0090 onward ends with one
`insert` naming itself.

## Three things have to stay honest, and two are enforced rather than remembered

1. **The newest migration must register itself.** `scripts/check_migration_receipt.py`
   parses the newest file in `supabase/migrations/` and fails the build if
   its `insert into schema_migration_log` is missing, or names a version
   or filename that does not match the file it is in.
2. **`src/data/migration-drift.ts`'s `EXPECTED_MIGRATION_VERSION` must be
   bumped to match.** The same script checks this too — a forgotten bump
   would make the detector permanently noisy (alerting even once the
   database genuinely catches up) rather than silently blind, but a build
   gate is better than relying on the difference being merely annoying
   rather than dangerous.
3. **The database must actually apply the migration.** This is the one
   nobody in this chain can enforce — it depends on Supabase's own GitHub
   integration, which is exactly the gap this initiative detects rather
   than prevents. There is no version of this fix that reaches into
   Supabase's deployment pipeline from inside this repository.

## Why the receipt table itself is unreadable through the API

`schema_migration_log` carries RLS with no permissive policy for
`authenticated` or `anon` — the same isolation `platform_admin` (0016) and
`user_password_set` use. A receipt an application can insert into is not a
receipt; the only writer is the migration runner itself, inserting as the
database owner outside RLS entirely, and the only reader is the cron job's
service-role client, which bypasses RLS by design. `supabase/tests/90_a_migration_proves_it_ran.sql`
proves both directions are actually refused, not just undocumented.

## The alert reuses BR146's own mechanism rather than inventing a second one

`composeMigrationDriftAlert` (`src/domain/messaging/migration-drift-alert.ts`)
is a sibling of `composeEnquiryAlert`, and `checkMigrationDrift`
(`src/data/migration-drift.ts`) sends through the same `resendTransport()`
and the same `PLATFORM_ALERT_TO` address `alertPlatform` already uses.
Scope 43's own assistant-autonomy check polices "exactly one" notification
surface for the same reason this matters here: a second alerting mechanism
is how an operator misses the one that actually fires.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change** |
| **2_business** | **No new rule.** This extends BR146's existing mechanism to a new kind of event rather than deciding a new one — the alert's recipient, address, and transport are exactly what BR146 already specifies |
| **3_information** | **One new table: `schema_migration_log`** — this repository's own receipt, unreadable through the API in either direction |
| **4_application** | New: `src/data/migration-drift.ts`, `src/domain/messaging/migration-drift-alert.ts`, `/api/cron/migration-drift`, `scripts/check_migration_receipt.py`. Changed: `vercel.json` (new hourly cron entry), `scripts/check_rls.py` (one new tenantless-allowed entry), `.github/workflows/code-check.yml` (one new CI step) |
| **5_technology** | **No change.** Reuses the existing Vercel Cron / `CRON_SECRET` / `createAdminClient('scheduled-job')` pattern `wwcc-reminders` established |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A migration merged to `main` and never applied was invisible until a registrar's crash or a QA pass happened to exercise exactly the gap it left — twice, each discovered days apart from the merge |
| **Target** | Every migration from 0090 onward proves it ran. An hourly job compares the database's newest proof against what the deployed build expects and alerts the platform's own operators within the hour if they disagree. A migration that forgets to register itself, or a drift check nobody updated to expect it, fails the build before either ships |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | Migration 0090 — `schema_migration_log`, RLS with no permissive policy, self-registering insert | **Delivered** |
| **WP2** | `src/domain/messaging/migration-drift-alert.ts` (pure, tested) and `src/data/migration-drift.ts` (`checkMigrationDrift`, never throws) | **Delivered** |
| **WP3** | `/api/cron/migration-drift`, wired into `vercel.json` hourly | **Delivered** |
| **WP4** | `scripts/check_migration_receipt.py`, enforcing both the self-registering insert and the expected-version constant staying in sync, wired into `npm run check` and CI | **Delivered** |
| **WP5** | `supabase/tests/90_a_migration_proves_it_ran.sql` — the receipt registers itself and is unreadable and unwritable through the API by an admin or an anonymous caller alike | **Delivered** |
| **WP6** | `scripts/check_rls.py`'s tenantless-allowed list, `docs/ea/5_technology/2_deployment.md`'s Scheduled jobs section, and `docs/ea/4_application/2_application-components.md` updated | **Delivered** |

## What this initiative does not do

- **Does not make Supabase apply a migration faster, or at all.** It
  shortens the time between a migration failing to apply and somebody
  finding out, from however long it takes a person to hit the gap, to at
  most an hour. The underlying application step is still entirely
  Supabase's own GitHub integration.
- **Does not retroactively register migrations 0001–0089.** The practice
  starts at 0090; `scripts/check_migration_receipt.py` has no opinion about
  history, and the detector's first real signal is whatever the newest
  migration going forward is.
- **Does not detect a migration that applied but did the wrong thing.**
  This proves *presence* — the newest migration reached the database — not
  *correctness*, which is what `scripts/test_rls.sh` is already for.
- **Does not alert anywhere but `PLATFORM_ALERT_TO`.** No bell, no Slack,
  no second channel — the same single surface BR146 already uses, on
  purpose.
