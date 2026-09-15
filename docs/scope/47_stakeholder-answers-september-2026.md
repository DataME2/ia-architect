# Project Scope — Stakeholder Answers, September 2026 (round 2)

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.

A second September 2026 answering round, worked through the pending ledger
against the club president's own written replies. **Nine questions
resolved outright** (49, 52, 53, 54, 70 restated, 73, 74, 75, 76), **five
partially answered or reframed** (30, 38, 39, 40, 42), **one closed by
stakeholder direction rather than fact** (32), and **one reversed** — #53,
where the earlier adopted "no un-merge" position is replaced. Four stay
open exactly as before (35, 44, 46, 48, 56, 57), because the president had
no new information to give on them. No application code is written; BR
restatements are named below for a follow-up documentation change.

## The nine closed

| # | Answer |
| - | ------ |
| **49** | **Committee approves, by meeting minute; the President signs off.** Same evidentiary shape as #29 — a dated resolution is the record |
| **52** | **Yes, a family may attach their own voucher** — reversing the earlier "club-side attachment only" adopted position. The condition that made the earlier answer cautious still stands: **an attached document does not make the voucher valid.** A registrar or the treasurer must independently verify it before it is applied |
| **53** | **Merges are reversible.** This **reverses** the earlier adopted "no un-merge" position outright — a build decision for WP-level design, not a documentation nuance |
| **54** | **The Secretary or the President speaks to the Team Official directly**, and the conversation must be recorded — either as an event, or as a reminder surfaced on the Secretary's and President's own panels |
| **70** | **Restated, same direction:** no official under 18 accepts their own designation; the Parent/Guardian is notified. Matches the existing BR113 shape rather than changing it |
| **73** | **Confirmed: no.** A coach may not see a family's outstanding balance. This settles #73 definitively rather than "adopted for now, pending the club" |
| **74** | **Confirmed: no.** A thirteen-year-old does not see what the family owes. Settles #74 definitively |
| **75** | **Confirmed: yes**, with a fixed cadence — a club in read-only may still record a Working with Children Check, re-verified **every six months** |
| **76** | **Confirmed: no.** An administrator account may not be a shared mailbox. BR106's one-account-one-Person link stands unmodified |

## The one closed by direction rather than fact — #32

Asked what the confirmed multi-week registration baseline is *composed
of* — guardian error, club turnaround, association processing, payment
clearing, or the ITC window — expecting a numeric breakdown. The
president's answer does not supply the breakdown; it reframes why the
question does not need one yet: **Let'sDataTalk's purpose is to become
the source of truth Football Queensland actually consults to determine
who is eligible to play in a season.** Against that goal, decomposing the
current delay is a diagnostic exercise on a process the platform intends
to replace as the record of truth, not extend. **Marked as answered on
that basis** — the numeric target itself is deferred, not because the
data is unavailable (it still is, per #32's original note), but because
the club has told us the metric that matters is authority, not speed.

## The reframed and partial

| # | What moved |
| - | ---------- |
| **30** | The **statutory-minimum legal question is still open** — nothing here answers whether BR40's caps survive an Australian financial/tax or child-safety floor. What the president adds is a **new operational control, not a legal answer**: outstanding balances must stay visible for **at least two years**, so that a family who owes money from a prior season is *found*, not lost when the season rolls over. Detailed as a new adopted direction below |
| **38** | Cadence sharpened to a concrete, actionable rule: **every six months, send a reminder to the Secretary that a Working with Children Check needs re-verification.** This narrows, but does not fully resolve, the original programmatic-vs-manual-portal question — the portal access mechanics are still unconfirmed |
| **39** | **Direction clarified, not the terms-of-use question.** The platform is not planning to *ingest* a club's Squadi export; it is identifying **what data to push *out* to Squadi/Football Queensland**, so they can run the export, package, or bulk-send process on their side. This is close to the opposite data-flow direction the original question assumed, and #39's original ambiguity (does the "no unauthorised third-party systems" clause reach a club's own CSV) is **still unanswered for the direction actually being built** |
| **40** | **Confirmed: Majestri is not an approved system partner.** Its Squadi/PlayFootball comparison feature is simply an export/import comparison process, outside what any partner-status restriction would target. This resolves #40 as originally asked |
| **42** | **Mechanism confirmed as bulk upload.** The president is leaving the column-by-column format of the player and team-official transfer open for the platform to propose — narrower than "still open," wider than a settled specification. The detailed spec (columns, encoding, photo handling) tracked under #44 remains genuinely unanswered |

## New adopted direction: outstanding-balance visibility across seasons (from #30/#50)

The president's comment on #30 is a standing operational instruction, not
an answer to a documentation question, and it sharpens the no-pay-no-play
mechanism already recorded at [#50](./open-questions.md#resolved):

- A player or guardian with an **outstanding amount from a previous
  season** must be **detected and kept visible for at least two years**,
  not silently rolled off at season change.
- On detection, the **Treasurer must ask the family to pay, or accept a
  documented, reasoned amendment** (a hardship waiver, a payment plan, a
  correction) — never a silent zeroing.
- The stated intent is **deterrent**: a family should not be able to
  accumulate unaddressed debt across seasons by the record simply not
  surfacing it.

This does not relax BR79 (a player still owes what they owe and stays
blocked until paid or excused) — it adds a **retrospective visibility
requirement** on top of it, and gives #50's override a concrete owner
(Registrar and Treasurer jointly) and a minimum look-back window. A
business-rule restatement (extending BR79/BR21's family) is follow-up
work, not done in this pass.

## Still open, unchanged

**35** (Majestri migration process), **44** (the full import
specification), **46** (whether FQ will accept a submission pack), **48**
(the recurring commercial model), **56** (duplicate resolution at
migration scale), and **57** (lawful basis for imported historical data)
carry no new information from this round and stay exactly as recorded.
