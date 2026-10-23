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
import { FQ_2027_SOUTH_COAST } from './season-calendar-fq-2027-south-coast.ts';
import { FQ_2027_DARLING_DOWNS } from './season-calendar-fq-2027-darling-downs.ts';
import { FQ_2027_SUNSHINE_COAST } from './season-calendar-fq-2027-sunshine-coast.ts';
import { FQ_2027_WIDE_BAY } from './season-calendar-fq-2027-wide-bay.ts';
import { FQ_2027_CENTRAL_COAST } from './season-calendar-fq-2027-central-coast.ts';
import { FQ_2027_WHITSUNDAY_COAST } from './season-calendar-fq-2027-whitsunday-coast.ts';
import { FQ_2027_NORTHERN } from './season-calendar-fq-2027-northern.ts';
import { FQ_2027_FAR_NORTH } from './season-calendar-fq-2027-far-north.ts';
import { FQ_2027_GULF } from './season-calendar-fq-2027-gulf.ts';
import type { SeasonCalendar } from './season-calendar.ts';

export const CALENDARS: readonly SeasonCalendar[] = [
  FQ_2027_SEQ,
  FQ_2027_SOUTH_COAST,
  FQ_2027_DARLING_DOWNS,
  FQ_2027_SUNSHINE_COAST,
  FQ_2027_WIDE_BAY,
  FQ_2027_CENTRAL_COAST,
  FQ_2027_WHITSUNDAY_COAST,
  FQ_2027_NORTHERN,
  FQ_2027_FAR_NORTH,
  FQ_2027_GULF,
];

export function calendarById(id: string): SeasonCalendar | null {
  return CALENDARS.find((c) => c.id === id) ?? null;
}

export interface Region {
  readonly name: string;
  /** The conference the region's own PDF names it under ("SEQ Conference — South Coast"). */
  readonly conference?: string;
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
      { name: 'Advanced & Metro', conference: 'SEQ Conference', calendar: FQ_2027_SEQ.id },
      { name: 'South Coast', conference: 'SEQ Conference', calendar: FQ_2027_SOUTH_COAST.id },
      { name: 'Darling Downs', conference: 'SEQ Conference', calendar: FQ_2027_DARLING_DOWNS.id },
      { name: 'Sunshine Coast', conference: 'SEQ Conference', calendar: FQ_2027_SUNSHINE_COAST.id },
      { name: 'Wide Bay', conference: 'Central Conference', calendar: FQ_2027_WIDE_BAY.id },
      { name: 'Central Coast', conference: 'Central Conference', calendar: FQ_2027_CENTRAL_COAST.id },
      { name: 'Whitsunday Coast', conference: 'Northern Conference', calendar: FQ_2027_WHITSUNDAY_COAST.id },
      { name: 'Northern', conference: 'Northern Conference', calendar: FQ_2027_NORTHERN.id },
      { name: 'Far North & Gulf — Far North', conference: 'Northern Conference', calendar: FQ_2027_FAR_NORTH.id },
      { name: 'Far North & Gulf — Gulf', conference: 'Northern Conference', calendar: FQ_2027_GULF.id },
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

/** A federation's regions grouped by conference, in the order they are listed; one group when there are none. */
export function byConference(regions: readonly Region[]): readonly { readonly conference: string | null; readonly regions: readonly Region[] }[] {
  const groups: { conference: string | null; regions: Region[] }[] = [];
  for (const r of regions) {
    const c = r.conference ?? null;
    const g = groups.find((x) => x.conference === c);
    if (g) g.regions.push(r);
    else groups.push({ conference: c, regions: [r] });
  }
  return groups;
}
