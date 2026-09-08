import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  RENEWAL_WINDOW_DAYS,
  isLicensed,
  standing,
  summarise,
  type ClubLicence,
  type PlatformClub,
} from './platform-view.ts';

const TODAY = '2026-09-04';

const licence = (over: Partial<ClubLicence> = {}): ClubLicence => ({
  state: 'active',
  startsOn: '2026-01-01',
  endsOn: '2026-12-31',
  feeCents: 1_200_000,
  currency: 'AUD',
  note: null,
  ...over,
});

test('no licence is not the same as a lapsed one', () => {
  assert.equal(standing(null, TODAY).kind, 'none');
  assert.equal(standing(licence({ endsOn: '2026-08-01' }), TODAY).kind, 'lapsed');
});

test('a term that ended is lapsed however the state column reads', () => {
  // The date is the fact; the state is the intent. Trusting the column is
  // how a business loses track of who is actually paying.
  const s = standing(licence({ state: 'active', endsOn: '2026-08-25' }), TODAY);
  assert.equal(s.kind, 'lapsed');
  assert.equal(s.kind === 'lapsed' && s.daysAgo, 10);
});

test('the renewal window is a warning, not an expiry', () => {
  const soon = standing(licence({ endsOn: '2026-10-01' }), TODAY);
  assert.equal(soon.kind, 'expiring');
  assert.equal(isLicensed(soon), true, 'expiring still entitles a club to use the product');

  const later = standing(licence({ endsOn: '2027-06-01' }), TODAY);
  assert.equal(later.kind, 'active');
});

test('the window boundary is inclusive on the last day', () => {
  const edge = new Date(Date.UTC(2026, 8, 4) + RENEWAL_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  assert.equal(standing(licence({ endsOn: edge }), TODAY).kind, 'expiring');
});

test('suspended and ended entitle nobody, whatever the dates say', () => {
  for (const state of ['suspended', 'ended'] as const) {
    const s = standing(licence({ state, endsOn: '2027-12-31' }), TODAY);
    assert.equal(s.kind, state);
    assert.equal(isLicensed(s), false);
  }
});

test('a trial is a licence while it lasts', () => {
  assert.equal(isLicensed(standing(licence({ state: 'trial' }), TODAY)), true);
  assert.equal(standing(licence({ state: 'trial', endsOn: '2026-01-02' }), TODAY).kind, 'lapsed');
});

const club = (
  name: string,
  lic: ClubLicence | null,
  isDemo = false,
): PlatformClub & { licence: ClubLicence | null; isDemo: boolean } => ({
  clubId: name,
  name,
  jurisdiction: 'AU-QLD',
  createdAt: '2026-01-01T00:00:00Z',
  adminCount: 1,
  seasonCount: 1,
  primary: null,
  secondary: null,
  licence: lic,
  isDemo,
});

test('the demonstration club is never counted as a customer', () => {
  // It is ours. Counting it overstates the business by one club for as long
  // as the demo exists.
  const s = summarise(
    [club('North Star FC', licence()), club('Riverbend Rovers FC (DEMO)', null, true)],
    TODAY,
  );
  assert.equal(s.supported, 1);
  assert.equal(s.unlicensed, 0);
});

test('the counts separate paying, trialling, expiring, lapsed and never-licensed', () => {
  const s = summarise(
    [
      club('A', licence()),
      club('B', licence({ state: 'trial', feeCents: null })),
      club('C', licence({ endsOn: '2026-10-01' })),
      club('D', licence({ endsOn: '2026-01-02' })),
      club('E', null),
    ],
    TODAY,
  );
  assert.equal(s.supported, 5);
  assert.equal(s.trialling, 1);
  assert.equal(s.expiring, 1);
  assert.equal(s.lapsed, 1);
  assert.equal(s.unlicensed, 1);
  assert.equal(s.licensed, 3, 'active + trial + expiring');
});

test('only money actually agreed is counted', () => {
  // A trial with no fee contributes nothing. Inventing a number here is
  // how a pipeline figure becomes a revenue figure.
  const s = summarise(
    [club('A', licence({ feeCents: 1_200_000 })), club('B', licence({ state: 'trial', feeCents: null }))],
    TODAY,
  );
  assert.equal(s.annualValueCents, 1_200_000);
});

test('a lapsed club contributes no value even though it has a fee recorded', () => {
  const s = summarise([club('A', licence({ endsOn: '2026-08-01', feeCents: 1_200_000 }))], TODAY);
  assert.equal(s.licensed, 0);
  assert.equal(s.annualValueCents, 0);
});
