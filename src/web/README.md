# `src/web/`

_[← Repository README](../../README.md) · [Application components](../../docs/ea/4_application/2_application-components.md)_

## Purpose

**What the screens decide** — not what they look like.

Which pile a registration belongs in, what is wrong with a submitted form,
which rule is costing the club the most, what a guardian's household card
may claim about a child, where a sign-in should land. Each is a pure
function here; the `.tsx` in [`src/app/`](../app/README.md) renders the
answer and little else.

The reason is testability, and it is not academic. A card reading
"Registered" over a child who cannot take the field is a BR79 failure that
**would look completely fine in review**. As a pure function it fails a test
instead, in the same `node --test` run as the domain — no browser, no
database, no rendering.

**The rule of thumb:** if a screen has to *decide* something, the decision
comes here and the component renders it.

## Key dependencies

**Depends on:** [`src/domain/`](../domain/README.md), and nothing else.

**Depended on by:** `src/app/` — pages, layouts and server actions.

**Same enforced constraint as the domain:** no React, no Supabase client, no
DOM. `tsconfig.domain.json` compiles this directory with no DOM library, so
`document.`, `window.` or a React import fails `npm run typecheck` rather
than waiting for a reviewer. `photo-crop.ts` is the instructive case — image
cropping that must run in a browser, written as pure geometry so the part
that can be wrong is the part that is tested.

## Layout

Roughly one module per screen or per decision, with its `*.test.ts` beside
it:

| Module | Decides |
| ------ | ------- |
| `queue-view.ts` | How the registrar's season queue groups, and what each pile is waiting on |
| `registration-form.ts`, `registration-form-state.ts`, `prospect-form.ts`, `enquiry-form.ts` | Parsing and validating what a form actually submitted. The last two are the same shape one door apart, and the difference is the design: the demonstration door requires one field because a visitor who only wants to look has decided nothing (BR91); an enquiry requires two and invites six, because typing your club's name has already decided something (BR144) |
| `form-result.ts` | The one shape every action hands back — `idle \| ok \| error`, **always with a message**, because silence is not a success state |
| `household-view.ts`, `me-view.ts`, `role-context.ts` | The person-facing surface: one record, one active role at a time (BR61, BR63, BR65) |
| `plan-view.ts`, `money.ts` | Instalment ledgers, arrears, and money formatted one way everywhere |
| `referee-view.ts`, `availability-view.ts` | The officiating roster and who may officiate what |
| `player-view.ts`, `team-view.ts`, `people-view.ts`, `governance-view.ts`, `access-view.ts`, `platform-view.ts`, `pack-view.ts`, `invitation-view.ts` | One screen's decisions each |
| `fixture-change.ts` | What changed about a fixture, in the words a participant reads (BR64) — computed from before and after, so a submit that changed nothing announces nothing |
| `privacy-view.ts` | Grouping retention proposals so the **irreversible** group is the only one with an action beside it — a life member listed like a lapsed player is how a club deletes its own history |
| `unsubscribe.ts` | Reading an unsubscribe link out of an inbox — mail clients wrap URLs and append punctuation, so what counts as a readable link is the part worth testing |
| `nav.ts`, `safe-destination.ts`, `password.ts`, `today.ts` | Cross-cutting: the club menu, where a redirect may legitimately go, password rules, and a timezone-correct "today" |

## Where the architecture lives

[`docs/ea/4_application/2_application-components.md`](../../docs/ea/4_application/2_application-components.md),
whose "three structural rules for the code" section states this separation
and why it is enforced by a compiler flag rather than by review.
