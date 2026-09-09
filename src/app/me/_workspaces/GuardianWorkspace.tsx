import type { SupabaseClient } from '@supabase/supabase-js';

import { planState } from '../../../domain/finance/plan.ts';
import { formatMoney } from '../../../domain/finance/money.ts';
import { loadFinance } from '../../../data/finance.ts';
import {
  loadChildren,
  loadConsents,
  loadMyRegistration,
  loadMyTeams,
  loadTeamFixtures,
  type ClubLink,
} from '../../../data/me.ts';
import { nextFixture, shortDate } from '../../../web/me-view.ts';
import { displayNameFor } from '../../../web/queue-view.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
import { ComingSoon, FixtureCard, Panel, RegistrationPill, WorkspaceHead } from './shared.tsx';

const CONSENT_LABEL: Readonly<Record<string, string>> = {
  REGISTRATION_COLLECTION_NOTICE: 'Collection notice',
  IDENTIFICATION_PHOTOGRAPH: 'Identification photograph',
  PUBLICITY: 'Publicity',
};

/**
 * Acting for a child. The account and every response on their behalf are
 * the guardian's, not the child's (BR63), until the handover at 18 (BR67).
 */
export async function GuardianWorkspace({
  client,
  link,
  today,
}: {
  readonly client: SupabaseClient;
  readonly link: ClubLink;
  readonly today: string;
}) {
  const season = link.season;
  const children = await loadChildren(client, link.clubId, link.personId);
  const first = children[0] ?? null;

  const registration =
    season === null || first === null ? null : await loadMyRegistration(client, link.clubId, season.id, first.id);
  const finance = registration === null ? null : await loadFinance(client, link.clubId, registration.id);
  const plan =
    finance === null || finance.plan === null
      ? null
      : planState(finance.plan.totalCents, finance.plan.installments, finance.payments, today);
  const consents = first === null ? [] : await loadConsents(client, link.clubId, first.id);
  const teams = season === null || first === null ? [] : await loadMyTeams(client, link.clubId, season.id, first.id);
  const team = teams.find((t) => t.role === 'player') ?? null;
  const fixtures =
    season === null || team === null ? [] : await loadTeamFixtures(client, link.clubId, season.id, team.team.id);
  const next = nextFixture(fixtures, today);

  if (first === null) {
    return (
      <WorkspaceHead title="Acting as a guardian">
        No child is recorded under your authority at {link.clubName}. A registrar records guardianship when a
        minor is registered (BR1).
      </WorkspaceHead>
    );
  }

  const childName = displayNameFor(first);
  const blocked = registration !== null && registration.status !== 'COMPLETE';

  return (
    <>
      <WorkspaceHead title={`Acting for ${childName}`}>
        A minor&rsquo;s account and every response on their behalf belong to <b>you</b>, not to them — until
        their eighteenth birthday, when it transfers as a recorded, notified transition.
        {children.length > 1 && ` You hold authority for ${children.length} children here; the first is shown.`}
      </WorkspaceHead>
      <div className="cols">
        <div className="stack">
          <Panel title={blocked ? 'Registration — not finished' : 'Registration'} meta={season?.name.toUpperCase()}>
            {registration === null ? (
              <p className="empty" style={{ margin: 0 }}>
                No registration this season.
              </p>
            ) : (
              <>
                <RegistrationPill status={registration.status} outstandingCents={registration.outstanding_amount_cents} />
                <ul className="check">
                  {consents.length === 0 ? (
                    <li>
                      <span className="box todo" aria-hidden="true" />
                      <span>
                        <span className="ctitle">No consents recorded</span>
                      </span>
                      <span className="rid">BR48</span>
                    </li>
                  ) : (
                    consents.map((c) => (
                      <li key={c.id}>
                        <span className={`box ${c.revoked_at === null ? 'done' : 'todo'}`} aria-hidden="true" />
                        <span>
                          <span className="ctitle">{CONSENT_LABEL[c.purpose] ?? c.purpose}</span>
                          <br />
                          <span className="cnote">
                            {c.revoked_at === null ? `Given ${shortDate(c.granted_at.slice(0, 10))}` : 'Withdrawn'}
                            {' · revocable at any time'}
                          </span>
                        </span>
                        <span className="rid">{c.purpose === 'PUBLICITY' ? 'BR57' : c.purpose === 'IDENTIFICATION_PHOTOGRAPH' ? 'BR56' : 'BR48'}</span>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </Panel>
          <ComingSoon title="Upload a document" waitsOn="a family-facing upload — today a registrar records what was sighted">
            Proof of age and the other required documents will be uploadable here. Until then the registrar
            records them from what you bring.
          </ComingSoon>
          {blocked && (
            <AssistantNote kind="explaining">
              A registration that is not finished cannot be named on a team sheet, and a child can still train
              while it is outstanding. The registrar can say exactly which document is missing.
            </AssistantNote>
          )}
        </div>
        <div className="stack">
          <Panel title="Fees" meta={plan === null ? undefined : `${plan.installments.length} INSTALMENTS`}>
            {plan === null ? (
              registration === null ? (
                <p className="empty" style={{ margin: 0 }}>
                  Nothing to show.
                </p>
              ) : (
                <p className="hint" style={{ margin: 0 }}>
                  {registration.outstanding_amount_cents === 0
                    ? 'Paid in full.'
                    : `${formatMoney(registration.outstanding_amount_cents)} outstanding, no payment plan agreed.`}
                </p>
              )
            ) : (
              <>
                <div className="figs">
                  <div>
                    <b>{formatMoney(plan.paidCents)}</b>
                    <span>Paid</span>
                  </div>
                  <div>
                    <b>{formatMoney(plan.outstandingCents)}</b>
                    <span>Remaining</span>
                  </div>
                </div>
                {plan.nextDue !== null && (
                  <span className={`pill ${plan.nextDue.overdue ? 'pill-stop' : 'pill-warn'}`}>
                    Next instalment {formatMoney(plan.nextDue.installment.amountCents)} · due{' '}
                    {shortDate(plan.nextDue.installment.dueOn)}
                  </span>
                )}
              </>
            )}
          </Panel>
          <Panel title={`${childName}'s next match`}>
            {next !== null && team !== null ? (
              <FixtureCard fixture={next} teamName={team.team.name} />
            ) : (
              <p className="empty" style={{ margin: 0 }}>
                {team === null ? 'Not on a team sheet yet.' : 'No upcoming fixture entered.'}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
