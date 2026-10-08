/**
 * UTM links (scope 85; BR172, decision 17): the same `utm_source`,
 * `utm_medium`, `utm_campaign` parameters Google's Campaign URL Builder
 * writes, built here so no outside tool is needed. A UTM names where a
 * visit came from — a partner, a club, a campaign — and never who made it.
 */
import { parseNomination } from './payout-nomination.ts';

export interface Utm {
  readonly source: string;
  readonly medium: string;
  readonly campaign: string;
}

/** A UTM value as analytics tools expect it: lowercase, letters, digits, `-` and `_`. */
export function utmSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 41);
}

export function isUtmValue(value: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{1,40}$/.test(value);
}

/** The link with the UTM appended, keeping whatever query it already had. */
export function withUtm(link: string, utm: Utm): string {
  const url = new URL(link);
  url.searchParams.set('utm_source', utm.source);
  url.searchParams.set('utm_medium', utm.medium);
  url.searchParams.set('utm_campaign', utm.campaign);
  return url.toString();
}

/** The UTM pair a registration arrived with, if both are well formed. */
export function readUtm(params: Readonly<Record<string, string | string[] | undefined>>): { readonly source: string; readonly campaign: string } | null {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const source = utmSlug(one(params.utm_source));
  const campaign = utmSlug(one(params.utm_campaign));
  return isUtmValue(source) && isUtmValue(campaign) ? { source, campaign } : null;
}


export interface PartnerDraft {
  readonly name: string;
  readonly utmSource: string;
  readonly utmCampaign: string;
  readonly cpaRateCents: number;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly payout:
    | { readonly method: 'paypal'; readonly paypalEmail: string }
    | { readonly method: 'bank_transfer'; readonly accountName: string; readonly bsb: string; readonly accountNumber: string };
}

/** A referral partner (BR172): who promotes the club, its UTM pair, its CPA rate and where it is paid. */
export function parsePartner(form: Readonly<Record<string, unknown>>):
  { readonly ok: true; readonly value: PartnerDraft } | { readonly ok: false; readonly error: string } {
  const name = String(form.name ?? '').trim();
  const utmSource = utmSlug(String(form.utmSource ?? '') || name);
  const utmCampaign = utmSlug(String(form.utmCampaign ?? ''));
  const rate = Math.round(Number(String(form.rate ?? '').replace(/[$,\s]/g, '')) * 100);
  const startsOn = String(form.startsOn ?? '');
  const endsOn = String(form.endsOn ?? '');
  if (name === '') return { ok: false, error: 'Name the business promoting the club.' };
  if (!isUtmValue(utmSource) || !isUtmValue(utmCampaign)) {
    return { ok: false, error: 'Give a source and a campaign name (letters, numbers, - and _).' };
  }
  if (!Number.isFinite(rate) || rate <= 0) return { ok: false, error: 'Enter the fee per completed registration, in dollars.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn < startsOn) {
    return { ok: false, error: 'Give a start date and an end date on or after it.' };
  }
  const payout = parseNomination(form);
  if (!payout.ok) return payout;
  if (payout.value.method === 'stripe') return { ok: false, error: 'Pay a partner by PayPal or bank transfer.' };
  return { ok: true, value: { name, utmSource, utmCampaign, cpaRateCents: rate, startsOn, endsOn, payout: payout.value } };
}
