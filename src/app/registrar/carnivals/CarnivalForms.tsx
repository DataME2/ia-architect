'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import type { CarnivalEntry } from '../../../domain/carnival/ladder.ts';
import {
  addEntryAction, addFixtureAction, createEventAction, publishAction, recordResultAction,
} from './actions.ts';

export function CreateEventForm() {
  const [result, action, pending] = useActionState(createEventAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <FormNotice result={result} />
      <label><span>Carnival</span><input name="name" required placeholder="Girls United Carnival" /></label>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ flex: '0 1 10rem' }}><span>Starts</span><input type="date" name="startsOn" required /></label>
        <label style={{ flex: '0 1 10rem' }}><span>Ends</span><input type="date" name="endsOn" /></label>
        <label style={{ flex: '1 1 12rem' }}><span>Venue</span><input name="venue" /></label>
      </div>
      <button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create carnival'}</button>
    </form>
  );
}

/**
 * BR140's act, and the screen has to be honest about what it does.
 *
 * "Publish" in most products means "save". Here it means **anyone on the
 * internet with the link can read this** — the only exception to P5 in the
 * product — so the button says so before it is pressed rather than after.
 */
export function PublishForm({
  eventId,
  published,
}: {
  readonly eventId: string;
  readonly published: boolean;
}) {
  const [result, action, pending] = useActionState(publishAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="publish" value={published ? 'no' : 'yes'} />
      <FormNotice result={result} />
      <p className="hint" style={{ margin: 0 }}>
        {published
          ? 'Anyone with the link can read the draw and standings right now, with no account.'
          : 'Nobody outside this club can see this. Publishing makes the draw and standings readable '
            + 'by anyone with the link — team and club results only, and no player’s name.'}
      </p>
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : published ? 'Take it down' : 'Publish to the public'}
      </button>
    </form>
  );
}

export function EntryForm({ eventId }: { readonly eventId: string }) {
  const [result, action, pending] = useActionState(addEntryAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="eventId" value={eventId} />
      <FormNotice result={result} />
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 10rem' }}><span>Club</span><input name="entrantName" required /></label>
        <label style={{ flex: '0 1 8rem' }}><span>Team</span><input name="teamName" required placeholder="U12" /></label>
        <label style={{ flex: '0 1 8rem' }}><span>Age group</span><input name="ageGroup" /></label>
      </div>
      <span className="hint">
        Any club may be entered, including one that does not use this platform — that is what a
        carnival is.
      </span>
      <button type="submit" disabled={pending}>{pending ? 'Entering…' : 'Enter a team'}</button>
    </form>
  );
}

export function FixtureForm({
  eventId,
  entries,
}: {
  readonly eventId: string;
  readonly entries: readonly CarnivalEntry[];
}) {
  const [result, action, pending] = useActionState(addFixtureAction, IDLE_FORM);
  if (entries.length < 2) {
    return <p className="hint" style={{ margin: 0 }}>Enter at least two teams before drawing a fixture.</p>;
  }
  const label = (e: CarnivalEntry) => `${e.entrantName} ${e.teamName}`;
  return (
    <form action={action} className="stack">
      <input type="hidden" name="eventId" value={eventId} />
      <FormNotice result={result} />
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 10rem' }}>
          <span>Home</span>
          <select name="homeEntryId" required>
            {entries.map((e) => <option key={e.id} value={e.id}>{label(e)}</option>)}
          </select>
        </label>
        <label style={{ flex: '1 1 10rem' }}>
          <span>Away</span>
          <select name="awayEntryId" required defaultValue={entries[1]?.id}>
            {entries.map((e) => <option key={e.id} value={e.id}>{label(e)}</option>)}
          </select>
        </label>
        <label style={{ flex: '0 1 9rem' }}><span>Date</span><input type="date" name="playedOn" required /></label>
        <label style={{ flex: '0 1 7rem' }}><span>Kick-off</span><input type="time" name="kickOff" /></label>
        <label style={{ flex: '1 1 8rem' }}><span>Venue</span><input name="venue" /></label>
      </div>
      <button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add to the draw'}</button>
    </form>
  );
}

export function ResultForm({
  fixtureId,
  homeGoals,
  awayGoals,
  status,
}: {
  readonly fixtureId: string;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly status: string;
}) {
  const [result, action, pending] = useActionState(recordResultAction, IDLE_FORM);
  return (
    <form action={action} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
      <input type="hidden" name="fixtureId" value={fixtureId} />
      <input name="homeGoals" inputMode="numeric" defaultValue={homeGoals ?? ''} style={{ width: '3.5rem' }} aria-label="Home goals" />
      <input name="awayGoals" inputMode="numeric" defaultValue={awayGoals ?? ''} style={{ width: '3.5rem' }} aria-label="Away goals" />
      <select name="status" defaultValue={status}>
        <option value="scheduled">To play</option>
        <option value="played">Played</option>
        <option value="cancelled">Cancelled</option>
        <option value="abandoned">Abandoned</option>
      </select>
      <button type="submit" disabled={pending}>{pending ? '…' : 'Save'}</button>
      <FormNotice result={result} />
    </form>
  );
}
