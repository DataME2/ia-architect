# Project Scope — Asking at the Door Whether They Also Officiate

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

A club's referees are mostly its own players and their parents. Nothing in
the platform ever asks. A family completes a registration, and if that child
also blows a whistle on Saturday mornings the club finds out by word of
mouth — or does not, and runs a grade short.

This initiative adds three questions to the registration form: **would they
like to officiate, have they officiated before, and at what accreditation
number and level?** It is P1 at the point of capture — the same `Person`
gaining a second interest rather than a second record.

## The rule this initiative is mostly about

The questions are easy. What they produce is not.

**A parent typing "Level 4" must not become a classification**, because
BR8 now *refuses designations* against a competition's minimum
([scope 38](./38_the_catalogue_that_makes_br8_computable.md)). A declaration
that flowed straight into `referee_classification` would put an unchecked
answer into the comparison BR8 exists to make — and the consequence is not
an untidy record, it is a child appointed to a match they are not qualified
for.

So a declaration is **a claim, recorded as a claim** (BR136), reviewed by a
Referee Coordinator before it becomes anything.

**And a gap had to be closed first.** `referee_classification`'s own comment
has said since it was written that *"a level somebody stated on a form and a
level the club checked against the register are different claims, and only
the second should carry weight in BR8."* The code did not honour it:
`loadCandidates` read the latest classification regardless of whether anyone
had sighted it. That was harmless while only a coordinator could type one.
It stops being harmless the moment a guardian can, so **BR138 makes BR8
count only a sighted classification** — and that change lands here rather
than being left for the initiative that would have discovered it.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No new goal.** Serves **G4** (full referee lifecycle) at its thinnest point — recruitment — and **P1**, since the declaration attaches to the `Person` being registered rather than creating a referee identity |
| **2_business** | **Three new rules. BR136** (a declaration is a claim, not a classification), **BR137** (a guardian may declare for a child under their authority; a person of thirteen may declare their own), **BR138** (only a *sighted* classification counts toward BR8). BR138 is a correction to existing behaviour, not only an addition |
| **3_information** | **One new data object:** `officiating_interest` — what was declared, by whom, when, and what a coordinator decided. The declared level carries **both** a free-text field and an optional reference into scope 38's catalogue, because a parent's answer may not match anything catalogued |
| **4_application** | Registration capture gains three fields on both entry points (the registrar's form and the account-free family link). The referee roster gains a review queue. `loadCandidates` changes to honour BR138 |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | Nobody is asked. A club's referee recruitment is word of mouth. An unsighted classification counts toward BR8 exactly as a sighted one does |
| **Target** (delivered) | Every registration asks. A declaration is recorded as a claim with its author, waits for a coordinator, and becomes a referee role and an **unchecked** classification only when accepted. BR8 ignores anything unsighted |

## Work packages and deliverables

### WP1 — BR138 first

- **Deliverables:** `loadCandidates` filtering on `sighted_at`;
  `conflicts.ts` distinguishing *unsighted* from *absent*
- **Outcome:** BR8 counts only what the club has checked. **Built before
  the form**, so the unsafe path never exists.

### WP2 — The declaration

- **Deliverables:** `supabase/migrations/0033_officiating_interest.sql` —
  `officiating_interest`, its policies, and the trigger enforcing BR137's
  authority; `src/domain/officiating/interest.ts`
- **Outcome:** BR136 and BR137 hold.

### WP3 — Asking

- **Deliverables:** the three fields on `RegistrationForm`, parsed in
  `src/web/registration-form.ts`, written through the one creation path
- **Outcome:** Both entry points ask, including the account-free link.

### WP4 — Reviewing

- **Deliverables:** the pending-declaration queue on
  `/registrar/referees`, and the action that accepts or declines
- **Outcome:** Accepting creates the referee profile and role, and records
  the declared level as **unchecked** — which BR138 then refuses to count
  until somebody sights it.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Asking, recording, reviewing | **Verifying the number.** No register is queried; a coordinator still checks by hand, exactly as for a Working with Children Check |
| A declared level, free text or catalogued | **Trusting it.** BR138 is the whole point |
| A guardian declaring for a child | **A child under thirteen declaring their own** — BR63's threshold, reused rather than reinvented |
| Accepting creates the role | **Onboarding the new official** — availability, accreditations and a WWCC are the existing referee screens' work, and BR84 already refuses an adult without a card |

## Gap notes

- **Nothing tells the family what happened.** A declaration is reviewed and
  the family finds out by being asked to referee, or not at all. C7 exists
  now ([scope 36](./36_the_platform_learns_to_send_and_to_stop.md)) so this
  is a template and a call rather than an initiative — it is left out
  because the coordinator's own screen is the thing that was missing, and a
  message about a decision nobody had made yet would have been premature.
- **BR138 makes some clubs' data look worse overnight**, and that is the
  correct direction. A club that typed levels without sighting them will
  find BR8 reporting nothing to compare where it previously reported a
  level. The roster already marks those "unchecked"; now the designation
  screen agrees with it.
- **An accreditation number is a personal identifier** and is readable only
  by the roles that act on it (BR120: admin, registrar, coordinator). It is
  not shown on the player record, where it would be visible to more people
  for no purpose.

## Open questions

- **[#79] Should declining a declaration be recorded, or should the row
  simply go?** Adopted: **recorded**, with the decision and its author. A
  family that declared twice and was declined twice is something the
  coordinator should be able to see, and a deletion would make the second
  declaration look like the first.
- **[#80] May a player under thirteen be declared as an intending official
  by their guardian?** Adopted: **yes.** MiniRefs are children — the
  Football Queensland pathway's lowest classification exists for them, and
  BR84 already exempts an under-18 from the Working with Children Check a
  Match Official otherwise needs. BR63's threshold governs who may declare
  *for themselves*, not who may be declared.
