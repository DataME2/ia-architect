/**
 * Football Queensland's 2027 season calendar for the
 * Northern Conference — Whitsunday Coast (scope 103), as published in
 * `docs/annexes/2610003-General-2027-Season-Calendars-V1_WSC.pdf`.
 *
 * Transcribed as `season-calendar-fq-2027.ts` is: each `plan` is the PDF's
 * row keyed by the Friday column, the cell as printed. Nominations, themed
 * rounds and representative weekends are read from their colours; text the
 * PDF paints in the colour of its own cell is invisible on the page and is
 * not transcribed. A label printed across several weeks fills each of them.
 *
 * Its notes column prints round counts the extractor could not read; they
 * are taken from the rendered page. The club-carnival and sponsor-day
 * tables list names with no dates, so they are not here.
 */

import type { SeasonCalendar } from './season-calendar.ts';
import { FQ_2027_EVENTS, FQ_2027_QLD_SCHOOL_HOLIDAYS } from './season-calendar-fq-2027.ts';

export const FQ_2027_WHITSUNDAY_COAST: SeasonCalendar = {
  id: 'fq-2027-northern-whitsunday-coast',
  season: 2027,
  governingBody: 'Football Queensland',
  state: 'QLD',
  region: 'Northern Conference — Whitsunday Coast',
  source: '2027 Season Calendars, version 1',
  caveat: '2027 competition calendars are subject to change.',
  firstFriday: '2027-01-01',
  weekendCount: 44,
  schoolHolidays: FQ_2027_QLD_SCHOOL_HOLIDAYS,
  noGames: { '2027-03-26': 'Easter' },
  windows: [],
  events: [
    ...FQ_2027_EVENTS,
    { name: 'Mackay Council Sports Expo', level: 'Local', from: '2027-02-09', to: '2027-02-09', place: 'Mackay' },
    { name: 'Mackay Marina Run', level: 'Local', from: '2027-06-07', to: '2027-06-07', place: 'Mackay' },
    { name: 'Mackay Show', level: 'Local', from: '2027-06-18', to: '2027-06-20', place: 'Mackay' },
  ],
  competitions: [
    {
      id: 'queensland-cup-men',
      name: 'Queensland Cup Men',
      group: 'seniors',
      plan: {
        '2027-03-05': '1', '2027-03-12': '2', '2027-03-19': '3', '2027-04-16': '4',
        '2027-04-23': 'CU', '2027-04-30': '5', '2027-05-14': '6', '2027-06-11': 'QF',
        '2027-07-23': 'SF', '2027-08-20': 'GF',
      },
    },
    {
      id: 'queensland-cup-women',
      name: 'Queensland Cup Women',
      group: 'seniors',
      plan: {
        '2027-03-05': '1', '2027-03-12': '2', '2027-04-16': '3', '2027-04-23': 'CU',
        '2027-04-30': '4', '2027-05-14': '5', '2027-06-11': 'QF', '2027-07-23': 'SF',
        '2027-08-20': 'GF',
      },
    },
    {
      id: 'qpl-5-6-teams',
      name: 'QPL Men’s & Women’s 5/6 Teams',
      group: 'seniors',
      notes: '20 Rounds',
      plan: {
        '2027-04-09': '1', '2027-04-16': '2', '2027-04-23': '3', '2027-04-30': '4',
        '2027-05-07': '5', '2027-05-14': '6', '2027-05-21': '7', '2027-05-28': '8',
        '2027-06-04': '9', '2027-06-11': '10', '2027-06-18': '11', '2027-06-25': '12',
        '2027-07-02': 'CU', '2027-07-09': '13', '2027-07-16': '14', '2027-07-23': '15',
        '2027-07-30': '16', '2027-08-06': '17', '2027-08-13': '18', '2027-08-20': '19',
        '2027-08-27': '20', '2027-09-03': 'SF', '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'qpl-7-8-teams',
      name: 'QPL Men’s & Women’s 7/8 Teams',
      group: 'seniors',
      notes: '21 Rounds',
      plan: {
        '2027-04-09': '1', '2027-04-16': '2', '2027-04-23': '3', '2027-04-30': '4',
        '2027-05-07': '5', '2027-05-14': '6', '2027-05-21': '7', '2027-05-28': '8',
        '2027-06-04': '9', '2027-06-11': '10', '2027-06-18': '11', '2027-06-25': '12',
        '2027-07-02': '13', '2027-07-09': '14', '2027-07-16': '15', '2027-07-23': '16',
        '2027-07-30': '17', '2027-08-06': '18', '2027-08-13': '19', '2027-08-20': '20',
        '2027-08-27': '21', '2027-09-03': 'SF', '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'community-men-seniors-7-8-teams',
      name: 'Community Men Seniors 7/8 Teams',
      group: 'community-seniors',
      notes: '21 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-12': 'NOMS CLOSE', '2027-04-09': '1', '2027-04-16': '2',
        '2027-04-23': '3', '2027-04-30': '4', '2027-05-07': '5', '2027-05-14': '6',
        '2027-05-21': '7', '2027-05-28': '8', '2027-06-04': '9', '2027-06-11': '10',
        '2027-06-18': '11', '2027-06-25': '12', '2027-07-02': '13', '2027-07-09': '14',
        '2027-07-16': '15', '2027-07-23': '16', '2027-07-30': '17', '2027-08-06': '18',
        '2027-08-13': '19', '2027-08-20': '20', '2027-08-27': '21', '2027-09-03': 'SF',
        '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'juniors-5-6-teams',
      name: 'Juniors 5/6 Teams',
      group: 'community-juniors',
      notes: '15 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-12': 'NOMS CLOSE', '2027-03-12': 'Foundation 1', '2027-03-19': 'Foundation 2',
        '2027-04-16': '1', '2027-04-23': '2', '2027-05-07': '3', '2027-05-14': '4',
        '2027-05-21': '5', '2027-05-28': '6', '2027-06-04': '7', '2027-06-11': '8',
        '2027-06-18': '9', '2027-06-25': 'CU', '2027-07-02': 'CU', '2027-07-16': '10',
        '2027-07-23': '11', '2027-07-30': '12', '2027-08-06': '13', '2027-08-13': '14',
        '2027-08-20': '15', '2027-08-27': 'CU', '2027-09-03': 'SF', '2027-09-10': 'PF',
        '2027-09-17': 'GF',
      },
    },
    {
      id: 'juniors-7-8-teams',
      name: 'Juniors 7/8 Teams',
      group: 'community-juniors',
      notes: '14 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-12': 'NOMS CLOSE', '2027-03-12': 'Foundation 1', '2027-03-19': 'Foundation 2',
        '2027-04-16': '1', '2027-04-23': '2', '2027-05-07': '3', '2027-05-14': '4',
        '2027-05-21': '5', '2027-05-28': '6', '2027-06-04': '7', '2027-06-11': '8',
        '2027-06-18': '9', '2027-06-25': 'CU', '2027-07-02': 'CU', '2027-07-16': 'Rnd Rb',
        '2027-07-23': '10', '2027-07-30': '11', '2027-08-06': '12', '2027-08-13': '13',
        '2027-08-20': '14', '2027-08-27': 'CU', '2027-09-03': 'SF', '2027-09-10': 'PF',
        '2027-09-17': 'GF',
      },
    },
    {
      id: 'juniors-9-10-teams',
      name: 'Juniors 9/10 Teams',
      group: 'community-juniors',
      notes: '18 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-12': 'NOMS CLOSE', '2027-03-12': 'Foundation 1', '2027-03-19': 'Foundation 2',
        '2027-04-16': '1', '2027-04-23': '2', '2027-05-07': '3', '2027-05-14': '4',
        '2027-05-21': '5', '2027-05-28': '6', '2027-06-04': '7', '2027-06-11': '8',
        '2027-06-18': '9&10', '2027-06-25': 'CU', '2027-07-16': '11&12', '2027-07-23': '13',
        '2027-07-30': '14', '2027-08-06': '15', '2027-08-13': '16', '2027-08-20': '17',
        '2027-08-27': '18', '2027-09-03': 'SF', '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'miniroos-non-competitive',
      name: 'MiniRoos Non-Competitive',
      group: 'miniroos',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-12': 'NOMS CLOSE', '2027-03-12': '1', '2027-03-19': '2',
        '2027-04-16': '3', '2027-04-23': '4', '2027-05-07': '5', '2027-05-14': '6',
        '2027-05-21': '7', '2027-05-28': '8', '2027-06-04': '9', '2027-06-11': '10',
        '2027-06-18': '11', '2027-06-25': '12', '2027-07-16': '13', '2027-07-23': '14',
        '2027-07-30': '15', '2027-08-06': '16', '2027-08-13': '17', '2027-08-20': '18',
        '2027-08-27': '19', '2027-09-03': '20', '2027-09-10': '21',
      },
    },
    {
      id: 'girls-united',
      name: 'Girls United',
      group: 'social',
      plan: {
        '2027-04-30': '1', '2027-05-07': '2', '2027-05-14': '3', '2027-05-21': '4',
        '2027-05-28': '5', '2027-06-04': '6', '2027-06-11': '7', '2027-06-18': '8',
        '2027-07-16': '1', '2027-07-23': '2', '2027-07-30': '3', '2027-08-06': '4',
        '2027-08-13': '5', '2027-08-20': '6', '2027-08-27': '7', '2027-09-03': '8',
        '2027-10-01': 'Carnival (Townsville)', '2027-10-08': '1', '2027-10-15': '2', '2027-10-22': '3',
        '2027-10-29': '4',
      },
    },
    {
      id: 'fq-futsal-league',
      name: 'FQ Futsal League',
      group: 'social',
      plan: {
        '2027-01-29': '1', '2027-02-05': '2', '2027-02-12': '3', '2027-02-19': '4',
        '2027-02-26': '5', '2027-03-05': '6', '2027-03-12': '7', '2027-03-19': '8',
      },
    },
    {
      id: 'themed-rounds',
      name: 'Themed rounds',
      group: 'social',
      plan: {
        '2027-03-19': 'Event', '2027-05-07': 'Event', '2027-05-14': 'Event', '2027-05-28': 'Magic Round',
        '2027-07-02': 'Event', '2027-07-09': 'Event',
      },
    },
    {
      id: 'mackay-surrounds-events',
      name: 'Mackay & surrounds events (Reef Masters, shows)',
      group: 'social',
      plan: {
        '2027-02-05': 'Expo',
      },
    },
    {
      id: 'representative-carnivals-matches',
      name: 'Representative carnivals & matches',
      group: 'social',
      plan: {
        '2027-04-02': 'MKY', '2027-04-16': 'Schls', '2027-04-23': 'ANZAC', '2027-04-30': 'TSV',
        '2027-06-04': 'Marina', '2027-06-18': 'Show', '2027-06-25': 'Jnr Cup', '2027-07-02': 'Wtr F',
        '2027-07-09': 'Stes', '2027-08-06': 'Rocky', '2027-10-01': 'Pac Champs',
      },
    },
  ],
};
