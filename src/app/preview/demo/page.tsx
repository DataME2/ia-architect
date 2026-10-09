import { notFound } from 'next/navigation';

import { DemoEntrance } from '../../demo/DemoEntrance.tsx';

/** The signed-out /demo entrance, for a signed-in reviewer (development only). Submitting it would really open the demo. */
export default function DemoPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DemoEntrance />;
}
