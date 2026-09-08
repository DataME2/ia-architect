'use client';

import { useActionState } from 'react';

import {
  CLUB_ROLES,
  READ_ONLY_ROLES,
  ROLE_SUMMARY,
  accountIdentity,
  candidateLabel,
  grantableRoles,
  linkableCandidates,
  revocation,
  type ClubAccount,
  type LinkCandidate,
} from '../../../web/access-view.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import {
  grantAccessAction,
  linkAccountAction,
  revokeAccessAction,
  unlinkAccountAction,
} from './actions.ts';

export function GrantAccessForm() {
  const [state, formAction, pending] = useActionState(grantAccessAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack">
      <FormNotice result={state} />
      <fieldset>
        <legend>Give somebody access</legend>

        <div className="field">
          <label htmlFor="email">Their email address</label>
          <input id="email" name="email" type="email" required />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            They must already have an account. This grants a role to an existing account &mdash;
            it cannot create one, deliberately: minting accounts is a much larger power than
            deciding who may act at your club.
          </p>
        </div>

        <div className="field">
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue="registrar">
            {CLUB_ROLES.map((role) => (
              <option key={role} value={role}>
                {role} &mdash; {ROLE_SUMMARY[role]}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <div>
        <button type="submit" disabled={pending}>
          {pending ? 'Granting…' : 'Grant access'}
        </button>
      </div>
    </form>
  );
}

export function RevokeButton({
  account,
  role,
  accounts,
}: {
  readonly account: ClubAccount;
  readonly role: string;
  readonly accounts: readonly ClubAccount[];
}) {
  const [state, formAction, pending] = useActionState(revokeAccessAction, IDLE_FORM);
  const allowed = revocation(account, role, accounts);

  // Explained rather than offered-and-refused. The database enforces this
  // too; showing a button that cannot work is the defect WP3 exists for.
  if (!allowed.allowed) {
    return (
      <span className="hint" title={allowed.reason}>
        cannot remove
      </span>
    );
  }

  return (
    <form action={formAction} style={{ display: 'inline' }}>
      <input type="hidden" name="userId" value={account.userId} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="email" value={account.email} />
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? '…' : 'Remove'}
      </button>
      {state.status === 'error' && (
        <span className="hint" style={{ marginLeft: '0.4rem' }}>
          {state.message}
        </span>
      )}
    </form>
  );
}


/**
 * Who an account is, and the control that says so.
 *
 * Two things are deliberate. The name is shown with the email *beneath* it
 * rather than instead of it — an admin removing access needs both, since
 * the address is what they were given and the name is what they know. And
 * an unlinked account says so plainly: no greyed-out name, no email
 * pretending to be one (BR108).
 */
function AccountIdentity({
  account,
  accounts,
  candidates,
}: {
  readonly account: ClubAccount;
  readonly accounts: readonly ClubAccount[];
  readonly candidates: readonly LinkCandidate[];
}) {
  const [state, formAction, pending] = useActionState(linkAccountAction, IDLE_FORM);
  const [unlinkState, unlinkAction, unlinking] = useActionState(unlinkAccountAction, IDLE_FORM);
  const who = accountIdentity(account);
  const options = linkableCandidates(account, candidates, accounts);

  return (
    <div className="stack" style={{ gap: '0.35rem' }}>
      {who.kind === 'linked' ? (
        <>
          <strong title={who.legalName}>{who.display}</strong>
          <span className="hint">{account.email}</span>
          <form action={unlinkAction} style={{ display: 'inline' }}>
            <input type="hidden" name="userId" value={account.userId} />
            <input type="hidden" name="email" value={account.email} />
            <button type="submit" className="secondary" disabled={unlinking}>
              {unlinking ? '…' : 'Not this person'}
            </button>
          </form>
        </>
      ) : (
        <>
          <span className="hint">
            <em>Not linked</em> — the club knows this account, not who it belongs to.
          </span>
          <span>{account.email}</span>
          {options.length === 0 ? (
            <span className="hint">
              Every person on record already belongs to an account.
            </span>
          ) : (
            <form action={formAction} style={{ display: 'inline-flex', gap: '0.35rem' }}>
              <input type="hidden" name="userId" value={account.userId} />
              <input type="hidden" name="email" value={account.email} />
              <select
                name="personId"
                defaultValue=""
                aria-label={`Who is ${account.email}?`}
              >
                <option value="" disabled>
                  Who is this?
                </option>
                {options.map((candidate) => (
                  <option key={candidate.personId} value={candidate.personId}>
                    {candidateLabel(candidate)}
                  </option>
                ))}
              </select>
              <button type="submit" className="secondary" disabled={pending}>
                {pending ? '…' : 'Link'}
              </button>
            </form>
          )}
        </>
      )}
      {state.status === 'error' && <span className="hint">{state.message}</span>}
      {unlinkState.status === 'error' && <span className="hint">{unlinkState.message}</span>}
    </div>
  );
}

export function RoleLegend() {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>What each role permits</h3>
      <table>
        <thead>
          <tr>
            <th>Role</th>
            <th>Permits</th>
          </tr>
        </thead>
        <tbody>
          {CLUB_ROLES.map((role) => (
            <tr key={role}>
              <td>
                <strong>{role}</strong>
              </td>
              <td>
                {ROLE_SUMMARY[role]}
                {READ_ONLY_ROLES.includes(role) && (
                  <span className="pill pill-warn" style={{ marginLeft: '0.4rem' }}>
                    read-only
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint" style={{ marginBottom: 0 }}>
        <strong>Every role reads almost everything.</strong> A role decides what somebody may
        change, and barely restricts what they may see &mdash; a coach can read every
        family&rsquo;s balance and consents across the whole club. Whether that is right is an
        open question, recorded rather than quietly changed.
      </p>
    </div>
  );
}

/** Grants beyond those already held, offered per account. */
export function GrantMoreForm({ account }: { readonly account: ClubAccount }) {
  const [state, formAction, pending] = useActionState(grantAccessAction, IDLE_FORM);
  const options = grantableRoles(account);
  if (options.length === 0) return null;

  return (
    <form action={formAction} style={{ display: 'inline-flex', gap: '0.35rem' }}>
      <input type="hidden" name="email" value={account.email} />
      <select name="role" defaultValue={options[0]} aria-label={`Add a role for ${account.email}`}>
        {options.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? '…' : 'Add'}
      </button>
      {state.status === 'error' && <span className="hint">{state.message}</span>}
    </form>
  );
}

/**
 * The whole screen's interactive half.
 *
 * One component rather than four scattered through the page, because each
 * row's Remove button needs its own action state and the last-administrator
 * rule needs the whole list to decide.
 */
export function AccessForms({
  accounts,
  candidates,
}: {
  readonly accounts: readonly ClubAccount[];
  readonly candidates: readonly LinkCandidate[];
}) {
  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Accounts</h3>
        {accounts.length === 0 ? (
          <p className="hint" style={{ marginBottom: 0 }}>
            Nobody. That should be impossible while you are reading this, so something is wrong.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Who</th>
                <th>Roles</th>
                <th>Add a role</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.userId}>
                  <td>
                    {account.isSelf && (
                      <span className="pill" style={{ float: 'right' }}>
                        you
                      </span>
                    )}
                    <AccountIdentity
                      account={account}
                      accounts={accounts}
                      candidates={candidates}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {account.roles.map((role) => (
                        <span
                          key={role}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <span className="pill">{role}</span>
                          <RevokeButton account={account} role={role} accounts={accounts} />
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <GrantMoreForm account={account} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <GrantAccessForm />
      <RoleLegend />
    </>
  );
}
