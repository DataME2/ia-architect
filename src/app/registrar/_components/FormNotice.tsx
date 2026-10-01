import { FormNotice as DesignFormNotice } from '../../../components/ui/FormNotice.tsx';
import type { FormResult } from '../../../web/form-result.ts';

/**
 * The one place a form says how it went — rendered by the design system's
 * FormNotice (scope 69).
 *
 * Renders both outcomes, because an action that only ever speaks up on
 * failure leaves success looking exactly like a dead button. Success reads
 * as success now: it used the warning style before, which DESIGN.md keeps
 * for things still waiting on someone.
 */
export function FormNotice({ result }: { readonly result: FormResult }) {
  if (result.status === 'idle') return null;

  return (
    <DesignFormNotice tone={result.status === 'error' ? 'error' : 'success'}>
      {result.message}
    </DesignFormNotice>
  );
}
