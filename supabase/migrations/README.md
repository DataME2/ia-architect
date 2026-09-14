# `supabase/migrations/`

_[← Repository README](../../README.md) · [Data objects](../../docs/ea/3_information/1_data-objects.md) · [Deployment](../../docs/ea/5_technology/2_deployment.md)_

## Purpose

The schema, the Row-Level Security policies, the triggers, and the
`security definer` functions — **and the place where most of this system's
rules are actually enforced.**

A rule stated only in `src/domain/` can explain itself to a registrar; a
rule stated here cannot be talked around. Where getting it wrong would cost
a child their eligibility, their privacy, or the club its money, the rule
lives in both.

## Three rules that are not negotiable

**1. Never edit a migration that has already been applied.** The repository
is connected to Supabase, so a migration merged to `main` runs against the
linked project **with no second confirmation**. That project is the
development one and there is no production environment yet — but it holds
the only copy of the data there is, so treat it as irreversible.
Corrections are new migrations.

**2. Never add a table without its RLS policy in the same change.**
Principle P5 is enforced by those policies, and a table without one is a
cross-tenant leak of children's data — which happens through an ordinary
omission, not through malice. `python3 scripts/check_rls.py` fails the build
for exactly this. It is a gate, not a lint.

**3. Never merge a schema change whose RLS test has not run.**
`check_rls.py` proves a policy *exists*.
[`../tests/`](../tests/README.md) proves it *works*. A policy can be present
and wrong, and that failure is silent until one club reads another's
records.

## Key dependencies

**Depends on:** nothing in this repository — these are applied in numeric
order to an empty database, and each must be valid against the state its
predecessors leave.

**Depended on by:** [`src/data/schema.ts`](../../src/data/README.md), whose
row types are written against these files **by hand** and kept true by hand;
every query in `src/data/`; and [`../tests/`](../tests/README.md), which
applies these exact files rather than a copy.

## Layout

Numbered `NNNN_snake_case_outcome.sql`, applied in order, never renumbered.
The next migration takes the next number.

| Range | Brought in |
| ----- | ---------- |
| `0001`–`0005` | The registration slice: schema, RLS policies, the submission pack manifest, and the account-free public registration link |
| `0006`–`0009` | Season requirements and roles, payment plans, vouchers and shared guardians, and the one creation path with person merging |
| `0010`–`0014` | Teams and clearances, match officials and governance, committee adults and card scans, the demonstration front door, prospect marketing consent |
| `0015`–`0019` | Club access management, platform administration, club contacts and claimed access, the club licence, first-sign-in password |
| `0020`–`0022` | The player record, the identification photograph, and the account↔Person link |
| `0023`–`0027` | The referee slice: record, availability, appointments, verification and fee schedules, claims and batches |
| `0028`–`0029` | Family access, and what a household may read |
| `0030` | Communications: who may be contacted, what was sent, and the withdrawal that stops it |
| `0035` | Calendar distribution: a revocable per-Person feed, and the projection behind it |
| `0036` | Reporting: three `security definer` summaries that compute the true total or refuse, because RLS hides rows and does not refuse sums |
| `0037` | A club's expression of interest: what the club *is* rather than one address, and the platform owner's first way to read the lead list at all |
| `0034` | Carnivals: the only deliberate exception to P5, made narrow by the tables having no person column |
| `0033` | Officiating interest: what a family declared at registration, and the review that turns a claim into a referee |
| `0032` | The competition catalogue: shared reference data, ranked classification levels, and the reference a fixture carries |
| `0031` | Privacy rights: the reasons a record must stay, erasure, retention proposed rather than executed, life membership, and the club's export |

**Each file opens with a banner** naming the number, the outcome in one
line, the scope document and work package, and what was settled and what was
rejected. A migration is immutable once applied, so that comment is the only
place its record can be corrected — see
[steering §2](../../docs/steering/2_code-commenting-and-documentation.md).

## Where the architecture lives

[`docs/ea/3_information/1_data-objects.md`](../../docs/ea/3_information/1_data-objects.md)
describes every table and what it realises;
[`docs/ea/5_technology/2_deployment.md`](../../docs/ea/5_technology/2_deployment.md)
describes where these run and against which project.
