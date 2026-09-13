'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../web/form-result.ts';
import { FormNotice } from '../registrar/_components/FormNotice.tsx';
import type { Association } from '../../data/competitions.ts';
import type { ClassificationLevel } from '../../domain/competition/types.ts';
import { addAssociationAction, addCompetitionAction, addLevelAction } from './actions.ts';

/**
 * Filling the catalogue (BR134, scope 38).
 *
 * It ships **empty**, deliberately: seeding it with a guessed Football
 * Queensland pathway would refuse the real levels, which is precisely why
 * `referee_classification.level` was free text in the first place. A wrong
 * minimum in shared reference data is worse than none, because BR8 now acts
 * on it.
 */
export function AssociationForm() {
  const [result, action, pending] = useActionState(addAssociationAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <FormNotice result={result} />
      <label><span>Association</span><input name="name" required placeholder="Football Queensland" /></label>
      <label><span>Jurisdiction</span><input name="jurisdiction" required placeholder="AU-QLD" /></label>
      <button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add association'}</button>
    </form>
  );
}

export function LevelForm({ associations }: { readonly associations: readonly Association[] }) {
  const [result, action, pending] = useActionState(addLevelAction, IDLE_FORM);
  if (associations.length === 0) {
    return <p className="hint" style={{ margin: 0 }}>Add an association first — a level belongs to one (BR135).</p>;
  }
  return (
    <form action={action} className="stack">
      <FormNotice result={result} />
      <label>
        <span>Association</span>
        <select name="associationId" required>
          {associations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label><span>Level</span><input name="name" required placeholder="Level 4" /></label>
      <label>
        <span>Rank</span>
        <input type="number" name="rank" required min={0} step={1} placeholder="40" />
        <span className="hint">
          Higher is more senior, and comparable only within this association (BR135). <strong>This
          is the one field here where a typo changes an eligibility decision</strong> — two levels
          sharing a rank compare as equal.
        </span>
      </label>
      <button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add level'}</button>
    </form>
  );
}

export function CompetitionForm({
  associations,
  levels,
}: {
  readonly associations: readonly Association[];
  readonly levels: readonly ClassificationLevel[];
}) {
  const [result, action, pending] = useActionState(addCompetitionAction, IDLE_FORM);
  if (associations.length === 0) {
    return <p className="hint" style={{ margin: 0 }}>Add an association first.</p>;
  }
  return (
    <form action={action} className="stack">
      <FormNotice result={result} />
      <label>
        <span>Association</span>
        <select name="associationId" required>
          {associations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label><span>Competition</span><input name="name" required placeholder="Capital League 1" /></label>
      <label><span>Tier</span><input name="tier" placeholder="Senior men" /></label>
      <label><span>Playing format</span><input name="playingFormat" placeholder="11-a-side" /></label>
      <label>
        <span>Minimum classification (BR8)</span>
        <select name="minimumClassificationId" defaultValue="">
          <option value="">No minimum stated</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>{l.name} (rank {l.rank})</option>
          ))}
        </select>
        <span className="hint">
          The database refuses a minimum from a different association than the competition (BR135).
          Leave it unset and BR8 will have nothing to compare against, which is an honest state for
          a competition that states no floor.
        </span>
      </label>
      <button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add competition'}</button>
    </form>
  );
}
