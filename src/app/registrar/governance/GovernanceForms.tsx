'use client';

import { useActionState, useState, type ReactNode } from 'react';

import { IDLE_FORM, type FormResult } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';

import { COMMITTEE_POSITIONS, type CommitteePosition } from '../../../domain/governance/term.ts';
import { accessLabel } from '../../../web/access-view.ts';
import { FUNCTION_KINDS, FUNCTION_LABEL, type AccessState } from '../../../web/appointment-view.ts';
import { POSITION_LABEL, RESOLUTION_CATEGORY_LABEL } from '../../../web/governance-view.ts';
import { displayNameFor, fullLegalName } from '../../../web/queue-view.ts';
import type { Person } from '../../../domain/types.ts';
import {
  appointFunctionAction,
  appointMemberAction,
  confirmAccessAction,
  confirmPositionAction,
  createTermAction,
  editMemberAction,
  enableVoucherProgramAction,
  endFunctionAction,
  recordResolutionAction,
  resignMemberAction,
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
 * Correct a typo in a recorded position or election date, in place. Not how
 * a member changes office mid-term — that stays a resignation plus a new
 * appointment (BR85), so the two facts are two rows rather than one rewritten.
 */
export function EditPositionForm({
  positionId,
  position,
  electedOn,
  onDone,
}: {
  readonly positionId: string;
  readonly position: CommitteePosition;
  readonly electedOn: string | null;
  readonly onDone: () => void;
}) {
  const [result, formAction, pending] = useActionState<FormResult, FormData>(
    editMemberAction,
    IDLE_FORM,
  );

  return (
    <form
      action={formAction}
      style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}
    >
      <input type="hidden" name="positionId" value={positionId} />
      <div style={{ flex: '1 1 9rem' }}>
        <label htmlFor={`edit-position-${positionId}`}>Position</label>
        <select id={`edit-position-${positionId}`} name="position" defaultValue={position}>
          {COMMITTEE_POSITIONS.map((p) => (
            <option key={p} value={p}>
              {POSITION_LABEL[p]}
            </option>
          ))}
        </select>
      </div>
      <div style={{ flex: '1 1 8rem' }}>
        <label htmlFor={`edit-elected-${positionId}`}>Elected</label>
        <input
          id={`edit-elected-${positionId}`}
          name="electedOn"
          type="date"
          defaultValue={electedOn ?? ''}
        />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? '…' : 'Save'}
      </button>
      <button type="button" className="secondary" onClick={onDone}>
        Cancel
      </button>
      <FormNotice result={result} />
    </form>
  );
}

/**
 * What an appointment's access looks like right now, and the one control
 * that moves it forward (BR153). Only shown as a button to an admin or the
 * current President; the database refuses anyone else regardless.
 */
export function AccessCell({
  target,
  state,
  accessRole,
  mayConfirm,
  current,
}: {
  readonly target: { readonly positionId: string } | { readonly functionId: string };
  readonly state: AccessState;
  readonly accessRole: string | null;
  readonly mayConfirm: boolean;
  readonly current: boolean;
}) {
  const [result, formAction, pending] = useActionState<FormResult, FormData>(
    confirmAccessAction,
    IDLE_FORM,
  );

  if (accessRole === null) return <span className="hint">Carries no access</span>;

  return (
    <div className="stack" style={{ gap: '0.3rem' }}>
      <span>
        <strong>{accessLabel(accessRole)}</strong>{' '}
        {state.kind === 'active' && <span className="pill pill-ok">active since {state.since}</span>}
        {state.kind === 'link-sent' && (
          <span className="pill pill-warn" title={`Sent to ${state.to}`}>
            link sent {state.on}
          </span>
        )}
        {state.kind === 'not-confirmed' && <span className="pill">not confirmed</span>}
      </span>
      {mayConfirm && current && state.kind !== 'active' && (
        <form action={formAction}>
          {'positionId' in target ? (
            <input type="hidden" name="positionId" value={target.positionId} />
          ) : (
            <input type="hidden" name="functionId" value={target.functionId} />
          )}
          <button
            type="submit"
            className={state.kind === 'link-sent' ? 'secondary' : undefined}
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
            disabled={pending}
          >
            {pending ? '…' : state.kind === 'link-sent' ? 'Resend link' : 'Confirm & send access link'}
          </button>
        </form>
      )}
      <FormNotice result={result} />
    </div>
  );
}

/** Appoint somebody to a club function (scope 68). Appointed, not elected: no term. */
export function AppointFunctionForm({
  people,
}: {
  readonly people: readonly { readonly id: string; readonly label: string }[];
}) {
  const [result, formAction, pending] = useActionState<FormResult, FormData>(
    appointFunctionAction,
    IDLE_FORM,
  );

  return (
    <>
      <FormNotice result={result} />
      <form
        action={formAction}
        style={{ display: 'flex', gap: '0.6rem', alignItems: 'end', flexWrap: 'wrap' }}
      >
        <div style={{ flex: '2 1 13rem' }}>
          <label htmlFor="function-person">Person</label>
          <select id="function-person" name="personId" defaultValue="">
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
        <div style={{ flex: '1 1 11rem' }}>
          <label htmlFor="function-kind">Function</label>
          <select id="function-kind" name="kind" defaultValue="it_manager">
            {FUNCTION_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {FUNCTION_LABEL[kind]}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 8rem' }}>
          <label htmlFor="function-starts">Starts</label>
          <input id="function-starts" name="startsOn" type="date" />
        </div>
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? 'Adding…' : 'Appoint'}
        </button>
      </form>
    </>
  );
}

/** End a function today. The access it carried stays until an admin removes it (BR154). */
export function EndFunctionButton({ appointmentId }: { readonly appointmentId: string }) {
  return (
    <form action={endFunctionAction}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <button
        type="submit"
        className="secondary"
        style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
      >
        Ended
      </button>
    </form>
  );
}

/** One committee-position row, with the correction form toggled behind "Edit". */
export function MemberRow({
  positionId,
  position,
  electedOn,
  person,
  access,
  confirmation,
}: {
  readonly positionId: string;
  readonly position: CommitteePosition;
  readonly electedOn: string | null;
  readonly person: Person | undefined;
  readonly access: ReactNode;
  /** BR166/BR167: where its confirmation stands. */
  readonly confirmation: ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr>
        <td colSpan={6}>
          <EditPositionForm
            positionId={positionId}
            position={position}
            electedOn={electedOn}
            onDone={() => setEditing(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{POSITION_LABEL[position]}</td>
      <td>
        {person === undefined ? (
          <span className="hint">Unknown person</span>
        ) : (
          <>
            <p className="name" style={{ margin: 0 }}>
              {displayNameFor(person)}
            </p>
            <p className="legal-name" style={{ margin: 0 }}>
              {fullLegalName(person)}
            </p>
          </>
        )}
      </td>
      <td>{electedOn ?? <span className="hint">&mdash;</span>}</td>
      <td>{confirmation}</td>
      <td>{access}</td>
      <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="secondary"
          style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
        <form action={resignMemberAction}>
          <input type="hidden" name="positionId" value={positionId} />
          <button
            type="submit"
            className="secondary"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
          >
            Resigned
          </button>
        </form>
      </td>
    </tr>
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
              <option value="agm_election">{RESOLUTION_CATEGORY_LABEL.agm_election}</option>
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

/** The confirmed President, Treasurer or Secretary confirms a position (BR167). */
export function ConfirmPositionButton({ positionId }: { readonly positionId: string }) {
  const [state, formAction, pending] = useActionState(confirmPositionAction, IDLE_FORM);
  return (
    <form action={formAction} style={{ marginTop: '0.3rem' }}>
      <input type="hidden" name="positionId" value={positionId} />
      <button type="submit" className="secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }} disabled={pending}>
        {pending ? '…' : 'Confirm'}
      </button>
      <FormNotice result={state} />
    </form>
  );
}
