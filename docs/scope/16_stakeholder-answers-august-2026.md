# Project Scope — Stakeholder Answers, August 2026

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

A third answering round, worked through the pending ledger question by
question. **Eleven questions resolved, four partially answered or
reframed, one new one raised** — the largest single reduction in open
questions the project has had.

Restates **BR40** and **BR41**, adds **BR67**, and records the commercial
and market-entry decisions. No application code is written.

## The eleven closed

| # | Answer |
| - | ------ |
| **1** | **There is no single referee rate table.** Each club's Committee sets its own, so the values are per-tenant configuration authored by a club role. The question dissolves rather than resolves — BR41 now says the platform ships a fee-schedule *editor* |
| **16** | **Two support tiers.** Standard: full online documentation plus a question channel answered within **36 hours**. **Platinum**: paid, answered as soon as received |
| **17** | **A$12,000 first-year contract, Platinum included.** The renewal model is carried forward as [#48](./open-questions.md) |
| **22** | **Carnivals are MiniRoos only**, averaging **80–90 registered teams** — no adult or open-age formats. That bounds C12 considerably |
| **27** | **Yes**, the March 2019 ITC guide is still current. BR35–BR38 stand |
| **31** | **Yes, pursue the association tier** — and the first move is a **listening session**, not a proposal |
| **34** | **No**, SQUADI's FA ID column has not reappeared. BR44's no-shared-key assumption holds |
| **36** | **GDPR is a voluntary design standard**, confirmed. BR49 knowingly exceeds AU/NZ law |
| **37** | **18**, across every right — and **BR67** adds the transfer of control that the threshold alone does not give |
| **41** | **Let'sDataTalk is founder-owned**; any club, or Football Queensland itself, could become **partner or investor** |
| **45** | **Yes**, Majestri supports bulk export — which makes decision 5's displacement strategy executable |

## Three answers worth more than their question

**#41 reframes the whole Football Queensland problem.** Partner status has
been treated throughout as a permission to be *requested* — and requested
once already, and declined. If the platform can take investment or offer
partnership, the same relationship becomes something to be *offered*.
That is a different conversation with a different power balance, and it is
why [#31](./open-questions.md)'s listening session is the sensible opening
rather than a second access request.

**#45 is what makes decision 5 real.** Replacing Majestri was recorded as
the positioning, with a flagged risk that every sale is a mid-season
migration and nobody knew whether the data could get out. It can. The
displacement strategy now has a route rather than an assumption.

**#37's answer needed a rule, not just a number.** Setting the age at 18 is
the easy half; the handover is what breaks. Without an explicit transition
a guardian keeps receiving a nineteen-year-old's match schedule and
answering on their behalf, and neither party notices. **BR67** makes the
eighteenth birthday a recorded, notified transfer of consent authority,
erasure rights, the calendar feed, the mobile account, and publicity
consent — and gives an audit point for who held authority when a past
consent was given.

## The correction: an answer landed on a different question

The round answered a **retention** question in the slot where the
**baseline decomposition** question was asked. Both are recorded where
they belong, and the distinction matters because one of them still gates
work:

- **[#30](./open-questions.md) — retention — moved, and got sharper.**
  BR40 is restated from a flat three years to **status-based**: at least
  ten years for a Person still active in football (including at another
  club), a maximum of two years for one who has stopped, archived
  annually.
- **[#32](./open-questions.md) — the decomposition — did not move.** The
  proportion of the *weeks* attributable to removable guardian confusion
  versus association processing, payment clearing, or the ITC window is
  still unknown. **Stage 1 still has no numeric target**, and the
  measurement still needs nothing but three years of data the club already
  holds.

## BR40's restatement carries a risk that grew, not shrank

Status-based retention is a better rule than a flat clock and closer to how
a club actually thinks. But it creates two tensions the flat rule did not:

- **The ten-year floor collides with BR49.** An erasure request from an
  active player must now be refused on a named basis for up to a decade —
  which BR49 already supports, but it makes the refusal path the common
  case rather than the exception.
- **The two-year ceiling is the real risk, and it points the opposite way
  from before.** Previously the concern was that three years might be too
  *short* for some record classes. Now there is an explicit **maximum** of
  two years for an inactive person, and Australian financial and tax
  minimums, along with child-safety records tied to a WWCC, commonly
  require substantially longer. A disposal job built on the two-year
  ceiling could destroy records the club is legally obliged to keep.

**[#30](./open-questions.md) therefore gates *disposal* now, not merely
retention** — and it is the one legal question in the ledger whose answer
prevents an actively harmful build.

## Commercial and market-entry decisions

**Queensland first, deliberately.** The pilot club is in Brisbane and its
data, its registrar, and its season are the sparring partner. One
jurisdiction means one governing body's rules, one voucher program, one
screening regime, and one set of competition structures to get right
before generalising — which is what keeps the
configuration-not-code discipline honest rather than theoretical.

**Two support tiers, and the paid one is a staffing commitment.** Recorded
as a Course of action because Platinum is not a software feature: "as soon
as received", during registration season, across a state of volunteer-run
clubs, is an availability promise whose cost is people. It needs a bounded
coverage window before it is sold ([#48](./open-questions.md)).

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | Three new Courses of action — Queensland-first market entry, the two support tiers, and the listening session as the first approach to a governing body. Resources updated: Majestri's bulk export confirmed, SQUADI's FA ID confirmed still absent, carnival scope bounded to MiniRoos at 80–90 teams. No new Capability, Goal, or Principle |
| 2_business    | **BR40 restated** (status-based retention); **BR41 extended** (the Committee authors the fee schedule per club); new rule **BR67** (transfer of control at 18). No new object or actor |
| 3_information | No change — not started. Its queue grew materially: status-based retention needs a participation-status concept the data model does not yet have, and archival is now a first-class lifecycle stage rather than a deletion date |
| 4_application | No change — not started. Flagged: BR67's transfer is a scheduled, dated event, joining BR50's withdrawal and BR51's notification intake as things needing a background process |
| 5_technology  | No change — not started |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Eleven resolutions, four partial answers, BR40/BR41 restated, BR67 | The **legal answer** on disposal minimums ([#30](./open-questions.md)) — this initiative made it more urgent, not less |
| The commercial model for year one, and the support tiers | The **renewal model** and Platinum's coverage window ([#48](./open-questions.md)) |
| Queensland-first entry, the listening-session approach | Actually approaching Football Queensland again |
| Carnival scope bounded to MiniRoos | Per-event Carnival Conditions, still configuration and still varying |
| — | Any code — no `src/`, no tests, no build |

## Gap notes

- **A fixture feed exists after all.** [#19](./open-questions.md) had
  adopted the expectation that Football Queensland would not provide one,
  and that manual/CSV entry was likely permanent. That was wrong: FQ
  publishes fixtures across the categories the club competes in. The
  *form* is unknown and the category list is still to come, so the working
  assumption is unchanged for now — but the pessimistic framing has been
  removed rather than left to mislead.
- **PlayFootball exports are usable, and still undocumented.** Confirmed to
  exist and to support comparison, which is what BR45 needed. What it does
  *not* have is the column-level catalogue that exists for Squadi's two
  reports — one export needs to be opened and written down.
- **Blue Card Services is a contact problem, not a design problem.**
  BR51's primary mechanism — organisation linkage and notification —
  remains **assumed rather than verified**, because nobody has reached
  them. Until that call happens, the safeguarding rule most likely to be
  relied on is the one least confirmed.
- **A$12,000 with unbounded Platinum support is priced on an unknown.**
  Year one is settled, but the cost side of the paid tier is staffing, and
  no coverage window has been set. That is a margin question rather than an
  architecture one, which is why it is [#48](./open-questions.md) and not a
  rule — but it should be answered before a second club signs the same
  terms.

## Open questions

- **#48 (new).** What is the recurring commercial model beyond year one —
  flat per club, banded by club size, or per registration — and what does
  Platinum's "as soon as received" commit to in staffed hours?
