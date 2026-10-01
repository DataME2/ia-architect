import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  canRecordAppearance,
  canUploadPhotograph,
  canWritePlayerProfile,
  recorderLabel,
} from './player-profile-access.ts';

describe('canWritePlayerProfile', () => {
  it('lets the roles that pick teams record the profile', () => {
    for (const role of ['admin', 'registrar', 'coordinator', 'coach', 'technical_director']) {
      assert.equal(canWritePlayerProfile([role]), true, role);
    }
  });

  it('gives committee, treasurer and viewer no form: the database would refuse the save', () => {
    for (const role of ['committee', 'treasurer', 'viewer']) {
      assert.equal(canWritePlayerProfile([role]), false, role);
    }
  });

  it('counts any one writing role among several', () => {
    assert.equal(canWritePlayerProfile(['committee', 'coach']), true);
  });

  it('gives no form to a viewer with no club role at all', () => {
    assert.equal(canWritePlayerProfile([]), false);
  });
});

describe('canUploadPhotograph', () => {
  it('lets only the admin and registrar attach a photograph', () => {
    assert.equal(canUploadPhotograph(['admin']), true);
    assert.equal(canUploadPhotograph(['registrar']), true);
  });

  it('shows the photograph to coach and committee but gives them no upload (BR157)', () => {
    for (const role of ['coach', 'coordinator', 'committee', 'treasurer']) {
      assert.equal(canUploadPhotograph([role]), false, role);
    }
  });
});

describe('canRecordAppearance', () => {
  it('lets the admin, registrar and coordinator record for any player', () => {
    for (const role of ['admin', 'registrar', 'coordinator']) {
      assert.equal(canRecordAppearance([role], false), true, role);
    }
  });

  it('lets the player\'s own coach record, and no other coach (BR158)', () => {
    assert.equal(canRecordAppearance(['coach'], true), true);
    assert.equal(canRecordAppearance(['coach'], false), false);
  });

  it('gives committee, treasurer and the technology roles no form', () => {
    for (const role of ['committee', 'treasurer', 'digital_technology_manager', 'program_coordinator']) {
      assert.equal(canRecordAppearance([role], false), false, role);
    }
  });
});

describe('recorderLabel', () => {
  it('names the recorder and the day', () => {
    assert.equal(recorderLabel('Carlos Coach', '2026-05-02T09:14:00+00:00'), 'Carlos Coach · 2026-05-02');
  });

  it("dates the record in the club's timezone, not UTC", () => {
    // 22:30 UTC on 1 May is 08:30 on 2 May in Brisbane.
    assert.equal(recorderLabel('Ana', '2026-05-01T22:30:00Z'), 'Ana · 2026-05-02');
  });

  it('says when a row predates the database keeping its recorder', () => {
    assert.equal(recorderLabel(null, '2026-05-02T09:14:00+00:00'), 'Recorder not on file · 2026-05-02');
  });

  it('says plainly when the account is linked to nobody', () => {
    assert.equal(
      recorderLabel(undefined, '2026-05-02T09:14:00+00:00'),
      'An account with no linked person · 2026-05-02',
    );
  });
});
