# Project Scope — The Tokenised Family Link

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

[Scope document 17](./17_mvp-registration-slice.md) shipped the family
registration form behind a club login, which made it registrar-assisted
intake rather than something a parent completes from a link at home — and
recorded that as the slice's last real gap. This closes it: a club issues an
unguessable, expiring, revocable link; a family follows it and registers
once, with no account.

The reason it needed its own pass rather than a quick fix is that **the
existing security model has nowhere for an unauthenticated writer**. Every
policy keys off `auth.uid()` resolving to a `club_membership` row. Something
had to let an anonymous caller write into exactly one club, and the
tempting answer — a service-role write from a server action — would have
made Principle P5 depend on application code being correct, which is the
property the stack was chosen to avoid.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No change. Serves Goal **G6**'s test directly — *does it reduce the number of times a parent types their child's details?* — through capabilities C2 and C15, which already exist. **No new or excepted Principle:** the link writes to one named tenant and reads nothing, so P5 holds as written rather than gaining a carve-out in the way P6 is one |
| 2_business | **BR72** (registration by scoped invitation: write-only, one club, one season, no account) and **BR73** (token stored as a hash, shown once, expiring and revocable, uses counted). New business object **Registration Invitation** and a glossary entry. In [4_business-objects.md](../ea/2_business/4_business-objects.md) and [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) |
| 3_information | New data object **`registration_invitation`** in [1_data-objects.md](../ea/3_information/1_data-objects.md) — holding the token's hash, never the token |
| 4_application | New components: the public join page, the registrar's link management screen, and the `security definer` function that is the entire public write surface. In [2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology | No change. Same stack, same deployment; the new surface is a database function and two routes |

Recorded as [decision 6](../decisions/6_public-registration-through-a-scoped-function.md),
because a standing RLS bypass is exactly the call a future reader will ask
"why this and not the alternative?" about.

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | The registration form required a club session, so a family could not use it. A registrar keyed in what families sent by other means — which leaves the re-keying step BR55 exists to remove, just moved to a different desk |
| **Target** (delivered) | A club issues a link per cohort; families register directly; the registrar's queue fills itself. The public write surface is one auditable function that cannot be aimed at another club, proved behaviourally across 18 scenarios |

## Work packages and deliverables

### WP1 — EA alignment *(done)*

- **Deliverables:** BR72/BR73, the Registration Invitation object, the
  glossary entry, the data object, the component rows, and
  [decision 6](../decisions/6_public-registration-through-a-scoped-function.md).
- **Outcome:** the rules and the reasoning exist before the bypass does.

### WP2 — Schema and the public write surface *(done)*

- **Deliverables:**
  `supabase/migrations/0005_registration_invitations.sql` — the
  `registration_invitation` table with its policies, and
  `submit_public_registration`, a `security definer` function with a pinned
  `search_path`, granted to `anon` and `authenticated` and to nobody else.
- **Outcome:** an anonymous caller can create one registration in the club
  the token names, and can do nothing else.

### WP3 — Screens *(done)*

- **Deliverables:** `src/app/join/[token]/` (the public form),
  `src/app/registrar/invitations/` (issue, list, revoke),
  `src/app/_components/RegistrationForm.tsx` (shared by both flows so they
  cannot drift apart), `src/data/invitations.ts`, and
  `src/web/invitation-view.ts`.
- **Outcome:** a registrar can hand out a link in under a minute, and revoke
  it as fast.

### WP4 — Proof *(done)*

- **Deliverables:** `supabase/tests/12_public_registration.sql` — 18
  behavioural scenarios; 17 new unit tests in
  `src/web/invitation-view.test.ts`.
- **Outcome:** the bypass is asserted rather than assumed. Verified by
  weakening the function and confirming the suite named each failure.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Issue, list and revoke links per club and season | Rate limiting or bot protection on the public endpoint |
| Anonymous submission of one registration, with BR1 and BR48 enforced in the database | Letting a family *return* to view or amend what they submitted |
| Token stored as a hash, shown once, expiring, uses counted | Single-use links, or links tied to one named child |
| Behavioural proof that the link cannot reach another club | Document upload by the family — still a registrar task |
| The family seeing what is still outstanding after submitting | Persisting that evaluation; `anon` holds no grant on `validation_result` |

## Gap notes

- **No rate limiting.** A leaked or shared link can be submitted through
  repeatedly, producing junk registrations in the issuing club's queue. That
  is a nuisance rather than a disclosure — nothing is readable, and a human
  works the queue — but it is unbuilt. Closing it means either a per-link
  submission cap (cheap, and the natural next step, since `use_count` is
  already recorded) or a CAPTCHA, which costs a family friction on the one
  flow whose measured problem is abandonment. The cap is the better trade.
- **A family cannot come back.** Once submitted, the link offers no way to
  see, correct, or add to the registration; a correction goes through the
  club. This is a deliberate consequence of the link being write-only —
  letting it read would make it a session, with all the tenant-isolation
  questions that reopens — but it means a typo costs a phone call.
- **Validation results are not persisted for a public submission.** The
  family is shown what is outstanding, evaluated in memory. Granting `anon`
  an insert on `validation_result` would let anybody write arbitrary rule
  outcomes into a club, so the persisted history comes from the registrar's
  queue re-evaluating instead. The consequence is that
  [#32](./open-questions.md)'s decomposition counts registrations as the
  registrar sees them, not as they arrived.
- **A revoked link cannot be un-revoked**, by design — reissuing is one
  click, and an "undo" on a credential revocation is a way to resurrect one
  someone already decided to kill.

## Open questions

- None new. If [#42](./open-questions.md) is answered — Squadi supporting
  club-side assisted submission — the family's destination becomes the
  federation's own confirmation step and the invitation carries them there
  instead; the function stays, what changes is what happens after it
  returns.
