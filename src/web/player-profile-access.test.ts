import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { canUploadPhotograph, canWritePlayerProfile } from './player-profile-access.ts';

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
