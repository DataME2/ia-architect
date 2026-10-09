import {
  BoundaryPanel,
  Callout,
  EntranceCard,
  PublicEntrance,
} from '../../components/ui/PublicEntrance.tsx';
import { safeDestination } from '../../web/safe-destination.ts';
import { todayIn } from '../../web/today.ts';
import { SignInForm } from './SignInForm.tsx';

export const dynamic = 'force-dynamic';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** `2026-10-09` → `9 OCT 2026`. */
function eyebrowDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''} ${y}`;
}

/**
 * Sign-in, as the public entrance (Figma "Sign-in — account-safe entry").
 *
 * Nothing on it depends on who is asking: no club, no season, no lookup by
 * email. The form does what it always did; the page around it says what a
 * sign-in does and does not decide (BR61, decision 10).
 */
export default async function SignInPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly next?: string; readonly recover?: string }>;
}) {
  const { next, recover } = await searchParams;
  const recovering = recover === '1';

  return (
    <PublicEntrance
      nav={[
        { label: 'Sign in', href: '/sign-in', current: !recovering },
        { label: 'Password recovery', href: '/sign-in?recover=1', current: recovering },
        { label: 'Read-only demo', href: '/demo' },
        { label: 'Club enquiry', href: '/interest' },
      ]}
      breadcrumb="Let’sDataTalk / Public"
      eyebrow={`Signed out / Public / ${eyebrowDate(todayIn())}`}
      title="One sign-in. Explicit role choices."
      lede="Sign in to your private account, then choose an authorised club and role. No identity is assumed on this public screen."
      footerNote="Public · no personal data"
    >
      <EntranceCard title="Sign in">
        <SignInForm next={safeDestination(next)} recover={recovering} />
      </EntranceCard>

      <EntranceCard title="Your account and your club person">
        <BoundaryPanel eyebrow="Identity / permission boundary" title="The credential stays with you.">
          The active club and role determine what you can view. Person records remain each club&rsquo;s own.
        </BoundaryPanel>
        <p className="m-0 text-sm leading-relaxed">
          Use the same sign-in across every role you hold. An account does not by itself carry a club membership, a
          linked person or season roles: a club administrator links it to the person it belongs to (BR107).
        </p>
        <p className="m-0 text-sm leading-relaxed">
          After signing in, you choose your role explicitly. There is no guessed default and no silently remembered
          role (BR61).
        </p>
        <Callout tone="info" title="Family registration invitation">
          An invitation is used from its own private link, never by searching an email address here. This page does
          not disclose a club or a season.
        </Callout>
        <p className="m-0 flex flex-wrap gap-x-ds-3 text-[13px] font-semibold">
          <a className="min-h-[44px] inline-flex items-center text-foreground no-underline hover:underline" href="/">
            Back to product entrance
          </a>
          <span aria-hidden="true" className="inline-flex items-center">
            ·
          </span>
          <a className="min-h-[44px] inline-flex items-center text-foreground no-underline hover:underline" href="/demo">
            Explore the read-only demo
          </a>
        </p>
      </EntranceCard>
    </PublicEntrance>
  );
}
