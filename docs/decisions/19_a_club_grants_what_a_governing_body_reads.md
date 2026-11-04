# Decision 19 — A club grants what a governing body reads

_[← Decisions index](./README.md) · [scope 134](../scope/134_pitchpeople_financial_intelligence.md)_

**Status:** Accepted (4 November 2026). The direction was the product
owner's *Decision B*; they accepted Principle P8, which this decision
explains, the same day ([open question #121](../scope/open-questions.md)).
Who in a club decides a grant is still [open question #122](../scope/open-questions.md).
**Date:** 2026-11-04
**Touches:** [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md)
(P8), [2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)
(BR214, BR215), [2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md#external-actor)
(Governing Body Policy Administrator)

## Context

Financial Intelligence must serve governing bodies as well as clubs:
publishing a sanctioning policy, receiving an event application, and
receiving financial information a club chooses to report. Decision B says
governing bodies must **not** automatically gain access to club financial
records, and that access must be explicit, authorised, auditable and
limited to an agreed purpose.

P5 forbids one tenant's data being visible to another, and
[decision 3](./3_public-event-data-crosses-tenant-isolation.md) requires
every new exception to have its own record. [Open question #31](../scope/open-questions.md)
left an *association tier* — a tenant above its member clubs —
deliberately undesigned.

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| **An association tier**: the governing body as a parent tenant that sees its member clubs | Affiliation would *be* the grant, which is exactly what Decision B rules out. It also makes every club's money visible to whoever runs its competition, for every purpose at once |
| **Service-role reads** performed by the platform on the governing body's behalf | Bypasses RLS, so a missing check returns everything rather than nothing. The failure is silent and cross-tenant |
| **A generated financial return** — the club produces a file and hands it over, like a submission pack (BR58, BR59) | **Needs no P5 exception at all**: the club exports its own data. The right first step for event applications and periodic returns, and the fallback whenever a governing body has no account. It cannot answer a live question, and a file once sent is outside every control |
| **A club-made grant**: a named governing body may read named club-level categories, for a purpose and a period, through one function that checks the grant and logs every read | **Chosen for live access.** Narrow, revocable, auditable, and enforced in the database the way every other read is |

## Decision

Publishing a policy is **shared reference data** and crosses no boundary
([decision 15](./15_the_competition_catalogue_is_shared_reference_data.md)'s
settlement). Beyond that, a governing body receives a club's financial
information in one of two ways, and **affiliation grants neither**:

1. **A return the club sends** — a generated, minimised file (BR59), needing
   no exception. This comes first.
2. **A grant the club makes** — decided by committee resolution (BR123),
   naming the governing body, purpose, categories, period and expiry,
   revocable at once — and read only through `app_governing_body_read()`,
   which checks the grant on every call and logs every read (BR214).

Under neither does a governing body read a family's or a player's financial
records (BR215). Governing-body accounts hold no `club_membership`; they are
enumerated against their association, the way `platform_admin` enumerates
the platform's own operators ([decision 9](./9_platform_administration_provisions_but_never_reads.md)).

## Consequences

- P5 gains a second named exception, P8(a), accepted 4 November 2026.
  Nothing is built under it yet.
- Option 1 can ship in Release 3 without P8. Option 2 needs P8, an
  association-account model, and a behavioural suite proving that an
  ungranted, expired or revoked read returns nothing and that a family's
  rows are unreachable under any grant.
- A revocation stops future reads and cannot recall past ones — which is why
  the grant is narrow, not why the audit is thorough.
- The association *tenant* of open question #31 remains undesigned. This
  decision answers a smaller question, and does not pre-empt that one.
