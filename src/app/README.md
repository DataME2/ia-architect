# `src/app/`

_[← Repository README](../../README.md) · [Application components](../../docs/ea/4_application/2_application-components.md)_

## Purpose

The Next.js **App Router** pages, layouts and server actions — the part a
person actually touches.

Deliberately thin. A page loads data through [`src/data/`](../data/README.md),
asks [`src/web/`](../web/README.md) what to show, and renders the answer. If
a component here is making a judgement, that judgement is in the wrong
place: move it to `src/web/`, where it can be tested without a browser.

## Key dependencies

**Depends on:** [`src/data/`](../data/README.md) for every read and write,
[`src/web/`](../web/README.md) for every decision,
[`src/domain/`](../domain/README.md) for types, and React and Next itself —
which the two pure layers may not touch.

**Depended on by:** nothing in this repository. This is the top of the
stack; Vercel serves it.

**Two constraints worth knowing before editing:**

- **`'use server'` modules may export only async functions.** Next throws on
  a bad export at *request* time, not always at build time — a module reached
  solely through a client component passes `next build` and then fails on the
  first request, which is how a broken sign-in page once shipped past a green
  build. `python3 scripts/check_server_actions.py` is the gate.
- **`npm run build` is the only check of typed routes.** A broken
  `redirect()` target or `<a href>` is invisible to `tsc` alone, because the
  route types do not exist until Next generates them.

## Layout

| Route | For |
| ----- | --- |
| `page.tsx`, `layout.tsx`, `_components/` | The front door, the masthead, the identity rail and role switcher, and the Assistant's surface — which offers exactly two controls, *use it* or *dismiss it*, and no third |
| `registrar/` | The club-facing application: the season queue, a registration's detail with every rule's outcome, players, teams, fixtures, match officials, designations, governance, duplicates, submission packs, invitations, season requirements and access |
| `me/` | The person-facing shell — one record through five role workspaces (player, coach, referee, guardian, committee), one active role at a time (BR61) |
| `register/`, `join/[token]/` | Registration capture: by a club officer, and by a family through an account-free invitation link (BR72) |
| `sign-in/`, `set-password/`, `auth/callback/` | Session, first-arrival password (BR98), and the magic-link landing that turns an emailed link into a claimed membership |
| `platform/` | The platform owner's console: provisioning a club, and its licence. **Provisions but never reads** a club's data ([decision 9](../../docs/decisions/9_platform_administration_provisions_but_never_reads.md)) |
| `unsubscribe/[token]/` | Stopping the email (BR128). No session, and **nothing read before the person acts** — the page does not say whose address it is, which club sent the message, or whether the link is valid, because confirming an address is on a list is itself a disclosure |
| `demo/` | The demonstration door — an email address, read-only rights, marketing consent asked separately and never as a condition (BR91–BR93) |

An `actions.ts` beside a page holds that page's server actions; a
`*Form.tsx` or `*Panel.tsx` is its client component.

## Where the architecture lives

[`docs/ea/4_application/2_application-components.md`](../../docs/ea/4_application/2_application-components.md)
names every screen and what it provides;
[`docs/ea/4_application/1_application-services.md`](../../docs/ea/4_application/1_application-services.md)
says how much of each capability is actually real.
