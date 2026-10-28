import { SeasonPaths } from './SeasonPaths.tsx';

/**
 * *Season Paths* (scope 117): a club's season walked step by step, with the
 * rule that allows, warns or stops each step.
 *
 * Public and prerendered, like `/` and `/interest`: no session, and nothing
 * read or stored. Each step links to its screen on whichever site serves
 * this page; on the test site, walking a path needs the sign-ins of a QA
 * Test Pass (BR190), which path 1's first step explains.
 */
export const metadata = {
  title: 'Season paths',
  description:
    'Four paths through a club’s season — registration, fixtures, referee designation and payment — and the rule that decides each step.',
};

export default function SeasonPathsPage() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Season paths · end-to-end scenarios</p>
        <h2>One season, walked step by step</h2>
        <p className="lede">
          Four paths through a club’s season: a player registers, a match lands on the calendar at
          a venue, a referee is designated, and the referee is paid. Switch the conditions to see
          which business rule allows the next step, warns, or stops it there.
        </p>
      </section>

      <SeasonPaths />

      <div className="paths-footnotes hint">
        <p>
          Each rule number (BR) is a row in the platform’s business rules. Every rule that blocks
          is enforced by the database as well as the screen, so no other route skips it.
        </p>
        <p>
          Screens with a record in the address (a registration, a fixture) link to the list they
          are opened from. Club screens ask you to sign in first.
        </p>
      </div>
    </>
  );
}
