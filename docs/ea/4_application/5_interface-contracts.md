# Interface Contracts

_[← Application layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Application Interface.

What each interface promises: its preconditions, postconditions,
invariants, and how it fails. **Opened November 2026 by
[scope 134](../../scope/134_pitchpeople_financial_intelligence.md), and every
contract here is Planned** — the shapes the code will be written against.
They are sketched in TypeScript for precision; the final signatures land
with the code, and this document changes in the same commit if they differ.

Two conventions hold for every contract below:

- **Money is `{ minor: number; currency: 'AUD' | 'NZD' }`**, an integer
  count of cents, never a float (the rule `src/web/money.ts` already states).
  An operation given two currencies **throws**; it never converts (BR200).
- **A pure function never reads a clock, a database or the network.** The
  as-at moment is a parameter, so the same inputs give the same output in a
  test and on a screen (BR143, BR209).

## `PaymentProviderAdapter`

`src/data/payments/provider.ts` — the port every provider implements
([decision 20](../../decisions/20_payments_through_a_provider_port_never_on_the_platform.md)).

```ts
type Capability = 'collect' | 'refund' | 'payout' | 'statement-import' | 'signed-events';

interface PaymentProviderAdapter {
  readonly provider: 'simulation' | 'square' | 'stripe' | 'bank-file-au' | 'bank-statement';
  readonly capabilities: ReadonlySet<Capability>;
  readonly currencies: ReadonlySet<'AUD' | 'NZD'>;

  createCollection?(request: CollectionRequest, idempotencyKey: string): Promise<ProviderHandle>;
  refund?(request: RefundRequest, idempotencyKey: string): Promise<ProviderHandle>;
  payout?(request: PayoutRequest, idempotencyKey: string): Promise<ProviderHandle>;
  verifyEvent?(rawBody: string, headers: Headers): VerifiedEvent | { refused: string };
  parseStatement?(file: Uint8Array): readonly ProviderTransactionInput[];
}
```

| | |
| - | - |
| **Preconditions** | Called only on the server. A method is called only if its capability is declared, and only with a currency the adapter declares. `idempotencyKey` is the platform's own record id (the charge, refund or claim), never a random value |
| **Postconditions** | A `ProviderHandle` carries the provider's reference and a status of `pending`, `succeeded` or `failed`. **Success here is not success of the money movement** — only a verified provider event or statement line confirms that (BR204, BR205) |
| **Invariants** | The adapter writes nothing to the database; the data layer records what it returns. It never receives or returns a card number, CVV or bank login (BR207). It reads its secrets from server-side configuration and never logs them |
| **Errors** | A provider refusal is a `failed` handle with the provider's reason. A network failure throws, and the caller retries with the **same** idempotency key, so a retry cannot double-charge |
| **The simulation adapter** | Declares `payout` only, returns `succeeded` with a `SIM-…` reference, and is refused in production once any real adapter is enabled there ([decision 16](../../decisions/16_the_platform_records_a_payout_a_provider_moves_it.md)) |

## `ingest_provider_event()`

A `security definer` SQL function — the only writer of `provider_event` and
`provider_transaction` (BR206).

| | |
| - | - |
| **Preconditions** | Called by the webhook route through `createAdminClient('provider-webhook')`, or by a statement import as the signed-in treasurer. The caller passes the provider, the provider's event id, the verification verdict, and the parsed transactions |
| **Postconditions** | Exactly one `provider_event` row per (provider, event id), recording *refused*, *duplicate* or *recorded*. On *recorded*, one `provider_transaction` per parsed line, in the same transaction |
| **Invariants** | The club is resolved from the `payment_provider_account` the event names, **never** from a parameter the caller chose. A refused event's body is not parsed. Nothing is updated in place: a later event about the same transaction is a new row |
| **Errors** | An unknown provider account is recorded as refused and returns success to the provider (so it stops retrying) — the exception is surfaced to the platform operator, not to the sender |

## `reconcile()`

`src/domain/reconciliation/match.ts` — pure (BR205).

```ts
function reconcile(
  clubRecords: readonly ClubMoneyRecord[],
  providerTransactions: readonly ProviderTransaction[],
): { matches: readonly Match[]; exceptions: readonly ReconciliationException[] };
```

| | |
| - | - |
| **Preconditions** | Both inputs belong to one club; the function asserts it and throws otherwise |
| **Postconditions** | Every input appears in exactly one match or exactly one exception |
| **Invariants** | A match requires equal currency and equal amount; the provider reference is tried first, then amount, currency and date within a configured window. **Ties are not broken by guessing**: two candidates for one record make an exception, not a match. Deterministic: input order does not change the output |
| **Errors** | None at run time beyond the one-club assertion — an unmatched item is a result, not an error |

## `eventEconomics()`

`src/domain/events/economics.ts` — pure (BR208, BR209, BR212). **Built**
([scope 135](../../scope/135_the_public_event_calculator.md)); the public event calculator calls it, and scope 134's
WP2 will call it unchanged.

```ts
function eventEconomics(
  lines: readonly BudgetLine[],   // revenue | expense; category; unit: fixed | perDay | perTeam |
                                  // perParticipant | perParticipantPerDay; participants: all | junior | senior;
                                  // amountCents; basis
  shape: EventShape,              // { days, teams, juniors, seniors }
  driver: 'participants' | 'teams',
  currency: Currency,
): EventFigures;                  // revenue, cost, surplus, line totals, by category, per participant,
                                  // breakEven, basis
```

| | |
| - | - |
| **Preconditions** | Amounts are whole, non-negative cents and counts whole, non-negative numbers; anything else **throws** rather than being rounded. One currency by construction: lines carry none, and the caller names it once |
| **Postconditions** | `breakEven` is *reached* at a whole count (0 when fixed income already covers fixed costs), *not reachable* when each extra participant or team costs at least what it brings in, or *needs* the teams or participants it depends on. Per-participant figures are absent, not zero, when nobody is entered. Expected and actual figures are **two calls** — one with what was planned, one with what happened — so they are never blended |
| **Invariants** | The basis is the weakest among lines that carry an amount: a surplus resting on one *assumption* is not a *published-policy* figure. The order of the lines changes nothing but `lineTotals`' order. A scenario is a call with a scaled shape (`scaleShape`); nothing is written. **The public event calculator calls exactly this function** (BR222), so a public estimate and a club's budget over the same lines cannot differ |

## `assessSanctioning()`

`src/domain/events/sanctioning.ts` — pure (BR210, BR211).

```ts
function assessSanctioning(
  policy: PolicyVersion,                  // source, jurisdiction, version, effective dates, status, rule lines
  event: { type: string; commercial: boolean; startsOn: string; endsOn: string;
           participants: { junior: number; senior: number }; jurisdiction: string },
): SanctioningResult;                     // charge, basis, the rule lines applied, or { notApplicable, why }
```

| | |
| - | - |
| **Preconditions** | One policy version; the caller chose it as the one in force on the event's dates |
| **Postconditions** | A result names the version and **every rule line it applied** with that line's contribution, so the charge can be explained line by line (C23). A version not *approved* yields basis *club assumption*, never *published policy* |
| **Invariants** | No amount is a literal in the function: every amount comes from the policy's rule lines (BR211). An exemption that applies yields a zero charge *and* the exemption that produced it |

## `forecast()` and `healthIndicators()`

`src/domain/finance/forecast.ts`, `src/domain/finance/health.ts` — pure
(BR220, BR221).

```ts
function forecast(
  inputs: { scheduled: readonly Installment[]; outstanding: readonly AgedBalance[];
            collectionHistory: readonly CollectionRate[] | null; eventBudgets: readonly BudgetLine[] },
  horizon: IsoDate,
  asAt: IsoInstant,
): { method: string; inputs: readonly string[]; horizon: IsoDate; asAt: IsoInstant;
     expectedReceipts: Money; expectedOutstanding: Money; expectedEventNet: Money;
     missing: readonly string[] };

function healthIndicators(figures: LedgerFigures, period: Period): readonly Indicator[];
```

| | |
| - | - |
| **Preconditions** | One club, one currency (else throws). The horizon is after `asAt` |
| **Postconditions** | `method` and `inputs` name exactly what was used; `missing` names any input that was absent (no history, no budgets) instead of substituting a value. Each indicator carries its formula, base, period, currency and as-at |
| **Invariants** | A forecast is never added to an actual figure. No indicator is a weighted sum of others, and there is no overall score |

## `suppressCohort()`

`src/domain/benchmarking/suppression.ts` — pure (BR217).

```ts
function suppressCohort(
  values: readonly number[],             // one club-level value per opted-in club, unlabelled
  rules: { minimumClubs: number; maximumShare: number },
): { published: true; value: number; cohortSize: number } | { published: false; reason: string };
```

| | |
| - | - |
| **Invariants** | Takes no club identifier and returns none. Publishes nothing below `minimumClubs`, or when any single value exceeds `maximumShare` of the total. Mirrored in SQL inside `app_run_benchmarks()`, with a test asserting the two agree |

## `app_governing_body_read()`

A `security definer` SQL function — the only route by which a governing
body reads a club's figures (BR214, BR215). **Within P8(a).**

| | |
| - | - |
| **Preconditions** | The caller is a governing-body account recorded for that association. A grant exists for this club, association, purpose and category, is not revoked, and covers the requested period |
| **Postconditions** | Returns club-level figures for the granted categories only, and writes one `governing_body_access_log` row in the same transaction |
| **Invariants** | Never returns a person, a family, a registration or a payment row (BR215). Never reachable through a table policy or a service-role client |
| **Errors** | No grant: raises, naming BR214, rather than returning an empty set — the same refuse-rather-than-under-count shape BR142 gives the reports |
