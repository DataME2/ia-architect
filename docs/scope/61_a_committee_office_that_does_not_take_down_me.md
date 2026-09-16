# Project Scope — A Committee Office That Does Not Take Down `/me`

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/governance-read-resilience`.

A reported runtime error named the cause directly:

```
QueryError: committee_resolution: Could not find the table 'public.committee_resolution'
  in the schema cache
    at unwrap (src/data/governance.ts:39:36)
    at loadGovernance (src/data/governance.ts:79:26)
    at loadMe (src/data/me.ts:188:26)
    at MePage (src/app/me/page.tsx:44:14)
```

This is a **pure bug fix** under [CLAUDE.md](../../CLAUDE.md)'s rule: no
documented behaviour changes, and it makes `src/data/me.ts`'s own header
comment actually true — *"Where a table is readable only by club officers…
a workspace gets an empty list rather than an error, and says so."*
`loadGovernance`'s two call sites inside `loadMe`, plus the third in
`CommitteeWorkspace.tsx`, violated exactly that stated design.

## Two separate things are true here, and only one is this initiative's

**The proximate cause is outside this repository's code.**
`committee_resolution` is a real, already-merged table — migration 0049,
landed with [scope 57](./57_the_committee_records_its_own_decisions.md) —
and `PGRST205` ("not in the schema cache") is PostgREST's own error for a
table its cache does not yet know about, not a code defect. The two usual
causes are the Supabase–GitHub integration not having run migration 0049
against the connected project yet, or PostgREST's schema cache needing a
reload (`NOTIFY pgrst, 'reload schema'`, or the "Reload schema" action in
the Supabase dashboard's API settings) after it did. **This initiative does
not and cannot fix that** — it has no credential to the linked Supabase
project in this environment, per
[the deployment doc](../ea/5_technology/2_deployment.md)'s own account of
where those live. Whoever holds the Supabase dashboard needs to check the
migration actually applied and, if it did, trigger a schema cache reload.

**What this initiative fixes is the blast radius.** Whatever the cause,
`/me` is a personal workspace whose main content — the player card, the
calendar, the referee appointments — has nothing to do with a committee
office. `loadGovernance` was called from two places in `loadMe` purely to
*label* a workspace tab, and a third time in `CommitteeWorkspace.tsx` to
*fill* it once added, and all three let a `QueryError` from any of
`committee_resolution`, `committee_term`, `committee_position`, `person`,
or `club_voucher_program_enablement` crash the entire page for the account
whose office it was trying to name. This is the same crash class found in
the messaging paths ([scope 60](./60_a_reminder_that_says_why_not_instead_of_crashing.md))
and the notification bell ([scope 58](./58_a_bell_for_the_referee_coordinator.md)'s
addendum): a read that exists to enrich or label a page taking the whole
page down when it fails, instead of the page rendering without it.

## Why the registrar governance screen is deliberately untouched

`src/app/registrar/governance/page.tsx` calls `loadGovernance` directly and
still throws on failure. That is correct, not an oversight: governance data
is the entire reason that screen exists, and an empty read there must mean
*nothing is recorded*, never *the query failed and this is what failure
happens to look like*. Silently showing "no committee" to an admin because
of an unrelated infrastructure fault would be actively misleading — worse
than the crash it would be hiding. `loadGovernanceOrEmpty` is named and
documented specifically to keep that distinction visible at each call site
rather than changing `loadGovernance`'s own contract.

## Fix

`loadGovernanceOrEmpty` (new, in `src/data/governance.ts`) wraps
`loadGovernance` in a `try`/`catch` and returns an empty `Governance` on any
failure. `src/data/me.ts`'s two call sites and
`src/app/me/_workspaces/CommitteeWorkspace.tsx`'s one now call it instead —
each already had a rendering path for "nothing recorded" (no committee
role gained, no term shown, "No committee term recorded" in the workspace
panel), so a read failure now lands on that same, already-correct path
rather than crashing.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change** |
| **2_business** | **No new rule and no changed rule.** A Person's committee office is exactly as derived as before; only what happens when the read fails changes |
| **3_information** | **No change.** No table, column or migration |
| **4_application** | `src/data/governance.ts` (`loadGovernanceOrEmpty`), `src/data/me.ts` (two call sites), `src/app/me/_workspaces/CommitteeWorkspace.tsx` (one call site) |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A `committee_resolution`/`committee_term`/`committee_position` read failure of any kind — a schema-cache miss, a transient fault — crashed `/me` outright for the account it was trying to label, and would crash `CommitteeWorkspace` again the moment they navigated to it |
| **Target** | The same failure renders the already-correct "nothing recorded" path on both. The registrar governance screen, where an empty read must mean something real, is unchanged |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | `loadGovernanceOrEmpty` in `src/data/governance.ts`, documented against exactly when to use it and when not to | **Delivered** |
| **WP2** | `src/data/me.ts`'s two `loadGovernance` call sites switched | **Delivered** |
| **WP3** | `CommitteeWorkspace.tsx`'s call site switched | **Delivered** |
| **WP4** | `npm run check` clean | **Delivered** |

## What this initiative does not do

- **Does not apply migration 0049 to any Supabase project**, and cannot —
  no credential to it exists in this environment. If `committee_resolution`
  is genuinely missing from the connected project's schema cache, that is
  an action for whoever holds the Supabase dashboard: confirm the migration
  ran, and reload the schema cache if it did.
- **Does not add an `error.tsx` boundary.** A boundary would soften a
  future, different crash from reaching a user as a raw stack trace; this
  fix is specific to the three call sites that had no business crashing the
  page in the first place.
- **Does not change `loadGovernance` itself**, or the registrar governance
  screen's behaviour on failure — deliberately, per the reasoning above.
- **No new business rule, no schema change**, so no RLS behaviour to
  re-verify — `scripts/test_rls.sh` was not re-run for this change, only
  `npm run check`.
