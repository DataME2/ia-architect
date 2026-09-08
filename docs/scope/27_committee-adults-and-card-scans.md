# Project Scope — A Committee Is Adults, and a Card Has a Photograph

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/committee-adults-and-card-scans`.

Four things from the club, one of which answers a question raised two
initiatives ago and one of which turned out to be a defect in every form in
the application.

## A committee is adults

The committee screen offered **everybody** — including the nine-year-old
MiniRoos players the club had just registered.

**BR87**: a Committee Position may only be held by an adult, measured at the
**term's start**. A parent may serve. A Life Member may serve. What excludes
a MiniRoos player is that they are a child — never that they play, and never
how recently they joined.

Measuring at the term's start rather than today keeps a committee elected in
March a committee of the people who were adults in March. It is a trigger
rather than only a filtered dropdown, because the dropdown is a courtesy and
the constraint is what makes it true.

## Who a clearance is for

The same list offered a child on the screen that records a **Working with
Children Check** — a card a nine-year-old cannot hold, and is exempt from
needing (BR84). Offering them invites a registrar to record something that
cannot exist.

That list is now adults only. And the club's answer settles
[#55](./open-questions.md), open since scope 26: **committee and
subcommittee members do need a check**, alongside coaches, match officials
and team officials.

**BR88 records that with one deliberate difference: it is surfaced, not
enforced.**

The same stakeholder had already instructed that the committee be identified
*first*. Blocking an appointment on a card would make the two instructions
contradict each other — so a coach, referee or team official stays blocked
outright, because those roles put an adult in front of children on a fixture
date, while a committee member is seated and the gap is shown. A platform
that refuses to record a committee until every card is in is a platform
whose committee list lives in a spreadsheet, and an unrecorded committee is
worse for safeguarding than a recorded one with a visible gap.

## The card's photograph

A card number typed from a photograph is a transcription. The photograph is
the evidence, and BR19's verification is a person saying they looked at
something.

Clearances can now carry a scan — PDF, JPEG or PNG — in a **private bucket
narrower than the vouchers one**: admin and registrar only, matching the
`clearance` table's own policy, because this is a government identity
document rather than ordinary club information.

## The silence

**No form in this application has ever confirmed success.** Every action
returned `string | null`: a message when something went wrong, and *nothing
at all* when it worked.

The club noticed it on the clearance form, and it was true of all of them —
teams, seasons, governance, vouchers. Silence is not a success state. It is
indistinguishable from a click that did not register, and it teaches people
to press the button twice.

Fixed as a class rather than an instance: one `FormResult` shape and one
`FormNotice` component, so the answer looks the same on every screen. The
clearance confirmation says which of the two things happened, because they
are not the same event:

> *Clearance recorded and verified against the portal, covering to
> 2029-04-11.*

> *Clearance recorded, but NOT verified. Until somebody checks this number
> against the state portal it clears nobody, and they still cannot be added
> as an official (BR19).*

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No change. Serves **C19** and **C15** |
| 2_business | **BR87** (a committee is adults) and **BR88** (committee clearances, surfaced not enforced). Resolves [#55](./open-questions.md) |
| 3_information | `clearance.file_path`; the `clearance_expectation` view. In [1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 4_application | The adults-only pickers, the scan upload, and the shared form-outcome shape. In [2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology | A second private Storage bucket, `clearances`, narrower than `vouchers` |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | Committee and clearance screens offered children. A card could be recorded but not evidenced. No form in the application acknowledged success |
| **Target** (delivered) | A committee is adults, enforced in the database; the clearance screen offers only people who could hold one; cards carry a scan; and every form says what happened. Proved across 9 further scenarios — 136 in total |

## Work packages and deliverables

### WP1 — BR87 *(done)*

- **Deliverables:** `mayHoldCommitteePosition` with 7 unit tests; the
  `committee_position_is_adult` trigger; adults-only picker on governance.
- **Outcome:** a MiniRoos player cannot govern the club by any route.

### WP2 — Who a clearance is for *(done)*

- **Deliverables:** adults-only picker on the clearance form; the
  `clearance_expectation` view; the missing-card warning on each committee
  term.
- **Outcome:** children never appear on a screen asking for a card, and a
  committee member without one is visible rather than silently fine.

### WP3 — The scan *(done)*

- **Deliverables:** `clearance.file_path`, the `clearances` bucket and its
  policies, the file input with type and size limits.
- **Outcome:** the evidence is held, not just the transcription.

### WP4 — Form outcomes *(done)*

- **Deliverables:** `src/web/form-result.ts`, `FormNotice`, and every
  action converted.
- **Outcome:** a form that worked says so.

### WP5 — Proof *(done)*

- **Deliverables:** `supabase/tests/19_committee_adults.sql`, 9 scenarios.
- **Outcome:** verified to fail. Measuring age against *today* instead of
  the term's start, and narrowing the trigger to insert-only, reports five
  failures including *"someone under 18 at the term start was seated"* and
  *"a child appears on the list of people who should hold a clearance"*.

## In scope / out of scope

**In scope:** the adult rule for committee positions; who appears on the
clearance screen; the card scan; success confirmation on every form.

**Out of scope:** reading anything *from* the scan. Nobody parses the card
number out of the image, and the verification tick still means a human
looked at the state's portal — see the gap note.

## Gap notes

**The scan is evidence, not verification.** Uploading a photograph does not
tick the verified box and must not: BR19 wants the number checked against
the government's own interface, and an image proves only that a card
exists. The two are separate fields for exactly this reason, and the
confirmation message now spells out which one happened.

**The `clearances` bucket has the same CI gap as `vouchers`.** The local
test Postgres has no `storage` schema, so both buckets are created behind a
guard and their policies are unproved by the behavioural suite. Everything
else in this project's tenant isolation is proved; these two are asserted.
Now that there are two of them, it is a pattern rather than an exception,
and worth closing.

**BR88's gap is shown in one place.** A committee member without a card is
flagged on the governance screen. Nothing surfaces it on the queue, in a
digest, or to the person themselves — so it is visible to whoever opens that
page and to nobody else. That is enough for a club of one committee and not
enough for a season.

**A guardian still counts as an adult by placeholder.** The public form
records `1900-01-01` when it has no date of birth, which reads as an adult.
That is the safe direction here — it never wrongly excludes a real parent
from the committee — but it means the adult test passes for a record that
has no real date at all.

## Open questions

None raised. [#55](./open-questions.md) is resolved.
