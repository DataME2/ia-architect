'use client';

import { useActionState, useState } from 'react';

import type { RepriceRow, TeamLine } from '../../../data/registration-fees.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { formatCents } from '../../../web/money.ts';
import { defaultLine, fillTerms, placeholdersIn, priceRegistration, type FeeLine } from '../../../web/registration-price.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import {
  addFeeLineAction,
  repriceSeasonAction,
  retireFeeLineAction,
  saveDiscountAction,
  saveTeamLineAction,
  saveTermsAction,
} from './actions.ts';

/** Adds a line to the season's schedule (admin and treasurer). */
export function AddFeeLine({ seasonId }: { readonly seasonId: string }) {
  const [result, action, pending] = useActionState(addFeeLineAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="seasonId" value={seasonId} />
      <FormNotice result={result} />
      <p>
        <label htmlFor="kind">Kind</label>
        <select id="kind" name="kind" defaultValue="club">
          <option value="club">Club registration</option>
          <option value="governing">Governing body&rsquo;s fee</option>
          <option value="levy">Levy</option>
        </select>
      </p>
      <p>
        <label htmlFor="name">Name, as a family reads it</label>
        <input id="name" name="name" placeholder="Player Fee - Community Junior / MiniRoos / U8 to U12" required />
      </p>
      <div className="fee-form-row">
        <p>
          <label htmlFor="amount">Amount</label>
          <input id="amount" name="amount" inputMode="decimal" placeholder="530" required />
        </p>
        <p>
          <label htmlFor="deposit">Fixed deposit</label>
          <input id="deposit" name="deposit" inputMode="decimal" placeholder="None" />
        </p>
        <p>
          <label htmlFor="minAge">From age</label>
          <input id="minAge" name="minAge" inputMode="numeric" placeholder="Any" />
        </p>
        <p>
          <label htmlFor="maxAge">To age</label>
          <input id="maxAge" name="maxAge" inputMode="numeric" placeholder="Any" />
        </p>
      </div>
      <p className="hint" style={{ margin: 0 }}>
        Ages are the age a player turns this season, as the governing body counts age groups: an Under 8 to Under 12 line is
        ages 7 to 11.
      </p>
      <div className="check">
        <input id="standard" name="standard" type="checkbox" />
        <label htmlFor="standard">
          Standard: charge this to a player with no team yet, for their age. Leave Academy and Advanced lines unticked, so they
          are only charged through their teams.
        </label>
      </div>
      <div className="check">
        <input id="adminOnly" name="adminOnly" type="checkbox" defaultChecked />
        <label htmlFor="adminOnly">Admin only: the club chooses this line for a player, not the family</label>
      </div>
      <p>
        <button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add to the schedule'}
        </button>
      </p>
    </form>
  );
}

/** Retires a line. Never deleted, so a registration priced from it keeps saying so. */
export function RetireFeeLine({ id, name }: { readonly id: string; readonly name: string }) {
  const [result, action, pending] = useActionState(retireFeeLineAction, IDLE_FORM);
  return (
    <form action={action} className="fee-retire">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="ghost" disabled={pending}>
        Retire<span className="sr-only"> {name}</span>
      </button>
      {result.status === 'error' && <FormNotice result={result} />}
    </form>
  );
}

export function DiscountForm({ bps }: { readonly bps: number }) {
  const [result, action, pending] = useActionState(saveDiscountAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <FormNotice result={result} />
      <p>
        <label htmlFor="percent">Off each sibling&rsquo;s club fee, after the first</label>
        <input id="percent" name="percent" inputMode="decimal" defaultValue={String(bps / 100)} style={{ maxWidth: '8rem' }} />
        <span className="hint">
          A sibling is another player the same parent or guardian registers this season, in any team. Each later sibling&rsquo;s
          discount comes off their own team&rsquo;s fee. The governing body&rsquo;s fee and the levy are never discounted (BR195).
        </span>
      </p>
      <p>
        <button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save the discount'}
        </button>
      </p>
    </form>
  );
}

interface Child {
  readonly key: number;
  readonly age: number;
  /** A team chosen for the child, or ''. */
  readonly teamId: string;
}

const ORDINAL = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'] as const;

/**
 * What would a family pay? Each child gets an age and, if they are placed, a
 * team; their line is the team's, else the standard line for their age, as
 * a registration is priced (BR195, 0100). Siblings can be in different
 * teams: the first pays in full and each later one gets the discount off
 * their own team's fee.
 */
export function FamilyPreview({
  lines,
  bps,
  teams,
}: {
  readonly lines: readonly FeeLine[];
  readonly bps: number;
  readonly teams: readonly TeamLine[];
}) {
  const [children, setChildren] = useState<readonly Child[]>([
    { key: 1, age: 11, teamId: '' },
    { key: 2, age: 8, teamId: '' },
  ]);
  const byId = new Map(lines.map((l) => [l.id, l]));
  const priced = children.map((c, i) => {
    const team = teams.find((t) => t.teamId === c.teamId);
    const clubLine = (team?.feeLineId ? byId.get(team.feeLineId) : undefined) ?? defaultLine(lines, 'club', c.age);
    return { child: c, team, clubLine, price: priceRegistration({ clubLine, lines, age: c.age, siblingIndex: i, discountBps: bps }) };
  });
  const total = priced.reduce((s, p) => s + p.price.totalCents, 0);
  const saved = priced.reduce((s, p) => s + p.price.discountCents, 0);
  const update = (key: number, change: Partial<Child>) =>
    setChildren(children.map((c) => (c.key === key ? { ...c, ...change } : c)));

  return (
    <div className="family-preview">
      <ol className="family-children">
        {priced.map(({ child, team, clubLine, price }, i) => (
          <li key={child.key} className="family-child">
            <div className="family-child-head">
              <b>{ORDINAL[i] ?? `Child ${i + 1}`} child</b>
              {children.length > 1 && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setChildren(children.filter((c) => c.key !== child.key))}
                >
                  Remove<span className="sr-only"> the {(ORDINAL[i] ?? `child ${i + 1}`).toLowerCase()} child</span>
                </button>
              )}
            </div>
            <div className="fee-form-row">
              <p>
                <label htmlFor={`fp-age-${child.key}`}>Age this season</label>
                <input
                  id={`fp-age-${child.key}`}
                  type="number"
                  min={3}
                  max={70}
                  value={child.age}
                  onChange={(e) => update(child.key, { age: Number(e.target.value) || 0 })}
                />
              </p>
              <p>
                <label htmlFor={`fp-team-${child.key}`}>Team</label>
                <select id={`fp-team-${child.key}`} value={child.teamId} onChange={(e) => update(child.key, { teamId: e.target.value })}>
                  <option value="">Not in a team yet</option>
                  {teams.map((t) => (
                    <option key={t.teamId} value={t.teamId}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              </p>
            </div>
            <p className="family-line">
              {clubLine === null ? 'No club line fits this age.' : clubLine.name}
              <span className="hint">
                {team?.feeLineId ? ' · the team’s line' : clubLine?.standard ? ' · the standard line for this age' : clubLine ? ' · the only line that fits' : ''}
              </span>
            </p>
            <ul className="family-lines">
              {price.lines.map((l) => (
                <li key={l.label}>
                  <span>{l.label}</span>
                  <span className="dash-num">{formatCents(l.cents)}</span>
                </li>
              ))}
              {price.discountCents > 0 && (
                <li className="price-discount">
                  <span>Sibling discount, {bps / 100}% off their club fee</span>
                  <span className="dash-num">&minus;{formatCents(price.discountCents)}</span>
                </li>
              )}
            </ul>
            <p className="family-subtotal">
              <span>Owes</span>
              <b key={price.totalCents} className="price-total">
                {formatCents(price.totalCents)}
              </b>
            </p>
          </li>
        ))}
      </ol>
      {children.length < 6 && (
        <button
          type="button"
          className="secondary"
          onClick={() =>
            setChildren([...children, { key: Math.max(...children.map((c) => c.key)) + 1, age: 9, teamId: '' }])
          }
        >
          Add a sibling
        </button>
      )}
      <p className="family-total" aria-live="polite">
        <span>The family pays</span>
        <b key={total} className="price-total">
          {formatCents(total)}
        </b>
        {saved > 0 && <span className="hint">after {formatCents(saved)} in sibling discounts</span>}
      </p>
    </div>
  );
}

/**
 * Which club line each team's players are charged. A choice saves as it is
 * made; "the standard line" means the player's age decides.
 */
export function TeamLineSelect({ team, clubLines }: { readonly team: TeamLine; readonly clubLines: readonly FeeLine[] }) {
  const [result, action, pending] = useActionState(saveTeamLineAction, IDLE_FORM);
  return (
    <form action={action} className="team-line">
      <input type="hidden" name="teamId" value={team.teamId} />
      <label htmlFor={`team-line-${team.teamId}`}>
        <b>{team.teamName}</b>
        <span className="hint">
          {team.ageGroup !== null && `${team.ageGroup} · `}
          {team.players} player{team.players === 1 ? '' : 's'}
        </span>
      </label>
      <select
        id={`team-line-${team.teamId}`}
        name="feeLineId"
        defaultValue={team.feeLineId ?? ''}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">The standard line for each player&rsquo;s age</option>
        {clubLines.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name} &middot; {formatCents(l.amountCents)}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="secondary">
          Save
        </button>
      </noscript>
      {result.status !== 'idle' && <FormNotice result={result} />}
    </form>
  );
}

/**
 * The season's current players, brought onto the schedule (BR195). Every
 * change is shown before it is made; ticking whether completed registrations
 * are included changes the list as it is ticked. A registration on a payment
 * plan is shown but never changed.
 */
export function RepricePanel({ seasonId, rows }: { readonly seasonId: string; readonly rows: readonly RepriceRow[] }) {
  const [result, action, pending] = useActionState(repriceSeasonAction, IDLE_FORM);
  const [includeComplete, setIncludeComplete] = useState(false);
  const changes = (r: RepriceRow) =>
    !r.hasPlan && (includeComplete || r.status !== 'COMPLETE') && r.wouldOweCents !== r.owesCents;
  const changing = rows.filter(changes);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="seasonId" value={seasonId} />
      <FormNotice result={result} />
      <div className="table-scroll">
        <table className="reprice-table">
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">Line</th>
              <th scope="col">Price</th>
              <th scope="col">Paid</th>
              <th scope="col">Owes now</th>
              <th scope="col">Would owe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = changes(r);
              return (
                <tr key={r.registrationId} className={on ? 'is-changing' : undefined}>
                  <td>
                    {r.personName}
                    {r.siblingIndex > 0 && <span className="hint"> &middot; sibling {r.siblingIndex + 1}</span>}
                    {r.hasPlan && <span className="pill pill-info">Payment plan</span>}
                    {r.status === 'COMPLETE' && !r.hasPlan && <span className="pill pill-ok">Complete</span>}
                  </td>
                  <td>{r.lineName ?? <span className="hint">No club line</span>}</td>
                  <td className="dash-num">{formatCents(r.totalCents)}</td>
                  <td className="dash-num">{formatCents(r.paidCents)}</td>
                  <td className="dash-num">{formatCents(r.owesCents)}</td>
                  <td className="dash-num">
                    {r.hasPlan ? (
                      <span className="hint">Unchanged</span>
                    ) : on ? (
                      <b>{formatCents(r.wouldOweCents)}</b>
                    ) : (
                      <span className="hint">{formatCents(r.owesCents)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="check">
        <input
          id="includeComplete"
          name="includeComplete"
          type="checkbox"
          checked={includeComplete}
          onChange={(e) => setIncludeComplete(e.target.checked)}
        />
        <label htmlFor="includeComplete">
          Include registrations already complete. They will owe the difference, so they stop counting as complete and their
          players show as not clear to play until it is paid (BR3, BR79).
        </label>
      </div>
      <div className="check">
        <input id="confirm" name="confirm" type="checkbox" required />
        <label htmlFor="confirm">I have read the {changing.length} change{changing.length === 1 ? '' : 's'} above</label>
      </div>
      <p>
        <button type="submit" disabled={pending || changing.length === 0}>
          {pending ? 'Applying…' : `Apply ${changing.length} change${changing.length === 1 ? '' : 's'}`}
        </button>
      </p>
    </form>
  );
}

/**
 * The club's terms: written with placeholders, each placeholder given its
 * value beside it, and the family's reading previewed live as it is typed.
 */
export function TermsEditor({
  body,
  values,
  canEdit,
}: {
  readonly body: string;
  readonly values: Readonly<Record<string, string>>;
  readonly canEdit: boolean;
}) {
  const [result, action, pending] = useActionState(saveTermsAction, IDLE_FORM);
  const [text, setText] = useState(body);
  const [filled, setFilled] = useState<Record<string, string>>({ ...values });
  const keys = placeholdersIn(text);

  return (
    <form action={action} className="terms-editor">
      <FormNotice result={result} />
      <div className="terms-grid">
        <div className="stack">
          <p>
            <label htmlFor="body">The terms, with placeholders in braces</label>
            <textarea id="body" name="body" rows={18} value={text} readOnly={!canEdit} onChange={(e) => setText(e.target.value)} />
          </p>
          {keys.length > 0 && (
            <fieldset className="terms-values">
              <legend>What each placeholder says</legend>
              {keys.map((k) => (
                <p key={k}>
                  <label htmlFor={`value-${k}`}>
                    <code>{`{${k}}`}</code>
                  </label>
                  <input
                    id={`value-${k}`}
                    name={`value:${k}`}
                    value={filled[k] ?? ''}
                    readOnly={!canEdit}
                    onChange={(e) => setFilled({ ...filled, [k]: e.target.value })}
                  />
                </p>
              ))}
            </fieldset>
          )}
          {canEdit && (
            <p>
              <button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save the terms'}
              </button>
            </p>
          )}
        </div>
        <div className="paper terms-preview" aria-live="polite">
          <p className="dash-metric-label">As a family will read them</p>
          <div className="terms-text">{fillTerms(text, filled)}</div>
        </div>
      </div>
    </form>
  );
}
