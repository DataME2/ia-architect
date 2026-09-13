# Project Scope — The Platform Learns to Send, and to Stop

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

Until now the platform has sent nothing. No email, no reminder, no
notification: every communication in the product is a human copying
something out of a screen into their own mail client. This initiative builds
capability **C7**, and it starts from the half that is not a feature at all.

**The demonstration door has been collecting marketing consent since
[scope 28](./28_onboarding-a-club-and-its-history.md), and there has been no
way to withdraw it.** Not a missing screen — a promise collected against and
not honourable. Every other absence in C7 is a feature nobody built yet;
this one is a commitment already made. So the order of work here is the
reverse of the obvious one: **the unsubscribe is built before anything that
would send.**

## What this initiative starts from

Three constraints shaped it before a line was written.

**Nothing may be sent that cannot be escaped.** BR128 requires the
withdrawal link in *every* message. That collides with the repository's own
token pattern — see [decision 12](../decisions/12_an_unsubscribe_link_is_derived_not_stored.md),
which is where the collision was settled rather than coded around.

**Suppression is the platform's, not a vendor's** (BR129). The convenient
answer is to let the email provider hold the unsubscribe list — it is free,
automatic, and wrong twice: the withdrawal would not survive changing
provider, and it would sit under the vendor's access rules rather than under
the policies that protect everything else a club holds (BR68).

**Marketing and operational contact are different purposes** (BR130). A
parent who leaves a newsletter has not asked to stop being told their child
is missing a birth certificate; a person who wants no contact at all must
not be told they may only refuse the newsletter. Conflating them produces
one failure or the other, and the second is the one a platform is tempted
into.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No new goal or principle.** C7 has been in the capability map since the strategy layer was drafted and serves **G5** (less manual administrative work, safely). P4 binds the template layer — a message about a minor is composed deterministically and never by an uncontrolled generative service |
| **2_business** | **Five new rules: BR127–BR131** — every message recorded including the suppressed ones; withdrawal without an account, honoured before the provider; suppression held by the platform; operational and marketing suppressed separately; a message carries only the recipient's own information. The **Communications** business service moves from Pending to realised |
| **3_information** | **Two new data objects** — `message_subscriber` (the contactable party and its suppression state) and `message_log` (append-only, recording sent **and** suppressed). The template's **version is recorded on the log** rather than in a table of its own: the wording lives in code, so a row holding a copy of it would be a second source of the same truth. `prospect` gains an unsubscribe salt so a prospect uses the same door as everyone else |
| **4_application** | C7 moves from *Not started* to *Partial*. New components: `src/domain/messaging/` (pure templates, recipient resolution, the suppression decision), `src/data/messaging.ts`, the transport adapter, `/unsubscribe/[token]`, and reminder composition on the registrar's queue |
| **5_technology** | **One new technology service: a transactional email provider**, behind an adapter so the choice is replaceable — which is BR129's requirement expressed in the stack. One new server-scoped secret, `MESSAGING_UNSUBSCRIBE_SECRET` (decision 12). No new runtime, no new host |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | The platform sends nothing. Marketing consent is collected at `/demo` with no withdrawal mechanism. BR42's coordinator notification, BR64's fixture-change notification, the registrar's reminders and the referee's claim approval are all unbuildable |
| **Target** (delivered) | A message can be composed, suppressed or sent, and is recorded either way. Anyone the platform has contacted can withdraw without an account, from any message ever sent to them. The registrar can send a reminder from the queue. Four notification points exist |

## Work packages and deliverables

### WP1 — The stop, before the send

- **Deliverables:** `supabase/migrations/0030_communications.sql` —
  `message_subscriber`, `message_log`, their RLS policies, and
  `app_unsubscribe()`; `src/app/unsubscribe/[token]/`;
  `supabase/tests/33_communications.sql`
- **Outcome:** BR128 and BR129 hold. A recipient can withdraw from any
  message, with no account, and the withdrawal is the platform's record.
  **Built first on purpose** — see the opening paragraph.

### WP2 — The pure half

- **Deliverables:** `src/domain/messaging/types.ts`, `templates.ts`,
  `suppression.ts`, `recipients.ts`
- **Outcome:** What a message *says*, who it goes to, and whether it may be
  sent are pure functions — testable without sending anything, and subject
  to the same DOM-free typecheck as every other rule.

### WP3 — The transport

- **Deliverables:** `src/data/messaging.ts`, the `MessageTransport`
  interface, the Resend adapter, and the send path that checks suppression
  **before** the adapter is reached
- **Outcome:** A message leaves the building, or is recorded as
  deliberately not leaving it. Unconfigured, the path **fails loudly**
  rather than reporting a success nobody received.

### WP4 — The registrar's reminder

- **Deliverables:** reminder composition on `/registrar` (the queue), and
  the guardian-reminder template built from the registration's own rule
  outcomes
- **Outcome:** BR127 and BR131 hold in the one flow that pays for this
  initiative: forty families, one screen, one send each, recorded.

### WP5 — The four notification points

- **Deliverables:** send calls at fixture change (BR64), referee withdrawal
  after acceptance (BR42), claim approval, and guardian reminder
- **Outcome:** The four rules stranded by C7's absence have somewhere to go.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Email | **SMS and push.** Push belongs with the mobile decision (BR64, C17); SMS buys little that email does not until a club asks |
| Suppression held by the platform | **Bounce and complaint handling.** A hard bounce should suppress; nothing consumes the provider's webhooks yet |
| A recipient's own information (BR131) | **Bulk campaigns.** Nothing here is a newsletter tool, and the marketing consent collected at the demonstration door still has no campaign to belong to |
| Templates as pure functions | **Template authoring by a club.** The wording is in code, reviewed like code |
| A send is a human act or a rule-triggered system act | **An AI drafting message copy.** BR15 and P4 permit a draft a human sends; not built, and deliberately not now — the first thing this platform sends should not be generated |

## Gap notes

- **Nothing consumes delivery feedback.** The provider knows a message hard-
  bounced; the platform does not, so a dead address stays on the list and the
  club believes it made contact. Closing it is a webhook endpoint and a
  suppression write — small, and it needs a production environment to be
  worth having.
- **No campaign concept, so the demonstration door's consent still has
  nowhere to go.** This initiative makes the consent *withdrawable*, which
  was the exposure. It does not make it *usable*. Both were true before; only
  one was urgent.
- **The wording lives in code.** A club cannot edit what a reminder says.
  `message_template_version` records which version was used so an old message
  stays explainable, but authoring is a later question.
- **Unconfigured means unsent, loudly.** With no provider credential the send
  path raises and the screen says so. That is deliberate — this repository's
  position since `FormResult` is that silence is not a success state — but it
  means the four notification points do nothing until a provider is
  configured.

## Open questions

- **[#73] Does suppressing *operational* contact need the club's
  acknowledgement?** BR130 lets a person stop operational email and shows the
  club that they cannot be emailed. Adopted: **the club is shown, and nothing
  is escalated automatically.** A registrar who sees "cannot be emailed" is
  expected to ring. The alternative — refusing to honour an operational
  suppression because the club needs to reach them — makes the withdrawal
  conditional on the club's convenience, which is not a withdrawal. Revisit
  if a club reports losing contact with a family this way.
- **[#74] Who may send a reminder?** Adopted: **any club officer whose role
  can already read the registration** — the message contains nothing they
  cannot already see. Not restricted to the registrar, because a small club's
  secretary does this work and inventing a permission for it would be the
  platform deciding the club's staffing.
