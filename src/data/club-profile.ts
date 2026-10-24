/**
 * What the club profile says about the club itself (scope 106): where it is,
 * its licence as the club may read it (0018), its responsible people (0017),
 * and how far a season's registrations have got.
 *
 * Every read goes through the table's own member policy, so a club sees its
 * own row and nobody else's (P5). Nothing here is the platform's view of it.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ClubLicence, LicenceState } from '../web/platform-view.ts';
import { QueryError } from './queries.ts';

export interface ClubContact {
  readonly kind: 'primary' | 'secondary';
  readonly fullName: string;
  readonly email: string;
}

export interface ClubProfile {
  readonly jurisdiction: string;
  /** The term running today, else the next one to start; null when none is recorded. */
  readonly licence: ClubLicence | null;
  readonly contacts: readonly ClubContact[];
}

interface LicenceRow {
  state: LicenceState;
  starts_on: string;
  ends_on: string;
  fee_cents: number | null;
  currency: string;
  note: string | null;
}

export async function loadClubProfile(client: SupabaseClient, clubId: string, today: string): Promise<ClubProfile> {
  const [club, licences, contacts] = await Promise.all([
    client.from('club').select('jurisdiction').eq('id', clubId).single(),
    client
      .from('club_licence')
      .select('state, starts_on, ends_on, fee_cents, currency, note')
      .eq('club_id', clubId)
      .order('starts_on', { ascending: false }),
    client.from('club_contact').select('kind, full_name, email').eq('club_id', clubId).order('kind'),
  ]);
  if (club.error !== null) throw new QueryError('club', club.error.message);
  if (licences.error !== null) throw new QueryError('club_licence', licences.error.message);
  if (contacts.error !== null) throw new QueryError('club_contact', contacts.error.message);

  // Newest first: the latest term already started is the one running. A
  // renewal recorded ahead of its start does not displace it.
  const rows = (licences.data ?? []) as LicenceRow[];
  const row = rows.find((r) => r.starts_on <= today) ?? rows[rows.length - 1] ?? null;

  return {
    jurisdiction: (club.data as { jurisdiction: string }).jurisdiction,
    licence:
      row === null
        ? null
        : {
            state: row.state,
            startsOn: row.starts_on,
            endsOn: row.ends_on,
            feeCents: row.fee_cents,
            currency: row.currency,
            note: row.note,
          },
    contacts: ((contacts.data ?? []) as { kind: 'primary' | 'secondary'; full_name: string; email: string }[]).map(
      (c) => ({ kind: c.kind, fullName: c.full_name, email: c.email }),
    ),
  };
}

/** A season's registrations, and how many the federation has confirmed. */
export async function loadRegistrationCounts(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<{ readonly total: number; readonly complete: number }> {
  const { data, error } = await client
    .from('registration')
    .select('status')
    .eq('club_id', clubId)
    .eq('season_id', seasonId);
  if (error !== null) throw new QueryError('registration', error.message);
  const rows = (data ?? []) as { status: string }[];
  return { total: rows.length, complete: rows.filter((r) => r.status === 'COMPLETE').length };
}
