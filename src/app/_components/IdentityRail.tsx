import { IdentityRail as DesignIdentityRail } from '../../components/ui/IdentityRail.tsx';
import {
  ROLE_LABEL,
  chipCount,
  type ActiveContext,
  type RoleHolding,
} from '../../web/role-context.ts';

/**
 * The Person, and the roles they can act in. Identical in every context —
 * rendered by the design system's IdentityRail (scope 69).
 *
 * The rail is the argument this initiative is making: identity, clubs and
 * the role list do not move when a role is switched, and the workspace
 * beside it is the only thing that redraws. A user who has just switched
 * from Coach to Guardian should be able to see, without reading anything,
 * that they are the same person looking at a different thing.
 *
 * The switcher stays a set of links rather than client state (no
 * `onRoleSelect` is passed), so a role context is a URL — shareable and
 * back-buttonable, and BR61's "switching is explicit" survives the browser's
 * history buttons too. The legal name is shown as the legal name (BR55).
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
  return (
    <DesignIdentityRail
      personName={personName}
      legalName={legalName}
      contexts={contexts.map((holding) => ({
        key: holding.key,
        label: ROLE_LABEL[holding.key],
        clubId: holding.clubId,
        clubName: holding.clubName,
        scope: holding.scope,
        count: chipCount(holding, active),
      }))}
      activeRoleKey={active?.holding.key}
      activeClubId={active?.holding.clubId}
      clubCount={clubCount}
      officerHref={officerHref}
      signOutAction={signOut}
      // Reserved for commissioned artwork — empty until a licence exists
      // (scope 32 WP6, open question 66). Never machine-generated.
      style={{ backgroundImage: 'var(--motif-layer)', backgroundSize: 'cover' }}
    />
  );
}
