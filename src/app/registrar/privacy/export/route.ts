import { loadTenantContext } from '../../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../../data/server.ts';
import { exportClubData } from '../../../../data/privacy.ts';

export const dynamic = 'force-dynamic';

/**
 * BR68 — the club's complete data, as one file.
 *
 * A route rather than an action because the answer is a download, and the
 * authorisation is the database's: `export_club_data` refuses anyone who is
 * not an administrator of that club, so this handler carries no check of its
 * own that could drift from it.
 */
export async function GET() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return new Response('Sign in first.', { status: 401 });

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return new Response('No club.', { status: 404 });

  const data = await exportClubData(client, tenant.clubId);
  if (data !== null && typeof data === 'object' && 'error' in data) {
    return new Response(String((data as { error: string }).error), { status: 403 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = tenant.clubName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${safeName}-${stamp}.json"`,
    },
  });
}
