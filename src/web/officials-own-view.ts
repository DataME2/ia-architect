/**
 * The official's own side of the Referee workspace (scope 75): what each
 * claim is waiting on, and where each credential stands. Pure, so the
 * sentences are tested without a database.
 */

export interface OwnClaim {
  readonly state: 'raised' | 'approved' | 'rejected';
  readonly settlement: 'pay' | null;
  readonly batchId: string | null;
}

/** Where a claim stands, from the official's side. */
export function claimStanding(
  claim: OwnClaim,
  payout: { readonly reference: string; readonly simulated: boolean } | null = null,
): string {
  if (payout !== null) {
    return payout.simulated ? `Paid online (simulated) · ${payout.reference}.` : `Paid online · ${payout.reference}.`;
  }
  if (claim.state === 'raised') return 'Waiting for the treasurer to approve it.';
  if (claim.state === 'rejected') return 'Not approved.';
  // BR152 restated (scope 79): every approved claim is paid out.
  return claim.batchId === null
    ? 'Approved: it will be paid to the nominated account.'
    : 'Approved: in a payment run, to be paid to the nominated account.';
}

export interface OwnCredential {
  readonly label: string;
  readonly expiresOn: string | null;
  /** Whether the club has sighted or verified it. */
  readonly sighted: boolean;
}

export type CredentialTone = 'ok' | 'warn' | 'stop';

/** A credential's standing today: expired, expiring within 30 days, or current. */
export function credentialStanding(
  c: OwnCredential,
  today: string,
): { readonly text: string; readonly tone: CredentialTone } {
  const sighted = c.sighted ? 'sighted by the club' : 'not yet sighted by the club';
  if (c.expiresOn === null) return { text: `No expiry recorded; ${sighted}.`, tone: c.sighted ? 'ok' : 'warn' };
  if (c.expiresOn < today) return { text: `Expired ${c.expiresOn}.`, tone: 'stop' };
  const days = Math.round((Date.parse(c.expiresOn) - Date.parse(today)) / 86_400_000);
  if (days <= 30) return { text: `Expires ${c.expiresOn}, in ${days} days; ${sighted}.`, tone: 'warn' };
  return { text: `Valid until ${c.expiresOn}; ${sighted}.`, tone: c.sighted ? 'ok' : 'warn' };
}
