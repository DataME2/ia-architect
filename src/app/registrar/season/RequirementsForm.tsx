'use client';

import { useActionState } from 'react';

import { IDLE_FORM, type FormResult } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';

import type { SeasonRow } from '../../../data/schema.ts';
import { formatCents } from '../../../web/money.ts';
import { saveRequirementsAction } from './actions.ts';

export function RequirementsForm({ season }: { readonly season: SeasonRow }) {
  const [result, formAction, pending] = useActionState<FormResult, FormData>(
    saveRequirementsAction,
    IDLE_FORM,
  );

  return (
    <>
      <FormNotice result={result} />

      <form action={formAction} className="stack">
        <input type="hidden" name="seasonId" value={season.id} />

        <div>
          <label htmlFor="documents">Required documents, one per line</label>
          <textarea
            id="documents"
            name="documents"
            rows={6}
            defaultValue={season.required_document_types.join('\n')}
            placeholder={'Birth certificate\nProof of address'}
          />
          <p className="hint">
            BR2 names these back to the family when one is missing, so write what they would
            recognise — &ldquo;Birth certificate&rdquo;, not &ldquo;doc_1&rdquo;. Blank lines
            and repeats are dropped.
          </p>
        </div>

        <div>
          <label htmlFor="fee">Registration fee</label>
          <input
            id="fee"
            name="fee"
            defaultValue={formatCents(season.registration_fee_cents)}
            inputMode="decimal"
          />
          <p className="hint">
            What a registration in this season opens owing (BR3). Dollars and cents.
          </p>
        </div>

        <div>
          <button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </>
  );
}
