import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bannerPath, chargeBasis, checkBanner, clickThroughRate, clubShareCents, isSponsorLink, owedCents, parseCampaign, showsSponsors,
  partnerBalance, sumTallies,
} from './sponsor-billing.ts';

const tally = { impressions: 2500, clicks: 40, acquisitions: 3 };

describe('owedCents — the three models', () => {
  it('CPC charges per click', () => assert.equal(owedCents('cpc', 50, tally), 2000));
  it('CPM charges per thousand impressions, rounded to the cent', () => {
    assert.equal(owedCents('cpm', 1200, tally), 3000);
    assert.equal(owedCents('cpm', 333, { ...tally, impressions: 1001 }), 333);
  });
  it('CPA charges per acquisition', () => assert.equal(owedCents('cpa', 1500, tally), 4500));
});

describe('the club share', () => {
  it('is all of a club campaign and its share of a platform one', () => {
    assert.equal(clubShareCents(4500, 10000), 4500);
    assert.equal(clubShareCents(4500, 3000), 1350);
  });
});

describe('reporting helpers', () => {
  it('computes click-through and sums days', () => {
    assert.equal(clickThroughRate(tally), 1.6);
    assert.equal(clickThroughRate({ impressions: 0, clicks: 0, acquisitions: 0 }), null);
    assert.deepEqual(sumTallies([tally, tally]), { impressions: 5000, clicks: 80, acquisitions: 6 });
  });
});

describe('BR169 — adults only', () => {
  it('shows sponsors to an adult or a club officer, never to a 13–17 own account', () => {
    assert.equal(showsSponsors({ age: 40, holdsClubRole: false }), true);
    assert.equal(showsSponsors({ age: 15, holdsClubRole: false }), false);
    assert.equal(showsSponsors({ age: 0, holdsClubRole: true }), true);
  });
});

describe('isSponsorLink', () => {
  it('accepts https only', () => {
    assert.equal(isSponsorLink('https://cafe.example.com.au/offer'), true);
    assert.equal(isSponsorLink('http://cafe.example.com.au'), false);
    assert.equal(isSponsorLink('javascript:alert(1)'), false);
  });
});

describe('parseCampaign', () => {
  const good = {
    sponsorName: 'Corner Café', headline: 'Free coffee for parents on Saturday', linkUrl: 'https://cornercafe.example.com.au',
    pricingModel: 'cpc', rate: '$0.50', audience: ['guardian', 'coach'], startsOn: '2026-10-10', endsOn: '2026-12-31',
  };
  it('reads a good campaign, rate in cents', () => {
    const r = parseCampaign(good);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.rateCents, 50);
  });
  it('refuses a plain-http link, no audience, or dates the wrong way round', () => {
    assert.equal(parseCampaign({ ...good, linkUrl: 'http://x.example.com' }).ok, false);
    assert.equal(parseCampaign({ ...good, audience: [] }).ok, false);
    assert.equal(parseCampaign({ ...good, endsOn: '2026-10-01' }).ok, false);
  });
});

describe('checkBanner — the platform hosts it (decision 17)', () => {
  it('accepts a PNG, JPEG or WebP up to 1 MB', () => {
    assert.deepEqual(checkBanner({ type: 'image/png', size: 50_000 }), { ok: true, extension: 'png' });
    assert.equal(checkBanner({ type: 'image/webp', size: 1024 * 1024 }).ok, true);
  });
  it('refuses another type, an empty file or one too large', () => {
    assert.equal(checkBanner({ type: 'image/gif', size: 10 }).ok, false);
    assert.equal(checkBanner({ type: 'image/png', size: 0 }).ok, false);
    assert.equal(checkBanner({ type: 'image/png', size: 1024 * 1024 + 1 }).ok, false);
  });
  it('files under the club', () => assert.equal(bannerPath('c', 'k', 7, 'png'), 'c/k-7.png'));
});

describe('chargeBasis — each model in its own terms', () => {
  it('CPC: clicks × rate', () => assert.equal(chargeBasis('cpc', 50, tally), '40 clicks × $0.50'));
  it('CPM: impressions ÷ 1,000 × rate', () => assert.equal(chargeBasis('cpm', 500, tally), '2,500 impressions ÷ 1,000 × $5.00'));
  it('CPA: acquisitions × rate', () => assert.equal(chargeBasis('cpa', 1000, tally), '3 acquisitions × $10.00'));
  it('says one click, not one clicks', () => assert.equal(chargeBasis('cpc', 50, { ...tally, clicks: 1 }), '1 click × $0.50'));
});

describe('partnerBalance — BR172, completed registrations only', () => {
  it('earns per completed registration and owes the unpaid ones', () =>
    assert.deepEqual(partnerBalance({ cpaRateCents: 1500, completed: 3, paidAcquisitions: 1, paidCents: 1500 }),
      { earnedCents: 4500, paidCents: 1500, owedCents: 3000, unpaid: 2 }));
  it('never owes a negative amount', () =>
    assert.equal(partnerBalance({ cpaRateCents: 1500, completed: 1, paidAcquisitions: 2, paidCents: 3000 }).owedCents, 0));
});
