'use client';

import { useActionState } from 'react';

import { IDLE_FORM, type FormResult } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';

import { COMMITTEE_POSITIONS } from '../../../domain/governance/term.ts';
import { POSITION_LABEL } from '../../../web/governance-view.ts';
import { appointMemberAction, createTermAction } from './actions.ts';

export function NewTermForm() {
  const [result, formAction, pending] = useActionState<FormResult, FormData>(
    createTermAction,
    IDLE_FORM,
  );

  return (
    <>
      <FormNotice result={result} />
      <form action={formAction} className="stack">
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="name">Term</label>
            <input id="name" name="name" placeholder="2026–27" />
          </div>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="agmHeldOn">AGM held</label>
            <input id="agmHeldOn" name="agmHeldOn" type="date" />
          </div>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="startsOn">Term starts</label>
            <input id="startsOn" name="startsOn" type="date" />
          </div>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="nextAgmDueOn">Next AGM due</label>
            <input id="nextAgmDueOn" name="nextAgmDueOn" type="date" />
          </div>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          The next AGM is a date you state, not a year we calculate. A club that meets late has
          a committee whose mandate is a real question, and deriving the date would quietly
          assert that every club meets on time (BR86).
        </p>
        <div>
          <button type="submit" disabled={pending}>
            {pending ? 'Opening…' : 'Open this term'}
          </button>
        </div>
      </form>
    </>
  );
}

export function AppointForm({
  termId,
  people,
}: {
  readonly termId: string;
  readonly people: readonly { readonly id: string; readonly label: string }[];
}) {
  const [result, formAction, pending] = useActionState<FormResult, FormData>(
    appointMemberAction,
    IDLE_FORM,
  );

  return (
    <>
      <FormNotice result={result} />
      <form
        action={formAction}
        style={{ display: 'flex', gap: '0.6rem', alignItems: 'end', flexWrap: 'wrap' }}
      >
        <input type="hidden" name="termId" value={termId} />
        <div style={{ flex: '2 1 13rem' }}>
          <label htmlFor={`person-${termId}`}>Person</label>
          <select id={`person-${termId}`} name="personId" defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 9rem' }}>
          <label htmlFor={`position-${termId}`}>Position</label>
          <select id={`position-${termId}`} name="position" defaultValue="committee-member">
            {COMMITTEE_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {POSITION_LABEL[position]}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 8rem' }}>
          <label htmlFor={`elected-${termId}`}>Elected</label>
          <input id={`elected-${termId}`} name="electedOn" type="date" />
        </div>
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? 'Adding…' : 'Add'}
        </button>
      </form>
    </>
  );
}
