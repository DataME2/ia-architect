/**
 * Download one pack as CSV.
 *
 * Serialised from the stored manifest, not from the current `person` rows —
 * so downloading version 1 in December reproduces exactly what was sent in
 * August, even if a name has been corrected since. That is BR58's "evidence
 * of what you sent" made real rather than asserted.
 */
import { NextResponse } from 'next/server';

import { packToCsv } from '../../../../../domain/submission/serialise.ts';
import { loadPack } from '../../../../../data/packs.ts';
import { loadSeasons, loadTenantContext } from '../../../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../../../data/server.ts';
import { packFileName } from '../../../../../web/pack-view.ts';

export async function GET(
  request: Request,
  context: { readonly params: Promise<{ readonly version: string }> },
) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return new NextResponse('Not signed in.', { status: 401 });

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return new NextResponse('Not found.', { status: 404 });

  const version = Number((await context.params).version);
  if (!Number.isInteger(version) || version < 1) {
    return new NextResponse('Not found.', { status: 404 });
  }

  const requested = new URL(request.url).searchParams.get('season');
  const seasons = await loadSeasons(client, tenant.clubId);

  for (const season of requested !== null ? seasons.filter((s) => s.id === requested) : seasons) {
    const pack = await loadPack(client, tenant.clubId, season.id, version);
    if (pack === null) continue;

    // Rebuilt as a SubmissionPack purely so the same pure serialiser runs
    // here as in the tests. `excluded` is empty because a generated pack's
    // exclusions are a work list, not part of what was transmitted.
    const csv = packToCsv({
      clubId: pack.club_id,
      seasonId: pack.season_id,
      version: pack.version,
      generatedAt: pack.generated_at,
      generatedByUserId: pack.generated_by_user_id,
      includesPhotographs: pack.manifest.some((r) => r.photoPath !== null),
      rows: pack.manifest,
      manifest: pack.manifest.map((r) => r.personId),
      excluded: [],
    });

    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${packFileName(
          tenant.clubName,
          season.name,
          pack.version,
          'pack',
        )}"`,
        // The file holds children's legal names and dates of birth. Nothing
        // between here and the registrar's laptop should keep a copy.
        'cache-control': 'no-store, private',
      },
    });
  }

  return new NextResponse('Not found.', { status: 404 });
}
