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
| **Submission pack builder** | `src/domain/submission/` | Assembles, versions, freezes and serialises a pack (BR58, BR59); keeps *sent* and *registered* apart (BR60) in `status.ts`; CSV output in `serialise.ts` | **Delivered** |
| **Schema & RLS policies** | `supabase/migrations/0001_registration_slice.sql`, `0002_rls_policies.sql` | 13 tables, RLS enabled in the same migration that creates them, policies in the next | **Delivered** |
| **Policy coverage gate** | `scripts/check_rls.py` | Fails the build if any table lacks RLS, a policy, or a `club_id` — static analysis of the migration text | **Delivered** |
| **Tenant isolation test** | `scripts/test_rls.sh`, `supabase/tests/10_tenant_isolation.sql` | Applies the real migrations to a throwaway Postgres and asserts isolation **behaviourally** across 11 scenarios, as the `authenticated` role — owners bypass RLS, so a test run as `postgres` would pass regardless of how broken the policies were. Verified to fail on a loosened policy | **Delivered** |
| **Pack immutability test** | `supabase/tests/11_submission_pack.sql` | Nine scenarios proving BR58 holds in the database, not just in application code: a handover can be recorded once and never rewritten, a pack cannot be deleted, the manifest round-trips, an undefined submission state is refused, and another club sees none of it. Verified to fail when the handover policy is loosened | **Delivered** |
| **Configuration & clients** | `src/data/env.ts`, `src/data/client.ts` | Validated config, and three Supabase clients that differ in one way that matters — whether RLS applies. `createAdminClient(reason)` bypasses it, throws in a browser, and takes a reason from a closed set so every bypass is greppable | **Delivered** |
| **Registrar screens** | `src/app/registrar/` | The season queue grouped by what it is waiting on, a per-registration detail with every rule's outcome, BR55 legal-name verification, and BR5 duplicate candidates surfaced for a human | **Delivered** |
| **Family registration flow** | `src/app/register/` | The collect-once form: legal and preferred names kept apart, guardian required for a minor, the three consents recorded independently | **Delivered** |
| **Public registration link** | `src/app/join/[token]/`, `src/data/invitations.ts`, `src/web/invitation-view.ts` | A family registers with no account (BR72). The page shows nothing about the club or season — rendering either would turn a write-only link into a read of tenant data — and the token is checked by the database on submit | **Delivered** |
| **Invitation management** | `src/app/registrar/invitations/` | Issue, list and revoke links per season. The link is displayed **once** at issue and only its hash is stored, so it cannot be shown again (BR73) | **Delivered** |
| **Public write surface** | `supabase/migrations/0005_registration_invitations.sql` | One `security definer` function, `submit_public_registration`, with a pinned `search_path`. The tenant is **not an argument** — it comes from the invitation the token resolves to — and BR1/BR48 are enforced here because an anonymous caller can skip the form. See [decision 6](../../decisions/6_public-registration-through-a-scoped-function.md) | **Delivered** |
| **Public registration test** | `supabase/tests/12_public_registration.sql` | Eighteen scenarios as `anon`: a valid link writes only to its own club, an unknown/revoked/expired token is refused identically, the link reads nothing and cannot insert outside the function, and the token hash matches the one TypeScript computes. Verified to fail on a weakened function | **Delivered** |
| **Submission pack screens** | `src/app/registrar/pack/`, `src/data/packs.ts` | Preview of exactly what would be sent and who would be left out, versioned generation (BR58), handover recorded once against a named channel (BR59), CSV download served from the stored manifest, and per-person outcomes — the only route to `COMPLETE` (BR60) | **Delivered** |
| **View logic** | `src/web/` | The screens' decisions as pure, framework-free functions — form parsing, queue grouping, the blocker summary, timezone-correct "today", and the sign-in destination allowlist | **Delivered** |
| **Session & routing** | `src/app/sign-in/`, `src/proxy.ts` | Email/password sign-in, and the request proxy that refreshes the Supabase session so `auth.uid()` keeps resolving | **Delivered** |
| **Typed queries** | `src/data/queries.ts`, `src/data/schema.ts`, `src/data/mappers.ts`, `src/data/server.ts` | Request-scoped RLS-respecting clients, hand-written row types, and pure row→domain mappers | **Delivered** |

## Three structural rules for the code

**The rules engine holds no I/O and no framework.** Each business rule is a
pure function from a registration to a result carrying the rule's
identifier and its message. That makes BR1–BR5 unit-testable without a
database, and it makes the rule set the thing a reviewer can diff against
`5_domain-context-and-rules.md` — which is the only way sixty-eight rules
stay honest against the code.

**The same holds for the screens, and it is enforced rather than asked
for.** What a screen *decides* — which pile a registration belongs in, what
is wrong with a form, which rule is costing the club the most — lives in
`src/web/` as pure functions with no React and no request. The `.tsx` files
render those decisions and little else. `tsconfig.domain.json` typechecks
`src/domain/` and `src/web/` **with no DOM library**, so a `document.` or
`window.` reaching into either fails `npm run typecheck` instead of waiting
for a reviewer to notice. It is checked by proving it fails, not by
assuming it passes.

**Rule identifiers are the business rule numbers.** A `validation_result`
row records `BR55`, not `"legal name mismatch"`. The prose can be reworded;
the identifier is the join between the running system and the architecture,
and it is what makes a failure report readable against the EA documents
years later.
