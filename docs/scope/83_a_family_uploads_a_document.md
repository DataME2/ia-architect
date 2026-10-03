# Project Scope — A Family Uploads a Document

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/a-family-uploads-a-document`.
**Status: built.**

Since scope 35 the guardian workspace has said a missing document "will be
uploadable here". Until now the registrar recorded only what a family
brought in person. The club asked for the upload in October 2026.

## Design

- **Uploading is submitting, not providing (BR165).**
  - The upload records `submitted_at` and who sent it.
  - BR2 counts the document as provided only when the registrar has opened
    it and pressed the existing "Mark received".
  - A file is a claim, exactly as a voucher PDF is (BR81).
- **Who may send:** whoever answers for the player (BR62, 0075). That is an
  authority guardian, or the player from 13.
  - `app_may_submit_for_registration(club, registration)` answers this for
    the bucket and for `app_submit_registration_document()` alike.
- **Where files live:** a private bucket, `registration-documents`, under
  `<club>/<registration>/`. The policies check both segments.
  - The family and the registrar read. Only admin and registrar delete.
- **What can be sent:** PDF, JPEG or PNG up to 4 MB, under Vercel's request
  ceiling. The server-action body limit is raised to 4.5 MB to allow it.
- **Screens:**
  - the guardian workspace's **Documents** panel offers one upload per
    missing document;
  - the registrar's document table shows "Sent by the family … · View" (a
    5-minute signed link) next to "Mark received".

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR165 added** ([5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)) |
| 3_information | `registration_document.submitted_at` and `submitted_by_person_id` |
| 4_application | The submission function and its bucket policies, the upload form, and the registrar's View link |
| 5_technology  | A new private storage bucket. Server-action body limit 4.5 MB |

## Out of scope / gaps

- **No virus or content scan.** The registrar opens the file; a production
  deployment should add a scan before that (production preconditions,
  [2_deployment.md](../ea/5_technology/2_deployment.md)).
- **A replaced upload leaves the earlier file in the bucket.** It is
  harmless and private, and the retention schedule should name it.
