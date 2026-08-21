/**
 * Attaching a voucher, and a human deciding whether it is real.
 *
 * The automatic check BR25 describes — the code verified against the issuing
 * government's own interface — does not exist yet, and none of the six state
 * programs offers one at this club's scale. So verification is a person
 * looking at a PDF. This module's job is to make that person's decision the
 * thing that moves money, and to leave a record of who decided and when.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { canVerify, type Voucher } from '../domain/finance/voucher.ts';
import { recordPayment } from './finance.ts';
import { toVoucher } from './mappers.ts';
import { QueryError, recordAudit } from './queries.ts';
import type { RegistrationVoucherRow } from './schema.ts';

const BUCKET = 'vouchers';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

export async function loadVouchers(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
): Promise<readonly Voucher[]> {
  const rows = unwrap<RegistrationVoucherRow[]>(
    'registration_voucher',
    await client
      .from('registration_voucher')
      .select('*')
      .eq('club_id', clubId)
      .eq('registration_id', registrationId)
      .order('attached_at', { ascending: true }),
  );
  return rows.map(toVoucher);
}

/** Every voucher in a season still waiting for someone to look at it. */
export async function loadPendingVouchers(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly Voucher[]> {
  const rows = unwrap<RegistrationVoucherRow[]>(
    'registration_voucher',
    await client
      .from('registration_voucher')
      .select('*')
      .eq('club_id', clubId)
      .eq('state', 'ATTACHED')
      .order('attached_at', { ascending: true }),
  );
  return rows.map(toVoucher);
}

export type VoucherResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

/**
 * Attach a voucher to a registration.
 *
 * **It lands in `ATTACHED` and nothing else happens** (BR81). The balance is
 * untouched, so BR3 still fails and BR79 still keeps the player off the
 * field. The club now knows a claim exists, which is the whole point — a
 * registrar chasing an unpaid family should be able to see that the family
 * has already done their part and the club has not.
 *
 * The file is optional. A code recorded without the document is worth
 * having; refusing it would push the club back to a spreadsheet for the
 * cases where the PDF arrives later.
 */
export async function attachVoucher(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
  input: {
    readonly program: string;
    readonly code: string;
    readonly faceValueCents: number;
    readonly file: File | null;
  },
  actorUserId: string,
): Promise<VoucherResult> {
  let filePath: string | null = null;

  if (input.file !== null && input.file.size > 0) {
    // The club id is the first path segment, and the storage policy checks
    // exactly that — so a member of one club cannot write into another's
    // folder even knowing the path.
    filePath = `${clubId}/${registrationId}/${crypto.randomUUID()}.pdf`;

    const { error } = await client.storage
      .from(BUCKET)
      .upload(filePath, input.file, { contentType: 'application/pdf', upsert: false });

    if (error !== null) {
      return { ok: false, error: `The file could not be stored: ${error.message}` };
    }
  }

  const { error } = await client.from('registration_voucher').insert({
    club_id: clubId,
    registration_id: registrationId,
    program: input.program,
    code: input.code,
    face_value_cents: input.faceValueCents,
    state: 'ATTACHED',
    file_path: filePath,
    attached_by_user_id: actorUserId,
  });

  if (error !== null) {
    // The unique (club_id, code) is the interesting failure: the same
    // government voucher on two children is either a mistake or a duplicate
    // claim, and the club should hear about it now rather than when the
    // reimbursement is refused.
    if (error.message.includes('registration_voucher_club_id_code_key')) {
      return {
        ok: false,
        error: `Voucher ${input.code} is already attached to another registration at this club. A government voucher is single-use — check which child it belongs to.`,
      };
    }
    return { ok: false, error: error.message };
  }

  await recordAudit(client, clubId, actorUserId, {
    action: 'voucher_attached',
    entity: 'registration_voucher',
    entityId: registrationId,
    detail: {
      program: input.program,
      faceValueCents: input.faceValueCents,
      hasFile: filePath !== null,
      rule: 'BR81',
    },
  });

  return { ok: true };
}

/**
 * A club officer confirms the voucher is genuine.
 *
 * **This is the act that moves money.** The relief is applied as an ordinary
 * payment of method `voucher`, so the balance, the receipts, BR3 and BR79
 * all agree without anything reconciling them — and if the voucher is later
 * found invalid it is reversed the way any other receipt is (BR77).
 *
 * The Assistant may one day draft this decision (BR25, decision 2) but may
 * never make it: applying a discount is a financial act, and P3 keeps those
 * with a human.
 */
export async function verifyVoucher(
  client: SupabaseClient,
  clubId: string,
  voucher: Voucher,
  actorUserId: string,
): Promise<VoucherResult> {
  const allowed = canVerify(voucher);
  if (!allowed.ok) return allowed;

  const paymentId = await recordPayment(
    client,
    clubId,
    voucher.registrationId,
    {
      amountCents: voucher.faceValueCents,
      receivedOn: new Date().toISOString().slice(0, 10),
      method: 'voucher',
      reference: `${voucher.program} ${voucher.code}`,
      reversesPaymentId: null,
    },
    actorUserId,
  );

  const { error } = await client
    .from('registration_voucher')
    .update({
      state: 'VERIFIED',
      verified_by_user_id: actorUserId,
      verified_at: new Date().toISOString(),
      rejection_reason: null,
      relief_payment_id: paymentId,
    })
    .eq('id', voucher.id)
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('registration_voucher', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'voucher_verified',
    entity: 'registration_voucher',
    entityId: voucher.id,
    detail: {
      registrationId: voucher.registrationId,
      program: voucher.program,
      faceValueCents: voucher.faceValueCents,
      reliefPaymentId: paymentId,
      rules: ['BR25', 'BR81'],
    },
  });

  return { ok: true };
}

/**
 * A club officer decides the voucher is not good.
 *
 * If it had already been verified the relief is **reversed**, not deleted —
 * a negative payment naming the one it undoes (BR77). The family's balance
 * goes back up, BR3 fails again, and BR79 stops the player, which is the
 * correct outcome for a discount that turned out not to exist.
 */
export async function rejectVoucher(
  client: SupabaseClient,
  clubId: string,
  voucher: Voucher,
  reason: string,
  actorUserId: string,
): Promise<VoucherResult> {
  if (voucher.state === 'CLAIMED') {
    return {
      ok: false,
      error: 'This voucher has already been claimed from the government. Reversing it is a claim matter, not a verification one.',
    };
  }

  if (voucher.reliefPaymentId !== null) {
    await recordPayment(
      client,
      clubId,
      voucher.registrationId,
      {
        amountCents: -voucher.faceValueCents,
        receivedOn: new Date().toISOString().slice(0, 10),
        method: 'adjustment',
        reference: `Reversal — ${voucher.program} ${voucher.code} rejected`,
        reversesPaymentId: voucher.reliefPaymentId,
      },
      actorUserId,
    );
  }

  const { error } = await client
    .from('registration_voucher')
    .update({
      state: 'REJECTED',
      verified_by_user_id: actorUserId,
      verified_at: new Date().toISOString(),
      rejection_reason: reason,
      relief_payment_id: null,
    })
    .eq('id', voucher.id)
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('registration_voucher', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'voucher_rejected',
    entity: 'registration_voucher',
    entityId: voucher.id,
    detail: {
      registrationId: voucher.registrationId,
      reason,
      reliefReversed: voucher.reliefPaymentId !== null,
      rules: ['BR77', 'BR81'],
    },
  });

  return { ok: true };
}

/** A short-lived link to the stored PDF. The bucket is private. */
export async function voucherFileUrl(
  client: SupabaseClient,
  filePath: string,
): Promise<string | null> {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(filePath, 300);
  return error !== null || data === null ? null : data.signedUrl;
}
