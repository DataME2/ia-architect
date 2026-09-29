'use client';

import { useActionState, useState } from 'react';

import {
  FILTER_LABEL,
  filterDirectory,
  workspaceSummary,
  type DirectoryEntry,
  type DirectoryFilter,
} from '../../../web/access-directory.ts';
import {
  WORKSPACE_STATE_LABEL,
  WORKSPACE_STATE_TONE,
  type WorkspaceState,
} from '../../../web/workspace-invite-view.ts';
import {
  ACCESS_LABEL,
  CLUB_ROLES,
  READ_ONLY_ROLES,
  ROLE_SUMMARY,
  accessLabel,
  accountIdentity,
  adminNeedsLinkFirst,
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
          <label htmlFor="role">Access level</label>
          <select id="role" name="role" defaultValue="registrar">
            {CLUB_ROLES.map((role) => (
              <option key={role} value={role}>
                {ACCESS_LABEL[role]} &mdash; {ROLE_SUMMARY[role]}
              </option>
            ))}
          </select>
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            <strong>Admin needs the account linked to who it belongs to first</strong> (BR106) —
            an administrator&rsquo;s account may not be a shared or role-based mailbox. If you are
            not sure yet, grant a lesser role now and add admin once they are linked, below.
          </p>
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
  today,
}: {
  readonly account: ClubAccount;
  readonly accounts: readonly ClubAccount[];
  readonly candidates: readonly LinkCandidate[];
  readonly today: string;
}) {
  const [state, formAction, pending] = useActionState(linkAccountAction, IDLE_FORM);
  const [unlinkState, unlinkAction, unlinking] = useActionState(unlinkAccountAction, IDLE_FORM);
  const who = accountIdentity(account);
  const options = linkableCandidates(account, candidates, accounts, today);

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
            <em>Not linked</em> — the club knows this account, not who it belongs to. Accounts that
            arrive through a Governance appointment are linked automatically; pick the person only
            for one that did not.
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
                    {candidateLabel(candidate, today)}
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
    <div>
      <table>
        <thead>
          <tr>
            <th>Access level</th>
            <th>Permits</th>
          </tr>
        </thead>
        <tbody>
          {CLUB_ROLES.map((role) => (
            <tr key={role}>
              <td>
                <strong>{ACCESS_LABEL[role]}</strong>
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
          <tr>
            <td>
              <strong>Player</strong>
            </td>
            <td>
              Their own record in their own workspace &mdash; nothing about anybody else. Not granted
              here: sent automatically to a player of 13 or over once they are a player this season and
              their registration is COMPLETE (BR150).{' '}
              <span className="pill">own workspace</span>
            </td>
          </tr>
          <tr>
            <td>
              <strong>Parent / Guardian</strong>
            </td>
            <td>
              Their own children&rsquo;s records, in a family workspace. Not granted here: sent
              automatically to a guardian with authority once their child under 18 is a player this
              season and COMPLETE (BR126). <span className="pill">own workspace</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="hint" style={{ marginBottom: 0 }}>
        <strong>Every access level reads almost everything.</strong> A role decides what somebody may
        change, and barely restricts what they may see &mdash; a coach can read every
        family&rsquo;s balance and consents across the whole club. Whether that is right is an
        open question, recorded rather than quietly changed.
      </p>
    </div>
  );
}

/**
 * Grants beyond those already held, offered per account.
 *
 * BR106: `admin` is missing from the options for an unlinked account
 * rather than offered and refused — `grant_club_role` (0042) checks the
 * same `account_person` link, so this is `RevokeButton`'s own pattern
 * applied to adding a role instead of removing one.
 */
export function GrantMoreForm({ account }: { readonly account: ClubAccount }) {
  const [state, formAction, pending] = useActionState(grantAccessAction, IDLE_FORM);
  const options = grantableRoles(account);
  const needsLink = adminNeedsLinkFirst(account);

  if (options.length === 0) {
    return needsLink ? <AdminNeedsLinkHint /> : null;
  }

  return (
    <div className="stack" style={{ gap: '0.3rem' }}>
      <form action={formAction} style={{ display: 'inline-flex', gap: '0.35rem' }}>
        <input type="hidden" name="email" value={account.email} />
        <select name="role" defaultValue={options[0]} aria-label={`Add access for ${account.email}`}>
          {options.map((role) => (
            <option key={role} value={role}>
              {ACCESS_LABEL[role]}
            </option>
          ))}
        </select>
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? '…' : 'Add'}
        </button>
      </form>
      {state.status === 'error' && <span className="hint">{state.message}</span>}
      {needsLink && <AdminNeedsLinkHint />}
    </div>
  );
}

function AdminNeedsLinkHint() {
  return (
    <span className="hint" title="BR106: an administrator's account must belong to one identified person.">
      admin isn&rsquo;t offered until this account is linked to who it belongs to, above
    </span>
  );
}

/** One person's row: who, what they can do at a glance, and — opened — why, and what to change. */
function DirectoryRow({
  entry,
  accounts,
  candidates,
  today,
}: {
  readonly entry: DirectoryEntry;
  readonly accounts: readonly ClubAccount[];
  readonly candidates: readonly LinkCandidate[];
  readonly today: string;
}) {
  const account = entry.account;
  const meta = [entry.email, workspaceSummary(entry.workspaces)]
    .filter((x): x is string => x !== null && x !== '')
    .join(' · ');

  return (
    <li className="person-row">
      <details>
        <summary>
          <div>
            <p className="person-row-name">
              {entry.name}
              {account?.isSelf === true && (
                <>
                  {' '}
                  <span className="pill">you</span>
                </>
              )}
            </p>
            <p className="person-row-meta">{meta === '' ? 'No email on record' : meta}</p>
          </div>
          <div className="person-row-chips">
            {entry.staff.map((s) => (
              <span key={s.role} className="pill pill-ok">
                {s.label}
              </span>
            ))}
            {entry.workspaces.some((w) => w.kind === 'guardian') && (
              <span className={WORKSPACE_STATE_TONE[worstState(entry.workspaces, 'guardian')]}>
                Family workspace
              </span>
            )}
            {entry.workspaces.some((w) => w.kind === 'player') && (
              <span className={WORKSPACE_STATE_TONE[worstState(entry.workspaces, 'player')]}>
                Own workspace
              </span>
            )}
            {entry.attention.length > 0 && (
              <span className="pill pill-warn" title={entry.attention.join('; ')}>
                needs attention
              </span>
            )}
          </div>
        </summary>

        <div className="person-row-body stack">
          {entry.attention.length > 0 && (
            <p className="notice" style={{ margin: 0 }}>
              {entry.attention.join(' · ')}
            </p>
          )}

          {account !== null && (
            <div>
              <h4>Whose account is this?</h4>
              <AccountIdentity account={account} accounts={accounts} candidates={candidates} today={today} />
            </div>
          )}

          {account !== null && (
            <div>
              <h4>Staff access</h4>
              {entry.staff.length === 0 ? (
                <p className="hint">None.</p>
              ) : (
                <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, gap: '0.4rem' }}>
                  {entry.staff.map((s) => (
                    <li
                      key={s.role}
                      style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}
                    >
                      <strong>{s.label}</strong>
                      <span className="hint">
                        {s.why.kind === 'granted-by-hand'
                          ? 'granted on this screen'
                          : `from ${s.why.labels.join(', ')}${s.why.allEnded ? ' — ended; kept until removed (BR154)' : ''}`}
                      </span>
                      <RevokeButton account={account} role={s.role} accounts={accounts} />
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: '0.5rem' }}>
                <GrantMoreForm account={account} />
              </div>
            </div>
          )}

          {entry.workspaces.length > 0 && (
            <div>
              <h4>Workspaces</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {entry.workspaces.map((w) => (
                  <li key={`${w.kind}-${w.forPlayer}`}>
                    {w.kind === 'player' ? 'Own workspace' : `Family workspace for ${w.forPlayer}`}{' '}
                    <span className={WORKSPACE_STATE_TONE[w.state]}>{WORKSPACE_STATE_LABEL[w.state]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}

/** A chip shows the state most in need of a human, so a problem never hides behind an OK one. */
const STATE_URGENCY: readonly WorkspaceState[] = ['no-email', 'not-sent', 'waiting-complete', 'link-sent', 'active'];

function worstState(workspaces: DirectoryEntry['workspaces'], kind: 'player' | 'guardian'): WorkspaceState {
  const states = workspaces.filter((w) => w.kind === kind).map((w) => w.state);
  return STATE_URGENCY.find((s) => states.includes(s)) ?? 'active';
}

const FILTERS: readonly DirectoryFilter[] = ['all', 'staff', 'workspace', 'attention'];

/**
 * The whole screen's interactive half: one searchable list of people.
 *
 * Each row's Remove button needs its own action state and the
 * last-administrator rule needs every account to decide, so the list and
 * its controls live in one component.
 */
export function AccessForms({
  entries,
  accounts,
  candidates,
  today,
}: {
  readonly entries: readonly DirectoryEntry[];
  readonly accounts: readonly ClubAccount[];
  readonly candidates: readonly LinkCandidate[];
  readonly today: string;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DirectoryFilter>('all');
  const shown = filterDirectory(entries, query, filter);

  return (
    <>
      <div className="card filter-bar">
        <div className="search-field">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            aria-label="Search people by name or email"
          />
        </div>
        <div className="chips" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className="chip"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABEL[f]}
              <span className="chip-count">{filterDirectory(entries, '', f).length}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="empty">Nobody matches.</p>
      ) : (
        <ul className="card people-list">
          {shown.map((entry) => (
            <DirectoryRow
              key={entry.key}
              entry={entry}
              accounts={accounts}
              candidates={candidates}
              today={today}
            />
          ))}
        </ul>
      )}

      <details className="card" id="grant">
        <summary>
          <strong>Grant staff access by email</strong>{' '}
          <span className="hint">&mdash; for exceptions; an appointment on Governance does this for you</span>
        </summary>
        <div style={{ marginTop: '0.75rem' }}>
          <GrantAccessForm />
        </div>
      </details>

      <details className="card">
        <summary>
          <strong>What each access level permits</strong>
        </summary>
        <div style={{ marginTop: '0.75rem' }}>
          <RoleLegend />
        </div>
      </details>
    </>
  );
}
