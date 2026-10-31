# Launch Announcement — Pre-MVP Ready to Test

_[← Annexes](./README.md) · [Value proposition](../ea/1_strategy/4_value-proposition.md)_

The LinkedIn and Facebook posts announcing that PitchPeople's pre-MVP is
open for clubs to test. They realise the
[value proposition](../ea/1_strategy/4_value-proposition.md)'s commercial
headline for a social audience, and they apply its claim boundaries (see
[what the posts deliberately do not say](#what-the-posts-deliberately-do-not-say)).
Written 30 October 2026, from what is on `main` that day.

Both posts point to the test site,
**`pitchpeople-test.datamanagementengineer.com`**
([scope 114](../scope/114_a_public_test_site_and_a_production_project.md)):
`/demo` opens the demonstration club and `/interest` reaches the pilot
inbox ([scope 116](../scope/116_contact_and_demo_requests_reach_an_inbox.md)).

## LinkedIn

> **Less time chasing admin. More time running your club.** ⚽
>
> Today I'm proud to share that the pre-MVP of **PitchPeople** is ready
> for clubs to test.
>
> Grassroots football in Australia and New Zealand runs on volunteers.
> The same people who coach on Tuesday and run the canteen on Saturday
> also chase registrations, re-key the same child's details into three
> systems, reconcile fees in spreadsheets, and organise referees over
> WhatsApp. That hidden admin is one of the biggest costs a club carries,
> and it is paid in volunteer hours.
>
> PitchPeople brings that work into one platform, built around a single
> idea: **one person, every role.** A parent who is also a coach, a
> treasurer and a referee is one record, not four.
>
> What you can try today:
> ✅ Registration with a clear, step-by-step checklist: what's complete
> and what's still missing
> ✅ The club's own fee schedule, so every registration is priced the
> same way
> ✅ Household view for families, with all their children in one place
> ✅ Club finance, payment plans and hardship decisions in one place
> ✅ Match officials, from designation to verification
> ✅ Teams, training nights and the 2027 season calendar
> ✅ Workspaces for the committee, registrar, treasurer, technical
> director and coaches
>
> The AI assistant drafts, summarises and flags. **A person at the club
> always makes the decision.**
>
> **Why I'm asking for your help:** this was designed with a real club,
> and it has to be shaped by many more. Club presidents, secretaries,
> treasurers, registrars, referee coordinators, coaches, parents and
> associations: your experience is what turns a good tool into the right
> one. Every piece of feedback goes straight into the next version.
>
> 👉 Explore the demonstration club (fictional data, nothing to install):
> https://pitchpeople-test.datamanagementengineer.com/demo
> 👉 Want to talk about a pilot for your club?
> https://pitchpeople-test.datamanagementengineer.com/interest
>
> If you know someone who keeps a club running, please share this with
> them. Football is a team game, and so is building this. 🤝
>
> #GrassrootsFootball #FootballAustralia #NZFootball #SportsAdmin
> #ClubManagement #Volunteers #SaaS #CommunitySport #PitchPeople

## Facebook

> ⚽ **To everyone who keeps a grassroots football club running**
>
> Fees keep going up, budgets are tight, and most clubs run on volunteers
> who are already stretched. For a while now I've been quietly building
> something to take some of that weight off. It's called PitchPeople.
>
> It brings a club's registrations, fees, documents and referees into one
> place. Each person has one profile, so the parent who coaches the U9s,
> sits on the committee and referees on Sundays is one record, not five.
>
> It also helps clubs bring money in. Sponsors can appear inside the
> platform and pay per click, per thousand views, or per sign-up,
> whichever suits them. The club sees exactly what each sponsor owes.
>
> Behind it sit nearly 200 rules, written with real club situations in
> mind. Two examples:
> • A registration isn't marked complete while anything is still owed,
> payment plan or not. Money in credit never holds a player back.
> • A registration isn't complete while a required document is missing.
>
> The bigger goal is simple: a parent should register their child once,
> not three times on three different systems. We're not there yet,
> because Squadi is still the official system, but everything in
> PitchPeople is built to get there.
>
> You can try it now with a demo club full of made-up families:
> https://pitchpeople-test.datamanagementengineer.com/demo
>
> I'd really value your feedback. Whether you're on a committee, coach a
> team, referee, or register your kids every season, tell me what works
> and what doesn't. And please tag your club's secretary or treasurer 🙏

Rewritten 31 October 2026 from the product owner's own draft. The sponsor
models are [scope 84](../scope/84_sponsors_in_the_workspace.md)'s CPC, CPM
and CPA, and "what each sponsor owes" is
[scope 85](../scope/85_sponsor_invoices_and_club_referrals.md)'s invoicing.
The two rules are BR3 and BR2, and the count is the 193 rules in the
[rules table](../ea/2_business/5_domain-context-and-rules.md). The draft's
claim that the club becomes the governing body's source of truth was
replaced by the goal it describes: PitchPeople is the source of truth for
the club's own registration data, but Squadi stays authoritative for
eligibility (BR39) and a parent still registers there, so "register once"
is stated as where the platform is heading, not as delivered ([motivation](../ea/1_strategy/1_motivation.md), G6). Its
mention of carnivals was dropped, since carnival management is deferred
past the MVP.

## What the posts deliberately do not say

Each of these follows a claim boundary in the
[value proposition](../ea/1_strategy/4_value-proposition.md#claim-boundaries)
or a fact of the test environment. If a post is reworded, keep these out.

- **No percentage or dollar saving.** The pilot club's measurement of
  reduced admin has not been taken yet
  ([motivation](../ea/1_strategy/1_motivation.md), the pilot club's
  concern), so "reduce the cost of management" is stated as the aim, in
  volunteer hours, not as a measured result.
- **No claim to replace Squadi** or any federation system. Squadi stays the
  competition system clubs are required to use.
- **No claim that the AI decides.** It drafts, summarises and flags; a
  person decides (Principle P3,
  [decision 1](../decisions/1_ai-assistant-autonomy-level.md)).
- **No claim that money moves.** Fees, plans and referee payments are
  recorded and tracked; online payment and payout are simulated
  ([payout providers](./payout-providers.md)).
- **No real club or person named.** The test site runs on synthetic data
  only, and the posts say so ("fictional data", "made-up data"). The pilot
  club is not named without its consent.
- **No competitor named.** The positioning against the incumbent
  ([decision 5](../decisions/5_replace-the-incumbent-rather-than-integrate.md))
  belongs in a sales conversation, not a public post.
