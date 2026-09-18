/**
 * What the "answer for Saturday" screens decide, as pure functions (BR62,
 * BR63). `designation-answer.ts`'s shape, moved from an appointment to a
 * fixture: who may answer is the database's question
 * (`app_may_answer_designation`, reused by migration 0054), and a second
 * copy of that decision here would be the drift 0045's own comment warns
 * against. What is left for a screen is parsing the form and choosing a
 * colour — never who is allowed to answer.
 */

export type ParticipationStatus = 'available' | 'not_available';

export interface ParticipationResponse {
  readonly status: ParticipationStatus;
  readonly reason: string | null;
}

export type ParsedParticipationAnswer =
  | { readonly ok: true; readonly personId: string; readonly fixtureId: string; readonly status: ParticipationStatus; readonly reason: string | null }
  | { readonly ok: false; readonly message: string };

/** BR62: a decline carries its reason; an acceptance carries none to write. */
export function parseParticipationAnswer(fields: {
  readonly personId?: string | null;
  readonly fixtureId?: string | null;
  readonly answer?: string | null;
  readonly reason?: string | null;
}): ParsedParticipationAnswer {
  const personId = (fields.personId ?? '').trim();
  const fixtureId = (fields.fixtureId ?? '').trim();
  if (personId === '' || fixtureId === '') return { ok: false, message: 'Nothing to answer.' };

  const answer = (fields.answer ?? '').trim();
  if (answer !== 'available' && answer !== 'not_available') {
    return { ok: false, message: 'Available or not available?' };
  }

  const reason = (fields.reason ?? '').trim();
  if (answer === 'not_available' && reason === '') {
    return { ok: false, message: 'Not available needs a brief reason (BR62) — a sentence is enough.' };
  }

  return { ok: true, personId, fixtureId, status: answer, reason: reason === '' ? null : reason };
}

/** The banner a coach reads at a glance — green, red, or "hasn't said". */
export function participationBanner(response: ParticipationResponse | null): {
  readonly label: string;
  readonly className: string;
} {
  if (response === null) return { label: 'No answer yet', className: 'pill pill-warn' };
  return response.status === 'available'
    ? { label: 'Available', className: 'pill pill-ok' }
    : { label: 'Not available', className: 'pill pill-stop' };
}

/**
 * Whether a household card needs the guardian's attention — an upcoming
 * fixture this child has not yet been answered for. Purely a read-time
 * flag, not a stored notification: scope 58's inbox is the place for
 * anything that needs to persist or be dismissed, and this is neither.
 */
export function needsAvailabilityAnswer(hasUpcomingFixture: boolean, alreadyAnswered: boolean): boolean {
  return hasUpcomingFixture && !alreadyAnswered;
}
