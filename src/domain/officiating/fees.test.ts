import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  claimable,
  money,
  rateFor,
  type ClaimableInput,
  type FeeRate,
  type Priceable,
} from './fees.ts';

const rate = (over: Partial<FeeRate> = {}): FeeRate => ({
  role: 'referee',
  competition: null,
  classification: null,
  appointedBy: null,
  amountCents: 4000,
  ...over,
});

const game = (over: Partial<Priceable> = {}): Priceable => ({
  role: 'referee',
  competition: 'Division 3',
  classification: 'Level 4',
  appointedBy: 'club',
  ...over,
});

test('rateFor', async (t) => {
  await t.test('an unpriced combination is "none", never zero', () => {
    // A claim raised at $0.00 is one nobody queries until the referee does.
    assert.equal(rateFor([], game()).kind, 'none');
    assert.equal(rateFor([rate({ role: 'fourth_official' })], game()).kind, 'none');
  });

  await t.test('a catch-all row prices anything for its role', () => {
    const out = rateFor([rate({ amountCents: 4000 })], game());
    assert.equal(out.kind === 'rate' && out.amountCents, 4000);
  });

  await t.test('the role must match exactly — a rate is always for something', () => {
    const rates = [rate({ role: 'assistant_referee', amountCents: 2500 })];
    assert.equal(rateFor(rates, game({ role: 'referee' })).kind, 'none');
    assert.equal(
      rateFor(rates, game({ role: 'assistant_referee' })).kind === 'rate',
      true,
    );
  });

  await t.test('competition beats classification beats appointing party', () => {
    // Fixed precedence rather than a count of named dimensions: counting
    // would let two rows tie, and a tie would be broken by insertion order
    // — a club's rate depending on which row it happened to write first.
    const rates = [
      rate({ amountCents: 4000 }),
      rate({ appointedBy: 'club', amountCents: 4500 }),
      rate({ classification: 'Level 4', amountCents: 5000 }),
      rate({ competition: 'Division 3', amountCents: 6000 }),
    ];
    const out = rateFor(rates, game());
    assert.equal(out.kind === 'rate' && out.amountCents, 6000);
  });

  await t.test('falls back through the levels when the specific row is absent', () => {
    const rates = [rate({ amountCents: 4000 }), rate({ classification: 'Level 4', amountCents: 5000 })];
    assert.equal(
      rateFor(rates, game({ classification: 'Level 4' })).kind === 'rate' &&
        (rateFor(rates, game({ classification: 'Level 4' })) as { amountCents: number }).amountCents,
      5000,
    );
    const other = rateFor(rates, game({ classification: 'MiniRef 5.0' }));
    assert.equal(other.kind === 'rate' && other.amountCents, 4000);
  });

  await t.test('the appointing party changes the rate — which is BR16', () => {
    // The user's own case: the same person, the same club, paid differently
    // depending on who appointed them.
    const rates = [
      rate({ appointedBy: 'club', amountCents: 4000 }),
      rate({ appointedBy: 'association', amountCents: 7500 }),
    ];
    const byClub = rateFor(rates, game({ appointedBy: 'club' }));
    const byFq = rateFor(rates, game({ appointedBy: 'association' }));
    assert.equal(byClub.kind === 'rate' && byClub.amountCents, 4000);
    assert.equal(byFq.kind === 'rate' && byFq.amountCents, 7500);
  });

  await t.test('competition matching survives a club typing it differently', () => {
    // `fixture.competition` is free text until C11 exists. "Div 3" and
    // "div 3 " are not two competitions.
    const rates = [rate({ competition: 'div 3 ', amountCents: 6000 })];
    const out = rateFor(rates, game({ competition: ' Div 3' }));
    assert.equal(out.kind === 'rate' && out.amountCents, 6000);
  });

  await t.test('a missing dimension does not match a row that names one', () => {
    // A fixture with no competition recorded is not every competition.
    const rates = [rate({ competition: 'Division 3', amountCents: 6000 })];
    assert.equal(rateFor(rates, game({ competition: null })).kind, 'none');
  });

  await t.test('two rows for one cell are reported, never silently picked', () => {
    // The database refuses this with `unique nulls not distinct`, so
    // reaching it means the constraint is gone. Choosing one would hide
    // that until two identical games paid different amounts.
    const rates = [
      rate({ competition: 'Division 3', amountCents: 6000 }),
      rate({ competition: 'Division 3', amountCents: 6500 }),
    ];
    const out = rateFor(rates, game());
    assert.equal(out.kind, 'ambiguous');
    assert.equal(out.kind === 'ambiguous' && out.candidates.length, 2);
  });
});

test('claimable', async (t) => {
  const base: ClaimableInput = {
    fixtureStatus: 'played',
    verified: true,
    officiated: true,
    abandonmentNote: null,
    alreadyClaimed: false,
  };

  await t.test('a verified, played, unclaimed match is claimable', () => {
    assert.equal(claimable(base).kind, 'yes');
  });

  await t.test('BR13 — an unverified match is not', () => {
    const out = claimable({ ...base, verified: false });
    assert.equal(out.kind === 'no' && out.rule, 'BR13');
  });

  await t.test('BR13 — nor one where the verification says they did not officiate', () => {
    const out = claimable({ ...base, officiated: false });
    assert.equal(out.kind === 'no' && out.rule, 'BR13');
  });

  await t.test('BR17 — a cancelled fixture is refused before verification is even asked', () => {
    // A cancelled match is not a match somebody failed to verify, and
    // saying so would send a coordinator looking for a verification that
    // should never exist.
    const out = claimable({ ...base, fixtureStatus: 'cancelled', verified: false });
    assert.equal(out.kind === 'no' && out.rule, 'BR17');
  });

  await t.test('BR18 — an abandoned match needs the explanation first', () => {
    const out = claimable({ ...base, fixtureStatus: 'abandoned' });
    assert.equal(out.kind === 'no' && out.rule, 'BR18');

    const explained = claimable({
      ...base,
      fixtureStatus: 'abandoned',
      abandonmentNote: 'lightning, called at 65 minutes',
    });
    assert.equal(explained.kind, 'yes');
  });

  await t.test('BR18 — whitespace is not an explanation', () => {
    const out = claimable({ ...base, fixtureStatus: 'abandoned', abandonmentNote: '   ' });
    assert.equal(out.kind === 'no' && out.rule, 'BR18');
  });

  await t.test('BR14 — a second claim is refused, and refused first', () => {
    // Checked ahead of everything else because it is the failure that costs
    // money rather than time.
    const out = claimable({ ...base, alreadyClaimed: true, verified: false });
    assert.equal(out.kind === 'no' && out.rule, 'BR14');
  });

  await t.test('a forfeited match is still claimable — somebody turned up', () => {
    assert.equal(claimable({ ...base, fixtureStatus: 'forfeited' }).kind, 'yes');
  });
});

test('money', async (t) => {
  await t.test('formats what a treasurer reconciles against', () => {
    assert.equal(money(4000), '$40.00');
    assert.equal(money(0), '$0.00');
  });

  await t.test('does not lose the odd cent', () => {
    assert.equal(money(4033), '$40.33');
  });
});
