# `src/data/`

_[← Repository README](../../README.md) · [Technology services](../../docs/ea/5_technology/1_technology-services.md)_

## Purpose

The boundary between the application and Postgres: typed queries, the row
types they return, the mappers that turn rows into domain values, and — the
part to read first — **the Supabase clients, which differ in exactly one way
that matters: whether Row-Level Security applies.**

Principle P5's tenant isolation is enforced by database policies, so **the
client a call picks decides whether the principle holds for that query.**
That is the whole reason this directory is worth a README.

## Key dependencies

**Depends on:** `@supabase/supabase-js` and `@supabase/ssr`,
[`src/domain/`](../domain/README.md) for the types it maps into, and
`supabase/migrations/` for the shape it assumes.

**Depended on by:** [`src/app/`](../app/README.md) only. Neither
`src/domain/` nor `src/web/` may import anything here — they are compiled
with no DOM library and no I/O, and a Supabase import would break that.

**The three clients:**

| Client | RLS | Use |
| ------ | --- | --- |
| `createUserClient()` | **Applies** | The browser, and server code acting as the signed-in user |
| `createRequestClient()` | **Applies** | Server components and actions. Request-scoped, with the session refreshed by `src/proxy.ts` so `auth.uid()` keeps resolving |
| `createAdminClient(reason)` | **Bypassed entirely** | Full read/write across every club |

`createAdminClient` takes a **closed set of reasons** —
`tenant-provisioning`, `scheduled-job`, `submission-pack-generation` — not a
free string, so every bypass in the codebase is greppable and the list is
itself reviewable. Adding a member is a deliberate act. Passing one is not
something that happens by accident, and that is the design.

## Layout

| Module | Holds |
| ------ | ----- |
| `client.ts` | The three clients above, and the `RlsBypassReason` union |
| `server.ts` | The request-scoped client and `currentUser()` |
| `env.ts` | Validated configuration — names in [`.env.example`](../../.env.example), values never in the repository |
| `schema.ts` | Row types, **hand-written deliberately**: `supabase gen types` needs credentials for a live project and CI holds none, so generating them would either put a credential in CI or leave the checked-in copy unverifiable |
| `mappers.ts` | Rows in, domain values out. Pure — the only module that knows both shapes, which is what keeps the domain free of `snake_case` and of the database's idea of null |
| `queries.ts` | The registration slice's reads and writes |
| `finance.ts`, `vouchers.ts`, `teams.ts`, `governance.ts`, `officiating.ts`, `performance.ts`, `packs.ts`, `invitations.ts`, `photos.ts`, `me.ts`, `family.ts`, `household.ts` | One module per slice |
| `messaging.ts` | The unsubscribe token (a server secret, so it cannot live in `src/domain/`), the transport interface, and the send path that checks suppression **before** the provider is reached |
| `calendar.ts` | The feed and the subscription behind it. The token is `messaging.ts`'s derivation reused, because rotation and durability are the same construction seen from two sides |
| `carnivals.ts` | The host club's view and the public one, through **the same function and the same client** — what a visitor may see is decided by the policy on `published_at`, not by an `if` |
| `competitions.ts` | The shared catalogue and the club's participation in it. Two plain queries joined in TypeScript rather than a PostgREST embed, which reads tersely and types badly |
| `privacy.ts` | Erasure, retention and the club's export. Thin: each act deletes a Person or refuses to, so the rule lives in the database where it cannot be routed around |
| `reminders.ts`, `notifications.ts` | Joining a message to a registration, a withdrawal, or an approval |

Explicit `club_id` filters in these queries are **belt and braces, not the
mechanism**. The mechanism is `supabase/migrations/0002_rls_policies.sql`,
and the proof is `supabase/tests/10_tenant_isolation.sql`.

## Where the architecture lives

[`docs/ea/5_technology/1_technology-services.md`](../../docs/ea/5_technology/1_technology-services.md)
for why Supabase was chosen (essentially: this),
[`docs/ea/5_technology/2_deployment.md`](../../docs/ea/5_technology/2_deployment.md)
for which variables are secret and where they live, and
[`docs/ea/3_information/1_data-objects.md`](../../docs/ea/3_information/1_data-objects.md)
for what each table is.
