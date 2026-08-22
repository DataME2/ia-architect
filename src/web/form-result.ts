/**
 * What a form action hands back to the screen.
 *
 * Every action in this app used to return `string | null` — a message when
 * something went wrong, and nothing at all when it worked. So a registrar
 * who recorded a Working with Children Check got no acknowledgement of any
 * kind, and the only way to find out whether it had saved was to go and
 * look. Silence is not a success state: it is indistinguishable from a
 * click that did not register, and it teaches people to press twice.
 *
 * A single shape, so the answer is the same on every screen.
 */
export type FormResult =
  | { readonly status: 'idle' }
  | { readonly status: 'ok'; readonly message: string }
  | { readonly status: 'error'; readonly message: string };

export const IDLE_FORM: FormResult = { status: 'idle' };

export function formOk(message: string): FormResult {
  return { status: 'ok', message };
}

export function formFailed(message: string): FormResult {
  return { status: 'error', message };
}
