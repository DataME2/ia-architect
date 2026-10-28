# Project Scope — Contact and Demo Requests Reach an Inbox

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/contact-and-demo-requests`.

On 28 October 2026 the product owner asked for a "contact us" and a "request
a demo" form, a thank-you page to redirect to afterwards, and for enquiries
to reach their inbox through Web3Forms, which they already use.

The contact form already existed: `/interest` ([scope 44](./44_a_club_says_it_is_interested.md)),
linked from the homepage. Each enquiry becomes a row in `prospect`, and
[scope 45](./45_telling_somebody_a_club_asked.md) emails the operator an
alert through Resend. **That alert has never arrived** on the test site,
because Resend isn't configured. Configuring it would also switch on every
other email the platform sends, which stays off while the site runs on
synthetic people.

The product owner chose to upgrade `/interest` rather than build a second
form. The page gains three things:

- a choice between asking a question and requesting a guided demo;
- a copy of each enquiry sent to their inbox **from the visitor's browser**
  through Web3Forms;
- a thank-you page.

The copy has to come from the browser because Web3Forms refuses server
requests on its free plan. Tested on 28 October 2026 with a dummy key, it
answered: *"This method is not allowed. Use our API in client side or
contact support with server IP address (Pro plan is required)"*.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** This serves the existing go-to-market goal: explain, qualify, capture ([scope 28](./28_onboarding-a-club-and-its-history.md) §3). P7 (consent before collection) holds: the form says which service forwards the enquiry, and nothing is sent until the visitor submits |
| 2_business    | **Changed.** **BR188**: an enquiry says whether it asks a question or requests a guided demo. The choice defaults to a question, and a later question doesn't withdraw an earlier demo request. **BR189**: an enquiry may also be copied to the operator's inbox from the visitor's browser through a form relay. The database row stays the record, and the relay's delivery is never recorded as the alert's outcome. BR144–BR147 are unchanged |
| 3_information | **Changed.** `prospect` gains `wants_demo` (boolean, default false). Web3Forms is added as a recipient of the enquiry's contents (name, email, phone, club, note), acting as the operator's processor. The enquiry form names it |
| 4_application | **Changed.** `record_interest()` takes `p_wants_demo`, and `app_enquiries()` returns it. `parseEnquiry` reads the choice and `composeEnquiryAlert` states it. `/interest` sends the copy from the browser as the form submits, and the server action redirects to the new page `/interest/thank-you`. The console marks demo requests |
| 5_technology  | **Changed.** A public environment variable, `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY`, is added. Web3Forms documents the key as safe to make public: it can only send mail to its owner's inbox. It is still kept out of the repository. Without it the form works as before and sends no copy |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | `/interest` saves an enquiry and tries a Resend alert, which on the test site fails with "No alert address is configured". The visitor stays on the form with a line of text. A demo request can only be typed into the note |
| **Target** (delivered) | The visitor chooses a question or a guided demo. As they submit, their browser copies the enquiry to the operator's inbox through Web3Forms. The row is saved with the choice, and they land on a thank-you page that says what happens next. The homepage links straight to a demo request |

## Work packages and deliverables

### WP1 — The choice is recorded

- **Deliverables:**
  - `supabase/migrations/0098_an_enquiry_may_ask_for_a_demo.sql`:
    - adds `prospect.wants_demo`;
    - adds `p_wants_demo` to `record_interest()`, which sets it on a first
      enquiry and ORs it into an existing row (BR188);
    - adds `wants_demo` to `app_enquiries()`;
    - revokes `anon` from both functions' new signatures where `anon`
      shouldn't have it, as 0097 found necessary.
  - `supabase/tests/40_club_enquiry.sql` updated for the new signature,
    including that a later question keeps an earlier demo request.
  - `src/data/migration-drift.ts` expects 0098.
- **Outcome:** a demo request is a fact on the lead, not a sentence in a note.

### WP2 — The form, the copy and the thank-you page

- **Deliverables:**
  - `src/web/enquiry-form.ts`: `wantsDemo` parsed from `request=demo`, and
    `parseEnquiryForm`, which reads the fields by name for both the server
    and the browser.
  - `src/domain/messaging/platform-alert.ts`: the subject and body say when a
    demo is requested.
  - `src/web/enquiry-relay.ts`: builds the Web3Forms payload from the same
    composer the Resend alert uses, so both copies say the same thing.
  - `src/app/interest/InterestForm.tsx`, which does three things:
    - shows the choice, preselected from `?request=demo`;
    - as the form submits, posts the copy without waiting for it
      (`keepalive`), and only when the shared parser accepts the enquiry;
    - carries Web3Forms' `botcheck` honeypot.
  - `src/app/interest/actions.ts`: reads the form through the shared
    `parseEnquiryForm`, records nothing when the honeypot is ticked, and
    redirects to `/interest/thank-you` (with `?request=demo` for a demo).
  - `src/app/interest/thank-you/page.tsx`: what happens next, with a demo
    variant, and the demonstration club as something to do meanwhile.
  - The homepage links "Request a demo" to `/interest?request=demo`.
  - `src/app/platform/EnquiryList.tsx` marks demo requests.
- **Outcome:** an enquiry reaches a person on the day it is made, without
  Resend.

### WP3 — Documentation

- **Deliverables:**
  - BR188 and BR189 in the [rules](../ea/2_business/5_domain-context-and-rules.md).
  - `prospect` in the [data objects](../ea/3_information/1_data-objects.md).
  - The [application components](../ea/4_application/2_application-components.md).
  - The [technology services](../ea/5_technology/1_technology-services.md).
  - `.env.example`.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| A question-or-demo choice on `/interest` | A separate `/contact` page. `/interest` is the contact form |
| A browser-side copy through Web3Forms | Recording whether that copy arrived |
| A thank-you page | Booking a demo slot (a calendar link) on the thank-you page |
| A demo marker in the console | A spam captcha (Web3Forms' hCaptcha) |

## Gap notes

- **The console still says nobody was alerted.** It reports the server's
  Resend attempt, which on the test site fails. The Web3Forms copy is sent
  by the browser, so the server can't confirm it. Letting the browser claim
  it is the "anonymous caller writes a delivery record" that 0038 refused.
  Resend, once configured, makes the column true again.
- **Spam.** Web3Forms filters submissions on its side, and the form carries
  its honeypot field. If spam arrives, the next step is Web3Forms' hCaptcha.
  Restricting the key to the site's domain needs Web3Forms Pro.
- **Booking a slot.** A calendar link on the demo thank-you page would save
  an email round-trip. It needs a booking tool the product owner hasn't
  chosen.

## Open questions

- None.
