# Project Scope — The Submission Pack and the Inverted Direction

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

Football Queensland did not reply to the club's August 2026 follow-up.
Rather than keep waiting on an answer the club does not control, this
initiative **inverts the direction of the integration**: Let'sDataTalk
becomes the source of truth for the club's own registration data and
emits a **Registration Submission Pack** that the governing body imports
into Squadi itself.

The platform produces a file. It never connects to Squadi, never ingests
Squadi data, and never writes into it.

Adds Capability **C16**, rules **BR58–BR60**, two business objects, a new
rung on the registration ladder, and the operating instructions
([annex](../annexes/submission-pack-instructions.md)). Restates **BR39**.
No application code is written.

## Why this is the right move, stated precisely

The value is not that the export is clever — a CSV is not clever. It is
**which problems it makes irrelevant**:

| Blocker | Why it no longer applies |
| ------- | ------------------------ |
| [#39](./open-questions.md) — do Squadi's terms permit ingesting its extracts? | Nothing is ingested. The data flows *outward*, from the club's own collection |
| BR53 — unconfirmed authorisation basis blocks ingestion | No external source is read, so no basis is required |
| [#43](./open-questions.md) — stage 2 needs a scoped P2 exception | The platform performs no write into an external system. A human at the federation does the import |
| [#41](./open-questions.md) — approved system partner status | Not needed to *produce* a file. Still needed for a real integration later |

These are **side-stepped, not resolved.** Each remains open and each still
matters for C14 and for any future integration. What changed is that the
registration path no longer waits on them.

## The two honest limits

**Football Queensland has not agreed to receive or import anything.** The
club can build the export unilaterally; it cannot make a counterparty
consume it. Treating "FQ will import our file" as a plan would be building
on a commitment nobody made — recorded as [#46](./open-questions.md).

**The target format is unknown** ([#44](./open-questions.md)). The pack
therefore mirrors the Squadi Registration Report and User Report columns
already documented from the incumbent's extracts, as the best available
proxy for what the destination expects.

**The design absorbs both**, and this is the part worth defending: the
same pack that FQ *would* import is also the pack a club admin or a family
keys in from — once, correctly, with every value already validated. That
is stage 1, it needs nobody's permission, and it delivers the confirmed
dominant cause of the delay (BR55's nickname problem) regardless of what
Football Queensland ever decides. **If FQ never replies, the initiative
still pays for itself.**

## BR39 had to be restated, not merely extended

The previous rule said SQUADI is the system of record, full stop. That
directly contradicts a club claiming to be the source of truth, and
leaving both in the documents would have been an unresolved contradiction
rather than an architecture.

The restatement splits authority **by question rather than by system**:

- **Let'sDataTalk is the source of truth for the club's own registration
  data at the point of submission** — what the club collected, validated,
  and sent. Nobody else can be authoritative about that.
- **SQUADI remains authoritative for eligibility and competition
  administration** — whether a player may take the field. No export
  changes this, and BR60 makes the consequence explicit: *sending is not
  registering.*

This is not a diplomatic compromise. It is the accurate description of who
knows what, and it is what keeps reconciliation decidable when the two
disagree.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | New **Capability C16** (External registration submission); new rung **stage 1.5 — structured handover** on the registration ladder, between the SQUADI-ready stage and SQUADI synchronisation; new Course of action recording the inversion and its two limits. No new Goal or Principle — this serves G2 and G6, and notably **needs no exception to P2**, which is the point |
| 2_business    | **BR39 restated** (authority split by question); new rules **BR58–BR60**; new objects **Registration Submission Pack** and **Submission Record**; two glossary terms. No new actor — the Registrar generates and hands over, as they already do for every other external obligation |
| 3_information | No change — not started. Added to its queue: the pack is immutable and versioned, which is a storage and lifecycle concern, and Submission Record introduces per-Person state that is *not* the registration's own status |
| 4_application | No change — not started. Flagged: pack generation is the first capability whose output leaves the platform's access control entirely as a file, which makes minimisation and audit application-layer concerns rather than policy statements |
| 5_technology  | No change — not started |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | The registration path to the governing body was blocked in both directions: reading Squadi extracts was prohibited pending a legal answer, and writing into Squadi required partner status plus a P2 exception. Nothing could proceed without Football Queensland |
| **Target** (delivered) | The club's own system is the source of truth for what it collected and submitted, and emits an immutable, versioned pack the federation can import — or that a person can key in from. The path no longer depends on Football Queensland answering, while *eligibility* remains theirs to confer and is recorded as such |

## Work packages and deliverables

### WP1 — Capability and ladder

- **Deliverables:** `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (C16; stage 1.5; Course of action)
- **Outcome:** the route is a named capability with an honest dependency
  statement, rather than an informal workaround someone remembers.

### WP2 — Authority and the submission rules

- **Deliverables:**
  `docs/ea/2_business/5_domain-context-and-rules.md` (BR39 restated,
  BR58–BR60, two glossary terms),
  `docs/ea/2_business/4_business-objects.md` (Registration Submission
  Pack, Submission Record)
- **Outcome:** the source-of-truth claim is stated precisely enough to
  build on, and the three ways a submission pack goes wrong — mutability,
  uncontrolled disclosure, and being mistaken for registration — each have
  a rule.

### WP3 — Operating instructions

- **Deliverables:**
  [`docs/annexes/submission-pack-instructions.md`](../annexes/submission-pack-instructions.md)
- **Outcome:** the club can run the handover as a procedure with a
  checklist, a recipient-facing cover note, and a documented fallback for
  when the federation does not import.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| C16, BR39 restated, BR58–BR60, two objects, stage 1.5, the instructions annex | Agreeing the handover with Football Queensland ([#46](./open-questions.md)) — the club can build it, not impose it |
| A pack shaped on the documented Squadi report columns | The *actual* target format and photo specification ([#44](./open-questions.md)) |
| Recording what was sent, when, to whom, and what came back | Automating the return leg — confirmation still arrives however the federation chooses to send it |
| The distinction between *sent* and *registered* (BR60) | C14's reconciliation, still blocked by [#39](./open-questions.md) |
| — | Any code — no `src/`, no tests, no build |

## Gap notes

- **The return leg is the weak half.** Producing the pack is fully within
  the club's control; learning what the federation did with it is not.
  Until a confirmation route exists, Submission Record's state is
  maintained by whatever a human observes in Squadi — which is C14's job,
  and C14 is blocked. **The two are linked: the outbound path partly
  re-creates the need for the inbound one**, and solving the first does
  not remove the second.
- **A pack is a file of children's data, and files travel.** BR59
  minimises fields, records the channel, and audits every generation, but
  once the file is handed over the platform can see nothing. If the pack
  carries photographs (BR56), a single email attachment contains hundreds
  of children's images. Worth deciding deliberately whether photographs
  belong in the pack at all, or only in the record.
- **"Source of truth" is a claim that must be earned operationally.** It
  holds only while the club's data is actually better than what is keyed
  in elsewhere. BR55's legal-name rule and deterministic validation are
  what make it true; without them the claim is just a label on the same
  data quality.
- **This does not make the club independent of Squadi.** BR43 is unchanged
  and BR60 reinforces it: the federation confers eligibility, and a player
  whose pack was sent but whose record never appeared in Squadi still
  cannot take the field. The inversion improves the *submission*, not the
  dependency.

## Open questions

- **#46 (new).** Will Football Queensland accept, and actually import, a
  club-produced submission pack — and through what channel and format?
  Adopted interpretation: **assume not**, and build the pack so it is
  equally usable as a guided data source for manual entry.
