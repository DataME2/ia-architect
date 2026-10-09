'use client';

import { useActionState, useState } from 'react';

import { Button } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/PublicEntrance.tsx';
import { TextField } from '../../components/ui/TextField.tsx';
import { signInAction } from './actions.ts';
import { ResetForm } from './ResetForm.tsx';

/**
 * Email and password, then the action's redirect to the person's own landing.
 * The error is the action's account-safe sentence: it never says whether the
 * email exists. "Forgotten password?" opens the recovery form in place.
 */
export function SignInForm({ next, recover = false }: { readonly next: string; readonly recover?: boolean }) {
  const [state, formAction, pending] = useActionState(signInAction, { error: null });
  const [showReset, setShowReset] = useState(recover);

  return (
    <>
      <form action={formAction} className="flex flex-col gap-ds-4">
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-ds-3 p-ds-4 rounded-sm border border-border">
          <TextField id="email" name="email" type="email" label="Email" autoComplete="email" required />
          <TextField
            id="password"
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            required
          />
        </div>

        <div className="flex flex-wrap items-center gap-ds-4">
          <Button type="submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
          {/* A text action, as the design draws it. globals.css paints every
              <button> in the accent on hover, so that is overridden. */}
          <button
            type="button"
            aria-expanded={showReset}
            onClick={() => setShowReset((v) => !v)}
            className="min-h-[44px] px-0 bg-transparent border-0 shadow-none text-[13px] font-semibold text-foreground hover:bg-transparent! hover:text-foreground! hover:underline"
          >
            Forgotten password?
          </button>
        </div>

        <p className="m-0 text-xs text-muted-foreground">
          No password is emailed. Signing in does not reveal whether an email is registered, and does not choose a role
          for you.
        </p>

        {state.error !== null && (
          <Callout tone="error" title="We couldn’t sign you in">
            {state.error}
          </Callout>
        )}
      </form>

      {showReset && <ResetForm open summary="Password recovery" />}
    </>
  );
}
