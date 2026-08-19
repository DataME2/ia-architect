/**
 * Download the exclusion list for the pack that *would* be generated now.
 *
 * Deliberately computed live rather than stored: the people left out are a
 * work list, not evidence of a transmission, and the registrar wants the
 * current one. Shipped as a file because a list shown on screen and then
 * navigated away from is a list nobody works through — and these are exactly
 * the players who otherwise arrive on match day ineligible (BR43, BR47).
 */
import { NextResponse } from 'next/server';

import { buildSubmissionPack } from '../../../../../domain/submission/build-pack.ts';
import { exclusionsToCsv } from '../../../../../domain/submission/serialise.ts';
import { nextPackVersion } from '../../../../../data/packs.ts';
import { loadPackCandidates, loadSeasons, loadTenantContext } from '../../../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../../../data/server.ts';
import { packFileName } from '../../../../../web/pack-view.ts';
import { todayIn } from '../../../../../web/today.ts';

export async function GET(request: Request) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return new NextResponse('Not signed in.', { status: 401 });

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return new NextResponse('Not found.', { status: 404 });

  const seasons = await loadSeasons(client, tenant.clubId);
  const requested = new URL(request.url).searchParams.get('season');
  const season = seasons.find((s) => s.id === requested) ?? seasons[0];
  if (season === undefined) return new NextResponse('Not found.', { status: 404 });

  const candidates = await loadPackCandidates(client, tenant.clubId, season.id);
  const version = await nextPackVersion(client, tenant.clubId, season.id);

  const preview = buildSubmissionPack(candidates, {
    clubId: tenant.clubId,
    seasonId: season.id,
    version,
    generatedAt: new Date().toISOString(),
    generatedByUserId: user.id,
    includePhotographs: false,
    asAt: todayIn(),
  });

  return new NextResponse(exclusionsToCsv(preview), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${packFileName(
        tenant.clubName,
        season.name,
        version,
        'exclusions',
      )}"`,
      'cache-control': 'no-store, private',
    },
  });
}
