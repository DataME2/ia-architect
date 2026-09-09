import { ROLE_HUE, initialsOf } from '../../web/me-view.ts';
import {
  ROLE_LABEL,
  chipCount,
  type ActiveContext,
  type RoleHolding,
} from '../../web/role-context.ts';

/**
 * The Person, and the roles they can act in. Identical in every context.
 *
 * The rail is the argument this initiative is making: identity, clubs and
 * the role list do not move when a role is switched, and the workspace
 * beside it is the only thing that redraws. A user who has just switched
 * from Coach to Guardian should be able to see, without reading anything,
 * that they are the same person looking at a different thing.
 *
 * Server-rendered on purpose. Which roles a Person holds is a database
 * question, and the switcher is a set of links rather than client state —
 * so a role context is a URL, shareable and back-buttonable, and BR61's
 * "switching is explicit" survives the browser's history buttons too.
 */
export function IdentityRail({
  personName,
  legalName,
  contexts,
  active,
  clubCount,
  officerHref,
  signOut,
}: {
  readonly personName: string;
  readonly legalName: string;
  readonly contexts: readonly RoleHolding[];
  readonly active: ActiveContext | null;
  readonly clubCount: number;
  /** `/registrar` for a club officer; null for a person who holds no such role. */
  readonly officerHref: string | null;
  readonly signOut: () => Promise<void>;
}) {
  const initials = initialsOf(personName);

  return (
    <aside className="identity-rail" aria-label="You, and the roles you hold">
      <div className="rail-person">
        {/*
          The crest slot. Dashed and labelled until a licensed asset exists —
          an empty slot that looks deliberate beats a placeholder logo, and
          beats a generated one by a wider margin. See open question 66.
        */}
        <span className="rail-crest" aria-hidden="true">
          CREST
        </span>
        <span className="rail-avatar" aria-hidden="true">
          {initials}
        </span>
        <span>
          <span className="rail-name">{personName}</span>
          {/* BR55: the legal name is kept and shown as the legal name, never
              dressed up as the preferred one. */}
          <span className="rail-legal">LEGAL: {legalName.toUpperCase()}</span>
        </span>
      </div>

      <div className="rail-ledger">
        <div>
          <b>1</b>
          <span>Sign-in</span>
        </div>
        <div>
          <b>{contexts.length}</b>
          <span>Roles held</span>
        </div>
        <div>
          <b>{clubCount}</b>
          <span>{clubCount === 1 ? 'Club' : 'Clubs'}</span>
        </div>
        <div className="is-zero">
          <b>0</b>
          <span>Duplicate accts</span>
        </div>
      </div>

      <nav aria-label="Choose the role you are acting in">
        <p className="rail-label">Acting as</p>
        <div className="role-list">
          {contexts.map((holding) => {
            const current =
              active !== null &&
              active.holding.key === holding.key &&
              active.holding.clubId === holding.clubId;
            const count = chipCount(holding, active);
            return (
              <a
                key={`${holding.key}:${holding.clubId}`}
                className={current ? 'role-item is-current' : 'role-item'}
                href={`?role=${holding.key}&club=${encodeURIComponent(holding.clubId)}`}
                aria-current={current ? 'true' : undefined}
                style={{ ['--role-hue' as string]: ROLE_HUE[holding.key] }}
              >
                <span>
                  <span className="role-item-name">{ROLE_LABEL[holding.key]}</span>
                  <span className="role-item-where">
                    {holding.clubName.toUpperCase()}
                    {holding.scope !== null && ` · ${holding.scope.toUpperCase()}`}
                  </span>
                </span>
                {count !== null && count > 0 && (
                  <span className="role-item-count">
                    {count}
                    <span className="sr-only"> waiting</span>
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </nav>

      {/* The rule, where the person it governs can read it. */}
      <p className="rail-rule">
        <span className="rule-tag">BR61</span>
        <b>One active role at a time.</b> Switching is explicit and never merges two
        roles&rsquo; views. The counts are your own; the detail waits behind the switch.
      </p>

      <div className="rail-foot">
        {officerHref !== null && (
          <a className="rail-link" href={officerHref}>
            Club administration &rarr;
          </a>
        )}
        <form action={signOut}>
          <button type="submit" className="rail-signout">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
