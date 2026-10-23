/**
 * Which competition each team plays in (scope 102, BR179): what the teams
 * screen offers, who may change it, and how a change reads in the history.
 *
 * **Offered from the published calendars, never typed.** A registrar picks a
 * competition from the calendar for the team's season, so "NPL Men" and
 * "NPL mens" can never be two different answers to one question.
 */

import { GROUPS, competitionLabel, type SeasonCalendar } from './season-calendar.ts';
import { CALENDARS, calendarById } from './season-calendars.ts';

/** BR179: the four roles that enter, withdraw and read the history. */
export const COMPETITION_EDITORS = ['admin', 'registrar', 'coordinator', 'program_coordinator'] as const;

export function mayEditCompetitions(roles: readonly string[]): boolean {
  return roles.some((r) => (COMPETITION_EDITORS as readonly string[]).includes(r));
}

/**
 * The calendars a club season can play in: those whose year the season
 * covers. A season from 1 Oct 2026 to 30 Sep 2027 is offered 2027's.
 */
export function calendarsForSeason(startsOn: string, endsOn: string): readonly SeasonCalendar[] {
  const from = Number(startsOn.slice(0, 4));
  const to = Number(endsOn.slice(0, 4));
  return CALENDARS.filter((c) => c.season >= from && c.season <= to);
}

export interface CompetitionOption {
  /** `calendarId/competitionRef`, the one value a form posts. */
  readonly value: string;
  readonly label: string;
}

export interface CompetitionOptionGroup {
  readonly label: string;
  readonly options: readonly CompetitionOption[];
}

/** One optgroup per calendar group, labelled with the region when there is more than one calendar. */
export function competitionOptions(calendars: readonly SeasonCalendar[]): readonly CompetitionOptionGroup[] {
  return calendars.flatMap((cal) =>
    GROUPS.map((g) => ({
      label: calendars.length > 1 ? `${cal.region} — ${g.label}` : g.label,
      options: cal.competitions
        .filter((c) => c.group === g.id)
        .map((c) => ({ value: `${cal.id}/${c.id}`, label: competitionLabel(c, cal.competitions) })),
    })).filter((group) => group.options.length > 0),
  );
}

/** A posted `calendarId/competitionRef`, accepted only if the calendar knows it. */
export function parseCompetitionChoice(raw: unknown): { readonly calendarId: string; readonly competitionRef: string } | null {
  if (typeof raw !== 'string') return null;
  const [calendarId, competitionRef, extra] = raw.split('/');
  if (!calendarId || !competitionRef || extra !== undefined) return null;
  return describeCompetition(calendarId, competitionRef).known ? { calendarId, competitionRef } : null;
}

export interface CompetitionDescription {
  readonly name: string;
  readonly region: string;
  /** False when the calendar no longer lists it: the id is shown rather than nothing. */
  readonly known: boolean;
  /** The season calendar, following this competition. */
  readonly href: string | null;
}

export function describeCompetition(calendarId: string, competitionRef: string): CompetitionDescription {
  const cal = calendarById(calendarId);
  const c = cal?.competitions.find((x) => x.id === competitionRef);
  if (!cal || !c) return { name: competitionRef, region: calendarId, known: false, href: null };
  return {
    name: competitionLabel(c, cal.competitions),
    region: cal.region,
    known: true,
    href: `/seasons/${cal.id}?follow=${encodeURIComponent(c.id)}`,
  };
}

export interface CompetitionChange {
  readonly changedAt: string;
  readonly action: 'entered' | 'withdrawn';
  readonly teamName: string;
  readonly calendarId: string;
  readonly competitionRef: string;
  readonly changedByName: string;
}

/** "Sam Lee entered U14 Girls in QPL 1 Women." — who, what and which way, in one sentence. */
export function changeSentence(c: CompetitionChange): string {
  const { name } = describeCompetition(c.calendarId, c.competitionRef);
  return c.action === 'entered'
    ? `${c.changedByName} entered ${c.teamName} in ${name}.`
    : `${c.changedByName} withdrew ${c.teamName} from ${name}.`;
}
