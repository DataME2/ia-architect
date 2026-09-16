'use client';

import { useActionState } from 'react';

import { IDLE_FORM, type FormResult } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';

import { COMMITTEE_POSITIONS } from '../../../domain/governance/term.ts';
import { POSITION_LABEL, RESOLUTION_CATEGORY_LABEL } from '../../../web/governance-view.ts';
import {
  appointMemberAction,
  createTermAction,
  enableVoucherProgramAction,
  recordResolutionAction,
} from './actions.ts';

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

/**
 * BR123's form: record what the Committee decided.
 *
 * `category` defaults to General — Voucher Program is chosen deliberately,
 * because it is the one category a later screen (`EnableVoucherProgramForm`)
 * reads back by that name, not by parsing what was typed in `summary`.
 */
export function RecordResolutionForm({
  termId,
  people,
}: {
  readonly termId: string;
  readonly people: readonly { readonly id: string; readonly label: string }[];
}) {
  const [result, formAction, pending] = useActionState<FormResult, FormData>(
    recordResolutionAction,
    IDLE_FORM,
  );

  return (
    <>
      <FormNotice result={result} />
      <form action={formAction} className="stack">
        <input type="hidden" name="termId" value={termId} />
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor={`decided-${termId}`}>Decided on</label>
            <input id={`decided-${termId}`} name="decidedOn" type="date" />
          </div>
          <div style={{ flex: '1 1 10rem' }}>
            <label htmlFor={`category-${termId}`}>Category</label>
            <select id={`category-${termId}`} name="category" defaultValue="general">
              <option value="general">{RESOLUTION_CATEGORY_LABEL.general}</option>
              <option value="voucher_program">{RESOLUTION_CATEGORY_LABEL.voucher_program}</option>
            </select>
          </div>
          <div style={{ flex: '2 1 13rem' }}>
            <label htmlFor={`mover-${termId}`}>Moved by</label>
            <select id={`mover-${termId}`} name="movedByPersonId" defaultValue="">
              <option value="">Not named</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor={`summary-${termId}`}>What was decided</label>
          <input
            id={`summary-${termId}`}
            name="summary"
            type="text"
            placeholder="Approve Play On! as a Voucher Program."
          />
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          Recorded, not editable afterwards — a corrected decision is a new resolution, the same
          way a corrected payment is a new receipt.
        </p>
        <div>
          <button type="submit" disabled={pending}>
            {pending ? 'Recording…' : 'Record resolution'}
          </button>
        </div>
      </form>
    </>
  );
}

/**
 * BR21's form: name a Voucher Program and the resolution that approved it.
 *
 * Only resolutions already recorded with `category: 'voucher_program'` are
 * offered — the database refuses any other, but offering only what would be
 * accepted means the treasurer never learns that the hard way.
 */
export function EnableVoucherProgramForm({
  voucherResolutions,
}: {
  readonly voucherResolutions: readonly { readonly id: string; readonly label: string }[];
}) {
  const [result, formAction, pending] = useActionState<FormResult, FormData>(
    enableVoucherProgramAction,
    IDLE_FORM,
  );

  if (voucherResolutions.length === 0) {
    return (
      <p className="hint">
        No resolution has been recorded with the Voucher Program category yet — record one
        above before a program can be enabled.
      </p>
    );
  }

  return (
    <>
      <FormNotice result={result} />
      <form
        action={formAction}
        style={{ display: 'flex', gap: '0.6rem', alignItems: 'end', flexWrap: 'wrap' }}
      >
        <div style={{ flex: '1 1 10rem' }}>
          <label htmlFor="program">Voucher Program</label>
          <input id="program" name="program" type="text" placeholder="Play On!" />
        </div>
        <div style={{ flex: '2 1 16rem' }}>
          <label htmlFor="resolutionId">Approved by</label>
          <select id="resolutionId" name="resolutionId" defaultValue="">
            <option value="" disabled>
              Choose the resolution…
            </option>
            {voucherResolutions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={pending}>
          {pending ? 'Enabling…' : 'Enable this program'}
        </button>
      </form>
    </>
  );
}
