import { notFound } from 'next/navigation';

import { PersonHome } from '../../me/_home/PersonHome.tsx';
import type { InboxNotification } from '../../../web/inbox-view.ts';
import type { RoleHolding } from '../../../web/role-context.ts';

/**
 * A design preview of the person's home (scope 89), on sample data.
 *
 * **Development only**: a production build answers 404, so sample data never
 * reaches a real club. The fixtures below have exactly the shapes the real
 * page loads (`loadMe`'s holdings, `loadNotifications`'s inbox), and they go
 * through the same `buildHome` decision, so what this shows is what a
 * multi-role person sees, without signing in as one.
 */

const CLUB = '00000000-0000-0000-0000-0000000000c1';
const link = (role: string, child?: string) => `/me?role=${role}&club=${CLUB}${child === undefined ? '' : `&child=${child}`}`;

const HOLDINGS: readonly RoleHolding[] = [
  { key: 'player', clubId: CLUB, clubName: 'North Star FC', scope: 'Senior Men', pending: 0 },
  { key: 'referee', clubId: CLUB, clubName: 'North Star FC', scope: null, pending: 0 },
  { key: 'guardian', clubId: CLUB, clubName: 'North Star FC', scope: 'for Tané and Mia', pending: 1 },
  { key: 'committee', clubId: CLUB, clubName: 'North Star FC', scope: 'Treasurer', pending: 1 },
];

const NOTIFICATIONS: readonly InboxNotification[] = [
  {
    id: 'n1',
    kind: 'designation_unanswered',
    headline: 'You are offered as referee against Souths United on 2026-10-11',
    detail: 'Accept or decline it (BR113).',
    linkPath: link('referee'),
    createdAt: '2026-10-07T08:00:00Z',
    readAt: null,
  },
  {
    id: 'n2',
    kind: 'availability_unanswered',
    headline: 'Are you available against Eastern Lions on 2026-10-12?',
    detail: 'The coach is waiting on an answer (BR62).',
    linkPath: link('player'),
    createdAt: '2026-10-08T08:00:00Z',
    readAt: null,
  },
  {
    id: 'n3',
    kind: 'availability_unanswered',
    headline: 'Is Tané Rodriguez available against Bayside on 2026-10-12?',
    detail: 'The coach is waiting on an answer (BR62).',
    linkPath: link('guardian', 'child-1'),
    createdAt: '2026-10-08T09:00:00Z',
    readAt: null,
  },
  {
    id: 'n4',
    kind: 'claim_unsettled',
    headline: 'You are owed $45.00 for Westside on 2026-10-04',
    detail: 'Nominate the account it is paid to; every approved claim is paid out (BR152, BR161).',
    linkPath: link('referee'),
    createdAt: '2026-10-05T08:00:00Z',
    readAt: null,
  },
  {
    id: 'n5',
    kind: 'committee_confirmation',
    headline: 'The AGM election confirmed 3 officers',
    detail: 'An announcement: stays in the bell, never on the home list.',
    linkPath: '/registrar/governance',
    createdAt: '2026-10-08T10:00:00Z',
    readAt: null,
  },
];

export default function HomePreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="work-body" id="main" style={{ padding: 'var(--space-5)' }}>
      <p className="hint" style={{ marginTop: 0 }}>
        Design preview on sample data (development only). Sign in with several roles to see your own.
      </p>
      <PersonHome holdings={HOLDINGS} notifications={NOTIFICATIONS} />
    </main>
  );
}
