# Application Layer

_[← EA home](../README.md)_

The software that realizes the
[EA-first method guidance](../2_business/README.md) business service.

## Analysis order

| #   | Document                                                             | Elements                                                     | Question it answers                              |
| --- | -----------------------------------------------------------------------| --------------------------------------------------------------- | --------------------------------------------------- |
| 1   | 1_application-services.md                                            | Application Services and the business services they realize | What does the software offer the business layer? |
| 2   | [2_application-components.md](./2_application-components.md)         | Application Components, mapped to source files               | Which components provide those services?          |
| 3   | 3_application-collaborations.md                                      | Collaborations and interaction sequences                     | How do the components interact?                   |
| 4   | 4_solution-design.md                                                 | Overall design, diagrams, patterns, tooling                  | How is the code structured, and why?               |
| 5   | 5_interface-contracts.md                                             | Per-interface pre/postconditions, invariants, error behavior | What exactly does each interface promise?          |

This project only populates document 2: it's four static pages with no
interchangeable adapters, no interfaces, and a service-to-component
mapping trivial enough to state inline in that one document instead of a
separate services document.

## Layer view

```mermaid
flowchart TB
  index["«Application Component»<br>Landing page<br>(site/index.html)"]:::application
  guide["«Application Component»<br>Guide page<br>(site/guide.html)"]:::application
  walk["«Application Component»<br>Walkthrough page<br>(site/walkthrough.html)"]:::application
  arch["«Application Component»<br>Architecture page<br>(site/architecture.html)"]:::application

  index -->|links to| guide
  guide -->|links to| walk
  walk -->|links to| arch
  arch -->|links to| index

  classDef application fill:#c2f0ff,stroke:#0288d1,color:#333
```

See [2_application-components.md](./2_application-components.md) for the
service each component realizes and its exact source file.
