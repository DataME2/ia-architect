# Business Processes

_[← Business layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Business Process.

Each process below realizes the business service of the same theme in
[2_business-services.md](./2_business-services.md). All are
**Pending — future initiative** (see that document's note on grounding).

## Player registration process

```mermaid
flowchart LR
  create["Create or reuse<br>an existing Person"]:::business
  register["Register for<br>the season"]:::business
  review["Registrar reviews<br>documents & fields"]:::business
  pay["Payment plan<br>selected & started"]:::business
  complete["Registration<br>COMPLETE"]:::business

  create --> register --> review --> pay --> complete

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
```

Registration status moves through:
`DRAFT → SUBMITTED → UNDER_REVIEW → (MISSING_INFORMATION | PENDING_PAYMENT
| PENDING_DOCUMENTS | PENDING_EXTERNAL_REGISTRATION) → COMPLETE`, with
`REJECTED`, `WITHDRAWN`, and `CANCELLED` as terminal exits. The Compliance
& data quality service (deterministic rules,
[2_business-services.md](./2_business-services.md)) evaluates every
transition; the Assistant may draft an explanation of what's missing but
never changes the status itself (Principle P3).

## Payment plan process

```mermaid
flowchart LR
  total["Registration<br>total"]:::business
  plan["Payment plan<br>selected"]:::business
  installments["Installments<br>created"]:::business
  paid["Paid via<br>provider (Square)"]:::business
  reconcile["Reconciled"]:::business
  balance["Balance & guardian<br>notified"]:::business

  total --> plan --> installments --> paid --> reconcile --> balance

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
```

## Voucher program enablement process

```mermaid
flowchart LR
  publish["State government publishes<br>a Voucher Program<br>for the season"]:::business
  propose["Finance Admin proposes<br>enabling it for the club"]:::business
  approve["Committee<br>approves"]:::business
  enabled["Program enabled<br>for the club"]:::business

  publish --> propose --> approve --> enabled

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
```

A Voucher Program (see
[4_business-objects.md](./4_business-objects.md#player-registration--finance))
only becomes available to reduce a family's invoice once the club's
Committee approves it — a Club governance decision, the same concern
already held by the **Committee Member** role
([1_business-actors-and-roles.md](./1_business-actors-and-roles.md)). A
program the Committee has not (yet) approved is simply unavailable; it
does not block or change any registration or payment plan already in
progress (BR21,
[5_domain-context-and-rules.md](./5_domain-context-and-rules.md)). New
Zealand has no equivalent nationwide government voucher; comparable
alternative funding (Tū Manawa Active Aotearoa, local council grants,
gaming/philanthropic trusts) runs through the existing Grants Committee
Member / Grants Coordinator roles instead of this process. Once a
program is enabled, applying a specific Voucher to a specific Player's
invoice, and claiming its value back from government, is the [Voucher
application and claim process](#voucher-application-and-claim-process)
below.

## Voucher application and claim process

```mermaid
flowchart LR
  verify["Voucher code verified<br>(Assistant, advisory, or<br>Finance Admin/Treasurer)"]:::business
  apply["Finance Admin or Treasurer<br>applies the Voucher<br>to the invoice"]:::business
  claim["Voucher Claim submitted<br>to the issuing government"]:::business
  paid["Government pays<br>the club"]:::business
  reconcile["Reconciled"]:::business

  verify --> apply --> claim --> paid --> reconcile

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
```

A Voucher can only be applied once its code is verified (BR25) against
the issuing government's own public verification interface and the
result recorded — the Assistant (AI actor) may perform this check and
surface the result, but it is advisory only; it never decides whether the
Voucher is applied (Principle P3, decision
[2](../../decisions/2_ai-voucher-code-verification.md)). Only Finance
Admin or Treasurer may then generate the Voucher's application to the
invoice (BR22) — separating the Committee's program-level approval
([Voucher program enablement process](#voucher-program-enablement-process),
BR21) from who actually executes it financially. Applying a Voucher
creates a Voucher Claim the club submits to the issuing government for
reimbursement, through that program's own CSV/portal mechanism — no state
program currently exposes a general claims API at the pilot club's scale
(see the voucher-program claim mechanisms resource in
[1_strategy/2_capabilities-and-resources.md](../1_strategy/2_capabilities-and-resources.md)).
BR23 and BR24 prevent claiming a Voucher that was never applied, or
claiming the same Voucher twice.

## Season competition setup process

```mermaid
flowchart LR
  publish["Governing Body publishes<br>competition structure<br>& season calendar"]:::business
  enter["Club enters team(s) into<br>competition(s) for the season"]:::business
  calendar["Match calendar<br>populated"]:::business
  ready["Matches available for<br>referee appointment"]:::business

  publish --> enter --> calendar --> ready

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
```

The Governing Body / Association publishes competition structure (tiers,
format) and the season calendar for its jurisdiction — read-only, like
every other external source (Principle P2,
[1_strategy/1_motivation.md](../1_strategy/README.md)). Until a live feed
per association is confirmed (see
[open question #19](../../scope/open-questions.md)), entry is manual or
CSV-based, the same pattern as SQUADI/PlayFootball. This process is what
populates the Match objects the Referee appointment process below
designates referees to.

## Referee appointment process

```mermaid
flowchart LR
  avail["Referee declares<br>availability"]:::business
  eligible["Eligibility &<br>conflict check"]:::business
  propose["Coordinator proposes<br>designation"]:::business
  respond["Referee accepts<br>or declines"]:::business
  play["Match played"]:::business
  verify["Post-match<br>verification"]:::business
  pay["Payment<br>enabled"]:::business

  avail --> eligible --> propose --> respond --> play --> verify --> pay

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
```

A designation can only be proposed against a Match already in the club's
Competition Calendar (see [Season competition setup
process](#season-competition-setup-process) above, and BR20 in
[5_domain-context-and-rules.md](./5_domain-context-and-rules.md)).
Eligibility/conflict checks (deterministic, before any designation is
proposed) block on: the referee playing in one of the two teams, a second
simultaneous designation, insufficient classification, an active
suspension, or an expired mandatory accreditation. They warn (but don't
block) on: same-club affiliation, a family relationship with a participant,
limited travel time between matches, and excessive consecutive matches.
Every exception is audited. See
[5_domain-context-and-rules.md](./5_domain-context-and-rules.md) for the
full rule table.

## Referee payment process

```mermaid
flowchart LR
  verified["Match<br>verified"]:::business
  rate["Fee rate<br>identified"]:::business
  claim["Claim<br>generated"]:::business
  exceptions["Exceptions<br>reviewed"]:::business
  approve["Treasurer<br>approves"]:::business
  batch["Payment<br>batch"]:::business
  paid["Paid &<br>remittance issued"]:::business

  verified --> rate --> claim --> exceptions --> approve --> batch --> paid

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
```

## Historical data consolidation process

```mermaid
flowchart LR
  sources["Club's existing<br>sources (read-only)"]:::business
  raw["RAW"]:::business
  staging["STAGING"]:::business
  unified["Unified<br>Person-centric model"]:::business
  rules["Quality rules<br>applied"]:::business
  dashboards["Dashboards &<br>workflows"]:::business

  sources -->|read-only extraction| raw --> staging --> unified --> rules --> dashboards

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
```

The extraction account is granted `SELECT`/`READ` only — never
`INSERT`/`UPDATE`/`DELETE`/`DROP`/`ALTER` — for the pilot club's source
systems (Principle P2,
[1_strategy/1_motivation.md](../1_strategy/README.md)).
