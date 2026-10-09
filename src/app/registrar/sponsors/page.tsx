import { redirect } from 'next/navigation';

import { formatMoney } from '../../../domain/finance/money.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { loadCampaignReports, loadSponsorSettings } from '../../../data/sponsors.ts';
import { MODEL_UNIT, chargeBasis, clickThroughRate, clubShareCents, owedCents, partnerBalance } from '../../../web/sponsor-billing.ts';
import { CampaignStatusButton, NewCampaignForm, RecordAcquisitionsForm, SponsorSettingsForm } from './SponsorForms.tsx';
import { loadInvoices, loadPartners } from '../../../data/sponsor-money.ts';
import { IssueInvoiceForm, NewPartnerForm, PartnerLink, PayPartnerForm, RecordPaymentForm } from './MoneyForms.tsx';

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

  const [reports, settings, invoices, partners] = await Promise.all([
    loadCampaignReports(client, tenant.clubId),
    loadSponsorSettings(client, tenant.clubId),
    loadInvoices(client, tenant.clubId),
    loadPartners(client, tenant.clubId),
  ]);
  const campaignName = new Map(reports.map((r) => [r.campaign.id, r.campaign.sponsorName]));
  const outstanding = invoices.filter((i) => i.status === 'issued').reduce((s, i) => s + i.amountCents, 0);
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
                    <td>{formatMoney(r.owed)}<br /><span className="hint">{chargeBasis(r.campaign.pricingModel, r.campaign.rateCents, r.tally)}</span></td>
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
        <h3 style={{ marginTop: 0 }}>Invoices</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          Invoice a period of a campaign: its counts and amount are frozen, and a period is never invoiced twice. The
          sponsor pays by PayPal, Google Pay or online bank transfer. That is <b>simulated</b> for now: no provider is
          connected and no money moves. Each payment records the split between the club and Let&rsquo;sDataTalk.{' '}
          <span className="mono" style={{ fontSize: '0.7rem' }}>BR171</span>
        </p>
        <IssueInvoiceForm
          campaigns={reports.filter((r) => r.campaign.owner === 'club').map((r) => ({ id: r.campaign.id, label: r.campaign.sponsorName }))}
        />
        {invoices.length > 0 && (
          <div className="table-scroll" style={{ marginTop: 'var(--space-2)' }}>
            <table>
              <thead>
                <tr><th>Invoice</th><th>Sponsor · period</th><th>Amount</th><th>Club</th><th>Let&rsquo;sDataTalk</th><th>Status</th></tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="mono">{i.number}</td>
                    <td>{campaignName.get(i.campaignId) ?? '—'}<br /><span className="hint">{i.periodFrom} → {i.periodTo}</span></td>
                    <td>{formatMoney(i.amountCents)}</td>
                    <td>{formatMoney(i.clubShareCents)}</td>
                    <td>{formatMoney(i.platformShareCents)}</td>
                    <td>
                      {i.status === 'paid' ? (
                        <span className="pill pill-ok">Paid · {i.paymentMethod === 'google_pay' ? 'Google Pay' : i.paymentMethod === 'paypal' ? 'PayPal' : 'bank transfer'} · {i.paymentReference}</span>
                      ) : (
                        <RecordPaymentForm invoiceId={i.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint" style={{ marginBottom: 0 }}>Awaiting payment: <b>{formatMoney(outstanding)}</b>.</p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Advertise the club (cost per acquisition)</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          A business that promotes the club gets a link with its own UTM tags, in the format Google&rsquo;s Campaign URL
          Builder writes. A family registering through it is credited to the partner. Each <b>completed</b> registration
          earns the partner its fee, paid by PayPal or bank transfer (simulated). The tags name the partner, never the
          family.{' '}
          <span className="mono" style={{ fontSize: '0.7rem' }}>BR172</span>
        </p>
        {partners.map((p) => (
          <div key={p.id} className="stack" style={{ gap: '0.4rem', borderTop: '1px solid var(--border)', padding: 'var(--space-2) 0' }}>
            <p style={{ margin: 0 }}>
              <b>{p.name}</b> · {formatMoney(p.cpaRateCents)} per completed registration · {p.payout}
              <br />
              <span className="hint">
                utm_source={p.utmSource} · utm_medium={p.utmMedium} · utm_campaign={p.utmCampaign} · {p.startsOn} → {p.endsOn}
              </span>
              <br />
              <span className="hint">
                {p.attributed} registered through the link · {p.completed} completed × {formatMoney(p.cpaRateCents)} ={' '}
                {formatMoney(partnerBalance(p).earnedCents)} earned · paid for {p.paidAcquisitions} ({formatMoney(p.paidCents)}) ·{' '}
                <b>{formatMoney(partnerBalance(p).owedCents)} owed</b>
              </span>
            </p>
            <PartnerLink source={p.utmSource} medium={p.utmMedium} campaign={p.utmCampaign} />
            <PayPartnerForm partnerId={p.id} />
          </div>
        ))}
        <h4>New partner</h4>
        <NewPartnerForm />
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
