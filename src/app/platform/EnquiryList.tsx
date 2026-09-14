import type { Enquiry } from '../../data/enquiries.ts';

/**
 * The lead list — and the first time anything in the application has read
 * `prospect` at all.
 *
 * The table has denied every API request in both directions since migration
 * 0013, which was the right call for a record that must stay outside the
 * tenant world (BR92) and the wrong outcome in practice: every lead captured
 * at the demonstration door since August 2026 has been visible only to
 * somebody with a psql prompt. A capture surface whose output nobody can
 * open is a form, not a feature.
 *
 * It sits **above** the provisioning form on purpose. The sequence it
 * represents is a real one — a club enquires, a conversation happens
 * offline, a contract is signed, and only then is a tenant provisioned
 * ([decision 7](../../../docs/decisions/7_tenant-provisioning-by-owner-issued-invitation.md))
 * — so the screen reads in the order the work actually happens.
 */
export function EnquiryList({ enquiries }: { readonly enquiries: readonly Enquiry[] }) {
  const enquired = enquiries.filter((e) => e.enquiredAt !== null);
  const looked = enquiries.filter((e) => e.enquiredAt === null);
  // Counted at the top rather than left to be spotted in a column. An alert
  // that failed means somebody enquired and nobody was told — which is the
  // state this whole screen exists to prevent, so it is not something to
  // find by scanning.
  const unalerted = enquired.filter((e) => e.notifyError !== null);

  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>
        Enquiries <span className="hint">({enquired.length} asked, {looked.length} looked)</span>
      </h3>
      {unalerted.length > 0 && (
        <p className="notice">
          <strong>
            {unalerted.length === 1
              ? 'One enquiry was recorded and no alert went out.'
              : `${unalerted.length} enquiries were recorded and no alert went out.`}
          </strong>{' '}
          They are in the list below and nobody was emailed about them, so they have been waiting
          as long as their date says.
        </p>
      )}

      <p className="hint">
        A prospect is not a tenant, holds no <code>club_id</code>, and is a member of nothing
        (BR92) — which is why reading this is not the exception decision 9 forbids. Nothing on
        this screen is inside any club.
      </p>

      {enquiries.length === 0 ? (
        <p className="hint" style={{ marginBottom: 0 }}>
          Nobody has enquired or opened the demonstration club yet.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <caption className="hint">
              Clubs that asked to be contacted, most recent first, then everyone who has only
              looked at the demonstration club.
            </caption>
            <thead>
              <tr>
                <th scope="col">Club</th>
                <th scope="col">Contact</th>
                <th scope="col">Size</th>
                <th scope="col">Runs today</th>
                <th scope="col">Said</th>
                <th scope="col">When</th>
                <th scope="col">May email</th>
                <th scope="col">Alerted</th>
              </tr>
            </thead>
            <tbody>
              {[...enquired, ...looked].map((enquiry) => (
                <tr key={enquiry.email}>
                  <td>
                    {enquiry.clubName ?? (
                      // Not "unknown": the distinction that matters is *which
                      // door they came through*, because it says what they
                      // have actually done rather than what a field is
                      // missing.
                      <span className="hint">looked at the demo only</span>
                    )}
                    {enquiry.jurisdiction !== null && (
                      <>
                        <br />
                        <span className="hint">{enquiry.jurisdiction}</span>
                      </>
                    )}
                  </td>
                  <td>
                    <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
                    {enquiry.contactName !== null && (
                      <>
                        <br />
                        <span className="hint">
                          {enquiry.contactName}
                          {enquiry.contactRole !== null && ` — ${enquiry.contactRole}`}
                        </span>
                      </>
                    )}
                    {enquiry.phone !== null && (
                      <>
                        <br />
                        <span className="hint">{enquiry.phone}</span>
                      </>
                    )}
                  </td>
                  <td className="hint">{enquiry.clubSize ?? '—'}</td>
                  <td>{enquiry.currentSystem ?? <span className="hint">—</span>}</td>
                  <td className="hint">{enquiry.note ?? '—'}</td>
                  <td className="hint">
                    {(enquiry.enquiredAt ?? enquiry.lastSeenAt).slice(0, 10)}
                    {enquiry.enquiredAt === null && (
                      <>
                        <br />
                        last looked
                      </>
                    )}
                  </td>
                  <td>
                    {/*
                      Withheld and withdrawn read the same here, and that is
                      deliberate: both mean do not send, and this column
                      answers that question rather than narrating a history.
                    */}
                    {enquiry.marketingConsentAt === null ? (
                      <span className="hint">no — reply only</span>
                    ) : (
                      <>yes, {enquiry.marketingConsentAt.slice(0, 10)}</>
                    )}
                  </td>
                  <td>
                    {/*
                      Three states, not two. A failed alert has to look
                      different from one that was never attempted, or a
                      provider outage reads as a quiet week — which is the
                      exact failure this column exists to make visible
                      (BR127's reasoning, applied one level out).
                    */}
                    {enquiry.notifiedAt !== null ? (
                      <span className="hint">sent {enquiry.notifiedAt.slice(0, 10)}</span>
                    ) : enquiry.notifyError !== null ? (
                      <span className="notice">
                        <strong>not sent</strong>
                        <br />
                        {enquiry.notifyError}
                      </span>
                    ) : (
                      <span className="hint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
