import type { ReactNode } from 'react';

import { formatMoney } from '../../../domain/finance/money.ts';
import { shortDate, type FixtureLike, type SeasonFigures } from '../../../web/me-view.ts';
import type { RegistrationStatusRow } from '../../../data/schema.ts';

/** A titled block in a workspace. Border and fill say "one thing", once. */
export function Panel({
  title,
  meta,
  children,
}: {
  readonly title: string;
  readonly meta?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
        {meta !== undefined && <span className="meta">{meta}</span>}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

/**
 * A capability the design shows and the product does not have yet.
 *
 * Named for what it waits on — a rule, a capability, a table — rather than
 * "coming soon" alone, so the person reading it can tell whether it is a
 * week away or a season away. An empty list rendered as if it were a true
 * "none" is the thing this exists to prevent.
 */
export function ComingSoon({
  title,
  waitsOn,
  children,
}: {
  readonly title: string;
  /** "BR62", "C4", "a policy" — what has to exist first. */
  readonly waitsOn: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="panel coming-soon" aria-label={`${title} — coming soon`}>
      <div className="panel-head">
        <h3>{title}</h3>
        <span className="coming-tag">Coming soon</span>
      </div>
      <div className="panel-body">
        <p className="hint" style={{ margin: 0 }}>
          {children}
        </p>
        <p className="coming-waits">
          Waits on <span className="mono">{waitsOn}</span>
        </p>
      </div>
    </section>
  );
}

export function FixtureCard({ fixture, teamName }: { readonly fixture: FixtureLike; readonly teamName: string }) {
  const home = fixture.homeAway === 'home';
  return (
    <div className="fixture">
      <p className="fixture-when">
        {shortDate(fixture.playedOn)}
        {fixture.competition !== null && ` · ${fixture.competition}`}
      </p>
      <div className="fixture-teams">
        <span className="t">{home ? teamName : fixture.opponent}</span>
        <span className="v">vs</span>
        <span className="t away">{home ? fixture.opponent : teamName}</span>
      </div>
      <p className="fixture-where">
        {fixture.venue ?? (home ? 'Home ground' : 'Away')}
        {' · '}
        {home ? 'home' : 'away'}
      </p>
    </div>
  );
}

export function Figures({ figures }: { readonly figures: SeasonFigures }) {
  return (
    <div className="figs">
      <div>
        <b>{figures.appearances}</b>
        <span>Apps</span>
      </div>
      <div>
        <b>{figures.minutes.toLocaleString('en-AU')}</b>
        <span>Minutes</span>
      </div>
      <div>
        <b>{figures.goals}</b>
        <span>Goals</span>
      </div>
      <div>
        <b>{figures.assists}</b>
        <span>Assists</span>
      </div>
    </div>
  );
}

const STATUS_LABEL: Readonly<Record<RegistrationStatusRow, string>> = {
  DRAFT: 'Draft',
  PENDING_DOCUMENTS: 'Awaiting documents',
  PENDING_PAYMENT: 'Awaiting payment',
  PENDING_EXTERNAL_REGISTRATION: 'Sent — not yet registered',
  COMPLETE: 'Registered',
};

/** A registration's status as a pill, with BR79's money caveat alongside. */
export function RegistrationPill({
  status,
  outstandingCents,
}: {
  readonly status: RegistrationStatusRow;
  readonly outstandingCents: number;
}) {
  const tone =
    status === 'COMPLETE' ? 'pill-ok' : status === 'PENDING_EXTERNAL_REGISTRATION' ? 'pill-warn' : 'pill-stop';
  return (
    <span style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap' }}>
      <span className={`pill ${tone}`}>{STATUS_LABEL[status]}</span>
      {outstandingCents > 0 && <span className="pill pill-stop">{formatMoney(outstandingCents)} outstanding</span>}
    </span>
  );
}

export function WorkspaceHead({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className="work-head">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
