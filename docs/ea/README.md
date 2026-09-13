# Enterprise Architecture — Let'sDataTalk

_[← Repository README](../../README.md) · [Scope documents](../scope/README.md)_

This folder is the **primary documentation of the system**, organized as an
ArchiMate-layered enterprise architecture. Every element is grounded in the
implemented solution: entries name the page, module, or pipeline file that
realizes them (or are marked explicitly **"Pending — future initiative"**),
so the architecture can be verified against the code at any time.

Folders and files carry a numeric prefix giving the order in which they are
assessed. **Any change in requirements is aligned through these layers in
this order — strategy first, technology last — and captured in a
[scope document](../scope/README.md) before implementation starts** (see
[CONTRIBUTING.md](../../CONTRIBUTING.md) and the `ea-first-change` skill in
`.claude/skills/`).

## Layers, in assessment order

| #   | Layer                                       | ArchiMate viewpoint      | Answers                                                                       | Status |
| --- | -------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------ | ------ |
| 1   | [1_strategy/](./1_strategy/README.md)       | Motivation + Strategy    | Why does this exist? Who cares? What capabilities and value stream?           | Drafted |
| 2   | [2_business/](./2_business/README.md)       | Business layer           | Who does what? Which services are offered, through which processes?          | Drafted |
| 3   | [3_information/](./3_information/README.md) | Passive structure (data) | What information exists, where does it live, how does it flow?               | Drafted |
| 4   | [4_application/](./4_application/README.md) | Application layer        | Which software services and components realize the business services?       | Drafted |
| 5   | [5_technology/](./5_technology/README.md)   | Technology layer         | What runs it all — runtimes, tooling, build, hosting, deployment?            | Drafted |

**All five layers are now written.** Layers 3–5 were opened by the MVP-build
initiative ([scope document 17](../scope/17_mvp-registration-slice.md)) and
have been extended by every initiative since; the stack was chosen in August
2026 ([5_technology/1_technology-services.md](./5_technology/1_technology-services.md)).

*Drafted* means the layer describes the system as it is, not that every
capability is built. The honest ledger of what has code, what is partial,
and what has none at all is
[4_application/1_application-services.md](./4_application/1_application-services.md)
— read it before concluding anything about scope from this table.

Files inside each layer folder are numbered the same way; each layer README
explains its own analysis order. Delivered initiatives (ArchiMate
Implementation & Migration viewpoint) are documented per initiative in
[../scope/](../scope/README.md), not here — the EA describes the **current**
(or **target**, while unimplemented) state; scope documents describe the
**changes** that produce it.

## Notation conventions

ArchiMate has no native Mermaid profile, so these documents encode ArchiMate
semantics onto Mermaid flowcharts with two rules:

1. **Element type as a «stereotype»** in the first line of each node label,
   e.g. `«Business Service»`, `«Application Component»`, `«Data Object»`.
2. **Layer color** via a `classDef` per layer, approximating the standard
   ArchiMate palette:

| Layer                      | class            | Fill             |
| --------------------------- | ---------------- | ---------------- |
| Motivation                  | `motivation`     | violet `#e6d6f5` |
| Strategy                    | `strategy`       | sand `#f5deaa`   |
| Business                    | `business`       | yellow `#fffbb5` |
| Application                 | `application`    | cyan `#c2f0ff`   |
| Technology                  | `technology`     | green `#c9e7b7`  |
| Implementation & Migration  | `implementation` | rose `#ffd6d6`   |

This table is the **single source** for the layer palette; the `ea-doc-style`
skill and every other document point here for the exact fills. Mermaid
`classDef` blocks necessarily inline these hexes per diagram (Mermaid has no
cross-file classDef), but no other prose table restates them.

Relationships are labeled with their ArchiMate name: **serves**,
**realizes**, **assigned to**, **accesses**, **triggers**, **flow**,
**aggregates**, **influences**. Where Mermaid arrowheads can't distinguish
relation types, the label is authoritative.

<!--
  If this project documents in a language other than English, keep a
  stereotype-correspondence table here (translated label → standard
  ArchiMate element name) so the vocabulary stays traceable. See the
  ea-doc-style skill.
-->

## Layered overview

```mermaid
flowchart TB
  subgraph MOT["Motivation & Strategy"]
    goal["«Goal»<br>G1 Single identity per person"]:::motivation
    vs["«Value Stream»<br>Discover → Profile → Unify →<br>Operate → Validate → Scale"]:::strategy
  end

  subgraph BUS["Business layer"]
    svc["«Business Service»<br>Player registration,<br>referee management, …"]:::business
    actor["«Business Actor»<br>Club staff, families,<br>referees, Assistant (AI)"]:::business
  end

  subgraph APP["Application layer"]
    app["«Application Component»<br>Rules engine, registration,<br>finance, officiating, screens"]:::application
  end

  subgraph TEC["Technology layer"]
    tech["«Node»<br>Next.js on Vercel,<br>Supabase Postgres (Sydney)"]:::technology
  end

  goal -->|realized by| vs
  vs -->|realized by| svc
  actor -->|served by| svc
  svc -->|realized by| app
  app -->|runs on| tech

  classDef motivation fill:#e6d6f5,stroke:#7e57c2,color:#333
  classDef strategy fill:#f5deaa,stroke:#c8a24a,color:#333
  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
  classDef application fill:#c2f0ff,stroke:#0288d1,color:#333
  classDef technology fill:#c9e7b7,stroke:#558b2f,color:#333
```

## Reading order

Top-down (recommended for newcomers — the same order as the folder numbers):
[1_strategy/1_motivation.md](./1_strategy/1_motivation.md)
→ [1_strategy/3_value-stream.md](./1_strategy/3_value-stream.md)
→ [2_business/1_business-actors-and-roles.md](./2_business/1_business-actors-and-roles.md)
→ [2_business/2_business-services.md](./2_business/2_business-services.md)
→ [2_business/5_domain-context-and-rules.md](./2_business/5_domain-context-and-rules.md)
→ [3_information/1_data-objects.md](./3_information/1_data-objects.md)
→ [4_application/1_application-services.md](./4_application/1_application-services.md)
→ [5_technology/2_deployment.md](./5_technology/2_deployment.md).

Bottom-up (for developers verifying alignment): start from
[4_application/2_application-components.md](./4_application/2_application-components.md),
which links each component to its source file, then trace upward via the
"realizes" relationships. Pair it with
[4_application/1_application-services.md](./4_application/1_application-services.md)
— a list of delivered components says nothing about the capabilities nobody
started, and reading the first without the second gives a misleading
impression of scope.
