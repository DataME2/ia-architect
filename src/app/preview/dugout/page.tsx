import { notFound } from 'next/navigation';

import { playerStatus, shortName, type DugoutOfficial, type DugoutPlayer, type Position } from '../../../web/dugout.ts';
import type { CalendarFixture } from '../../../web/competition-calendar.ts';
import { TD_NOT_PERMITTED, TD_PERMISSIONS } from '../../../web/technical-director.ts';
import { CompetitionCalendar } from '../../_components/CompetitionCalendar.tsx';
import { TeamDugout } from '../../_components/TeamDugout.tsx';
import { Panel, WorkspaceHead } from '../../me/_workspaces/shared.tsx';

/**
 * A design preview of the Team Dugout and the competition calendar (scope
 * 99), and the Technical Director's permission list (scope 98), on sample
 * data. **Development only**: a production build answers 404. The squad goes
 * through the same `playerStatus` and `lineUp` the real workspaces use, so
 * what shows here is what a coach or TD sees without signing in as one.
 */

const TODAY = '2026-10-14';

type Row = [string, string, Position | null, Position | null, number | null, { status: string; owes: boolean; hardshipUntil: string | null } | null, DugoutPlayer['availability']];
const ok = { status: 'COMPLETE', owes: false, hardshipUntil: null };
const SQUAD: readonly Row[] = [
  ['Mia', 'Tauroa', 'goalkeeper', null, 1, ok, 'available'],
  ['Leo', 'Nguyen', 'defender', null, 2, ok, 'available'],
  ['Ava', 'Smith', 'defender', 'midfielder', 3, ok, 'available'],
  ['Kai', 'Brown', 'defender', null, 4, ok, 'unanswered'],
  ['Zoe', 'Patel', 'defender', null, 5, ok, 'available'],
  ['Noah', 'Wilson', 'midfielder', null, 6, ok, 'available'],
  ['Isla', 'Martin', 'midfielder', 'forward', 8, ok, 'available'],
  ['Eli', 'Clarke', 'midfielder', null, 10, ok, 'available'],
  ['Ruby', 'Hall', 'forward', null, 9, ok, 'available'],
  ['Jack', 'Lee', 'forward', null, 11, ok, 'not_available'],
  ['Tané', 'Walker', 'forward', 'midfielder', 7, ok, 'available'],
  ['Sam', 'Young', 'utility', null, 14, ok, 'available'],
  ['Ella', 'King', 'goalkeeper', null, 13, ok, 'available'],
  ['Max', 'Wright', 'midfielder', null, 15, { status: 'COMPLETE', owes: true, hardshipUntil: null }, 'available'],
  ['Lily', 'Scott', 'defender', null, 16, { status: 'BLOCKED', owes: false, hardshipUntil: null }, null],
  ['Oscar', 'Green', null, null, null, null, null],
];

const PLAYERS: readonly DugoutPlayer[] = SQUAD.map(([given, family, preferred, secondary, number, reg, availability], i) => ({
  id: `p${i}`,
  name: `${given} ${family}`,
  shortName: shortName(given, family),
  number,
  preferred,
  secondary,
  status: playerStatus(reg),
  availability,
}));

const OFFICIALS: readonly DugoutOfficial[] = [
  { name: 'Sam Coach', role: 'Coach' },
  { name: 'Alex Rivera', role: 'Assistant coach' },
  { name: 'Jordan Tech', role: 'Technical Director' },
];

const TEAMS = [
  { id: 't1', name: 'U12 Academy' },
  { id: 't2', name: 'U14 Girls' },
  { id: 't3', name: 'Seniors' },
];
const OPPONENTS = ['Rival United', 'Souths United', 'Eastern Lions', 'Bayside Rovers', 'Westside FC', 'Northern Stars'];
const FIXTURES: readonly CalendarFixture[] = Array.from({ length: 30 }, (_, i) => {
  const month = 3 + Math.floor(i / 4);
  const day = 4 + (i % 4) * 7;
  const playedOn = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const past = playedOn < TODAY;
  return {
    id: `f${i}`,
    teamId: TEAMS[i % 3]!.id,
    teamName: TEAMS[i % 3]!.name,
    playedOn,
    kickOff: ['08:30:00', '10:00:00', '14:00:00'][i % 3]!,
    opponent: OPPONENTS[i % OPPONENTS.length]!,
    homeAway: i % 2 === 0 ? 'home' : 'away',
    competition: i % 3 === 2 ? 'Premier League' : 'Junior League',
    venue: i % 2 === 0 ? 'Home ground' : null,
    status: i === 7 ? 'cancelled' : past ? 'played' : 'scheduled',
    goalsFor: past && i !== 7 ? i % 4 : null,
    goalsAgainst: past && i !== 7 ? (i * 5) % 3 : null,
  };
});

export default function DugoutPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <>
      <WorkspaceHead title="Preview — the Team Dugout">
        Sample squad. Max owes money and Lily&rsquo;s registration is incomplete, so both sit on the bench with
        the reason and never start; Jack said he is not available this week.
      </WorkspaceHead>
      <TeamDugout teamName="U12 Academy" players={PLAYERS} officials={OFFICIALS} fixtureLabel="Next: v Rival United, 2026-10-18" />
      <CompetitionCalendar clubName="North Star FC" fixtures={FIXTURES} teams={TEAMS} today={TODAY} />
      <div className="cols">
        <Panel title="What you may do as Technical Director">
          <ul>
            {TD_PERMISSIONS.map((p) => (
              <li key={p.area}>
                <b>{p.area}:</b> {p.may}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Not part of this role">
          <ul>
            {TD_NOT_PERMITTED.map((p) => (
              <li key={p.area}>
                <b>{p.area}:</b> {p.may}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
