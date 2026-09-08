/**
 * Formatting money for humans.
 *
 * Lives in the domain rather than in `src/web/` because the rules
 * themselves quote amounts — BR3's message names what is owed, and a
 * registrar reads that message from the queue, the detail screen and the
 * validation history alike. One implementation, so the three never disagree
 * about where the sign goes.
 */

/** Cents to dollars. Negative renders the sign outside the dollar mark. */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
