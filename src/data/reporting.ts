/**
 * The reports, and the refusal that is not an error.
 *
 * Each summary is a `security definer` function that computes over **every**
 * row of its club and checks the caller's role explicitly first (BR142).
 * That inverts the usual shape here, deliberately: everywhere else access
 * is an emergent property of which rows a policy admits, and for an
 * aggregate it cannot be, because **the aggregate of nothing is a number
 * rather than an absence**.
 *
 * So a refusal arrives as a `Report` of kind `refused`, not as a thrown
 * error. A screen showing three reports where the reader may have two must
 * render the third as "not yours to see" rather than failing the page — and
 * a type that can only be a figure would make that impossible to express.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  FinanceFigures, OfficiatingFigures, RegistrationFigures, Report,
} from '../domain/reporting/types.ts';

/** Postgres raises; this turns that into the refusal the type describes. */
async function summarise<T>(
  client: SupabaseClient,
  fn: string,
  clubId: string,
  seasonId: string,
  shape: (row: Record<string, unknown>) => T,
): Promise<Report<T>> {
  const { data, error } = await client.rpc(fn, { p_club_id: clubId, p_season_id: seasonId });

  if (error !== null) {
    // The function raises with BR142's sentence. Anything else is a real
    // failure and says so rather than being dressed up as a permission
    // problem — a report that is broken and a report that is not yours are
    // different things to a reader.
    return {
      kind: 'refused',
      because: error.message.includes('BR142')
        ? 'This report is not readable by your role at this club.'
        : `This report could not be produced: ${error.message.replace(/^.*?:\s*/, '')}`,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (row === undefined) {
    return { kind: 'refused', because: 'This report came back empty, which should not happen.' };
  }

  return {
    kind: 'ready',
    figures: shape(row),
    computedAt: row.computed_at as string,
  };
}

const int = (v: unknown): number => Number(v ?? 0);

export function registrationSummary(
  client: SupabaseClient, clubId: string, seasonId: string,
): Promise<Report<RegistrationFigures>> {
  return summarise(client, 'app_registration_summary', clubId, seasonId, (r) => ({
    total: int(r.total),
    complete: int(r.complete),
    pendingDocuments: int(r.pending_documents),
    pendingPayment: int(r.pending_payment),
    pendingExternal: int(r.pending_external),
    draft: int(r.draft),
    blockedBy: (r.blocked_by ?? {}) as Record<string, number>,
  }));
}

export function financeSummary(
  client: SupabaseClient, clubId: string, seasonId: string,
): Promise<Report<FinanceFigures>> {
  return summarise(client, 'app_finance_summary', clubId, seasonId, (r) => ({
    registrations: int(r.registrations),
    owing: int(r.owing),
    outstandingCents: int(r.outstanding_cents),
    creditCents: int(r.credit_cents),
    onAPlan: int(r.on_a_plan),
    instalmentsOverdue: int(r.instalments_overdue),
    overdueCents: int(r.overdue_cents),
    vouchersAttached: int(r.vouchers_attached),
    vouchersVerified: int(r.vouchers_verified),
    voucherReliefCents: int(r.voucher_relief_cents),
  }));
}

export function officiatingSummary(
  client: SupabaseClient, clubId: string, seasonId: string,
): Promise<Report<OfficiatingFigures>> {
  return summarise(client, 'app_officiating_summary', clubId, seasonId, (r) => ({
    officials: int(r.officials),
    appointments: int(r.appointments),
    accepted: int(r.accepted),
    proposed: int(r.proposed),
    declined: int(r.declined),
    withdrawn: int(r.withdrawn),
    claimsRaised: int(r.claims_raised),
    claimsApproved: int(r.claims_approved),
    approvedCents: int(r.approved_cents),
    unverifiedFixtures: int(r.unverified_fixtures),
  }));
}
