# Project Scope — The Front Door Speaks to a Club

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/homepage-role-explorer`.

On 28 October 2026 the product owner supplied a redesign brief for the
public homepage. Its aim is to win a pilot conversation with the people who
run a club: presidents, secretaries, treasurers, registrars, academy and
technical directors. Since [scope 100](./100_the_animated_homepage.md) the
page has told the one-Person idea as a scroll for three audiences at once:
a family, an officer, and a prospect. That scroll showed a turning lens, a
registration timeline, five roles on a phone and a matchday line-up. Its
first screen asked a prospect to sign in or start a registration, which a
prospect cannot do.

The brief asks for four things:

- the benefit first: *"Less time chasing admin. More time running your
  club."*;
- a role explorer that lets a visitor see each person's work;
- one registration walked through step by step;
- a new typographic system.

It is a **first iteration on the homepage only**. The authenticated
workspaces keep their layouts, and they change only in type, through the
shared tokens.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **Changed, wording only.** The [value proposition](../ea/1_strategy/4_value-proposition.md) gains the commercial headline and its supporting line, each traced to what is built. The claim boundaries are applied on the page: PitchPeople does not replace Squadi, "AI-assisted" never means AI-decided, and no money moves. No goal, driver or principle changes |
| 2_business    | **No change.** No rule, service or role changes. The page describes rules that already exist (BR1, BR2, BR3, BR5, BR15, BR43, BR48, BR58, BR60, BR61, BR62, BR72, BR78, BR109, BR119, BR121, BR184, BR187), and a test checks that each one cited is in the rules table |
| 3_information | **No change.** The page reads nothing and stores nothing. Its people and club are a fixed, fictional dataset in `src/web/home-story.ts`, and the page labels them as fictional |
| 4_application | **Changed.** `/` is rebuilt around a hero with a tabbed product preview, a **role explorer** (eight roles, a shared-identity hub, and a workspace preview per role), a **registration walkthrough**, the connections between roles, trust, and the pilot conversation. The new client components are `HeroPreview`, `RoleExplorer`, `RegistrationWalkthrough` and `ScrollReveal`. Their decisions are pure, in `src/web/home-story.ts`. `PersonLens` and `RoleWorkspaces` are retired. The page stays prerendered, with no auth call |
| 5_technology  | **Changed.** The self-hosted faces change. **Saira** (display, variable width and weight), **Public Sans** (interface and body, variable weight) and **IBM Plex Mono** (codes, rules and figures) replace Archivo and DM Mono. They are latin-subset woff2 files in `public/fonts/`, with their OFL licences beside them. As before, nothing is fetched at build or run time |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | The hero's actions are *Sign in to your roles* and *Start a registration*. The pilot and the demonstration club appear only at the bottom. The roles are five fixed previews, and the lens turns by itself. The type is Archivo and DM Mono |
| **Target** (delivered) | The first screen states the benefit, with *Explore the demonstration club* (`/demo`) and *Discuss a pilot for your club* (`/interest`) as its two actions, and a one-line route for families to register or sign in. A visitor can pick any of eight roles and see that person's workspace, the other roles they hold, and the one thing that role never sees. A visitor can step through a registration, rule by rule. The type is Saira, Public Sans and IBM Plex Mono |

## Work packages and deliverables

### WP1 — Typography

- **Deliverables:**
  - `public/fonts/saira-var-latin.woff2`, `publicsans-var-latin.woff2`,
    `plexmono-400-latin.woff2` and `plexmono-500-latin.woff2`, with
    `public/fonts/licenses/OFL-*.txt`.
  - The Archivo and DM Mono files are removed.
  - `src/app/globals.css`:
    - the `@font-face` rules;
    - `--font-sans` set to Public Sans;
    - a new `--font-display` set to Saira;
    - `--font-mono` set to IBM Plex Mono;
    - page titles, the hero and the eyebrow set in the display face.
  - `src/DESIGN.md`: the typography tokens and section, and a decision note.
- **Outcome:** one type system across the product. A condensed athletic
  face carries the headlines, a sturdy text face carries dense
  administration, and a monospace carries rule identifiers and times.

### WP2 — The homepage

- **Deliverables:**
  - `src/web/home-story.ts`, the fictional dataset and the pure decisions:
    - the hero's three preview tabs;
    - the eight role views and who holds each;
    - the roles a person also holds;
    - the walkthrough's steps and moving between them.
  - `src/web/home-story.test.ts`.
  - `src/web/brand.ts`: `HEADLINE` and `PITCH`.
  - `src/app/_components/HeroPreview.tsx`, `RoleExplorer.tsx`,
    `RegistrationWalkthrough.tsx` and `ScrollReveal.tsx`.
  - `src/app/page.tsx`.
  - The front-door block of `src/app/globals.css`, rewritten.
- **Outcome:** a visitor learns what PitchPeople does, why it matters to
  their club, and how to see it or talk to us, all on the first screen.

### WP3 — Documentation

- **Deliverables:**
  - The [value proposition](../ea/1_strategy/4_value-proposition.md).
  - The front-door row of the [application components](../ea/4_application/2_application-components.md).
  - The styling row of the [technology services](../ea/5_technology/1_technology-services.md).
  - The scope index.

## How the brief was adapted

| The brief asks | Delivered as | Why |
| -------------- | ------------ | --- |
| Hero actions for prospects only | The two prospect actions, plus a one-line *Registering a player? / Sign in to your roles* | Scope 100's family and officer still arrive here. The top bar's *Register* and *Your workspace* stay too |
| Roles including President or Secretary, and Team Manager or Coach | Eight roles, each mapped to the screens that realise it: governance and the committee hub, arrears and referee payments, the queue, designations and verification, the team dugout, the household, appointments and the feed, and the academy | Federation and association roles are not shown as workspaces, because none exists. The page says PitchPeople works on the club's side of the governing body |
| A central Person connected to roles | Five fictional people hold the eight roles between them. The hub draws lines only to the roles the current person holds, so it never implies everyone holds every role | BR61: one active role at a time, switched explicitly |
| A registration journey | Five steps, each naming who acts, what is checked (BR1, BR2, BR3, BR5, BR43, BR48, BR60, BR72), where a person decides, and what follows | It submits nothing, approves nothing and moves no money, and the page says so |
| Scroll entrances | `ScrollReveal`: an `IntersectionObserver` that reveals a section once and never replays it. Content is visible without JavaScript and with reduced motion | Scope 100's scroll-scrubbed animations replayed in reverse when scrolling back |
| `npm run build` | Not run locally, at the product owner's standing instruction. `npm run check` runs in full | The Vercel preview build of the pull request is the build check |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The homepage, and type everywhere through the tokens | Redesigning the authenticated workspaces' layouts |
| A fictional, labelled dataset on the page | Reading any club's data on the front door |
| Eight club and academy roles | Federation or association workspaces, which do not exist |
| Links to `/demo`, `/interest`, `/season-paths`, `/register` and `/me` | A booking flow, a free trial, or self-service provisioning (BR145, decision 7) |

## Gap notes

- **The workspaces only change typeface.** If the direction is approved, a
  later scope can carry the homepage's composition into the dashboard and
  `/me`.
- **The role explorer is an illustration.** It shows what a role's screen
  holds, not the screen itself. The demonstration club is where the real
  screens are, read-only, with fictional families.
- **The matchday line-up is retired.** The walkthrough and the coach's view
  now carry its content: who is clear to play, and who has the whistle.

## Open questions

- None. The brief settles the messaging. If the product owner prefers
  another face once they have seen it, only the tokens change.
