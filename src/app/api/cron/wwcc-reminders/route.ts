import { createAdminClient } from '../../../../data/client.ts';
import { readCronSecret } from '../../../../data/env.ts';
import { sendWwccReminders } from '../../../../data/wwccReminders.ts';

export const dynamic = 'force-dynamic';

/**
 * BR51's six-monthly reminder, run nightly (scope 48, WP2).
 *
 * Vercel Cron has no signed-in user, so `createAdminClient('scheduled-job')`
 * is the deliberate exception — the reason the codebase's own type carries
 * exactly this case in its name. The route is otherwise ordinary: check the
 * caller, list clubs, call the same function a screen could call.
 *
 * Nightly rather than every six months, because the reminder is per
 * *clearance*, not per club — a clearance six months and one day overdue
 * should not wait for whatever day of the month a coarser schedule landed
 * on, and a nightly run costs nothing when `app_wwcc_due_for_reminder`
 * returns nothing due.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = readCronSecret();
  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${secret}`) {
    return new Response('Not authorised.', { status: 401 });
  }

  const client = createAdminClient('scheduled-job');

  const { data: clubs, error } = await client.from('club').select('id, name');
  if (error !== null) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results = [];
  for (const club of clubs ?? []) {
    // Sequential, not Promise.all: each iteration sends at most one email
    // and the total club count is small enough that there is nothing to
    // gain from concurrency and a shared transport rate limit to lose.
    results.push(await sendWwccReminders(client, club.id as string, club.name as string));
  }

  return Response.json({
    ok: true,
    clubsChecked: results.length,
    remindersSent: results.filter((r) => r.outcome === 'sent').length,
    results: results.filter((r) => r.outcome !== 'none-due'),
  });
}
