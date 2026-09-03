# Project Scope — Onboarding a Club, and Its History

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/tenant-provisioning-and-historical-data`.
**Status: documentation only, with one exception — the demo tenant of
section 5 is built.**

Five decisions taken August 2026 about how a club becomes a customer, and
what happens in the hour after it does. Recorded now so the second club is
not an excuse to invent a different answer than the first.

## 1. Who authorises a tenant

**The platform owner, and only when a customer signs a contract with them
directly.** No self-service, no trial that becomes real, no federation
creating clubs on a club's behalf.

The mechanism is an **owner-issued onboarding link** — single-use, expiring,
revocable, stored as a hash — generalising
[decision 6](../decisions/6_public-registration-through-a-scoped-function.md)
one level up. Recorded as
[decision 7](../decisions/7_tenant-provisioning-by-owner-issued-invitation.md),
with the reasoning and the options rejected.

Until it is built, provisioning stays the hand-run sequence in the
[tenant provisioning annex](../annexes/tenant-provisioning.md). That is the
right amount of machinery for one club.

## 2. Central super-administration

**Reserved to `jsuarez@datamanagementengineer.com`.**

Two things about that need saying plainly.

**That account does not currently exist.** On 23 August 2026 it was renamed
to `admin@northstarfc.com.au` at the club's request, and it is the *only*
auth user in the project. So today one account is simultaneously the
platform owner, North Star's admin and North Star's registrar.

**Those should be different accounts, and the reason is P5.** A super-admin
is a legitimate cross-tenant reader — the first since P6's carnival
exception. If that capability is ever attached to an account that also holds
`club_membership` rows, the exception becomes invisible: nobody reviewing
the account can tell which of its powers came from being a club admin and
which from being the platform. The recommendation is a **separate identity
holding no club membership at all**.

Nothing is built. **Central super-administration remains unbuilt and needs
its own decision record before it is**, because it is a P5 exception and
this project has only ever granted one of those deliberately
([decision 3](../decisions/3_public-event-data-crosses-tenant-isolation.md)).

Worth repeating from decision 7: **provisioning does not require it.**
Creating a tenant needs no ability to read another tenant.

## 3. The website

**Explain, qualify, capture. Never provision.**

The marketing surface describes what the platform is and how it works,
qualifies a club, and captures interest. It writes to a prospect record
**outside the club-scoped world**, or to nothing at all — so it carries no
tenancy surface and no P5 exposure.

Keep it in the existing application rather than a second deployment: `/` is
already public and prerendered, and the session lookup is deliberately
scoped to `/registrar` so it stays that way.

## 4. The real work: a club's history

This is the substantial one, and it is where a sale is won or lost.

A club signs because it wants **its previous years back** — statistics,
dashboards, and the sense that changing systems did not cost it its own
past. So onboarding needs an **export/import mechanism for players**, not
just an empty tenant.

### What this changes in the architecture

**C9 is restated.** It currently reads *"read-only extraction of **the pilot
club's** multi-year data into a RAW → STAGING → unified model pipeline"* — a
one-off exercise, with an extraction account on the club's own source
systems (P2). It becomes a **repeatable onboarding step driven by a
club-supplied export**, because:

- The club supplies its own export rather than granting system access.
  Majestri bulk export is confirmed available ([#33](./open-questions.md),
  scope 16), and **BR68** says the club owns its data and may export it on
  demand.
- That also sidesteps **BR53** entirely. A club exporting its own data and
  handing it over has an unambiguous authorisation basis, unlike anything
  extracted from Squadi.

**C8 (reporting & dashboards)** is what the imported history is *for*, and
is unbuilt.

### The rule that has to exist before any import runs

**BR90 — imported history is history.** A registration imported from a
previous year is marked as historical and:

- **never enters the registrar's queue**,
- **is never included in a submission pack** (BR58–BR60),
- **never triggers document or fee chasing** (BR2, BR3),
- **never counts toward eligibility** (BR43, BR79).

Without it, importing three seasons for a 700-player club floods the queue
with two thousand registrations that look like work, and the first
submission pack tries to register the class of 2023 with the federation.
This is the single most damaging thing a naive import could do, and it would
look like a successful migration right up until the pack went out.

### The traps, recorded before anyone hits them

**Identity at import scale is a different problem.** P1 says a player who
played in 2023 and registers in 2027 is one Person — that is exactly the
value a club is buying. But **BR44** confirms there is no shared external
key (SQUADI dropped the FA ID in March 2025 and it has not returned), so
matching is name, date of birth and email. The four duplicate Karens took a
human a minute each; 2,000 rows across three seasons will not. **BR5's
"never merge silently" holds, and the resolution screen built in scope 24 is
sized for a handful, not a migration.** Something has to give, and it must
not be the rule.

**Importing five years of children's data is a privacy decision, not a
data-engineering one.** BR40 caps an inactive person's record at two years
archived; the [retention schedule](../annexes/retention-schedule.md) is
drafted and not legally reviewed; [#30](./open-questions.md) is open. A club
handing over a decade of records does not by itself give the platform a
lawful basis to hold them. **This needs answering before the first import,
not after**, and it is the reason this scope document exists rather than a
migration script.

**A historical registration has no consent record.** BR48 requires a
recorded collection notice, granted by a person with authority. Imported
rows have none — the club held them under whatever basis it had. They can be
imported as history without inventing a consent that was never given, which
is another reason BR90's read-only framing matters.

## 5. The demo tenant *(built)*

**Agreed, and built** — `supabase/demo/seed.sql` and `teardown.sql`, with
`supabase/demo/README.md` listing what each fictional family demonstrates. One permanently-seeded club with obviously
fictional data, so a prospect can see the product working rather than an
empty shell.

Design constraints, so it does not become a liability:

- **It is a real tenant**, and P5 protects it exactly like any other. It is
  not a special mode, a bypass, or a flag on the application.
- **Obviously fake data only.** Never a real child, never a real card
  number, never a real family's contact details — not anonymised production
  data, which is a different and worse idea.
- **One shared demo, not a trial per prospect.** Per-prospect trials are
  real tenants with real lifecycles, and they demonstrate an empty club,
  which is the opposite of the pitch.
- It should show the parts that are hard to describe in prose: a blocked
  registration explaining *which rule* and *why*, a voucher awaiting
  verification, an uncleared coach, an overdue AGM.

**How a prospect gets in *(built)*.** An email address, an optional phone
number, no password and no account: the visitor takes an anonymous Supabase
session and is granted a **read-only `viewer` membership** of the demo club.
That keeps the demo inside the security model rather than beside it — no
`anon` read policy, no second query path, **no P5 exception**. Recorded as
[decision 8](../decisions/8_demo_access_by_anonymous_session_and_a_read_only_role.md)
with BR91 and BR92, and proved by `supabase/tests/20_demo_front_door.sql`.

This is the *capture* third of section 3 arriving before the rest of the
website, which is the right order: the demo is the thing worth capturing
against.

**Marketing consent is asked at the same door and is not the price of
entry** (BR93). An unticked box, the wording stored with the moment rather
than a boolean, and the same demonstration club either way — the shape of
BR57 one level out, because a permission bundled into getting the thing you
came for was never freely given. The wording is
[annex §4](../annexes/consent-wording.md); the record is columns on
`prospect` rather than rows in `consent`, since a prospect is not a Person
and belongs to no club.

**Nothing sends anything yet.** There is no unsubscribe link because there
is no mailing mechanism, and the wording says *reply to any message*
instead of naming one that does not exist. Before the first bulk send, that
section needs re-drafting and a one-click unsubscribe stops being
optional.

## EA alignment (assessed top-down; nothing implemented)

| Layer | Impact when this is built |
| ----- | ------------------------- |
| 1_strategy | **C9 restated** from pilot-club extraction to repeatable club-supplied import. **C10** gains a concrete provisioning shape and keeps super-administration unbuilt. No new capability |
| 2_business | **BR89** (a tenant is created only on the owner's authorisation, evidenced by a signed contract, through a single-use link) and **BR90** (imported history is history). The historical data consolidation process is restated around a club-supplied export |
| 3_information | A historical marker on registration, a club onboarding invitation, and a prospect record outside the tenant world |
| 4_application | The onboarding redemption function, the import pipeline, C8's dashboards, the demo seed |
| 5_technology | No change. Same stack; the demo tenant is data |

## What happens next, in order

1. **Answer [#30](./open-questions.md)** — what may lawfully be retained.
   Everything in section 4 waits on this, and no import should run before
   it.
2. ~~Build the demo tenant.~~ **Done.** It was independent of everything
   else and is a seed script rather than a feature, which is why it went
   first.
3. **Formalise provisioning** as one idempotent function replacing the
   annex's four hand-typed statements — same elevated route, repeatable and
   impossible to half-complete.
4. **Build the onboarding link** when the second or third club makes hand
   provisioning tiresome.
5. **Then the import**, once 1 is answered and the duplicate-resolution
   question below has one.

## Open questions

**#56 — How is duplicate resolution done at migration scale?** BR5 forbids
silent merging and the screen from scope 24 handles pairs one at a time.
Three seasons of a 700-player club will produce far more candidate pairs
than that is sized for. Options not yet weighed: confidence tiers with a
bulk-accept for exact email-and-date-of-birth matches; blocking the import
until a club confirms a canonical roster; or treating each imported season
as its own person-space and reconciling lazily. **What must not give is
BR5** — a wrong merge at import scale attaches one child's history to
another, silently, thousands of times.

**#57 — What lawful basis covers imported historical data, and for how
long?** Distinct from [#30](./open-questions.md), which asks what the
platform may retain about its *own* records. This asks what a club may hand
over about children who have long since left, and what the platform may then
do with it. BR68 says the club owns its data; it does not say the club may
give a decade of it to a processor.
