# Deployment

_[← Technology layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Node, Artifact, Deployment/Migration relationship.

## Pipeline

```mermaid
flowchart LR
  push["Push/merge to main<br>touching example/site/**"]:::implementation
  workflow["deploy-example-site.yml"]:::technology
  artifact["«Artifact»<br>Pages artifact<br>(example/site/ contents)"]:::technology
  pages["«Node»<br>GitHub Pages"]:::technology

  push -->|triggers| workflow
  workflow -->|uploads| artifact
  artifact -->|deployed to| pages

  classDef implementation fill:#ffd6d6,stroke:#c94f4f,color:#333
  classDef technology fill:#c9e7b7,stroke:#558b2f,color:#333
```

- **Pipeline definition:**
  [`.github/workflows/deploy-example-site.yml`](../../../../.github/workflows/deploy-example-site.yml),
  at the repository root (workflows aren't scoped per-subfolder).
- **Artifact:** the contents of [`site/`](../../../site/index.html),
  uploaded verbatim — no build step, no dependencies to install.
- **Trigger:** push to `main` touching `example/site/**`, or manual
  dispatch.
- **Manual step, one-time:** GitHub Pages must be enabled for this
  repository (Settings → Pages → Build and deployment → Source: **GitHub
  Actions**) before the workflow's deploy step can succeed. This can't be
  done from a commit — it's a repository-settings change an admin makes
  once. See
  [`docs/scope/1_publish-guidance-site.md`](../../scope/1_publish-guidance-site.md)'s
  open questions.
