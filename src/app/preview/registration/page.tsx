import { notFound } from 'next/navigation';

import { FinancialGatePanel } from '../../../components/ui/FinancialGatePanel.tsx';
import type { PlanState } from '../../../domain/finance/types.ts';
import { financialGate, type GateInput } from '../../../web/financial-gate.ts';
import { parseRegistrationForm } from '../../../web/registration-form.ts';
import type { RegistrationFormState } from '../../../web/registration-form-state.ts';
import { todayIn } from '../../../web/today.ts';
import { RegistrationForm } from '../../_components/RegistrationForm.tsx';

/**
 * A design preview of the registration wizard and the Financial Gate
 * (scope 91), on sample data.
 *
 * **Development only**: a production build answers 404. The wizard is the
 * real component; its action here runs the real `parseRegistrationForm`
 * and **saves nothing**, so every step's checks and the server-error jump
 * can be tried without creating a registration. The gates are three sample
 * registrations through the real `financialGate`.
 */

async function previewSubmit(_previous: RegistrationFormState, formData: FormData): Promise<RegistrationFormState> {
  'use server';
  const input: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === 'string') input[key] = value;
  const parsed = parseRegistrationForm(input, { today: todayIn() });
  if (!parsed.ok) {
    return { status: 'error', errors: parsed.errors, message: 'Some details still need attention.', outstanding: [], registrationId: null, guardian: null };
  }
  return { status: 'done', errors: [], message: 'Preview only: nothing was saved.', outstanding: [], registrationId: 'preview', guardian: parsed.draft.guardian };
}

const PLAN: PlanState = {
  totalCents: 30000,
  paidCents: 10000,
  outstandingCents: 20000,
  arrearsCents: 10000,
  installments: [
    { installment: { sequence: 1, dueOn: '2026-08-01', amountCents: 10000 }, paidCents: 10000, outstandingCents: 0, overdue: false },
    { installment: { sequence: 2, dueOn: '2026-09-01', amountCents: 10000 }, paidCents: 0, outstandingCents: 10000, overdue: true },
    { installment: { sequence: 3, dueOn: '2026-11-01', amountCents: 10000 }, paidCents: 0, outstandingCents: 10000, overdue: false },
  ],
  nextDue: { installment: { sequence: 2, dueOn: '2026-09-01', amountCents: 10000 }, paidCents: 0, outstandingCents: 10000, overdue: true },
};

const GATES: readonly { readonly title: string; readonly input: GateInput }[] = [
  {
    title: 'Paid up, voucher verified',
    input: {
      eligibility: { mayPlay: true, reason: 'Registered with the governing body and nothing owed.' },
      readsMoney: true,
      outstandingCents: 0,
      receivedCents: 25000,
      vouchers: [{ state: 'VERIFIED', faceValueCents: 10000 }],
      plan: null,
      earlier: [],
    },
  },
  {
    title: 'Behind on a plan, a voucher waiting, a debt from 2025',
    input: {
      eligibility: { mayPlay: false, reason: 'An instalment is overdue (BR3): the player cannot take the field until it is paid.' },
      readsMoney: true,
      outstandingCents: 20000,
      receivedCents: 10000,
      vouchers: [{ state: 'ATTACHED', faceValueCents: 10000 }],
      plan: PLAN,
      earlier: [{ seasonName: '2025', outstandingCents: 7500 }],
    },
  },
  {
    title: 'As a coach sees it (no money, BR78)',
    input: {
      eligibility: { mayPlay: false, reason: 'Money is owed; the treasurer has the detail.' },
      readsMoney: false,
      outstandingCents: 0,
      receivedCents: 0,
      vouchers: [],
      plan: null,
      earlier: null,
    },
  },
];

export default function RegistrationPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="work-body" id="main" style={{ padding: 'var(--space-5)' }}>
      <p className="hint" style={{ marginTop: 0 }}>
        Design preview on sample data (development only). Submitting saves nothing.
      </p>
      <h2>Register a player</h2>
      <RegistrationForm action={previewSubmit} />

      <h2 style={{ marginTop: 'var(--space-7)' }}>Financial gate</h2>
      {GATES.map((g) => {
        const gate = financialGate(g.input);
        return (
          <section key={g.title} className="card">
            <h3 style={{ marginTop: 0 }}>{g.title}</h3>
            <FinancialGatePanel mayPlay={gate.mayPlay} verdict={gate.verdict} reason={gate.reason} lines={gate.lines} />
          </section>
        );
      })}
    </main>
  );
}
