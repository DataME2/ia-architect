# Information Layer

_[← EA home](../README.md)_

The passive structure: the guidance content itself, and how it relates to
its canonical source.

## Analysis order

| #   | Document                                           | Elements                                              | Question it answers                                 |
| --- | ---------------------------------------------------| -------------------------------------------------------| ------------------------------------------------------ |
| 1   | [1_data-objects.md](./1_data-objects.md)           | Data Objects (domain types) and their code locations  | What information exists?                             |
| 2   | 2_data-flows.md                                    | Representations, persistence and flow relationships   | How does it move between representations?            |
| 3   | 3_data-architecture.md                             | Schema, classification, retention                     | Where does it live, how sensitive is it, how long?   |

Documents 2–3 are not written for this project: there is exactly one data
object with exactly one representation (a static HTML file, publicly
readable, no classification or retention concerns) — nothing that flow or
architecture documents would add.

## Layer view

```mermaid
flowchart TB
  source["«Data Object»<br>Skill/EA source<br>(canonical)"]:::application
  page["«Data Object»<br>Guidance page<br>(derived)"]:::application
  store[("«Artifact»<br>Static HTML file")]:::technology

  source -->|summarized into| page
  page -->|persisted as| store

  classDef application fill:#c2f0ff,stroke:#0288d1,color:#333
  classDef technology fill:#c9e7b7,stroke:#558b2f,color:#333
```

See [1_data-objects.md](./1_data-objects.md).
