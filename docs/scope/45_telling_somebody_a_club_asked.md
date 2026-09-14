# Project Scope — Telling Somebody a Club Asked

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

[Scope 44](./44_a_club_says_it_is_interested.md) shipped with a gap named in
its own *what this does not do*: an enquiry landed in the table and **nothing
told anybody**. The owner had to open the console. That is a large
improvement on a `psql` prompt and it is not a notification — a lead nobody
looks at for a week is the failure scope 44 existed to fix, arrived at one
step later.

This closes it. The initiative is small; the interesting part is what it
declines to reuse.

## Why C7's send path is the wrong machinery here

The obvious move is `sendMessage` — it composes, suppresses, sends and logs,
and it already works. It fits this badly, and **the schema says so before
any argument does**: `message_log.club_id` is `not null`, and there is no
club.

Nothing else fits either. A prospect belongs to no tenant (BR92). The
platform owner is a member of no club. Neither has a `message_subscriber`
row, and neither has a Person to hang one on. Three of C7's mechanisms —
suppression, the unsubscribe link, the log — are about a **data subject**
receiving mail about themselves, and the recipient here is the platform's
own operator being told about their own business.

So **BR146**, which settles it rather than leaving the next person to widen
`club_id` to nullable:

> A message to the platform's own operators is not a message to a data
> subject. It carries no unsubscribe link, is not written to `message_log`,
> and carries nothing from inside any club.

The unsubscribe clause is the one worth spelling out. BR128 requires the
link in every message, and it exists so somebody can stop mail **about
themselves**. An unsubscribe link on an operational alert would let an
operator switch off the only signal that a customer is trying to reach them
— which is the failure this initiative is fixing, rebuilt as a feature.

The third clause is a guard on [decision 9](../decisions/9_platform_administration_provisions_but_never_reads.md).
The day this shape is reused to tell an operator something that happened
*inside* a tenant is the day platform administration starts reading tenant
contents. An enquiry is safe to send **precisely because** a prospect has no
club.

The type system carries the rule too: the alert is deliberately **not** a
`MessageTemplate`, because that type composes against a context holding a
`clubName` and an `unsubscribeUrl` and this message has neither. Making it
fit would have meant inventing a club name and a dead link. What *is*
reused is the transport — the part worth sharing, so changing provider
still changes one implementation (BR129).

## Why the alert is sent before the row is written

The alert's whole content comes from the form the visitor just submitted, so
it needs nothing from the database. Sending first lets the outcome be
written by **the same call that creates the lead**.

The alternative is a second public function whose only job is to mark a row
as notified — and it would have to be granted to `anon`, because the enquiry
path is anonymous by definition. That is an anonymous stranger writing a
delivery record into a sales log. There is no such function, so there is no
such surface.

The failure this ordering risks is the alert arriving for a lead whose row
did not save. That is the harmless direction: the alert carries the club's
details, so nothing is lost. The reverse — recorded, nobody told — is the
gap being closed.

**Rejected: `pg_net` and a trigger that posts to the provider.** It makes
the send atomic with the insert, and it puts an outbound HTTP call inside a
transaction a public function opens — a provider timing out would hold a
lock and fail the enquiry the club came to make.

## Three states, not two

A failed alert must look different from one that was never attempted, or a
provider outage reads as a quiet week. So the prospect row carries the
outcome pair 0030 established for `message_log` — what happened, and why
when it is not a plain success — with a constraint forbidding a row that
claims both.

That constraint earned itself during testing. Breaking the rule that *this
enquiry's alert outcome replaces the last one's* was refused by the
constraint before the test assertion was reached, because a coalesced
success plus a fresh failure is exactly the incoherent row it forbids. A
stale success here would be a lie about the message that matters: March's
delivered alert vouching for July's failure.

The console surfaces it twice — a count at the top of the panel, because an
alert that failed means somebody enquired and nobody was told and that is
not something to find by scanning, and a column per row.

## Where the address comes from, and why not from the database

`PLATFORM_ALERT_TO` is **configuration, not data**. Reading the platform
administrators' own addresses out of `platform_admin` would mean a public,
unauthenticated code path obtaining them — either through a function granted
to `anon`, which then discloses them to anyone who calls it, or through the
service-role client, which hands a **full Row-Level Security bypass to the
one path on the site that any stranger can reach**. Neither is worth a
convenience.

It is also the more accurate model: the address an enquiry should land at is
usually a shared inbox somebody watches, not the login address of whoever
happens to be on the allowlist.

Unset means no alerts, recorded as such — never a silent success, which is
`readTransportConfig`'s rule and the same reasoning.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** No new goal, capability, principle or actor |
| **2_business** | **One new rule: BR146.** The **Communications** business service gains a recipient class it did not have — the platform's own operators — which is why the rule is needed rather than an extension of BR127–BR131 |
| **3_information** | **No new data object.** `prospect` gains the outcome pair and a constraint pairing them |
| **4_application** | New: `src/domain/messaging/platform-alert.ts` (pure, and deliberately not a `MessageTemplate`), `alertPlatform` in `src/data/enquiries.ts`, `record_interest` and `app_enquiries` at v2, and the console's alert column |
| **5_technology** | **No change.** One new environment variable, no new dependency — the transport is the one C7 already configures |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | An enquiry was recorded and nobody was told. The owner found out by opening the console |
| **Target** (delivered) | The alert goes out as the enquiry is recorded, carrying what the club said; when it cannot, the row says so and the console counts it at the top |

## Work packages and deliverables

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | BR146 in the business rules | **Delivered** |
| **WP2** | Migration 0038: the outcome pair, its constraint, and both functions at v2 | **Delivered** |
| **WP3** | `platform-alert.ts` and its ten tests | **Delivered** |
| **WP4** | `alertPlatform` — never throws, gives up after five seconds, and six tests that prove it | **Delivered** |
| **WP5** | Suite 40 extended to ten scenarios, **verified to fail** on both new assertions | **Delivered** |
| **WP6** | The console's failed-alert count and per-row column | **Delivered** |
| **WP7** | `PLATFORM_ALERT_TO` in `.env.example`, with why it is configuration | **Delivered** |

## What this initiative does not do

- **No retry.** A failed alert stays failed and is surfaced rather than
  re-attempted. Retrying needs somewhere to queue from, and nothing in this
  product runs on a schedule yet — the same missing piece that leaves
  [scope 37](./37_forgetting_and_the_reasons_not_to.md)'s retention review a
  button rather than a nightly job.
- **No alert for a demonstration-club visit.** Only an enquiry alerts;
  somebody looking at the demo does not. That is a judgement about volume
  rather than a rule, and it is the first thing to revisit if the demo
  starts producing the better leads.
- **No digest, no channel but email.** No Slack, no SMS, no daily summary.
- **Still no notification of anything inside a club** — and BR146's third
  clause says that stays true, because the moment it does not, decision 9 is
  gone.
