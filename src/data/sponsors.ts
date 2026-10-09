/**
 * Sponsors in the workspace (scope 84; BR169, BR170). Who may see, count,
 * manage and place is the database's question (0081); this reads and writes.
 * Nothing here ever sends a sponsor anything about a viewer.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { RoleKey } from '../web/role-context.ts';
import { pickWeighted, type PricingModel, type RotationWeight, type Tally } from '../web/sponsor-billing.ts';
import { QueryError } from './queries.ts';

export interface SponsorCampaign {
  readonly id: string;
  readonly owner: 'club' | 'platform';
  readonly sponsorName: string;
  readonly headline: string;
  readonly body: string | null;
  readonly linkUrl: string;
  readonly pricingModel: PricingModel;
  readonly rateCents: number;
  readonly audience: readonly RoleKey[];
  readonly startsOn: string;
  readonly endsOn: string;
  readonly status: 'active' | 'paused' | 'ended';
  readonly clubShareBps: number;
  /** A banner in the platform's own public bucket (decision 17), or null for a text card. */
  readonly imagePath: string | null;
  /** BR173: share-of-voice tier. */
  readonly rotationWeight: RotationWeight;
}

const COLUMNS =
  'id, owner, sponsor_name, headline, body, link_url, pricing_model, rate_cents, audience, starts_on, ends_on, status, club_share_bps, image_path, rotation_weight';

const CREATIVES = 'sponsor-creatives';

function toCampaign(r: Record<string, unknown>): SponsorCampaign {
  return {
    id: r.id as string,
    owner: r.owner as SponsorCampaign['owner'],
    sponsorName: r.sponsor_name as string,
    headline: r.headline as string,
    body: (r.body as string | null) ?? null,
    linkUrl: r.link_url as string,
    pricingModel: r.pricing_model as PricingModel,
    rateCents: Number(r.rate_cents),
    audience: (r.audience as RoleKey[]) ?? [],
    startsOn: r.starts_on as string,
    endsOn: r.ends_on as string,
    status: r.status as SponsorCampaign['status'],
    clubShareBps: Number(r.club_share_bps),
    imagePath: (r.image_path as string | null) ?? null,
    rotationWeight: (Number(r.rotation_weight) || 1) as RotationWeight,
  };
}

/**
 * One live campaign for this workspace, rotated by share of voice (BR173): a
 * Premium campaign is picked three times as often as a Standard one. The pick
 * is fresh each view, so nothing about the viewer is remembered (decision 17).
 */
export async function pickSponsor(
  client: SupabaseClient,
  clubId: string,
  role: RoleKey,
  today: string,
): Promise<SponsorCampaign | null> {
  const { data } = await client
    .from('sponsor_campaign')
    .select(COLUMNS)
    .eq('club_id', clubId)
    .eq('status', 'active')
    .lte('starts_on', today)
    .gte('ends_on', today)
    .contains('audience', [role]);
  const live = ((data ?? []) as Record<string, unknown>[]).map(toCampaign);
  if (live.length === 0) return null;
  const chosen = pickWeighted(live, Math.random());
  if (chosen === null) return null;
  await client.rpc('app_record_sponsor_event', { p_campaign_id: chosen.id, p_kind: 'impression' });
  return chosen;
}

/** Count a click and return where to send the member — nothing about them goes with it. */
export async function clickThrough(client: SupabaseClient, campaignId: string): Promise<string | null> {
  const { data } = await client.from('sponsor_campaign').select('link_url').eq('id', campaignId).maybeSingle();
  const link = (data as { link_url: string } | null)?.link_url ?? null;
  if (link === null) return null;
  await client.rpc('app_record_sponsor_event', { p_campaign_id: campaignId, p_kind: 'click' });
  return link;
}

export interface CampaignReport {
  readonly campaign: SponsorCampaign;
  readonly tally: Tally;
}

/** Every campaign with its counts to date — the money roles' statement. */
export async function loadCampaignReports(client: SupabaseClient, clubId: string): Promise<readonly CampaignReport[]> {
  const [campaigns, tallies] = await Promise.all([
    client.from('sponsor_campaign').select(COLUMNS).eq('club_id', clubId).order('starts_on', { ascending: false }),
    client.from('sponsor_tally').select('campaign_id, impressions, clicks, acquisitions').eq('club_id', clubId),
  ]);
  if (campaigns.error !== null) throw new QueryError('sponsor_campaign', campaigns.error.message);
  const byCampaign = new Map<string, Tally>();
  for (const t of (tallies.data ?? []) as { campaign_id: string; impressions: number; clicks: number; acquisitions: number }[]) {
    const a = byCampaign.get(t.campaign_id) ?? { impressions: 0, clicks: 0, acquisitions: 0 };
    byCampaign.set(t.campaign_id, {
      impressions: a.impressions + t.impressions,
      clicks: a.clicks + t.clicks,
      acquisitions: a.acquisitions + t.acquisitions,
    });
  }
  return ((campaigns.data ?? []) as Record<string, unknown>[]).map(toCampaign).map((campaign) => ({
    campaign,
    tally: byCampaign.get(campaign.id) ?? { impressions: 0, clicks: 0, acquisitions: 0 },
  }));
}

export interface NewCampaign {
  readonly sponsorName: string;
  readonly headline: string;
  readonly body: string | null;
  readonly linkUrl: string;
  readonly pricingModel: PricingModel;
  readonly rateCents: number;
  readonly audience: readonly RoleKey[];
  readonly startsOn: string;
  readonly endsOn: string;
  readonly rotationWeight: RotationWeight;
}

export async function createClubCampaign(
  client: SupabaseClient,
  clubId: string,
  input: NewCampaign,
  userId: string,
): Promise<{ readonly id: string } | { readonly error: string }> {
  const { data, error } = await client.from('sponsor_campaign').insert({
    club_id: clubId,
    owner: 'club',
    sponsor_name: input.sponsorName,
    headline: input.headline,
    body: input.body,
    link_url: input.linkUrl,
    pricing_model: input.pricingModel,
    rate_cents: input.rateCents,
    audience: input.audience,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    rotation_weight: input.rotationWeight,
    created_by_user_id: userId,
  }).select('id').single();
  if (error === null) return { id: (data as { id: string }).id };
  return { error: error.code === '42501' ? 'Only the club’s admin or treasurer manages sponsors (BR170).' : error.message };
}

/** Upload a banner to the platform's own bucket and attach it (decision 17). */
export async function attachBanner(
  client: SupabaseClient,
  clubId: string,
  campaignId: string,
  path: string,
  file: File,
): Promise<string | null> {
  const { error: uploadError } = await client.storage.from(CREATIVES).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError !== null) return uploadError.message;
  const { error } = await client.from('sponsor_campaign').update({ image_path: path }).eq('club_id', clubId).eq('id', campaignId);
  if (error !== null) {
    await client.storage.from(CREATIVES).remove([path]);
    return error.message;
  }
  return null;
}

/** The banner's public address: the platform's storage, never the sponsor's server. */
export function bannerUrl(client: SupabaseClient, path: string): string {
  return client.storage.from(CREATIVES).getPublicUrl(path).data.publicUrl;
}

export async function setCampaignStatus(
  client: SupabaseClient,
  clubId: string,
  id: string,
  status: SponsorCampaign['status'],
): Promise<string | null> {
  const { data, error } = await client
    .from('sponsor_campaign')
    .update({ status })
    .eq('club_id', clubId)
    .eq('id', id)
    .select('id');
  if (error !== null) return error.message;
  return (data ?? []).length === 0 ? 'A platform campaign is changed by Let’sDataTalk, not the club.' : null;
}

/** BR173: how often a club campaign appears. The database refuses a platform campaign (0081's policy). */
export async function setCampaignWeight(
  client: SupabaseClient,
  clubId: string,
  id: string,
  weight: RotationWeight,
): Promise<string | null> {
  const { data, error } = await client
    .from('sponsor_campaign')
    .update({ rotation_weight: weight })
    .eq('club_id', clubId)
    .eq('id', id)
    .select('id');
  if (error !== null) return error.message;
  return (data ?? []).length === 0 ? 'Only the club’s own campaigns change tier here.' : null;
}

export async function recordAcquisitions(
  client: SupabaseClient,
  campaignId: string,
  onDay: string,
  count: number,
): Promise<string | null> {
  const { error } = await client.rpc('app_record_sponsor_acquisitions', {
    p_campaign_id: campaignId,
    p_on_day: onDay,
    p_count: count,
  });
  return error === null ? null : error.message;
}

export interface SponsorSettings {
  readonly acceptsPlatformCampaigns: boolean;
  readonly platformShareBps: number;
}

export async function loadSponsorSettings(client: SupabaseClient, clubId: string): Promise<SponsorSettings> {
  const { data } = await client
    .from('club_sponsor_settings')
    .select('accepts_platform_campaigns, platform_share_bps')
    .eq('club_id', clubId)
    .maybeSingle();
  const r = data as { accepts_platform_campaigns: boolean; platform_share_bps: number } | null;
  return { acceptsPlatformCampaigns: r?.accepts_platform_campaigns ?? false, platformShareBps: r?.platform_share_bps ?? 3000 };
}

export async function saveSponsorSettings(
  client: SupabaseClient,
  clubId: string,
  accepts: boolean,
  userId: string,
): Promise<string | null> {
  const { error } = await client.from('club_sponsor_settings').upsert({
    club_id: clubId,
    accepts_platform_campaigns: accepts,
    updated_by_user_id: userId,
    updated_at: new Date().toISOString(),
  });
  return error === null ? null : error.message;
}
