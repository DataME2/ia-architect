# Project Scope — PitchPeople

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/pitchpeople`.

The product owner renamed the platform (October 2026): **PitchPeople**, with
the line **"One identity. Every role. Connected football."** and **"By
Let's Data Talk"**. The rename comes with three other requests: every
sign-in should land on the person's own workspace, the platform console
needs a way to sign out, and any misaligned layout should be fixed. All
four are about how the product presents itself rather than what it
decides, so they travel together.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **Product name changed.** PitchPeople is the product; Let's Data Talk is the maker, and stays the contracting party in the commercial annex. The tagline restates Principle P1 (one Person, every role) rather than adding a goal. Updated in [motivation](../ea/1_strategy/1_motivation.md), [capabilities](../ea/1_strategy/2_capabilities-and-resources.md) and the [value proposition](../ea/1_strategy/4_value-proposition.md) |
| 2_business    | **No rule changed.** "Where a sign-in lands" was never a business rule; it was `landingFor`'s default. The glossary and actor text name the product PitchPeople |
| 3_information | **No change** |
| 4_application | `src/web/brand.ts` names the product once. `landingFor` defaults to `/me` for everyone except the platform operator, and the masthead links to `/me`. `/platform` carries the session strip, so it has a Sign out |
| 5_technology  | **No change; no migration.** Calendar event UIDs keep their `letsdatatalk` domain, since renaming a UID duplicates the event in every subscribed calendar |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | "Let'sDataTalk" in the masthead, the sign-in panel, the footer, the tab title, and the brand mark's accessible name. A password sign-in always submitted `next=/registrar`, so even the platform operator and a guardian landed on the club queue. `/platform` had no sign-out at all |
| **Target** | "PitchPeople" everywhere a person reads the product's name, with the tagline on the home page, the footer and the tab title. Every sign-in with no requested destination lands on `/me`; the platform operator lands on `/platform`, which now has a Sign out |

## Work packages and deliverables

### WP1 — The name

- **Deliverables:**
  - `src/web/brand.ts`: `PRODUCT_NAME`, `TAGLINE` and `MAKER`, read by `src/app/layout.tsx` (tab title, masthead, footer), `src/app/sign-in/page.tsx` and `src/app/page.tsx` (the hero).
  - Literal renames in `src/app/_components/BrandMark.tsx` and `src/components/ui/BrandMark.tsx` (accessible name), `src/app/interest/page.tsx`, `src/app/me/_sponsors/SponsorSlot.tsx` ("via PitchPeople"), `src/data/sponsors.ts`, `src/web/enquiry-form.ts` and `src/web/prospect-form.ts` (the marketing-consent wording; consent already given keeps the wording it was given under, BR93), `src/domain/calendar/ical.ts` (`PRODID`), and the sponsor click's UTM source.
  - `src/web/password.ts` refuses "pitchpeople" as an obvious password, as it refused the old name.
  - Living documents: `README.md`, `CLAUDE.md`, the EA strategy documents, the annexes, and the published **Architecture Atlas**. Scope documents and decision records are historical and keep the name they were written under.
- **Outcome:** one name, spelled one way, everywhere a person reads it.

### WP2 — Every sign-in lands on `/me`

- **Deliverables:**
  - `src/web/safe-destination.ts`: `DEFAULT_DESTINATION` is `/me`. `safeDestination` returns `null` for an unpublished or missing destination instead of the default, so the sign-in form carries no destination nobody asked for. `landingFor(requested, isPlatform)` drops its membership argument.
  - Callers: `src/app/sign-in/page.tsx`, `src/app/sign-in/actions.ts`, `src/app/auth/callback/route.ts` and `src/app/set-password/actions.ts`. All three server paths stop querying `club_membership` just to choose a page.
  - Tests in `src/web/safe-destination.test.ts`.
  - The masthead adds "Your workspace" (`/me`).
- **Outcome:** a guardian, a player, a coach and a registrar all arrive at their own workspace. A club officer's rail links on to the club screens, so no route is lost. A requested destination still wins, and the open-redirect allowlist is unchanged.

### WP3 — Sign out of the platform console

- **Deliverables:** `src/app/platform/page.tsx` renders `SessionStrip` with `platform`, the mode the design system's strip already had for this identity.
- **Outcome:** the operator signs out like everybody else.

### WP4 — Alignment

- **Deliverables:** in `src/app/globals.css`:
  - **The bell on `/me`.** It no longer takes a row of its own above the workspace, which pushed the workspace below the identity rail's top edge; it now sits on the acting-as line.
  - **The figure tiles (`.figs`).** Four figures in three columns showed the grey ground as a hole; each tile now draws its own edge, so a spare cell is surface.
  - Checked at 390px wide: the home page, `/me`, sign-in, registration, interest and the previews do not scroll sideways.
- **Outcome:** the workspace starts level with the rail, and a row of figures never shows a hole.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The name, tagline and maker line on every screen | A new brand mark or palette (the Broadcast theme stays) |
| `/me` as everybody's landing | Remembering the last role a person used |
| Sign out on `/platform` | Renaming the repository, the npm package or the Supabase project |
| Living docs and the Atlas | Rewriting historical scope documents and decision records |

## Gap notes

- **Identifiers keep the old name on purpose.** The calendar UID domain, the
  `package.json` name and the repository name are not read by a person.
  Renaming a UID would duplicate every match in every official's calendar,
  and renaming the others is churn with no reader.

## Open questions

- None.
