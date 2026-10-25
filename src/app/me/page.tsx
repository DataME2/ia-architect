import { redirect } from 'next/navigation';

import { loadNotifications } from '../../data/inbox.ts';
import { loadMe, type ClubLink } from '../../data/me.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { syncEverythingWaiting } from '../../data/waiting.ts';
import type { InboxNotification } from '../../web/inbox-view.ts';
import { ROLE_HUE, initialsOf } from '../../web/me-view.ts';
import { ROLE_LABEL, resolveActive, type RoleHolding } from '../../web/role-context.ts';
import { rangeFrom } from '../../web/academy.ts';
import { todayIn } from '../../web/today.ts';
import { IdentityRail } from '../_components/IdentityRail.tsx';
import { NotificationBell } from '../registrar/_components/NotificationBell.tsx';
import { signOutAction } from '../sign-in/actions.ts';
import { CoachWorkspace } from './_workspaces/CoachWorkspace.tsx';
import { CommitteeWorkspace } from './_workspaces/CommitteeWorkspace.tsx';
import { GuardianWorkspace } from './_workspaces/GuardianWorkspace.tsx';
import { PlayerWorkspace } from './_workspaces/PlayerWorkspace.tsx';
import { RefereeWorkspace } from './_workspaces/RefereeWorkspace.tsx';
import { TechnicalDirectorWorkspace, tdTabFrom } from './_workspaces/TechnicalDirectorWorkspace.tsx';
import { SponsorSlot } from './_sponsors/SponsorSlot.tsx';
import { PersonHome } from './_home/PersonHome.tsx';
import { ageAt } from '../../domain/types.ts';
import { showsSponsors } from '../../web/sponsor-billing.ts';

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
  readonly searchParams: Promise<{
    readonly role?: string;
    readonly club?: string;
    readonly child?: string;
    /** The Technical Director's tab, team and range (scope 113). */
    readonly tab?: string;
    readonly team?: string;
    readonly range?: string;
  }>;
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
  // BR159 (scope 72): whatever the workspaces show as waiting on this
  // account goes into its own bell, retired once answered.
  await syncEverythingWaiting(client, me, today);
  const notifications = await loadNotifications(client, user.id);
  const active = resolveActive(me.holdings, { key: params.role ?? null, clubId: params.club ?? null });
  const link = active === null ? null : me.links.find((l) => l.clubId === active.holding.clubId) ?? null;
  const personName = me.person?.name ?? (user.email ?? 'Signed in');

  return (
    <div className="role-shell">
      <IdentityRail
        personName={personName}
        legalName={me.person?.legalName ?? 'not linked to a person yet'}
        contexts={me.holdings}
        active={active}
        clubCount={me.links.length}
        officerHref={me.isClubOfficer ? '/registrar' : null}
        homeHref={me.holdings.length > 1 ? '/me' : null}
        signOut={signOutAction}
      />

      <main className="work-body" id="main">
        <div className="me-bell">
          <NotificationBell notifications={notifications} />
        </div>
        {active !== null && link !== null ? (
          <>
            {/* The profile draft's card (scope 106): who you are, the role you
                are acting in, and where. Initials, not a photo, as the rail. */}
            <section
              className="profile-card"
              aria-labelledby="profile-name"
              style={{ ['--role-hue' as string]: ROLE_HUE[active.holding.key] }}
            >
              <span className="profile-avatar" aria-hidden="true">
                {initialsOf(personName)}
              </span>
              <div className="profile-main">
                <div className="profile-title">
                  <h2 id="profile-name">{personName}</h2>
                  <span className="profile-role">{ROLE_LABEL[active.holding.key]}</span>
                </div>
                <p className="profile-facts">
                  <span>{link.clubName}</span>
                  {link.season !== null && <span>{link.season.name}</span>}
                  {active.holding.scope !== null && <span>{active.holding.scope}</span>}
                </p>
                <p className="profile-acting">
                  <span className="swatch" aria-hidden="true" />
                  Acting as <b>{ROLE_LABEL[active.holding.key]}</b>
                  {active.how === 'sole' && <span className="hint"> — your only role, so nothing was switched</span>}
                </p>
              </div>
              {(me.holdings.length > 1 || me.isClubOfficer) && (
                <div className="profile-actions">
                  {me.holdings.length > 1 && (
                    <a className="button" href="/me">
                      Switch role
                    </a>
                  )}
                  {me.isClubOfficer && (
                    <a className="button secondary" href="/registrar">
                      Club administration
                    </a>
                  )}
                </div>
              )}
            </section>
            <Workspace
              active={active.holding}
              link={link}
              client={client}
              today={today}
              childId={params.child ?? null}
              tdView={{ tab: tdTabFrom(params.tab), team: params.team ?? null, range: rangeFrom(params.range) }}
            />
            {/* BR169: sponsors only for an adult; never in a 13-17 person's own workspace. */}
            {showsSponsors({ age: ageAt(link.person.dateOfBirth, today), holdsClubRole: link.membershipRoles.length > 0 }) && (
              <SponsorSlot client={client} clubId={link.clubId} role={active.holding.key} today={today} />
            )}
          </>
        ) : (
          <Prompt me={me} notifications={notifications} />
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
  childId,
  tdView,
}: {
  readonly active: RoleHolding;
  readonly link: ClubLink;
  readonly client: Awaited<ReturnType<typeof createRequestClient>>;
  readonly today: string;
  readonly childId: string | null;
  readonly tdView: Parameters<typeof TechnicalDirectorWorkspace>[0]['view'];
}) {
  switch (active.key) {
    case 'player':
      return <PlayerWorkspace client={client} link={link} today={today} />;
    case 'coach':
      return <CoachWorkspace client={client} link={link} today={today} />;
    case 'technical':
      return <TechnicalDirectorWorkspace client={client} link={link} today={today} view={tdView} />;
    case 'referee':
      return <RefereeWorkspace client={client} link={link} today={today} />;
    case 'guardian':
      return <GuardianWorkspace client={client} link={link} today={today} childId={childId} />;
    case 'committee':
      return <CommitteeWorkspace client={client} link={link} today={today} />;
  }
}

/**
 * The screen BR61 makes unavoidable: several roles, none chosen — or no
 * roles at all, which has three honest causes and gets three answers.
 */
function Prompt({
  me,
  notifications,
}: {
  readonly me: Awaited<ReturnType<typeof loadMe>>;
  readonly notifications: readonly InboxNotification[];
}) {
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
  return <PersonHome holdings={me.holdings} notifications={notifications} />;
}
