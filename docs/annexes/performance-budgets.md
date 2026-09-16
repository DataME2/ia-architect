# Annex — Performance budgets

_[← Annexes](./README.md) · [Enterprise architecture](../ea/README.md)_

**Realises:** NFR-16 · [Scope 43](../scope/43_the_screens_hold_up_and_say_so.md)

NFR-16 read **"Undefined — no budget stated and none measured"** from the
day it was written. This annex states the budgets and records the first
measurement against them.

A budget is useful only if exceeding it is a defect rather than an opinion,
so each one below names **the number, the load it is measured at, and what
enforces it**. Where nothing enforces it, that is said rather than implied.

## The load these are measured at

The pilot club is **~700 registrations in a season**, and a registration is
a child with at least one guardian — so the club's `person` table is closer
to **1,400 rows** than to 700. Every budget here is stated at 1,400 people,
because that is the number the code actually iterates.

## The budgets

| Operation | Budget | Measured | Enforced by |
| --------- | ------ | -------- | ----------- |
| **BR5 duplicate detection**, whole club | Grows **no worse than linearly** as the club doubles | 1,400 people: **495 ms → 4.8 ms** after [scope 43](../scope/43_the_screens_hold_up_and_say_so.md) | `src/domain/identity/duplicates.scale.test.ts`, in `npm test` |
| **Season queue render** (`/registrar`) | One database round trip per table, not per registration; no per-registration scan of the club | Query count unchanged; the in-memory cost fell with duplicate detection | Code review, and the test above for the dominant term |
| **Pack assembly** at 700 registrations | Bounded by the number of registrations, not by registrations × people | Same change; the pack path shared the quadratic | The test above |
| **Pack generation end to end** | Not yet stated | **Not measured** | Nothing |
| **People directory** (`/registrar/people`) | Cost independent of club size — bounded by the fifty people on a page, not the roster | [Scope 59](../scope/59_a_directory_that_does_not_read_the_whole_club.md): rewritten to filter, search and paginate in the query rather than build the whole directory and search it in memory. Not benchmarked against a real database at 800 people — see below | Code review; `src/web/people-view.test.ts` covers the pure pagination/filter helpers, not query cost |

## Why the budget is a shape, not a number of milliseconds

The one automated budget asserts that **doubling the club does not
quadruple the work**, and deliberately does not assert a millisecond
ceiling.

A wall-clock ceiling on a shared CI runner fails when a neighbouring job is
busy. The team then re-runs it, the failure becomes noise, and within a
month the check is the thing everybody knows to ignore — which is worse
than not having it, because it also reports green. A ratio measured between
two runs **in the same process on the same machine** survives a runner four
times slower: both halves slow down together.

It is measured as the **fastest of several runs rather than the average**,
because noise only ever adds time. The first version used the average and
passed on its own while failing inside a full `npm test`, which is the worst
behaviour a performance gate can have.

## What was actually wrong

Duplicate detection (BR5) compared every person against every other person,
normalising both names and both email addresses **inside** the comparison —
so a club of 1,400 people ran roughly two million comparisons and several
million string allocations, on three separate screens: the season queue, the
registration detail, and the submission pack.

The fix is not an approximation. **Both of BR5's bases require the dates of
birth to agree**, so two people born on different days can never be
candidates, and comparing them is work with a known answer. Grouping by date
of birth is therefore the matching rule read as an index rather than a cheap
pre-filter that might drop a real match — and a test asserts that the pairs
found do not depend on the order the people arrive in, which is what would
break if it ever became a heuristic.

**The honest limit:** a club whose members were all born on the same day is
one bucket and quadratic again. A club of children spread across a decade of
birthdays is nowhere near that, and an age-group club is the opposite of
that case.

## What is not measured, and is not pretended to be

- **Nothing is measured against a database.** The costs above are the pure,
  in-memory half. The query half — how long Postgres takes to return a
  season under RLS, with the policies evaluated per row — has no harness,
  and the RLS suite proves correctness rather than cost. [Scope 59](../scope/59_a_directory_that_does_not_read_the_whole_club.md)
  changes the *shape* of one query path — `person`, `person_role` and
  `guardianship` are now fetched a page at a time instead of for the whole
  club — but that is a code-review argument about what the query asks for,
  not a measurement of what Postgres takes to answer it under load.
- **No browser measurement.** No Core Web Vitals, no bundle budget, no
  first-load figure, and therefore no claim about what a registrar's laptop
  on a club's wifi actually experiences.
- **No load beyond one club.** Every figure is single-tenant. The platform
  console reads across clubs and is measured nowhere.
- **Pack generation end to end** — the operation NFR-16 names first — is
  still not measured as a whole, because most of it is I/O to a project
  holding real data. The unbounded *computational* part of it is now
  bounded and tested; the rest waits on task 0.4's production environment.
