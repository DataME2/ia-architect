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
