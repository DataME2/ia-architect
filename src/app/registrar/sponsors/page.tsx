import { redirect } from 'next/navigation';

import { formatMoney } from '../../../domain/finance/money.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { loadCampaignReports, loadSponsorSettings } from '../../../data/sponsors.ts';
import { MODEL_UNIT, clickThroughRate, clubShareCents, owedCents } from '../../../web/sponsor-billing.ts';
import { CampaignStatusButton, NewCampaignForm, RecordAcquisitionsForm, SponsorSettingsForm } from './SponsorForms.tsx';

/**
 * Sponsors (scope 84; BR169, BR170): the club's campaigns and the platform's
 * placed here, with what each has earned under its model — the statement the
 * treasurer invoices from. Admin and treasurer only.
 */
export default async function SponsorsPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar%2Fsponsors');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  if (!tenant.roles.some((r) => r === 'admin' || r === 'treasurer')) {
    return (
      <>
        <h2>Sponsors</h2>
        <p className="notice">
          <strong>Only the administrator or treasurer manages sponsors.</strong> You are signed in as{' '}
          {tenant.roles.join(', ')} at {tenant.clubName}.
        </p>
      </>
    );
  }

  const [reports, settings] = await Promise.all([
    loadCampaignReports(client, tenant.clubId),
    loadSponsorSettings(client, tenant.clubId),
  ]);
  const rows = reports.map((r) => {
    const owed = owedCents(r.campaign.pricingModel, r.campaign.rateCents, r.tally);
    return { ...r, owed, clubShare: clubShareCents(owed, r.campaign.clubShareBps), ctr: clickThroughRate(r.tally) };
  });
  const totalClub = rows.reduce((s, r) => s + r.clubShare, 0);

  return (
    <>
      <h2>Sponsors</h2>
      <p className="lede">
        Sponsor space in your members&rsquo; workspaces, sold by the club or placed by Let&rsquo;sDataTalk. Each campaign is
        charged per click (CPC), per thousand impressions (CPM) or per acquisition (CPA). Adults only, always labelled
        &ldquo;Sponsored&rdquo;, and a sponsor never learns who saw or clicked.{' '}
        <span className="mono" style={{ fontSize: '0.7rem' }}>BR169 · BR170</span>
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Statement</h3>
        {rows.length === 0 ? (
          <p className="empty" style={{ margin: 0 }}>No campaigns yet.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Sponsor</th>
                  <th>Model · rate</th>
                  <th>Impressions</th>
                  <th>Clicks (CTR)</th>
                  <th>Acquisitions</th>
                  <th>Earned</th>
                  <th>Club&rsquo;s share</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.campaign.id}>
                    <td>
                      <b>{r.campaign.sponsorName}</b>
                      <br />
                      <span className="hint">
                        {r.campaign.startsOn} → {r.campaign.endsOn} · {r.campaign.status}
                        {r.campaign.owner === 'platform' && ' · platform campaign'}
                      </span>
                    </td>
                    <td>{r.campaign.pricingModel.toUpperCase()} · {formatMoney(r.campaign.rateCents)} {MODEL_UNIT[r.campaign.pricingModel]}</td>
                    <td>{r.tally.impressions.toLocaleString('en-AU')}</td>
                    <td>{r.tally.clicks.toLocaleString('en-AU')}{r.ctr !== null && ` (${r.ctr}%)`}</td>
                    <td>
                      {r.tally.acquisitions}
                      {r.campaign.pricingModel === 'cpa' && r.campaign.owner === 'club' && <RecordAcquisitionsForm id={r.campaign.id} />}
                    </td>
                    <td>{formatMoney(r.owed)}</td>
                    <td>{formatMoney(r.clubShare)}</td>
                    <td>
                      {r.campaign.owner === 'club' && r.campaign.status === 'active' && (
                        <CampaignStatusButton id={r.campaign.id} status="paused" label="Pause" />
                      )}
                      {r.campaign.owner === 'club' && r.campaign.status === 'paused' && (
                        <CampaignStatusButton id={r.campaign.id} status="active" label="Resume" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint" style={{ marginBottom: 0 }}>
          To date, the club&rsquo;s share: <b>{formatMoney(totalClub)}</b>. Invoice each sponsor from its row; platform
          campaigns are settled with Let&rsquo;sDataTalk. Nothing here takes a payment.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>New campaign</h3>
        <NewCampaignForm />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Platform campaigns</h3>
        <SponsorSettingsForm accepts={settings.acceptsPlatformCampaigns} sharePct={settings.platformShareBps / 100} />
      </div>
    </>
  );
}
