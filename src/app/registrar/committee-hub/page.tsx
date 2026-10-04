import { redirect } from 'next/navigation';

import { hubFileLink, loadHub } from '../../../data/committee-hub.ts';
import { loadGovernance } from '../../../data/governance.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { HUB_KIND_LABEL } from '../../../web/committee-hub.ts';
import { FileDocumentForm, HubSettingsForm, RemoveDocumentButton } from './HubForms.tsx';

/**
 * The Management Committee Hub (scope 81, BR168): the committee's minutes
 * (acts), agendas and reports, in one place per club. Read by the committee,
 * filed by the Secretary, an admin or the IT Manager, configured and pruned
 * by the IT Manager. A Microsoft 365 club keeps the files in its own
 * SharePoint and files the links here.
 */
export default async function CommitteeHubPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar%2Fcommittee-hub');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  const hub = await loadHub(client, tenant.clubId);
  if (!hub.readable) {
    return (
      <>
        <h2>Management Committee Hub</h2>
        <p className="notice">
          <strong>Only the committee can see this.</strong> You are signed in as {tenant.roles.join(', ')} at{' '}
          {tenant.clubName}.
        </p>
      </>
    );
  }

  const governance = await loadGovernance(client, tenant.clubId);
  const termName = new Map(governance.terms.map((t) => [t.id, t.name]));
  const resolutionSummary = new Map(governance.resolutions.map((r) => [r.id, `${r.decidedOn} — ${r.summary}`]));
  const links = new Map(
    await Promise.all(
      hub.documents
        .filter((d) => d.storagePath !== null)
        .map(async (d) => [d.id, await hubFileLink(client, d.storagePath!)] as const),
    ),
  );
  const sharepoint = hub.settings.storage === 'sharepoint';

  return (
    <>
      <h2>Management Committee Hub</h2>
      <p className="lede">
        The committee&rsquo;s minutes, agendas and reports, kept in one place and readable only by the committee.{' '}
        {sharepoint ? (
          <>
            This club keeps them in its Microsoft 365 SharePoint
            {hub.settings.sharepointLibraryUrl !== null && (
              <>
                {' '}&mdash;{' '}
                <a href={hub.settings.sharepointLibraryUrl} target="_blank" rel="noreferrer">open the library</a>
              </>
            )}
            ; each document is filed here as a link.
          </>
        ) : (
          <>Files are held privately by Let&rsquo;sDataTalk.</>
        )}{' '}
        <span className="mono" style={{ fontSize: '0.7rem' }}>BR168</span>
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Documents</h3>
        {hub.documents.length === 0 ? (
          <p className="empty" style={{ margin: 0 }}>Nothing filed yet.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Meeting</th>
                  <th>Kind</th>
                  <th>Title</th>
                  <th>Term · resolution</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {hub.documents.map((d) => {
                  const href = d.externalUrl ?? links.get(d.id) ?? null;
                  return (
                    <tr key={d.id}>
                      <td>{d.meetingOn ?? <span className="hint">&mdash;</span>}</td>
                      <td>{HUB_KIND_LABEL[d.kind]}</td>
                      <td>
                        {href === null ? d.title : <a href={href} target="_blank" rel="noreferrer">{d.title}</a>}
                        {d.externalUrl !== null && <span className="hint"> · SharePoint</span>}
                      </td>
                      <td className="hint">
                        {[d.termId === null ? null : termName.get(d.termId), d.resolutionId === null ? null : resolutionSummary.get(d.resolutionId)]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </td>
                      <td>{hub.mayControl && <RemoveDocumentButton id={d.id} title={d.title} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hub.mayFile && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>File a document</h3>
          <FileDocumentForm
            sharepoint={sharepoint}
            terms={governance.terms.map((t) => ({ id: t.id, label: t.name }))}
            resolutions={governance.resolutions.map((r) => ({ id: r.id, label: `${r.decidedOn} — ${r.summary}`.slice(0, 80) }))}
          />
        </div>
      )}

      {hub.mayControl && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Hub settings (IT Manager)</h3>
          <HubSettingsForm
            storage={hub.settings.storage}
            siteUrl={hub.settings.sharepointSiteUrl}
            libraryUrl={hub.settings.sharepointLibraryUrl}
          />
          <p className="hint" style={{ marginBottom: 0 }}>
            SharePoint mode links documents that live in the club&rsquo;s own Microsoft 365. A full sync (files
            uploaded here landing in SharePoint automatically) needs the club&rsquo;s Microsoft 365 administrator to
            approve an app registration; what it needs is in the SharePoint integration annex.
          </p>
        </div>
      )}
    </>
  );
}
