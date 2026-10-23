# `src/web/`

_[← Repository README](../../README.md) · [Application components](../../docs/ea/4_application/2_application-components.md)_

## Purpose

**What the screens decide** — not what they look like.

Which pile a registration belongs in, what is wrong with a submitted form,
which rule is costing the club the most, what a guardian's household card
may claim about a child, where a sign-in should land. Each is a pure
function here; the `.tsx` in [`src/app/`](../app/README.md) renders the
answer and little else.

The reason is testability, and it is not academic. A card reading
"Registered" over a child who cannot take the field is a BR79 failure that
**would look completely fine in review**. As a pure function it fails a test
instead, in the same `node --test` run as the domain — no browser, no
database, no rendering.

**The rule of thumb:** if a screen has to *decide* something, the decision
comes here and the component renders it.

## Key dependencies

**Depends on:** [`src/domain/`](../domain/README.md), and nothing else.

**Depended on by:** `src/app/` — pages, layouts and server actions.

**Same enforced constraint as the domain:** no React, no Supabase client, no
DOM. `tsconfig.domain.json` compiles this directory with no DOM library, so
`document.`, `window.` or a React import fails `npm run typecheck` rather
than waiting for a reviewer. `photo-crop.ts` is the instructive case — image
cropping that must run in a browser, written as pure geometry so the part
that can be wrong is the part that is tested.

## Layout

Roughly one module per screen or per decision, with its `*.test.ts` beside
it:

| Module | Decides |
| ------ | ------- |
| `queue-view.ts` | How the registrar's season queue groups, and what each pile is waiting on |
| `brand.ts` | The product's name, its line and its maker (scope 95): PitchPeople, "One identity. Every role. Connected football.", By Let’s Data Talk. One place, so the masthead, tab title, sign-in panel and footer cannot drift. Calendar UIDs deliberately keep the old domain |
| `bulk-reminders.ts` | Who a bulk chase actually reaches (R34.1), and who it leaves out. The two failures it exists to prevent are the two that cannot happen one child at a time: a reminder listing nothing, and a family chased twice in a week. `daysBetween` is calendar arithmetic rather than a duration, so "reminded yesterday" means yesterday at nine in the morning as well as at five |
| `fee-schedule-form.ts` | The fee-schedule editor's decisions. Nothing here prices anything — `rateFor` is the one definition of what a game pays — so this is about the table a club types in: parsing a cell, naming a clash the way `rateFor` would see it, saying which schedule is in force, and `gaps()`, which says on the page that **no rate is not a rate of zero** rather than leaving a club to find out when a claim is raised |
| `claim-view.ts` | What the verification and claim screens decide. `previewClaim` calls the existing `claimable()` and `rateFor()` from `src/domain/officiating/fees.ts` rather than restating either — a second definition of BR13's verdict or BR116's amount is exactly where the two would drift. `canClose`/`canPay` say why a batch cannot be acted on before BR117's trigger has to |
| `designation-answer.ts` | What the answering screens decide (BR113). `isAdultOn` repeats the database's age arithmetic deliberately — a screen that thought a seventeen-year-old was an adult would show them a question the database then refuses to take from them — and both measure at the date the answer is given rather than at the fixture, which is the opposite of how BR111 measures a card and for the opposite reason. The decline-needs-a-reason check exists so a parent is told before they lose what they typed, not instead of BR42's constraint |
| `registration-form.ts`, `registration-form-state.ts`, `prospect-form.ts`, `enquiry-form.ts` | Parsing and validating what a form actually submitted. The last two are the same shape one door apart, and the difference is the design: the demonstration door requires one field because a visitor who only wants to look has decided nothing (BR91); an enquiry requires two and invites six, because typing your club's name has already decided something (BR144) |
| `form-result.ts` | The one shape every action hands back — `idle \| ok \| error`, **always with a message**, because silence is not a success state |
| `home-view.ts` | The person's home (scope 89): which of their own waiting items are listed, in what order, under which role, and each role card's count. BR61 holds: every item is a link into one role context |
| `referee-board.ts` | The match official board (scope 90): the availability grid's round trip to windows (BR174), each upcoming appointment's red/amber/green check with its rules (BR7, BR10, BR111), and the claims ledger |
| `dugout.ts` | The Team Dugout (scope 99): who starts in a 4-3-3, 4-4-2 or 3-5-2, by preferred then secondary position, and who sits on the bench and why. **Only a player who may take the field starts** — the verdict is `playEligibility`'s (BR79, BR164), worded "not clear to play", never an amount (BR78); a player who said no this week sits too (BR62). A keeper is never put in defence, nor an outfield player in goal, by elimination |
| `technical-director.ts` | The Technical Director's workspace (scope 98): `TD_PERMISSIONS` and `TD_NOT_PERMITTED`, the role's access written down once with where each is enforced; the activity feed's sentences (BR176); and BR177's source check, the same eight characters 0093 requires |
| `competition-calendar.ts` | The competition by calendar year and team (scope 99): fixtures grouped by year, team and month, a Monday-first month grid, and the Excel (SpreadsheetML) and CSV exports, escaped |
| `registration-wizard.ts`, `financial-gate.ts` | Scope 91. The registration form's steps, matched to the fields `parseRegistrationForm` reports, so a step is checked by the server's own parser; and the Financial Gate, a restatement of `playEligibility`, `planState` and the two-year arrears as one summary |
| `household-view.ts`, `me-view.ts`, `role-context.ts` | The person-facing surface: one record, one active role at a time (BR61, BR63, BR65). `holdsCommitteeRole` is here rather than in `src/data/` because it is a **decision**, and it was wrong: three things can be called committee and the screen asked about the two that are access grants rather than the one that is the elected office |
| `plan-view.ts`, `money.ts` | Instalment ledgers, arrears, and money formatted one way everywhere |
| `referee-view.ts`, `availability-view.ts` | The officiating roster and who may officiate what |
| `player-view.ts`, `team-view.ts`, `people-view.ts`, `access-view.ts`, `platform-view.ts`, `pack-view.ts`, `invitation-view.ts` | One screen's decisions each |
| `governance-view.ts` | The governance screen's decisions, including BR123's resolution form and BR21's enablement form. `enabledProgramNames` compares trimmed and lower-cased — the same comparison `assert_voucher_program_is_enabled` makes in the database — so the screen never calls a program new when a club only typed its name differently the second time |
| `fixture-change.ts` | What changed about a fixture, in the words a participant reads (BR64) — computed from before and after, so a submit that changed nothing announces nothing |
| `privacy-view.ts` | Grouping retention proposals so the **irreversible** group is the only one with an action beside it — a life member listed like a lapsed player is how a club deletes its own history |
| `unsubscribe.ts` | Reading an unsubscribe link out of an inbox — mail clients wrap URLs and append punctuation, so what counts as a readable link is the part worth testing |
| `season-calendar.ts`, `season-calendars.ts`, `season-calendar-fq-2027*.ts` (one per Queensland region) | A governing body's season calendar (scopes 101, 103): how a printed cell reads, weekends by month, the season's pulse, a competition's journey — and the transcription itself, keyed by the Friday that opens each weekend, tested against the round counts the PDF promises |
| `team-competitions.ts` | Which competition each team plays in (BR179): the four editor roles, the calendars a season covers, the options a form offers, accepting only a choice the calendar knows, and a history line as one sentence |
| `nav.ts`, `safe-destination.ts`, `password.ts`, `today.ts` | Cross-cutting: the club menu, where a redirect may legitimately go, password rules, and a timezone-correct "today" |

## Where the architecture lives

[`docs/ea/4_application/2_application-components.md`](../../docs/ea/4_application/2_application-components.md),
whose "three structural rules for the code" section states this separation
and why it is enforced by a compiler flag rather than by review.
