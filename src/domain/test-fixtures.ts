/** Builders for tests. Everything defaults to valid; each test breaks one thing. */
import type { Installment, Payment, PaymentPlan } from './finance/types.ts';
import { buildSchedule } from './finance/plan.ts';
import type {
  Consent, Guardianship, IsoDate, Person, Registration,
} from './types.ts';
import type { RegistrationContext } from './rules/types.ts';

export const CLUB = 'club-north-star';
export const TODAY: IsoDate = '2026-08-07';

export function person(overrides: Partial<Person> = {}): Person {
  return {
    id: 'person-1',
    clubId: CLUB,
    legalName: { givenNames: 'Alexandra Jane', familyName: 'Nguyen' },
    legalNameVerifiedAt: '2026-01-15T00:00:00Z',
    preferredName: 'Alex',
    dateOfBirth: '2014-03-02',
    email: null,
    photoPath: null,
    ...overrides,
  };
}

export function guardian(overrides: Partial<Guardianship> = {}): Guardianship {
  return {
    personId: 'person-1',
    guardianPersonId: 'person-guardian',
    isAuthority: true,
    isContact: true,
    ...overrides,
  };
}

export function consent(overrides: Partial<Consent> = {}): Consent {
  return {
    personId: 'person-1',
    purpose: 'REGISTRATION_COLLECTION_NOTICE',
    grantedByPersonId: 'person-guardian',
    grantedAt: '2026-01-15T00:00:00Z',
    revokedAt: null,
    ...overrides,
  };
}

export function registration(overrides: Partial<Registration> = {}): Registration {
  return {
    id: 'registration-1',
    clubId: CLUB,
    seasonId: 'season-2026',
    personId: 'person-1',
    status: 'DRAFT',
    requiredDocumentTypes: ['birth-certificate'],
    providedDocumentTypes: ['birth-certificate'],
    outstandingAmountCents: 0,
    ...overrides,
  };
}

/** A four-instalment monthly plan. Every field defaults to something valid. */
export function paymentPlan(overrides: Partial<PaymentPlan> = {}): PaymentPlan {
  const schedule = buildSchedule(12000, 4, '2026-03-01', 'monthly');
  return {
    id: 'plan-1',
    registrationId: 'registration-1',
    totalCents: 12000,
    cadence: 'monthly',
    installments: schedule.ok ? schedule.installments : ([] as readonly Installment[]),
    cancelledAt: null,
    ...overrides,
  };
}

export function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    registrationId: 'registration-1',
    amountCents: 3000,
    receivedOn: '2026-03-01',
    method: 'card',
    reference: null,
    reversesPaymentId: null,
    ...overrides,
  };
}

export function context(overrides: Partial<RegistrationContext> = {}): RegistrationContext {
  return {
    registration: registration(),
    person: person(),
    guardianships: [guardian()],
    consents: [consent()],
    paymentPlan: null,
    payments: [],
    asAt: TODAY,
    ...overrides,
  };
}
