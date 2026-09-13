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
| `check_rls.py` | **Every table has RLS enabled, at least one policy, and a tenant column.** A table without a policy is a cross-tenant leak of children's data, and it happens through an ordinary omission in a migration — so this is a gate rather than a review item | `code-check` |
| `test_rls.sh` | **The one that matters more.** Applies the real migrations to a throwaway Postgres and proves the policies *work* — `check_rls.py` only proves one exists, and a policy can be present and wrong | `rls-behaviour` |
| `check_server_actions.py` | No `'use server'` module exports anything but an async function. Next throws on a bad export at *request* time, not always at build time: a module reached only through a client component passes `next build` and then fails on the first request, which is how a broken sign-in page shipped past a green build here | `code-check` |
| `check_links.py` | Every relative Markdown and HTML link resolves, and every HTML fragment points at a real `id`. Documentation whose cross-references rot stops being checkable against the code | `docs-check` |

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
