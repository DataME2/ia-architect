# Project Scope — Numbers a Committee Can Act On

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

Every number a club committee asks for is already in this database and none
of it is on a screen. A treasurer counts arrears by opening registrations
one at a time; a registrar answers "how far through the season are we?" by
scrolling the queue. This initiative builds C8.

It is the first capability here that adds **no new facts at all** — every
figure is derived from data that already exists. That makes it look easy,
and it is the reason it has one genuinely dangerous failure mode.

## The trap this initiative is mostly about

**Row-Level Security hides rows. It does not refuse sums.**

A coach may not read `payment` — BR78 says a coach sees whether a player is
clear to take the field and never what the family owes, and the policies
enforce it. So a finance report written the obvious way, aggregating what
the caller can see, would show a coach **$0 outstanding**.

That is correct isolation producing a confident lie. Worse, it is the kind
nobody catches: it looks like good news, it is a plausible number, and the
screen gives no hint that half the rows were invisible. A zero meaning *you
may not see this* is indistinguishable from a zero meaning *there is none*.

So BR142: a figure computed over rows the reader may not see is **not shown
as a figure**. Every summary here is a `security definer` function that
checks the reader's role explicitly and **raises** if they may not have it —
computing the true total, or refusing, and never quietly computing a
partial one.

That inverts the usual shape in this schema, and deliberately. Everywhere
else, access is an emergent property of which rows a policy admits. For an
aggregate it cannot be, because the aggregate of nothing is a number rather
than an absence.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No new goal.** C8 has been in the capability map since it was drafted, serving **G5** (less manual administrative work) and giving the pilot club the measurable proof its stakeholder concern asks for |
| **2_business** | **Two new rules: BR142** (a figure over rows the reader cannot see is not a figure) and **BR143** (every figure states its base and its as-at moment — BR102 and BR46 generalised). The **Reporting & dashboards** business service moves from Pending to partly realised |
| **3_information** | **No new data objects.** Every figure is derived; nothing is stored, so no total can go stale against the rows beneath it |
| **4_application** | C8 moves from *Not started* to *Partial*. New: three `security definer` summary functions with explicit role checks, `src/domain/reporting/` (the shaping and the arithmetic, pure), `src/data/reporting.ts`, and `/registrar/reports` |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | Every number exists and none is on a screen. A treasurer counts arrears by hand |
| **Target** (delivered) | Three reports — registration, finance, officiating — each computed authoritatively, each stating what it was computed over and when, and each **refusing** a reader whose role may not have it rather than showing them a partial total |

## Work packages and deliverables

### WP1 — Aggregates that refuse rather than mislead

- **Deliverables:** `supabase/migrations/0036_reporting.sql` —
  `app_registration_summary`, `app_finance_summary`,
  `app_officiating_summary`, each with an explicit role check;
  `supabase/tests/39_reporting.sql`
- **Outcome:** BR142 holds, and the test that matters asserts a coach is
  **refused** rather than given zeros.

### WP2 — The arithmetic

- **Deliverables:** `src/domain/reporting/` — arrears ageing, completion
  rate, and the derived percentages, pure
- **Outcome:** BR143 holds. Every figure carries its base.

### WP3 — The screen

- **Deliverables:** `/registrar/reports`
- **Outcome:** A committee sees the numbers, and sees which ones are not
  theirs to see.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Registration, finance and officiating summaries for one season | **Trends across seasons.** One season is what the pilot club has; more is what C9 would bring |
| A figure that states its base and its moment | **Charts.** A number a committee can act on first; a picture of it is a separate question |
| Refusing a reader who may not have a figure | **A per-figure permission model.** Three role sets, matching the policies that already exist, rather than a new vocabulary |
| — | **Historical data import (C9).** Still blocked on [#57](./open-questions.md), the lawful basis — a question for a lawyer rather than an engineer |
| — | **Export of a report.** BR68's club export carries the rows; a formatted report is a different artifact |

## Gap notes

- **One season only, and the reports say so.** Every figure is scoped to the
  season selected, because a club with one season of data in the platform
  has no trend to show and a chart with a single point invites a reader to
  imagine a line. C9 is what changes that, and C9 is blocked on a legal
  question rather than on effort.
- **The definer functions bypass RLS, which is the point and the risk.**
  Each computes over every row of its club so the total is true, and each
  checks the caller's role explicitly first. That check is the only thing
  standing between a coach and the club's finances, so
  `supabase/tests/39_reporting.sql` asserts the refusal for every function
  rather than trusting three `if` statements.
- **Nothing here is cached.** A report is computed on load, so a figure
  cannot disagree with the rows beneath it. At a club's scale that costs
  nothing; at an association's it would be the first thing to change.
- **No figure counts a historical registration**, because BR90 keeps
  imported history out of the queue and the pack — and a completion rate
  including seasons the club never ran through this platform would be
  meaningless. Since C9 is unbuilt there is nothing to exclude yet, which
  is why this is a note rather than a filter.

## Open questions

- **[#84] Should a committee member see the finance report?** Adopted:
  **yes.** BR78 separates the Committee's governance authority from the
  Treasurer's financial execution — a committee approves a voucher program
  and cannot apply a voucher — but a committee that cannot see whether the
  club is solvent cannot govern it. Reading a total is not executing
  anything.
