/**
 * The alert that tells the platform's own operators a migration never
 * reached the connected database.
 *
 * Sibling to `platform-alert.ts` deliberately — same reasoning as BR146's
 * enquiry alert applies here with one word changed: the recipient is the
 * platform's own operator, not a data subject, so there is no club, no
 * unsubscribe, and no `MessageTemplate`.
 *
 * Pure, like every alert beside it: what it says is testable without a
 * provider.
 */
import type { PlatformAlert } from './platform-alert.ts';

export interface MigrationDriftAlertInput {
  readonly expectedVersion: string;
  readonly expectedName: string;
  readonly appliedVersion: string | null;
  readonly appliedName: string | null;
}

export function composeMigrationDriftAlert(input: MigrationDriftAlertInput): PlatformAlert {
  const subject = `Migration drift: ${input.expectedVersion} has not reached the database`;

  const applied =
    input.appliedVersion === null
      ? 'No migration has ever recorded itself in schema_migration_log — either this is a brand new ' +
        'project, or the receipt table itself did not apply.'
      : `The database's newest recorded migration is ${input.appliedVersion} (${input.appliedName ?? 'unnamed'}).`;

  return {
    subject,
    body:
      `The deployed build expects migration ${input.expectedVersion} ` +
      `(${input.expectedName}) to be the newest one applied to the connected Supabase project.\n\n` +
      `${applied}\n\n` +
      'This has happened before (committee_resolution, scope 57/61; person_role_select_family, ' +
      'scope 93) — the GitHub integration applies a migration with no second confirmation, and ' +
      'nothing told anyone it had not run until a registrar or a QA pass hit the gap directly.\n\n' +
      'Check the Supabase dashboard\'s migration/integration status for a failed or pending sync. ' +
      'If you apply the missing migration by hand as a stopgap, remember Postgres has no ' +
      '"create policy if not exists" — if the integration later catches up and tries to run the ' +
      'same migration again, it will fail on "already exists" unless schema_migration_log already ' +
      'shows it applied.\n',
  };
}
