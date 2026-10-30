'use client';

import { useActionState, useMemo, useState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { formatCents } from '../../../web/money.ts';
import { fillTerms, linesFor, placeholdersIn, priceRegistration, type FeeLine } from '../../../web/registration-price.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { addFeeLineAction, retireFeeLineAction, saveDiscountAction, saveTermsAction } from './actions.ts';

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
          A sibling is another player the same parent or guardian registers this season. The governing body&rsquo;s fee and the levy are never discounted (BR195).
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

/**
 * What would a family pay? Pick an age and which child this is, and the
 * breakdown is worked out here, by the same rule a registration will use
 * (BR195), as the schedule stands.
 */
export function PricePreview({ lines, bps }: { readonly lines: readonly FeeLine[]; readonly bps: number }) {
  const [age, setAge] = useState(10);
  const [child, setChild] = useState(1);
  const fits = useMemo(() => linesFor(lines, 'club', age), [lines, age]);
  const [chosen, setChosen] = useState<string | null>(null);
  const clubLine = fits.find((l) => l.id === chosen) ?? fits[0] ?? null;
  const price = priceRegistration({ clubLine, lines, age, siblingIndex: child - 1, discountBps: bps });

  return (
    <div className="price-preview">
      <div className="fee-form-row">
        <p>
          <label htmlFor="pp-age">Age this season</label>
          <input id="pp-age" type="number" min={4} max={60} value={age} onChange={(e) => setAge(Number(e.target.value) || 0)} />
        </p>
        <p>
          <label htmlFor="pp-child">Child number</label>
          <select id="pp-child" value={child} onChange={(e) => setChild(Number(e.target.value))}>
            <option value={1}>First</option>
            <option value={2}>Second</option>
            <option value={3}>Third</option>
            <option value={4}>Fourth or later</option>
          </select>
        </p>
        <p>
          <label htmlFor="pp-line">Club line</label>
          <select id="pp-line" value={clubLine?.id ?? ''} onChange={(e) => setChosen(e.target.value)} disabled={fits.length < 2}>
            {fits.length === 0 && <option value="">No line fits this age</option>}
            {fits.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </p>
      </div>
      <table className="price-table" aria-live="polite">
        <tbody>
          {price.lines.map((l) => (
            <tr key={l.label}>
              <td>{l.label}</td>
              <td className="dash-num">{formatCents(l.cents)}</td>
            </tr>
          ))}
          {price.discountCents > 0 && (
            <tr className="price-discount">
              <td>Sibling discount ({bps / 100}% off the club fee)</td>
              <td className="dash-num">&minus;{formatCents(price.discountCents)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td className="dash-num">
              <b key={price.totalCents} className="price-total">
                {formatCents(price.totalCents)}
              </b>
            </td>
          </tr>
          {price.depositCents > 0 && (
            <tr>
              <td>Of which a fixed deposit, paid up front</td>
              <td className="dash-num">{formatCents(price.depositCents)}</td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
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
