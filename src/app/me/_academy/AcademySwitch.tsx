'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { setAcademyTeamAction } from './actions.ts';

/** BR184: a Technical Lead marks a team as academy, or unmarks it. */
export function AcademySwitch({
  teamId,
  teamName,
  academy,
}: {
  readonly teamId: string;
  readonly teamName: string;
  readonly academy: boolean;
}) {
  const [state, formAction, pending] = useActionState(setAcademyTeamAction, IDLE_FORM);
  return (
    <form action={formAction} className="academy-switch">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="academy" value={academy ? 'false' : 'true'} />
      <span className={academy ? 'pill pill-ok' : 'pill'}>{academy ? 'Academy team' : 'Not an academy team'}</span>
      <button type="submit" className="secondary" disabled={pending} aria-label={`${academy ? 'Unmark' : 'Mark'} ${teamName} as an academy team`}>
        {pending ? 'Working…' : academy ? 'Unmark' : 'Mark as academy'}
      </button>
      <FormNotice result={state} />
    </form>
  );
}
