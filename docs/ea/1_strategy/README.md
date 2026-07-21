# Strategy & Motivation Layer

_[← EA home](../README.md)_

The top-down business context: who has a stake in the project, why it
exists, which capabilities it needs, and the value stream it delivers. This
layer motivates everything below it — each capability is realized by
business services in the [business layer](../2_business/README.md).

## Analysis order

Files are numbered in the order they are analyzed: first _who wants what
and why_, then _what we must be able to do_, and only then _how value
flows_.

| #   | Document                                                             | Elements                                                         | Question it answers                                |
| --- | ---------------------------------------------------------------------| ------------------------------------------------------------------ | ---------------------------------------------------- |
| 1   | [1_motivation.md](./1_motivation.md)                                 | Stakeholders, Drivers, Assessments, Goals, Outcomes, Principles | Who cares, what pressures them, what must be true?  |
| 2   | [2_capabilities-and-resources.md](./2_capabilities-and-resources.md) | Capabilities, Resources, Courses of Action                      | What must we be able to do, and with what?          |
| 3   | [3_value-stream.md](./3_value-stream.md)                             | Value Stream and its stage mapping                               | How does value flow end-to-end?                     |

`1_motivation.md` is where **Principles** live — the constraints that a
proposed change is checked against in step 1 of `ea-first-change` before
anything else. Keep them few, load-bearing, and testable (e.g. "role
determines access", not "be secure").

## Layer view

<!--
  TEMPLATE — replace with the project's real stakeholder(s), driver(s),
  goal, value stream, capability, and resource once known.
-->

```mermaid
flowchart TB
  stakeholder["«Stakeholder»<br><Who cares>"]:::motivation
  driver["«Driver»<br><What pressures them>"]:::motivation
  goal["«Goal»<br><What must become true>"]:::motivation

  vs["«Value Stream»<br><Stage 1 → Stage 2 → …>"]:::strategy
  cap["«Capability»<br><What we must be able to do>"]:::strategy
  res["«Resource»<br><What it's built with>"]:::strategy

  stakeholder -->|concerned with| driver
  driver -->|influences| goal
  goal -->|realized by| vs
  vs -->|requires| cap
  cap -->|uses| res

  classDef motivation fill:#e6d6f5,stroke:#7e57c2,color:#333
  classDef strategy fill:#f5deaa,stroke:#c8a24a,color:#333
```
