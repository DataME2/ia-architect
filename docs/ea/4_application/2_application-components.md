# Application Components

_[← Application layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Application Component, Application Interface.

The components providing the
[application services](./1_application-services.md), each mapped to where
it lives in the source tree.

> **Grounding rule.** Every row points at the module that implements it.
> Rows marked *planned* have no code yet — they are the build list for
> [scope document 17](../../scope/17_mvp-registration-slice.md), and each
> becomes a real path as it lands.

## Components

| Component | Source | Provides | Status |
| --------- | ------ | -------- | ------ |
| **Web application** | `src/app/` (Next.js App Router) | Registrar screens and the family-facing registration flow | Planned |
| **Domain model** | `src/domain/` | `Person`, `Registration`, `Consent`, `SubmissionPack` as types and pure functions — no I/O | Planned |
| **Rules engine** | `src/domain/rules/` | BR1–BR5, BR55 as individually testable predicates returning a result, not a boolean | Planned |
| **Data access** | `src/data/` | Supabase client, typed queries, generated schema types | Planned |
| **Submission pack builder** | `src/domain/submission/` | Assembles, versions, and serialises a pack (BR58, BR59) | Planned |
| **Migrations & RLS policies** | `supabase/migrations/` | Schema, and the Row-Level Security policy per table that enforces P5 | Planned |
| **Policy coverage check** | `scripts/check_rls.*` | Fails CI if any table has no RLS policy — a table without one is a cross-tenant leak, so this is a build gate rather than a review item | Planned |

## Two structural rules for the code

**The rules engine holds no I/O and no framework.** Each business rule is a
pure function from a registration to a result carrying the rule's
identifier and its message. That makes BR1–BR5 unit-testable without a
database, and it makes the rule set the thing a reviewer can diff against
`5_domain-context-and-rules.md` — which is the only way sixty-eight rules
stay honest against the code.

**Rule identifiers are the business rule numbers.** A `validation_result`
row records `BR55`, not `"legal name mismatch"`. The prose can be reworded;
the identifier is the join between the running system and the architecture,
and it is what makes a failure report readable against the EA documents
years later.
