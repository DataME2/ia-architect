# Project Scope — The PitchPeople Style, Everywhere, and the Sign-in Page

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/pitchpeople-style`.

[Scope 104](./104_the_front_doors_navigation_and_footer.md) gave the front
door, the top bar and the footer the Superdesign v7 style. The rest of the
app stayed in the Broadcast overlay (scope 95). The product owner then asked
for **the rest of the app in the same style**. They also asked for the
sign-in page to follow the Superdesign draft "PitchPeople Login - Rich Blue
Update" (project `46a311a6`, draft `a5440814`, v2), with **Continue with
Google** and **Microsoft** shown as coming soon.

The style was already the app's base layer: Archivo and DM Mono, slate
neutrals, the status families and 6/10/16px corners. Broadcast was an overlay
on top of it, with Saira condensed capitals, floodlit navy, a red "on air"
marker and slanted buttons. This scope **deletes the overlay**. It recolours
the base layer's dark ramp from slate to the v7 pitch blues, and gives
buttons, eyebrows and page heroes the front door's treatment.

The login draft is **adapted, not pasted**:

| The draft had | The app keeps |
| ------------- | ------------- |
| Google, Microsoft and Apple buttons | Google and Microsoft, as asked, each disabled and marked **Coming soon**. No Apple. Sign-in today is email and password only |
| "Trusted by 500+ Sports Clubs", "Save 10+ hours weekly", a testimonial from "Marcus Johnson, North Star FC" | **No invented claims** (scope 100). The badge, the two benefits and the quote card carry what the product actually enforces: one sign-in for every role, a player entered once, and each club's data enforced by the database (P5) |
| Remember me for 30 days | Left out. The session already persists, and a checkbox that changes nothing is a promise the page cannot keep |
| New to PitchPeople? Create an account | The existing line: a club administrator links a sign-in to its person, and anyone just looking can open the demonstration club. There is no self-service account |
| A "Forgot password?" link | The existing reset form, under the Sign in button |
| A trophy mark | The PitchPeople football mark, and faint pitch markings instead of the trophy watermark |
| A bright green `#2ECC71` Sign in button | Stadium green `#15803d`. White on `#2ECC71` is about 2:1; on `#15803d` it is 5:1 |
| © 2024 PitchPeople Inc., Privacy, Terms | Nothing: the site footer below already carries the line, and there are no privacy or terms pages yet |

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** One visual identity for the product scope 95 named |
| 2_business    | **No rule changed.** Sign-in is still email and password, a sign-in is still linked to its Person only by a club's invitation (P1), and the page claims only what is enforced. Google and Microsoft sign-in are shown as coming, not offered: open question [#99](./open-questions.md#pending) records how they would link to a Person |
| 3_information | **No change** |
| 4_application | **The style:** the Broadcast overlay is deleted, and the base tokens become the v7 palette. **Buttons:** page buttons become pills. **Eyebrows:** DM Mono. **Page heroes:** take the front door's rail and pitch markings. The scoped overrides scope 104 needed for the overlay go with it. **The sign-in page:** a two-column layout, the form first and the panel second, through `src/app/sign-in/page.tsx` and `SignInForm.tsx` |
| 5_technology  | **One dependency fewer.** The four Saira font files are removed. No new dependency |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | The front door, top bar and footer are in the v7 style. Every other screen shows Broadcast: condensed uppercase Saira headings, navy and red, square panels with a red top edge, slanted buttons. Sign-in is a navy panel beside the form |
| **Target** | Every screen in one style: Archivo headings in sentence case, DM Mono eyebrows, pitch-blue actions (`#1A3A52`) as pills, and 6/10/16px corners. Page heroes are in the rail colour with white pitch markings. The status families are unchanged. Sign-in follows the draft: Welcome back, two coming-soon providers, Or continue with email, the form and a green Sign in, beside a rich-blue panel of what one sign-in enforces |

## Work packages and deliverables

### WP1 — One style

- **Deliverables:** in `src/app/globals.css`:
  - **Tokens:** the base ramp becomes `#1A3A52`, `#234A66`, `#112636` and `#0B1B27`, so actions, links, ink and the rail follow. The dark scheme is re-tinted to the same blues.
  - **Deleted:** the Broadcast overlay and its Saira faces.
  - **Components:**
    - page buttons become pills;
    - eyebrows move to DM Mono;
    - `.hero` takes the front door's rail, white markings and white pill actions.
  - **Simplified:** the chrome and front door lose the overrides that only countered Broadcast. The dugout and the season pulse lose their Broadcast fallbacks.

  The font files `public/fonts/saira-*` are deleted.
- **Outcome:** one style on every screen, with less CSS than before.

### WP2 — The sign-in page

- **Deliverables:**
  - `src/app/sign-in/page.tsx`:
    - the brand;
    - Welcome back;
    - two disabled provider buttons marked Coming soon;
    - the email divider;
    - the form, the reset form and the no-account line;
    - the panel of enforced facts.
  - `SignInForm.tsx`: the draft's labels and a full-width Sign in.
  - The `auth-` rules in `globals.css`.
- **Outcome:** sign-in looks like the draft and promises nothing it does not do.

### WP3 — Docs

- **Deliverables:**
  - this document and its index row;
  - open question #99;
  - the application components row for the shell.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Every screen's look, through the shared tokens and base rules | Re-laying out individual screens. They keep their structure and change only their look |
| Google and Microsoft as visible, disabled, coming-soon buttons | Google and Microsoft sign-in themselves (open question #99) |
| The design-system components (`src/components/ui`), through the same tokens | Their Tailwind classes, which already read the tokens |
| Removing the Saira font files | A new brand mark |

## Gap notes

- **Social sign-in is a promise on the page now.** Building it needs:
  - Supabase's Google and Azure providers;
  - a decision on how an external identity attaches to a Person (#99);
  - a review of the invitation and set-password flows that link a sign-in today.
  
  Until then, both buttons stay disabled.
- **No screenshot test guards the style.** A rule that counters a deleted
  layer would show up only as a visual difference. The screens were checked
  by eye in light mode at desktop and phone widths.

## Open questions

- [#99](./open-questions.md#pending): how would a Google or Microsoft account be linked to a Person?
