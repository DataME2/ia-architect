'use client';

import { useActionState, useState } from 'react';

import { IDLE_FORM, type FormResult } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';

import type { SeasonRow } from '../../../data/schema.ts';
import { parseDocumentChecklist } from '../../../web/people-view.ts';
import { saveRequirementsAction } from './actions.ts';

/**
 * What a season requires of each registration (BR2). Since scope 130 the fee
 * is not here: what a registration costs is the club's fee schedule, under
 * Money, set by the admin and the treasurer (BR195, BR196).
 *
 * As the list is typed, the family's own checklist is drawn beside it on a
 * card, each document ticking in as it appears, so the registrar sees the
 * words a family will be asked for.
 */
export function RequirementsForm({ season }: { readonly season: SeasonRow }) {
  const [result, formAction, pending] = useActionState<FormResult, FormData>(
    saveRequirementsAction,
    IDLE_FORM,
  );
  const [text, setText] = useState(season.required_document_types.join('\n'));
  const checklist = parseDocumentChecklist(text);

  return (
    <>
      <FormNotice result={result} />

      <form action={formAction} className="requirements-grid">
        <input type="hidden" name="seasonId" value={season.id} />

        <div className="stack">
          <div>
            <label htmlFor="documents">Required documents, one per line</label>
            <textarea
              id="documents"
              name="documents"
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Birth certificate\nProof of address'}
            />
            <p className="hint">
              BR2 names these back to the family when one is missing, so write what they would
              recognise — &ldquo;Birth certificate&rdquo;, not &ldquo;doc_1&rdquo;. Blank lines
              and repeats are dropped.
            </p>
          </div>

          <div>
            <button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="paper checklist-preview" aria-live="polite">
          <p className="dash-metric-label">What a family will be asked for</p>
          {checklist.length === 0 ? (
            <p className="hint" style={{ margin: 0 }}>
              Nothing yet. With no documents required, BR2 has nothing to check.
            </p>
          ) : (
            <ol className="checklist-items">
              {checklist.map((doc, i) => (
                <li key={doc} style={{ animationDelay: `${i * 60}ms` }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" pathLength={1} />
                  </svg>
                  {doc}
                </li>
              ))}
            </ol>
          )}
        </div>
      </form>
    </>
  );
}
