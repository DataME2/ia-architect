# Project Scope — The Management Committee Hub

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/the-management-committee-hub`.
**Status: built** (SharePoint link mode; full sync documented, not connected).

The committee records its resolutions (BR123) and now confirms its own
positions ([scope 80](./80_the_committee_confirms_its_own.md)). But the
minutes behind them, the "acts", had nowhere to live. The club asked in
October 2026 for a **Management Committee Hub**:

- one place per club for those documents;
- controlled by the IT Manager;
- wired to SharePoint for clubs on Microsoft 365, North Star among them.

| | Who |
| - | - |
| Reads | The committee: admin, committee, secretary, treasurer, IT manager, and any live committee position |
| Files | The Secretary, who keeps the minutes, an admin, or the IT Manager |
| Removes, configures | The IT Manager or an admin |

## Design

- **Migration 0080:**
  - `committee_hub_settings`: platform storage or SharePoint, with the
    library address.
  - `committee_document`: minutes, agenda, report, constitution or other.
    Each is optionally tied to a term and a resolution, and points at
    exactly one of a bucket file or a `*.sharepoint.com` link.
  - Three predicates (`app_reads_…`, `app_files_…`, `app_controls_committee_hub`).
  - An audit trigger on filing and removal.
  - The private `committee-hub` bucket.
- **/registrar/committee-hub**, a new menu entry:
  - the document list, with each document opening by a signed link or in
    SharePoint;
  - the filing form, which uploads in platform mode and takes a SharePoint
    link in SharePoint mode;
  - Remove, for the IT Manager;
  - the IT Manager's settings.
- **SharePoint:** link mode is built. A full Microsoft Graph sync needs an
  app registration with `Sites.Selected`, approved by the club's Microsoft
  365 administrator. It is written down in
  [sharepoint-integration.md](../annexes/sharepoint-integration.md) and not
  connected.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No new capability: club governance (BR123) gains its records |
| 2_business    | **BR168 added** |
| 3_information | `committee_hub_settings`, `committee_document` |
| 4_application | The hub page, its predicates and audit trigger |
| 5_technology  | Private bucket `committee-hub`. SharePoint link mode. Graph sync documented in an annex |

## For North Star

Its IT Manager opens **Committee hub → Hub settings**, chooses SharePoint and
pastes the Committee site's document-library address. North Star has no IT
Manager yet: appoint one on Governance and confirm them with the AGM
election (scope 80), or an admin can do it meanwhile.

## Out of scope / gaps

- **The Microsoft Graph sync** (uploading here lands in SharePoint) waits on
  North Star's Microsoft 365 administrator approving the app registration.
- **Retention of committee records** is not yet in the retention schedule.
