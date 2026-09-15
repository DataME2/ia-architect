import type { SupabaseClient } from '@supabase/supabase-js';

import { loadFamilyDesignations } from '../../../data/designations.ts';
import { loadOfficialSelfView, type ClubLink } from '../../../data/me.ts';
import { DesignationPanel } from '../_designations/DesignationPanel.tsx';
import { ComingSoon, Panel, WorkspaceHead } from './shared.tsx';
import { loadSubscription } from '../../../data/calendar.ts';
import { CalendarPanel } from '../_calendar/CalendarPanel.tsx';

/**
 * The official's own view.
 *
 * C4 built the coordinator's side — the roster, the designation screen,
 * claims and batches — and every one of its tables was readable only by
 * admin, registrar and coordinator, so an official signed in as themselves
 * got an empty answer from RLS. That was correct under P5 until a policy
 * said otherwise, and the workspace said so rather than rendering an empty
 * list as if nothing were waiting (BR65).
 *
 * **Appointments are the first of those to open.** Migration 0045 admits a
 * person to their own designations so that BR113's question can reach the
 * guardian it is addressed to; the adult official reached by the same
 * policy is the half of BR65 that came with it. The referee record itself —
 * classification, accreditation, what is owed — is still the coordinator's,
 * and still says so.
 */
export async function RefereeWorkspace({
  client,
  link,
  today,
}: {
  readonly client: SupabaseClient;
  readonly link: ClubLink;
  readonly today: string;
}) {
  const self = await loadOfficialSelfView(client, link.clubId, link.personId);

  // Their own designations, readable since 0045 (scope 51). An adult
  // official answers for themselves; the panel says so rather than leaving
  // the sentence out for the half of the pathway that is not a child.
  const designations = await loadFamilyDesignations(client, link.clubId, [link.personId], today);


  // The calendar feed, from the official's own side (scope 41).
  const subscription = await loadSubscription(client, link.clubId, link.personId);

  return (
    <>
      <WorkspaceHead title="Your appointments">
        Appointments from the panel. A decline carries a brief reason, and a conflict with any other role you
        hold is caught before one is ever offered.
      </WorkspaceHead>
      <div className="cols">
        <div className="stack">
          <Panel title="Offered" meta={`${self.appointments} OPEN`}>
            <DesignationPanel
              clubId={link.clubId}
              offered={designations.offered}
              answerers={designations.answerers}
            />
          </Panel>
          <Panel title="Refused before it reaches you">
            <p className="callout" style={{ marginBottom: 0 }}>
              <b>A match you play in, coach, manage, or have a child in is never offered.</b> The conflict is
              detected against your one record across every club, and enforced in the database — not left to
              you to notice at 7am on a Sunday.{' '}
              <span className="mono" style={{ fontSize: '0.7rem' }}>
                BR6 · BR109
              </span>
            </p>
          </Panel>
        </div>
        <div className="stack">
          <ComingSoon title="Accreditation" waitsOn="the same read policy — C4 built it for the coordinator">
            Your classification, your Blue Card and its expiry, and whether the club has sighted them.
          </ComingSoon>
          <ComingSoon title="Owed to you" waitsOn="C5 referee finance, and a claims view for the official">
            Matches officiated and what is unpaid — paid by whoever made the appointment, the association or
            the club.
          </ComingSoon>
        </div>
      </div>
    
      <Panel title="Your calendar (BR30–BR34)">
        <CalendarPanel
          clubId={link.clubId}
          personId={link.personId}
          subscriptionId={subscription?.id ?? null}
          subscribed={subscription !== null && subscription.revokedAt === null}
          rotatedAt={subscription?.rotatedAt ?? null}
        />
      </Panel>
    </>
  );
}
