import { redirect } from 'next/navigation';

import { loadMe, type ClubLink } from '../../data/me.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { ROLE_HUE } from '../../web/me-view.ts';
import { ROLE_LABEL, resolveActive, type RoleHolding } from '../../web/role-context.ts';
import { todayIn } from '../../web/today.ts';
import { IdentityRail } from '../_components/IdentityRail.tsx';
import { signOutAction } from '../sign-in/actions.ts';
import { CoachWorkspace } from './_workspaces/CoachWorkspace.tsx';
import { CommitteeWorkspace } from './_workspaces/CommitteeWorkspace.tsx';
import { GuardianWorkspace } from './_workspaces/GuardianWorkspace.tsx';
import { PlayerWorkspace } from './_workspaces/PlayerWorkspace.tsx';
import { RefereeWorkspace } from './_workspaces/RefereeWorkspace.tsx';

export const dynamic = 'force-dynamic';

/**
 * The person-facing shell: one identity rail that never changes, and the
 * workspace beside it that a role switch redraws.
 *
 * The rail is the argument scope 32 is making — you are still the same
 * person, only the lens moved — and BR61 is the rule it obeys: several roles
 * held and none chosen is a question put to the user, never a guess. A role
 * context is a URL (`?role=coach&club=…`), so switching is explicit, shareable
 * and survives the back button.
 */
export default async function MePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly role?: string; readonly club?: string }>;
}) {
  const params = await searchParams;
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/me');

  // Same guard as the club screens: an emailed link arrives without a
  // password, and the way back once it expires is another link by hand.
  const { data: needsPassword } = await client.rpc('app_needs_password');
  if (needsPassword === true) redirect('/set-password');

  const today = todayIn();
  const me = await loadMe(client, user.id, today);
  const active = resolveActive(me.holdings, { key: params.role ?? null, clubId: params.club ?? null });
  const link = active === null ? null : me.links.find((l) => l.clubId === active.holding.clubId) ?? null;

  return (
    <div className="role-shell">
      <IdentityRail
        personName={me.person?.name ?? (user.email ?? 'Signed in')}
        legalName={me.person?.legalName ?? 'not linked to a person yet'}
        contexts={me.holdings}
        active={active}
        clubCount={me.links.length}
        officerHref={me.isClubOfficer ? '/registrar' : null}
        signOut={signOutAction}
      />

      <main className="work-body" id="main">
        {active !== null && link !== null ? (
          <>
            <p className="acting-as" style={{ ['--role-hue' as string]: ROLE_HUE[active.holding.key] }}>
              <span>
                <span className="swatch" aria-hidden="true" />
                You are acting as <b>{ROLE_LABEL[active.holding.key]}</b>
                {active.holding.scope !== null && ` · ${active.holding.scope}`}
                {active.how === 'sole' && (
                  <span className="hint" style={{ display: 'inline', marginLeft: '0.5rem' }}>
                    — your only role, so nothing was switched
                  </span>
                )}
              </span>
              <span className="club-chip">
                {link.clubName.toUpperCase()}
                {link.season !== null && ` · ${link.season.name.toUpperCase()}`}
              </span>
            </p>
            <Workspace active={active.holding} link={link} client={client} today={today} />
          </>
        ) : (
          <Prompt me={me} />
        )}
      </main>
    </div>
  );
}

async function Workspace({
  active,
  link,
  client,
  today,
}: {
  readonly active: RoleHolding;
  readonly link: ClubLink;
  readonly client: Awaited<ReturnType<typeof createRequestClient>>;
  readonly today: string;
}) {
  switch (active.key) {
    case 'player':
      return <PlayerWorkspace client={client} link={link} today={today} />;
    case 'coach':
      return <CoachWorkspace client={client} link={link} today={today} />;
    case 'referee':
      return <RefereeWorkspace client={client} link={link} />;
    case 'guardian':
      return <GuardianWorkspace client={client} link={link} today={today} />;
    case 'committee':
      return <CommitteeWorkspace client={client} link={link} today={today} />;
  }
}

/**
 * The screen BR61 makes unavoidable: several roles, none chosen — or no
 * roles at all, which has three honest causes and gets three answers.
 */
function Prompt({ me }: { readonly me: Awaited<ReturnType<typeof loadMe>> }) {
  if (!me.hasAccess) {
    return (
      <div className="role-prompt">
        <h2>Signed in, but with no access recorded</h2>
        <p className="lede">
          You can see nothing, which is the correct answer to give a stranger — access comes from a club
          membership or a family invitation, never from having an account by itself. Not sure which club you
          are in?{' '}
          <a href="/demo">Ask the front door.</a>
        </p>
      </div>
    );
  }
  if (me.links.length === 0) {
    return (
      <div className="role-prompt">
        <h2>Your account is not linked to a person yet</h2>
        <p className="lede">
          A club administrator records which Person a sign-in belongs to — it is never inferred from an
          email address, and nobody may claim an identity for themselves (BR107). Until that link exists
          there is no role to act in, and this screen says so rather than guessing (BR108).
        </p>
        {me.isClubOfficer && (
          <p>
            <a className="button secondary" href="/registrar">
              Go to club administration
            </a>
          </p>
        )}
      </div>
    );
  }
  if (me.holdings.length === 0) {
    return (
      <div className="role-prompt">
        <h2>No role this season</h2>
        <p className="lede">
          You are linked to a person at {me.links.map((l) => l.clubName).join(' and ')}, but hold no role in
          the current season. A registrar attaches roles per season.
        </p>
      </div>
    );
  }
  return (
    <div className="role-prompt">
      <p className="eyebrow">One person · {me.holdings.length} roles</p>
      <h2>Which role are you acting in?</h2>
      <p className="lede">
        You hold more than one, and the app will not guess — switching is explicit, and no switch merges two
        roles&rsquo; views. Choose one in the rail, or here.{' '}
        <span className="mono" style={{ fontSize: '0.75rem' }}>BR61</span>
      </p>
      <div className="role-choices">
        {me.holdings.map((h) => (
          <a
            key={`${h.key}:${h.clubId}`}
            className="role-choice"
            href={`/me?role=${h.key}&club=${encodeURIComponent(h.clubId)}`}
            style={{ ['--role-hue' as string]: ROLE_HUE[h.key] }}
          >
            <span className="role-choice-name">{ROLE_LABEL[h.key]}</span>
            <span className="role-choice-where">
              {h.clubName}
              {h.scope !== null && ` · ${h.scope}`}
            </span>
            {h.pending > 0 && <span className="role-item-count">{h.pending} waiting</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
