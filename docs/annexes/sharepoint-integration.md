# Annex — The Committee Hub and Microsoft 365 SharePoint

_[← Annexes](./README.md) · realises [BR168](../ea/2_business/5_domain-context-and-rules.md) · [scope 81](../scope/81_the_management_committee_hub.md)_

**Status: link mode built; full sync not connected.** Drafted, not reviewed
by a Microsoft 365 administrator.

The Management Committee Hub keeps a club's minutes, agendas and reports in
one of two places. The club's IT Manager chooses which:

| Mode | Where the file lives | What the platform holds | Needs |
| - | - | - | - |
| **Platform** (default) | The private `committee-hub` bucket | The file | Nothing |
| **SharePoint, link mode** (built) | The club's own SharePoint document library | A link, the title, the kind, the meeting date, the term and resolution | The library's address, typed in by the IT Manager |
| **SharePoint, sync** (not built) | SharePoint | The same, plus the SharePoint item id | An app registration approved by the club's Microsoft 365 administrator, below |

**North Star FC runs Microsoft 365**, so its IT Manager sets the hub to
SharePoint and pastes the Committee site's document library address. From
then on each set of minutes is saved in SharePoint as usual and filed in the
hub as a link. The committee finds every document in one list, tied to its
term and resolution. Access to the file itself stays with SharePoint's own
permissions.

## What a full sync needs

Uploading in the hub and having the file land in SharePoint automatically is
a Microsoft Graph integration. It needs these from the club's tenant:

1. **An app registration** in Microsoft Entra ID (Azure AD), named for
   Let'sDataTalk.
2. **The `Sites.Selected` application permission** on Microsoft Graph,
   granted by the tenant administrator, and then **scoped to the one
   Committee site**. Under `Sites.Selected`, the app reaches no other site in
   the club's tenant. `Sites.ReadWrite.All` is refused as far too broad.
3. **A client certificate** (preferred) or a client secret. It is stored as a
   server-only secret in Vercel's environment, never in the repository and
   never in the browser, as `MS_TENANT_ID`, `MS_CLIENT_ID`, and
   `MS_CLIENT_CERT` or `MS_CLIENT_SECRET`.
4. **The calls:**
   - `GET /sites/{hostname}:/sites/{site}` resolves the site id;
   - `PUT /sites/{site-id}/drive/root:/{folder}/{file}:/content` uploads
     (a file under 4 MB; an upload session for anything larger);
   - the returned `id` and `webUrl` are stored on `committee_document`.
5. **Optional:** a Graph change-notification subscription on the library, so
   a file added directly in SharePoint appears in the hub.

## What changes in the platform when sync is connected

- `committee_hub_settings` gains the site id. `committee_document` gains the
  SharePoint item id.
- A server action performs the Graph upload instead of the bucket upload;
  the hub's screens and rules stay as they are.
- Removal in the hub deletes the SharePoint item only if the club chooses
  that; by default it removes the hub's record and leaves the file.

## Personal information

Minutes can name people, including children, in welfare matters. The hub
reads them only for the committee, and SharePoint permissions govern the
files. Retention of committee records belongs in the
[retention schedule](./retention-schedule.md), which does not yet list them.
