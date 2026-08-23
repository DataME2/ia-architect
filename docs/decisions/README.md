# Decisions

_[← Repository README](../../README.md) · [Enterprise architecture](../ea/README.md)_

One file per decision, numbered chronologically, each explaining a single
call that's smaller than an initiative (see [docs/scope/](../scope/README.md))
but consequential enough that a future reader will ask "why this and not
the alternative?" — most often an AI actor's autonomy level or decision
rights (see `ea-doc-style`'s actor notation in
[docs/ea/2_business/](../ea/2_business/README.md)).

Agent guidance: `.claude/skills/decision-record/`.

## Index

| #   | Decision | Status | Touches |
| --- | -------- | ------ | ------- |
| 1   | [AI Assistant autonomy level](./1_ai-assistant-autonomy-level.md) | Accepted | [2_business/1_business-actors-and-roles.md#ai-actor](../ea/2_business/1_business-actors-and-roles.md#ai-actor) |
| 2   | [AI Assistant's role in Voucher code verification](./2_ai-voucher-code-verification.md) | Accepted | [2_business/1_business-actors-and-roles.md#ai-actor](../ea/2_business/1_business-actors-and-roles.md#ai-actor), [2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) (BR22, BR25) |
| 3   | [Public event data crosses tenant isolation](./3_public-event-data-crosses-tenant-isolation.md) | Accepted | [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md) (P6), [2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) (BR26, BR27) |
| 4   | [Calendar distribution by subscription feed, not account access](./4_calendar-distribution-by-feed-not-account-access.md) | Accepted | [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md) (C13), [2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) (BR30–BR34) |
| 5   | [Replace the incumbent (Majestri) rather than complement or integrate](./5_replace-the-incumbent-rather-than-integrate.md) | Accepted | [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md) (Majestri Resource, Courses of action), [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md) |
| 6   | [Public registration through a scoped function, not a service-role key](./6_public-registration-through-a-scoped-function.md) | Accepted | [2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) (BR72, BR73), [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md) (P5), [3_information/1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 7   | [A tenant is created by an owner-issued invitation, not by signing up](./7_tenant-provisioning-by-owner-issued-invitation.md) | Accepted (August 2026) | Who may turn a club into a tenant, and how. Self-service is ruled out by the **commercial** model before the security one: A$12,000 first year including migration, every sale a mid-season displacement, and a committee as the buyer. Generalises [decision 6](./6_public-registration-through-a-scoped-function.md) one level up — an owner-issued single-use link separates *authorisation* (stays with the owner) from *typing* (moves to the club), and solves the bootstrap paradox inside the security model rather than by stepping around it with elevated SQL. **Not built** |
| 8   | [Demonstration access by anonymous session and a read-only role](./8_demo_access_by_anonymous_session_and_a_read_only_role.md) | Accepted (August 2026) | How a stranger sees the product without an account. An **anonymous Supabase session** makes `auth.uid()` real, so every existing policy applies unchanged and **no P5 exception is bought** — unlike letting `anon` read one club, which would put an `or` clause on 24 select policies forever. A **`viewer` membership** makes the visit read-only *by naming a role no write policy names*, so it needs no policy of its own and stays true for tables added later. The door is decision 6's shape again: one scoped write, club looked up rather than supplied. **Built**, proved by `supabase/tests/20_demo_front_door.sql` |
