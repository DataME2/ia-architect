# Project Scope — Production Moves to a New Project

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/prod-is-sqzqausvkgjsdwcgicxn`.

[Scope 114](./114_a_public_test_site_and_a_production_project.md) built a
production Supabase project, `pitchpeople-prod` (`afufvmkxjkulygeoajpw`).
On 28 October 2026 the product owner set up a different project,
`sqzqausvkgjsdwcgicxn`, as **PROD**, and retired `pitchpeople-prod`. Neither
had ever been pointed at or held a row. This initiative builds the new
project from the same migrations and moves the guard to it.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It is the same production environment in a different project |
| 2_business    | **No change.** No rule, service or process changes |
| 3_information | **No change to any data object.** The new project holds the whole schema and no rows. DEV keeps the synthetic data |
| 4_application | **Changed:** `PRODUCTION_PROJECT_REF` in `src/data/env.ts` is `sqzqausvkgjsdwcgicxn`, so the guard against a non-production deployment reaching production moves with it |
| 5_technology  | **Changed:** in [deployment](../ea/5_technology/2_deployment.md), the **Production** row names the new project, and `pitchpeople-prod` and `ltd-production` are both superseded |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | `pitchpeople-prod` holds 0001–0097 and the guard names it |
| **Target** (delivered) | `sqzqausvkgjsdwcgicxn` holds 0001–0097 and the guard names it. `pitchpeople-prod` is no longer referred to as production anywhere |

## Work packages and deliverables

### WP1 — The new project, built and verified

- **Deliverables:** migrations 0001–0097 applied on 2026-10-28, by the same
  procedure as scope 114:
  - `supabase db push --db-url` through the Sydney session pooler
    (`aws-0-ap-southeast-2.pooler.supabase.com:5432`). Connecting there also
    confirms the project is in `ap-southeast-2`.
  - The password passed as `PGPASSWORD`, never in the URL or in the output.
  - Run from a copy of the migrations alone, because current CLIs refuse
    the repository's `supabase/config.toml`.
- **Verified the same day:**
  - `schema_migration_log` reads 0097.
  - 93 public tables, all with RLS and a policy.
  - Six Storage buckets (only `sponsor-creatives` public) and 16 policies
    on `storage.objects`.
  - `anon` cannot execute 0096's functions, and `club` and `person` hold no
    rows.
  - An object-by-object comparison with DEV gives identical hashes for
    tables, functions, policies, triggers, buckets, and the functions `anon`
    can execute. The only difference is two extensions that DEV's dashboard
    Index Advisor installed (`hypopg`, `index_advisor`), which no migration
    or code uses.
- **Outcome:** a production database that matches `main` and that nothing
  can reach by accident.

### WP2 — The guard and the documents name it

- **Deliverables:**
  - `PRODUCTION_PROJECT_REF` in `src/data/env.ts`, with its comment.
  - The Production row in [deployment](../ea/5_technology/2_deployment.md).
  - NFR-9 in [requirements](../spec/requirements.md).
  - `CLAUDE.md`, `README.md` and `supabase/migrations/README.md`.
  - Scope 114's row in the [scope index](./README.md).
- **Outcome:** the repository names one production project.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Building the new project and moving the guard | Deleting or pausing `pitchpeople-prod`: the product owner's step in the dashboard, **done 2026-10-28** |
| The documents naming it | Pointing any deployment at production, which still waits for a real club (scope 49, step 4) |
| | The new project's dashboard settings (Auth URLs, SMTP, email templates, backups) |

## Gap notes

- **`pitchpeople-prod` is gone.** The product owner deleted or paused it in
  the dashboard on 2026-10-28. It held the schema and no rows, and nothing
  in the repository names it as production any more.
- **Dashboard settings.** The new project's Auth, SMTP, template and backup
  settings are not in migrations and were not compared. They matter on the
  day a deployment points at it.

## Open questions

- None.
