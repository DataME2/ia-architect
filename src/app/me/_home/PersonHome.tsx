import { RoleOverview } from '../../../components/ui/RoleOverview.tsx';
import { WaitingList } from '../../../components/ui/WaitingList.tsx';
import { buildHome } from '../../../web/home-view.ts';
import type { InboxNotification } from '../../../web/inbox-view.ts';
import { ROLE_HUE } from '../../../web/me-view.ts';
import type { RoleHolding } from '../../../web/role-context.ts';

/**
 * Scope 89: several roles and none chosen is the person's home. It lists
 * their own waiting items (the bell's, BR159) and the roles side by side;
 * every item and card is a link into one explicit role context (BR61).
 */
export function PersonHome({
  holdings,
  notifications,
}: {
  readonly holdings: readonly RoleHolding[];
  readonly notifications: readonly InboxNotification[];
}) {
  const home = buildHome(holdings, notifications);
  return (
    // Wider than the reading width the other prompts use: this is a dashboard.
    <div className="role-prompt" style={{ maxWidth: 'var(--shell-width)' }}>
      <p className="eyebrow">One person · {holdings.length} roles</p>
      <h2>Your home</h2>
      <p className="lede">
        Everything waiting on you, in every role you hold. Open an item or a role to work in it: switching is explicit,
        and no switch merges two roles&rsquo; views.{' '}
        <span className="mono" style={{ fontSize: '0.75rem' }}>BR61 · BR159</span>
      </p>
      <WaitingList items={home.items} />
      <RoleOverview
        roles={home.roles.map((r) => ({ ...r, hue: ROLE_HUE[r.key] }))}
        style={{ marginTop: 'var(--space-6)' }}
      />
    </div>
  );
}
