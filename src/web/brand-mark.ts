/**
 * The mark's move (scope 108): three passes and a shot, then back to the
 * centre spot while the ball is hidden in the net.
 *
 * Every position is relative to the centre spot, so the ball rests there
 * whenever it is not animating: the still mark is a ball at kick-off.
 * SMIL drops an animation whose lists disagree without an error, so the
 * lists are derived or tested here rather than trusted in the markup.
 */

/** The ball's radius, in the mark's 32-unit drawing. A third of the pitch's height. */
export const BALL_RADIUS = 2.6;

/** Seconds. Under WCAG 2.2.2's five for movement that starts on its own. */
export const MOVE_SECONDS = 2.9;

/** Centre spot, three passes, the shot into the right-hand net, and back. */
const TOUCHES: readonly (readonly [number, number])[] = [
  [0, 0],
  [-5.5, -4.5],
  [5, -4.8],
  [-4.5, 4.5],
  [12.2, 0],
  [0, 0],
];

export const MOVE_PATH = `M${TOUCHES.map(([x, y]) => `${x} ${y}`).join('L')}`;

/** How far along the path each touch is, as a fraction of its length. */
function touchFractions(): number[] {
  const lengths = TOUCHES.slice(1).map(([x, y], i) => Math.hypot(x - TOUCHES[i]![0], y - TOUCHES[i]![1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  let run = 0;
  return [0, ...lengths.map((l) => Math.round(((run += l) / total) * 10000) / 10000)];
}

const [, pass1, pass2, pass3, shot] = touchFractions() as [number, number, number, number, number, number];

/**
 * When each touch lands. The shot arrives at 0.66, the ball sits in the net
 * until 0.78, crosses back unseen by 0.82, and waits on the spot to fade in.
 */
export const KEY_TIMES = [0, 0.15, 0.32, 0.5, 0.66, 0.78, 0.82, 1] as const;
export const KEY_POINTS = [0, pass1, pass2, pass3, shot, shot, 1, 1] as const;

const PASS = '0.15 0.6 0.35 1'; // struck, then slowing
const SHOT = '0.1 0.7 0.3 1';
const EVEN = '0 0 1 1';
export const KEY_SPLINES = [PASS, PASS, PASS, SHOT, EVEN, EVEN, EVEN] as const;

/**
 * Degrees turned by each touch: about the distance over the radius, the
 * other way when rolling left, fastest on the shot, and a whole number of
 * turns at the end so the ball stops upright.
 */
export const SPIN_DEGREES = [0, -157, 75, -218, 360, 360, 360, 360] as const;

/** The ball fades into the net and back in on the spot. */
export const BALL_FADE = { values: [1, 1, 0, 0, 1], keyTimes: [0, 0.74, 0.77, 0.84, 1] } as const;

/** The net lights as the shot arrives. */
export const NET_FLASH = { values: [0, 0, 0.8, 0, 0], keyTimes: [0, 0.64, 0.69, 0.86, 1] } as const;

export const list = (xs: readonly (number | string)[]): string => xs.join(';');
