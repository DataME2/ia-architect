# Decision 2 — AI Assistant's role in Voucher code verification

_[← Decisions index](./README.md)_

**Status:** Accepted
**Date:** 2026-07-24
**Touches:** [docs/ea/2_business/1_business-actors-and-roles.md#ai-actor](../ea/2_business/1_business-actors-and-roles.md#ai-actor),
[docs/ea/2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)
(BR22, BR25)

## Context

No Australian state voucher program (Play On!/FairPlay, Active and
Creative Kids, Sports Vouchers, KidSport, Get Active Kids, Ticket to Play)
currently exposes a general-purpose claims API the pilot club can use —
see the voucher-program claim mechanisms resource in
[1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md).
Until Let'sDataTalk secures dedicated API access (a pending, unstarted
outreach task — [open question #21](../scope/open-questions.md)), a
Voucher's code still needs checking against the issuing government's own
public interface before Finance Admin or Treasurer relies on it. The
question is whether the AI Assistant may perform that check, and if so,
under what constraints — this is exactly the kind of AI-decision-rights
change [decision 1](./1_ai-assistant-autonomy-level.md) says should get
its own record.

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| **Assistant verifies and applies** — the Assistant checks the code and, if valid, applies the Voucher to the invoice itself | Directly contradicts BR22 and the existing prohibition list: applying a Voucher changes an invoice, and the Assistant's advisory autonomy (decision 1) never lets it act with effect on financial records |
| **No AI involvement — verification is always manual** | Leaves Finance Admin/Treasurer manually visiting up to six different government portals per voucher, the exact repetitive manual burden the platform exists to reduce (Driver, [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md)); doesn't use the Assistant for a task that fits its existing "validate and surface" pattern |
| **Assistant verifies and surfaces only** — the Assistant checks the code against the government's own public interface and records a pass/fail/inconclusive result; Finance Admin or Treasurer still decides whether to apply the Voucher | Matches the existing "validate data against deterministic rules and surface the result" decision right (decision 1) exactly, extended to an external check instead of an internal rule; keeps the apply decision with the human role BR22 already names |

## Decision

The Assistant may check a Voucher's code against its issuing government's
own public verification interface and record the result (pass, fail, or
inconclusive) against that Voucher (BR25) — but it never applies, denies,
or otherwise changes the Voucher or the invoice itself; only Finance Admin
or Treasurer may do that (BR22). Two constraints ground this in the
existing Principles rather than opening a new exception:

- **Principle P2 (read-only at the source).** The check is a read against
  a government-run public interface, not a write — it does not submit a
  Voucher Claim or otherwise change external state. Submitting the actual
  reimbursement claim (BR23, BR24) stays a Finance Admin/Treasurer action
  through each program's own CSV/portal mechanism, not something the
  Assistant does on the club's behalf.
- **Principle P4 (no minor's data to uncontrolled AI services).** The
  verification step must run through Let'sDataTalk's own controlled
  service — never a free-tier or third-party generative AI tool — since a
  Voucher's beneficiary is frequently a minor. This constrains *how* the
  MVP-build initiative implements the check, not the business rule itself.

## Consequences

- BR25 requires a recorded verification result before a Voucher can be
  applied, but the *outcome* of that check never gates the human decision
  automatically — Finance Admin/Treasurer can still choose not to apply a
  Voucher the Assistant flagged as verified, or query one it flagged as
  inconclusive, consistent with Principle P3.
- The Assistant's decision rights table
  ([1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md#ai-actor))
  now names this specific external check explicitly, rather than leaving
  "validate data against deterministic rules" to imply only internal data.
- If track 1 of the two-track approach
  ([1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md))
  succeeds — Let'sDataTalk obtains dedicated API access from a state
  government — this decision does not automatically extend to letting the
  Assistant submit claims through that API; that would be a new decision
  record, since submitting a claim is a write, not a read.
