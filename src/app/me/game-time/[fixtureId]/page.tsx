import { notFound, redirect } from 'next/navigation';

import { loadGameSheet } from '../../../../data/academy.ts';
import { createRequestClient, currentUser } from '../../../../data/server.ts';
import { shortDate } from '../../../../web/me-view.ts';
import { GameTimeEntry } from '../../_academy/GameTimeEntry.tsx';
import { WorkspaceHead } from '../../_workspaces/shared.tsx';

/**
 * Game time for one fixture (scope 112, WP3): minutes and positions,
 * tracked live or entered after the match. Saving is refused by the
 * database for anyone BR158 (with #112) does not let record this team.
 */
export default async function GameTimePage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly fixtureId: string }>;
  readonly searchParams: Promise<{ readonly club?: string }>;
}) {
  const { fixtureId } = await params;
  const { club } = await searchParams;
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/me');
  if (club === undefined) notFound();

  const sheet = await loadGameSheet(client, club, fixtureId);
  if (sheet === null) notFound();
  const back = `/me?${new URLSearchParams({ role: 'coach', club })}`;

  return (
    <main className="work-body" id="main">
      <p style={{ marginTop: 0 }}>
        <a href={back}>&larr; Your workspace</a>
      </p>
      <WorkspaceHead title={`${sheet.teamName} v ${sheet.fixture.opponent}`}>
        {shortDate(sheet.fixture.played_on)}. Minutes in each position for every player who took the field. Goals and
        assists stay on each player&rsquo;s record.
      </WorkspaceHead>
      {sheet.players.length === 0 ? (
        <p className="empty">Nobody is on this team&rsquo;s sheet yet.</p>
      ) : (
        <GameTimeEntry clubId={club} fixtureId={fixtureId} players={sheet.players} />
      )}
    </main>
  );
}
