# Decision 21 — Benchmarking is opt-in, and never identifies a club

_[← Decisions index](./README.md) · [scope 134](../scope/134_pitchpeople_financial_intelligence.md)_

**Status:** Proposed. The direction was approved by the product owner on
4 November 2026 (scope 134's *Decision D*); the thresholds and Principle P8's
wording await review.
**Date:** 2026-11-04
**Touches:** [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md)
(P8, proposed), [2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)
(BR217), [3_information/3_data-architecture.md](../ea/3_information/3_data-architecture.md)
(the *Aggregated — non-identifying* class)

## Context

Decision D asks for a future benchmarking capability over anonymised,
aggregated financial data: voluntary, opt-in, with privacy controls,
aggregation thresholds and small-cohort suppression, and never a way around
tenant isolation. A figure computed across clubs crosses P5 by definition,
so it needs its own record (decision 3's rule). The market is small — a
handful of clubs per region at first — which is exactly where aggregates
leak.

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| **On by default, anonymised** | A club's figures would leave its tenant without its decision. And anonymising does not protect a cohort of two, where each member can subtract itself |
| **Clubs share figures with each other by consent** | A disclosure of one club's data to another, which Decision D excludes |
| **Differential privacy** (calibrated noise on every figure) | The principled answer at scale, and useless at this one: the noise that protects a five-club cohort swamps the signal. Revisit when cohorts number in the dozens |
| **Opt-in aggregates with cohort-size and dominance suppression**, medians and quartiles only | **Chosen.** Understandable to a committee, enforceable by a pure function, and honest about when there is not enough data to say anything |

## Decision

Benchmarking is off for every club until its committee resolves to opt in,
naming the metric categories it contributes; it may opt out at any time, and
no later aggregate includes it. Each contributing club's value is computed
inside its own tenant by the functions its own dashboards use, and only that
value leaves. A cohort figure is published only when at least the minimum
number of clubs contributes and none dominates it, as medians and quartiles,
**never a minimum or maximum** (each is one club's figure); otherwise it is
shown as suppressed. The result carries no club identifier and no list of
contributors (BR217). **Proposed thresholds:** at least **five** clubs, and
no club more than **half** of a summed metric's total
([open question #130](../scope/open-questions.md)).

## Consequences

- P5 gains P8(b) once accepted; until then nothing is built against this.
- In early markets many cohorts will be suppressed. That is the design
  working: an empty comparison is better than an identifying one, and the
  screen says why.
- `aggregated_financial_metric` becomes the second finance table with no
  `club_id`, and needs a `check_rls.py` exemption argued, as decision 15
  argued the catalogue's, from the absence of any column that could carry a
  club's data.
- A privacy review of the thresholds before launch is a precondition, not an
  improvement.
