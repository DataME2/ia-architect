# Let'sDataTalk

_[← CONTRIBUTING](./CONTRIBUTING.md) · [Enterprise architecture](./docs/ea/README.md) · [Scope documents](./docs/scope/README.md)_

**Let'sDataTalk** is a multiclub, multitenant, AI-assisted platform that
centralizes the operational, registration, financial, and documentary
administration of football clubs and academies in Australia and New
Zealand — player registrations, guardians, documents, fees and payment
plans, and the full match-official lifecycle (classification, availability,
appointments, conflict checks, and payment), all built around a single
`Person` identity that can hold several roles at once (player, referee,
coach, guardian, committee member) instead of separate, duplicated
identities per concern.

**Status:** pre-MVP. The [strategy](./docs/ea/1_strategy/README.md) and
[business](./docs/ea/2_business/README.md) architecture layers are drafted
from the project's discovery material; no application code exists yet (see
[docs/scope/1_bootstrap-strategy-and-business-architecture.md](./docs/scope/1_bootstrap-strategy-and-business-architecture.md)).
A pilot club has committed at least three years of historical data to
validate the platform against. **Target for the first live version: before
the end of Q4 2026.**

## Working method: EA first

This project practices **architecture-first development**: strategy and
business architecture are validated before information, application, and
technology — and all of it before code. See [CLAUDE.md](./CLAUDE.md) for
the one-paragraph rule and [CONTRIBUTING.md](./CONTRIBUTING.md) for the
full process, actors, and definition of done.

## Layout

- [`docs/ea/`](./docs/ea/README.md) — the project's current-state
  architecture, as five numbered ArchiMate layers (`1_strategy` →
  `5_technology`).
- [`docs/scope/`](./docs/scope/README.md) — one document per initiative,
  plus the running [open-questions log](./docs/scope/open-questions.md) for
  interpretations still awaiting confirmation from the pilot club or other
  stakeholders.
- [`docs/annexes/`](./docs/annexes/README.md) — operational artifacts that
  realise an architecture element rather than describe one (currently the
  [consent wording](./docs/annexes/consent-wording.md) for BR48/BR55–BR57).
- [`docs/decisions/`](./docs/decisions/README.md) — smaller, consequential
  calls that don't rise to a full initiative — starting with the AI
  assistant's autonomy level.

## Commands

No application code exists yet — this repository currently holds only the
strategy and business architecture. Development commands will be added to
this section and to [CONTRIBUTING.md](./CONTRIBUTING.md) once a technology
stack is chosen (see the `stack-selection` skill) as part of the MVP-build
initiative.

## Origin of this documentation

The strategy and business layers were derived from the project's discovery
document (*Let'sDataTalk — Documento maestro de contexto del proyecto*,
v0.1, originally captured in Spanish) and translated into English, the
project's chosen documentation language (see [CLAUDE.md](./CLAUDE.md)).
Where the source material left a question genuinely open, it was carried
into [docs/scope/open-questions.md](./docs/scope/open-questions.md) rather
than silently resolved.
