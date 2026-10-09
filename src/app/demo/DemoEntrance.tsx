import { BoundaryPanel, EntranceCard, PublicEntrance } from '../../components/ui/PublicEntrance.tsx';
import { todayIn } from '../../web/today.ts';
import { EnterDemoForm } from './EnterDemoForm.tsx';

/**
 * The demo's public entrance (Figma "Read-only demo entrance", 33:5019),
 * shown to a signed-out visitor. Its own file so /preview/demo can render it.
 */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** What each kind of session shows, and where it may go. */
const SESSION_STATES = [
  { session: 'Signed out', marker: 'Signed out', destination: 'Public entrance only' },
  { session: 'Real club account', marker: 'Real club · authorised role', destination: 'Explicit club and role choice' },
  { session: 'Demo viewer', marker: 'Demo · read-only', destination: 'Fictional tenant only' },
] as const;

export function DemoEntrance() {
  const [y, m, d] = todayIn().split('-');
  return (
    <PublicEntrance
      nav={[
        { label: 'Read-only demo', href: '/demo', current: true },
        { label: 'Sign in', href: '/sign-in' },
        { label: 'Club enquiry', href: '/interest' },
        { label: 'Product entrance', href: '/' },
      ]}
      status="Signed out · demo request"
      breadcrumb="Let’sDataTalk / Public"
      eyebrow={`Signed out · demo request / Public / ${Number(d)} ${MONTHS[Number(m) - 1] ?? ''} ${y}`}
      title="Look around. Nothing can be changed."
      lede="Enter a clearly fictional demo club with viewer-only access. Real club records are never loaded into the demo."
      footerNote="Public · no personal data"
    >
      <EntranceCard title="Enter the fictional demo">
        <EnterDemoForm />
      </EntranceCard>

      <EntranceCard title="The demo boundary">
        <BoundaryPanel eyebrow="Fictional demo tenant / viewer" title="Demo football club">
          A separate read-only club. No real club&rsquo;s records and no live integrations.
        </BoundaryPanel>
        <p className="m-0 text-sm leading-relaxed">
          Demo access is not club membership, season authority or a trial club licence.
        </p>
        <p className="m-0 text-sm leading-relaxed">
          Exploring it never changes a real club&rsquo;s context, and a demo session is always marked as one.
        </p>
        <a className="min-h-[44px] inline-flex items-center text-[13px] font-semibold text-foreground no-underline hover:underline" href="/interest">
          Ask about a club workspace
        </a>
      </EntranceCard>

      <EntranceCard title="Visible session states" className="xl:col-span-2">
        <p className="m-0 -mt-ds-3 text-[13px] text-muted-foreground">How each kind of session is marked on screen.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-backgroundSunk text-muted text-left">
                <th scope="col" className="py-ds-3 pr-ds-3 font-medium">Session</th>
                <th scope="col" className="py-ds-3 pr-ds-3 font-medium">Visible marker</th>
                <th scope="col" className="py-ds-3 font-medium">Permitted destination</th>
              </tr>
            </thead>
            <tbody>
              {SESSION_STATES.map((s) => (
                <tr key={s.session} className="text-foreground">
                  <td className="py-ds-3 pr-ds-3">{s.session}</td>
                  <td className="py-ds-3 pr-ds-3">• {s.marker}</td>
                  <td className="py-ds-3">{s.destination}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="m-0 text-[13px] text-muted-foreground">
          A demo viewer sees change controls as unavailable, with the reason, never a fake successful save.
        </p>
      </EntranceCard>
    </PublicEntrance>
  );
}
