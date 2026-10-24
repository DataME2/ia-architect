# Project Scope — The Club Dashboard, the Club Profile and the Workspace Card

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/club-dashboard-and-profiles`, stacked on
`claude/pitchpeople-style` ([scope 105](./105_the_pitchpeople_style_everywhere.md)).

[Scope 105](./105_the_pitchpeople_style_everywhere.md) put every screen in
the v7 PitchPeople style. The product owner then asked whether that style is
responsive on tablets and phones, and for three more screens after
Superdesign drafts in project `46a311a6`:

- **Club administration (`/registrar`) in the style of "Dashboard"** (draft
  `ff13a4a1`, v2): a dark sidebar, metric cards, a roster table, a
  distribution chart and quick actions.
- **Something similar for each organization**, after "PitchPeople
  Organization Profile" (draft `49803799`, v2): a header card, a row of
  figures, the teams, the people who run the club, branding and billing.
- **Something like it for each workspace**, after "Volunteer Profile
  Detail" (draft `7d7bec9a`, v2): a profile card, performance figures, a
  history table, a dark upcoming-schedule card and quick actions.

**Responsiveness was checked before anything was built.** Twelve screens
(the queue, `/me`, people, teams, access, governance, fixtures, reports,
season calendars, sign-in, the front door and *For clubs*) were loaded at
360, 768 and 1024 pixels wide. None scrolls sideways at any of the three. The
front door's pitch markings are 8px wider than a desktop window with a
classic scrollbar, and `html:has(.home)` clips them (scope 104). The three
screens below were checked at the same widths once built.

Each draft is **adapted, not pasted**. The drafts were made for a generic
volunteer-management product and are filled with invented figures. Every
number here is counted from the club's own records, and anything the
product does not hold is left out rather than faked:

### The dashboard (`/registrar`)

| The draft had | The app keeps |
| ------------- | ------------- |
| A sidebar with Dashboard, Schedule Management, Engagement Center and Settings | The club menu's real destinations (`src/web/nav.ts`), grouped as before, drawn as the dark sidebar on **every** club screen. On a phone it is still the Menu button |
| John Doe, President, at the foot of the sidebar | The session strip above the page, which already names the person, the club and every role held |
| "Search volunteers…" | **Search people**, which opens the people directory with the search filled in. The directory already searches by name |
| A bell with a gold dot | The existing notification bell |
| "Data is live and refreshing · Last updated: Just now" | "**Rules evaluated on this load**", with the time. Nothing refreshes by itself; every load runs the rules fresh |
| 342 active volunteers, "+12% this week" | **Registrations** this season. No week-on-week change: no history of the count is kept |
| 98% schedule coverage, with a bar | **Registered**: the share the federation has confirmed, with a bar |
| 14 upcoming games, in gold, "2 games need referee coverage" | **Needs action**, in gold, with what is owed and by how many families |
| A volunteer roster: name, role, status, phone number | The season's registrations as a table: player, status (a dot and a word), what is holding it up, what is owed. Each name opens the registration. No phone numbers on a dashboard |
| Role distribution with invented counts | **People this season, by role**, counted from `person_role` |
| — | **What is holding the season up**, as one bar per rule (it was a table) |
| Quick actions: Schedule Volunteer, Send Communication | **Send the reminders** (the existing bulk reminder, BR127), Registration links, Submission pack and People |
| Green `#2ECC71`, gold `#F39C12` | Stadium green from the base ramp, and gold `#FFC145` with pitch-blue text on it |

The queue's other content stays: the season picker, BR79's *registered
but cannot play* table, and the four groups. They are now table rows rather
than cards, and the rule messages are on the registration page.

### The club profile (`/registrar/club`)

"Each organization" is each club: every club gets this page for its own
records, and Row-Level Security stops it showing anyone else's (P5).

| The draft had | The app keeps |
| ------------- | ------------- |
| A logo with a camera overlay for uploading | The crest slot the identity rail already draws: dashed and labelled until a crest is licensed. There is nowhere to store a logo, so there is no upload |
| "2,450 Members", "Verified Organization" | **People on record**, and the licence standing as a dot and a word: Licensed, Trial, Renewal due, Lapsed, Suspended, Ended or No licence recorded (`standing()` in `src/web/platform-view.ts`, migration 0018) |
| Edit Profile | Nothing. The platform sets a club's name and jurisdiction when it provisions the club |
| Invite Members | **Manage access**, for an administrator, which opens the access screen |
| Volunteers, teams, games, hours logged, a 98.4% compliance rate | **People on record, teams, fixtures, registrations and the share registered**, for the chosen season. Volunteer hours are not recorded, so they are left out |
| A team roster with view, edit and delete icons | **Teams this season**: team, coach, players and officials. One link to the teams screen, where changes are made |
| Admin members: name, role, joined, status | **The committee serving this term**: name, position, elected date, and confirmed or awaiting confirmation (BR166) |
| Branding: tagline, primary colour, logo upload | Left out. The club has no tagline, colour or logo to store (see gap notes) |
| A Professional plan at $149, next invoice, Upgrade | **The licence** as the club may read it (0018): standing, term and agreed fee, or "no fee agreed". There is no plan and no upgrade, because the price is negotiated club by club |
| — | **The club's contacts**: the primary and secondary responsible people (0017) |
| A footer with Support, Terms and Status | The site footer |

### The workspace card (`/me`)

| The draft had | The app keeps |
| ------------- | ------------- |
| A photo | Initials, drawn as the identity rail draws them |
| Name, a "Senior Referee" badge, email, phone, team | Name, the role being acted in, the club, the season and the team or scope. No contact details in a header |
| "Verified & Available", "Available for Weekend Match" | "**Acting as** *role*", as a dot and a word. Availability, where it exists, stays in its workspace (the player's *Are you available?*) |
| Edit Profile, Send Message | **Switch role** when more than one is held, and **Club administration** for a club officer. Members cannot message each other |
| Reliability 98.4%, cancellation rate 2%, 128.5 hours, "Top 5% Volunteer" | **Each workspace's own figures**, counted from what it already loads: a player's appearances, minutes, goals and assists; a coach's squad and who cannot be selected; what is waiting on a match official, a committee member, a guardian or a Technical Director. No score and no ranking |
| History, communications, upcoming schedule, quick actions | The workspace's own panels in the draft's two-to-one grid, with the next match in the dark card. No message thread, because there is no messaging between members |

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** The screens serve the goals they already served; scope 100's rule against invented claims governs every figure |
| 2_business    | **No change.** No rule, process or role changes. The dashboard's bulk reminder is BR127's existing flow, and the committee table reads BR166's confirmation as it stands |
| 3_information | **No change.** Nothing new is stored. The club profile reads `club`, `club_licence`, `club_contact`, `team`, `fixture`, `registration`, `person_role` and the committee tables, each through its existing member-read policy |
| 4_application | **Changed.** The club menu becomes a dark sidebar; the queue becomes a dashboard; a new **Club profile** screen and a **workspace card**. Rows updated in [application components](../ea/4_application/2_application-components.md) |
| 5_technology  | **No change.** No new dependency, route group or runtime |

## Plateaus

| Plateau                | State |
| ----------------------- | ----- |
| **Baseline** (before)  | The v7 style everywhere (scope 105), already responsive. The club menu is a white card; the queue is a stat row and four lists of cards. No club has a page about itself. The workspaces open with a one-line *acting as* banner |
| **Target** (delivered) | A dark club sidebar on every club screen; a dashboard queue with metric cards, a registrations table, distributions and quick actions; a club profile for every club; a profile card and a figures row on every workspace. Every figure is counted, none invented, and every screen fits a phone, a tablet and a laptop |

## Work packages and deliverables

### WP1 — Responsiveness

- **Deliverables:** none; the check above is the deliverable. The three new
  screens use the same breakpoints: one column on a phone, the draft's grid
  from 64rem.
- **Outcome:** a yes to the product owner's question, measured at three
  widths.

### WP2 — The dashboard

- **Deliverables:** `src/components/ui/RegistrarNav.tsx` (the dark
  sidebar); `src/app/registrar/page.tsx`; `src/web/dashboard-view.ts`
  (shares and bar lengths) with its test; the dashboard styles in
  `src/app/globals.css`, including a `--gold` token.
- **Outcome:** a registrar sees the season's state in the first screen, and
  the bulk reminder is one click from it.

### WP3 — The club profile

- **Deliverables:** `src/app/registrar/club/page.tsx`;
  `src/data/club-profile.ts` (club, licence, contacts, registration counts);
  `src/web/club-profile-view.ts` (jurisdiction names, licence words) with
  its test; **Club profile** first in the menu's Club group (`src/web/nav.ts`).
- **Outcome:** every club has one page saying what it is, who runs it, what
  it fields and what it has agreed with the platform.

### WP4 — The workspace card

- **Deliverables:** `ProfileCard`, `Metrics` and a dark `Panel` in
  `src/app/me/_workspaces/shared.tsx`; `src/app/me/page.tsx`; a figures row
  in each of the six workspaces.
- **Outcome:** each workspace opens on who you are, the role you are acting
  in and the numbers that role turns on.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The dark sidebar on every club screen | A sidebar for `/me`. The identity rail already is one |
| The dashboard's figures, tables and bars from the queue and `person_role` | Week-on-week change, and anything else that needs history the product does not keep |
| Search people from the dashboard header | A search across every screen |
| The club profile for each club, read-only | Editing a club's name, jurisdiction or contacts from the club side |
| — | **Club branding**: a crest, a colour and a tagline |
| — | Plans, invoices and an upgrade button |
| The workspace card and figures row | Photos in the card; messaging between members; reliability or ranking scores |

## Gap notes

- **Club branding.** The draft lets a club upload a logo and set a colour and
  a tagline. Doing it needs a storage bucket with a policy, three columns on
  `club`, and a decision on who may change them. The crest slot is
  already in place for it. A crest also raises a licensing question for a club
  whose badge belongs to someone else, like open question #66 does for the
  interface's artwork.
- **History for trends.** "+12% this week" needs the counts kept over time.
  The queue is evaluated fresh and nothing stores yesterday's answer.
  Keeping a daily count per club is cheap, but it is a new table with its
  own policy.
- **Plans and billing.** Price is negotiated per club (0018), so a plan
  picker would be a claim the business does not make. If standard plans are
  ever offered, they belong in strategy first.
