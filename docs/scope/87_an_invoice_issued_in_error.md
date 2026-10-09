# Project Scope — An Invoice Issued in Error

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/an-invoice-issued-in-error`.
**Status: built.**

Reported by the product owner during QA, October 2026: if someone issues a
sponsor invoice by mistake (the wrong campaign or the wrong period), there
is no way to reverse it. The invoice stood for good, and because a period is
invoiced once (BR171), the right invoice for that period could never be
issued. The ask: an **X in the invoice's corner** that reverses it and
drops the record.

## Rule (BR171 amended)

- **An unpaid invoice issued in error is deleted, never edited.** Editing
  would make an invoice the sponsor already holds say something different.
  Deleting and reissuing keeps every invoice true to what was issued.
- **A reason is required.** The row is dropped, as asked, but the audit
  keeps the invoice number, campaign, period, amount, who deleted it and
  why. The deletion is visible without the row.
- **A paid invoice is never deleted.** Money has moved. Correcting a paid
  invoice is a refund or credit note, which is not built.
- **A number is never reused.** 0083 numbered invoices by counting the
  year's invoices, so deleting one would have handed the next invoice a
  number already in use. Numbering now counts the year's issue audit rows,
  which are append-only.
- **Who:** whoever may bill the campaign, as for issuing (the club's admin
  or treasurer; the platform for its own).

## Design

- **Migration 0085:**
  - `app_delete_sponsor_invoice(invoice, reason)`: refuses a paid invoice,
    a missing reason, or anyone who may not bill the campaign. It writes a
    `sponsor_invoice_deleted` audit row and returns the number.
  - `app_issue_sponsor_invoice()` is redefined with the never-reused
    numbering.
- **Screen:** on `/registrar/sponsors`, every unpaid invoice has a small
  **×** in the corner of its number cell.
  - It turns red on hover and is labelled for screen readers.
  - Pressing it asks for the reason, with **Delete invoice** and **Keep
    it** buttons. Nothing is deleted on the first press.
- **Suite 85:**
  - A committee member is refused.
  - A blank reason is refused.
  - A deletion removes the row and leaves the audit.
  - The period can be invoiced again, under a fresh number.
  - A paid invoice cannot be deleted.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR171 amended**: delete an unpaid invoice issued in error, with a reason; a paid one stays |
| 3_information | No new table; the deletion lives in `audit_event` |
| 4_application | The × and its reason step on the Sponsors screen |
| 5_technology  | Migration 0085, suite 85 |

## Out of scope / gaps

- **Refunds and credit notes** for a paid invoice.
- **A deleted-invoices list on screen.** The audit holds them; the
  platform's audit view shows them.
