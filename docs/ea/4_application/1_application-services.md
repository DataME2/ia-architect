# Application Services

_[← Application layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Application Service.

What the software offers the business layer, and **how much of it actually
exists**. The status column is the point of this document: it is checked
against the code rather than against intent, and a service is only
*Delivered* when something in `src/` or `supabase/` does it end to end.

Read with [2_application-components.md](./2_application-components.md),
which names the code that realises each one.

## Status vocabulary

| Status | Means |
| ------ | ----- |
| **Delivered** | Built, exercised by tests, and reachable by a person through a screen or a public link |
| **Partial** | The named part works end to end; the row says what is missing, and the missing part is not a detail |
| **Documented, not built** | A decision or design exists in `docs/` and no code does it. Deliberate — recorded so the next person does not invent a different answer |
| **Not started** | No design, no code |

## Delivered

| Application Service | Realises | What it does | Status |
| ------------------- | -------- | ------------ | ------ |
| **Identity & role management** | C1 | One `Person` per human, legal and preferred names kept apart (BR55), roles attached per season and overlapping by design (P1), guardianship with authority and contact separated (BR67). Possible duplicates are surfaced for a human to confirm and merged by an audited, reversible-in-principle tombstone rather than a delete (BR5, BR82) | **Delivered** |
| **Registration capture** | C2 | A season registration collected once — player, guardian, documents, consents — through **one creation path** used by both the public family link and the registrar's own form, so neither can drift from the rules | **Delivered** |
| **Deterministic validation** | C6 | BR1, BR2, BR3, BR48 and BR55 evaluated against a registration and **persisted**, so "what is missing" is a stored answer with a history rather than a recomputation | **Delivered** |
| **Submission pack generation** | C16 | Validated registrations assembled into an immutable, versioned pack with a frozen manifest, the handover recorded, and each person tracked as *sent* rather than *registered* (BR58–BR60) | **Delivered** |
| **Team & official management** | C1, C2 | Teams per season, rosters, and team officials — with a **verified Working with Children Check enforced as a precondition** of an official's appointment, measured against the end of the season (BR83, BR84) | **Delivered** |
| **Club governance & administration** | C19 | The committee as a record: who holds which office, elected at which AGM, serving until the next. An overdue AGM is flagged rather than hidden (BR86), holders must be adults (BR87), and a missing card is shown rather than refused (BR88) | **Delivered** |
| **Player performance record** | C20 | What a player did in a season — appearances, minutes, goals and assists, against fixtures the club records itself. Physique and position on a profile card with the identification photograph, shown to club staff only so the photograph stays inside the consent it was collected under (BR100). **Advanced metrics are designed and unbuilt**: xG, shots and big chances need event data with pitch coordinates, which no volunteer records and no provider sells for junior football ([scope 30 §5](../../scope/30_the-player-record-and-what-a-statistic-costs.md)) | **Delivered** |
| **Account identification** | C1, C19 | Says *who* is signed in rather than which email address. An administrator records which `Person` an account belongs to — one per account per club and one per Person per club (BR106), asserted and **never inferred from a matching email address** (BR107, [decision 10](../../decisions/10_identity_is_asserted_never_inferred.md)). The session strip and the access screen show the name; an unlinked account is shown as unlinked, with no fallback to the address (BR108). Grants no permission of its own | **Delivered** |
| **Audit** | Cross-cutting | Append-only record of overrides, pack generation and handover, and authority transfers. **Append-only by the absence of an update policy**, not by convention | **Delivered** |
| **Tenant isolation** | C10, P5 | Every table carries `club_id` and every policy keys off it, enforced by the database so a query missing its filter returns nothing rather than everything. Proved behaviourally, not just structurally | **Delivered** |
| **Platform administration** | C10 | Creates a club, its first season and its first administrator atomically and idempotently, from `/platform` — which is also where the platform identity **lands on sign-in**, because it holds no membership and the club queue has nothing to show it. Every recognition point asks `app_is_platform()` rather than comparing an email address, so there is one control rather than two that can disagree. The console shows the portfolio: clubs supported, licensed, renewal due, and the fees agreed, replacing four hand-typed SQL statements whose failure mode was a half-created tenant. **Reads club metadata and never tenant contents** — the boundary that let this be built without the P5 exception scope 28 feared, since creating a tenant needs no ability to read inside one ([decision 9](../../decisions/9_platform_administration_provisions_but_never_reads.md)) | **Delivered** |
| **Demonstration access & prospect capture** | C10 | A stranger sees the product working — a real tenant of invented families — in exchange for an email address, with no account and read-only rights. Marketing consent asked separately, refusable, and recorded with the words shown (BR91–BR93) | **Delivered** |
| **Referee lifecycle management** | C4 | A match official as a `Person` like any other (P1): classification as a **history of dated rows** rather than an overwritten column (BR110), accreditations and suspensions, season availability and unavailability (BR62), and designations refused on direct role conflict, double-booking, insufficient classification, suspension or lapsed accreditation checked against the **fixture's** date (BR6–BR10, BR109, BR111). Same-club affiliation, family relationship and match load warn and are audited rather than block (BR11). A decline is not recorded at all until a reason is given (BR42, BR112), and every designation records which party made it (BR114) | **Delivered** — and from [scope 39](../../scope/39_asking_at_the_door_whether_they_also_officiate.md) it is also where officials come *from*: every registration asks whether they would like to officiate and what they have officiated before, as a **claim** a coordinator reviews (BR136). BR138 landed with it — only a *sighted* classification counts toward BR8, which `referee_classification`'s own comment had asked for since it was written |

## Partial — and what is missing matters

| Application Service | Realises | Delivered | Missing | Status |
| ------------------- | -------- | --------- | ------- | ------ |
| **Player finance management** | C3 | Payment plans with instalments that **must** sum to the plan total (BR74), append-only payments and refunds (BR77), vouchers attached, verified or rejected with the relief receipt they imply (BR81), and the no-pay-no-play eligibility rule including the case that looks finished everywhere and is not (BR79) | **No payment provider.** Square is the confirmed choice and nothing integrates with it: every payment is recorded by hand by a treasurer. No invoicing, no reconciliation, no treasurer's own screen — finance is worked from the registration detail page | **Partial** |
| **Referee finance management** | C5 | A claim requires a verified match, and **nobody verifies the match they were paid for** (BR13, BR119). Fee rates resolved from a dated schedule and **stored on the claim at the amount it was computed at**, never recomputed at read time (BR115, BR116). No claim for a cancelled match; an abandoned one needs the official's explanation (BR17, BR18). No double payment (BR14), batches closed before they are paid (BR117), and a remittance that records what the club paid elsewhere (BR118) | **No claim screen**: a treasurer cannot raise or approve a claim through the application — scope 34 delivered that in the database only, so `notifyClaimApproved` is built and unwired. The **fee-schedule editor now exists** ([scope 53](../../scope/53_the_rate_table_a_club_never_had.md)), which unblocked the service's first step: until it did, no club had any rates, every lookup returned "no rate", and **no official could be paid at all**. BR12's decline-rate threshold waits on a season of history to set it. **BR113 now has code** ([scope 51](../../scope/51_the_child_does_not_answer_for_themselves.md)): an under-18 official's designation is answered by a Parent/Guardian holding authority and by nobody else, is not created at all where no such guardian is recorded, and carries whose answer it is — though **nobody is emailed about it**, so a guardian finds it by opening `/me`. No banking details, deliberately | **Partial** |
| **Communications** | C7 | A guardian reminder composed from the registration's **own rule outcomes**, so what a family is told is what the rules say (BR127, BR131). An unsubscribe reachable **without an account** (BR128), with marketing and operational suppressed separately (BR130) and suppression held here rather than at the provider (BR129). An append-only `message_log` recording the suppressed as well as the sent — an absent row would mean both *never attempted* and *correctly withheld* | **No campaigns**, so the marketing consent the demonstration door collects is now withdrawable but still not usable. **No bounce handling** — the provider knows a message died and this does not. **Two of the four notification points have no caller**: nothing in the application edits a fixture (BR64) and claim approval is database-only, so those notifications are built and unwired rather than pretended | **Partial** |
| **Competition & calendar** | C11 | An association's competitions, tiers, playing formats and **ranked** classification levels, catalogued once and read by every club (BR134, BR135). The point of it is one rule: **BR8 stops being a warning that says it cannot judge** and starts refusing an official below the competition's minimum, naming the level that was needed. A fixture references the catalogue, and can be edited — which finally gives BR64's notification a caller | **The catalogue ships empty**, and a club cannot fill it: seeding a guessed pathway would refuse the real levels. **Competition Regulations as documents** are not modelled — C11 names them and this holds names, tiers, formats and minimums. Free text is not refused by the database, deliberately ([scope 38](../../scope/38_the_catalogue_that_makes_br8_computable.md)) | **Partial** |
| **Carnival & event management** | C12 | Multi-club events, and **the product's only deliberate exception to P5**. A visitor with no account reads a published event's draw, standings and each team's next unplayed fixture (BR26, BR27) — and no child's name, because the tables carry **no `person_id` column at all** (BR139), asserted against `information_schema` rather than trusted. Publication is one explicit, reversible, audited act (BR140) | **BR28 is not honoured**: a match official appointed to a carnival fixture should pass the same conflict checks a season appointment does, and `match_official_appointment` references `fixture` — a different table — so the path is not wired at all rather than wired loosely. **No index of published events**, so a visitor needs the link | **Partial** |
| **Calendar distribution** | C13 | A private, revocable, per-Person iCalendar feed a referee's own calendar **pulls** — so P2 needs no exception, there is no per-vendor integration, and the platform holds no credential for any account it does not own ([decision 4](../../decisions/4_calendar-distribution-by-feed-not-account-access.md)). The feed is a projection rather than a table read (BR141), carries no other participant's data (BR32), and a minor's belongs to their guardian (BR33) | **Referee appointments only** — decision 4 says "initially", and a player's fixtures would extend the same function. **No `VTIMEZONE` component**: events carry a TZID and rely on the client resolving the IANA name, which a strict RFC 5545 reader may refuse. The refresh cycle is the client's, so a cancellation is *eventually* visible — which is why BR64's notification exists alongside this rather than instead of it | **Partial** |
| **Consent & privacy rights** | C15 | Capture, as before: three independent revocable consents (BR48, BR56, BR57) and prospect marketing consent. **And now the rights**: erasure honoured or refused naming every binding basis and its expiry (BR49, BR132), retention computed by participation and **proposed rather than executed** (BR40, BR133), authority transferring at eighteen while contactability does not (BR67), life membership exempt from the clock entirely (BR69–BR71), and the club's complete export (BR68) | **No scheduler.** `app_run_retention_review()` is idempotent and callable by hand — until a production project exists, "nightly" is a button. An erased Person's address survives in `message_log`, deliberately: BR127's log answers "did you contact this person", which an erasure request does not dissolve | **Partial** |
| **Reporting & dashboards** | C8 | Three summaries — registration, finance, officiating — computed **authoritatively** rather than over what the caller happens to see. Each is a `security definer` function that checks the reader's role and **raises** if they may not have it (BR142), because the alternative is a coach shown `$0 outstanding` by policies working exactly as designed. Owing and credit are counted apart and never netted; an attached voucher is not counted as relief (BR81); a blocker is counted once per registration rather than once per recheck. Every figure carries its base and its as-at moment (BR143) | **One club, one season, one moment.** No trend, no season-on-season comparison, no export, and nothing scheduled — a committee reads the screen, it is not sent to them. The officiating summary counts appointments and claims and says nothing about *coverage*, which is the question a coordinator actually asks. And a figure a reader may not have is refused rather than aggregated to a coarser grain, which is the safe answer and not always the useful one ([scope 42](../../scope/42_numbers_a_committee_can_act_on.md)) | **Partial** |
| **Multitenant platform operations** | C10 | Tenant isolation (above), role-based access through `club_membership`, per-season configuration, roles granted and revoked at a club (`/registrar/access`), and **the owner-issued onboarding link of [decision 7](../../decisions/7_tenant-provisioning-by-owner-issued-invitation.md)** — `/platform` emails a club's named contacts a magic link that creates the account on first use, and `claim_club_access()` attaches the membership the club recorded for that address | **No club branding** — narrowed, not closed. The *platform* now has an identity and a design system ([scope 31](../../scope/31_the-interface-and-the-southern-ocean-palette.md)); a **club** still has none, and on a multiclub product that is the branding a club asks for first. The token layer is the seam it would arrive through, but the open part is what a club's palette may *not* override — a club playing in red and green makes *passing* and *blocked* ambiguous on the queue ([#65](../../scope/open-questions.md)). And no way to invite a colleague from inside a club: `/registrar/access` grants a role to an account that already exists, so anyone but a club's first two contacts still signs up on their own before an admin can attach them | **Partial** |

## Documented, not built

Each of these has a written design and no code. That is a deliberate state,
not a backlog item that got forgotten.

| Application Service | Realises | Where the design lives | Why it is not built |
| ------------------- | -------- | ---------------------- | ------------------- |
| **Historical data import** | C9 | [Scope 28 §4](../../scope/28_onboarding-a-club-and-its-history.md) | **Blocked on a question, not on effort**: [#57](../../scope/open-questions.md) asks what lawful basis covers a decade of children's records handed over by a club. Scope 28 says it must be answered before the first import. BR90 (imported history is history) exists so the answer has something to attach to |
| **Life member register** | C18 | [Scope 18](../../scope/18_life-members.md) | `person_role` does not carry a life-member role yet. Small, and waiting on nothing but priority |
| **Marketing website** | — | [Scope 28 §3](../../scope/28_onboarding-a-club-and-its-history.md) | Explain, qualify, capture. The *capture* third arrived early with the demonstration door; the explaining is not written |

## Not started

No design and no code. Listed so the scope of what exists is not mistaken
for the scope of what was promised.

| Capability | What it would offer |
| ---------- | ------------------- |
| **C14 — External reconciliation** | Continuous matching against SQUADI / PlayFootball. **Blocked externally**: Football Queensland restricts API access to approved system partners ([#39–#41](../../scope/open-questions.md)) |
| **C17 — Mobile experience** | One app per Person, showing the role they are currently acting in |

## What this adds up to

The **registration slice is complete and then some**: identity, capture,
validation, submission, teams, safeguarding, governance and the money that
gates eligibility all work end to end, under tenant isolation the database
enforces.

**The referee half now exists too.** C4 and C5 are a third of the original
motivation and had no code at all until September 2026;
[scope 33](../../scope/33_the-referee-record-and-what-an-appointment-rests-on.md)
and [scope 34](../../scope/34_paying_the_officials.md) built them, down to
the conflict checks and the payment batches. What is left of that half is
named in the Partial row above. The duty-of-care item on that list, BR113,
was closed in September 2026; what remains there is a missing screen — the
fee-schedule editor — and a threshold waiting on a season of history.

Three things are worth saying plainly about the rest.

**It has just learned to send — and to stop.** C7's first code landed in
[scope 36](../../scope/36_the_platform_learns_to_send_and_to_stop.md), and
it was built in the reverse of the obvious order: the **unsubscribe before
anything that sends**, because marketing consent had been collected at the
demonstration door since scope 28 with no way to withdraw it. That was the
one gap in this document that was not merely absent but arguably
non-compliant, and it is closed.

What is *not* closed: there are still no campaigns, so the consent is now
withdrawable and still not usable; nothing reads the provider's bounces; and
with no provider configured a send fails loudly rather than happening.
Everything the product says beyond a registration reminder is still a human
copying something out of a screen.

**Nothing takes money.** Square is chosen and unintegrated; a treasurer
types in what arrived. The rules about money are enforced; the movement of
it is not automated. That holds for both halves — the club's own bank pays
the officials, and the platform records that it did.

**Nothing forgets anything, either.** BR40's retention and BR49's erasure
are statutory rather than desirable, and neither has code. A platform
holding children's personal data that cannot yet honour an erasure request
should say so in its own architecture rather than leave a reader to notice
the absence.
