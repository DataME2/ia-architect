/**
 * The Access screen as one list of people (scope 68): everybody who can —
 * or should be able to — sign in at the club, with what they can do.
 *
 * Staff access and workspaces arrive from different tables; an admin
 * thinks in people. A Person who is Treasurer and a guardian is one row
 * with two chips, not two lists to reconcile — the same instinct as P1.
 */
import { accessLabel, type ClubAccount } from './access-view.ts';
import { explainRole, type AccessSource, type RoleExplanation } from './appointment-view.ts';
import type { WorkspaceRow, WorkspaceState } from './workspace-invite-view.ts';

export interface StaffGrant {
  readonly role: string;
  readonly label: string;
  readonly why: RoleExplanation;
}

export interface WorkspaceGrant {
  readonly kind: WorkspaceRow['kind'];
  readonly forPlayer: string;
  readonly state: WorkspaceState;
}

export interface DirectoryEntry {
  /** A person id, or `account:<userId>` for an account nobody has linked. */
  readonly key: string;
  readonly name: string;
  readonly email: string | null;
  /** The staff account, when this person has one. */
  readonly account: ClubAccount | null;
  readonly staff: readonly StaffGrant[];
  readonly workspaces: readonly WorkspaceGrant[];
  /** Something an admin should act on — see `attentionReasons`. */
  readonly attention: readonly string[];
}

export type DirectoryFilter = 'all' | 'staff' | 'workspace' | 'attention';

export const FILTER_LABEL: Readonly<Record<DirectoryFilter, string>> = {
  all: 'All',
  staff: 'Staff access',
  workspace: 'Workspaces',
  attention: 'Needs attention',
};

export function buildDirectory(
  accounts: readonly ClubAccount[],
  workspaces: readonly { readonly playerName: string; readonly rows: readonly WorkspaceRow[] }[],
  sources: readonly AccessSource[],
  /** People under 13 (BR63): a login linked to one of them is a mistake to surface. */
  children: ReadonlySet<string> = new Set(),
): DirectoryEntry[] {
  const byKey = new Map<string, {
    name: string; email: string | null; account: ClubAccount | null;
    staff: StaffGrant[]; workspaces: WorkspaceGrant[];
  }>();

  for (const a of accounts) {
    const key = a.personId ?? `account:${a.userId}`;
    const name = a.personId === null
      ? a.email
      : (a.preferredName ?? '').trim() || (a.legalName ?? a.email);
    byKey.set(key, {
      name,
      email: a.email,
      account: a,
      staff: a.roles.map((role) => ({ role, label: accessLabel(role), why: explainRole(a.userId, role, sources) })),
      workspaces: [],
    });
  }

  for (const w of workspaces) {
    for (const r of w.rows) {
      const entry = byKey.get(r.personId)
        ?? { name: r.name, email: r.email, account: null, staff: [], workspaces: [] };
      entry.workspaces.push({ kind: r.kind, forPlayer: w.playerName, state: r.state });
      byKey.set(r.personId, entry);
    }
  }

  return [...byKey.entries()]
    .map(([key, e]) => ({
      key,
      ...e,
      attention: [
        ...(e.account?.personId != null && children.has(e.account.personId)
          ? ['This login is linked to a child under 13 — use “Not this person” and link it to the right adult']
          : []),
        ...attentionReasons(e.account, e.staff, e.workspaces),
      ],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function attentionReasons(
  account: ClubAccount | null,
  staff: readonly StaffGrant[],
  workspaces: readonly WorkspaceGrant[],
): string[] {
  const out: string[] = [];
  if (account !== null && account.personId === null) out.push('Account not linked to a person');
  for (const s of staff) {
    if (s.why.kind === 'appointment' && s.why.allEnded) out.push(`${s.label}: appointment has ended`);
  }
  if (workspaces.some((w) => w.state === 'no-email')) out.push('No email on record');
  if (workspaces.some((w) => w.state === 'not-sent')) out.push('Workspace link not sent');
  return out;
}

export function filterDirectory(
  entries: readonly DirectoryEntry[],
  query: string,
  filter: DirectoryFilter,
): DirectoryEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((e) => {
    if (filter === 'staff' && e.staff.length === 0) return false;
    if (filter === 'workspace' && e.workspaces.length === 0) return false;
    if (filter === 'attention' && e.attention.length === 0) return false;
    if (q === '') return true;
    return e.name.toLowerCase().includes(q) || (e.email ?? '').toLowerCase().includes(q);
  });
}

/** "Guardian of Santiago, Sebastian" / "Player" — the line under a name. */
export function workspaceSummary(workspaces: readonly WorkspaceGrant[]): string {
  const guardianOf = workspaces.filter((w) => w.kind === 'guardian').map((w) => w.forPlayer);
  const parts: string[] = [];
  if (workspaces.some((w) => w.kind === 'player')) parts.push('Player');
  if (guardianOf.length > 0) parts.push(`Guardian of ${guardianOf.join(', ')}`);
  return parts.join(' · ');
}
