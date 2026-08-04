# Project Scope — The Registration Baseline and the SQUADI Gate

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

Initiative 9's largest gap note asked for the one number the staged
registration ladder needs and did not have: how long registration
actually takes today. The stakeholder answered — **weeks** — and, more
importantly, named the cause: SQUADI itself, described as confusing and
difficult on both web and phone. Football Queensland mandates SQUADI
registration as a precondition for playing, so a registration stuck in
that step is not merely untidy: **the player cannot take the field.**

That answer does two things. It gives stage 1 of the ladder a baseline to
beat, and it **corrects stage 1's framing** — recorded in initiative 9 as
"club-native," which would have optimised the club's internal process
while leaving the family to fight SQUADI unaided and the bottleneck
untouched. Stage 1 is restated as **SQUADI-ready**: collect once, validate
deterministically, and hand over a submission that is right the first
time. No application code is written.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | The families-and-players **Driver** now carries the measured baseline (weeks), its stated cause (SQUADI usability), and its consequence (lost playing time); **stage 1 of the registration ladder restated** from "club-native" to "SQUADI-ready", with an explicit note that only the confusion/error portion of the delay is removable without an API; the governing-body Course of Action strengthened — an association mandating a system that costs its own jurisdiction playing time is an association-level incentive (see [1_motivation.md](../ea/1_strategy/1_motivation.md), [2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md)) |
| 2_business    | New business rule **BR43**: `PENDING_EXTERNAL_REGISTRATION` is an eligibility gate on participation, not merely an administrative state; the Player registration process explains where the weeks are spent and what stage 1 targets. No new actor, service, or object — this initiative sharpens existing elements rather than adding any |
| 3_information | No change — not started. Note: decomposing the baseline ([#32](./open-questions.md)) is an analysis over the pilot club's historical data, which is this layer's eventual concern but needs no model to begin |
| 4_application | No change — not started |
| 5_technology  | No change — not started |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | The registration ladder committed to proving speed with no number to beat, and framed stage 1 as club-native — a framing that would have improved a metric nobody was complaining about. `PENDING_EXTERNAL_REGISTRATION` read as an administrative status |
| **Target** (delivered) | The baseline is recorded (weeks) with its stated cause. Stage 1 targets the actual bottleneck via first-time-right submission. BR43 states the participation consequence. The portion of the delay that is *not* removable without an API is named rather than assumed away |

## Work packages and deliverables

### WP1 — Record the baseline and its consequence

- **Deliverables:** `docs/ea/1_strategy/1_motivation.md` (Driver carries
  the weeks baseline, the SQUADI cause, the playing-time consequence),
  `docs/ea/2_business/5_domain-context-and-rules.md` (BR43),
  `docs/ea/2_business/3_business-processes.md` (registration process
  explains the gate)
- **Outcome:** the project's central pain has a number and a named cause,
  and the architecture states plainly that registration latency costs
  playing time rather than paperwork.

### WP2 — Restate stage 1 against the real bottleneck

- **Deliverables:** `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (stage 1 becomes "SQUADI-ready"; the removable-vs-irreducible caveat)
- **Outcome:** stage 1 remains API-free and pre-MVP demonstrable, but now
  aims at the step that actually consumes the weeks — and does not
  overclaim on the portion it cannot reach.

### WP3 — Governance scaffolding

- **Deliverables:** this scope document, `docs/scope/README.md` index row,
  `docs/scope/open-questions.md` (#32)
- **Outcome:** the measurement task that must precede any speed target is
  a numbered, owned question rather than an assumption.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The baseline (weeks), its stated cause, and its playing-time consequence (BR43) | **Performing** the decomposition — the measurement itself ([#32](./open-questions.md)) |
| Restating stage 1 as SQUADI-ready rather than club-native | Setting a numeric target for stage 1 — impossible before the decomposition |
| Naming which portion of the delay is irreducible without an API | Any change to SQUADI, or any approach to Football Queensland |
| Strengthening the governing-body argument with the mandate/latency link | Modeling the association tier ([#31](./open-questions.md)) |
| — | Any code — no `src/`, no tests, no build |

## Gap notes

- **The decomposition is the next useful piece of work, and it needs no
  build.** Splitting "weeks" into guardian confusion/error/abandonment,
  club turnaround, association processing, payment clearing, and the ITC
  window is an analysis over data the pilot club has already committed.
  Until it exists, stage 1 can be demonstrated but not *measured against*
  anything, and any percentage claim would be invented.
- **A first-time-right submission may not be the whole answer.** If the
  decomposition shows most of the delay sits in association processing
  rather than data quality, stage 1's ceiling is lower than hoped and the
  case for pursuing stage 2 (API access) — or for the governing-body
  conversation — becomes correspondingly stronger. That is a finding worth
  wanting either way, and a reason not to pre-commit to a target.
- **SQUADI usability is a third party's problem the platform can only
  route around.** Nothing in this architecture can make SQUADI easier to
  use; it can only reduce how often a person has to touch it and how often
  that touch fails. Framing the benefit as "fewer, better SQUADI
  interactions" rather than "SQUADI made easy" keeps the claim honest with
  the pilot club and with any governing body.
- **BR43 has downstream reach not yet traced.** If a Player is ineligible
  until external registration completes, then team selection, match-day
  squads, and carnival entry all inherit that gate. None of those are
  modeled against BR43 yet — the rule is stated where registration lives,
  but its consumers are elsewhere.

## Open questions

> **#32 answered qualitatively (August 2026): confusion and error
> dominate.** The named mechanism is guardians entering a child's
> **nickname** instead of their legal name, which the operator processes
> into a mismatch that errors and re-loops. That is the best available
> answer for this initiative's thesis — it is precisely the portion stage 1
> removes with no integration. Codified as **BR55** (legal name
> authoritative for registration and matching, preferred name captured
> alongside for everything humans see) and **BR56** (identification
> photograph, held under BR48 consent and P4's AI limits). The
> **proportion** is still unmeasured, so stage 1 still has no numeric
> target — the measurement remains available from three years of pilot data.


- **#32 (new).** What is the "weeks" baseline actually composed of, and
  therefore how much of it can a first-time-right submission remove?
  Blocking any numeric target for stage 1; measurable now from the pilot
  club's historical data.
