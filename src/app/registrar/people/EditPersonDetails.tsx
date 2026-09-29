'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { PLACEHOLDER_BIRTH_DATE } from '../../../web/person-edit.ts';
import type { PersonSummary } from '../../../web/people-view.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { editPersonAction } from './actions.ts';

/**
 * Fix a mistake in someone's names, email or date of birth, in place
 * (scope 68). Folded behind "Edit details" so the list stays a list.
 */
export function EditPersonDetails({ summary }: { readonly summary: PersonSummary }) {
  const [result, formAction, pending] = useActionState(editPersonAction, IDLE_FORM);
  const id = summary.personId;

  return (
    <details style={{ marginTop: '0.35rem' }}>
      <summary className="hint" style={{ cursor: 'pointer' }}>
        Edit details
      </summary>
      <form action={formAction} className="stack" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
        <input type="hidden" name="personId" value={id} />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 9rem' }}>
            <label htmlFor={`given-${id}`}>Given name(s), as on documents</label>
            <input id={`given-${id}`} name="legalGivenNames" defaultValue={summary.legalGivenNames} required />
          </div>
          <div style={{ flex: '1 1 9rem' }}>
            <label htmlFor={`family-${id}`}>Family name, as on documents</label>
            <input id={`family-${id}`} name="legalFamilyName" defaultValue={summary.legalFamilyName} required />
          </div>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor={`preferred-${id}`}>Known as</label>
            <input id={`preferred-${id}`} name="preferredName" defaultValue={summary.preferredName ?? ''} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 14rem' }}>
            <label htmlFor={`email-${id}`}>Email</label>
            <input id={`email-${id}`} name="email" type="email" defaultValue={summary.email ?? ''} />
          </div>
          <div style={{ flex: '1 1 9rem' }}>
            <label htmlFor={`born-${id}`}>Date of birth</label>
            <input
              id={`born-${id}`}
              name="dateOfBirth"
              type="date"
              defaultValue={summary.dateOfBirth === PLACEHOLDER_BIRTH_DATE ? '' : summary.dateOfBirth}
            />
          </div>
        </div>
        {summary.legalNameVerified && (
          <p className="hint" style={{ margin: 0 }}>
            The legal name has been checked against a document. Changing it withdraws that check (BR55).
          </p>
        )}
        <div>
          <button type="submit" className="secondary" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
        <FormNotice result={result} />
      </form>
    </details>
  );
}
