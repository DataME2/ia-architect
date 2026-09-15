# `scripts/`

_[← Repository README](../README.md) · [CONTRIBUTING](../CONTRIBUTING.md)_

## Purpose

The build **gates**. Not lints, not conveniences — each one fails the build
for a failure mode this project has either suffered or cannot afford to
suffer once.

## Key dependencies

**Depends on:** Python 3 (standard library only — no packages to install),
`bash`, and for `test_rls.sh` a Postgres 16 (`psql`, or a `DATABASE_URL`).

**Depended on by:** `npm run check` and `npm run check:full` in
[`package.json`](../package.json), and the `check`, `rls-behaviour` and
`check-links` jobs in [`.github/workflows/`](../.github/workflows/).

## Layout

| Script | Gates | Runs in |
| ------ | ----- | ------- |
| `check_rls.py` | **Every table has RLS enabled, at least one policy, and a tenant column.** Its exemption list is deliberately short and each entry carries its reasoning; the three added for the competition catalogue (0032) are the only ones readable across tenants, and `supabase/tests/35` is what makes them safe rather than argued. A table without a policy is a cross-tenant leak of children's data, and it happens through an ordinary omission in a migration — so this is a gate rather than a review item | `code-check` |
| `test_rls.sh` | **The one that matters more.** Applies the real migrations to a throwaway Postgres and proves the policies *work* — `check_rls.py` only proves one exists, and a policy can be present and wrong | `rls-behaviour` |
| `check_server_actions.py` | No `'use server'` module exports anything but an async function. Next throws on a bad export at *request* time, not always at build time: a module reached only through a client component passes `next build` and then fails on the first request, which is how a broken sign-in page shipped past a green build here | `code-check` |
| `check_links.py` | Every relative Markdown and HTML link resolves, and every HTML fragment points at a real `id`. Documentation whose cross-references rot stops being checkable against the code | `docs-check` |
| `check_a11y.py` | The mechanical half of WCAG 2.2 AA (NFR-15): every form control has an accessible name, every image declares its `alt`, every icon is hidden or named, no positive `tabIndex`. Chosen because each is invisible to a sighted reviewer — the screen still looks right. **It scans tags rather than matching them with a regex**: the first version used one and cried wolf three times on the `>` inside an arrow function, and a checker that cries wolf gets switched off | `code-check` |
| `check_assistant.py` | [Decision 1](../docs/decisions/1_ai-assistant-autonomy-level.md)'s autonomy level, asserted rather than reviewed (R33.6): exactly one Assistant surface, committing nothing, and **no generative client imported anywhere in `src/`**. Written *before* there is an integration on purpose — the edit that adds one is the edit that would otherwise widen the surface quietly | `code-check` |
| `rehearse_restore.sh` | **A backup nobody has restored is a belief, not a capability** (NFR-17). Dumps a built database, restores it into an empty one, and counts what came back — **policies first**, because P5 lives in them and a restore that keeps the tables and loses the policies reads as a clean restore until one club opens another's records | `rls-behaviour` |

## Adding one

A script earns a place here when it catches something a reviewer reliably
will not. Give it a module docstring saying **what it gates and why it is a
gate rather than a lint**, wire it into `npm run check` in CI's order, and
add its row above.

## Where the architecture lives

[`CONTRIBUTING.md`](../CONTRIBUTING.md) lists these under the development
workflow and the definition of done;
[`docs/ea/4_application/2_application-components.md`](../docs/ea/4_application/2_application-components.md)
carries the policy-coverage gate and the tenant-isolation test as
components in their own right.
