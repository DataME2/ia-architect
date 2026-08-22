import type { FormResult } from '../../../web/form-result.ts';

/**
 * The one place a form says how it went.
 *
 * Renders both outcomes, because an action that only ever speaks up on
 * failure leaves success looking exactly like a dead button.
 */
export function FormNotice({ result }: { readonly result: FormResult }) {
  if (result.status === 'idle') return null;

  return result.status === 'error' ? (
    <div className="errors" role="alert">
      <strong>{result.message}</strong>
    </div>
  ) : (
    <div className="notice" role="status">
      <strong>{result.message}</strong>
    </div>
  );
}
