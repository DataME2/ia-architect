import { POSITION_SHORT, type PlayerMinutes } from '../../../web/academy.ts';
import { LINES } from '../../../web/dugout.ts';

/**
 * A season's minutes per player, split by position. Minutes recorded
 * without a position are shown as such, never shared out among positions
 * nobody recorded (BR102's honesty).
 */
export function GameTimeBars({
  rows,
  nameOf,
  empty = 'No minutes recorded for this team yet.',
}: {
  readonly rows: readonly PlayerMinutes[];
  readonly nameOf: (personId: string) => string;
  readonly empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="empty" style={{ margin: 0 }}>
        {empty}
      </p>
    );
  }
  const most = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div className="gt">
      <p className="gt-legend">
        {LINES.map((p) => (
          <span key={p} className="gt-key">
            <span className={`gt-swatch gt-${p}`} aria-hidden="true" />
            {POSITION_SHORT[p]}
          </span>
        ))}
        <span className="gt-key">
          <span className="gt-swatch gt-unplaced" aria-hidden="true" />
          No position
        </span>
      </p>
      <ul className="gt-rows">
        {rows.map((r) => {
          const parts = [
            ...LINES.map((p) => ({ key: p, label: POSITION_SHORT[p], minutes: r.byPosition[p] })),
            { key: 'unplaced', label: 'no position', minutes: r.unplaced },
          ].filter((s) => s.minutes > 0);
          const said = parts.map((s) => `${s.label} ${s.minutes}`).join(', ');
          return (
            <li key={r.personId}>
              <span className="gt-name">
                {nameOf(r.personId)}
                <span className="mono hint"> {r.total} min</span>
              </span>
              <span className="gt-bar" role="img" aria-label={`${r.total} minutes: ${said}`} style={{ width: `${(r.total / most) * 100}%` }}>
                {parts.map((s) => (
                  <span key={s.key} className={`gt-${s.key}`} style={{ flexGrow: s.minutes }} />
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
