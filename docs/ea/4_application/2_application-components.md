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
| **Domain model** | `src/domain/types.ts` | `Person`, `LegalName`, `Guardianship`, `Consent`, `Registration`, and the age/minority helpers | **Delivered** |
| **Rules engine** | `src/domain/rules/` | BR1, BR2, BR3, BR48, BR55 as individually testable pure functions, plus the registry and evaluator in `index.ts` | **Delivered** |
| **Duplicate detection** | `src/domain/identity/br5-duplicate-candidates.ts` | BR5 — candidates for human confirmation, never an automatic merge | **Delivered** |
| **Schema & RLS policies** | `supabase/migrations/0001_registration_slice.sql`, `0002_rls_policies.sql` | 13 tables, RLS enabled in the same migration that creates them, policies in the next | **Delivered** |
| **Policy coverage gate** | `scripts/check_rls.py` | Fails the build if any table lacks RLS, a policy, or a `club_id` | **Delivered** |
| **Web application** | `src/app/` (Next.js App Router) | Registrar screens and the family-facing registration flow | Planned |
| **Data access** | `src/data/` | Supabase client, typed queries, generated schema types | Planned |
| **Submission pack builder** | `src/domain/submission/` | Assembles, versions, and serialises a pack (BR58, BR59) | Planned |

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
