import type { SupabaseClient } from '@supabase/supabase-js';

import {
  daysUntilAgm,
  governingTerm,
  serving,
  termStatus,
  vacantOffices,
} from '../../../domain/governance/term.ts';
import { loadGovernance } from '../../../data/governance.ts';
import { countVouchersAwaiting, type ClubLink } from '../../../data/me.ts';
import { displayNameFor } from '../../../web/queue-view.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
import { ComingSoon, Panel, WorkspaceHead } from './shared.tsx';

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
  const governance = await loadGovernance(client, link.clubId);
  const term = governingTerm(governance.terms, today);
  const status = term === null ? null : termStatus(term, today);
  const members = term === null ? [] : serving(governance.members, today).filter((m) => m.termId === term.id);
  const vacant = term === null ? [] : vacantOffices(members, today);
  const vouchers = await countVouchersAwaiting(client, link.clubId);
  const treasurer = link.membershipRoles.some((r) => r === 'treasurer' || r === 'admin');

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
          <ComingSoon title="Hardship requests" waitsOn="open question 50 — a recorded override for BR79">
            A family that cannot pay this week will be kept off the field by nobody. The open question is
            whether that happens here, with an approver and a reason recorded, or by someone quietly zeroing
            a balance.
          </ComingSoon>
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
