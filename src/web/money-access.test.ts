import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { canReadMoney } from './money-access.ts';

describe('canReadMoney', () => {
  it('lets the four roles in the club\'s matrix read payment plans', () => {
    for (const role of ['admin', 'treasurer', 'registrar', 'digital_technology_manager']) {
      assert.equal(canReadMoney([role]), true, role);
    }
  });

  it('keeps a coach, the committee and the coordinator out of the money (BR78, #73)', () => {
    for (const role of ['coach', 'committee', 'coordinator', 'viewer', 'secretary']) {
      assert.equal(canReadMoney([role]), false, role);
    }
  });

  it('counts any one reading role among several', () => {
    assert.equal(canReadMoney(['coach', 'registrar']), true);
  });
});
