/**
 * Football Queensland's 2027 season calendar for the
 * Northern Conference — Far North and Gulf (Far North) (scope 103), as published in
 * `docs/annexes/2610003-General-2027-Season-Calendars-V1_FN.pdf`.
 *
 * Transcribed as `season-calendar-fq-2027.ts` is: each `plan` is the PDF's
 * row keyed by the Friday column, the cell as printed. Nominations, themed
 * rounds and representative weekends are read from their colours; text the
 * PDF paints in the colour of its own cell is invisible on the page and is
 * not transcribed. A label printed across several weeks fills each of them.
 *
 * Its header prints "0" for 3 September and "SHOW" across 16 July, where
 * every row rests (open question #98). MiniRoos Tablelands and Johnstone
 * River have notes but no dates yet.
 */

import type { SeasonCalendar } from './season-calendar.ts';
import { FQ_2027_EVENTS, FQ_2027_QLD_SCHOOL_HOLIDAYS } from './season-calendar-fq-2027.ts';

export const FQ_2027_FAR_NORTH: SeasonCalendar = {
  id: 'fq-2027-northern-far-north',
  season: 2027,
  governingBody: 'Football Queensland',
  state: 'QLD',
  region: 'Northern Conference — Far North and Gulf (Far North)',
  source: '2027 Season Calendars, version 1',
  caveat: '2027 competition calendars are subject to change.',
  firstFriday: '2027-01-01',
  weekendCount: 44,
  schoolHolidays: FQ_2027_QLD_SCHOOL_HOLIDAYS,
  noGames: { '2027-03-26': 'Easter', '2027-07-16': 'Show' },
  windows: [],
  events: [
    ...FQ_2027_EVENTS,
    { name: 'Leichhardt Junior Football carnival', level: 'Local', from: '2027-05-24', to: '2027-05-24' },
    { name: 'Leichhardt Junior Football carnival', level: 'Local', from: '2027-06-14', to: '2027-06-14' },
  ],
  competitions: [
    {
      id: 'queensland-cup-men',
      name: 'Queensland Cup Men',
      group: 'seniors',
      plan: {
        '2027-03-05': '1', '2027-03-12': '2', '2027-03-19': '3', '2027-04-09': 'CU',
        '2027-04-16': '4', '2027-04-30': '5', '2027-05-14': '6', '2027-06-11': 'QF',
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
      id: 'crad-evans-cairns',
      name: 'Crad Evans (Cairns)',
      group: 'seniors',
      plan: {
        '2027-09-24': 'TSV',
      },
    },
    {
      id: 'qpl-women-5-6-teams',
      name: 'QPL Women 5/6 Teams',
      group: 'seniors',
      notes: '20 Rounds',
      plan: {
        '2027-03-12': '1', '2027-03-19': '2', '2027-04-02': '3', '2027-04-09': '4',
        '2027-04-16': '5', '2027-04-23': '6', '2027-04-30': 'CU', '2027-05-07': '7',
        '2027-05-14': '8', '2027-05-21': '9', '2027-05-28': '10', '2027-06-04': '11',
        '2027-06-11': '12', '2027-06-18': '13', '2027-06-25': '14', '2027-07-02': '15',
        '2027-07-09': '16', '2027-07-23': '17', '2027-07-30': '18', '2027-08-06': 'CU',
        '2027-08-13': '19', '2027-08-20': '20', '2027-08-27': 'CU', '2027-09-03': 'SF',
        '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'qpl-women-7-8-teams',
      name: 'QPL Women 7/8 Teams',
      group: 'seniors',
      notes: '21 Rounds',
      plan: {
        '2027-03-12': '1', '2027-03-19': '2', '2027-04-02': '3', '2027-04-09': '4',
        '2027-04-16': '5', '2027-04-23': '6', '2027-04-30': 'CU', '2027-05-07': '7',
        '2027-05-14': '8', '2027-05-21': '9', '2027-05-28': '10', '2027-06-04': '11',
        '2027-06-11': '12', '2027-06-18': '13', '2027-06-25': '14', '2027-07-02': '15',
        '2027-07-09': '16', '2027-07-23': '17', '2027-07-30': '18', '2027-08-06': 'CU',
        '2027-08-13': '19', '2027-08-20': '20', '2027-08-27': '21', '2027-09-03': 'SF',
        '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'qpl-men-8-teams',
      name: 'QPL Men 8 Teams',
      group: 'seniors',
      notes: '21 Rounds',
      plan: {
        '2027-03-12': '1', '2027-03-19': '2', '2027-04-02': '3', '2027-04-09': '4',
        '2027-04-16': '5', '2027-04-23': '6', '2027-04-30': 'CU', '2027-05-07': '7',
        '2027-05-14': '8', '2027-05-21': '9', '2027-05-28': '10', '2027-06-04': '11',
        '2027-06-11': '12', '2027-06-18': '13', '2027-06-25': '14', '2027-07-02': '15',
        '2027-07-09': '16', '2027-07-23': '17', '2027-07-30': '18', '2027-08-06': 'CU',
        '2027-08-13': '19', '2027-08-20': '20', '2027-08-27': '21', '2027-09-03': 'SF',
        '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'seniors-5-6-teams',
      name: 'Seniors 5/6 Teams',
      group: 'community-seniors',
      notes: '20 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-12': 'NOMS CLOSE', '2027-04-02': '1', '2027-04-09': '2',
        '2027-04-16': '3', '2027-04-23': '4', '2027-04-30': 'CU', '2027-05-07': '5',
        '2027-05-14': '6', '2027-05-21': '7', '2027-05-28': '8', '2027-06-04': '9',
        '2027-06-11': '10', '2027-06-18': '11', '2027-06-25': '12', '2027-07-02': '13',
        '2027-07-09': '14', '2027-07-23': '15', '2027-07-30': '16', '2027-08-06': '17',
        '2027-08-13': '18', '2027-08-20': '19', '2027-08-27': '20', '2027-09-03': 'SF',
        '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'seniors-7-8-teams',
      name: 'Seniors 7/8 Teams',
      group: 'community-seniors',
      notes: '21 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-12': 'NOMS CLOSE', '2027-04-02': '1', '2027-04-09': '2',
        '2027-04-16': '3', '2027-04-23': '4', '2027-04-30': 'CU', '2027-05-07': '5',
        '2027-05-14': '6', '2027-05-21': '7', '2027-05-28': '8', '2027-06-04': '9',
        '2027-06-11': '10', '2027-06-18': '11', '2027-06-25': '12', '2027-07-02': '13',
        '2027-07-09': '14', '2027-07-23': '15', '2027-07-30': '16&17', '2027-08-06': '18',
        '2027-08-13': '19', '2027-08-20': '20', '2027-08-27': '21', '2027-09-03': 'SF',
        '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'seniors-9-10-teams',
      name: 'Seniors 9/10 Teams',
      group: 'community-seniors',
      notes: '18 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-12': 'NOMS CLOSE', '2027-04-02': '1', '2027-04-09': '2',
        '2027-04-16': '3', '2027-04-23': '4', '2027-04-30': 'CU', '2027-05-07': '5',
        '2027-05-14': '6', '2027-05-21': '7', '2027-05-28': '8', '2027-06-04': '9',
        '2027-06-11': '10', '2027-06-18': '11', '2027-06-25': '12', '2027-07-02': '13',
        '2027-07-09': 'CU', '2027-07-23': '14', '2027-07-30': '15', '2027-08-06': '16',
        '2027-08-13': '17', '2027-08-20': '18', '2027-08-27': 'CU', '2027-09-03': 'SF',
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
        '2027-06-18': '9', '2027-06-25': '10', '2027-07-23': '11', '2027-07-30': '12',
        '2027-08-06': '13', '2027-08-13': '14', '2027-08-20': '15', '2027-08-27': 'SF',
        '2027-09-03': 'PF', '2027-09-10': 'GF',
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
        '2027-06-18': '9', '2027-06-25': '10', '2027-07-23': '11', '2027-07-30': '12',
        '2027-08-06': '13', '2027-08-13': '14', '2027-08-20': 'CU', '2027-08-27': 'SF',
        '2027-09-03': 'PF', '2027-09-10': 'GF',
      },
    },
    {
      id: 'juniors-9-10-teams',
      name: 'Juniors 9/10 Teams',
      group: 'community-juniors',
      notes: '18 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-12': 'NOMS CLOSE', '2027-03-12': 'Foundation 1', '2027-03-19': 'Foundation 2',
        '2027-04-16': '1', '2027-04-23': '2', '2027-05-07': '3', '2027-05-14': '4&5',
        '2027-05-21': '6', '2027-05-28': '7', '2027-06-04': '8&9', '2027-06-11': '10',
        '2027-06-18': '11', '2027-06-25': '12', '2027-07-23': '13', '2027-07-30': '14',
        '2027-08-06': '15', '2027-08-13': '16&17', '2027-08-20': '18', '2027-08-27': 'SF',
        '2027-09-03': 'PF', '2027-09-10': 'GF',
      },
    },
    {
      id: 'miniroos-cairns',
      name: 'MiniRoos Cairns',
      group: 'miniroos',
      notes: '20 Rounds',
      plan: {
        '2027-03-12': '1', '2027-03-19': '2', '2027-04-16': '3', '2027-04-23': '4',
        '2027-05-07': '5', '2027-05-14': '6', '2027-05-21': '7', '2027-05-28': '8',
        '2027-06-04': '9', '2027-06-11': '10', '2027-06-18': '11', '2027-06-25': '12',
        '2027-07-23': '13', '2027-07-30': '14', '2027-08-06': '15', '2027-08-13': '16',
        '2027-08-20': '17', '2027-08-27': '18', '2027-09-03': '19', '2027-09-10': '20',
      },
    },
    {
      id: 'miniroos-tablelands',
      name: 'MiniRoos Tablelands',
      group: 'miniroos',
      notes: '15 Rounds — dates not yet printed',
      plan: {},
    },
    {
      id: 'miniroos-johnstone-river',
      name: 'MiniRoos Johnstone River',
      group: 'miniroos',
      notes: '15 Rounds — dates not yet printed',
      plan: {},
    },
    {
      id: 'girls-united',
      name: 'Girls United',
      group: 'social',
      plan: {
        '2027-10-01': 'Carnival (Townsville)',
      },
    },
    {
      id: 'great-barrier-reef-masters',
      name: 'Great Barrier Reef Masters (29 May – 1 June)',
      group: 'social',
      plan: {
        '2027-06-25': '25-27 June',
      },
    },
    {
      id: 'representative-carnivals-matches',
      name: 'Representative carnivals & matches',
      group: 'social',
      plan: {
        '2027-01-01': 'Futsal', '2027-01-08': 'Futsal', '2027-04-09': 'MKY', '2027-04-30': 'TSV',
        '2027-06-04': 'Cairns', '2027-06-25': 'Sunny', '2027-07-02': 'Moreton Bay', '2027-07-09': 'Moreton Bay',
        '2027-09-24': 'Pacific Champs', '2027-10-01': 'Pacific Champs',
      },
    },
  ],
};
