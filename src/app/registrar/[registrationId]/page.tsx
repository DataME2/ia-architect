import { notFound, redirect } from 'next/navigation';

import {
  loadRegistrationDetail,
  loadSeasons,
  loadTenantContext,
  loadValidationHistory,
} from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { formatCents } from '../../../web/money.ts';
import { failing } from '../../../web/queue-view.ts';
import { todayIn } from '../../../web/today.ts';
import { RuleList, StatusPill } from '../../_components/rules.tsx';
import {
  applyChecklistAction,
  recheckAction,
  setDocumentProvidedAction,
  verifyLegalNameAction,
} from '../actions.ts';
import { OutstandingForm } from './OutstandingForm.tsx';

export const dynamic = 'force-dynamic';

const CONSENT_LABEL: Record<string, string> = {
  REGISTRATION_COLLECTION_NOTICE: 'Registration collection notice',
  IDENTIFICATION_PHOTOGRAPH: 'Identification photograph',
  PUBLICITY: 'Publicity',
};

export default async function RegistrationDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly registrationId: string }>;
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) notFound();

  const { registrationId } = await params;
  const querySeason = (await searchParams).season;
  const seasons = await loadSeasons(client, tenant.clubId);

  // The registration may sit in any season, so try the requested one first
  // and fall back to searching the rest rather than 404ing on a bare link.
  const ordered = querySeason
    ? [...seasons].sort((a, b) => (a.id === querySeason ? -1 : b.id === querySeason ? 1 : 0))
    : seasons;

  let detail = null;
  let seasonId = '';
  for (const season of ordered) {
    const found = await loadRegistrationDetail(
      client,
      tenant.clubId,
      season.id,
      registrationId,
      todayIn(),
    );
    if (found !== null) {
      detail = found;
      seasonId = season.id;
      break;
    }
  }
  if (detail === null) notFound();

  const season = seasons.find((s) => s.id === seasonId);
  const { entry, person, documents, consents, duplicates } = detail;
  const blocking = failing(entry);
  const history = await loadValidationHistory(client, registrationId, 20);

  return (
    <>
      <p style={{ marginBottom: '0.25rem' }}>
        <a href="/registrar">&larr; Back to the queue</a>
      </p>

      <div className="card-row">
        <h2 style={{ marginTop: '0.5rem' }}>{entry.displayName}</h2>
        <StatusPill status={entry.status} />
      </div>

      <p className="lede">
        Legal name <strong>{entry.legalName}</strong>, born {person.dateOfBirth}.
        {person.preferredName !== null && (
          <>
            {' '}
            Known as <strong>{person.preferredName}</strong> — that name is shown to humans and
            never submitted externally (BR55).
          </>
        )}
      </p>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Rules</h3>
        <RuleList outcomes={entry.outcomes} />

        <form action={recheckAction} style={{ marginTop: '1rem' }}>
          <input type="hidden" name="registrationId" value={registrationId} />
          <input type="hidden" name="seasonId" value={seasonId} />
          <button type="submit" className="secondary">
            Re-check and record
          </button>
        </form>
        <p className="hint">
          Appends to the validation history rather than replacing it — the table has no update
          or delete policy, so what was wrong in March stays answerable.
        </p>
      </section>

      {person.legalNameVerifiedAt === null ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Verify the legal name (BR55)</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Check <strong>{entry.legalName}</strong> against the passport or birth certificate.
            A family can enter a legal name; only a club officer can confirm one was checked,
            and that difference is what survives contact with the federation.
          </p>
          <form action={verifyLegalNameAction} style={{ marginTop: '0.9rem' }}>
            <input type="hidden" name="personId" value={person.id} />
            <input type="hidden" name="registrationId" value={registrationId} />
            <button type="submit">I have checked this against a document</button>
          </form>
        </section>
      ) : (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Legal name verified</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Checked against an identity document on{' '}
            {new Date(person.legalNameVerifiedAt).toLocaleString('en-AU')}.
          </p>
        </section>
      )}

      {duplicates.length > 0 && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Possible duplicates (BR5)</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Surfaced for a human decision, never merged automatically — a false merge attaches
            one child&rsquo;s registration and eligibility to another. A submission pack
            excludes this person until it is resolved.
          </p>
          <ul className="rules">
            {duplicates.map((candidate) => (
              <li key={candidate.otherPersonId}>
                <span className="rule-id">BR5</span>
                <span>{candidate.evidence}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Consents</h3>
        {consents.length === 0 ? (
          <p className="empty">None recorded.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Purpose</th>
                  <th>Granted</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((consent) => (
                  <tr key={consent.id}>
                    <td>{CONSENT_LABEL[consent.purpose] ?? consent.purpose}</td>
                    <td>{new Date(consent.granted_at).toLocaleDateString('en-AU')}</td>
                    <td>
                      {consent.revoked_at === null ? (
                        <span className="pill pill-ok">Live</span>
                      ) : (
                        <span className="pill pill-stop">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Documents (BR2)</h3>
        {documents.length === 0 ? (
          <>
            <p className="empty">Nothing is required of this registration.</p>
            {season !== undefined && season.required_document_types.length > 0 && (
              <>
                <p className="hint">
                  {season.name} requires {season.required_document_types.join(', ')}, but this
                  registration was created before that checklist existed — so BR2 has nothing
                  to check and reports <em>pass</em>. Applying the checklist is a deliberate
                  act because it can turn a finished registration into a blocked one.
                </p>
                <form action={applyChecklistAction}>
                  <input type="hidden" name="registrationId" value={registrationId} />
                  <input type="hidden" name="seasonId" value={seasonId} />
                  <button type="submit" className="secondary">
                    Apply this season&rsquo;s checklist
                  </button>
                </form>
              </>
            )}
          </>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Received</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.document_type}</td>
                    <td>{doc.required ? 'Yes' : 'No'}</td>
                    <td>
                      {doc.provided_at === null ? (
                        <span className="pill pill-stop">Outstanding</span>
                      ) : (
                        new Date(doc.provided_at).toLocaleDateString('en-AU')
                      )}
                    </td>
                    <td>
                      <form action={setDocumentProvidedAction}>
                        <input type="hidden" name="documentId" value={doc.id} />
                        <input type="hidden" name="registrationId" value={registrationId} />
                        <input
                          type="hidden"
                          name="provided"
                          value={doc.provided_at === null ? '1' : '0'}
                        />
                        <button
                          type="submit"
                          className="secondary"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
                        >
                          {doc.provided_at === null ? 'Mark received' : 'Undo'}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Fees (BR3)</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          {entry.outstandingCents > 0
            ? `${formatCents(entry.outstandingCents)} is still outstanding.`
            : entry.outstandingCents < 0
              ? `The club holds a credit of ${formatCents(-entry.outstandingCents)}. BR3 does not treat a credit as an obstacle — blocking a child over money the club owes them would be the wrong way round.`
              : 'Nothing outstanding.'}
        </p>
        <OutstandingForm
          registrationId={registrationId}
          seasonId={seasonId}
          outstandingCents={entry.outstandingCents}
        />
        <p className="hint">
          The balance is set outright rather than reduced by a payment: this slice holds no
          payment records, and building a ledger out of a text box would be a worse lie than
          not having one. The audit log keeps the before and the after.
        </p>
      </section>

      {blocking.length === 0 && entry.duplicateCount === 0 && entry.status !== 'COMPLETE' && (
        <p className="notice">
          Every rule passes. Note what that does <em>not</em> mean: passing moves this toward{' '}
          <strong>sent</strong>, not toward eligible. Registering is the federation&rsquo;s act,
          and under BR43 the player cannot take the field until they are confirmed present in
          its system.
        </p>
      )}

      {history.length > 0 && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Validation history</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Rule</th>
                  <th>Result</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.evaluated_at).toLocaleString('en-AU')}</td>
                    <td>
                      <span className="rule-id">{row.rule_id}</span>
                    </td>
                    <td>{row.status}</td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
