import { loadTenantContext } from '../../data/queries.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { whereAmI } from '../../web/nav.ts';

export const dynamic = 'force-dynamic';

/**
 * Which club the current session is actually in, said plainly.
 *
 * The club-facing screens already carry a session strip and, in the
 * demonstration club, a banner — but only once you are inside them. This is
 * the answer available from the front door, before you open anything and
 * start reading records without being sure whose they are.
 *
 * It lives at its own route rather than on `/` because answering it requires
 * knowing who is signed in, and `/` is prerendered on purpose: the landing
 * page and the public join link make no auth call, and a card linking here
 * keeps it that way.
 */
export default async function DemoPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  const tenant = user === null ? null : await loadTenantContext(client, user.id);
  const here = whereAmI(user !== null, tenant?.clubName ?? null);

  return (
    <>
      <h2>Which club am I in?</h2>
      <p className="lede">
        Every screen shows real data or fictional data, and never both. This says which, for the
        session you are signed in with right now.
      </p>

      {here.kind === 'demo' && (
        <div className="card demo-card">
          <p className="demo-banner" style={{ marginTop: 0 }}>
            <strong>You are in the demonstration club.</strong> Everything you can see under{' '}
            {here.clubName} is fictional &mdash; invented families, invented payments, invented
            card numbers. Nothing here belongs to a real child.
          </p>
          <p className="hint">
            It is a real tenant all the same. The same policies apply, the same rules refuse the
            same things, and an uncleared coach is rejected here exactly as at a real club
            (BR83). That is the point of it: what you are shown is the product, not a mock-up.
          </p>
          <p style={{ marginBottom: 0 }}>
            <a className="button" href="/registrar">
              Open the demonstration queue
            </a>
          </p>
        </div>
      )}

      {here.kind === 'real' && (
        <div className="card real-card">
          <p className="real-banner" style={{ marginTop: 0 }}>
            <strong>This is not the demonstration club.</strong> You are signed in to{' '}
            {here.clubName}, and everything you can see is that club&rsquo;s real data about real
            people, most of them children.
          </p>
          <p className="hint">
            The demonstration club names itself &mdash; <code>(DEMO)</code> in the club name, a
            banner above every screen, and a badge in the session strip. If you cannot see those,
            you are not in it.
          </p>
          <p style={{ marginBottom: 0 }}>
            <a className="button secondary" href="/registrar">
              Open {here.clubName}
            </a>
          </p>
        </div>
      )}

      {here.kind === 'no-membership' && (
        <div className="card">
          <p className="notice" style={{ marginTop: 0 }}>
            <strong>Signed in, but a member of no club.</strong> You can see nothing, which is
            the correct answer to give a stranger &mdash; access comes from a club membership,
            not from having an account.
          </p>
          <p className="hint" style={{ marginBottom: 0 }}>
            If you were expecting the demonstration club, it has to be seeded into this
            deployment and your account attached to it. It is not part of the schema and does not
            appear on its own.
          </p>
        </div>
      )}

      {here.kind === 'signed-out' && (
        <div className="card">
          <p className="hint" style={{ marginTop: 0 }}>
            <strong>Not signed in</strong>, so there is no club to be in yet. Sign in and this
            page will name the club the session belongs to.
          </p>
          <p style={{ marginBottom: 0 }}>
            <a className="button" href="/sign-in">
              Sign in
            </a>
          </p>
        </div>
      )}
    </>
  );
}
