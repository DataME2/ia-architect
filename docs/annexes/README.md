# Annexes

_[← Repository README](../../README.md) · [Enterprise architecture](../ea/README.md)_

Operational artifacts that **realise** an architecture element rather than
describe one — the concrete text, forms, or templates a business rule
requires someone to actually put in front of a person.

They live outside `docs/ea/` on purpose: the EA documents state what must
be true, and an annex is one instantiation of it. **Changing an annex's
wording is not an EA change; changing what it covers is** — that goes
through `ea-first-change` like anything else.

| Annex | Realises | Notes |
| ----- | -------- | ----- |
| [consent-wording.md](./consent-wording.md) | BR48, BR55, BR56, BR57 | Registration collection notice, identification photo consent, and publicity consent. Drafted, **not legally reviewed** |
| [submission-pack-instructions.md](./submission-pack-instructions.md) | C16, BR58, BR59, BR60 | How a club produces, checks, hands over, and tracks a Registration Submission Pack, with a recipient-facing cover note and the fallback for when the federation does not import |
| [retention-schedule.md](./retention-schedule.md) | BR40, BR49 | Proposed per-record-class retention periods for Australia. **Drafted, not legally reviewed** — and the class where it diverges most from BR40 is child-safety records |
| [preliminary-technical-spec-en.pdf](./preliminary-technical-spec-en.pdf) | The architecture as a whole | Preliminary technical specification for reading effort — scope, roles, data model, integrations, risks, relative complexity, and volumetry. English |
| [preliminary-technical-spec-es.pdf](./preliminary-technical-spec-es.pdf) | The architecture as a whole | Spanish rendering of the same document, kept because the originating discovery material was Spanish |

## A note on these two PDFs

They are the **non-anonymised** versions, published here deliberately. They
name the pilot club, Football Queensland, Squadi, Majestri, and
PlayFootball, summarise the club's correspondence with the federation, and
carry a section on intellectual property and the pilot-club/vendor role
overlap.

Both documents carry an internal-use box in their own front matter. That
box reflects how they were drafted, not where they now sit — **this
repository is public**, and publishing them here was a deliberate choice
made with that understood. Treat the box as provenance, not as an access
restriction.

Neither is a commercial offer or legal advice, and the complexity ratings
in them are relative to the problem rather than a price.
