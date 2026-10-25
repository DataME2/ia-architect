/**
 * The daily check-in's decisions (scope 113; BR184–BR187): the club's five
 * scales and their end labels, the RPE wording, form parsing, and what the
 * Technical Lead's panels show. Pure and I/O-free; 0096 decides who writes
 * and reads, and this decides what a screen says about it.
 *
 * Every figure is a count or an average of what players entered (scope 100).
 * Nothing here labels a player.
 */
import type { IsoDate } from '../domain/types.ts';
import { addDays } from './academy.ts';
import { shortDate } from './me-view.ts';

// ------------------------------------------------------------------ scales

export type Measure = 'motivation' | 'mood' | 'sleep_quality' | 'stress' | 'soreness';

export interface Scale {
  readonly key: Measure;
  readonly label: string;
  /** The club's words for 1 and for 10. */
  readonly low: string;
  readonly high: string;
  readonly higherIsBetter: boolean;
}

/** As the club wrote them in its proposal; the order is theirs. */
export const SCALES: readonly Scale[] = [
  { key: 'motivation', label: 'Motivation', low: 'None', high: 'Highly', higherIsBetter: true },
  { key: 'mood', label: 'Mood', low: 'Low quality', high: 'High quality', higherIsBetter: true },
  { key: 'sleep_quality', label: 'Sleep quality', low: 'No sleep', high: 'Well rested', higherIsBetter: true },
  { key: 'stress', label: 'Stress', low: 'No stress', high: 'Highly anxious or stressed', higherIsBetter: false },
  { key: 'soreness', label: 'Soreness', low: 'No soreness', high: 'High level of pain', higherIsBetter: false },
];

export type Scores = Readonly<Record<Measure, number>>;

export type SessionKind = 'gym' | 'team_training' | 'individual_training' | 'other_sport';

export const SESSION_KINDS: readonly { readonly key: SessionKind; readonly label: string }[] = [
  { key: 'gym', label: 'Gym' },
  { key: 'team_training', label: 'Team training' },
  { key: 'individual_training', label: 'Individual training' },
  { key: 'other_sport', label: 'Other sport' },
];

export const sessionKindLabel = (kind: SessionKind): string =>
  SESSION_KINDS.find((k) => k.key === kind)?.label ?? kind;

/** The modified Borg CR-10 wording (#109), from 1: a session entered was done. */
const RPE_WORDS = [
  'Very, very easy',
  'Easy',
  'Moderate',
  'Somewhat hard',
  'Hard',
  'Hard',
  'Very hard',
  'Very hard',
  'Very hard',
  'Maximal',
] as const;

export const rpeWords = (rpe: number): string => RPE_WORDS[rpe - 1] ?? '';
export const rpeLabel = (rpe: number): string => `${rpe} · ${rpeWords(rpe)}`;

// ---------------------------------------------------------------- entries

export interface WellbeingEntry extends Scores {
  readonly personId: string;
  readonly on: IsoDate;
}

export interface SessionEntry {
  readonly id: string;
  readonly personId: string;
  readonly on: IsoDate;
  readonly kind: SessionKind;
  readonly rpe: number;
}

/** "Motivation 7 · Mood 6 · Sleep quality 5 · Stress 3 · Soreness 8". */
export const scoresLine = (s: Scores): string => SCALES.map((m) => `${m.label} ${s[m.key]}`).join(' · ');

/** "Team training · RPE 7 · Very hard". */
export const sessionLine = (s: Pick<SessionEntry, 'kind' | 'rpe'>): string =>
  `${sessionKindLabel(s.kind)} · RPE ${s.rpe} · ${rpeWords(s.rpe)}`;

const score = (value: string | undefined): number | null => {
  if (value === undefined || !/^\d{1,2}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= 10 ? n : null;
};

/** Today's five answers, each a whole number from 1 to 10. */
export function parseScores(
  form: Iterable<readonly [string, string]>,
): { readonly ok: true; readonly scores: Scores } | { readonly ok: false; readonly message: string } {
  const values = new Map(form);
  const out: Partial<Record<Measure, number>> = {};
  for (const m of SCALES) {
    const n = score(values.get(m.key));
    if (n === null) return { ok: false, message: `Choose a number from 1 to 10 for ${m.label.toLowerCase()}.` };
    out[m.key] = n;
  }
  return { ok: true, scores: out as Scores };
}

/** A session: within the last seven days (BR186), a type, and how hard. */
export function parseSession(
  input: { readonly on: string; readonly kind: string; readonly rpe: string },
  today: IsoDate,
): { readonly ok: true; readonly on: IsoDate; readonly kind: SessionKind; readonly rpe: number } | { readonly ok: false; readonly message: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.on) || input.on > today) return { ok: false, message: 'Choose the day of the session, today or before.' };
  if (input.on < addDays(today, -7)) return { ok: false, message: 'A session can be added up to seven days later.' };
  const kind = SESSION_KINDS.find((k) => k.key === input.kind)?.key;
  if (kind === undefined) return { ok: false, message: 'Choose what kind of session it was.' };
  const rpe = score(input.rpe);
  if (rpe === null) return { ok: false, message: 'Choose how hard it was, from 1 to 10.' };
  return { ok: true, on: input.on, kind, rpe };
}

// ----------------------------------------------------------------- consent

/**
 * Consent wording §5 (docs/annexes/consent-wording.md), as shown. The
 * guardian reads it about their child; a player of 18 reads it about
 * themselves.
 */
export function checkInConsentText(input: { readonly club: string; readonly player: string; readonly self: boolean }): {
  readonly paragraphs: readonly string[];
  readonly agree: string;
} {
  const who = input.self ? 'you' : input.player;
  const whose = input.self ? 'your' : `${input.player}’s`;
  return {
    paragraphs: [
      `${input.club} asks its academy players, U13 and older, to answer five questions once a day: motivation, mood, sleep quality, stress and soreness, each from 1 to 10, and how hard each session they did felt. This is information about ${whose} health and wellbeing.`,
      `Who sees it: ${input.self ? 'you' : `${input.player}, you`}, the coaches of ${whose} teams and the club’s Technical Leads. Not team managers, teammates, other parents or the committee, and it is never given to an automated assistant.`,
      `What it is for: helping the coaches plan training and notice when ${who === 'you' ? 'you' : input.player} may want a conversation. An answer at the end of a scale is listed for a coach to follow up. It is not a diagnosis, and it is never a label on ${who === 'you' ? 'you' : input.player}.`,
      'How long it is kept: this season and the last, then deleted.',
      `You can withdraw at any time${input.self ? ' on this page' : ' on your workspace'}. New check-ins stop at once.`,
    ],
    agree: input.self ? 'I agree to complete the daily check-in' : `I agree to ${input.player} completing the daily check-in`,
  };
}

/** The note under the check-in: who reads it, and whose agreement it rests on. */
export function whoSeesLine(input: { readonly adult: boolean; readonly consentedOn: IsoDate; readonly bySelf: boolean }): string {
  const readers = input.adult
    ? "Seen by your team's coaches and the Technical Leads. Not by teammates or the team manager."
    : "Seen by your team's coaches, the Technical Leads and your guardian. Not by teammates or the team manager.";
  const agreed = input.bySelf ? 'You agreed to this' : 'Your guardian agreed to this';
  return `${readers} ${agreed} on ${shortDate(input.consentedOn)}.`;
}

// ------------------------------------------------- the Technical Lead's view

/** Every day from `from` to `to`, inclusive. */
export function daysOf(from: IsoDate, to: IsoDate): readonly IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

const mean = (xs: readonly number[]): number | null =>
  xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;

export interface MeasureAverage {
  readonly scale: Scale;
  readonly average: number | null;
  /** The day's average, for each day of the range (null where nobody entered). */
  readonly byDay: readonly (number | null)[];
}

/** The team's average for each measure over the range, and day by day. */
export function teamAverages(entries: readonly WellbeingEntry[], from: IsoDate, to: IsoDate): readonly MeasureAverage[] {
  const inRange = entries.filter((e) => e.on >= from && e.on <= to);
  const days = daysOf(from, to);
  return SCALES.map((scale) => ({
    scale,
    average: mean(inRange.map((e) => e[scale.key])),
    byDay: days.map((d) => mean(inRange.filter((e) => e.on === d).map((e) => e[scale.key]))),
  }));
}

export interface EntriesMade {
  readonly personId: string;
  /** Days with a check-in, of the days asked: from consent, up to today. */
  readonly checkedIn: number;
  readonly asked: number;
  readonly sessions: number;
}

/**
 * Each player's entries over the range. A day counts as asked only once
 * consent was given and only up to today, so a player is never short of
 * days nobody could have asked of them.
 */
export function entriesMade(input: {
  readonly players: readonly { readonly personId: string; readonly consentedOn: IsoDate | null }[];
  readonly wellbeing: readonly WellbeingEntry[];
  readonly sessions: readonly SessionEntry[];
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly today: IsoDate;
}): readonly EntriesMade[] {
  const last = input.to < input.today ? input.to : input.today;
  return input.players.map((p) => {
    const first = p.consentedOn === null ? null : p.consentedOn > input.from ? p.consentedOn : input.from;
    const asked = first === null || first > last ? 0 : daysOf(first, last).length;
    return {
      personId: p.personId,
      asked,
      checkedIn: input.wellbeing.filter((e) => e.personId === p.personId && e.on >= input.from && e.on <= last).length,
      sessions: input.sessions.filter((s) => s.personId === p.personId && s.on >= input.from && s.on <= input.to).length,
    };
  });
}

/** BR187: 1 or 2 where higher is better, 9 or 10 where higher is worse. */
export const atFarEnd = (scale: Scale, value: number): boolean => (scale.higherIsBetter ? value <= 2 : value >= 9);

export interface FollowUp {
  readonly personId: string;
  readonly scale: Scale;
  readonly value: number;
  readonly on: IsoDate;
  /** Days running at the far end, ending on `on`. */
  readonly run: number;
}

/**
 * Asked to follow up (BR187): each player's latest far-end answer on each
 * scale in the range, and how many days running it has been there. Latest
 * first.
 */
export function followUps(entries: readonly WellbeingEntry[], from: IsoDate, to: IsoDate): readonly FollowUp[] {
  const out: FollowUp[] = [];
  const people = [...new Set(entries.map((e) => e.personId))];
  for (const personId of people) {
    const mine = new Map(entries.filter((e) => e.personId === personId).map((e) => [e.on, e] as const));
    for (const scale of SCALES) {
      const latest = [...mine.values()]
        .filter((e) => e.on >= from && e.on <= to && atFarEnd(scale, e[scale.key]))
        .sort((a, b) => (a.on < b.on ? 1 : -1))[0];
      if (latest === undefined) continue;
      let run = 1;
      for (let d = addDays(latest.on, -1); ; d = addDays(d, -1)) {
        const e = mine.get(d);
        if (e === undefined || !atFarEnd(scale, e[scale.key])) break;
        run += 1;
      }
      out.push({ personId, scale, value: latest[scale.key], on: latest.on, run });
    }
  }
  return out.sort((a, b) => (a.on === b.on ? b.run - a.run : a.on < b.on ? 1 : -1));
}

/** "Soreness 9, 2 days running", "Sleep quality 2 today", "Mood 1 on Tue 20 Oct". */
export function followUpLine(f: FollowUp, today: IsoDate): string {
  const what = `${f.scale.label} ${f.value}`;
  if (f.run > 1) return `${what}, ${f.run} days running`;
  return f.on === today ? `${what} today` : `${what} on ${shortDate(f.on)}`;
}

export interface SessionDay {
  readonly day: IsoDate;
  readonly counts: Readonly<Record<SessionKind, number>>;
  readonly total: number;
  readonly averageRpe: number | null;
}

/** Sessions entered each day by type, and the day's average RPE. */
export function sessionsByDay(sessions: readonly SessionEntry[], from: IsoDate, to: IsoDate): readonly SessionDay[] {
  return daysOf(from, to).map((day) => {
    const those = sessions.filter((s) => s.on === day);
    const counts = { gym: 0, team_training: 0, individual_training: 0, other_sport: 0 };
    for (const s of those) counts[s.kind] += 1;
    return { day, counts, total: those.length, averageRpe: mean(those.map((s) => s.rpe)) };
  });
}
