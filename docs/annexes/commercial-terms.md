# Annex — Commercial Terms

_[← Annexes](./README.md) · [EA home](../ea/README.md)_

The commercial model and the terms a club agrees to. Realises the support
tiers and pricing recorded in
[scope document 16](../scope/16_stakeholder-answers-august-2026.md), and
**BR68** on data ownership.

> **Not legal advice.** This is a plain-English statement of the commercial
> position, drafted so the architecture and the contract say the same
> thing. It needs a lawyer's pass before a club signs it.

## 1. Pricing

| | Amount | Covers |
| - | ------ | ------ |
| **Year one** | **A$12,000** | Onboarding, migration from the club's existing system, configuration, and the first twelve months of the subscription — with **Platinum support included** |
| **Each year after** | **A$5,500** | The recurring subscription |

**Year one is not the recurring price.** It is a foundation-client figure
carrying one-off work — migration, configuration, and the hands-on setup a
first club needs — that does not recur. Stating the two separately is
deliberate: a club that reads A$12,000 as the annual price will not renew,
and a club that reads A$5,500 as the whole cost will be surprised at
signing.

### The underlying per-participant basis

The recurring figure is derived from **A$5 per registered player** and
**A$10 per non-player role** per season. For the pilot club — roughly 800
players and around 130 coaches, officials, volunteers, and committee
members — that lands near A$5,500.

**This basis is recorded as the working model, not as settled for every
club** ([open question #48](../scope/open-questions.md)). Two structural
notes travel with it:

- **Charging more for administrative roles than for players prices the
  wrong people.** Coaches, registrars, and treasurers are the users who do
  the work the platform removes and who make it stick. A per-head charge on
  them is an incentive to share one login, which is worse for the club and
  worse for renewal. Charging on players alone — the number that tracks the
  club's own revenue — is the alternative worth modelling.
- **A pure per-participant fee makes small clubs unprofitable to serve.** A
  150-player club would pay under A$1,000, which will not cover onboarding
  or a season of support. A **minimum annual fee** keeps the model simple
  without abandoning them.

### Context worth having in the sales conversation

A$5 per player is roughly **1–2% of a family's registration fee**. Clubs
routinely pass platform costs through, so the per-family impact is smaller
than a single match-day coffee. That framing is more useful than the annual
total, which sounds large to a volunteer treasurer reading a committee
paper.

## 2. Support

| Tier | What it is | Response |
| ---- | ---------- | -------- |
| **Standard** | Full online documentation, plus a channel for questions and comments | **Within 36 hours** |
| **Platinum** | Paid tier, included in year one | As soon as received |

**Platinum's cost is people, not software.** "As soon as received", during
registration season, across volunteer-run clubs who work evenings and
weekends, is an availability promise rather than a feature. Before it is
sold to a second club it needs a **stated coverage window** — the hours and
days within which "as soon as received" applies — or its cost cannot be
predicted ([#48](../scope/open-questions.md)).

## 3. The club's data

Restating **BR68** in the terms a club signs:

- **The club owns its data.** Let'sDataTalk holds it as a processor on the
  club's behalf and never as owner. Under the Australian Privacy Principles
  the club remains the entity accountable to its members for their personal
  information.
- **Export on demand.** The club may export its complete data in a usable
  format at any time, **at no charge and with no notice period**. This is
  not a termination right — it applies during the relationship, not only at
  the end of it.
- **Deletion on exit.** When the relationship ends the club may require
  deletion of its data, subject only to records Let'sDataTalk must retain
  under law.
- **No hostage clauses.** No fee, delay, or contractual condition attaches
  to leaving. The product is sold on displacing an incumbent
  ([decision 5](../decisions/5_replace-the-incumbent-rather-than-integrate.md)),
  and a lock-in clause would argue against its own pitch.

## 4. Privacy responsibilities

- The **club** decides what personal information it collects and why, holds
  the relationship with families, and answers to them. The consent wording
  it uses is its own — the platform supplies a
  [draft](./consent-wording.md), not an obligation.
- **Let'sDataTalk** processes that information only on the club's
  instructions and only for the purposes of providing the service. It does
  not sell, share, or use one club's data for another's benefit — Principle
  **P5** is the architectural form of that promise.
- **Minors' data is never sent to uncontrolled AI services** (Principle
  **P4**), and the AI assistant never takes a decision with effect
  ([decision 1](../decisions/1_ai-assistant-autonomy-level.md)).
- **Retention** follows the club's own policy, configured per tenant
  (**BR52**), against the schedule in the
  [retention annex](./retention-schedule.md) once it is legally confirmed
  ([#30](../scope/open-questions.md)).

## 5. What the platform does not promise

Stated plainly, because each of these is a thing a club could reasonably
assume and be wrong about:

- **It does not register players with Football Queensland.** The federation
  confers eligibility; the platform prepares and submits, and *sending is
  not registering* (**BR60**). A player is eligible when Squadi says so.
- **It does not replace Squadi.** Affiliated clubs are required to use it,
  and nothing here changes that.
- **It does not provide legal, tax, or compliance advice.** The
  deterministic rules encode the club's own policy and the requirements it
  states; they are not a compliance certification.
- **Carnival and event management is not in the first release** — it is
  architected and deferred.

## 6. Term and renewal

- **Initial term:** twelve months from go-live.
- **Renewal:** annual, at the recurring rate then current, with fee changes
  notified at least **60 days** before renewal so a committee has time to
  consider them within its own meeting cycle.
- **Termination:** either party may decline renewal. The club's export and
  deletion rights under §3 apply regardless of why the relationship ends.

## Still to settle before a second club signs

- The recurring model beyond the pilot — flat, banded by club size, or per
  participant — and whether administrative roles are charged at all
  ([#48](../scope/open-questions.md)).
- The minimum annual fee.
- Platinum's coverage window.
- Retention periods, pending the legal review ([#30](../scope/open-questions.md)).
