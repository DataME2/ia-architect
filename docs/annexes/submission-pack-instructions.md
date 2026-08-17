# Annex — Registration Submission Pack: operating instructions

_[← Annexes](./README.md) · [EA home](../ea/README.md)_

How a club produces, checks, hands over, and tracks a **Registration
Submission Pack** — the artifact Capability **C16** produces and rules
**BR58–BR60** govern. See
[scope document 14](../scope/14_submission-pack-and-the-inverted-direction.md)
for why the direction was inverted.

This is an operational procedure, not architecture. Changing the steps
does not require an EA change; changing what the pack *contains* or what
the handover *asserts* does.

> **Read this first.** Sending a pack is **not** registering a player.
> Until the player is confirmed present in the governing body's system,
> they cannot take the field (BR43, BR60). Every instruction below is
> written to keep those two facts apart, because conflating them is how a
> child ends up on a team sheet without being eligible.

---

## 1. For the Registrar — producing the pack

**Before you generate.** The pack is only as good as what it carries, so
the platform's validation runs first and the pack is refused if it would
ship known-bad data:

1. Every included registration passes deterministic validation — legal
   name present and matching the identity document, date of birth,
   guardian recorded for every minor, required documents attached,
   payment status resolved.
2. **Legal names, not everyday names.** The single most common cause of a
   rejected or delayed registration is a nickname in the legal-name field
   (BR55). The platform holds both; the pack carries the legal one. If a
   player's legal name was never captured properly, fix it before
   generating — not after the federation rejects it.
3. Duplicate-identity candidates are resolved or excluded. Never ship an
   unresolved possible-duplicate: it is how one child's registration
   attaches to another.

**Generating.** The pack is immutable and versioned (BR58). It records
itself: version, generation timestamp, club, season, the manifest of every
Person included, and who generated it. If something is wrong, you generate
**a new version** — you never edit the one you sent, because the one you
sent is your evidence of what you sent.

**What goes in it (BR59).** Only the fields the recipient needs for
registration. Not "everything we hold, they can ignore the rest". Two
specific decisions to make consciously each season:

- **Photographs.** If included, a single file contains hundreds of
  children's images. Decide deliberately whether the recipient needs them
  in the pack or whether they belong only in the club's own record.
- **Anything beyond registration.** Finance, medical notes, and
  communications history are not registration data and do not travel.

---

## 2. Handing it over

**Use a controlled channel and record it against the pack.** Not a
personal email account, not a public link, not a chat message. Whatever
channel is used gets recorded — because BR59's audit answers "who received
this, and how?", and that question is asked after something has gone
wrong, not before.

**Include the cover note.** The recipient did not ask for this file and
needs to know in thirty seconds what it is, what it is not, and what is
expected of them:

> **Registration submission — [Club], [Season], pack version [N]**
>
> This file contains [N] player registrations collected and validated by
> [Club] for the [Season] season. It is provided for import into Squadi.
>
> Every record has been checked against the player's identity document:
> legal names are as they appear on the passport or birth certificate,
> dates of birth are verified, and every player under 18 has a recorded
> guardian. Records that failed validation are not included.
>
> The pack is dated and versioned. If we need to correct anything, we will
> send a new version rather than an amended copy, so you can always tell
> which one you imported.
>
> **What we would find useful in return:** confirmation of which records
> imported successfully and which did not, with the reason. We do not need
> a formal response — a list of rejections is enough. Without it we cannot
> tell a player who is registered from one who is not, and under FQ policy
> that difference decides whether they can take the field.
>
> If a different format or channel would suit you better, tell us and we
> will match it. Contact: [club registrations contact]

**Record the handover as *sent*.** Not as registered. The distinction is
BR60 and it is the whole point of the annex.

---

## 3. After handover — the return leg

This is the weakest part of the process and the instructions should say so
rather than pretend otherwise.

- **Update each Submission Record as evidence arrives**: sent →
  confirmed present, or rejected with the reason. Evidence may be a reply
  from the federation, or simply someone checking Squadi.
- **Until a player is confirmed present, their registration stays
  `PENDING_EXTERNAL_REGISTRATION`** and they are not eligible. The club's
  own screen showing "submitted" is not eligibility and must never be read
  as such.
- **Rejections are the valuable output.** A rejection reason tells you
  what the destination actually validates — which is the information
  nobody has documented yet ([#44](../scope/open-questions.md)). Record
  the reason verbatim; over a season it becomes the specification the club
  was never given.

---

## 4. If the federation does not import it

**Assume this is the default until proven otherwise.** Football Queensland
has not agreed to receive or import anything
([#46](../scope/open-questions.md)), and the process must be useful
without that agreement.

The same pack is a **guided data source for manual entry**. Whoever keys a
registration into Squadi — club admin or family — works from the pack
rather than from memory, a form, or a chat message. Every value has
already been validated, so the entry is a transcription instead of a
reconstruction. That removes the error-and-re-loop cycle that causes most
of the delay, which was the point of the exercise.

Practically: sort the pack in the order the destination screen asks for
fields, so the person keying it in reads down a column instead of hunting.
This is a small thing that decides whether the pack actually gets used.

---

## 5. Checklist

| # | Step | Done when |
| - | ---- | --------- |
| 1 | Validation clean | No failed records; duplicates resolved or excluded |
| 2 | Legal names verified | Names match the identity document, not the everyday name |
| 3 | Field set reviewed | Only what the recipient needs; photograph decision made consciously |
| 4 | Pack generated | Version, timestamp, manifest, and generating user recorded |
| 5 | Handover sent | Controlled channel used **and recorded against the pack** |
| 6 | Recorded as *sent* | No registration marked eligible on the strength of sending |
| 7 | Return leg tracked | Each Submission Record updated as evidence arrives; rejection reasons captured verbatim |

---

## Not yet covered

- **PlayFootball / Football Australia.** These instructions are written
  for the Squadi handover. Football Australia's position has never been
  asked and should not be inferred from Football Queensland's.
- **Mid-season changes.** Withdrawals, transfers in, and corrections after
  a pack has been sent are not covered here — a resend policy needs
  defining once the first season's handover has actually happened.
- **The confirmation route.** Until the federation agrees one, section 3
  depends on a human checking Squadi, which is C14's job and C14 is
  blocked ([#39](../scope/open-questions.md)).
