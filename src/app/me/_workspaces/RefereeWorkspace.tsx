import type { SupabaseClient } from '@supabase/supabase-js';

import { loadFamilyDesignations } from '../../../data/designations.ts';
import { loadConfirmableAppointments } from '../../../data/match-confirmation.ts';
import { loadSettleableClaims } from '../../../data/claims.ts';
import { loadOfficialSelfView, loadOwnCredentials, type ClubLink } from '../../../data/me.ts';
import { formatMoney } from '../../../domain/finance/money.ts';
import { hasTurnedOn } from '../../../web/designation-answer.ts';
import { claimStanding, credentialStanding } from '../../../web/officials-own-view.ts';
import { SettleClaimForm } from '../_officiating/SettleClaimForm.tsx';
import { PayoutNominationForm } from '../_officiating/PayoutNominationForm.tsx';
import { loadNominations, loadPayouts } from '../../../data/payouts.ts';
import { displayNameFor } from '../../../web/queue-view.ts';
import { ConfirmMatchForm } from '../_officiating/ConfirmMatchForm.tsx';
import { DesignationPanel } from '../_designations/DesignationPanel.tsx';
import { Panel, WorkspaceHead } from './shared.tsx';
import { loadSubscription } from '../../../data/calendar.ts';
import { CalendarPanel } from '../_calendar/CalendarPanel.tsx';

/**
 * The official's own view.
 *
 * C4 built the coordinator's side — the roster, the designation screen,
 * claims and batches — and every one of its tables was readable only by
 * admin, registrar and coordinator, so an official signed in as themselves
 * got an empty answer from RLS. That was correct under P5 until a policy
 * said otherwise, and the workspace said so rather than rendering an empty
 * list as if nothing were waiting (BR65).
 *
 * **Appointments are the first of those to open.** Migration 0045 admits a
 * person to their own designations so that BR113's question can reach the
 * guardian it is addressed to; the adult official reached by the same
 * policy is the half of BR65 that came with it. The referee record itself —
 * classification, accreditation, what is owed — is the official's to read
 * too since scope 75 (0071), their own and nobody else's.
 */
export async function RefereeWorkspace({
  client,
  link,
  today,
}: {
  readonly client: SupabaseClient;
  readonly link: ClubLink;
  readonly today: string;
}) {
  const self = await loadOfficialSelfView(client, link.clubId, link.personId);

  // Their own designations, readable since 0045 (scope 51). An adult
  // official answers for themselves; the panel says so rather than leaving
  // the sentence out for the half of the pathway that is not a child.
  const designations = await loadFamilyDesignations(client, link.clubId, [link.personId], today);

  // BR151 as restated by scope 73: from thirteen on the day, the official
  // confirms their own match. Under thirteen it stays the guardian's.
  const confirmable = await loadConfirmableAppointments(client, link.clubId, [link.personId], today, 'self');

  // The official's own side (scope 75): every claim, and the record that
  // decides whether they may be appointed (readable by themself since 0071).
  const [claims, standing] = await Promise.all([
    loadSettleableClaims(client, link.clubId, [link.personId], ['raised', 'approved', 'rejected']),
    loadOwnCredentials(client, link.clubId, link.personId),
  ]);
  // BR152 and BR161 from thirteen (question 80 (C), scope 78): the official
  // chooses pay or credit and where it is paid; a guardian may too until 18.
  const choosesOwnSettlement = hasTurnedOn(link.person.dateOfBirth, 13, today);
  // Where they are paid (BR161) and what has been paid online (BR162).
  const [nominations, payouts] = await Promise.all([
    choosesOwnSettlement ? loadNominations(client, link.clubId, [link.personId]) : Promise.resolve(new Map<string, string>()),
    loadPayouts(client, claims.map((c) => c.id)),
  ]);

  // The calendar feed, from the official's own side (scope 41).
  const subscription = await loadSubscription(client, link.clubId, link.personId);

  return (
    <>
      <WorkspaceHead title="Your appointments">
        Appointments from the panel. A decline carries a brief reason, and a conflict with any other role you
        hold is caught before one is ever offered.
      </WorkspaceHead>
      <div className="cols">
        <div className="stack">
          <Panel title="Offered" meta={`${self.appointments} OPEN`}>
            <DesignationPanel
              clubId={link.clubId}
              offered={designations.offered}
              answerers={designations.answerers}
            />
          </Panel>
          {confirmable.length > 0 && (
            <Panel title="Confirm the match" meta={`${confirmable.filter((c) => !c.confirmed).length} WAITING`}>
              <p className="hint" style={{ margin: '0 0 var(--space-1)' }}>
                Did it go ahead with you there? Confirming marks the fixture played. A score is optional and
                never overwrites the club&rsquo;s own.{' '}
                <span className="mono" style={{ fontSize: '0.7rem' }}>
                  BR151
                </span>
              </p>
              <ul className="check" style={{ margin: 0 }}>
                {confirmable.map((a) => (
                  <ConfirmMatchForm key={a.fixtureId} clubId={link.clubId} appointment={a} />
                ))}
              </ul>
            </Panel>
          )}
          <Panel title="Refused before it reaches you">
            <p className="callout" style={{ marginBottom: 0 }}>
              <b>A match you play in, coach, manage, or have a child in is never offered.</b> The conflict is
              detected against your one record across every club, and enforced in the database — not left to
              you to notice at 7am on a Sunday.{' '}
              <span className="mono" style={{ fontSize: '0.7rem' }}>
                BR6 · BR109
              </span>
            </p>
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Accreditation">
            {standing.classification === null && standing.credentials.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                The club has not recorded a classification, accreditation or Blue Card for you yet.
              </p>
            ) : (
              <ul className="check" style={{ margin: 0 }}>
                {standing.classification !== null && (
                  <li>
                    <span className="ctitle">Classification: {standing.classification.level}</span>
                    <br />
                    <span className="cnote">
                      From {standing.classification.effectiveFrom};{' '}
                      {standing.classification.sighted ? 'sighted by the club' : 'not yet sighted by the club'}.
                    </span>
                  </li>
                )}
                {standing.credentials.map((c) => {
                  const st = credentialStanding(c, today);
                  return (
                    <li key={c.label + (c.expiresOn ?? '')}>
                      <span className="ctitle">{c.label}</span>{' '}
                      {st.tone !== 'ok' && (
                        <span className={st.tone === 'stop' ? 'pill pill-stop' : 'pill pill-warn'}>
                          {st.tone === 'stop' ? 'Expired' : 'Check'}
                        </span>
                      )}
                      <br />
                      <span className="cnote">{st.text}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="hint" style={{ margin: 'var(--space-1) 0 0' }}>
              Checked against the date of each fixture, not today: an expired accreditation stops a designation{' '}
              <span className="mono" style={{ fontSize: '0.7rem' }}>
                BR10 · BR111
              </span>
            </p>
          </Panel>
          <Panel title="Owed to you" meta={`${claims.length} CLAIMS`}>
            {claims.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No claims yet. The coordinator raises one after a match is verified.
              </p>
            ) : (
              <ul className="check" style={{ margin: 0 }}>
                {claims.map((c) =>
                  choosesOwnSettlement && c.state === 'approved' && !payouts.has(c.id) ? (
                    <SettleClaimForm key={c.id} clubId={link.clubId} claim={c} />
                  ) : (
                    <li key={c.id}>
                      <span className="ctitle">
                        vs {c.opponent} — {c.playedOn} · {formatMoney(c.amountCents)}
                      </span>
                      <br />
                      <span className="cnote">{claimStanding(c, choosesOwnSettlement, payouts.get(c.id) ?? null)}</span>
                    </li>
                  ),
                )}
              </ul>
            )}
            {choosesOwnSettlement ? (
              <div style={{ marginTop: 'var(--space-1)' }}>
                <PayoutNominationForm
                  clubId={link.clubId}
                  personId={link.personId}
                  officialName={displayNameFor(link.person)}
                  current={nominations.get(link.personId) ?? null}
                />
              </div>
            ) : (
              <p className="hint" style={{ margin: 'var(--space-1) 0 0' }}>
                Until you are 18, your Parent/Guardian nominates where you are paid{' '}
                <span className="mono" style={{ fontSize: '0.7rem' }}>
                  BR152 · BR161
                </span>
              </p>
            )}
          </Panel>
        </div>
      </div>
    
      <Panel title="Your calendar (BR30–BR34)">
        <CalendarPanel
          clubId={link.clubId}
          personId={link.personId}
          subscriptionId={subscription?.id ?? null}
          subscribed={subscription !== null && subscription.revokedAt === null}
          rotatedAt={subscription?.rotatedAt ?? null}
        />
      </Panel>
    </>
  );
}
