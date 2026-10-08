import { NextResponse, type NextRequest } from 'next/server';

import { clickThrough } from '../../../data/sponsors.ts';
import { createRequestClient } from '../../../data/server.ts';
import { isSponsorLink } from '../../../web/sponsor-billing.ts';

/**
 * A sponsor click (scope 84; BR170, decision 17). Counted once per viewer
 * per day by the database, then redirected to the sponsor's https link with
 * nothing about the viewer attached — no query string, no referrer.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const client = await createRequestClient();
  const link = await clickThrough(client, campaignId);
  if (link === null || !isSponsorLink(link)) {
    return NextResponse.redirect(new URL('/me', request.url));
  }
  const response = NextResponse.redirect(link, 302);
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
