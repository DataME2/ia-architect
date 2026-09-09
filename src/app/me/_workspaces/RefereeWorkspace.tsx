import type { SupabaseClient } from '@supabase/supabase-js';

import { loadOfficialSelfView, type ClubLink } from '../../../data/me.ts';
import { ComingSoon, Panel, WorkspaceHead } from './shared.tsx';

/**
 * The official's own view.
 *
 * C4 built the coordinator's side — the roster, the designation screen,
 * claims and batches — and every one of its tables is readable only by
 * admin, registrar and coordinator. An official signed in as themselves
 * gets an empty answer from RLS, which is correct under P5 until a policy
 * says otherwise. So this workspace says exactly that, rather than
 * rendering an empty list as if nothing were waiting (BR65).
 */
export async function RefereeWorkspace({
  client,
  link,
}: {
  readonly client: SupabaseClient;
  readonly link: ClubLink;
}) {
  const self = await loadOfficialSelfView(client, link.clubId, link.personId);

  return (
    <>
      <WorkspaceHead title="Your appointments">
        Appointments from the panel. A decline carries a brief reason, and a conflict with any other role you
        hold is caught before one is ever offered.
      </WorkspaceHead>
      <div className="cols">
        <div className="stack">
          {self.visible ? (
            <Panel title="Offered" meta={`${self.appointments} OPEN`}>
              <p className="hint" style={{ margin: 0 }}>
                {self.appointments === 0
                  ? 'Nothing waiting for an answer.'
                  : `${self.appointments} appointment${self.appointments === 1 ? '' : 's'} waiting for your answer.`}
              </p>
            </Panel>
          ) : (
            <ComingSoon title="Offered" waitsOn="a read policy for the official — BR65 on the referee record">
              The designation screen exists and coordinators are using it. Your own appointments are not yet
              visible to <em>you</em> — the record is readable by club officers only until a policy says
              otherwise.
            </ComingSoon>
          )}
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
    </>
  );
}
