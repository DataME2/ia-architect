import { EventCalculator } from './EventCalculator.tsx';

/**
 * The public event calculator (BR222, scope 135): what a carnival, a
 * football holiday clinic or a tournament would cost and earn, before
 * anybody decides to hold it.
 *
 * Public and prerendered, like `/season-paths`: no session, no request,
 * and nothing read or stored. The figures are the visitor's own, worked
 * out in their browser by the same function a club's event budget uses
 * (BR209), so a club that later signs in gets the same answer.
 */
export const metadata = {
  title: 'Event calculator',
  description:
    'Estimate what a carnival, football holiday clinic or tournament would cost and earn: income, costs, surplus or deficit, and where it breaks even.',
};

export default function EventCalculatorPage() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Event calculator · an estimate before you commit</p>
        <h2>What would your event cost, and what would it earn?</h2>
        <p className="lede">
          Choose the kind of event, enter its size and your own prices and costs, and see the surplus or deficit,
          where it breaks even, and what changes if more or fewer turn up.
        </p>
      </section>

      <EventCalculator />
    </>
  );
}
