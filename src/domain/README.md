# `src/domain/`

_[← Repository README](../../README.md) · [Application components](../../docs/ea/4_application/2_application-components.md) · [Business rules](../../docs/ea/2_business/5_domain-context-and-rules.md)_

## Purpose

The business rules, as **pure, I/O-free functions**. Every rule the club is
held to — a minor needs a guardian, nothing outstanding, no clearance no
start, instalments that sum exactly — is a function from a value to an
outcome carrying the rule's identifier.

That makes each rule unit-testable without a database, and it makes the rule
set the thing a reviewer can diff against
[`5_domain-context-and-rules.md`](../../docs/ea/2_business/5_domain-context-and-rules.md).
With 126 rules, that diff is the only mechanism by which the documentation
and the code stay honest with each other.

**What does not live here:** anything that reads, writes, renders, or knows
what a request is. A rule that needs data takes it as an argument.

## Key dependencies

**Depends on:** nothing. No React, no Supabase client, no Node built-in that
touches the outside world — the standard library and the other modules in
this directory.

**Depended on by:** [`src/web/`](../web/README.md) (which composes rule
outcomes into what a screen shows), [`src/data/`](../data/README.md) (whose
mappers produce these types), and `src/app/` (which renders the results).

**The constraint that makes this work is enforced, not requested.**
`npm run typecheck` runs `tsc` twice, and the second pass uses
[`tsconfig.domain.json`](../../tsconfig.domain.json), which compiles this
directory and `src/web/` **with no DOM library**. A `document.` or `window.`
reaching in here fails the build. Importing React or `@supabase/supabase-js`
is equally out of bounds — the point is that a rule can be evaluated in a
test, in a server action, or one day in a background job, without any of
them being present.

## Layout

| Path | Holds |
| ---- | ----- |
| `types.ts` | `Person`, `LegalName`, `Guardianship`, `Consent`, `Registration`, and the age/minority helpers (P1, BR55) |
| `rules/` | The registration rules — BR1, BR2, BR3, BR48, BR55 — each in its own `br<n>-<name>.ts`, plus the registry and evaluator in `index.ts` and the derived status in `registration-status.ts` |
| `finance/` | Cent-exact payment plans (BR74, BR76), oldest-first allocation, vouchers (BR81), and the no-pay-no-play verdict (BR79) asked fresh every time and never stored |
| `identity/` | BR5 duplicate candidates — for a human to confirm, never an automatic merge. Matching runs over a **date-of-birth index**, which is the rule read as an index rather than an approximation of it: both of BR5's bases already require the dates to agree, so people born on different days are work with a known answer (NFR-16) |
| `officiating/` | Appointment conflicts (BR6–BR11, BR109, BR111) and fee resolution (BR115, BR116). BR8 compares only a **sighted** classification (BR138) — an unchecked level is reported as unchecked, never as the level it states |
| `teams/` | Whether a Person may hold a team role, given their clearance (BR83, BR84, BR54) |
| `governance/` | Committee terms, and whether a mandate has lapsed (BR85–BR87) |
| `performance/` | A player's season record, and what a statistic is honestly worth (BR101–BR104) |
| `submission/` | Assembling, versioning, freezing and serialising a submission pack (BR58–BR60) |
| `calendar/` | RFC 5545 serialisation (BR30–BR34). Pure because the output is read by Google and Apple rather than by a person — a mistake there does not look wrong, it looks like a calendar that silently duplicates every event |
| `carnival/` | The ladder and each team's next unplayed fixture (BR26). Pure, and literally so: this is the one thing four hundred strangers read on a phone at a ground, with no registrar to notice a mistake first |
| `competition/` | The catalogue as the domain sees it, and **BR8's verdict** (BR134, BR135). Four outcomes rather than two, because *cannot judge* is a real answer |
| `privacy/` | Erasure and retention (BR40, BR49, BR52, BR69–BR71). One vocabulary of reasons a record must stay, read from both directions — an erasure asks about one Person, a review asks about all of them |
| `messaging/` | What a message says, who it goes to, and whether it may be sent (BR127–BR131). The suppression verdict lives here rather than at the email provider, which is BR129. `platform-alert.ts` sits beside the templates and is deliberately **not** one: an operator alert has no club and no unsubscribe, so it cannot satisfy `TemplateContext` — BR146 expressed as a type rather than as a comment |
| `reporting/` | The shaping and the arithmetic behind the three summaries (BR142, BR143). A report is `ready` **or** `refused` — a refusal is a value the screen renders, never an absent number — and a proportion over a zero base has no percentage at all, because *0 of 0 is 100% complete* is arithmetically defensible and operationally a lie |
| `test-fixtures.ts` | Shared builders, so a test states only what it is actually about |

Tests sit beside the code they exercise as `*.test.ts` and run with
`npm test` — no build step, no database.

## Where the architecture lives

[`docs/ea/4_application/2_application-components.md`](../../docs/ea/4_application/2_application-components.md)
maps each component here to what it provides.
[`docs/ea/2_business/5_domain-context-and-rules.md`](../../docs/ea/2_business/5_domain-context-and-rules.md)
is the rule set itself — **a new rule gets a row there, with its rationale,
before it gets a file here.**
