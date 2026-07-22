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
  paid["Paid via<br>provider (Stripe)"]:::business
  reconcile["Reconciled"]:::business
  balance["Balance & guardian<br>notified"]:::business

  total --> plan --> installments --> paid --> reconcile --> balance

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
```

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
