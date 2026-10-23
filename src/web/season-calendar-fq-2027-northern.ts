/**
 * Football Queensland's 2027 season calendar for the
 * Northern Conference — Northern (scope 103), as published in
 * `docs/annexes/2610003-General-2027-Season-Calendars-V1_N.pdf`.
 *
 * Transcribed as `season-calendar-fq-2027.ts` is: each `plan` is the PDF's
 * row keyed by the Friday column, the cell as printed. Nominations, themed
 * rounds and representative weekends are read from their colours; text the
 * PDF paints in the colour of its own cell is invisible on the page and is
 * not transcribed. A label printed across several weeks fills each of them.
 *
 * Its themed-rounds label is printed white on white, so that row is
 * transcribed by hand from the rendered page, as is the club-carnivals row,
 * whose cells wrap over several lines. Townsville's local events are all
 * "TBC" and have no dates to show.
 */

import type { SeasonCalendar } from './season-calendar.ts';
import { FQ_2027_EVENTS, FQ_2027_QLD_SCHOOL_HOLIDAYS } from './season-calendar-fq-2027.ts';

export const FQ_2027_NORTHERN: SeasonCalendar = {
  id: 'fq-2027-northern-northern',
  season: 2027,
  governingBody: 'Football Queensland',
  state: 'QLD',
  region: 'Northern Conference — Northern',
  source: '2027 Season Calendars, version 1',
  caveat: '2027 competition calendars are subject to change.',
  firstFriday: '2027-01-01',
  weekendCount: 44,
  schoolHolidays: FQ_2027_QLD_SCHOOL_HOLIDAYS,
  noGames: { '2027-03-26': 'Easter' },
  windows: [],
  events: FQ_2027_EVENTS,
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
      id: 'crad-evans',
      name: 'Crad Evans',
      group: 'seniors',
      plan: {
        '2027-09-24': 'TSV',
      },
    },
    {
      id: 'qpl-u23-7-8-teams',
      name: 'QPL Men/Women & QPL U23 Men/Women 7/8 Teams',
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
      id: 'qpl-women-u23-5-6-teams',
      name: 'QPL Women & U23 Women 5/6 Teams',
      group: 'seniors',
      notes: '20 Rounds',
      plan: {
        '2027-04-09': '1', '2027-04-16': '2', '2027-04-23': '3', '2027-04-30': '4',
        '2027-05-07': '5', '2027-05-14': '6', '2027-05-21': '7', '2027-05-28': '8',
        '2027-06-04': '9', '2027-06-11': '10', '2027-06-18': '11', '2027-06-25': '12',
        '2027-07-02': '13', '2027-07-09': '14', '2027-07-16': '15', '2027-07-23': '16',
        '2027-07-30': '17', '2027-08-06': '18', '2027-08-13': '19', '2027-08-20': '20',
        '2027-08-27': 'CU', '2027-09-03': 'SF', '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'qpl-women-u23-9-10-teams',
      name: 'QPL Women & U23 Women 9/10 Teams',
      group: 'seniors',
      notes: '18 Rounds',
      plan: {
        '2027-04-09': '1', '2027-04-16': '2', '2027-04-23': '3', '2027-04-30': '4',
        '2027-05-07': '5', '2027-05-14': '6', '2027-05-21': '7', '2027-05-28': '8',
        '2027-06-04': '9', '2027-06-11': '10', '2027-06-18': '11', '2027-07-16': '12',
        '2027-07-23': '13', '2027-07-30': '14', '2027-08-06': '15', '2027-08-13': '16',
        '2027-08-20': '17', '2027-08-27': '18', '2027-09-03': 'SF', '2027-09-10': 'PF',
        '2027-09-17': 'GF',
      },
    },
    {
      id: 'seniors-9-10-teams',
      name: 'Seniors 9/10 Teams',
      group: 'community-seniors',
      notes: '18 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-05': 'NOMS CLOSE', '2027-04-09': '1', '2027-04-16': '2',
        '2027-04-23': '3', '2027-04-30': '4', '2027-05-07': '5', '2027-05-14': '6',
        '2027-05-21': '7', '2027-05-28': '8', '2027-06-04': '9', '2027-06-11': '10',
        '2027-06-18': '11', '2027-07-16': '12', '2027-07-23': '13', '2027-07-30': '14',
        '2027-08-06': '15', '2027-08-13': '16', '2027-08-20': '17', '2027-08-27': '18',
        '2027-09-03': 'SF', '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'seniors-5-6-teams',
      name: 'Seniors 5/6 Teams',
      group: 'community-seniors',
      notes: '20 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-05': 'NOMS CLOSE', '2027-04-09': '1', '2027-04-16': '2',
        '2027-04-23': '3', '2027-04-30': '4', '2027-05-07': '5', '2027-05-14': '6',
        '2027-05-21': '7', '2027-05-28': '8', '2027-06-04': '9', '2027-06-11': '10',
        '2027-06-18': '11', '2027-06-25': '12', '2027-07-02': '13', '2027-07-09': '14',
        '2027-07-16': '15', '2027-07-23': '16', '2027-07-30': '17', '2027-08-06': '18',
        '2027-08-13': '19', '2027-08-20': '20', '2027-08-27': 'CU', '2027-09-03': 'SF',
        '2027-09-10': 'PF', '2027-09-17': 'GF',
      },
    },
    {
      id: 'seniors-7-8-teams',
      name: 'Seniors 7/8 Teams',
      group: 'community-seniors',
      notes: '21 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-05': 'NOMS CLOSE', '2027-04-09': '1', '2027-04-16': '2',
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
        '2027-01-08': 'NOMS OPEN', '2027-02-05': 'NOMS CLOSE', '2027-03-05': 'Foundation 1', '2027-03-12': 'Foundation 2',
        '2027-03-19': 'Foundation 3', '2027-04-16': 'Boys School State Champs (Paradise)', '2027-04-23': '1', '2027-05-07': '2',
        '2027-05-14': '3', '2027-05-21': '4', '2027-05-28': '5', '2027-06-04': '6',
        '2027-06-11': '7', '2027-06-18': '8', '2027-06-25': '9', '2027-07-16': '10',
        '2027-07-23': '11', '2027-07-30': '12', '2027-08-06': '13', '2027-08-13': '14',
        '2027-08-20': '15', '2027-08-27': 'SF', '2027-09-03': 'PF', '2027-09-10': 'GF',
      },
    },
    {
      id: 'juniors-7-8-teams',
      name: 'Juniors 7/8 Teams',
      group: 'community-juniors',
      notes: '14 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-05': 'NOMS CLOSE', '2027-03-05': 'Foundation 1', '2027-03-12': 'Foundation 2',
        '2027-03-19': 'Foundation 3', '2027-04-16': 'Boys School State Champs (Paradise)', '2027-04-23': '1', '2027-05-07': '2',
        '2027-05-14': '3', '2027-05-21': '4', '2027-05-28': '5', '2027-06-04': '6',
        '2027-06-11': '7', '2027-06-18': '8', '2027-06-25': '9', '2027-07-16': '10',
        '2027-07-23': '11', '2027-07-30': '12', '2027-08-06': '13', '2027-08-13': '14',
        '2027-08-20': 'CU', '2027-08-27': 'SF', '2027-09-03': 'PF', '2027-09-10': 'GF',
      },
    },
    {
      id: 'juniors-9-10-teams',
      name: 'Juniors 9/10 Teams',
      group: 'community-juniors',
      notes: '18 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-05': 'NOMS CLOSE', '2027-03-05': 'Foundation 1', '2027-03-12': 'Foundation 2',
        '2027-03-19': 'Foundation 3', '2027-04-16': 'Boys School State Champs (Paradise)', '2027-04-23': '1', '2027-05-07': '2',
        '2027-05-14': '3&4', '2027-05-21': '5', '2027-05-28': '6', '2027-06-04': '7&8',
        '2027-06-11': '9', '2027-06-18': '10', '2027-06-25': '11', '2027-07-16': '12',
        '2027-07-23': '13', '2027-07-30': '14', '2027-08-06': '15', '2027-08-13': '16&17',
        '2027-08-20': '18', '2027-08-27': 'SF', '2027-09-03': 'PF', '2027-09-10': 'GF',
      },
    },
    {
      id: 'miniroos',
      name: 'MiniRoos',
      group: 'miniroos',
      notes: '20 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-05': 'NOMS CLOSE', '2027-03-05': '1', '2027-03-12': '2',
        '2027-03-19': '3', '2027-04-16': 'Boys School State Champs (Paradise)', '2027-04-23': '4', '2027-05-07': '5',
        '2027-05-14': '6', '2027-05-21': '7', '2027-05-28': '8', '2027-06-04': '9',
        '2027-06-11': '10', '2027-06-18': '11', '2027-06-25': '12', '2027-07-16': '13',
        '2027-07-23': '14', '2027-07-30': '15', '2027-08-06': '16', '2027-08-13': '17',
        '2027-08-20': '18', '2027-08-27': '19', '2027-09-03': '20', '2027-09-10': '21',
      },
    },
    {
      id: 'community-juniors-u12',
      name: 'Community Juniors U12',
      group: 'miniroos',
      notes: '20 Rounds',
      plan: {
        '2027-01-08': 'NOMS OPEN', '2027-02-05': 'NOMS CLOSE', '2027-03-05': '1', '2027-03-12': '2',
        '2027-03-19': '3', '2027-04-16': 'Boys School State Champs (Paradise)', '2027-04-23': '4', '2027-05-07': '5',
        '2027-05-14': '6', '2027-05-21': '7', '2027-05-28': '8', '2027-06-04': '9',
        '2027-06-11': '10', '2027-06-18': '11', '2027-06-25': '12', '2027-07-16': '13',
        '2027-07-23': '14', '2027-07-30': '15', '2027-08-06': '16', '2027-08-13': '17',
        '2027-08-20': '18', '2027-08-27': '19', '2027-09-03': '20', '2027-09-10': '21',
      },
    },
    {
      id: 'themed-rounds',
      name: 'Themed rounds',
      group: 'social',
      plan: {
        '2027-03-19': 'Harmony Round', '2027-04-23': 'Anzac Round', '2027-05-07': 'Women’s Football Round', '2027-05-14': 'Women’s Football Round',
        '2027-06-18': 'Magic Round', '2027-07-02': 'Indigenous Round', '2027-07-09': 'Indigenous Round',
      },
    },
    {
      id: 'club-carnivals',
      name: 'Club carnivals',
      group: 'social',
      plan: {
        '2027-05-28': 'Townsville Warriors FC', '2027-06-11': 'MA Olympic FC', '2027-07-02': 'John Bomben', '2027-07-09': 'Kelso Cup',
        '2027-07-16': 'Estates FC', '2027-07-23': 'Wulguru United FC', '2027-07-30': 'Burdekin FC', '2027-08-27': 'Ingham FC',
        '2027-10-15': 'NQ Ummah Care – Townsville', '2027-10-29': 'NQ Ummah Care – Cairns',
      },
    },
    {
      id: 'representative-carnivals-matches',
      name: 'Representative carnivals & matches',
      group: 'social',
      plan: {
        '2027-01-08': 'NFC', '2027-01-15': 'NFC', '2027-04-02': 'MKY', '2027-04-16': 'BFSC',
        '2027-04-30': 'TSV', '2027-06-11': 'Bill Turner', '2027-06-25': 'Sunny', '2027-07-02': 'Moreton Bay',
        '2027-07-09': 'Moreton Bay', '2027-09-24': 'Pacific Champs', '2027-10-01': 'Pacific Champs',
      },
    },
    {
      id: 'girls-united',
      name: 'Girls United',
      group: 'social',
      plan: {
        '2027-01-29': 'Term 1 League - Indoor Comp TBC', '2027-02-05': 'Term 1 League - Indoor Comp TBC', '2027-02-12': 'Term 1 League - Indoor Comp TBC', '2027-02-19': 'Term 1 League - Indoor Comp TBC',
        '2027-02-26': 'Term 1 League - Indoor Comp TBC', '2027-03-05': 'Term 1 League - Indoor Comp TBC', '2027-03-12': 'Term 1 League - Indoor Comp TBC', '2027-03-19': 'Term 1 League - Indoor Comp TBC',
        '2027-04-23': 'Term 2 League', '2027-04-30': 'Term 2 League', '2027-05-07': 'Term 2 League', '2027-05-14': 'Term 2 League',
        '2027-05-21': 'Term 2 League', '2027-05-28': 'Term 2 League', '2027-06-04': 'Term 2 League', '2027-06-11': 'Term 2 League',
        '2027-06-18': 'Term 2 League', '2027-06-25': 'Term 2 League', '2027-07-16': 'Term 3 League', '2027-07-23': 'Term 3 League',
        '2027-07-30': 'Term 3 League', '2027-08-06': 'Term 3 League', '2027-08-13': 'Term 3 League', '2027-08-20': 'Term 3 League',
        '2027-08-27': 'Term 3 League', '2027-09-03': 'Term 3 League', '2027-09-10': 'Term 3 League', '2027-09-17': 'Term 3 League',
        '2027-10-01': 'Carnival', '2027-10-08': 'Term 4 League (Cont.)', '2027-10-15': 'Term 4 League (Cont.)', '2027-10-22': 'Term 4 League (Cont.)',
        '2027-10-29': 'Term 4 League (Cont.)',
      },
    },
    {
      id: 'futsal-and-other',
      name: 'Futsal and other',
      group: 'social',
      plan: {
        '2027-01-01': 'Futsal State',
      },
    },
  ],
};
