'use client';

import { useActionState } from 'react';

import { TEAM_ROLES } from '../../../domain/teams/types.ts';
import { TEAM_ROLE_LABEL } from '../../../web/team-view.ts';
import { addMemberAction, createTeamAction, recordClearanceAction } from './actions.ts';

interface PersonOption {
  readonly id: string;
  readonly label: string;
}

function Problem({ message }: { readonly message: string | null }) {
  return message === null ? null : (
    <div className="errors">
      <strong>{message}</strong>
    </div>
  );
}

export function NewTeamForm({ seasonId }: { readonly seasonId: string }) {
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    createTeamAction,
    null,
  );

  return (
    <>
      <Problem message={error} />
      <form
        action={formAction}
        style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}
      >
        <input type="hidden" name="seasonId" value={seasonId} />
        <div style={{ flex: '1 1 12rem' }}>
          <label htmlFor="name">Team name</label>
          <input id="name" name="name" placeholder="Under 8 Blue" />
        </div>
        <div style={{ flex: '1 1 8rem' }}>
          <label htmlFor="ageGroup">Age group</label>
          <input id="ageGroup" name="ageGroup" placeholder="U8" />
        </div>
        <button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create team'}
        </button>
      </form>
    </>
  );
}

export function AddMemberForm({
  teamId,
  people,
}: {
  readonly teamId: string;
  readonly people: readonly PersonOption[];
}) {
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    addMemberAction,
    null,
  );

  return (
    <>
      <Problem message={error} />
      <form
        action={formAction}
        style={{ display: 'flex', gap: '0.6rem', alignItems: 'end', flexWrap: 'wrap' }}
      >
        <input type="hidden" name="teamId" value={teamId} />
        <div style={{ flex: '2 1 14rem' }}>
          <label htmlFor={`person-${teamId}`}>Person</label>
          <select id={`person-${teamId}`} name="personId" defaultValue="">
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
          <label htmlFor={`role-${teamId}`}>Role</label>
          <select id={`role-${teamId}`} name="role" defaultValue="player">
            {TEAM_ROLES.map((role) => (
              <option key={role} value={role}>
                {TEAM_ROLE_LABEL[role]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? 'Adding…' : 'Add'}
        </button>
      </form>
      <p className="hint">
        Any role but <strong>Player</strong> puts an adult in front of children, so the database
        refuses it without a verified Working with Children Check that covers the end of this
        season &mdash; no card, no start (BR19, BR54).
      </p>
    </>
  );
}

export function RecordClearanceForm({ people }: { readonly people: readonly PersonOption[] }) {
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    recordClearanceAction,
    null,
  );

  return (
    <>
      <Problem message={error} />
      <form action={formAction} className="stack">
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 13rem' }}>
            <label htmlFor="clearance-person">Person</label>
            <select id="clearance-person" name="personId" defaultValue="">
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
          <div style={{ flex: '1 1 7rem' }}>
            <label htmlFor="kind">Type</label>
            <input id="kind" name="kind" defaultValue="WWCC" />
          </div>
          <div style={{ flex: '1 1 9rem' }}>
            <label htmlFor="identifier">Card number</label>
            <input id="identifier" name="identifier" autoComplete="off" />
          </div>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="issuedOn">Issued</label>
            <input id="issuedOn" name="issuedOn" type="date" />
          </div>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="expiresOn">Expires</label>
            <input id="expiresOn" name="expiresOn" type="date" />
          </div>
        </div>

        <div className="check">
          <input id="verified" name="verified" type="checkbox" />
          <label htmlFor="verified">
            I have checked this number against the state government&rsquo;s portal
          </label>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          Deliberately a separate tick. Holding a card number is not verification, and an
          unverified record clears nobody &mdash; the person still cannot be added as an
          official (BR19).
        </p>

        <div>
          <button type="submit" disabled={pending}>
            {pending ? 'Recording…' : 'Record clearance'}
          </button>
        </div>
      </form>
    </>
  );
}
