# Let'sDataTalk — Implementation Tasks

_[← specs](./README.md) · [Requirements](./requirements.md) · [Design](./design.md)_

Every task references the **requirement** it satisfies (`R<n>.<criterion>`,
from [requirements.md](./requirements.md)) and, where the *how* was a
decision rather than an obvious step, the **design section** that settled it
(`D<n>`, from [design.md](./design.md)).

- `[x]` — implemented and working in the repository today
- `[ ]` — not implemented

**Completion state was read from the code in September 2026**, not from a
plan. 235 of the 277 tasks below are already `[x]`; the phases are ordered so
that the unchecked work reads as a queue.

**Testing is deliberately out of scope here.** The repository's existing
gates (`npm run check`, `scripts/test_rls.sh`) continue to run, but writing
tests for new code is a later stage and no task below asks for one.

> **A note on Phase 8 onward.** Under this repository's EA-first rule, an
> unchecked phase is not a licence to start coding: align the architecture
> layers, write the scope document, then implement. These tasks are the
> *queue and the shape*, not the approval.

---

## Phase 0 — Infrastructure as code and the build pipeline

**Outcome when complete:** a clone builds, typechecks, tests and proves
tenant isolation on a throwaway Postgres, with no cloud credentials.

### 0.1 Project skeleton
- [x] Next.js App Router + TypeScript, no build step for tests (Node 22 strips types) — *D2*
- [x] `tsconfig.json` strict, and `tsconfig.domain.json` compiling `src/domain/` + `src/web/` **with no DOM library** — *R13.2, D3*
- [x] `package.json` scripts: `dev`, `dev:alt` (port 3001, for side-by-side branches), `build`, `typecheck`, `test`, `check`, `check:full`
- [x] `.env.example` carrying variable names and no values — *D10*

### 0.2 Build gates
- [x] `scripts/check_rls.py` — fails the build if any table lacks RLS, a policy or a `club_id` — *R5.5, D9*
- [x] `scripts/test_rls.sh` — applies the real migrations to a throwaway Postgres and asserts isolation behaviourally — *R5.2–5.4, D9*
- [x] `scripts/check_server_actions.py` — no `'use server'` module exports a non-async binding — *D8.2*
- [x] `scripts/check_links.py` — every relative Markdown and HTML link resolves
- [ ] A gate that fails when a migration already merged to `main` is edited — *D10*
- [ ] A gate that fails a role-narrowed read policy shipped without an exclusion scenario — *R5.7, D9*

### 0.3 CI workflows
- [x] `code-check` — typecheck, tests, build, RLS coverage, server actions
- [x] `docs-check` — link check on Markdown and HTML
- [x] `rls-behaviour` — Postgres 16 service container, migrations applied, isolation asserted
- [x] Vercel preview deployment per pull request, pointed at the development project — *D10*

### 0.4 Environments
- [x] Development Supabase project, Sydney region — *D2, D10*
- [x] **Production Supabase project**, separate from development — *D10*. `ltd-production`, Sydney. **Nothing points at it yet**
- [x] A preview **refused** in code when it names the production project (*D10*) — keyed on `VERCEL_ENV`, which the platform sets, and inert until `PRODUCTION_PROJECT_REF` is filled in
- [x] Documented RPO, RTO and retention, and the procedure for the day a restore is needed
- [x] A restore **rehearsed on every change** — dump, restore into an empty database, count what came back, **policies first**
- [ ] One restore rehearsed against a **real** Supabase backup, and the answer to whether accounts survive it — **needs the owner**
- [x] `PRODUCTION_PROJECT_REF` filled in — armed before production is reachable, and a test drives the shipped constant so blanking it fails the build
- [ ] Per-environment variables set in Vercel (Production scope only) — **needs the owner**

**Manually testable:** `npm install && npm run check:full` passes on a clean
clone with no cloud credentials.

---

## Phase 1 — Backend: tenancy, identity and access

**Outcome when complete:** a club exists, its administrators can sign in,
and one club's data is provably invisible to another.

### 1.1 Tenant isolation — *R5, D6*
- [x] `club` as the tenant; `club_id` on every club-scoped table
- [x] RLS enabled in the same migration that creates each table — *R5.1*
- [x] Membership-based read policies (`club_membership`) — *D6.1(a)*
- [x] Role-narrowed read policies naming the roles the data is for — *R7.5, D6.1(b)*
- [x] Append-only tables expressed as the **absence of an update policy** — *R17.5, D6.1*
- [x] `platform_admin`, `user_password_set` unreachable through the API in both directions — *D7*

### 1.2 Person and roles — *R1, R2, D7*
- [x] `person` with legal names and `preferred_name` as separate first-class columns — *R2.1*
- [x] `person_role`, one row per role per season, overlapping by design — *R1.2–1.4*
- [x] `guardianship` carrying `is_authority` (to 18) and `is_contact` (beyond it) — *R1.1*
- [x] Age and minority helpers in `src/domain/types.ts`

### 1.3 Accounts — *R3*
- [x] `account_person`, unique in both directions, written only by an administrator — *R3.1–3.3*
- [x] `link_account_to_person()` — an assertion, never an inference from a matching email — *R3.4*
- [x] Unlinked accounts displayed as unlinked — *R3.5*

### 1.4 Duplicates — *R4*
- [x] BR5 candidate detection: shared email **and** date of birth is one human; shared email alone is not — *R4.1–4.2*
- [x] `merge_person()` with a human-chosen survivor and a tombstone — *R4.4–4.5*
- [x] An unresolved candidate forces the registration into the action queue — *R4.6*

### 1.5 Provisioning and licensing — *R6*
- [x] Atomic, idempotent club + first season + first administrator — *R6.1*
- [x] `club_contact` primary/secondary with `claimed_at` — access is claimed, never created — *R6.2–6.3*
- [x] First-sign-in password, never emailed — *R6.4*
- [x] `club_licence` as a dated term; renewal is a new term — *R6.6*
- [ ] **Enforce read-only on a lapsed licence** via `app_club_is_writable()` in the `with check` of every write policy — *R6.7, D11.5*
- [ ] Refuse removal of the second-last administrator — *R6.5*

**Manually testable:** provision a club from `/platform`, claim access from
the emailed link, set a password, and confirm a second club's registrar sees
nothing of the first.

---

## Phase 2 — Backend: registration, documents and validation

**Outcome when complete:** a family can register a child through a link with
no account, and the registrar has a queue that says what each one is waiting
on.

### 2.1 One creation path — *R8, D5*
- [x] `app_create_registration()` holding the process once, for both entry points — *R8.1*
- [x] Season checklist and fee stamped onto each registration at creation — *R8.2, R10.1*
- [x] Sibling guardian reuse, matched on normalised email within the club — *R8.4–8.5*
- [ ] Historical import marked as history: never queued, packed or chased — *R8.6*

### 2.2 The account-free family link — *R9, D6.2*
- [x] `registration_invitation` storing **only** the token hash — *R9.1–9.2*
- [x] `submit_public_registration()`, `security definer`, pinned `search_path`, tenant from the token — *R9.4, R9.7*
- [x] Unknown, revoked and expired tokens refused **identically** — *R9.5*
- [x] Reissue rather than reveal, because the token cannot be recovered — *R9.3*

### 2.3 Documents and consent — *R10, R11, R12*
- [x] `registration_document`, one row per requirement, none pre-satisfied — *R10.1*
- [x] Private Storage bucket with `club_id`-prefixed object paths and matching policies — *R10.3*
- [x] `consent` — one row per purpose, independently revocable — *R11.1–11.3*
- [x] Identification photograph cropped and re-encoded **in the browser**; the chosen file is never stored — *R12.1*
- [x] Database trigger refusing a photograph without unrevoked consent — *R12.2*
- [x] Transfer of consent, erasure, calendar and account rights at 18 — *R11.6*. Delivered by [scope 37](../docs/scope/37_forgetting_and_the_reasons_not_to.md)'s `app_transfer_authority`; this row stayed unchecked after R11.6 was marked implemented

### 2.4 The rules engine — *R13, D4*
- [x] `RuleId`, `RuleOutcome`, `RegistrationRule` — pure functions, no I/O — *R13.2*
- [x] BR1 guardian required, BR2 required documents, BR3 nothing outstanding, BR48 consent recorded, BR55 legal name verified — *R13.1*
- [x] `REGISTRATION_RULES` registry as the single point of comparison with the business layer — *D4*
- [x] `validation_result` persisting one row per rule, passes included — *R13.1, R13.4*
- [x] Status derived from outcomes, never assigned — *R13.3*

### 2.5 Submission — *R14, R15*
- [x] Immutable, versioned pack with a frozen manifest — *R14.1–14.2*
- [x] Preview showing exactly who is in and who is out, with reasons — *R14.3*
- [x] Handover recorded once, and never rewritten — *R14.4*
- [x] `submission_record.state` keeping *sent* and *registered* distinct — *R14.6*
- [ ] Eligibility exception where a player is in the club's records and absent from the governing body's — *R15.3*
- [ ] International Transfer Certificate path, including the 30-day provisional rule — *R15.4–15.5*

**Manually testable:** issue a link, register a child through it in a
private window, and watch the registration appear in the queue with its
blockers named.

---

## Phase 3 — Backend: finance

**Outcome when complete:** a treasurer can agree a plan, record payments and
vouchers, and a coach gets one answer to "can this child play".

### 3.1 Payment plans — *R16, D5.1*
- [x] Cent-exact schedule generation; the remainder lands on real instalments — *R16.1–16.3*
- [x] Deferred constraint trigger refusing a plan whose instalments do not sum to the total — *R16.4–16.5*
- [x] Partial unique index: at most one live plan per registration — *R16.6*
- [x] Cancellation with a recorded date, never deletion — *R16.7*
- [x] Final instalment on or before the season's end — *R16.8*

### 3.2 Payments — *R17*
- [x] Append-only by the absence of update and delete policies — *R17.1, R17.5*
- [x] Reversing entries naming what they reverse — *R17.2*
- [x] Oldest-first allocation computed at read time — *R17.3*
- [x] Treasurer/Finance Admin only, enforced by policy — *R17.4*

### 3.3 Vouchers — *R18*
- [x] `ATTACHED` reduces no balance; verification applies it as an ordinary payment — *R18.1–18.2*
- [x] Committee approval gates a voucher program — *R18.3*
- [x] Private bucket for voucher documents, `club_id`-prefixed — *R18.1*
- [ ] Automated verification against the issuing government's public interface — *R18.5*
- [ ] Invoice-level duplicate prevention and government claim tracking — *R18.6*

### 3.4 Eligibility — *R19, D8.3*
- [x] `mayTakeTheField` computed fresh from status **and** balance, never stored — *R19.1–19.4*
- [x] An ineligible player's appearance recorded and flagged, never refused — *R19.5*

### 3.5 Taking money
- [ ] Square integration: card capture, reconciliation, invoice objects — *R18.6*. Deliberately deferred; a treasurer records what arrived — *D12*

**Manually testable:** agree a $120.50 plan over three instalments, confirm
they read 40.17 / 40.17 / 40.16, record a partial payment, and see the queue
move the registration to "awaiting payment".

---

## Phase 4 — Backend: safeguarding, teams and governance

**Outcome when complete:** a person without a current clearance cannot be
put in front of children, and the committee is a record rather than a
memory.

### 4.1 Clearances — *R20*
- [x] `clearance` with `verified_at` separate from the card number — *R20.6*
- [x] BR83 trigger on `team_member`, firing on insert **and update** — *R20.1–20.2*
- [x] BR84 trigger on `person_role` for referee and coach, with the under-18 exemption — *R20.4–20.5*
- [x] Checked against the **end of the season**, not today — *R20.3*
- [ ] **Expiry withdraws the holder from every future assignment**, not merely blocks new ones — *R20.7*
- [ ] Register-linked re-verification as the primary mechanism — *R20.8*

### 4.2 Teams — *R20*
- [x] `team`, `team_member` — one row per person per team per role
- [x] `mayHoldRole` in the domain, mirroring the trigger so the screen can explain the refusal

### 4.3 Governance — *R21*
- [x] `committee_term` with `next_agm_due_on` as a column, deliberately — *R21.1–21.2*
- [x] Adult-at-term-start trigger — *R21.3*
- [x] WWCC gap surfaced, not blocking — *R21.4*
- [x] Resignation recorded, position never deleted — *R21.5*
- [ ] **Dated committee resolutions**, so approvals resting on committee authority point at one — *R21.6–21.7*

### 4.4 Player record — *R22*
- [x] `fixture`, `appearance` as counts with an entered-by and entered-at — *R22.1*
- [x] Totals stating the base they were computed over — *R22.3–22.4*
- [x] `player_profile` height/weight, season-scoped, readable only by the roles that pick teams — *R22.5–22.6*

**Manually testable:** try to add a coach with no verified clearance and be
refused by the database; promote a player row to a coach row and be refused
the same way.

---

## Phase 5 — Backend: referee management

**Outcome when complete:** a coordinator can classify officials, read their
availability, designate them with conflicts refused, and a treasurer can pay
them.

### 5.1 The referee record — *R23, D7*
- [x] `referee_profile` on an existing Person — *R23.1*
- [x] `referee_classification` as **dated history**, never an overwritten column — *R23.2–23.4*
- [x] `referee_accreditation` checked against the fixture date — *R23.5*
- [x] `referee_suspension` blocking designation — *R23.6*

### 5.2 Availability — *R24*
- [x] `referee_availability` and `referee_unavailability` as two tables, because "has not said" and "has said no" differ — *R24.1–24.2*
- [x] A negative response requires a reason, visible to the coordinator — *R24.3–24.4*

### 5.3 Designations — *R25*
- [x] Blocking conflicts: player in the match, double-booking, classification, suspension, accreditation — *R25.1, R25.3–25.5*
- [x] BR109's wider reading — **any** other role in the fixture, coach or guardian included — *R25.2*
- [x] Warnings with audited overrides for affiliation, family, travel, load — *R25.6*
- [x] Appointing party recorded on every designation — *R25.7*
- [x] A decline is not recorded until a reason is given — *R25.8*
- [ ] **An under-18 official's designation is proposed to their guardian** — *R25.9*
- [ ] Decline-rate threshold and its consequence — *R25.10*

### 5.4 Referee finance — *R26*
- [x] `appointment_verification`; nobody verifies the match they were paid for — *R26.1–26.2*
- [x] `referee_fee_schedule` / `referee_fee_rate` as dated versions — *R26.4*
- [x] Claims storing the amount computed at claim time — *R26.3*
- [x] No claim for a cancelled match; explanation required for an abandoned one — *R26.5–26.6*
- [x] No double payment; batches closed before paid — *R26.7–26.8*
- [x] Remittance as a recorded fact; the platform never moves money — *R26.9*
- [x] Association-appointed fixtures generate no club claim — *R26.10*
- [ ] **The fee schedule editor** — schema and resolution exist, the screen does not — *R26.11*

**Manually testable:** designate an official who coaches one of the teams
and be refused; designate one from the same club and get a warning you must
override, then find the override in the audit log.

---

## Phase 6 — Frontend: the club-facing application

**Outcome when complete:** a registrar can run a season from the browser.

### 6.1 Shell and design system
- [x] Design tokens — colour ramps, semantic aliases, space, radius, elevation, type, motion — with a dark theme
- [x] Masthead, brand mark, identity rail
- [x] Club menu with the current destination lit, and the demonstration marker
- [x] Session strip: who you are signed in as, which club, every role held, and when the session began
- [x] `FormResult` — one shape for every action, rendering **success as well as failure** — *D8.1*

### 6.2 Registrar screens — *R8, R10, R13, R14*
- [x] Season queue grouped by what each registration is waiting on
- [x] Registration detail with every rule's outcome and its message
- [x] Season requirements: the document checklist and the fee
- [x] Registration links: issue, list, revoke, reissue — *R9.3*
- [x] People directory — one row per human with the roles they hold and who they are responsible for, both directions — *R1.2*
- [x] Duplicates: club-wide candidates and a human-chosen survivor — *R4.4*
- [x] Submission pack: preview, versioned generation, handover — *R14.3–14.4*
- [x] Player record, identification photograph cropper, fixtures — *R12, R22*
- [x] Teams and team officials with their clearance state — *R20*
- [x] Governance: terms, positions, lapsed mandate — *R21*
- [x] Access: who may act at this club — *R7.1*
- [x] Match officials roster and designations — *R23, R25*
- [ ] Fee schedule editor — *R26.11*
- [ ] Registration reminders sent **in bulk from the season queue** — *R34.1*. One-at-a-time already works: `ReminderPanel` on the registration detail fires `sendReminderAction`. What is missing is chasing forty families in one act, not chasing one

### 6.3 Platform console — *R6*
- [x] Provision a club; record its responsible people; manage its licence
- [x] Provisions but never reads a club's operational data — *R6.8*

### 6.4 Front door
- [x] Sign-in explaining what one sign-in gets you before anything is typed
- [x] Set-password on first arrival, and a way back if forgotten — *R6.4*
- [x] Demonstration door: email alone, read-only, marketing consent separate and refusable — *R6*, BR91–BR93
- [x] Assistant surface offering exactly two controls and no third — *R33.3*

**Manually testable:** run a full season end to end in the browser —
provision, invite, register, validate, plan, pay, team, designate, pack.

---

## Phase 7 — Frontend: the person-facing experience

**Outcome when complete:** a Person signs in once and sees their own record
through whichever role they are acting in.

### 7.1 Role context — *R30*
- [x] `resolveActive` — one active role at a time, explicit switching, never merged — *R30.1–30.3, D8.4*
- [x] Identity rail and role switcher, identical in every context so only the workspace redraws
- [x] `/me` shell deriving the role list from `account_person` — *R30.4*
- [x] Five workspaces — player, coach, referee, guardian, committee — each marking what is coming soon, named — *R30.5*

### 7.2 The family's household — *R31*
- [x] `app_my_family_person_ids()` reached through the session, never an argument — *R31.2, D6.1(c)*
- [x] Additive `_select_family` policies on twelve tables — a club officer's read unchanged
- [x] Guardian invitation refused by the database until a child is COMPLETE — *R31.3*
- [x] Household view: one card per child, reflecting the BR79 eligibility verdict — *R31.1, R31.4*

### 7.3 Mobile and offline — *R32*
- [ ] Read-only offline: next fixture, venue, kickoff, role — *R32.1, R32.3*
- [ ] Every cached view displays its last-synchronised time — *R32.2*
- [ ] Fixture-change notification to every affected participant — *R32.4*. Blocked on Phase 8

**Manually testable:** sign in as a guardian of two children at one club and
confirm you see both households and nothing else — then sign in as a
registrar of another club and confirm you see neither.

---

## Phase 8 — Communications *(built — [scope 36](../docs/scope/36_the_platform_learns_to_send_and_to_stop.md))*

**Outcome:** the platform can tell a family what is outstanding, and anyone
who consented to marketing can withdraw it.

> **It was built in the reverse of the obvious order.** The unsubscribe
> landed before anything that sends, because marketing consent had been
> collected at the demonstration door since scope 28 with no way to withdraw
> it — a promise collected against and not honourable, rather than a screen
> nobody wrote. *R34.5 is closed.*

### 8.1 Backend — *R34, D11.1*
- [x] `src/domain/messaging/` — pure templates, recipient resolution and the suppression verdict
- [x] `message_subscriber` in Postgres, club-scoped and under RLS, with marketing and operational suppressed separately — *R34.6, R34.7*
- [x] `message_log`, append-only by the absence of an update policy, recording sent **and** suppressed **and** failed — *R34.8*
- [x] Provider adapter behind a `MessageTransport` interface (Resend) — *D11.1*
- [x] Every send checks suppression before the adapter is reached — *D11.1, R34.10*
- [x] A derived, durable unsubscribe token so a year-old message's link still works — [decision 12](../docs/decisions/12_an_unsubscribe_link_is_derived_not_stored.md)
- [x] One door for suppression: an officer may correct an address and may not clear a withdrawal
- [x] Unconfigured provider fails loudly rather than reporting a success — *R34.9*
- [ ] Campaigns, so the marketing consent collected is usable and not merely withdrawable — *R34.11*
- [ ] Bounce and complaint webhooks feeding suppression — *R34.11*

### 8.2 Frontend
- [x] Unsubscribe page reachable **without an account**, offering club news or every email — *R34.5, R34.7*
- [x] Reminder composition on the registration reached from the registrar's queue — *R34.1*

### 8.3 Triggers
- [x] Outstanding document, payment or consent → guardian reminder — *R34.1*
- [x] Withdrawal after acceptance → Referee Coordinator — *R34.3*
- [ ] Fixture time, venue or status change → affected participants — *R34.2*. **Built and uncalled**: nothing in the application edits a fixture, so this waits on Phase 10
- [ ] Claim approved → official — *R34.4*. **Built and uncalled**: claim approval is database-only, so this waits on task 5.4's fee/claims screens

**Manually testable:** open a registration with something outstanding, send
the reminder, and read it. Then follow the unsubscribe link in a signed-out
private window, choose *every email*, and confirm the next reminder is
recorded as suppressed rather than sent — and that the registrar is told to
ring them instead.

---

## Phase 9 — Privacy rights: erasure and retention *(built — [scope 37](../docs/scope/37_forgetting_and_the_reasons_not_to.md))*

**Outcome:** the platform can honour an erasure request, and can explain in
writing why it refused one.

> **Statutory rather than desirable**, which is the whole argument for doing
> it ahead of competitions, carnivals and dashboards — all of which are more
> visible and none of which a regulator asks about.

### 9.1 Backend — *R35, D11.2*
- [x] `retention_basis` naming the lawful basis and its expiry — *R35.2*
- [x] `erasureVerdict()` as a pure function, so a refusal is explainable — *R35.1–35.2*
- [x] Erasure **deletes or refuses and never redacts** — [decision 13](../docs/decisions/13_erasure_is_all_or_nothing.md) — *R35.3*
- [x] The request survives its own subject, naming nobody — *R35.4* (BR132)
- [x] Retention computed and **proposed, never executed** — [decision 14](../docs/decisions/14_retention_proposes_a_person_disposes.md) — *R35.6* (BR133)
- [x] Ten-year floor for the still-active — *R35.5*
- [x] Life member: indefinite retention, never proposed for disposal — *R35.7*
- [x] Living life member's details flagged when unconfirmed past the configured period — *R35.8*
- [x] Per-tenant privacy framework recorded on the club, never assumed — *R35.9*
- [x] Statutory minimums as per-framework configuration rather than constants
- [ ] The review running on a schedule rather than a button — *R35.10*. Waits on a production environment (task 0.4)

### 9.2 Frontend
- [x] Request intake, and a refusal that states its bases and their expiry in words a parent can read
- [x] Disposal proposals grouped apart from every other retention state, and only that group given an action

### 9.3 Related
- [x] Life member as a **seasonless** `person_role`, enforced in both directions — *R35.7*
- [x] `deceased_on` as a date rather than a flag — an honour roll needs *when*
- [x] Authority transfers at eighteen; contactability does not — *R11.6* (BR67)
- [x] Complete club-scoped data export, audited — *R36.1* (BR68)

**Manually testable:** record a retention basis against a person, request
erasure for them, and read the refusal — it names the basis and the date it
lapses. Request it for someone with no basis, and confirm the record and
everything attached is gone while the request remains, naming nobody.

---

## Phase 10 — Competitions and the season calendar *(built — [scope 38](../docs/scope/38_the_catalogue_that_makes_br8_computable.md))*

**Outcome:** a fixture references a real competition, and Requirement 25.4
has a minimum classification to evaluate against.

> **The point of it is one rule.** `conflicts.ts` carried BR8 with an
> apology — *"cannot be completed… no competition record exists"* — so an
> official **below** a competition's minimum produced nothing at all.

### 10.1 Backend — *R27*
- [x] Competition catalogue per association: tier, playing format, minimum classification — *R27.1*
- [x] Held **once and shared**, not copied per club — *R27.2* ([decision 15](../docs/decisions/15_the_competition_catalogue_is_shared_reference_data.md))
- [x] Ranked classification levels, confined to one association by a trigger — *R27.5* (BR135)
- [x] Minimum classification consumed by the conflict checks; **BR8 is a blocker** — *R27.4*
- [x] A competition with no minimum reports nothing to compare rather than inventing a floor — *R27.6*
- [x] `fixture.competition_id` beside the free text, which stays readable — *R27.3*
- [x] Configuration-not-code for every parameter that varies — *R27.7*
- [ ] Competition Regulations as documents — *R27.8*. The catalogue holds names, tiers, formats and minimums, not rulebooks
- [ ] A database refusal of free text. **Written and removed**: with an empty catalogue it leaves a club unable to record a competition at all. Revisit when the catalogue is reliably populated

### 10.2 Frontend
- [x] Catalogue maintenance on the platform console — a club cannot write shared data
- [x] The club's competitions on the season screen
- [x] A fixture form that selects rather than types

### 10.3 Closing Phase 8's loose end
- [x] A fixture edit path for time, venue and status
- [x] BR64's notification, wired at last — *R34.2*
- [x] What changed computed from before and after, so a submit that changed nothing announces nothing

**Manually testable:** catalogue an association with two ranked levels and a
competition requiring the higher one, mark the club as playing in it, record
a fixture in it, then try to designate an official classified at the lower
level — and be refused, with the message naming the level required.

---

## Phase 10b — Asking whether they also officiate *(built — [scope 39](../docs/scope/39_asking_at_the_door_whether_they_also_officiate.md))*

**Outcome:** every registration asks whether they would like to officiate,
and what they have officiated before — as a claim a coordinator reviews.

> **Numbered 10b rather than appended to a later phase** because it arrived
> as a requirements change mid-queue, and renumbering the phases behind it
> would break every reference in this document.

### 10b.1 The safety fix, first — *R38.8*
- [x] `loadCandidates` reads only a **sighted** classification (BR138)
- [x] The warning distinguishes *unchecked* from *none* — different next actions
- [x] Built **before** the form, so the unsafe path never existed

### 10b.2 Backend — *R38*
- [x] `officiating_interest`, recording what was declared and by whom — *R38.3, R38.4*
- [x] BR137's authority as a trigger: thirteen to declare your own, a guardian otherwise — *R38.5, R38.6*
- [x] `app_declare_interest`, reachable from the account-free path — *R38.1*
- [x] Nothing declared records nothing — *R38.2*
- [x] Accepting creates the profile and the role **of the registration's season**, and the level **unsighted** — *R38.7*
- [x] A BR84 refusal does not lose the decision — *R38.9*
- [x] A decline is kept, not removed — *R38.10*
- [x] The accreditation number readable only by the roles that act on it — *R38.11*

### 10b.3 Frontend
- [x] Three fields on the registration form, on both entry points
- [x] The coordinator's review queue, showing the claim and its author
- [ ] Telling the family what was decided — *R38.12*. A template and a call; C7 exists

**Manually testable:** register a child through the family link ticking both
boxes with a level, confirm no referee role exists, accept it on the referee
screen, and confirm the classification reads *unchecked* and that a
designation against a competition minimum refuses to count it.

---

## Phase 11 — Community carnivals and the public view *(built — [scope 40](../docs/scope/40_carnivals_and_the_one_thing_the_public_may_see.md))*

**Outcome:** a parent follows a regional carnival on their phone without an
account, and sees no child's name.

> **The product's only deliberate exception to P5.** Everything else in this
> document is about keeping one club's data away from another's; this
> publishes something on purpose, so the grant is made as narrow as the
> *schema* can make it rather than as narrow as the policies remember to be.

### 11.1 Backend — *R28, D11.3*
- [x] `carnival_event` spanning multiple clubs by design, including clubs outside the platform — *R28.1*
- [x] The public tables carry **no `person_id` column at all** — *R28.4* (BR139)
- [x] Asserted against `information_schema`, not trusted — a future migration could add one unnoticed
- [x] Public read policy keyed on `published_at`, additive beside the membership policy — *R28.2*
- [x] Publication as one explicit, reversible, audited act — *R28.5* (BR140)
- [x] Unpublished is invisible to anon **and** to other clubs — *R28.6*
- [x] anon reads and never writes — *R28.7*
- [x] Carnival Conditions writable only by the recorded Events Coordinator, whatever else they hold — *R28.8*
- [x] Publishing opens exactly three tables and nothing else — *R28.9*
- [ ] Official appointments to carnival fixtures reusing Phase 5's conflict checks — *R28.10*. **Not wired at all** rather than wired loosely: `match_official_appointment` references `fixture`, a different table, and a half-checked appointment is worse than an unbuilt one

### 11.2 Frontend
- [x] Public event view: draw, standings, each team's next unplayed fixture — *R28.3*
- [x] Coordinator screens: create, enter teams, schedule, record results, publish and take down
- [ ] An index of published events — *R28.11*. A visitor follows a link their club sent them

**Manually testable:** publish a carnival, open its public URL in a
signed-out private window, confirm the draw and standings are visible and no
individual name is — then take it down and confirm the page 404s.

---

## Phase 12 — Calendar distribution *(built — [scope 41](../docs/scope/41_the_feed_a_referee_already_has_a_calendar_for.md))*

**Outcome:** an official's appointments appear in their own phone calendar.

> **Implements a decision rather than making one.**
> [Decision 4](../docs/decisions/4_calendar-distribution-by-feed-not-account-access.md)
> settled the shape in July 2026 and its reasons still hold: a pull feed
> needs no P2 exception, no per-vendor integration, and no custody of
> credentials for accounts the platform does not own.

### 12.1 Backend — *R29, D11.4*
- [x] `calendar_subscription` with an unguessable, rotatable token — *R29.3*
- [x] The token is [decision 12](../docs/decisions/12_an_unsubscribe_link_is_derived_not_stored.md)'s construction, **reused rather than reinvented**
- [x] Feed resolving to the subscriber's own appointments only — *R29.1*
- [x] A **projection with nothing the holder can vary** — *R29.2* (BR141)
- [x] Event bodies carrying no other participant's data, asserted against the function's own columns — *R29.5*
- [x] A proposal marked as not yet accepted; a cancellation marked cancelled — *R29.6, R29.7*
- [x] A minor's subscription issued to their guardian, by trigger — *R29.8*
- [x] One-way by absence: no function accepts calendar data — *R29.9*
- [ ] A player's fixtures as well as an official's appointments — *R29.10*. Decision 4 says "initially referee appointments"
- [ ] A `VTIMEZONE` component — *R29.11*. Correct transition rules per zone are a library's job

### 12.2 Document
- [x] RFC 5545 escaping, octet-counted folding, CRLF
- [x] **Stable UIDs**, so a refresh updates rather than duplicating

### 12.3 Frontend
- [x] Subscribe, rotate and revoke from the person's own workspace
- [x] The URL shown **once** and never redisplayed — it is a bearer credential — *R29.4*

**Manually testable:** subscribe in a phone calendar, confirm only your own
appointments appear and no other official's, rotate the URL and confirm the
old one stops updating.

---

## Phase 13 — Reporting and dashboards *(built, less the import)*

**Outcome when complete:** the committee gets the numbers it actually asks
for.

- [x] Registration dashboard: completion rate, and what the incomplete are blocked on — each blocker counted once per registration, not once per recheck
- [x] Financial dashboard: outstanding and credit counted apart, plan adherence, voucher relief that excludes the merely attached (BR81)
- [x] Referee dashboard: officials, appointments, declines, withdrawals, claims raised and approved, and the matches still unverified
- [x] A figure a reader's role may not have is **refused, not computed** (BR142) — the trap this phase was mostly about
- [x] Every figure states its base and the moment it was computed (BR143)
- [ ] Historical import (C9) to give the dashboards more than one season — **blocked on open question #57**, the lawful basis for importing it

**Not built, and named rather than implied:** no ageing buckets on arrears
(overdue is a count and a total, not 30/60/90), no payment-batch state on
the referee summary, no trend or season-on-season comparison, no export, and
nothing scheduled — a committee reads the screen, it is not sent to them.

**Manually testable:** open `/registrar/reports` as a registrar and
reconcile one number by hand; then as a coach, and confirm each report says
which role it belongs to rather than showing zeros.

---

## Phase 14 — Engineering quality *(built, with four items named unverified)*

**Outcome when complete:** the things that are true stay true without
anybody remembering to check them.

- [x] Performance budgets stated and measured — and the finding they existed to catch: **BR5's duplicate detection was quadratic on three screens**, 495 ms per load at 1,400 people, now 4.8 ms and linear
- [x] The budget gated by a test that asserts **the curve, not a millisecond ceiling** — a wall-clock gate on a shared runner becomes noise, and noise becomes an ignored check
- [x] Accessibility audit of the club-facing screens against WCAG 2.2 AA — thirteen criteria assessed, one defect found and fixed (an unnamed `<select>` between two named inputs)
- [x] The mechanical half enforced by `check_a11y.py` in `npm run check` and `code-check`
- [x] An automated assertion that the AI assistant surface exposes no committing control — *R33.6*. Also: exactly one surface, and no generative client anywhere in `src/`
- [ ] Contrast ratios, target size (2.5.8), focus visibility and reflow at 320px — **named unverified rather than checked**, because half-checking them would convert *not verified* into *checked* while changing nothing
- [ ] A screen-reader session, and a keyboard pass by somebody who depends on one — the items no script substitutes for
- [ ] Restore rehearsal (NFR-17) — still nothing, against a project holding the only copy of the data there is

**Manually testable:** break one thing each check claims to catch (remove an
`aria-label`, add a submit button to `AssistantNote`) and confirm
`npm run check` fails saying so.

---

## Phase 15 — The club that is not here yet *(built, less the explaining)*

**Outcome when complete:** a club that has heard about this can start a
conversation, and it reaches somebody.

- [x] A public enquiry page capturing **the club** — name, jurisdiction, size, what it runs today — not just an email address
- [x] Two required fields and six invited ones (*BR144*); the database enforces the two, because a public function is reachable without the form
- [x] An enquiry grants **no club, no account, no membership, no access** (*BR145*), and the page says why rather than leaving a gap where a "start free trial" button would be
- [x] The lead list readable in the platform console — **the first time anything in the app has read `prospect` at all**
- [x] One lead per club however many doors they came through; a blank field never erases an earlier answer, and an unticked consent box is not a withdrawal (*BR93*)
- [x] The dead-ended "signed in, member of no club" card now leads somewhere
- [x] Somebody is **told** when an enquiry arrives — an email carrying what the club said, through C7's transport and **none** of its consent machinery (*BR146*)
- [x] A failed alert is a **recorded state, not an absent one**, counted at the top of the console — a provider outage must not read as a quiet week
- [x] A failed alert never fails the enquiry: `alertPlatform` does not throw and gives up after five seconds, because a club failed by an email provider has been failed twice
- [x] A failed alert is **retried** by a person from the console (*BR147*) — a quiet week is when a missed lead matters most, and an opportunistic retry riding on the next enquiry would never fire in one
- [x] A delivered alert is **never sent again**, enforced in the selection *and* in the database — an operator emailed three times about one club stops reading the alerts
- [x] A retried alert is byte-identical to the one that failed — one composer, two callers, asserted by a test verified to fail
- [ ] A **scheduler** runs it instead of a person — waits on task 0.4's production environment, like the retention review
- [ ] The *explain* third of scope 28 §3: pricing, a feature tour, a case study
- [ ] A status and next action on a lead — **deliberately not built**; a list to read is not a CRM and should stay one until leads are actually worked through stages

**Manually testable:** submit an enquiry from `/interest` as a signed-out
visitor, confirm no club or membership appears, then open `/platform` as the
owner and find it at the top of the list.

---

## Summary

| Phase | Subject | Done | Remaining |
| ----- | ------- | ---- | --------- |
| 0 | Infrastructure, gates, CI | 18 | 4 |
| 1 | Tenancy, identity, access | 20 | 2 |
| 2 | Registration, documents, validation | 22 | 3 |
| 3 | Finance | 14 | 3 |
| 4 | Safeguarding, teams, governance | 13 | 3 |
| 5 | Referee management | 18 | 3 |
| 6 | Club-facing frontend | 23 | 2 |
| 7 | Person-facing frontend | 8 | 3 |
| 8 | Communications | 12 | 4 |
| 9 | Privacy rights | 16 | 1 |
| 10 | Competitions | 13 | 2 |
| 11 | Carnivals | 11 | 2 |
| 12 | Calendar distribution | 12 | 2 |
| 13 | Reporting | 5 | 1 |
| 14 | Engineering quality | 5 | 3 |
| 15 | The club that is not here yet | 12 | 3 |
| 10b | Officiating at registration | 13 | 1 |
| | **Total** | **235** | **42** |

**Phases 0–10 are substantially complete** and constitute a working product
for one club's registration, finance, safeguarding, officiating and privacy
obligations — which can now tell a family what is outstanding, be told to
stop, honour an erasure request, and explain a refusal.

What is left is **capability rather than obligation**: the mobile
experience, the reporting residue named in Phase 13, the four accessibility
criteria Phase 14 named unverified rather than checked, and the *explain*
third of the marketing surface. None of it is statutory, and none of it is
blocked by anything above it.

Phase 10 also spent Phase 8's last IOU — BR64's notification had been built
with no caller, and a fixture that can be edited gave it one. **One
uncalled notification remains**: claim approval, waiting on task 5.4's
fee-schedule and claims screens.

Two unchecked items outrank the rest despite sitting in earlier phases.
**Task 0.4's production environment** now gates three things rather than
one — the retention schedule, the email provider, and the first real club's
data. And **task 2.1's historical import** is still blocked on
[open question #57](../docs/scope/open-questions.md), which is a question for
a lawyer rather than an engineer.
