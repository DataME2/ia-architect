import { createAdminClient } from '../../../../data/client.ts';
import { readCronSecret } from '../../../../data/env.ts';
import { withdrawLapsedClearances } from '../../../../data/clearanceWithdrawal.ts';
import { notifyLapseVacancies } from '../../../../data/notifications.ts';

export const dynamic = 'force-dynamic';

/**
 * BR50's expiry half, run nightly (scope 50).
 *
 * Revocation is a write and withdraws immediately, by trigger. **Expiry is
 * the passage of time and writes nothing**, so without this a card that
 * lapsed overnight would leave every appointment standing until somebody
 * happened to edit the clearance row. That is the gap R20.7 named.
 *
 * Built beside scope 48's reminder route rather than folded into it. They
 * run on the same schedule and share a shape, and they are different acts:
 * one sends an email a secretary may ignore, the other removes an official
 * from a fixture. A single route that did both would report one status for
 * two outcomes, and the one that matters would be the one hidden.
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
  const notices = [];
  for (const club of clubs ?? []) {
    // Sequential for the same reason the reminder route is: a small number
    // of clubs, and nothing to gain from concurrency against one database.
    results.push(
      await withdrawLapsedClearances(client, club.id as string, club.name as string),
    );
    // After the sweep, not instead of it. A club with no new lapse tonight
    // can still owe a notice whose send failed last night.
    notices.push(
      ...(await notifyLapseVacancies(client, club.id as string, club.name as string)),
    );
  }

  const withdrawn = results.reduce((total, r) => total + r.withdrawn, 0);
  const told = notices.reduce(
    (total, n) => total + (n.holderNotified > 0 ? 1 : 0) + (n.coordinatorNotified > 0 ? 1 : 0),
    0,
  );

  return Response.json({
    ok: true,
    clubsChecked: results.length,
    withdrawn,
    // Messages actually sent, not vacancies covered: two people are told
    // about four vacancies in two emails, and a count of four would read
    // as eight messages nobody received.
    told,
    // Only the clubs where something actually changed. A nightly job whose
    // output is a list of zeroes is a nightly job nobody reads.
    results: results.filter((r) => r.withdrawn > 0),
    notices,
  });
}
