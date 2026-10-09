/**
 * The person's home on `/me` (scope 89): "What is waiting for you", across
 * every role they hold, and the roles side by side.
 *
 * **BR61 still governs.** The home is shown only when several roles are held
 * and none is chosen. It lists the account's **own** waiting items, which its
 * bell already shows in every context (BR159), and each item links into an
 * explicit role switch. No workspace content is rendered here, so no two
 * roles' views are merged. Open question 67's reading already lets a chip
 * count a role that is not active; the home shows the same items by name.
 *
 * Pure, so what is listed and in which order is a unit test.
 */
import type { InboxNotification } from './inbox-view.ts';
import { ROLE_LABEL, ROLE_ORDER, type RoleHolding, type RoleKey } from './role-context.ts';
import { WAITING_KINDS, type WaitingKind } from './waiting.ts';

/** Gold is waiting on you; red is blocked or overdue (DESIGN.md: no state by hue alone). */
export type HomeTone = 'pending' | 'blocked';

export interface HomeItem {
  readonly id: string;
  readonly headline: string;
  readonly detail: string | null;
  readonly href: string;
  /** The role it is answered in, or null for club administration. */
  readonly role: RoleKey | null;
  readonly roleLabel: string;
  readonly clubName: string | null;
  readonly tag: string;
  readonly tone: HomeTone;
}

export interface HomeRoleCard {
  readonly key: RoleKey;
  readonly label: string;
  readonly clubId: string;
  readonly clubName: string;
  readonly scope: string | null;
  readonly href: string;
  readonly waiting: number;
}

export interface Home {
  readonly items: readonly HomeItem[];
  readonly roles: readonly HomeRoleCard[];
}

/**
 * Most time-critical first. An offered appointment and an unanswered
 * Saturday have a match date behind them; a confirmation and a payment
 * nomination look back; a correction is the club's own queue.
 */
const PRIORITY: Readonly<Record<WaitingKind | 'registration_incomplete' | 'agm_overdue', number>> = {
  agm_overdue: 0,
  designation_unanswered: 1,
  availability_unanswered: 2,
  registration_incomplete: 3,
  match_unconfirmed: 4,
  claim_unsettled: 5,
  correction_proposed: 6,
};

const TAG: Readonly<Record<WaitingKind, string>> = {
  designation_unanswered: 'Appointment offered',
  availability_unanswered: 'Availability',
  match_unconfirmed: 'Confirm the match',
  claim_unsettled: 'Where to pay you',
  correction_proposed: 'Club review',
};

const KNOWN_KINDS: ReadonlySet<string> = new Set(WAITING_KINDS);

function isRoleKey(value: string | undefined): value is RoleKey {
  return value !== undefined && (ROLE_ORDER as readonly string[]).includes(value);
}

/**
 * The role and club a waiting item is answered in, read from its link
 * (`/me?role=referee&club=…`). Anything else, such as `/registrar/…`, is
 * club administration. Parsed by hand: this module has no DOM, and so no `URL`.
 */
export function whereAnswered(linkPath: string | null): { readonly role: RoleKey | null; readonly clubId: string | null } {
  if (linkPath === null || !linkPath.startsWith('/me?')) return { role: null, clubId: null };
  const params = new Map(
    linkPath
      .slice(4)
      .split('&')
      .map((pair) => {
        const [k = '', v = ''] = pair.split('=');
        return [k, decodeURIComponent(v)] as const;
      }),
  );
  const role = params.get('role');
  return { role: isRoleKey(role) ? role : null, clubId: params.get('club') ?? null };
}

/** The address of a role context: the same URL the rail's switcher uses. */
export function roleHref(key: RoleKey, clubId: string): string {
  return `/me?role=${key}&club=${encodeURIComponent(clubId)}`;
}

/**
 * Build the home from the account's open notifications and its holdings.
 *
 * - Only waiting kinds are listed; announcements stay in the bell.
 * - A holding's own `pending` facts become items too: incomplete
 *   registrations for a guardian, an overdue AGM for the committee (BR86).
 * - Sorted by priority, then oldest first, so what has waited longest leads.
 * - A role card's count is the number of listed items answered in it.
 */
export function buildHome(holdings: readonly RoleHolding[], notifications: readonly InboxNotification[]): Home {
  const clubName = new Map(holdings.map((h) => [h.clubId, h.clubName]));
  const ranked: { readonly item: HomeItem; readonly rank: number; readonly at: string }[] = [];

  for (const n of notifications) {
    if (!KNOWN_KINDS.has(n.kind)) continue;
    const kind = n.kind as WaitingKind;
    const where = whereAnswered(n.linkPath);
    ranked.push({
      rank: PRIORITY[kind],
      at: n.createdAt,
      item: {
        id: n.id,
        headline: n.headline,
        detail: n.detail,
        href: n.linkPath ?? '/me',
        role: where.role,
        roleLabel: where.role === null ? 'Club administration' : ROLE_LABEL[where.role],
        clubName: where.clubId === null ? null : clubName.get(where.clubId) ?? null,
        tag: TAG[kind],
        tone: 'pending',
      },
    });
  }

  for (const h of holdings) {
    if (h.pending === 0) continue;
    if (h.key === 'guardian') {
      ranked.push({
        rank: PRIORITY.registration_incomplete,
        at: '',
        item: {
          id: `registration:${h.clubId}`,
          headline:
            h.pending === 1
              ? 'A registration in your family is not complete'
              : `${h.pending} registrations in your family are not complete`,
          detail: 'Documents, fees or a guardian detail may be missing. Open each child to see what.',
          href: roleHref('guardian', h.clubId),
          role: 'guardian',
          roleLabel: ROLE_LABEL.guardian,
          clubName: h.clubName,
          tag: 'Registration',
          tone: 'pending',
        },
      });
    }
    if (h.key === 'committee') {
      ranked.push({
        rank: PRIORITY.agm_overdue,
        at: '',
        item: {
          id: `agm:${h.clubId}`,
          headline: 'The AGM is overdue',
          detail: 'The committee still governs, but its mandate is unrenewed until the AGM is held (BR86).',
          href: roleHref('committee', h.clubId),
          role: 'committee',
          roleLabel: ROLE_LABEL.committee,
          clubName: h.clubName,
          tag: 'AGM overdue',
          tone: 'blocked',
        },
      });
    }
  }

  const items = ranked
    .sort((a, b) => a.rank - b.rank || a.at.localeCompare(b.at))
    .map((r) => r.item);

  const roles = holdings.map((h) => ({
    key: h.key,
    label: ROLE_LABEL[h.key],
    clubId: h.clubId,
    clubName: h.clubName,
    scope: h.scope,
    href: roleHref(h.key, h.clubId),
    waiting: items.filter((i) => i.role === h.key && (i.clubName === null || i.clubName === h.clubName)).length,
  }));

  return { items, roles };
}
