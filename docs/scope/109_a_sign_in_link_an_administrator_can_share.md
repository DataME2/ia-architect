# Project Scope — A Sign-In Link an Administrator Can Share

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/share-a-sign-in-link`.

[Scope 107](./107_a_join_page_to_share_when_a_workspace_link_goes_astray.md)
gave staff the join page to send when a workspace link goes astray. The
product owner tried it (October 2026): the join page emails the person a
link, which is fine, but it is still email. They asked for **the person's
own unique link, generated from the administrator's session on
`/registrar/access`**, to send by any channel. The join page itself is to
stay as it is.

So BR180 is revised. The risk scope 107 named is unchanged: whoever opens
the link is signed in as the person. What changes is that the link is only
made for an account **nobody has used yet**, whose first sign-in can open
**nothing at another club**. Every link made is recorded with who made it.

- **An account already in use is refused.** If it has signed in before, or
  holds any membership, person link or platform role, a link would hand
  over somebody's working account. Resend still emails them.
- **Another club's waiting access is refused.** A first sign-in claims
  everything addressed to that email at every club (`claim_club_access`
  and the three workspace claims). An administrator who put another club's
  contact's address on a Person could otherwise claim that club's access,
  which P5 forbids.
- **A click, not a visit.** The link opens `/welcome`, which signs in only
  when the person presses Continue. A chat app that fetches the address to
  draw a preview would otherwise use up the single-use link before the
  person sees it. `/welcome` also refuses while somebody is signed in, so
  an administrator testing the link does not become the member by
  accident.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** P1 and P5 hold: the guards above keep a link to one account's first arrival at one club |
| 2_business    | **[BR180](../ea/2_business/5_domain-context-and-rules.md) revised:** an administrator may create a person's single-use sign-in link on `/registrar/access`, for a workspace invitation not yet opened, when the account has never signed in, holds no access and no other club is waiting for its address. Each link created is audited. The join page stays, and is still all a registrar shares |
| 3_information | **No new data object.** A new `audit_event` action, `workspace.link-created`, with the email in `detail`. The link itself is never stored or logged |
| 4_application | **Changed.** A *Create a link to share* button on `/registrar/access`; `workspaceLinkAction`; `src/data/sign-in-link.ts` and `src/web/sign-in-link.ts`; the `/welcome` page; the claims after sign-in moved to `src/app/auth/arrive.ts` and shared with `/auth/callback`. Row updated in [application components](../ea/4_application/2_application-components.md) |
| 5_technology  | **Changed.** The first server action to use the service-role key: `createAdminClient('sign-in-link')` calls Supabase's `auth.admin.generateLink`, which makes a link without sending email. `SUPABASE_SERVICE_ROLE_KEY` is now needed wherever the button is used, local development included ([deployment](../ea/5_technology/2_deployment.md)). No migration |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | An unopened workspace link shows Resend and the join page's address. Either way, the person gets their link by email |
| **Target** | The administrator presses *Create a link to share*, copies the person's own link and sends it by any channel. The person presses Continue on `/welcome`, chooses a password (BR98) and lands in their workspace |

## Work packages and deliverables

### WP1 — Making the link

- **Deliverables:**
  - `workspaceLinkAction` in `src/app/registrar/access/actions.ts`. It
    calls `reissue_workspace_invitation` first, the gate Resend already
    uses: an administrator or registrar of the person's club, an
    invitation not in use, re-addressed to the current email, and audited.
    Then it makes the link and records `workspace.link-created`. No audit
    row means no link.
  - `src/data/sign-in-link.ts`, the one service-role call. It checks for
    access waiting at another club, generates the link, then checks the
    account. It fails closed on any error.
  - `src/web/sign-in-link.ts`, with its tests: the refusal rules, the
    accepted link types and the `/welcome` address.
  - `src/data/client.ts`, the new bypass reason `sign-in-link`.
- **Outcome:** a link the administrator can send, made only where it opens
  one new account at this club.

### WP2 — Arriving through it

- **Deliverables:**
  - `src/app/welcome/page.tsx` and `actions.ts`. The page explains, and
    Continue calls `verifyOtp` with the token hash.
  - `src/app/auth/arrive.ts`, the four claims and the landing, now shared
    by `/auth/callback` and `/welcome`.
- **Outcome:** the person is signed in once, their invitation is claimed,
  and they choose a password.

### WP3 — The screen

- **Deliverables:** in `src/app/registrar/access/AccessForms.tsx`, *Create a
  link to share* replaces the join page box next to an unopened workspace
  link. It shows the link, a Copy button, and what the link does.
- **Outcome:** one press, one copy.

### WP4 — Docs

- **Deliverables:** this document and its index row; BR180; the club access
  management and configuration rows; the service-role key row in
  deployment; `.env.example`.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| A shareable link on `/registrar/access`, for administrators | The same on a registration's workspace panels, which keep the join page (registrars too) |
| Refusing an account in use, or one another club is waiting for | A link for an account already in use (Resend emails it) |
| `/welcome`, signed in by a click | Sending the link by SMS or WhatsApp from the platform |

## Gap notes

- **It expires.** The link lasts as long as Supabase Auth's email OTP
  expiry (one hour by default, set in the Supabase dashboard). A longer
  window is a dashboard setting, and a longer life for a credential.
- **A new link cancels the last one.** Supabase keeps one pending link per
  account, so making another, or pressing Resend, stops an earlier link
  working, whether it was emailed or shared.
- **An administrator can still misuse it on purpose**, by opening the link
  in another browser. The audit trail records who made which link and
  when. Closing this completely means not showing the link at all, which
  was scope 107's position.
- **Local development needs the key.** Without `SUPABASE_SERVICE_ROLE_KEY`
  the button says so, and Resend still works.
