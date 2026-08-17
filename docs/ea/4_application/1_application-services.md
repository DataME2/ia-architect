# Application Services

_[← Application layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Application Service.

What the software offers the business layer, scoped to the **registration
slice** ([scope document 17](../../scope/17_mvp-registration-slice.md)).

| Application Service | Realises | What it does |
| ------------------- | -------- | ------------ |
| **Identity & role management** | C1 | Create and maintain a `Person` with legal and preferred names, attach roles per season, surface possible duplicates for human confirmation (BR5) |
| **Registration capture** | C2 | Collect a season registration once — player, guardian, documents, consents — and hold its status |
| **Deterministic validation** | C6 | Evaluate BR1–BR5 and BR55 against a registration and persist the result, so "what is missing" is a stored answer rather than a recomputed one |
| **Consent capture** | C15 (partial) | Record the collection notice acknowledgement, the identification-photograph consent, and the publicity consent as three independent, revocable records (BR48, BR56, BR57) |
| **Submission pack generation** | C16 | Assemble validated registrations into an immutable, versioned pack, record the handover, and track each person's state as *sent* rather than *registered* (BR58–BR60) |
| **Tenant & season administration** | C10 | Provision a club, configure its seasons and its privacy configuration (BR52) |
| **Audit** | Cross-cutting | Append-only record of overrides, pack generation and handover, and authority transfers |

**Not offered in this slice:** finance, referee lifecycle, competitions and
calendar, carnivals, reconciliation against SQUADI (C14 — blocked by
[#39](../../scope/open-questions.md)), the mobile experience (C17), and
communications (C7).
