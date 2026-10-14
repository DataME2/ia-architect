import { createAdminClient } from '../../../../data/client.ts';
import { readCronSecret } from '../../../../data/env.ts';
import { checkMigrationDrift } from '../../../../data/migration-drift.ts';

export const dynamic = 'force-dynamic';

/**
 * Hourly: does the connected database's newest migration match what this
 * build expects (scope 94)?
 *
 * Twice now a migration merged to `main` never reached the connected
 * Supabase project, and the first anyone knew was a crash or a missing
 * role somebody else hit directly. The gap between "merged" and "actually
 * applied" is Supabase's own GitHub integration, which this application
 * cannot watch — so this watches the one thing it can: whether
 * `schema_migration_log`'s newest row is the one this deployment expects.
 *
 * Hourly rather than nightly like the WWCC reminder: a merge can happen at
 * any hour, and the whole point is catching the gap before a person does.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = readCronSecret();
  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${secret}`) {
    return new Response('Not authorised.', { status: 401 });
  }

  const client = createAdminClient('scheduled-job');
  const result = await checkMigrationDrift(client);

  return Response.json({ ok: true, ...result });
}
