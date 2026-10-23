import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calendarsForSeason,
  changeSentence,
  competitionOptions,
  describeCompetition,
  mayEditCompetitions,
  parseCompetitionChoice,
} from './team-competitions.ts';

const CAL = 'fq-2027-seq-advanced-metro';

describe('a team plays in a competition (scope 102, BR179)', () => {
  it('lets exactly four roles change it', () => {
    for (const r of ['admin', 'registrar', 'coordinator', 'program_coordinator']) assert.ok(mayEditCompetitions([r]), r);
    for (const r of ['coach', 'treasurer', 'committee', 'technical_director']) assert.ok(!mayEditCompetitions([r]), r);
    assert.ok(mayEditCompetitions(['coach', 'registrar']));
  });

  it('offers the calendars a season covers, and none it does not', () => {
    assert.equal(calendarsForSeason('2027-01-01', '2027-12-31').length, 1);
    assert.equal(calendarsForSeason('2026-10-01', '2027-09-30').length, 1);
    assert.equal(calendarsForSeason('2026-01-01', '2026-12-31').length, 0);
  });

  it('offers every competition once, grouped as the calendar groups them', () => {
    const groups = competitionOptions(calendarsForSeason('2027-01-01', '2027-12-31'));
    const values = groups.flatMap((g) => g.options.map((o) => o.value));
    assert.equal(values.length, 38);
    assert.equal(new Set(values).size, 38);
    assert.equal(groups[0]?.label, 'Seniors');
  });

  it('accepts only a choice the calendar knows', () => {
    assert.deepEqual(parseCompetitionChoice(`${CAL}/npl-men`), { calendarId: CAL, competitionRef: 'npl-men' });
    assert.equal(parseCompetitionChoice(`${CAL}/premier-league`), null);
    assert.equal(parseCompetitionChoice('npl-men'), null);
    assert.equal(parseCompetitionChoice(`${CAL}/npl-men/extra`), null);
    assert.equal(parseCompetitionChoice(null), null);
  });

  it('names a competition and links to its season, or shows the id when the calendar no longer has it', () => {
    const d = describeCompetition(CAL, 'qpl-1-women');
    assert.equal(d.name, 'QPL 1 Women');
    assert.equal(d.href, `/seasons/${CAL}?follow=qpl-1-women`);
    assert.deepEqual(describeCompetition(CAL, 'gone'), { name: 'gone', region: CAL, known: false, href: null });
  });

  it('says who changed what, in one sentence', () => {
    const base = { changedAt: '2026-10-23T04:05:00Z', teamName: 'U14 Girls', calendarId: CAL, competitionRef: 'qpl-1-women', changedByName: 'Sam Lee' };
    assert.equal(changeSentence({ ...base, action: 'entered' }), 'Sam Lee entered U14 Girls in QPL 1 Women.');
    assert.equal(changeSentence({ ...base, action: 'withdrawn' }), 'Sam Lee withdrew U14 Girls from QPL 1 Women.');
  });
});
