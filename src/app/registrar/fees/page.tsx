import { redirect } from 'next/navigation';

import { loadRates, loadSchedules } from '../../../data/fees.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { gaps, standings } from '../../../web/fee-schedule-form.ts';
import { todayIn } from '../../../web/today.ts';
import { AddRate, NewSchedule, RateTable, ScheduleList } from './FeeForms.tsx';

export const dynamic = 'force-dynamic';

/**
 * What the club pays its match officials (BR115, BR116).
 *
 * The schema and the rate resolution have existed since migration 0026 and
 * `src/domain/officiating/fees.ts`. This is the screen that had never been
 * built — scope 34's WP2 — and without it every club had no rates, every
 * lookup returned "no rate", and **no official could be paid at all**.
 *
 * **The platform seeds nothing.** Scope 34's question #1 was resolved by
 * dissolving it: there is no single rate table, each club's Committee sets
 * its own. A club with an empty page is in a correct state, and the page
 * says what that state costs rather than showing a plausible zero.
 */
export default async function FeesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly schedule?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar%2Ffees');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  // 0026's two policies, restated so the page can explain itself. Reads are
  // wider than writes: a coordinator needs to know what a game pays before
  // designating somebody, and only an admin or treasurer sets it.
  const mayRead = tenant.roles.some((r) =>
    ['admin', 'registrar', 'coordinator', 'treasurer'].includes(r));
  const mayWrite = tenant.roles.some((r) => ['admin', 'treasurer'].includes(r));

  if (!mayRead) {
    return (
      <>
        <h2>Match official fees</h2>
        <p className="notice">
          <strong>Only an administrator, registrar, coordinator or treasurer can see this.</strong>{' '}
          You are signed in as {tenant.roles.join(', ')} at {tenant.clubName}.
        </p>
      </>
    );
  }

  const today = todayIn();
  const schedules = await loadSchedules(client, tenant.clubId);
  const withStanding = standings(schedules, today);
  const params = await searchParams;
  const chosen = withStanding.find((s) => s.id === params.schedule)
    ?? withStanding.find((s) => s.standing === 'in-force')
    ?? withStanding[0];

  const rates = chosen === undefined ? [] : await loadRates(client, tenant.clubId, chosen.id);
  // A superseded schedule is what the club paid, not what it pays. Editing
  // it would change the answer to a question already asked — which is the
  // whole of BR115 — so the editor does not offer to, and migration 0047
  // refuses it whatever offers.
  const editable = mayWrite && chosen !== undefined && chosen.standing !== 'superseded';
  const warnings = chosen === undefined ? [] : gaps(rates);

  return (
    <>
      <h2>Match official fees</h2>
      <p className="lede">
        What this club pays its match officials, as a <strong>dated version</strong> rather than a
        table you edit (BR115). A game is priced by the schedule in force on the day it was played,
        and the amount is stored on the claim at the moment it is computed &mdash; so raising a rate
        in July never changes what May cost.
      </p>

      {schedules.length === 0 && (
        <p className="notice">
          <strong>This club has no fee schedule, so no official can be paid.</strong> A claim looks
          up the rate in force on the day of the match; with no schedule there is no rate, and the
          claim finds nothing rather than a rate of zero. The platform seeds none &mdash; each
          club&rsquo;s Committee sets its own.
        </p>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Schedules</h3>
        <ScheduleList schedules={withStanding} />
      </div>

      {chosen !== undefined && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            From {chosen.effectiveFrom}
            {chosen.standing === 'superseded' && ' — superseded'}
            {chosen.standing === 'future' && ' — not started yet'}
          </h3>

          {chosen.note !== null && <p className="hint">{chosen.note}</p>}

          {warnings.map((w) => (
            <p key={w} className="notice">
              <strong>{w}</strong>
            </p>
          ))}

          <RateTable rates={rates} editable={editable} />

          {chosen.standing === 'superseded' && (
            <p className="hint" style={{ marginBottom: 0 }}>
              <strong>This is history and cannot be changed.</strong> It is the answer to
              &ldquo;what did we pay from {chosen.effectiveFrom}&rdquo;, and a question already
              asked does not get a second answer. Publish a new schedule instead &mdash; you can
              copy these rates into it.
            </p>
          )}
        </div>
      )}

      {editable && chosen !== undefined && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Add a rate to this schedule</h3>
          <AddRate scheduleId={chosen.id} />
        </div>
      )}

      {mayWrite ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Publish a new schedule</h3>
          <NewSchedule schedules={schedules} />
        </div>
      ) : (
        <p className="hint">
          Setting the rates is an administrator&rsquo;s or treasurer&rsquo;s act &mdash; the
          club&rsquo;s Committee decides them and the treasurer keeps them.
        </p>
      )}
    </>
  );
}
