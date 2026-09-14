'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import type { OfficiatingInterestRow } from '../../../data/officiating.ts';
import { reviewInterestAction } from './actions.ts';

/**
 * Declarations waiting on a decision (BR136, scope 39).
 *
 * The screen's job is to make plain that **nothing here is verified**. A
 * declared level is what a parent typed, and it is shown as a claim with
 * its author attached — because "their mother thought they were Level 4"
 * and "they said they were Level 4" are different conversations to have
 * with the register.
 */
function ReviewForm({ interest }: { readonly interest: OfficiatingInterestRow }) {
  const [result, action, pending] = useActionState(reviewInterestAction, IDLE_FORM);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="interestId" value={interest.id} />
      <FormNotice result={result} />

      <div>
        <strong>{interest.personName}</strong>
        {interest.declaredByName !== null && (
          <span className="hint"> &mdash; declared by {interest.declaredByName}</span>
        )}
        <br />
        <span className="hint">
          {interest.wantsToOfficiate && 'Interested in officiating. '}
          {interest.hasOfficiatedBefore ? 'Has officiated before. ' : 'No previous experience. '}
          {interest.declaredNumber !== null && <>Number given: <code>{interest.declaredNumber}</code>. </>}
          {interest.declaredLevel !== null && (
            <>
              Claims <strong>{interest.declaredLevel}</strong>
              {interest.levelIsCatalogued
                ? ' (matches the catalogue)'
                : ' (not in the catalogue)'}.{' '}
            </>
          )}
        </span>
      </div>

      <p className="hint" style={{ margin: 0 }}>
        <strong>Nothing here has been checked.</strong> Accepting makes them a match official for
        this season and records any level as <em>unchecked</em> — it counts towards nothing until
        you sight it against the register (BR138).
      </p>

      <label>
        <span>Note</span>
        <input name="note" placeholder="Optional — what you checked, or why not" />
      </label>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" name="accept" value="yes" disabled={pending}>
          {pending ? 'Saving…' : 'Accept'}
        </button>
        <button type="submit" name="accept" value="no" disabled={pending}>
          Decline
        </button>
      </div>
    </form>
  );
}

export function InterestQueue({ interests }: { readonly interests: readonly OfficiatingInterestRow[] }) {
  if (interests.length === 0) {
    return (
      <p className="empty">
        Nobody has declared an interest. The registration form asks every family &mdash; most
        referees start as players or parents.
      </p>
    );
  }

  return (
    <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
      {interests.map((i) => <li key={i.id}><ReviewForm interest={i} /></li>)}
    </ul>
  );
}
