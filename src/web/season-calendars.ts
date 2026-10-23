/**
 * Where season calendars live (scope 101): Football Australia's nine member
 * federations, each with the regions it publishes a calendar for.
 *
 * **Federation → region → calendar** is the whole shape. A calendar is
 * published by one governing body for one region and one season, so adding
 * Darling Downs is one data file and one `calendar` id here — no new page,
 * and nothing about Queensland is assumed of Victoria. A region without a
 * calendar yet is listed rather than hidden, so a club can see its region is
 * known and simply waiting.
 */

import { FQ_2027_SEQ } from './season-calendar-fq-2027.ts';
import type { SeasonCalendar } from './season-calendar.ts';

export const CALENDARS: readonly SeasonCalendar[] = [FQ_2027_SEQ];

export function calendarById(id: string): SeasonCalendar | null {
  return CALENDARS.find((c) => c.id === id) ?? null;
}

export interface Region {
  readonly name: string;
  /** The published calendar's id, once it has been transcribed. */
  readonly calendar?: string;
}

export interface Federation {
  readonly name: string;
  readonly state: string;
  readonly regions: readonly Region[];
}

export const FEDERATIONS: readonly Federation[] = [
  {
    name: 'Football Queensland',
    state: 'QLD',
    regions: [
      { name: 'SEQ Conference — Advanced & Metro', calendar: FQ_2027_SEQ.id },
      { name: 'South Coast' },
      { name: 'Darling Downs' },
      { name: 'Sunshine Coast' },
      { name: 'Wide Bay' },
      { name: 'Central Coast' },
      { name: 'Whitsunday Coast' },
      { name: 'Northern' },
      { name: 'Far North & Gulf — Far North' },
      { name: 'Far North & Gulf — Gulf' },
    ],
  },
  { name: 'Football NSW', state: 'NSW', regions: [] },
  { name: 'Northern NSW Football', state: 'NSW', regions: [] },
  { name: 'Capital Football', state: 'ACT', regions: [] },
  { name: 'Football Victoria', state: 'VIC', regions: [] },
  { name: 'Football Tasmania', state: 'TAS', regions: [] },
  { name: 'Football South Australia', state: 'SA', regions: [] },
  { name: 'Football West', state: 'WA', regions: [] },
  { name: 'Football Northern Territory', state: 'NT', regions: [] },
];
