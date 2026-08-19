import { redirect } from 'next/navigation';

import { loadSeasons, loadTenantContext } from '../../data/queries.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { RegistrationForm } from '../_components/RegistrationForm.tsx';
import { submitRegistrationAction } from './actions.ts';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/register');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) {
    return (
      <>
        <h2>No club yet</h2>
        <p className="lede">This account is not a member of any club, so there is nowhere to register.</p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  if (seasons.length === 0) {
    return (
      <>
        <h2>No seasons configured</h2>
        <p className="lede">A registration is scoped to one season, and {tenant.clubName} has none yet.</p>
      </>
    );
  }

  return (
    <>
      <h2>Register a player — {tenant.clubName}</h2>
      <p className="lede">
        Collected once, checked as you go. Everything the governing body needs is asked for here
        so the submission is right the first time, instead of erroring and coming back weeks
        later.
      </p>
      <RegistrationForm action={submitRegistrationAction} seasons={seasons} />
    </>
  );
}
