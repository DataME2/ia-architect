# Project Scope — A Club Says It Is Interested

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

[Scope 28 §3](./28_onboarding-a-club-and-its-history.md) specified the
marketing surface in one line — **explain, qualify, capture; never
provision** — in August 2026. Only *capture* was ever built, and only as a
side effect: the demonstration door records an email address and a phone
number, and nothing at all about the club that address belongs to.

So a cold enquiry arrived as an address with no club attached. It could not
be researched, prioritised, or replied to with anything but a round of
questions the club had to answer before anything useful was said. This
initiative builds *qualify*.

## The thing that was actually broken

**The leads were never readable.**

`prospect` denies every API request in both directions — correctly, because
the record must stay outside the tenant world (BR92) and it is isolated by
having no API surface rather than by a tenant column. But nothing in the
application has ever read it. Every prospect captured since migration 0013
has been visible only to somebody with a `psql` prompt.

A capture surface whose output nobody can open is a form, not a feature. So
`app_enquiries()` and the console panel that reads it are the load-bearing
half of this change rather than an addition to it, and the panel sits
**above** the provisioning form because that is the order the work actually
happens in: a club enquires, a conversation happens offline, a contract is
signed, and only then is a tenant provisioned.

## The question this initiative answers once, in writing

**"Can a club get an access code and let itself in?"** No — and the reason
is commercial before it is technical.

[Decision 7](../decisions/7_tenant-provisioning-by-owner-issued-invitation.md)
settled it in August 2026: the first year is **A$12,000 including
onboarding, migration and configuration**, every sale is a **mid-season
displacement of an incumbent**
([decision 5](../decisions/5_replace-the-incumbent-rather-than-integrate.md)),
and the buyer is a **committee**, which decides in a meeting and records it
in minutes. Nobody puts that on a signup form. And an empty tenant is worth
nothing to a prospect anyway — the value is *their* data migrated, which is
the one thing a self-serve flow cannot deliver.

That answer is now **BR145** rather than a decision somebody has to go and
find, because the request recurs: an interest form invites "and let them in
while they are here" as its obvious next feature. The public page says so in
its own words — *why there is no "start free trial"* — because the absence
of a button is not an explanation, and a club that expected one should not
conclude the product is half-built.

The same reasoning fixed the one card in the product that dead-ended: a
person signed in and belonging to no club was told what they could not see
and given nowhere to go. They now get the conversation, which is the honest
exit, rather than a code field implying a door that does not exist.

## Why the form asks more than the demonstration door does

BR91 settled the demonstration door at one required field, with the
reasoning that *every additional required field is a prospect who closed the
tab*. That does not simply carry over, and **BR144** says why.

Typing your club's name into an enquiry form is a **higher-intent act** than
looking at a demo. The club has already decided to start a conversation, and
asking nothing wastes it. So the form asks six more things — jurisdiction,
the enquirer's role, the club's size, what they run today, a note, a phone
number — and **requires none of them**. Required stays at two: the club's
name and somewhere to reply. A half-filled form that refuses to send is the
same closed tab, arrived at by a different route.

*What do you use today* is the single most load-bearing question on it.
Decision 5 makes this product a replacement rather than an integration, so
the answer decides what the migration actually is — not merely who the
competitor was.

## One lead list, not two

The enquiry **extends `prospect`** rather than adding a `club_enquiry`
table. A club that looked at the demonstration club in March and enquired in
July is one lead with fresher facts, not two rows in two lists — the same
reasoning that made `prospect_email_idx` unique in 0013, applied to a second
door.

Two consequences fall out of that, both of which the behavioural suite
asserts:

- **A blank field never erases what an earlier visit supplied.** A returning
  enquirer who skips the phone field has not withdrawn their phone number.
- **BR93: silence is not withdrawal.** An unticked consent box on a second
  visit is not a withdrawal of consent given on the first. Somebody who did
  not notice a checkbox has withdrawn nothing, and inferring withdrawal from
  silence is the same mistake as inferring consent from it.

Breaking the second of those during testing was refused by **0014's own
constraint** — consent without its words is not evidence, so the pair
travels together or not at all — before the test assertion was reached. The
schema caught it, which is the better outcome.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No new goal, capability or principle.** This realises the *qualify* third of scope 28 §3, which has been in the plan since August 2026. No principle is touched: a prospect has no tenant, so P5 is not in play |
| **2_business** | **Two new rules: BR144** (an enquiry asks about the club and requires almost none of it) and **BR145** (recording interest grants nothing). No new business service — this is the marketing surface scope 28 §3 already described |
| **3_information** | **No new data object.** `prospect` gains eight nullable columns; it stays outside the club-scoped world and keeps no `club_id`, which the suite asserts against `information_schema` because the whole isolation argument rests on it |
| **4_application** | New: `record_interest()` and `app_enquiries()`, `src/web/enquiry-form.ts` (pure), `src/data/enquiries.ts`, the public `/interest` page, and the console's enquiry panel — **the first thing in the application to read `prospect` at all** |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | A cold enquiry was an email address with no club attached, captured only by visiting the demonstration club, and readable by nobody through any interface |
| **Target** (delivered) | A club describes itself in two required fields and six invited ones; the owner reads the list in the console, ordered by who has actually asked; and the answer to *can we just sign up* is written down rather than re-argued |

## Work packages and deliverables

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | BR144 and BR145 in the business rules | **Delivered** |
| **WP2** | Migration 0037: eight columns, `record_interest()`, `app_enquiries()` | **Delivered** |
| **WP3** | `supabase/tests/40_club_enquiry.sql` — eight scenarios, **verified to fail** | **Delivered** |
| **WP4** | `src/web/enquiry-form.ts` and its eleven tests | **Delivered** |
| **WP5** | `/interest` — the public page, static, no session lookup | **Delivered** |
| **WP6** | The console's enquiry panel, above provisioning | **Delivered** |
| **WP7** | Routes in from the landing page and from the dead-ended no-membership card | **Delivered** |

## What this initiative does not do

- **No marketing content.** *Explain* is still unbuilt: there is no pricing
  page, no feature tour and no case study. `/interest` assumes a visitor who
  already knows roughly what this is.
- ~~**No notification.**~~ **Closed by
  [scope 45](./45_telling_somebody_a_club_asked.md)**, which also had to
  settle why C7's send path is the wrong machinery for it: an operator alert
  is not a message to a data subject (BR146).
- **No status on a lead.** No contacted/qualified/lost, no next action, no
  owner. This is a list to read, not a CRM, and it should stay one until
  somebody is actually working leads through stages.
- **No self-service provisioning**, deliberately and permanently as things
  stand — BR145 and decision 7.
- **No verification of the address.** Same reasoning as BR91: sending to it
  is what proves it, and a false one costs a row.
