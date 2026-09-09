/**
 * The mark: a football in the national sporting colours.
 *
 * Three colours, and each is doing a job. **Green and gold** is what
 * football looks like in Australia — the wattle the colours are named for,
 * worn by the Socceroos and the Matildas. **White** is the ball itself, and
 * it is also what football looks like across the Tasman, where the national
 * side is the All Whites: a palette this product can wear in both markets
 * without picking one.
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
      aria-label="Let'sDataTalk"
      focusable="false"
    >
      <defs>
        <linearGradient id="ldt-mark" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#0d6b45" />
          <stop offset="1" stopColor="#052e1f" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#ldt-mark)" />
      <circle cx="16" cy="16" r="9.6" fill="#fbfdfb" stroke="#ffcb05" strokeWidth="1.3" />
      {/* One panel, and no seams. Radiating seams are what a football has,
          and at the 30px this renders at they collapse into a five-pointed
          star — the mark stopped reading as a ball and started reading as a
          flag. A single centred pentagon survives the size. */}
      <path d="M16 10.1 21.61 14.18 19.47 20.77h-6.94L10.39 14.18Z" fill="#07422c" />
    </svg>
  );
}
