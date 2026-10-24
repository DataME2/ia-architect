import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { linkType, refuseSignInLink, welcomeLink } from './sign-in-link.ts';

const FRESH = { hasSignedIn: false, holdsAccess: false, waitingClubIds: ['club-a'] };

describe('refuseSignInLink', () => {
  it('allows a fresh account that only this club is waiting for', () => {
    assert.equal(refuseSignInLink('club-a', 'x@club.test', FRESH), null);
    assert.equal(refuseSignInLink('club-a', 'x@club.test', { ...FRESH, waitingClubIds: [] }), null);
  });

  it('refuses an account in use', () => {
    assert.match(refuseSignInLink('club-a', 'x@club.test', { ...FRESH, hasSignedIn: true }) ?? '', /in use/);
    assert.match(refuseSignInLink('club-a', 'x@club.test', { ...FRESH, holdsAccess: true }) ?? '', /in use/);
  });

  it('refuses an address another club is waiting for (P5)', () => {
    const ties = { ...FRESH, waitingClubIds: ['club-a', 'club-b'] };
    assert.match(refuseSignInLink('club-a', 'x@club.test', ties) ?? '', /Another club/);
  });
});

describe('the link', () => {
  it('verifies only first sign-in types', () => {
    assert.equal(linkType('magiclink'), 'magiclink');
    assert.equal(linkType('signup'), 'signup');
    assert.equal(linkType('recovery'), null);
    assert.equal(linkType(null), null);
  });

  it('opens /welcome with the token encoded', () => {
    assert.equal(
      welcomeLink('https://pitchpeople.test', 'a+b/c', 'magiclink'),
      'https://pitchpeople.test/welcome?token=a%2Bb%2Fc&type=magiclink',
    );
  });
});
