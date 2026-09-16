import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  enabledProgramNames,
  parseEnablement,
  parseResolution,
} from './governance-view.ts';
import type { VoucherProgramEnablement } from '../domain/governance/term.ts';

describe('parseResolution — BR123, a Committee decision needs a date and a summary', () => {
  const valid = {
    termId: 't1',
    decidedOn: '2026-03-01',
    summary: 'Approve Play On! as a Voucher Program.',
    movedByPersonId: '',
    category: 'general',
  };

  it('accepts a complete resolution, defaulting movedByPersonId to null', () => {
    const result = parseResolution(valid);
    assert.equal(result.ok, true);
    assert.ok(result.ok && result.movedByPersonId === null);
  });

  it('carries the mover through when one is named', () => {
    const result = parseResolution({ ...valid, movedByPersonId: 'p1' });
    assert.ok(result.ok && result.movedByPersonId === 'p1');
  });

  it('refuses no term', () => {
    const result = parseResolution({ ...valid, termId: '' });
    assert.equal(result.ok, false);
  });

  it('refuses a date that is not a real calendar date', () => {
    const result = parseResolution({ ...valid, decidedOn: '2026-02-30' });
    assert.equal(result.ok, false);
  });

  it('refuses a blank summary — a resolution nobody wrote is not one', () => {
    const result = parseResolution({ ...valid, summary: '   ' });
    assert.equal(result.ok, false);
  });

  it('defaults an unrecognised category to general, rather than refusing', () => {
    const result = parseResolution({ ...valid, category: 'nonsense' });
    assert.ok(result.ok && result.category === 'general');
  });

  it('keeps voucher_program when that is what was chosen', () => {
    const result = parseResolution({ ...valid, category: 'voucher_program' });
    assert.ok(result.ok && result.category === 'voucher_program');
  });
});

describe('parseEnablement — BR21, naming the program and the resolution that approved it', () => {
  it('accepts a program and a chosen resolution', () => {
    const result = parseEnablement({ program: 'Play On!', resolutionId: 'r1' });
    assert.deepEqual(result, { ok: true, program: 'Play On!', resolutionId: 'r1' });
  });

  it('refuses a blank program name', () => {
    const result = parseEnablement({ program: '  ', resolutionId: 'r1' });
    assert.equal(result.ok, false);
  });

  it('refuses no resolution chosen', () => {
    const result = parseEnablement({ program: 'Play On!', resolutionId: '' });
    assert.equal(result.ok, false);
  });
});

describe('enabledProgramNames — matched the way the database itself compares BR21', () => {
  const enablement = (program: string): VoucherProgramEnablement => ({
    id: 'e1',
    program,
    resolutionId: 'r1',
    enabledAt: '2026-01-01T00:00:00Z',
  });

  it('is trimmed and case-insensitive, the same as assert_voucher_program_is_enabled', () => {
    const names = enabledProgramNames([enablement('Play On!')]);
    assert.ok(names.has('play on!'));
    assert.ok(names.has(' Play On! '.trim().toLowerCase()));
  });

  it('does not match a different program', () => {
    const names = enabledProgramNames([enablement('Play On!')]);
    assert.ok(!names.has('kickstart'));
  });
});
