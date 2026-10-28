'use client';

import { useState, type CSSProperties } from 'react';

import { IDENTITY_ROLES } from '../../web/home-story.ts';

/** The drawing's geometry, in its own viewBox. A diagram, not to scale. */
const W = 600;
const H = 470;
const CX = 300;
const CY = 240;
const ORBIT = 168;
const PERSON = 58;

const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.round((CX + r * Math.cos(a)) * 10) / 10, y: Math.round((CY + r * Math.sin(a)) * 10) / 10 };
};

/** Five roles evenly round the person, the first straight above. */
const SPOKES = IDENTITY_ROLES.map((role, i) => {
  const deg = -90 + (i * 360) / IDENTITY_ROLES.length;
  const node = at(deg, ORBIT);
  // Labels sit above the upper roles and below the lower ones, centred, so
  // the longest stays inside the drawing.
  const label = { x: node.x, y: node.y < CY ? node.y - 16 : node.y + 26 };
  return { role, node, label, from: at(deg, PERSON + 6), to: at(deg, ORBIT - 9) } as const;
});

const order = (i: number) => ({ '--i': i }) as CSSProperties;

/**
 * One identity, drawn (scope 120): a Person in the middle and five roles
 * round them, each joined by its own line. Choosing a role traces that line
 * in oxide and says what the role does with the one record, and what it
 * never sees.
 *
 * The drawing constructs itself the first time it scrolls into view: the
 * lines draw, the person appears, then each role in turn. `ScrollReveal`
 * marks it `waiting` only when it starts below the fold, so it is complete
 * without script and with reduced motion. The drawing is decoration for
 * assistive technology; the buttons and the note carry its content.
 */
export function IdentityDrawing() {
  const [active, setActive] = useState(0);
  const role = IDENTITY_ROLES[active] ?? IDENTITY_ROLES[0];
  if (role === undefined) return null;

  return (
    <div className="ed-id">
      <figure className="ed-id-figure" data-reveal="">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
          {/* Construction: the axes and the orbit the roles sit on. */}
          <line className="ed-draw ed-hair" pathLength={1} x1={24} y1={CY} x2={W - 24} y2={CY} style={order(0)} />
          <line className="ed-draw ed-hair" pathLength={1} x1={CX} y1={20} x2={CX} y2={H - 20} style={order(0)} />
          <circle className="ed-draw ed-hair" pathLength={1} cx={CX} cy={CY} r={ORBIT} style={order(1)} />

          {SPOKES.map((s, i) => (
            <line
              key={s.role.id}
              className={`ed-draw ed-spoke${i === active ? ' is-on' : ''}`}
              pathLength={1}
              x1={s.from.x}
              y1={s.from.y}
              x2={s.to.x}
              y2={s.to.y}
              style={order(3 + i)}
            />
          ))}

          <g className="ed-pop" style={order(2)}>
            <circle className="ed-person" cx={CX} cy={CY} r={PERSON} />
            <text className="ed-svg-label" x={CX} y={CY - 8} textAnchor="middle">
              PERSON
            </text>
            <text className="ed-svg-serif" x={CX} y={CY + 16} textAnchor="middle">
              one record
            </text>
          </g>

          {SPOKES.map((s, i) => (
            <g key={s.role.id} className={`ed-pop ed-node${i === active ? ' is-on' : ''}`} style={order(4 + i)}>
              <rect x={s.node.x - 5} y={s.node.y - 5} width={10} height={10} />
              <text className="ed-svg-label" x={s.label.x} y={s.label.y} textAnchor="middle">
                {s.role.label.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Two annotations, with their leaders. */}
          <g className="ed-pop ed-note" style={order(10)}>
            <line x1={150} y1={58} x2={CX - 40} y2={CY - 42} />
            <text className="ed-svg-label" x={24} y={48}>
              A · ONE PERSON, ONE RECORD
            </text>
          </g>
          <g className="ed-pop ed-note" style={order(11)}>
            <line x1={W - 70} y1={H - 44} x2={CX + 44} y2={CY + 40} />
            <text className="ed-svg-label" x={W - 24} y={H - 24} textAnchor="end">
              B · ONE VIEW AT A TIME · BR61
            </text>
          </g>
        </svg>
      </figure>

      <div className="ed-id-roles" role="group" aria-label="Trace a role">
        {IDENTITY_ROLES.map((r, i) => (
          <button key={r.id} type="button" aria-pressed={i === active} onClick={() => setActive(i)}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="ed-id-note" aria-live="polite">
        <p className="ed-label">Traced · {role.label}</p>
        <p>{role.text}</p>
        <p className="ed-rules">{role.rules.join(' · ')}</p>
      </div>
    </div>
  );
}
