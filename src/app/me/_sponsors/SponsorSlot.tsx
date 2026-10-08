import type { SupabaseClient } from '@supabase/supabase-js';

import { pickSponsor } from '../../../data/sponsors.ts';
import type { RoleKey } from '../../../web/role-context.ts';

/**
 * The workspace's sponsor slot (scope 84; BR169, BR170). Rendered only for
 * an adult (the page decides), labelled "Sponsored", and linked through the
 * platform's own redirect so a sponsor learns nothing about who clicked
 * (decision 17). Renders nothing when the club has no live campaign.
 */
export async function SponsorSlot({
  client,
  clubId,
  role,
  today,
}: {
  readonly client: SupabaseClient;
  readonly clubId: string;
  readonly role: RoleKey;
  readonly today: string;
}) {
  const campaign = await pickSponsor(client, clubId, role, today);
  if (campaign === null) return null;
  return (
    <aside className="card" aria-label="Sponsored" style={{ marginTop: 'var(--space-3)' }}>
      <p className="hint" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>
        Sponsored · {campaign.sponsorName}
        {campaign.owner === 'platform' && ' · via Let’sDataTalk'}
      </p>
      <p style={{ margin: '0.3rem 0 0' }}>
        <a href={`/sponsor/${campaign.id}`} target="_blank" rel="sponsored noopener noreferrer">
          <b>{campaign.headline}</b>
        </a>
      </p>
      {campaign.body !== null && (
        <p className="hint" style={{ margin: '0.2rem 0 0' }}>
          {campaign.body}
        </p>
      )}
    </aside>
  );
}
