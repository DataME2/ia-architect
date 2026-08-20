/**
 * Payment plans, instalments, and receipts.
 *
 * Realises the payment plan process
 * (`docs/ea/2_business/3_business-processes.md#payment-plan-process`). Every
 * function takes a request-scoped client, so Row-Level Security applies —
 * and the policies on these three tables are stricter than the rest of the
 * slice: any club member may *read* what a family owes, because a registrar
 * chasing BR3 needs to know why a registration is blocked, but only an
 * admin or treasurer may change it. That is BR22's separation applied to
 * plans, and it is enforced in the database rather than by this file.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { buildSchedule, finishesWithinSeason, totalReceived } from '../domain/finance/plan.ts';
import type { Payment, PaymentMethod, PaymentPlan, PlanCadence } from '../domain/finance/types.ts';
import type { IsoDate } from '../domain/types.ts';
import { toPayment, toPaymentPlan } from './mappers.ts';
import { QueryError, recordAudit } from './queries.ts';
import type { PaymentInstallmentRow, PaymentPlanRow, PaymentRow } from './schema.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

export interface RegistrationFinance {
  readonly plan: PaymentPlan | null;
  readonly payments: readonly Payment[];
}

/** The live plan and every receipt for one registration. */
export async function loadFinance(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
): Promise<RegistrationFinance> {
  const planRows = unwrap<PaymentPlanRow[]>(
    'payment_plan',
    await client
      .from('payment_plan')
      .select('id, club_id, registration_id, total_cents, cadence, created_by_user_id, cancelled_at, created_at')
      .eq('club_id', clubId)
      .eq('registration_id', registrationId)
      .is('cancelled_at', null)
      .limit(1),
  );

  const planRow = planRows[0];
  const installmentRows =
    planRow === undefined
      ? []
      : unwrap<PaymentInstallmentRow[]>(
          'payment_installment',
          await client
            .from('payment_installment')
            .select('id, club_id, payment_plan_id, sequence, due_on, amount_cents')
            .eq('club_id', clubId)
            .eq('payment_plan_id', planRow.id),
        );

  const paymentRows = unwrap<PaymentRow[]>(
    'payment',
    await client
      .from('payment')
      .select('id, club_id, registration_id, amount_cents, received_on, method, reference, reverses_payment_id, recorded_by_user_id, created_at')
      .eq('club_id', clubId)
      .eq('registration_id', registrationId)
      .order('received_on', { ascending: true }),
  );

  return {
    plan: planRow === undefined ? null : toPaymentPlan(planRow, installmentRows),
    payments: paymentRows.map(toPayment),
  };
}

export type PlanResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

/**
 * Agree a payment plan for a registration.
 *
 * The schedule is built by the pure function, so BR74 — instalments sum to
 * exactly the total — holds before anything is written. It is *also* a
 * deferred constraint trigger in the database, deliberately: this function
 * is not the only thing that will ever write these tables, and a plan that
 * sums to a cent under its total leaves a family owing money no instalment
 * will ever ask for.
 */
export async function createPaymentPlan(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
  input: {
    readonly totalCents: number;
    readonly instalmentCount: number;
    readonly firstDueOn: IsoDate;
    readonly cadence: PlanCadence;
    readonly seasonEndsOn: IsoDate;
  },
  actorUserId: string,
): Promise<PlanResult> {
  const schedule = buildSchedule(
    input.totalCents,
    input.instalmentCount,
    input.firstDueOn,
    input.cadence,
  );
  if (!schedule.ok) return { ok: false, error: schedule.error };

  // BR76: a plan that outlives the season leaves the club chasing money for
  // a child who has already stopped playing.
  if (!finishesWithinSeason(schedule.installments, input.seasonEndsOn)) {
    const last = schedule.installments.at(-1)?.dueOn ?? '';
    return {
      ok: false,
      error: `The last instalment falls on ${last}, after the season ends on ${input.seasonEndsOn} (BR76).`,
    };
  }

  const inserted = unwrap<PaymentPlanRow[]>(
    'payment_plan',
    await client
      .from('payment_plan')
      .insert({
        club_id: clubId,
        registration_id: registrationId,
        total_cents: input.totalCents,
        cadence: input.cadence,
        created_by_user_id: actorUserId,
      })
      .select('id, club_id, registration_id, total_cents, cadence, created_by_user_id, cancelled_at, created_at'),
  );

  const plan = inserted[0];
  if (plan === undefined) throw new QueryError('payment_plan', 'insert returned no row');

  const { error } = await client.from('payment_installment').insert(
    schedule.installments.map((instalment) => ({
      club_id: clubId,
      payment_plan_id: plan.id,
      sequence: instalment.sequence,
      due_on: instalment.dueOn,
      amount_cents: instalment.amountCents,
    })),
  );
  if (error !== null) throw new QueryError('payment_installment', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'payment_plan_created',
    entity: 'payment_plan',
    entityId: plan.id,
    detail: {
      registrationId,
      totalCents: input.totalCents,
      cadence: input.cadence,
      installments: schedule.installments,
      rules: ['BR74', 'BR76'],
    },
  });

  return { ok: true };
}

/**
 * Cancel a plan.
 *
 * Stamped rather than deleted: what a family was asked to pay, and when
 * that arrangement ended, is exactly the history a dispute turns on. BR3
 * falls back to the whole-balance question once a plan is cancelled, which
 * is why this is not a quiet operation.
 */
export async function cancelPaymentPlan(
  client: SupabaseClient,
  clubId: string,
  planId: string,
  registrationId: string,
  actorUserId: string,
): Promise<void> {
  const cancelledAt = new Date().toISOString();

  const { error } = await client
    .from('payment_plan')
    .update({ cancelled_at: cancelledAt })
    .eq('id', planId)
    .eq('club_id', clubId)
    .is('cancelled_at', null);
  if (error !== null) throw new QueryError('payment_plan', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'payment_plan_cancelled',
    entity: 'payment_plan',
    entityId: planId,
    detail: { registrationId, cancelledAt, rule: 'BR3' },
  });
}

/**
 * Record money received, and re-derive what the registration still owes.
 *
 * `registration.outstanding_amount_cents` is kept as the running balance so
 * BR3's no-plan branch and the queue's totals stay a single column read.
 * It is derived here from the receipts rather than decremented, so a
 * reversing entry (BR77) corrects it by the same route as an ordinary
 * payment and the two can never disagree.
 */
export async function recordPayment(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
  input: {
    readonly amountCents: number;
    readonly receivedOn: IsoDate;
    readonly method: PaymentMethod;
    readonly reference: string | null;
    readonly reversesPaymentId: string | null;
  },
  actorUserId: string,
): Promise<void> {
  const inserted = unwrap<PaymentRow[]>(
    'payment',
    await client
      .from('payment')
      .insert({
        club_id: clubId,
        registration_id: registrationId,
        amount_cents: input.amountCents,
        received_on: input.receivedOn,
        method: input.method,
        reference: input.reference,
        reverses_payment_id: input.reversesPaymentId,
        recorded_by_user_id: actorUserId,
      })
      .select('id, club_id, registration_id, amount_cents, received_on, method, reference, reverses_payment_id, recorded_by_user_id, created_at'),
  );
  const row = inserted[0];
  if (row === undefined) throw new QueryError('payment', 'insert returned no row');

  const { plan, payments } = await loadFinance(client, clubId, registrationId);

  // With a plan, the balance is re-derived from the plan total and every
  // receipt, so a reversing entry (BR77) corrects it by the same route as an
  // ordinary payment and the two can never disagree. Without one there is no
  // recorded total to derive from — the registration's own figure is the
  // only statement of what was charged — so the receipt is subtracted from
  // it.
  const outstanding =
    plan !== null
      ? plan.totalCents - totalReceived(payments)
      : unwrap<{ outstanding_amount_cents: number }[]>(
          'registration',
          await client
            .from('registration')
            .select('outstanding_amount_cents')
            .eq('id', registrationId)
            .eq('club_id', clubId)
            .limit(1),
        )[0]?.outstanding_amount_cents ?? 0;

  const nextOutstanding = plan !== null ? outstanding : outstanding - input.amountCents;

  const { error } = await client
    .from('registration')
    .update({ outstanding_amount_cents: nextOutstanding })
    .eq('id', registrationId)
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('registration', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'payment_recorded',
    entity: 'payment',
    entityId: row.id,
    detail: {
      registrationId,
      amountCents: input.amountCents,
      method: input.method,
      reversesPaymentId: input.reversesPaymentId,
      rule: 'BR77',
    },
  });
}
