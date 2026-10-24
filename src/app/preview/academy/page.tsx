import { notFound } from 'next/navigation';

import { minutesByPosition, nightLabel, summariseNights } from '../../../web/academy.ts';
import { GameTimeBars } from '../../me/_academy/GameTimeBars.tsx';
import { GameTimeEntry } from '../../me/_academy/GameTimeEntry.tsx';
import { AttendanceSheet } from '../../me/_academy/AttendanceSheet.tsx';
import { TrainingNightForm } from '../../me/_academy/TrainingNightForm.tsx';
import { ComingSoon, Panel, WorkspaceHead } from '../../me/_workspaces/shared.tsx';

/**
 * A design preview of the academy panels (scope 112), on sample data.
 *
 * **Development only**: a production build answers 404. The shapes are the
 * ones `src/data/academy.ts` returns and go through the same decisions.
 * Saving here reaches the real actions, which the database refuses for a
 * sample club.
 */

const TODAY = '2026-10-22';
const NAMES = new Map([
  ['p1', 'Liam Nguyen'],
  ['p2', 'Jai Patel'],
  ['p3', 'Marco Rossi'],
  ['p4', 'Kai Brown'],
  ['p5', 'Tom Silva'],
]);
const NIGHTS = [
  { id: 'n1', teamId: 't1', heldOn: '2026-10-20', startsAt: '17:30', endsAt: '19:00', venue: 'Main pitch', cancelled: false },
  { id: 'n2', teamId: 't1', heldOn: '2026-10-22', startsAt: '17:30', endsAt: '19:00', venue: 'Main pitch', cancelled: false },
];
const ANSWERS = [
  { sessionId: 'n1', personId: 'p1', available: true, reason: null },
  { sessionId: 'n1', personId: 'p2', available: true, reason: null },
  { sessionId: 'n1', personId: 'p5', available: false, reason: 'Sore ankle after Saturday' },
  { sessionId: 'n2', personId: 'p1', available: true, reason: null },
  { sessionId: 'n2', personId: 'p3', available: false, reason: 'School camp' },
];
const MARKS = [
  { sessionId: 'n1', personId: 'p1', mark: 'present' as const, reason: null },
  { sessionId: 'n1', personId: 'p2', mark: 'late' as const, reason: null },
  { sessionId: 'n1', personId: 'p5', mark: 'absent' as const, reason: 'Ankle' },
];
const MINUTES = minutesByPosition([
  { personId: 'p1', minutes: 540, positions: [{ position: 'midfielder', minutes: 420 }, { position: 'forward', minutes: 120 }] },
  { personId: 'p2', minutes: 495, positions: [{ position: 'defender', minutes: 495 }] },
  { personId: 'p3', minutes: 410, positions: [{ position: 'midfielder', minutes: 300 }] },
  { personId: 'p4', minutes: 300, positions: [{ position: 'goalkeeper', minutes: 300 }] },
  { personId: 'p5', minutes: 180, positions: [] },
]);

export default function AcademyPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  const summary = summariseNights({
    nights: NIGHTS,
    playerIds: [...NAMES.keys()],
    answers: ANSWERS,
    marks: MARKS,
    today: TODAY,
  });
  const players = [...NAMES.entries()].map(([personId, name]) => ({
    personId,
    name,
    started: personId !== 'p5',
    positions: {},
  }));
  return (
    <main className="work-body" id="main" style={{ padding: 'var(--space-5)' }}>
      <p className="hint" style={{ marginTop: 0 }}>
        Design preview on sample data (development only). Today is {TODAY} here.
      </p>
      <WorkspaceHead title="Academy">U15 Boys, North Star FC. Sample players.</WorkspaceHead>
      <div className="cols">
        <div className="stack">
          <Panel title="Training this week" meta="U15 BOYS">
            <p className="hint" style={{ marginTop: 0 }}>
              {summary.nights} nights · said yes {summary.available} · said no {summary.notAvailable} · no answer{' '}
              {summary.noAnswer} · trained {summary.trained} · late {summary.late} · did not train {summary.absent} · not
              marked {summary.unmarked}
            </p>
            {NIGHTS.map((n) => (
              <details key={n.id} className="td-team" open>
                <summary>{nightLabel(n)}</summary>
                <AttendanceSheet
                  clubId="preview"
                  sessionId={n.id}
                  held={n.heldOn <= TODAY}
                  rows={[...NAMES.entries()].map(([personId, name]) => {
                    const a = ANSWERS.find((x) => x.sessionId === n.id && x.personId === personId);
                    const m = MARKS.find((x) => x.sessionId === n.id && x.personId === personId);
                    return {
                      personId,
                      name,
                      answer: a === undefined ? null : { available: a.available, reason: a.reason },
                      mark: m === undefined ? null : { mark: m.mark, reason: m.reason },
                    };
                  })}
                />
              </details>
            ))}
          </Panel>
          <Panel title="Add a training night">
            <TrainingNightForm clubId="preview" teams={[{ id: 't1', name: 'U15 Boys' }]} />
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Game time by position" meta="2026">
            <GameTimeBars rows={MINUTES} nameOf={(id) => NAMES.get(id) ?? id} />
          </Panel>
          <ComingSoon title="Team chat" waitsOn="the club's safeguarding policy (question #111)">
            A chat for each team, with guardians included for players under 18. Until the club decides how adults
            message children, team notices are planned instead.
          </ComingSoon>
        </div>
      </div>
      <h2 className="academy-title">Game time: U15 Boys v Eastern Lions</h2>
      <GameTimeEntry clubId="preview" fixtureId="preview-fixture" players={players} />
    </main>
  );
}
