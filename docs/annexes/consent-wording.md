# Annex — Consent Wording

_[← Annexes](./README.md) · [EA home](../ea/README.md)_

Parent- and player-facing wording that realises **BR48** (recorded,
scoped, revocable consent), **BR56** (identification photograph), and
**BR57** (publicity consent) — see
[2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md).

The business rules fix *what each consent must establish and how it must
behave*. This annex is the text that does it. It is an operational
artifact, not architecture: changing the wording does not require an EA
change, but changing what a consent **covers** does.

> **Not legal advice.** This wording is drafted to satisfy the rules above
> in plain English. It should be reviewed by someone qualified before a
> season's worth of families sign it — particularly §3, where the risk is
> concentrated.

## Why one notice and two consents

Collecting a player's details in order to register them is the **primary
purpose** the information is collected for. Under Australian Privacy
Principle 5 that calls for a **collection notice** — telling people
clearly what is being done — rather than permission, because the club
cannot register anyone without it and a "consent" that cannot be refused
is not a consent.

Consent proper is what the other two need: the identification photograph
(sensitive information about a child, disclosed onward), and publicity
(a purpose beyond the one the data was collected for). This is also the
structural reason **§3 can be refused without affecting the registration**
— it was never part of the primary purpose.

---

## 1. Registration — collection notice and acknowledgement

> **How we use your information**
>
> North Star FC collects this information to register you (or your child)
> to play, to manage teams, fees, and match-day administration, and to meet
> our obligations as an affiliated club.
>
> **We must use legal names.** Please enter names exactly as they appear on
> the passport or birth certificate. Football Queensland's systems match
> records this way, and a nickname or shortened name is the single most
> common reason a registration is delayed or rejected. You can tell us the
> name your child actually goes by in the "preferred name" field — that's
> the name we'll use in team lists, emails, and everywhere else day to day.
>
> **Who we share it with.** We provide your registration details to
> **Football Queensland (Squadi)** and, where required, **Football
> Australia (PlayFootball)**. This is how a player becomes eligible to take
> the field — we cannot register anyone without it. These organisations
> handle your information under their own privacy obligations.
>
> **Please note:** once your details have been provided to Football
> Queensland or Football Australia, we cannot delete them from those
> systems. We can only delete our own records. Any request to remove
> information held by them must go to them directly.
>
> **How long we keep it.** We keep registration records for three years, or
> longer where the law requires us to.
>
> **Your rights.** You can ask to see the information we hold about you,
> ask us to correct it, or ask us to delete it. Some records we may be
> legally required to keep — if so, we'll tell you which, and why.
>
> **Questions or concerns:** [club privacy contact / email]
>
> ☐ I have read and understood how my information will be used. *(required)*

**How it must behave**

- Required to submit the registration — it is a notice, not a choice.
- The legal-name paragraph is **BR55** stated to the person who causes the
  problem it solves. The preferred-name field must be visibly adjacent, or
  guardians will keep putting the nickname in the legal-name box.
- The "we cannot delete them from those systems" paragraph is **BR49**'s
  external-disclosure limit. It belongs *here*, before the data is handed
  over — not in the erasure response months later.
- Retention wording tracks **BR40**, and inherits
  [open question #30](../scope/open-questions.md): if statutory minimums
  exceed three years for some record classes, this sentence changes.

---

## 2. Identification photo

> **Player photo**
>
> We ask for a clear, recent head-and-shoulders photo of the player, on a
> plain background — like a passport photo. We use it to confirm identity:
> that the player on the team sheet is the player on the field.
>
> **Where it goes.** It stays in our club system and, where Football
> Queensland requires a photo as part of registration, it is provided to
> them with the registration.
>
> **What we will not do with it.** This photo is **not** used for social
> media, advertising, newsletters, or promotion of any kind. That is a
> separate choice, further down this form, and you can say no to it without
> affecting anything here. We do not use facial recognition or any
> automated matching on it.
>
> **Removing it.** You can ask us to delete it at any time and we will
> remove our copy. If it has already been provided to Football Queensland,
> we cannot remove it from their system.
>
> ☐ I consent to providing this photo for player identification.
> ☐ *(18 and over)* I consent to providing this photo for my own identification.

**How it must behave**

- The "not used for publicity" sentence is load-bearing. It is the
  practical safeguard against **BR56**'s photo drifting into marketing use,
  which is the most likely way that rule gets violated in practice.
- Capture guidance ("plain background", "recent") anticipates **BR56**'s
  strictest-downstream-specification requirement. The actual Squadi
  specification is unknown ([#44](../scope/open-questions.md)) — when it is
  known, this wording states it exactly, and until then it errs strict.
- If #44 comes back saying Squadi *mandates* a photo, this stops being a
  consent and moves into §1's collection notice. Keep it here until then.
- No facial recognition, and never sent to an uncontrolled AI service — Principle **P4**.

---

## 3. Publicity — optional, and it stays optional

> **Photos and videos for club promotion — your choice**
>
> Clubs like ours share photos of match days, presentations, and team
> events. We'd like your permission to include you (or your child) — but
> **this is entirely optional and does not affect registration, team
> selection, or anything else.** If you say no, nothing changes. You don't
> need to give a reason, and we won't ask for one.
>
> **If you say yes**, we may use photos or video of the player in:
>
> ☐ The club's social media accounts (Facebook, Instagram)
> ☐ The club website
> ☐ Newsletters and emails to club members
> ☐ Printed material — posters, programs, signage
> ☐ Sponsor and advertising material
>
> **We will not** publish a player's full name alongside their image, their
> date of birth, their contact details, or any information about their
> family, unless we ask you separately.
>
> **You can change your mind at any time.** Email us and we will stop using
> the image and remove it from anything we control. Please understand that
> once something has been posted publicly, other people may have already
> saved or shared it, and we cannot recall those copies.
>
> **This permission lasts for the current season** and we'll ask you again
> next registration.
>
> ☐ Yes, I give permission as marked above.
> ☐ No, please do not use images of me / my child for promotion.
>
> *If there is a safety or legal reason we should know about — for example
> a court order or a family safety concern — please contact [club
> safeguarding contact] privately rather than using this form.*

**How it must behave**

- **Default unticked**, per-Person, revocable immediately rather than by
  support request (**BR57**).
- **"You don't need to give a reason, and we won't ask for one."** A parent
  in a family violence situation must not have to disclose it to a
  volunteer registrar in order to opt out. The private safeguarding contact
  is the route for anyone who *does* want to explain.
- **Per-channel tickboxes, not one yes/no.** Many parents are comfortable
  with a team photo in a newsletter and not with sponsor advertising. A
  single checkbox forces them to refuse everything in order to refuse that.
- **Season-scoped.** A five-year-old's permission should not still be
  running when they are eleven — renewal at each registration is what makes
  the consent current rather than historical.

---

## 4. Marketing — the demonstration door

Different in kind from §1–§3, and worth saying why it lives in the same
annex. Those three are **a club collecting information about its players**.
This one is **Let'sDataTalk collecting information about a club**: the data
subject is an adult acting for an organisation, the collecting entity is
the platform rather than a tenant, and no child is involved anywhere.

What it shares with §3 is the shape, and the shape is the point. It is
separate, explicitly granted, refusable without losing the thing the person
came for, and recorded with the words that were shown (**BR93**).

> ☐ **Send me occasional emails about Let'sDataTalk** — product news,
> pricing, and availability.
>
> Optional. You will see the demonstration club either way, and leaving
> this unticked changes nothing about what you can look at.
>
> We handle your details under the Australian Privacy Principles (Privacy
> Act 1988) and, for New Zealand clubs, the Privacy Act 2020. We will not
> sell them, and we will not pass them to a football club or a governing
> body. Ask us to stop at any time by replying to any message we send.

### Three things about this wording, deliberately

**The box ships unticked, in the markup.** A pre-ticked box is not consent
under the Spam Act 2003 or the APPs, and "unticked by default in the CSS"
is not unticked. This is the single most common way a marketing consent is
worthless.

**Entering the demonstration club needs no consent at all.** Asking to see
a product infers consent to hear back *about that product demonstration* —
that is why the door works without a tick. What the tick adds is the wider
permission for unrelated commercial messages, which cannot be inferred from
anything.

**The promise to stop is currently kept by a human.** There is no
unsubscribe link, because there is no sending mechanism yet. The wording
therefore says *reply to any message* rather than naming a link that does
not exist. **When bulk sending is built, this section must be re-drafted
before the first send** — and a one-click unsubscribe is not optional at
that point.

### Changing this text

The exact wording shown is stored on each prospect record at the moment of
consent, so **editing this section does not rewrite anybody's consent** —
existing records keep the words they were actually given. That is the whole
reason it is stored rather than referenced.

---

## Not yet drafted

- **Coach, volunteer, and committee wording** — WWCC evidence collection
  (**BR19**), the linked-organisation relationship (**BR51**), and contact
  details appearing in team communications.
- **Adult self-registration rendering.** A player aged 18+ registering
  themselves needs §1 and §2 reworded in the first person, not the same
  text with a different checkbox. Mechanical, but it is a separate
  rendering.
- **Referee-specific wording**, including the guardian-issued calendar feed
  for a minor official (**BR33**) — which is where
  [open question #37](../scope/open-questions.md)'s age-of-control gap will
  first be felt in something a person actually reads.
