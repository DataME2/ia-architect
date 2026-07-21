# archreator-guide (worked example)

_[← Repository README](../README.md)_

This is a small, real project bootstrapped from the
[archreator template](../README.md) and built by following the exact
process it prescribes: EA layers walked top-down, a scope document written
before implementation, and the AI/human actor notation from the
`ea-doc-style` skill applied to a real business role. It publishes a
guidance site for the archreator method itself, live at
**https://roanboc.github.io/archreator/**.

It exists to close a gap this template had: no filled-in example of its
own notation anywhere in the repo, and specifically no example of the
human/AI/hybrid actor convention actually applied. One of this project's
own business actors — "Copilot" — is an AI, modeled with an explicit
autonomy level, decision rights, and escalation path
([`docs/ea/2_business/1_business-actors-and-roles.md`](./docs/ea/2_business/1_business-actors-and-roles.md)),
alongside the human Pilot who reviews its work.

## Why this lives in its own subfolder

The root of this repository is the template — intentionally blank, so
that clicking "Use this template" hands a new project a clean scaffold,
not someone else's filled-in architecture. This folder is kept separate
from that scaffold on purpose: read it as a reference, don't inherit it.
If you bootstrapped your own project from archreator, your `docs/ea/` and
`docs/scope/` live at your project's root, structured exactly like this
folder's — just about your project instead.

## Reading it

- [`docs/ea/`](./docs/ea/README.md) — this project's current-state
  architecture, including the actor-notation example.
- [`docs/scope/`](./docs/scope/README.md) — the one initiative that built
  this project, `1_publish-guidance-site.md`.
- [`docs/decisions/`](./docs/decisions/README.md) — the smaller rationale
  calls behind this project: why the Copilot's autonomy level was set the
  way it was, and why the site renders its diagrams in CSS rather than with a
  library.
- [`site/`](./site/index.html) — the static pages themselves, deployed by
  [`.github/workflows/deploy-example-site.yml`](../.github/workflows/deploy-example-site.yml)
  to GitHub Pages on every push to `main`. This is the only application
  code this project has — see
  [`docs/ea/4_application/2_application-components.md`](./docs/ea/4_application/2_application-components.md).
