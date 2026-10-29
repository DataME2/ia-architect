'use client';

import { useState, type CSSProperties } from 'react';

import { IDENTITY_ROLES } from '../../web/home-story.ts';

/** The drawing's geometry, in its own viewBox. A diagram, not to scale. */
const RECORD = { x: 24, y: 172, w: 150, h: 84 } as const;
const MID = RECORD.y + RECORD.h / 2;
const SPINE = 262;
const TIP = 344;
const rowY = (i: number) => 52 + i * 80;

const order = (i: number) => ({ '--i': i }) as CSSProperties;

/**
 * One identity, drawn as a draw (scope 122). It is a cup bracket run
 * backwards: one Person record on the left branches into five roles on the
 * right, each with a note of how far it reaches. Choosing a role traces its
 * branch in oxide, from the record to the role, and says what the role does
 * with the one record.
 *
 * The bracket builds itself the first time it scrolls into view: the trunk
 * draws, then the record appears, then each branch and its role in turn.
 * `ScrollReveal` marks it `waiting` only when it starts below the fold, so
 * it is complete without script and with reduced motion. The drawing is
 * decoration for assistive technology; the buttons and the note carry it.
 */
export function TheDraw() {
  const [active, setActive] = useState(0);
  const role = IDENTITY_ROLES[active] ?? IDENTITY_ROLES[0];
  if (role === undefined) return null;
  const y = rowY(active);

  return (
    <div className="ed-id">
      <figure className="ed-id-figure" data-reveal="">
        <svg viewBox="0 0 640 412" aria-hidden="true" focusable="false">
          {/* The bracket: trunk, spine and one branch per role. */}
          <line className="ed-draw ed-branch" pathLength={1} x1={RECORD.x + RECORD.w} y1={MID} x2={SPINE} y2={MID} style={order(0)} />
          <line className="ed-draw ed-branch" pathLength={1} x1={SPINE} y1={rowY(0)} x2={SPINE} y2={rowY(IDENTITY_ROLES.length - 1)} style={order(1)} />
          {IDENTITY_ROLES.map((r, i) => (
            <line key={r.id} className="ed-draw ed-branch" pathLength={1} x1={SPINE} y1={rowY(i)} x2={TIP} y2={rowY(i)} style={order(3 + i)} />
          ))}

          {/* The traced branch, redrawn in oxide whenever the role changes. */}
          <polyline
            key={role.id}
            className="ed-trace"
            pathLength={1}
            points={`${RECORD.x + RECORD.w},${MID} ${SPINE},${MID} ${SPINE},${y} ${TIP},${y}`}
          />

          <g className="ed-pop" style={order(2)}>
            <rect className="ed-record" x={RECORD.x} y={RECORD.y} width={RECORD.w} height={RECORD.h} />
            <text className="ed-svg-label ed-record-label" x={RECORD.x + 16} y={RECORD.y + 30}>
              PERSON
            </text>
            <text className="ed-svg-serif ed-record-serif" x={RECORD.x + 16} y={RECORD.y + 60}>
              one record
            </text>
          </g>

          {IDENTITY_ROLES.map((r, i) => (
            <g key={r.id} className={`ed-pop ed-node${i === active ? ' is-on' : ''}`} style={order(4 + i)}>
              <rect x={TIP + 4} y={rowY(i) - 5} width={10} height={10} />
              <text className="ed-svg-role" x={TIP + 26} y={rowY(i) - 2}>
                {r.label}
              </text>
              <text className="ed-svg-label" x={TIP + 26} y={rowY(i) + 16}>
                {r.tag.toUpperCase()}
              </text>
            </g>
          ))}

          <g className="ed-pop ed-note" style={order(10)}>
            <line x1={RECORD.x + 30} y1={RECORD.y - 30} x2={RECORD.x + 30} y2={RECORD.y - 4} />
            <text className="ed-svg-label" x={RECORD.x} y={RECORD.y - 40}>
              A · ONE PERSON, ONE RECORD
            </text>
          </g>
          <g className="ed-pop ed-note" style={order(11)}>
            <line x1={SPINE - 34} y1={398} x2={SPINE - 4} y2={rowY(4) + 4} />
            <text className="ed-svg-label" x={24} y={404}>
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
