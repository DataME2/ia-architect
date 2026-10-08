import type { SupabaseClient } from '@supabase/supabase-js';

import { bannerUrl, pickSponsor } from '../../../data/sponsors.ts';
import type { RoleKey } from '../../../web/role-context.ts';

/**
 * The workspace's sponsor slot (scope 84; BR169, BR170). Rendered only for
 * an adult (the page decides), labelled "Sponsored", and linked through the
 * platform's own redirect so a sponsor learns nothing about who clicked
 * (decision 17). A banner is served from the platform's storage, never the
 * sponsor's server. Renders nothing when the club has no live campaign.
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

  const labelId = `sponsor-label-${campaign.id}`;
  const label = `Sponsored · ${campaign.sponsorName}${campaign.owner === 'platform' ? ' · via Let’sDataTalk' : ''}`;
  const href = `/sponsor/${campaign.id}`;

  if (campaign.imagePath !== null) {
    return (
      <aside className="sponsor-banner-container" aria-labelledby={labelId}>
        <span className="sponsor-label" id={labelId}>{label}</span>
        <a href={href} target="_blank" rel="sponsored noopener noreferrer">
          <img
            src={bannerUrl(client, campaign.imagePath)}
            alt={`${campaign.sponsorName}: ${campaign.headline}`}
            className="sponsor-image"
            width={728}
            height={90}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </a>
      </aside>
    );
  }

  return (
    <aside className="sponsor-banner-container sponsor-text" aria-labelledby={labelId}>
      <span className="sponsor-label" id={labelId}>{label}</span>
      <a href={href} target="_blank" rel="sponsored noopener noreferrer" className="sponsor-headline">
        {campaign.headline}
      </a>
      {campaign.body !== null && <span className="sponsor-body">{campaign.body}</span>}
    </aside>
  );
}
