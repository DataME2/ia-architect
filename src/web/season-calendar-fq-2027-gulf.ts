/**
 * Football Queensland's 2027 season calendar for the
 * Northern Conference — Far North and Gulf (Gulf) (scope 103), as published in
 * `docs/annexes/2610003-General-2027-Season-Calendars-V1_G.pdf`.
 *
 * Transcribed as `season-calendar-fq-2027.ts` is: each `plan` is the PDF's
 * row keyed by the Friday column, the cell as printed. Nominations, themed
 * rounds and representative weekends are read from their colours; text the
 * PDF paints in the colour of its own cell is invisible on the page and is
 * not transcribed. A label printed across several weeks fills each of them.
 *
 * The Gulf runs to Christmas: 52 weekends, not 44. Its November and
 * December header prints 2026's Fridays (6 November … 25 December); the
 * columns are read as 2027's weeks, which follow on from 29 October
 * (open question #98). The Mount Isa Rodeo weekend has no games.
 */

import type { SeasonCalendar } from './season-calendar.ts';
import { FQ_2027_EVENTS, FQ_2027_QLD_SCHOOL_HOLIDAYS } from './season-calendar-fq-2027.ts';

export const FQ_2027_GULF: SeasonCalendar = {
  id: 'fq-2027-northern-gulf',
  season: 2027,
  governingBody: 'Football Queensland',
  state: 'QLD',
  region: 'Northern Conference — Far North and Gulf (Gulf)',
  source: '2027 Season Calendars, version 1',
  caveat: '2027 competition calendars are subject to change.',
  firstFriday: '2027-01-01',
  weekendCount: 52,
  schoolHolidays: FQ_2027_QLD_SCHOOL_HOLIDAYS,
  noGames: { '2027-03-26': 'Easter', '2027-08-06': 'Mount Isa Rodeo' },
  windows: [],
  events: [
    ...FQ_2027_EVENTS,
    { name: 'Mount Isa Rodeo', level: 'Local', from: '2027-08-06', to: '2027-08-08', place: 'Mount Isa' },
  ],
  competitions: [
    {
      id: 'gulf-premier-league-women',
      name: 'Gulf Premier League Women · 4 Teams',
      group: 'seniors',
      notes: '15 Rounds',
      plan: {
        '2027-02-05': 'NOMS OPEN', '2027-03-12': 'NOMS CLOSE', '2027-04-09': '1', '2027-04-16': '2',
        '2027-04-23': '3', '2027-05-07': '4', '2027-05-14': '5', '2027-05-21': '6',
        '2027-05-28': '7', '2027-06-04': '8', '2027-06-11': '9', '2027-06-18': '10',
        '2027-06-25': '11', '2027-07-16': '12', '2027-07-23': '13', '2027-07-30': '14',
        '2027-08-13': '15', '2027-08-20': 'CU', '2027-08-27': 'SF', '2027-09-03': 'PF',
        '2027-09-10': 'GF',
      },
    },
    {
      id: 'gulf-premier-league-men',
      name: 'Gulf Premier League Men · 4 Teams',
      group: 'seniors',
      notes: '15 Rounds',
      plan: {
        '2027-02-05': 'NOMS OPEN', '2027-03-12': 'NOMS CLOSE', '2027-04-09': '1', '2027-04-16': '2',
        '2027-04-23': '3', '2027-05-07': '4', '2027-05-14': '5', '2027-05-21': '6',
        '2027-05-28': '7', '2027-06-04': '8', '2027-06-11': '9', '2027-06-18': '10',
        '2027-06-25': '11', '2027-07-16': '12', '2027-07-23': '13', '2027-07-30': '14',
        '2027-08-13': '15', '2027-08-20': 'CU', '2027-08-27': 'SF', '2027-09-03': 'PF',
        '2027-09-10': 'GF',
      },
    },
    {
      id: 'community-juniors-5-6-teams',
      name: 'Community Juniors 5/6 Teams',
      group: 'community-juniors',
      notes: '15 Rounds',
      plan: {
        '2027-02-05': 'NOMS OPEN', '2027-03-12': 'NOMS CLOSE', '2027-04-09': '1', '2027-04-16': '2',
        '2027-04-23': '3', '2027-05-07': '4', '2027-05-14': '5', '2027-05-21': '6',
        '2027-05-28': '7', '2027-06-04': '8', '2027-06-11': '9', '2027-06-18': '10',
        '2027-06-25': '11', '2027-07-16': '12', '2027-07-23': '13', '2027-07-30': '14',
        '2027-08-13': '15', '2027-08-20': 'CU', '2027-08-27': 'SF', '2027-09-03': 'PF',
        '2027-09-10': 'GF',
      },
    },
    {
      id: 'community-juniors-3-4-teams',
      name: 'Community Juniors 3/4 Teams',
      group: 'community-juniors',
      notes: '15 Rounds',
      plan: {
        '2027-02-05': 'NOMS OPEN', '2027-03-12': 'NOMS CLOSE', '2027-04-09': '1', '2027-04-16': '2',
        '2027-04-23': '3', '2027-05-07': '4', '2027-05-14': '5', '2027-05-21': '6',
        '2027-05-28': '7', '2027-06-04': '8', '2027-06-11': '9', '2027-06-18': '10',
        '2027-06-25': '11', '2027-07-16': '12', '2027-07-23': '13', '2027-07-30': '14',
        '2027-08-13': '15', '2027-08-20': 'CU', '2027-08-27': 'SF', '2027-09-03': 'PF',
        '2027-09-10': 'GF',
      },
    },
    {
      id: 'miniroos',
      name: 'MiniRoos',
      group: 'miniroos',
      notes: '19 Rounds',
      plan: {
        '2027-02-05': 'NOMS OPEN', '2027-03-12': 'NOMS CLOSE', '2027-04-09': '1', '2027-04-16': '2',
        '2027-04-23': '3', '2027-05-07': '4', '2027-05-14': '5', '2027-05-21': '6',
        '2027-05-28': '7', '2027-06-04': '8', '2027-06-11': '9', '2027-06-18': '10',
        '2027-06-25': '11', '2027-07-16': '12', '2027-07-23': '13', '2027-07-30': '14',
        '2027-08-13': '15', '2027-08-20': '16', '2027-08-27': '17', '2027-09-03': '18',
        '2027-09-10': '19',
      },
    },
    {
      id: 'miniroos-kick-off',
      name: 'MiniRoos Kick Off',
      group: 'miniroos',
      notes: 'About 6 rounds per term',
      plan: {
        '2027-02-05': 'NOMS OPEN', '2027-03-12': 'NOMS CLOSE', '2027-04-09': '1', '2027-04-16': '2',
        '2027-04-23': '3', '2027-05-07': '4', '2027-05-14': '5', '2027-05-21': '6',
        '2027-05-28': '7', '2027-06-04': '8', '2027-06-11': '9', '2027-06-18': '10',
        '2027-06-25': '11', '2027-07-16': '12', '2027-07-23': '13', '2027-07-30': '14',
        '2027-08-13': '15', '2027-08-20': '16', '2027-08-27': '17', '2027-09-03': '18',
      },
    },
    {
      id: 'themed-rounds',
      name: 'Themed rounds',
      group: 'social',
      plan: {
        '2027-03-26': 'Event', '2027-04-02': 'Event', '2027-05-14': 'Event', '2027-05-21': 'Event',
        '2027-07-16': 'Event', '2027-07-23': 'Event',
      },
    },
    {
      id: 'girls-united',
      name: 'Girls United',
      group: 'social',
      plan: {
        '2027-10-01': 'Carnival (Townsville)', '2027-10-08': '1', '2027-10-15': '2', '2027-10-22': '3',
        '2027-10-29': '4', '2027-11-05': '5', '2027-11-12': '6', '2027-11-19': '7',
        '2027-11-26': '8',
      },
    },
    {
      id: 'futsal',
      name: 'Futsal',
      group: 'social',
      plan: {
        '2027-01-29': 'Term 1 League', '2027-02-05': 'Term 1 League', '2027-02-12': 'Term 1 League', '2027-02-19': 'Term 1 League',
        '2027-02-26': 'Term 1 League', '2027-03-05': 'Term 1 League', '2027-03-12': 'Term 1 League', '2027-03-19': 'Term 1 League',
        '2027-10-08': '1', '2027-10-15': '2', '2027-10-22': '3', '2027-10-29': '4',
        '2027-11-05': '5', '2027-11-12': '6', '2027-11-19': '7', '2027-11-26': '8',
        '2027-12-03': 'SF', '2027-12-10': 'GF',
      },
    },
    {
      id: 'representative-carnivals-matches',
      name: 'Representative carnivals & matches',
      group: 'social',
      plan: {
        '2027-01-15': 'Futsal', '2027-01-22': 'Futsal', '2027-04-02': 'MKY', '2027-04-16': 'BFSC',
        '2027-04-30': 'TSV', '2027-06-11': 'Bill Turner', '2027-06-25': 'Sunny', '2027-07-02': 'Moreton Bay',
        '2027-07-09': 'Moreton Bay', '2027-09-24': 'Pacific Champs', '2027-10-01': 'Pacific Champs',
      },
    },
    {
      id: 'regional-carnivals',
      name: 'Regional carnivals',
      group: 'social',
      plan: {
        '2027-07-09': 'Mele',
      },
    },
  ],
};
