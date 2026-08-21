import { redirect } from 'next/navigation';

import { loadDuplicates, loadTenantContext, type DuplicateGroup } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { displayNameFor, fullLegalName } from '../../../web/queue-view.ts';
import { UNKNOWN_DATE_OF_BIRTH } from '../../../web/people-view.ts';
import { mergePersonAction } from './actions.ts';

export const dynamic = 'force-dynamic';

function Side({
  person,
  weight,
  otherId,
}: {
  readonly person: DuplicateGroup['a'];
  readonly weight: DuplicateGroup['aWeight'];
  readonly otherId: string;
}) {
  return (
    <div className="card" style={{ flex: '1 1 16rem', marginBottom: 0 }}>
      <p className="name" style={{ margin: 0 }}>
        {displayNameFor(person)}
      </p>
      <p className="legal-name" style={{ margin: 0 }}>
        {fullLegalName(person)}
      </p>
      <p className="hint" style={{ margin: '0.35rem 0 0' }}>
        {person.email ?? 'No email'}
        {' · '}
        {person.dateOfBirth === UNKNOWN_DATE_OF_BIRTH
          ? 'date of birth not recorded'
          : `born ${person.dateOfBirth}`}
      </p>
      <p className="hint" style={{ margin: 0 }}>
        {weight.registrations} registration{weight.registrations === 1 ? '' : 's'} ·{' '}
        {weight.children} child{weight.children === 1 ? '' : 'ren'} · {weight.roles} role
        {weight.roles === 1 ? '' : 's'}
      </p>
      <p className="hint" style={{ margin: 0 }}>
        Created {new Date(weight.createdAt).toLocaleString('en-AU')}
      </p>

      <form action={mergePersonAction} style={{ marginTop: '0.75rem' }}>
        <input type="hidden" name="survivorId" value={person.id} />
        <input type="hidden" name="duplicateId" value={otherId} />
        <button type="submit" className="secondary">
          Keep this one
        </button>
      </form>
    </div>
  );
}

export default async function DuplicatesPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) {
    return (
      <>
        <h2>No club yet</h2>
        <p className="lede">This account is not a member of any club.</p>
      </>
    );
  }

  const groups = await loadDuplicates(client, tenant.clubId);
  const confirmed = groups.filter((g) => g.pair.confidence === 'confirmed');
  const possible = groups.filter((g) => g.pair.confidence === 'possible');

  return (
    <>
      <p style={{ marginBottom: '0.25rem' }}>
        <a href="/registrar">&larr; Back to the queue</a>
      </p>

      <h2>Possible duplicates</h2>
      <p className="lede">
        One human recorded more than once. Nothing here is merged automatically &mdash; a wrong
        merge attaches one child&rsquo;s registration, payments and eligibility to a different
        child, so the decision is yours (BR5). Choose which record is the real one and the other
        folds into it.
      </p>

      <div className="summary-grid">
        <div className="stat">
          <span className="n">{confirmed.length}</span>
          <span className="label">same email &amp; date of birth</span>
        </div>
        <div className="stat">
          <span className="n">{possible.length}</span>
          <span className="label">same name, no email to separate them</span>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="empty">No duplicates. Every person in this club looks like one human.</p>
      )}

      {confirmed.length > 0 && (
        <section>
          <h3>Same email and date of birth</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            The email is what settles these. The names often disagree &mdash; people abbreviate,
            marry, and mistype &mdash; and that is not evidence of two humans when the address
            and the date of birth both match.
          </p>
          {confirmed.map((group) => (
            <Pair key={`${group.pair.aId}-${group.pair.bId}`} group={group} />
          ))}
        </section>
      )}

      {possible.length > 0 && (
        <section>
          <h3>Same name and date of birth</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Weaker: no email on at least one record to tell them apart. A club really does have
            two families with the same name, so check before merging. Where both records carry
            an email and the emails <em>differ</em>, they are not raised here at all &mdash;
            different addresses mean different people.
          </p>
          {possible.map((group) => (
            <Pair key={`${group.pair.aId}-${group.pair.bId}`} group={group} />
          ))}
        </section>
      )}
    </>
  );
}

function Pair({ group }: { readonly group: DuplicateGroup }) {
  return (
    <article className="card">
      <p className="notice" style={{ marginTop: 0 }}>
        {group.pair.evidence}
      </p>
      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
        <Side person={group.a} weight={group.aWeight} otherId={group.b.id} />
        <Side person={group.b} weight={group.bWeight} otherId={group.a.id} />
      </div>
      <p className="hint">
        Whichever you keep takes on the other&rsquo;s registrations, children, roles and
        consents, and gains any email or verified name it was missing. The record you did not
        keep stays as a tombstone pointing at the survivor &mdash; nothing is deleted, so the
        merge can be audited and a stale link still resolves.
      </p>
    </article>
  );
}
