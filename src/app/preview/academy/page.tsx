import { notFound } from 'next/navigation';

import { awayReasons, minutesByPosition, nightLabel, summariseNights, type Range } from '../../../web/academy.ts';
import {
  entriesMade,
  followUps,
  sessionsByDay,
  teamAverages,
  type SessionEntry,
  type WellbeingEntry,
} from '../../../web/check-in.ts';
import { AcademyView } from '../../me/_academy/AcademyTab.tsx';
import { AttendanceSheet } from '../../me/_academy/AttendanceSheet.tsx';
import { GameTimeEntry } from '../../me/_academy/GameTimeEntry.tsx';

/**
 * A design preview of the Technical Director's Academy tab (scopes 112 and
 * 113), on sample data, through the same decisions the real tab uses.
 *
 * **Development only**: a production build answers 404. Saving here reaches
 * the real actions, which the database refuses for a sample club.
 */

const TODAY = '2026-10-22';
const FROM = '2026-10-19';
const TO = '2026-10-25';
const TEAMS = [
  { id: 't1', name: 'U15 Boys' },
  { id: 't2', name: 'U14 Girls' },
];
const NAMES = new Map([
  ['p1', 'Liam Nguyen'],
  ['p2', 'Jai Patel'],
  ['p3', 'Marco Rossi'],
  ['p4', 'Kai Brown'],
  ['p5', 'Tom Silva'],
  ['g1', 'Aroha Moana'],
  ['g2', 'Isla Chen'],
  ['g3', 'Maya Singh'],
]);
const ROSTER: Record<string, readonly string[]> = { t1: ['p1', 'p2', 'p3', 'p4', 'p5'], t2: ['g1', 'g2', 'g3'] };
const NIGHTS = [
  { id: 'n1', teamId: 't1', heldOn: '2026-10-20', startsAt: '17:30', endsAt: '19:00', venue: 'Main pitch', cancelled: false },
  { id: 'n2', teamId: 't1', heldOn: '2026-10-22', startsAt: '17:30', endsAt: '19:00', venue: 'Main pitch', cancelled: false },
  { id: 'n3', teamId: 't2', heldOn: '2026-10-21', startsAt: '17:00', endsAt: '18:30', venue: 'Field 2', cancelled: false },
  { id: 'n4', teamId: 't2', heldOn: '2026-10-23', startsAt: '17:00', endsAt: '18:30', venue: 'Field 2', cancelled: false },
];
const ANSWERS = [
  { sessionId: 'n1', personId: 'p1', available: true, reason: null },
  { sessionId: 'n1', personId: 'p5', available: false, reason: 'Sore ankle' },
  { sessionId: 'n2', personId: 'p3', available: false, reason: 'School camp' },
  { sessionId: 'n3', personId: 'g2', available: false, reason: 'School camp' },
  { sessionId: 'n4', personId: 'g1', available: true, reason: null },
];
const MARKS = [
  { sessionId: 'n1', personId: 'p1', mark: 'present' as const, reason: null },
  { sessionId: 'n1', personId: 'p2', mark: 'late' as const, reason: null },
  { sessionId: 'n1', personId: 'p3', mark: 'present' as const, reason: null },
  { sessionId: 'n1', personId: 'p4', mark: 'present' as const, reason: null },
  { sessionId: 'n1', personId: 'p5', mark: 'absent' as const, reason: 'Injured' },
  { sessionId: 'n3', personId: 'g1', mark: 'present' as const, reason: null },
  { sessionId: 'n3', personId: 'g2', mark: 'absent' as const, reason: null },
  { sessionId: 'n3', personId: 'g3', mark: 'present' as const, reason: null },
];
const day = (personId: string, on: string, s: Partial<WellbeingEntry> = {}): WellbeingEntry => ({
  personId,
  on,
  motivation: 7,
  mood: 7,
  sleep_quality: 6,
  stress: 4,
  soreness: 5,
  ...s,
});
const WELLBEING = [
  day('p1', '2026-10-19', { motivation: 8 }),
  day('p1', '2026-10-20'),
  day('p1', '2026-10-21', { mood: 8 }),
  day('p1', '2026-10-22'),
  day('p2', '2026-10-20', { sleep_quality: 7 }),
  day('p2', '2026-10-22', { stress: 3 }),
  day('p5', '2026-10-21', { soreness: 9 }),
  day('p5', '2026-10-22', { soreness: 9, mood: 5 }),
  day('g1', '2026-10-21', { motivation: 9 }),
  day('g1', '2026-10-22', { sleep_quality: 2 }),
  day('g3', '2026-10-22'),
];
const SESSIONS: SessionEntry[] = [
  { id: 's1', personId: 'p1', on: '2026-10-20', kind: 'team_training', rpe: 7 },
  { id: 's2', personId: 'p2', on: '2026-10-20', kind: 'team_training', rpe: 6 },
  { id: 's3', personId: 'p1', on: '2026-10-21', kind: 'gym', rpe: 5 },
  { id: 's4', personId: 'g1', on: '2026-10-21', kind: 'team_training', rpe: 8 },
  { id: 's5', personId: 'g3', on: '2026-10-21', kind: 'other_sport', rpe: 4 },
  { id: 's6', personId: 'p1', on: '2026-10-22', kind: 'individual_training', rpe: 3 },
];
const ASKED = [
  { personId: 'p1', consentedOn: '2026-10-01' },
  { personId: 'p2', consentedOn: '2026-10-01' },
  { personId: 'p5', consentedOn: '2026-10-01' },
  { personId: 'p3', consentedOn: null },
  { personId: 'g1', consentedOn: '2026-10-03' },
  { personId: 'g3', consentedOn: '2026-10-21' },
];
const FIXTURES = TEAMS.map((t, i) => [
  { id: `f${i}a`, playedOn: '2026-10-18', opponent: 'Eastern Lions', homeAway: 'home', venue: null, competition: null, status: 'played' },
  { id: `f${i}b`, playedOn: '2026-10-25', opponent: 'Rival United', homeAway: 'away', venue: null, competition: null, status: 'scheduled' },
]);
const MINUTES = [
  minutesByPosition([
    { personId: 'p1', minutes: 540, positions: [{ position: 'midfielder', minutes: 420 }, { position: 'forward', minutes: 120 }] },
    { personId: 'p2', minutes: 495, positions: [{ position: 'defender', minutes: 495 }] },
    { personId: 'p3', minutes: 410, positions: [{ position: 'midfielder', minutes: 300 }] },
    { personId: 'p4', minutes: 300, positions: [{ position: 'goalkeeper', minutes: 300 }] },
    { personId: 'p5', minutes: 180, positions: [] },
  ]),
  minutesByPosition([{ personId: 'g1', minutes: 360, positions: [{ position: 'forward', minutes: 360 }] }]),
];

export default async function AcademyPreview({ searchParams }: { readonly searchParams: Promise<{ readonly range?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const range: Range = (await searchParams).range === 'day' ? 'day' : 'week';
  const from = range === 'day' ? TODAY : FROM;
  const to = range === 'day' ? TODAY : TO;
  const nights = NIGHTS.filter((n) => n.heldOn >= from && n.heldOn <= to);
  const training = TEAMS.map((t) =>
    summariseNights({ nights: nights.filter((n) => n.teamId === t.id), playerIds: ROSTER[t.id] ?? [], answers: ANSWERS, marks: MARKS, today: TODAY }),
  );
  const wellbeing = WELLBEING.filter((e) => e.on >= from && e.on <= to);
  const sessions = SESSIONS.filter((s) => s.on >= from && s.on <= to);
  const made = entriesMade({ players: ASKED, wellbeing, sessions, from, to, today: TODAY });
  const calendar = nights.map((n) => ({ on: n.heldOn, what: `${TEAMS.find((t) => t.id === n.teamId)?.name} training`, when: nightLabel(n).split(' · ')[1] ?? '' }));

  return (
    <main className="work-body" id="main" style={{ padding: 'var(--space-5)' }}>
      <p className="hint" style={{ marginTop: 0 }}>
        Design preview on sample data (development only). Today is {TODAY} here.
      </p>
      <header className="td-head">
        <p className="mono hint">North Star FC · 2026 · WEEK 43 · 19–25 OCT</p>
        <h1>Technical Director</h1>
        <nav className="td-tabs" aria-label="Technical Director">
          <a href="/preview/academy" aria-current="page">
            Academy
          </a>
          <a href="/preview/academy">Squads</a>
          <a href="/preview/academy">Corrections</a>
          <a href="/preview/academy">Player activity</a>
        </nav>
      </header>
      <AcademyView
        clubId="preview"
        seasonName="2026"
        today={TODAY}
        range={range}
        hrefFor={(p) => `/preview/academy?range=${p.range ?? range}`}
        anyMarked
        academy={TEAMS}
        chosen={null}
        shown={TEAMS}
        training={training}
        reasons={awayReasons({ nights, answers: ANSWERS, marks: MARKS })}
        attended={training.reduce((n, s) => n + s.trained + s.late, 0)}
        expected={training.reduce((n, s) => n + s.expected, 0)}
        playedCount={range === 'day' ? 0 : 2}
        positionedCount={range === 'day' ? 0 : 1}
        askedCount={ASKED.length}
        made={made}
        checkedIn={made.reduce((n, m) => n + m.checkedIn, 0)}
        daysAsked={made.reduce((n, m) => n + m.asked, 0)}
        averages={teamAverages(wellbeing, from, to)}
        follow={followUps(wellbeing, from, to)}
        days={sessionsByDay(sessions, from, to)}
        sessionCount={sessions.length}
        minutes={MINUTES}
        fixtures={FIXTURES}
        calendar={calendar}
        name={(id) => NAMES.get(id) ?? id}
      />

      <h2 className="academy-title">The coach&rsquo;s sheet: Tue 20 Oct</h2>
      <AttendanceSheet
        clubId="preview"
        sessionId="n1"
        held
        rows={(ROSTER.t1 ?? []).map((personId) => {
          const a = ANSWERS.find((x) => x.sessionId === 'n1' && x.personId === personId);
          const m = MARKS.find((x) => x.sessionId === 'n1' && x.personId === personId);
          return {
            personId,
            name: NAMES.get(personId) ?? personId,
            answer: a === undefined ? null : { available: a.available, reason: a.reason },
            mark: m === undefined ? null : { mark: m.mark, reason: m.reason },
          };
        })}
      />
      <h2 className="academy-title">Game time: U15 Boys v Eastern Lions</h2>
      <GameTimeEntry
        clubId="preview"
        fixtureId="preview-fixture"
        players={(ROSTER.t1 ?? []).map((personId) => ({ personId, name: NAMES.get(personId) ?? personId, started: personId !== 'p5', positions: {} }))}
      />
    </main>
  );
}
