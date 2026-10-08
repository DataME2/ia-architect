import type { SupabaseClient } from '@supabase/supabase-js';

import {
  daysUntilAgm,
  governingTerm,
  serving,
  termStatus,
  vacantOffices,
} from '../../../domain/governance/term.ts';
import { loadGovernanceOrEmpty, loadPositionConfirmations } from '../../../data/governance.ts';
import { countVouchersAwaiting, type ClubLink } from '../../../data/me.ts';
import { loadHardshipRequests } from '../../../data/hardship.ts';
import { HardshipDecisionRow } from '../_hardship/HardshipForms.tsx';
import { displayNameFor } from '../../../web/queue-view.ts';
import { POSITION_LABEL, RESOLUTION_CATEGORY_LABEL, confirmationStatus } from '../../../web/governance-view.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
import { Panel, WorkspaceHead } from './shared.tsx';

function titleCase(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** What the committee decides, and what it does not. */
export async function CommitteeWorkspace({
  client,
  link,
  today,
}: {
  readonly client: SupabaseClient;
  readonly link: ClubLink;
  readonly today: string;
}) {
  const governance = await loadGovernanceOrEmpty(client, link.clubId);
  const term = governingTerm(governance.terms, today);
  const status = term === null ? null : termStatus(term, today);
  const members = term === null ? [] : serving(governance.members, today).filter((m) => m.termId === term.id);
  const vacant = term === null ? [] : vacantOffices(members, today);
  const vouchers = await countVouchersAwaiting(client, link.clubId);
  const treasurer = link.membershipRoles.some((r) => r === 'treasurer' || r === 'admin');
  // BR164: the committee decides hardship; RLS returns only what it may read.
  const hardship = await loadHardshipRequests(client, link.clubId);
  const waitingHardship = hardship.filter((h) => h.state === 'requested');
  const activeHardship = hardship.filter((h) => h.state === 'approved' && h.validUntil !== null && h.validUntil >= today);
  // BR123, BR166, BR167: the same queue the governance screen shows an admin.
  const confirmations = await loadPositionConfirmations(client, link.clubId);
  const unconfirmed = members
    .map((m) => ({ m, st: confirmationStatus(m.position, m.confirmedAt, confirmations.get(m.id) ?? []) }))
    .filter((x) => !x.st.confirmed);
  const resolutions = term === null ? [] : governance.resolutions.filter((r) => r.termId === term.id).slice(0, 5);

  return (
    <>
      <WorkspaceHead title={`Governance — ${link.clubName}`}>
        What the committee decides, and what it does not.{' '}
        {treasurer
          ? 'You also hold the treasurer role, so the money controls are yours.'
          : 'You hold no treasurer role, so nothing here moves money — the controls simply are not rendered.'}
      </WorkspaceHead>
      <div className="cols">
        <div className="stack">
          <Panel title="Awaiting a committee decision">
            <ul className="roster">
              <li>
                <span>
                  <span className="who">Vouchers attached, not yet verified</span>
                  <span className="why">Verification moves money — a treasurer&rsquo;s act (BR78)</span>
                </span>
                <span className={vouchers > 0 ? 'pill pill-warn' : 'pill pill-ok'}>{vouchers} waiting</span>
              </li>
            </ul>
          </Panel>
          <Panel title="Committee resolutions" meta={`${unconfirmed.length} AWAITING CONFIRMATION`}>
            {unconfirmed.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>Every position this term is confirmed.</p>
            ) : (
              <ul className="roster">
                {unconfirmed.map(({ m, st }) => {
                  const person = governance.people.get(m.personId);
                  return (
                    <li key={m.id}>
                      <span>
                        <span className="who">{person === undefined ? 'Unknown' : displayNameFor(person)}</span>
                        <span className="why">{POSITION_LABEL[m.position]} · {st.label}</span>
                      </span>
                      <span className="pill pill-warn">Awaiting</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {resolutions.length > 0 && (
              <ul className="roster">
                {resolutions.map((r) => (
                  <li key={r.id}>
                    <span>
                      <span className="who">{r.summary}</span>
                      <span className="why">{r.decidedOn} · {RESOLUTION_CATEGORY_LABEL[r.category]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint" style={{ marginBottom: 0 }}>
              Record a resolution or confirm a position on the <a href="/registrar/governance">governance screen</a>.
              The President, Secretary, Treasurer and committee may record.{' '}
              <span className="mono" style={{ fontSize: '0.7rem' }}>BR123 · BR166 · BR167</span>
            </p>
          </Panel>
          <Panel title="Hardship requests" meta={`${waitingHardship.length} WAITING`}>
            <p className="hint" style={{ margin: '0 0 var(--space-1)' }}>
              An approved hardship lets a player take the field until a date although money is owed. The debt is
              not forgiven, and your name and reason are recorded.{' '}
              <span className="mono" style={{ fontSize: '0.7rem' }}>BR79 · BR164</span>
            </p>
            {waitingHardship.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>No request is waiting.</p>
            ) : (
              <ul className="check" style={{ margin: 0 }}>
                {waitingHardship.map((h) => (
                  <HardshipDecisionRow key={h.id} clubId={link.clubId} request={h} />
                ))}
              </ul>
            )}
            {activeHardship.length > 0 && (
              <p className="hint" style={{ marginBottom: 0 }}>
                In force: {activeHardship.map((h) => `${h.playerName} until ${h.validUntil}`).join(' · ')}.
              </p>
            )}
          </Panel>
          <AssistantNote kind="summary">
            When the meeting is called, a one-page summary of what is waiting — with last year&rsquo;s voucher
            uptake beside it — will be drafted here. It approves nothing; the committee does.
          </AssistantNote>
        </div>
        <div className="stack">
          <Panel title="Mandate" meta={term?.name.toUpperCase()}>
            {term === null || status === null ? (
              <p className="callout wait" style={{ margin: 0 }}>
                <b>No committee term recorded.</b> An admin records the AGM and its elected positions on the
                governance screen.
              </p>
            ) : (
              <>
                <span
                  className={`pill ${status === 'overdue' ? 'pill-stop' : status === 'due-soon' ? 'pill-warn' : 'pill-ok'}`}
                >
                  {status === 'overdue'
                    ? `AGM overdue by ${Math.abs(daysUntilAgm(term, today))} days`
                    : status === 'due-soon'
                      ? `AGM due in ${daysUntilAgm(term, today)} days`
                      : `AGM due ${term.nextAgmDueOn}`}
                </span>
                <ul className="roster">
                  {members.map((m) => {
                    const person = governance.people.get(m.personId);
                    return (
                      <li key={m.id}>
                        <span>
                          <span className="who">{person === undefined ? 'Unknown' : displayNameFor(person)}</span>
                          <span className="why">{titleCase(m.position)}</span>
                        </span>
                        {m.personId === link.personId && <span className="pill pill-info">You</span>}
                      </li>
                    );
                  })}
                </ul>
                {vacant.length > 0 && (
                  <p className="callout wait" style={{ margin: 0 }}>
                    <b>Vacant:</b> {vacant.map(titleCase).join(', ')}.{' '}
                    <span className="mono" style={{ fontSize: '0.7rem' }}>BR20</span>
                  </p>
                )}
              </>
            )}
          </Panel>
          {!treasurer && (
            <Panel title="Not available to you">
              <p className="callout wait" style={{ margin: 0 }}>
                <b>Verifying a voucher moves money.</b> That is the treasurer&rsquo;s act, and you do not hold
                the role. The button is absent rather than shown and refused — and the database would refuse
                it regardless of the screen.{' '}
                <span className="mono" style={{ fontSize: '0.7rem' }}>BR78</span>
              </p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
