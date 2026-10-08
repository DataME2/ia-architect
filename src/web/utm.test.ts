import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isUtmValue, parsePartner, readUtm, utmSlug, withUtm } from './utm.ts';

describe('withUtm — Google Campaign URL Builder format', () => {
  it('appends source, medium and campaign', () => {
    assert.equal(
      withUtm('https://app.example.com/join/abc', { source: 'corner-cafe', medium: 'referral', campaign: 'winter-2027' }),
      'https://app.example.com/join/abc?utm_source=corner-cafe&utm_medium=referral&utm_campaign=winter-2027',
    );
  });
  it('keeps an existing query and replaces an old UTM', () => {
    assert.equal(
      withUtm('https://datamanagementengineer.com/?ref=1&utm_source=x', { source: 'letsdatatalk', medium: 'sponsor', campaign: 'north-star-fc' }),
      'https://datamanagementengineer.com/?ref=1&utm_source=letsdatatalk&utm_medium=sponsor&utm_campaign=north-star-fc',
    );
  });
});

describe('utmSlug and readUtm', () => {
  it('slugs a name the way analytics expects', () => {
    assert.equal(utmSlug('Café Ñandú & Co.'), 'cafe-nandu-co');
    assert.equal(isUtmValue('north-star-fc'), true);
    assert.equal(isUtmValue('-bad'), false);
  });
  it('reads a pair from a landing URL, or nothing', () => {
    assert.deepEqual(readUtm({ utm_source: 'Corner-Cafe', utm_campaign: 'winter-2027' }), { source: 'corner-cafe', campaign: 'winter-2027' });
    assert.equal(readUtm({ utm_source: 'corner-cafe' }), null);
    assert.equal(readUtm({}), null);
  });
});

describe('parsePartner — the club advertises (BR172)', () => {
  const good = { name: 'Corner Café', utmCampaign: 'Winter 2027', rate: '$15', startsOn: '2026-10-10', endsOn: '2027-03-31', method: 'paypal', paypalEmail: 'owner@cornercafe.example.com' };
  it('reads a partner, slugging the source from its name', () => {
    const r = parsePartner(good);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.utmSource, 'corner-cafe');
      assert.equal(r.value.utmCampaign, 'winter-2027');
      assert.equal(r.value.cpaRateCents, 1500);
    }
  });
  it('refuses Stripe, a bad bank account, or no rate', () => {
    assert.equal(parsePartner({ ...good, method: 'stripe', stripeAccountId: 'acct_1A' }).ok, false);
    assert.equal(parsePartner({ ...good, method: 'bank_transfer', accountName: 'Cafe', bsb: '123', accountNumber: '1' }).ok, false);
    assert.equal(parsePartner({ ...good, rate: '' }).ok, false);
  });
});
