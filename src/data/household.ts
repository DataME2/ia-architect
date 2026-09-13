/**
 * Every child a guardian holds authority for, with this season's registration
 * and the rules evaluated against it — the reads behind the household cards.
 *
 * Runs the same rules engine the registrar's queue runs, so a family and a
 * registrar are never told two different things about one child. That only
 * holds because 0029 lets a family read `registration_document`: without it
 * BR2 evaluates against no rows and reports every document attached.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { planState } from '../domain/finance/plan.ts';
import { evaluateRegistration } from '../domain/rules/index.ts';
import type { IsoDate } from '../domain/types.ts';
import type { ChildCardInput } from '../web/household-view.ts';
import { loadChildren } from './me.ts';
import { toConsent, toGuardianship, toPayment, toPaymentPlan, toRegistration } from './mappers.ts';
import { QueryError } from './queries.ts';
import type {
  ConsentRow,
  GuardianshipRow,
  PaymentInstallmentRow,
  PaymentPlanRow,
  PaymentRow,
  RegistrationDocumentRow,
  RegistrationRow,
} from './schema.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

export interface HouseholdChild extends ChildCardInput {
  readonly registration: RegistrationRow | null;
}

export async function loadHousehold(
  client: SupabaseClient,
  clubId: string,
  seasonId: string | null,
  guardianPersonId: string,
  asAt: IsoDate,
): Promise<readonly HouseholdChild[]> {
  const children = await loadChildren(client, clubId, guardianPersonId);
  const unregistered = (person: HouseholdChild['person']): HouseholdChild => ({
    person,
    status: null,
    registration: null,
    outcomes: [],
    balanceCents: 0,
  });
  if (children.length === 0 || seasonId === null) return children.map(unregistered);

  const ids = children.map((c) => c.id);
  const regs = unwrap<RegistrationRow[]>(
    'registration',
    await client
      .from('registration')
      .select('id, club_id, person_id, season_id, status, outstanding_amount_cents, created_at')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .in('person_id', ids),
  );
  if (regs.length === 0) return children.map(unregistered);
  const regIds = regs.map((r) => r.id);

  const documents = unwrap<RegistrationDocumentRow[]>(
    'registration_document',
    await client.from('registration_document').select('*').eq('club_id', clubId).in('registration_id', regIds),
  );
  const guardianships = unwrap<GuardianshipRow[]>(
    'guardianship',
    await client
      .from('guardianship')
      .select('id, club_id, person_id, guardian_person_id, is_authority, is_contact')
      .eq('club_id', clubId)
      .in('person_id', ids),
  );
  const consents = unwrap<ConsentRow[]>(
    'consent',
    await client.from('consent').select('*').eq('club_id', clubId).in('person_id', ids),
  );
  const plans = unwrap<PaymentPlanRow[]>(
    'payment_plan',
    await client
      .from('payment_plan')
      .select('id, club_id, registration_id, total_cents, cadence, created_by_user_id, cancelled_at, created_at')
      .eq('club_id', clubId)
      .in('registration_id', regIds)
      .is('cancelled_at', null),
  );
  const installments =
    plans.length === 0
      ? []
      : unwrap<PaymentInstallmentRow[]>(
          'payment_installment',
          await client
            .from('payment_installment')
            .select('id, club_id, payment_plan_id, sequence, due_on, amount_cents')
            .eq('club_id', clubId)
            .in('payment_plan_id', plans.map((p) => p.id)),
        );
  const payments = unwrap<PaymentRow[]>(
    'payment',
    await client
      .from('payment')
      .select('id, club_id, registration_id, amount_cents, received_on, method, reference, reverses_payment_id, recorded_by_user_id, created_at')
      .eq('club_id', clubId)
      .in('registration_id', regIds)
      .order('received_on', { ascending: true }),
  );

  return children.map((person) => {
    const row = regs.find((r) => r.person_id === person.id);
    if (row === undefined) return unregistered(person);

    const planRow = plans.find((p) => p.registration_id === row.id);
    const plan = planRow === undefined ? null : toPaymentPlan(planRow, installments);
    const received = payments.filter((p) => p.registration_id === row.id).map(toPayment);

    const outcomes = evaluateRegistration({
      registration: toRegistration(row, documents.filter((d) => d.registration_id === row.id)),
      person,
      guardianships: guardianships.filter((g) => g.person_id === person.id).map(toGuardianship),
      consents: consents.filter((c) => c.person_id === person.id).map(toConsent),
      paymentPlan: plan,
      payments: received,
      asAt,
    });

    const balanceCents =
      plan === null
        ? row.outstanding_amount_cents
        : planState(plan.totalCents, plan.installments, received, asAt).outstandingCents;

    return { person, status: row.status, registration: row, outcomes, balanceCents };
  });
}
