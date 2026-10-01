/**
 * Who reads a family's payment plan, instalments and receipts (BR78, #73).
 *
 * The database decides: migration 0068's `payment_plan_select`,
 * `payment_installment_select` and `payment_select` name these four roles.
 * This copy only lets a screen say "not yours to see" instead of reading an
 * empty result as "no plan was agreed". Change both together.
 */
export const MONEY_READERS: readonly string[] = ['admin', 'treasurer', 'registrar', 'digital_technology_manager'];

export function canReadMoney(roles: readonly string[]): boolean {
  return roles.some((role) => MONEY_READERS.includes(role));
}
