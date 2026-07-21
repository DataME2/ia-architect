# Strategy & Motivation Layer

_[← EA home](../README.md)_

The top-down business context: who has a stake in this project, why it
exists, which capabilities it needs, and the value stream it delivers.

## Analysis order

| #   | Document                                                             | Elements                                                         | Question it answers                                |
| --- | ---------------------------------------------------------------------| ------------------------------------------------------------------ | ---------------------------------------------------- |
| 1   | [1_motivation.md](./1_motivation.md)                                 | Stakeholders, Drivers, Assessments, Goals, Outcomes, Principles | Who cares, what pressures them, what must be true?  |
| 2   | 2_capabilities-and-resources.md                                      | Capabilities, Resources, Courses of Action                      | What must we be able to do, and with what?          |
| 3   | [3_value-stream.md](./3_value-stream.md)                             | Value Stream and its stage mapping                               | How does value flow end-to-end?                     |

Document 2 is not written for this project — a guidance site is small
enough that its capabilities are fully implied by the value stream in
document 3; nothing here would say more than that. See the parent
template's application-layer README for the same "not every project needs
every numbered file" rule.

## Layer view

```mermaid
flowchart TB
  stake1["«Stakeholder»<br>Pilot"]:::motivation
  stake2["«Stakeholder»<br>Template adopters"]:::motivation
  driver["«Driver»<br>archreator had no worked<br>example of its own notation"]:::motivation
  goal["«Goal»<br>Adopters learn and correctly<br>apply the EA-first method"]:::motivation

  vs["«Value Stream»<br>Discover → Understand → Adopt"]:::strategy

  stake1 -->|concerned with| driver
  stake2 -->|concerned with| driver
  driver -->|influences| goal
  goal -->|realized by| vs

  classDef motivation fill:#e6d6f5,stroke:#7e57c2,color:#333
  classDef strategy fill:#f5deaa,stroke:#c8a24a,color:#333
```

See [1_motivation.md](./1_motivation.md) for the Principles, and
[3_value-stream.md](./3_value-stream.md) for the stage-by-stage flow.
