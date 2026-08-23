import { redirect } from 'next/navigation';

import { loadGovernance } from '../../../data/governance.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { loadAssignablePeople, loadClearanceCoverage } from '../../../data/teams.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import {
  daysUntilAgm,
  governingTerm,
  serving,
  termStatus,
  vacantOffices,
} from '../../../domain/governance/term.ts';
import { displayNameFor, fullLegalName } from '../../../web/queue-view.ts';
import {
  POSITION_LABEL,
  TERM_STATUS_LABEL,
  TERM_STATUS_TONE,
  termNote,
} from '../../../web/governance-view.ts';
import { todayIn } from '../../../web/today.ts';
import { AppointForm, NewTermForm } from './GovernanceForms.tsx';
import { resignMemberAction } from './actions.ts';

export const dynamic = 'force-dynamic';

export default async function GovernancePage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) {
    return (
      <>
        <h2>No club yet</h2>
        <p className="lede">This account is not a member of any club.</p>
      </>
    );
  }

  const today = todayIn();
  const { terms, members, people } = await loadGovernance(client, tenant.clubId);
  const governing = governingTerm(terms, today);

  // BR87: adults only. A MiniRoos player cannot govern the club — their
  // parent can, and so can a life member. The filter excludes by age, never
  // by whether someone plays or how long they have been around.
  const assignable = (
    await loadAssignablePeople(client, tenant.clubId, { adultsOnly: true, asAt: today })
  ).map((person) => ({
    id: person.id,
    label: `${displayNameFor(person)} — ${fullLegalName(person)}`,
  }));

  // BR88: committee members need a clearance, and not holding one does not
  // block the appointment — the club's own instruction was to identify the
  // committee first and chase paperwork after. So it is surfaced, not
  // enforced.
  const clearanceByPerson = await loadClearanceCoverage(client, tenant.clubId);

  return (
    <>
      <h2>Club governance &amp; administration</h2>
      <p className="lede">
        Who governs {tenant.clubName}, and until when. A committee is elected at an Annual
        General Meeting and serves until the next one &mdash; so a position is held for exactly
        one term and lapses with it, rather than being revoked (BR85).
      </p>

      {terms.length === 0 && (
        <p className="notice">
          <strong>No committee recorded yet.</strong> This is the first thing to fill in: other
          rules already rest on Committee authority &mdash; a Voucher Program cannot be applied
          to a family&rsquo;s invoice until the Committee approves it (BR21) &mdash; and until
          somebody is recorded here, &ldquo;the Committee approved it&rdquo; is a claim rather
          than a record.
        </p>
      )}

      {terms.map((term) => {
        const status = termStatus(term, today);
        const days = daysUntilAgm(term, today);
        const termMembers = serving(
          members.filter((m) => m.termId === term.id),
          today,
        );
        const vacant = vacantOffices(members.filter((m) => m.termId === term.id), today);
        const isGoverning = governing?.id === term.id;

        return (
          <section className="card" key={term.id}>
            <div className="card-row">
              <h3 style={{ marginTop: 0 }}>
                {term.name}
                {isGoverning && (
                  <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · governing</span>
                )}
              </h3>
              <span className={TERM_STATUS_TONE[status]}>{TERM_STATUS_LABEL[status]}</span>
            </div>

            <p className={status === 'overdue' ? 'notice' : 'hint'} style={{ marginTop: 0 }}>
              {termNote(status, days)}
            </p>

            <p className="hint" style={{ marginTop: 0 }}>
              {term.agmHeldOn === null
                ? 'No AGM recorded for this term yet.'
                : `Elected at the AGM of ${term.agmHeldOn}.`}{' '}
              Runs from {term.startsOn}; next AGM due {term.nextAgmDueOn}.
            </p>

            {vacant.length > 0 && (
              <p className="notice">
                <strong>Vacant:</strong>{' '}
                {vacant.map((office) => POSITION_LABEL[office]).join(', ')}. Recorded rather than
                refused &mdash; a club filling its committee should not be locked out of writing
                down the people it has.
              </p>
            )}

            {termMembers.length === 0 ? (
              <p className="empty">Nobody recorded in this term yet.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Person</th>
                      <th>Elected</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {termMembers.map((member) => {
                      const person = people.get(member.personId);
                      return (
                        <tr key={member.id}>
                          <td>{POSITION_LABEL[member.position]}</td>
                          <td>
                            {person === undefined ? (
                              <span className="hint">Unknown person</span>
                            ) : (
                              <>
                                <p className="name" style={{ margin: 0 }}>
                                  {displayNameFor(person)}
                                </p>
                                <p className="legal-name" style={{ margin: 0 }}>
                                  {fullLegalName(person)}
                                </p>
                              </>
                            )}
                          </td>
                          <td>{member.electedOn ?? <span className="hint">&mdash;</span>}</td>
                          <td>
                            <form action={resignMemberAction}>
                              <input type="hidden" name="positionId" value={member.id} />
                              <button
                                type="submit"
                                className="secondary"
                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
                              >
                                Resigned
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {(() => {
              const missing = termMembers.filter(
                (m) => (clearanceByPerson.get(m.personId) ?? null) === null,
              );
              return missing.length === 0 ? null : (
                <p className="notice">
                  <strong>
                    {missing.length === 1
                      ? '1 committee member has no verified Working with Children Check'
                      : `${missing.length} committee members have no verified Working with Children Check`}
                    :
                  </strong>{' '}
                  {missing
                    .map((m) => {
                      const person = people.get(m.personId);
                      return person === undefined ? 'Unknown' : displayNameFor(person);
                    })
                    .join(', ')}
                  . Recorded rather than refused (BR88) — a coach or team official is blocked
                  outright, but a committee has to be identifiable before its paperwork can be
                  chased.
                </p>
              );
            })()}

            <h4>Add a committee member</h4>
            <p className="hint" style={{ marginTop: 0 }}>
              Adults only (BR87). A parent can serve, and so can a life member; a MiniRoos
              player cannot.
            </p>
            <AppointForm termId={term.id} people={assignable} />
          </section>
        );
      })}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Open a governance year</h3>
        <NewTermForm />
      </section>

      <p className="hint">
        A resignation is an early exit and is recorded as one. It is a different fact from the
        term ending, which happens to everyone at once at the next AGM &mdash; and the
        club&rsquo;s minutes will refer to it as a different thing too.
      </p>
    </>
  );
}
