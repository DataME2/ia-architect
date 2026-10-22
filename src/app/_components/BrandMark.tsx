/**
 * The mark: a football on pitch slate.
 *
 * Recoloured for the aurora (scope 100): a night tile and an aurora-cyan
 * seam ring, read from the theme tokens so the mark follows the palette.
 * Volt is no longer borrowed here — it is the Assistant's alone.
 *
 * Drawn inline rather than fetched: it is smaller than the request that
 * would collect it, it needs no build step, and there is no state in which
 * the masthead renders without its mark.
 */
export function BrandMark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 32 32"
      role="img"
      aria-label="PitchPeople"
      focusable="false"
    >
      <defs>
        <linearGradient id="ldt-mark" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" style={{ stopColor: 'var(--night-3)' }} />
          <stop offset="1" style={{ stopColor: 'var(--night)' }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#ldt-mark)" />
      <circle
        cx="16"
        cy="16"
        r="9.6"
        strokeWidth="1.3"
        style={{ fill: 'var(--flood)', stroke: 'var(--aurora-cyan)' }}
      />
      {/* One panel, and no seams. Radiating seams are what a football has,
          and at the 30px this renders at they collapse into a five-pointed
          star — the mark stopped reading as a ball and started reading as a
          flag. A single centred pentagon survives the size. */}
      <path d="M16 10.1 21.61 14.18 19.47 20.77h-6.94L10.39 14.18Z" style={{ fill: 'var(--night)' }} />
    </svg>
  );
}
