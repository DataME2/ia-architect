/**
 * Sponsor charges (scope 84, BR170): what a campaign owes under its pricing
 * model, and the club's share. Pure, so the arithmetic is tested without a
 * database. Money is integer cents throughout.
 */

import { formatMoney } from '../domain/finance/money.ts';

export type PricingModel = 'cpc' | 'cpm' | 'cpa';

export const MODEL_LABEL: Readonly<Record<PricingModel, string>> = {
  cpc: 'Cost per click (CPC / PPC)',
  cpm: 'Cost per thousand impressions (CPM)',
  cpa: 'Cost per acquisition (CPA)',
};

export const MODEL_UNIT: Readonly<Record<PricingModel, string>> = {
  cpc: 'per click',
  cpm: 'per 1,000 impressions',
  cpa: 'per acquisition',
};

export interface Tally {
  readonly impressions: number;
  readonly clicks: number;
  readonly acquisitions: number;
}

/** What the sponsor owes for these counts. CPM is rounded to the cent. */
export function owedCents(model: PricingModel, rateCents: number, tally: Tally): number {
  if (model === 'cpc') return tally.clicks * rateCents;
  if (model === 'cpa') return tally.acquisitions * rateCents;
  return Math.round((tally.impressions * rateCents) / 1000);
}

/** The club's part of a charge: all of a club campaign, its share of a platform one. */
export function clubShareCents(owed: number, clubShareBps: number): number {
  return Math.round((owed * clubShareBps) / 10000);
}

/** Click-through rate, as a percentage to one decimal, or null with no impressions. */
export function clickThroughRate(tally: Tally): number | null {
  return tally.impressions === 0 ? null : Math.round((tally.clicks / tally.impressions) * 1000) / 10;
}

export function sumTallies(tallies: readonly Tally[]): Tally {
  return tallies.reduce(
    (a, t) => ({ impressions: a.impressions + t.impressions, clicks: a.clicks + t.clicks, acquisitions: a.acquisitions + t.acquisitions }),
    { impressions: 0, clicks: 0, acquisitions: 0 },
  );
}

/** BR169: a sponsor shows only to an adult — a club officer, or an account whose own Person is 18+. */
export function showsSponsors(viewer: { readonly age: number; readonly holdsClubRole: boolean }): boolean {
  return viewer.holdsClubRole || viewer.age >= 18;
}

export function isPricingModel(value: string): value is PricingModel {
  return value === 'cpc' || value === 'cpm' || value === 'cpa';
}

/** A sponsor link must be https, so the redirect never sends a member to plain http. */
export function isSponsorLink(value: string): boolean {
  return /^https:\/\/[^\s/]+\.[^\s/]+/i.test(value.trim());
}

const AUDIENCES = ['guardian', 'coach', 'referee', 'player', 'committee'] as const;
export type SponsorAudience = (typeof AUDIENCES)[number];

export interface CampaignDraft {
  readonly sponsorName: string;
  readonly headline: string;
  readonly body: string | null;
  readonly linkUrl: string;
  readonly pricingModel: PricingModel;
  readonly rateCents: number;
  readonly audience: readonly SponsorAudience[];
  readonly startsOn: string;
  readonly endsOn: string;
}

/** A campaign form, read and checked before the database checks it again. */
export function parseCampaign(fields: {
  readonly sponsorName?: string;
  readonly headline?: string;
  readonly body?: string;
  readonly linkUrl?: string;
  readonly pricingModel?: string;
  readonly rate?: string;
  readonly audience?: readonly string[];
  readonly startsOn?: string;
  readonly endsOn?: string;
}): { readonly ok: true; readonly value: CampaignDraft } | { readonly ok: false; readonly error: string } {
  const sponsorName = (fields.sponsorName ?? '').trim();
  const headline = (fields.headline ?? '').trim();
  const body = (fields.body ?? '').trim();
  const linkUrl = (fields.linkUrl ?? '').trim();
  const model = fields.pricingModel ?? '';
  const rate = Math.round(Number((fields.rate ?? '').replace(/[$,\s]/g, '')) * 100);
  const audience = (fields.audience ?? []).filter((a): a is SponsorAudience => (AUDIENCES as readonly string[]).includes(a));
  const startsOn = fields.startsOn ?? '';
  const endsOn = fields.endsOn ?? '';

  if (sponsorName === '') return { ok: false, error: 'Name the sponsor.' };
  if (headline === '' || headline.length > 90) return { ok: false, error: 'A headline, up to 90 characters.' };
  if (body.length > 200) return { ok: false, error: 'The text is up to 200 characters.' };
  if (!isSponsorLink(linkUrl)) return { ok: false, error: 'The sponsor link must start https://.' };
  if (!isPricingModel(model)) return { ok: false, error: 'Choose CPC, CPM or CPA.' };
  if (!Number.isFinite(rate) || rate <= 0) return { ok: false, error: 'Enter the rate in dollars, more than zero.' };
  if (audience.length === 0) return { ok: false, error: 'Choose at least one workspace to show it in.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn < startsOn) {
    return { ok: false, error: 'Give a start date and an end date on or after it.' };
  }
  return {
    ok: true,
    value: { sponsorName, headline, body: body === '' ? null : body, linkUrl, pricingModel: model, rateCents: rate, audience, startsOn, endsOn },
  };
}

/** A banner the platform will host (decision 17): PNG, JPEG or WebP, up to 1 MB; 728×90 recommended. */
export const MAX_BANNER_BYTES = 1024 * 1024;

const BANNER_EXTENSION: Readonly<Record<string, string>> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export function checkBanner(file: { readonly type: string; readonly size: number }):
  { readonly ok: true; readonly extension: string } | { readonly ok: false; readonly error: string } {
  const extension = BANNER_EXTENSION[file.type];
  if (extension === undefined) return { ok: false, error: 'A banner is a PNG, JPEG or WebP image.' };
  if (file.size === 0 || file.size > MAX_BANNER_BYTES) return { ok: false, error: 'A banner is up to 1 MB.' };
  return { ok: true, extension };
}

/** `<club>/<campaign>-<stamp>.<ext>`: the club segment the bucket policy checks. */
export function bannerPath(clubId: string, campaignId: string, stamp: number, extension: string): string {
  return `${clubId}/${campaignId}-${stamp}.${extension}`;
}

/**
 * How a charge is made, in the model's own terms, so the treasurer sees the
 * count and the rate rather than only a total: "40 clicks × $0.50".
 */
export function chargeBasis(model: PricingModel, rateCents: number, tally: Tally): string {
  const n = (x: number) => x.toLocaleString('en-AU');
  if (model === 'cpc') return `${n(tally.clicks)} click${tally.clicks === 1 ? '' : 's'} × ${formatMoney(rateCents)}`;
  if (model === 'cpa') return `${n(tally.acquisitions)} acquisition${tally.acquisitions === 1 ? '' : 's'} × ${formatMoney(rateCents)}`;
  return `${n(tally.impressions)} impressions ÷ 1,000 × ${formatMoney(rateCents)}`;
}

/**
 * A referral partner's account (BR172): each COMPLETE registration earns the
 * fee; what is paid comes from the payouts. Owed never goes below zero.
 */
export function partnerBalance(p: {
  readonly cpaRateCents: number;
  readonly completed: number;
  readonly paidAcquisitions: number;
  readonly paidCents: number;
}): { readonly earnedCents: number; readonly paidCents: number; readonly owedCents: number; readonly unpaid: number } {
  const unpaid = Math.max(0, p.completed - p.paidAcquisitions);
  return { earnedCents: p.completed * p.cpaRateCents, paidCents: p.paidCents, owedCents: unpaid * p.cpaRateCents, unpaid };
}
