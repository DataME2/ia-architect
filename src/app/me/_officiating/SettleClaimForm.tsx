'use client';

import { useActionState } from 'react';

import type { SettleableClaim } from '../../../data/claims.ts';
import { formatMoney } from '../../../domain/finance/money.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { chooseSettlementAction } from './actions.ts';

/**
 * "Pay me, or credit it toward next season?" — BR152. No account details
 * are ever asked for: the club pays outside the platform exactly as it
 * already does (BR118); this only records which one was chosen.
 */
export function SettleClaimForm({
  clubId,
  claim,
}: {
  readonly clubId: string;
  readonly claim: SettleableClaim;
}) {
  const [state, formAction, pending] = useActionState(chooseSettlementAction, IDLE_FORM);

  if (claim.settlement !== null) {
    return (
      <li>
        <span className="ctitle">
          {claim.officialName} vs {claim.opponent} — {claim.playedOn}
        </span>
        <br />
        <span className="cnote">
          {formatMoney(claim.amountCents)} — {claim.settlement === 'pay' ? 'to be paid' : 'credited next season'}
        </span>
      </li>
    );
  }

  return (
    <li>
      <form action={formAction} className="stack" style={{ gap: '0.4rem' }}>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="claimId" value={claim.id} />

        <span className="ctitle">
          {claim.officialName} vs {claim.opponent} — {claim.playedOn}
        </span>
        <span className="cnote">{formatMoney(claim.amountCents)} owed</span>

        <FormNotice result={state} />

        <p className="row" style={{ margin: 0 }}>
          <button type="submit" name="settlement" value="pay" disabled={pending}>
            {pending ? '…' : 'Pay me'}
          </button>{' '}
          <button type="submit" name="settlement" value="credit" className="secondary" disabled={pending}>
            Credit next season
          </button>
        </p>
      </form>
    </li>
  );
}
