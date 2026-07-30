# Project Scope — International Transfer Certificates (ITCs)

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/business-actors-pr-76khxv`.

The pilot club supplied a reference document (Football Australia's *Guide
to International Transfer Certificates*, March 2019) covering the FIFA/
Football Australia rules that apply whenever a player's immediately
preceding registration was with a different national association. This
initiative grounds the business layer's existing but previously
unexplained `PENDING_EXTERNAL_REGISTRATION` registration status: what
triggers it, who can resolve it, how long it can block a registration, and
the additional FIFA Art. 19 child-protection process for players aged
10–17. No application code exists yet, so nothing below touches a code
artifact.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | Changed: [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md) — Goal G2's existing "external registration" phrase is now grounded in the ITC process rather than left unexplained; [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md) — C2's description now names ITC explicitly, and the Guide is recorded as a new Resource. No new goal, driver, or Principle — this fits entirely inside the existing G2/C2 |
| 2_business | New: Football Australia external actor and an extended Governing Body/Association (Member Federation) concern in [1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md); a new "International transfers" business-object section (ITC, Minor ITC Application) in [4_business-objects.md](../ea/2_business/4_business-objects.md); a new International transfer clearance process in [3_business-processes.md](../ea/2_business/3_business-processes.md), cross-linked from the existing Player registration process; BR35–BR38 and three glossary terms in [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md); the Player registration business service's description and realizing-process list updated to match |
| 3_information | No change — not started; deferred to the MVP-build initiative |
| 4_application | No change — not started; deferred to the MVP-build initiative |
| 5_technology | No change — not started; deferred to the MVP-build initiative |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | `PENDING_EXTERNAL_REGISTRATION` existed as a named registration status ([3_business-processes.md](../ea/2_business/3_business-processes.md)) with no explanation of what it meant, who resolved it, or how long it could block a registration; Goal G2 named "external registration" as one of three things a registration could be missing, equally unexplained; no ITC-related actor, object, or rule existed |
| **Target** (delivered) | `PENDING_EXTERNAL_REGISTRATION` is fully grounded: the International Transfer Certificate (ITC) business object, the Minor ITC Application object, Football Australia as the sole requesting actor, the Member Federation's intake role (an extension of the existing Governing Body/Association actor), and BR35–BR38 covering the trigger, the 30-day provisional-registration rule, the FIFA Art. 19 minor exception, and the sole-requester rule |

## Work packages and deliverables

### WP1 — Model Football Australia and the Member Federation's ITC role

- **Deliverables:** [docs/ea/2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md)
- **Outcome:** a new **Football Australia** row in the External actor
  table (sole ITC-requesting authority), and the existing **Governing
  Body / Association** row's concern extended to note its Member
  Federation role as the ITC intake point — no new actor category needed,
  since Football Queensland/NSW/etc. already play this role for
  competitions.

### WP2 — Model the ITC and Minor ITC Application objects

- **Deliverables:** [docs/ea/2_business/4_business-objects.md](../ea/2_business/4_business-objects.md)
- **Outcome:** a new "International transfers" section with the
  **International Transfer Certificate (ITC)** and **Minor ITC
  Application** objects; the existing **Person Document** object's example
  list extended to include ITC supporting documents rather than inventing
  a new document-type object per FIFA form.

### WP3 — Add the International transfer clearance process and BR35–BR38

- **Deliverables:** [docs/ea/2_business/3_business-processes.md](../ea/2_business/3_business-processes.md),
  [docs/ea/2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)
- **Outcome:** a new process section (mermaid diagram + prose) covering
  the trigger, the Football Australia request, the 30-day rule, and the
  Minor (ITC) branch; BR35 (ITC required to reach COMPLETE), BR36 (30-day
  provisional-registration rule), BR37 (Minor (ITC) exception categories,
  under-10 exemption), BR38 (Football Australia is the sole requester);
  three glossary terms (ITC, Minor (ITC), Minor ITC Application) that
  explicitly distinguish FIFA's 10–17 international-clearance definition
  of "minor" from the general under-18 threshold BR1 already uses.

### WP4 — Ground Goal G2, Capability C2, and the Player registration service

- **Deliverables:** [docs/ea/1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md),
  [docs/ea/1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md),
  [docs/ea/2_business/2_business-services.md](../ea/2_business/2_business-services.md)
- **Outcome:** G2's "external registration" phrase and C2's description
  both now name the ITC process explicitly instead of leaving it as an
  unexplained placeholder; the Guide to International Transfer
  Certificates is recorded as a Resource; the Player registration
  business service's description and realizing-process list include the
  new process.

### WP5 — Log the currency open question

- **Deliverables:** [docs/scope/open-questions.md](./open-questions.md)
- **Outcome:** question 27 records that the source Guide predates
  Football Australia's 2021 rebrand from FFA, and that its "Play
  Football" self-registration platform reference should be confirmed
  against the same PlayFootball system already modeled elsewhere in this
  project (open question 7, resolved).

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| ITC business object, Football Australia actor, Member Federation's ITC-intake concern | The professional-adult ITC pathway via FIFA's Transfer Matching System (TMS) and the two annual transfer windows — the pilot club's registrations are amateur/community-level; professional TMS is out of scope until a professional pathway is in scope |
| BR35–BR38 (trigger, 30-day rule, Minor (ITC) exception, sole-requester rule) | The six Minor ITC Application form types' individual documentation checklists (Blue/Purple/Green/Orange/Red/Aqua forms) — modeled at the level of "a Minor ITC Application matching one of FIFA's exception categories," not one business rule per form, consistent with how Voucher Programs and Carnival types are kept as configuration/reference-document detail rather than exhaustive rule rows |
| International transfer clearance process, cross-linked from Player registration | International Futsal Transfer Certificates (IFTC) — the source guide notes IFTC follows the same administrative process as ITC, but the pilot club's registrations are outdoor eleven-a-side; no futsal capability is modeled yet |
| Grounding of the pre-existing `PENDING_EXTERNAL_REGISTRATION` status and Goal G2's "external registration" phrase | Disciplinary-sanction consequences for fielding a player without a required ITC — noted in the source guide but not modeled as a business rule; it's a consequence of BR35, not a distinct gate the platform enforces |

## Gap notes

- **Source document currency.** The Guide is dated March 2019 and predates
  the FFA → Football Australia rebrand (2021); confirming it's still the
  current process (open question 27) is prerequisite to treating BR35–BR38
  as anything more than an adopted interpretation.
- **Professional TMS pathway.** If the platform later needs to support an
  NPL/professional club, the ITC business object and BR35/BR38 extend
  naturally, but the transfer-window timing (BR analogous to BR12's
  decline-rate-window pattern) and FIFA TMS integration are new work, not
  covered here.
- **New Zealand.** The Guide is Australia-specific (Football Australia);
  New Zealand Football would run an equivalent process under the same
  FIFA Regulations, but its specifics are unconfirmed — already tracked
  under [open question 14](./open-questions.md).

## Open questions

- [Open question 27](./open-questions.md): is the 2019 Guide still
  Football Australia's current ITC process, and does PlayFootball still
  trigger it the same way?
