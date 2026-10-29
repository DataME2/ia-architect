import { notFound } from 'next/navigation';

import { IdentityRail } from '../../../components/ui/IdentityRail.tsx';
import { Panel } from '../../../components/ui/Panel.tsx';
import { RegistrarNav } from '../../../components/ui/RegistrarNav.tsx';
import { RegistrarShell } from '../../../components/ui/RegistrarShell.tsx';
import { StatusPill } from '../../../components/ui/StatusPill.tsx';
import { REGISTRAR_NAV } from '../../../web/nav.ts';
import type { RoleHolding } from '../../../web/role-context.ts';

const HOLDINGS: RoleHolding[] = [
  { key: 'coach', clubId: 'c1', clubName: 'North Star FC', scope: 'U12 Academy', pending: 2 },
  { key: 'guardian', clubId: 'c1', clubName: 'North Star FC', scope: 'for Tané', pending: 1 },
];

/**
 * The workspace frame on sample content (scope 125, development only): the
 * club menu at the window's left edge, and a page of the two-to-one grid
 * beside it, so the frame can be seen at every width without signing in.
 * `?me=1` draws /me's frame instead: the identity rail at the left edge.
 */
export default async function FramePreview({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly me?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const rows = ['Riley Striker', 'Ava Sweeper', 'Noah Winger', 'Isla Midfield'];
  const grid = (
    <div className="cols">
      <div className="stack">
        <Panel title="Waiting for a check" meta="4">
          <ul className="roster">
            {rows.map((r) => (
              <li key={r}>
                <span className="who">{r}</span>
                <StatusPill variant="pending" size="sm" label="No check yet" />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recorded this season" meta="12">
          <p className="empty" style={{ margin: 0 }}>Twelve checks, all verified, all valid to the end of the season.</p>
        </Panel>
      </div>
      <div className="stack">
        <Panel title="Expiring before the season ends" meta="1">
          <p className="callout wait" style={{ margin: 0 }}>
            <b>Sam Coach</b> — the card expires on 2026-11-30, before the season ends.
          </p>
        </Panel>
      </div>
    </div>
  );
  if ((await searchParams).me === '1') {
    return (
      <div className="role-shell ws-frame">
        <IdentityRail personName="Sam Nguyen" legalName="Samuel Nguyen" contexts={HOLDINGS} activeRoleKey="coach" activeClubId="c1" clubCount={1} />
        <div className="work-body ws-content">
          <p className="hint">Design preview on sample data (development only).</p>
          <div className="work-head">
            <h2>U12 Academy — selection</h2>
            <p>The frame on /me: the rail pinned left, the workspace full width.</p>
          </div>
          {grid}
        </div>
      </div>
    );
  }
  return (
    <RegistrarShell
      railPosition="left"
      nav={<RegistrarNav items={REGISTRAR_NAV.map((i) => ({ ...i }))} activePathname="/registrar/clearances" />}
    >
      <p className="hint">Design preview on sample data (development only).</p>
      <h2>Working with Children Checks</h2>
      <p className="lede">The frame: the menu pinned left, the work full width, the grid collapsing by its own width.</p>
      {grid}
    </RegistrarShell>
  );
}
