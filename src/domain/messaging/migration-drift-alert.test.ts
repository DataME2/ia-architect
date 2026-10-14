import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { composeMigrationDriftAlert, type MigrationDriftAlertInput } from './migration-drift-alert.ts';

const neverApplied: MigrationDriftAlertInput = {
  expectedVersion: '0090',
  expectedName: '0090_a_migration_proves_it_ran',
  appliedVersion: null,
  appliedName: null,
};

const stale: MigrationDriftAlertInput = {
  expectedVersion: '0090',
  expectedName: '0090_a_migration_proves_it_ran',
  appliedVersion: '0089',
  appliedName: '0089_a_player_reads_their_own_role',
};

describe('composeMigrationDriftAlert', () => {
  it('names the version the build expects', () => {
    const alert = composeMigrationDriftAlert(stale);
    assert.match(alert.subject, /0090/);
    assert.match(alert.body, /0090/);
    assert.match(alert.body, /0090_a_migration_proves_it_ran/);
  });

  it('names what was actually found applied', () => {
    const alert = composeMigrationDriftAlert(stale);
    assert.match(alert.body, /0089/);
    assert.match(alert.body, /0089_a_player_reads_their_own_role/);
  });

  it('says plainly when nothing has ever recorded itself, rather than naming a null version', () => {
    const alert = composeMigrationDriftAlert(neverApplied);
    assert.doesNotMatch(alert.body, /null/);
    assert.match(alert.body, /No migration has ever recorded itself/);
  });

  it('warns about the create-policy-if-not-exists trap for a manual stopgap fix', () => {
    const alert = composeMigrationDriftAlert(stale);
    assert.match(alert.body, /create policy if not exists/);
  });
});
