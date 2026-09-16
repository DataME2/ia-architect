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
| `finance.ts`, `vouchers.ts`, `teams.ts`, `officiating.ts`, `performance.ts`, `packs.ts`, `invitations.ts`, `photos.ts`, `me.ts`, `family.ts`, `household.ts` | One module per slice |
| `governance.ts` | Who governs a club and until when (BR85–BR88), and what it has decided (BR123) — a dated resolution, append-only the same absence that makes `payment` one. `enableVoucherProgram` is BR21's approval made real: the database's own trigger on `registration_voucher` refuses any program the resolution cited did not name, matched trimmed and case-insensitive the way `rateFor` matches a competition |
| `messaging.ts` | The unsubscribe token (a server secret, so it cannot live in `src/domain/`), the transport interface, and the send path that checks suppression **before** the provider is reached |
| `calendar.ts` | The feed and the subscription behind it. The token is `messaging.ts`'s derivation reused, because rotation and durability are the same construction seen from two sides |
| `carnivals.ts` | The host club's view and the public one, through **the same function and the same client** — what a visitor may see is decided by the policy on `published_at`, not by an `if` |
| `competitions.ts` | The shared catalogue and the club's participation in it. Two plain queries joined in TypeScript rather than a PostgREST embed, which reads tersely and types badly |
| `privacy.ts` | Erasure, retention and the club's export. Thin: each act deletes a Person or refuses to, so the rule lives in the database where it cannot be routed around |
| `reporting.ts` | Calls the three summary functions and turns a Postgres raise citing BR142 into a `refused` report. The role check is the database's, not this module's — a figure must be refused wherever it is asked for, not wherever somebody remembered to ask |
| `enquiries.ts` | A club's expression of interest, and the lead list behind it. Thin in both directions: what an enquiry may be, and who may read the list, are both decided in the database, because `prospect` denies every API request and a definer function is the only door there is. The retry is a person's act (BR147) and never re-sends a delivered alert — enforced both in the selection and in the database, because the second is what makes a double-clicked button harmless |
| `fees.ts` | A club's own match-official rate table (BR115). `copyRatesInto` exists because BR115 makes a changed rate a **new dated version**, and a club made to retype twelve cells to change two will edit last season's schedule instead — so the compliant path is the cheap one. Reads are wider than writes, which is 0026's policies rather than this file's: a coordinator needs to know what a game pays before designating somebody |
| `claims.ts` | Verification, claims and payment batches (BR13, BR14, BR17, BR18, BR116, BR117, BR119) — every refusal here is the database's, translated. Resolves a claim's rate **once, at raise time**, against the schedule in force on the fixture's own date, through the same `rateFor()` the fee editor uses. `notifyClaimDecision` wires `notifyClaimApproved`, unwired since scope 36, and reuses `notifications.ts`'s `partyFor` rather than a second lookup |
| `designations.ts` | A designation from the side of the person being asked (BR113). Thin in the same way: nothing here re-checks who may answer — `app_may_answer_designation` settles it and the trigger refuses anybody else. `answerersFor` reads through that same function so the sentence the coordinator's screen shows and the refusal the database raises cannot come to disagree, and it keeps *answers for themselves* apart from *nobody can answer*: the first is ordinary, the second is a missing guardianship record somebody has to go and fix |
| `clearanceWithdrawal.ts` | BR50's nightly half. Thin on purpose: `app_withdraw_lapsed_clearances` decides what a lapse means, and the revocation trigger calls **the same function**, so the immediate path and the nightly one cannot drift apart |
| `reminders.ts`, `notifications.ts` | Joining a message to a registration, a withdrawal, an approval, or a vacancy a lapsed clearance left (BR50). The last marks the holder and the coordinator apart, and each only when its own send came back sent — so an unsubscribed holder never silences the coordinator, and tomorrow night retries what failed tonight |

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
