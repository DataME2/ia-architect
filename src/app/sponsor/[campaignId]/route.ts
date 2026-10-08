import { NextResponse, type NextRequest } from 'next/server';

import { clickThrough } from '../../../data/sponsors.ts';
import { createRequestClient } from '../../../data/server.ts';
import { isSponsorLink } from '../../../web/sponsor-billing.ts';
import { withUtm } from '../../../web/utm.ts';

/**
 * A sponsor click (scope 84; BR170, decision 17). Counted once per viewer
 * per day by the database, then redirected to the sponsor's https link with
 * nothing about the viewer attached: only the campaign's UTM (decision 17,
 * scope 85), and no referrer.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const client = await createRequestClient();
  const link = await clickThrough(client, campaignId);
  if (link === null || !isSponsorLink(link)) {
    return NextResponse.redirect(new URL('/me', request.url));
  }
  // Decision 17 extended: the sponsor learns the visit came from this club's
  // campaign (so it can measure CPA in its own analytics), never who made it.
  const response = NextResponse.redirect(
    withUtm(link, { source: 'letsdatatalk', medium: 'sponsor', campaign: `sponsor-${campaignId.slice(0, 8)}` }),
    302,
  );
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
