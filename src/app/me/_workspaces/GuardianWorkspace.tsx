import type { SupabaseClient } from '@supabase/supabase-js';

import { formatMoney } from '../../../domain/finance/money.ts';
import { planState } from '../../../domain/finance/plan.ts';
import { loadFamilyDesignations } from '../../../data/designations.ts';
import { loadFinance } from '../../../data/finance.ts';
import { loadHousehold } from '../../../data/household.ts';
import { loadConsents, loadMyTeams, loadTeamFixtures, type ClubLink } from '../../../data/me.ts';
import { loadVouchers } from '../../../data/vouchers.ts';
import { RULE_TITLE, childCard, remainingFigure, selectChild, type Tone } from '../../../web/household-view.ts';
import { ROLE_HUE, nextFixture, shortDate } from '../../../web/me-view.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
import { DesignationPanel } from '../_designations/DesignationPanel.tsx';
import { ComingSoon, FixtureCard, Panel, WorkspaceHead } from './shared.tsx';

const CONSENT_LABEL: Readonly<Record<string, string>> = {
  REGISTRATION_COLLECTION_NOTICE: 'Collection notice',
  IDENTIFICATION_PHOTOGRAPH: 'Identification photograph',
  PUBLICITY: 'Publicity',
};

const CONSENT_RULE: Readonly<Record<string, string>> = {
  IDENTIFICATION_PHOTOGRAPH: 'BR56',
  PUBLICITY: 'BR57',
};

const TONE_CLASS: Readonly<Record<Tone, string>> = {
  ok: 'pill pill-ok',
  wait: 'pill pill-warn',
  stop: 'pill pill-stop',
  none: 'pill',
};

/**
 * Acting for a child. The account and every response on their behalf are
 * the guardian's, not the child's (BR63), until the handover at 18 (BR67).
 *
 * One card per child across the top — status, what is outstanding, money —
 * and the chosen child's detail beneath. The choice is a URL (`&child=`),
 * the same way the role switch is, so it survives the back button.
 */
export async function GuardianWorkspace({
  client,
  link,
  today,
  childId,
}: {
  readonly client: SupabaseClient;
  readonly link: ClubLink;
  readonly today: string;
  readonly childId: string | null;
}) {
  const season = link.season;
  const household = await loadHousehold(client, link.clubId, season?.id ?? null, link.personId, today);
  const cards = household.map((h) => childCard(h, today));
  const card = selectChild(cards, childId);
  const child = card === null ? undefined : household.find((h) => h.person.id === card.personId);

  if (card === null || child === undefined) {
    return (
      <WorkspaceHead title="Acting as a guardian">
        No child is recorded under your authority at {link.clubName}. A registrar records guardianship when a
        minor is registered (BR1).
      </WorkspaceHead>
    );
  }

  const registration = child.registration;
  const finance = registration === null ? null : await loadFinance(client, link.clubId, registration.id);
  const plan =
    finance === null || finance.plan === null
      ? null
      : planState(finance.plan.totalCents, finance.plan.installments, finance.payments, today);
  const remaining = plan === null ? null : remainingFigure(plan.outstandingCents);
  const vouchers = registration === null ? [] : await loadVouchers(client, link.clubId, registration.id);
  const relief = vouchers.filter((v) => v.state === 'VERIFIED' || v.state === 'CLAIMED');
  const consents = await loadConsents(client, link.clubId, card.personId);
  const teams = season === null ? [] : await loadMyTeams(client, link.clubId, season.id, card.personId);
  const team = teams.find((t) => t.role === 'player') ?? null;
  const fixtures = season === null || team === null ? [] : await loadTeamFixtures(client, link.clubId, season.id, team.team.id);
  const next = nextFixture(fixtures, today);

  // BR113. Every child in the household, not only the one on screen: a
  // designation is answered by the date of its fixture, and a parent who
  // had to find the right child's tab first would miss Saturday's while
  // looking at Sunday's.
  const designations = await loadFamilyDesignations(
    client, link.clubId, cards.map((c) => c.personId), today,
  );

  const firstBlocker = card.blockers[0];
  const guardianRecorded = child.outcomes.some((o) => o.ruleId === 'BR1' && o.status === 'pass');
  const needsDocument = card.blockers.some((o) => o.ruleId === 'BR2');
  const where = [link.clubName, team?.team.name].filter((s): s is string => s !== undefined).join(' · ');

  return (
    <>
      <WorkspaceHead title={`Acting for ${card.name} · ${card.age}`}>
        A minor&rsquo;s account and every response on their behalf belong to <b>you</b>, not to them — until
        their eighteenth birthday, when it transfers as a recorded, notified transition.
        {cards.length > 1 && ` You hold authority for ${cards.length} children here — choose one below.`}
      </WorkspaceHead>

      {cards.length > 1 && (
        <nav className="household" aria-label="Your children">
          {cards.map((c) => (
            <a
              key={c.personId}
              className="child-card"
              href={`?role=guardian&club=${encodeURIComponent(link.clubId)}&child=${encodeURIComponent(c.personId)}`}
              aria-current={c.personId === card.personId ? 'true' : undefined}
              style={{ ['--role-hue' as string]: ROLE_HUE.guardian }}
            >
              <span className="child-card-name">{c.name}</span>
              <span className="child-card-meta">
                Age {c.age}
                {season !== null && ` · ${season.name}`}
              </span>
              <span className={TONE_CLASS[c.tone]}>{c.label}</span>
              {c.money !== null && <span className="child-card-note">{c.money}</span>}
            </a>
          ))}
        </nav>
      )}

      <div className="cols">
        <div className="stack">
          <Panel title={card.blockers.length > 0 ? 'Registration — blocked' : 'Registration'} meta={where.toUpperCase()}>
            {registration === null ? (
              <p className="empty" style={{ margin: 0 }}>
                No registration this season.
              </p>
            ) : (
              <>
                <span className={TONE_CLASS[card.tone]}>{card.label}</span>
                <ul className="check">
                  {card.blockers.map((o) => (
                    <li key={o.ruleId}>
                      <span className="box todo" aria-hidden="true" />
                      <span>
                        <span className="ctitle">{RULE_TITLE[o.ruleId] ?? o.ruleId}</span>
                        <br />
                        <span className="cnote">{o.message}</span>
                      </span>
                      <span className="rid">{o.ruleId}</span>
                    </li>
                  ))}
                  {guardianRecorded && (
                    <li>
                      <span className="box done" aria-hidden="true" />
                      <span>
                        <span className="ctitle">Guardian recorded</span>
                        <br />
                        <span className="cnote">You — authority and contact, kept apart</span>
                      </span>
                      <span className="rid">BR1</span>
                    </li>
                  )}
                  {consents.map((c) => (
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
                      <span className="rid">{CONSENT_RULE[c.purpose] ?? 'BR48'}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
          {needsDocument && (
            <ComingSoon title="Upload a document" waitsOn="a family-facing upload — today a registrar records what was sighted">
              The missing document will be uploadable here. Until then the registrar records it from what you
              bring.
            </ComingSoon>
          )}
          {firstBlocker !== undefined && (
            <AssistantNote kind="explaining">
              {firstBlocker.message} {card.name} can train while this is outstanding but cannot be named on a
              team sheet.
            </AssistantNote>
          )}
        </div>
        <div className="stack">
          <Panel title="Fees" meta={plan === null ? undefined : `PLAN · ${plan.installments.length} INSTALMENTS`}>
            {plan === null || remaining === null ? (
              registration === null ? (
                <p className="empty" style={{ margin: 0 }}>
                  Nothing to show.
                </p>
              ) : (
                <p className="hint" style={{ margin: 0 }}>
                  {card.money}
                  {child.balanceCents > 0 && ' — no payment plan agreed'}.
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
                    <b>{formatMoney(remaining.cents)}</b>
                    <span>{remaining.label}</span>
                  </div>
                </div>
                {plan.nextDue !== null && (
                  <span className={`pill ${plan.nextDue.overdue ? 'pill-stop' : 'pill-warn'}`}>
                    Next instalment {formatMoney(plan.nextDue.outstandingCents)} · due{' '}
                    {shortDate(plan.nextDue.installment.dueOn)}
                  </span>
                )}
              </>
            )}
            {relief.map((v) => (
              <p key={v.id} className="hint" style={{ margin: 0 }}>
                A {v.program} voucher covered {formatMoney(v.faceValueCents)}.
              </p>
            ))}
          </Panel>
          <Panel
            title="Designations waiting on you"
            meta={`${designations.offered.filter((o) => o.state === 'proposed').length} OPEN`}
          >
            <p className="hint" style={{ margin: '0 0 var(--space-1)' }}>
              An official under 18 does not accept their own designations &mdash; the club proposes
              them to you.{' '}
              <span className="mono" style={{ fontSize: '0.7rem' }}>
                BR113
              </span>
            </p>
            <DesignationPanel
              clubId={link.clubId}
              offered={designations.offered}
              answerers={designations.answerers}
            />
          </Panel>
          <Panel title={`${card.name}'s next match`}>
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
