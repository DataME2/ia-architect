# Project Scope — A Join Page to Share When a Workspace Link Goes Astray

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/workspace-join-link`, cut from
`claude/club-dashboard-and-profiles` ([scope 106](./106_the_club_dashboard_the_club_profile_and_the_workspace_card.md)).

A workspace invitation is a Supabase sign-in link, emailed to the address
the club holds (BR126, BR150). When it lands in spam, or is opened after it
expires, the person is stuck. `/registrar/access` then says only *link
sent, not opened yet*. The product owner asked (October 2026) for **the link
to be visible to administrators and registrars**, so they can pass it on
some other way.

**The sign-in link itself is not shown, by the product owner's choice
between three options.** Whoever opens it is signed in as that person. A
registrar holding a guardian's link could enter a family workspace, which
breaks BR106's one human per account, and whatever they did there would be
recorded as the guardian's doing. It
also works once and expires within the hour, so it would go stale in a chat
anyway. What staff get instead is **the join page**: the address of a page
on which the person types the email the club holds and is sent a fresh link
of their own. The page signs nobody in, so it is safe to send by message.

The page already exists. Signed out, `/set-password` asks for an address
and sends a single-use link (BR98). Arriving through that link runs every
workspace claim in `/auth/callback`, so the invitation is claimed, the
person chooses a password, and they land on `/me`. It gives the same answer
whether or not the address has an account, so it is not a directory.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves the goal the invitation flow already serves: nobody waits on the platform owner to get in |
| 2_business    | **New rule [BR180](../ea/2_business/5_domain-context-and-rules.md):** staff never see or hold a sign-in link. When a workspace link goes astray, an administrator or registrar shares the join page, and the person asks for their own link at the address on record |
| 3_information | **No change.** Nothing is stored or read that was not before |
| 4_application | **Changed.** A **join page** box, with the address and a Copy button, next to an unopened workspace link on `/registrar/access` (administrators) and on a registration's workspace panels (administrators and registrars). Row updated in [application components](../ea/4_application/2_application-components.md) |
| 5_technology  | **No change.** No new route, dependency or secret. The server's secret key is not used |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | An unopened workspace link shows *link sent, not opened yet* and a Resend button. If email is the problem, resending changes nothing |
| **Target** | The same state also shows the join page's address with a Copy button, to send by any channel. The person asks for their own link, and the sign-in link never leaves their mailbox |

## Work packages and deliverables

### WP1 — The join page box

- **Deliverables:** `src/app/registrar/_components/JoinLink.tsx`, the
  address of `NO_CREDENTIAL_DESTINATION` (`src/web/safe-destination.ts`) on
  this site, with a Copy button. It is shown:
  - in `src/app/registrar/access/AccessForms.tsx`, under a person's
    workspaces when one is *link sent, not opened yet*;
  - in `src/app/registrar/[registrationId]/page.tsx`, under the guardian and
    player workspace panels when an invitation is unclaimed, for an
    administrator or registrar only.
- **Outcome:** a family whose email never arrived is one message away from
  their workspace, and nobody but them ever holds their sign-in.

### WP2 — Docs

- **Deliverables:** this document and its index row; BR180; the club
  access management row.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The join page's address, wherever an unopened workspace link is shown to an administrator or registrar | Showing or copying the sign-in link itself (BR180) |
| Reusing `/set-password` as the join page | A separate `/welcome` address with its own wording |
| — | Sending the join page by SMS or WhatsApp from the platform |

## Gap notes

- **The address reads `/set-password`.** The page explains itself (*Get a
  link to set your password*), and choosing a password is in fact the next
  step. A friendlier alias is a route and some copy if families find the
  word off-putting.
- **It only helps an address the person can read.** If the club holds the
  wrong email, the fix is still to correct it on People and resend. The
  join page cannot send a link anywhere else, by design.
- **An account must exist.** The first invitation creates it. If that send
  never reached Supabase, the join page sends nothing (and says the same as
  ever), and Resend is the way.
