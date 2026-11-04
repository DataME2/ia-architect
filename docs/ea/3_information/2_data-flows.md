# Data Flows

_[← Information layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Data Object, Representation, Flow, Access.

How information moves between representations and across boundaries.
**Opened November 2026 by [scope 134](../../scope/134_pitchpeople_financial_intelligence.md)
and so far covers only the financial flows**; the flows of earlier slices
are described beside their [data objects](./1_data-objects.md). Every flow
below is **Pending** unless a row says otherwise.

Two boundaries matter more than any arrow: the **tenant boundary** (P5),
which only P6's published events and P8's grants and aggregates may
cross, and the **provider boundary**, across which money moves and the
platform receives only evidence of it (decisions
[16](../../decisions/16_the_platform_records_a_payout_a_provider_moves_it.md)
and [20](../../decisions/20_payments_through_a_provider_port_never_on_the_platform.md)).

## 1. From a charge to a balance

```mermaid
flowchart LR
  subgraph TENANT["One club (P5)"]
    price["«Data Object»<br>registration_price<br>(charge)"]:::application
    pay["«Data Object»<br>payment<br>(received, refunded)"]:::application
    relief["«Data Object»<br>payment, method voucher<br>(relief)"]:::application
    adj["«Data Object»<br>financial_adjustment<br>(proposed)"]:::application
    bal["«Data Object»<br>derived balance<br>(BR201)"]:::application
    report["«Data Object»<br>finance report<br>eight kinds (BR202)"]:::application
  end

  price -->|charged| bal
  pay -->|less received, plus refunded| bal
  relief -->|less relief| bal
  adj -->|less adjusted| bal
  bal -->|outstanding, overdue, credit| report
  price --> report
  pay --> report

  classDef application fill:#c2f0ff,stroke:#0288d1,color:#333
```

| | Today | Target |
| - | ----- | ------ |
| The balance | `registration.outstanding_amount_cents`, a typed running balance: moved by `app_record_payment` with each receipt (0103, which fixed a treasurer's payment leaving it unmoved) and overwritten by `setOutstandingAmount` | Derived from the four sources above, by one database function both the screens and the report call |
| *Collected* in the report | Every `payment` row, relief and adjustments included | *Received* (money only) apart from *relief*, *adjusted* and *refunded* |
| Currency | Implicit AUD everywhere | The club's recorded currency on every figure; no cross-currency arithmetic (BR200) |

## 2. A collection through a provider

```mermaid
flowchart LR
  family["«Business Actor»<br>Family"]:::business
  page["«Representation»<br>Provider's own<br>payment page"]:::technology
  hook["«Representation»<br>Signed webhook<br>(JSON)"]:::technology
  verify["«Application Function»<br>Verify signature,<br>deduplicate"]:::application
  ptx["«Data Object»<br>provider_transaction"]:::application
  match["«Application Function»<br>Reconcile (BR205)"]:::application
  rec["«Data Object»<br>payment_reconciliation"]:::application
  payment["«Data Object»<br>payment"]:::application

  family -->|card or bank details,<br>never to the platform| page
  page -->|reports| hook --> verify -->|once per event id| ptx --> match
  payment --> match --> rec

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
  classDef application fill:#c2f0ff,stroke:#0288d1,color:#333
  classDef technology fill:#c9e7b7,stroke:#558b2f,color:#333
```

The family's card or bank details travel **only to the provider** (BR207).
What returns is evidence: a provider reference, an amount, a currency, a
status, sometimes the payer's name and email. The webhook body is verified
before it is parsed (BR206) and kept as a `provider_event` for a short
period, while the parsed `provider_transaction` is kept for seven years from
the end of the financial year. A bank statement import takes the same path
from a file the treasurer uploads, with the file in place of the signature
as the evidence of origin.

Outbound — a referee batch, a referral payout — runs the other way through
the same port, and stays a **simulation** until a provider is approved and
tested.

## 3. An event's money

```mermaid
flowchart LR
  subgraph PUBLIC["Published (P6) — readable by anyone"]
    ev["«Data Object»<br>carnival_event,<br>entry, fixture"]:::application
  end
  subgraph HOST["Host club only (P5)"]
    budget["«Data Object»<br>event_budget,<br>event_budget_line"]:::application
    charge["«Data Object»<br>event_entry_charge"]:::application
    assess["«Data Object»<br>sanctioning_assessment"]:::application
    calc["«Application Function»<br>Profitability (BR209),<br>pure"]:::application
  end
  subgraph REF["Shared reference data"]
    pol["«Data Object»<br>financial_policy_version"]:::application
  end

  ev -->|keyed by event id| budget
  ev --> charge
  pol -->|version in force| assess
  assess --> budget
  charge --> budget
  budget --> calc

  classDef application fill:#c2f0ff,stroke:#0288d1,color:#333
```

**The arrow that must never exist runs from HOST to PUBLIC.** The public
policy on the carnival tables publishes every column of a published event,
so a budget figure on those tables would be published with the draw. The
financial tables reference the event; the event references none of them,
and a test asserts that no financial column appears on the three public
tables — the same assertion BR139's test makes for `person_id`.

## 4. A governing body: policies in, granted reports out

```mermaid
flowchart LR
  gb["«Business Actor»<br>Governing body"]:::business
  pol["«Data Object»<br>financial_policy_version,<br>transparency_report<br>(reference)"]:::application
  club["«Data Object»<br>A club's<br>club-level figures"]:::application
  grant["«Data Object»<br>governing_body_access_grant"]:::application
  fn["«Application Function»<br>Scoped read, checks<br>the grant every call"]:::application
  log["«Data Object»<br>governing_body_access_log"]:::application

  gb -->|publishes| pol
  pol -->|read by every club| club
  club --> fn
  grant -->|purpose, categories,<br>period, expiry| fn
  fn -->|club-level only (BR215)| gb
  fn --> log

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
  classDef application fill:#c2f0ff,stroke:#0288d1,color:#333
```

Inbound is reference data and crosses no tenant boundary. Outbound is the
P8 exception, and only through the function, which refuses a read with no
live grant and writes the log in the same transaction. **Permitted by P8.**

## 5. Benchmarking

```mermaid
flowchart LR
  subgraph EACH["Each opted-in club (P5)"]
    figs["«Data Object»<br>Derived figures"]:::application
    metric["«Application Function»<br>Club-level metric"]:::application
  end
  consent["«Data Object»<br>benchmarking_consent"]:::application
  agg["«Application Function»<br>Aggregate, then apply<br>cohort and dominance rules"]:::application
  out["«Data Object»<br>aggregated_financial_metric<br>(no club identifier)"]:::application

  figs --> metric -->|one value per club| agg
  consent -->|only opted-in clubs,<br>only chosen categories| agg
  agg -->|published or suppressed| out

  classDef application fill:#c2f0ff,stroke:#0288d1,color:#333
```

No row leaves a club: only a club-level value, computed by the same
functions the club's own dashboards use, and only for a club with a live
consent. The aggregate keeps the cohort's size and never its members.
**Permitted by P8.**

## 6. The Assistant

Figures flow **to** the Assistant, already computed and labelled with their
basis, period, currency and as-at moment; a draft flows **from** it to a
person, who uses or dismisses it (`AssistantNote.tsx`). Nothing flows from
the Assistant into a financial table (BR218). No family-level or
minor-level financial data reaches an uncontrolled AI service (P4), and
today no model is called at all (`scripts/check_assistant.py`).

## 7. Forecasts and health indicators

Read-only, and computed rather than kept. The same derived figures the
dashboards show (flow 1) feed `src/domain/finance/forecast.ts` and
`health.ts`, together with the instalments still due under live plans, the
club's own collection history by age of debt (live seasons and imported
ones alike, scope 132), and approved event budgets (flow 3). What comes out
carries its method, inputs, horizon and as-at moment, and **nothing flows
back**: a forecast never becomes a stored figure (BR220), and an indicator
never becomes a grade (BR221).

