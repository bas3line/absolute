/**
 * The canary: periwinkle line over a lime body, perched with its feet on the
 * bottom edge of the box. Three pixel notes leave the beak; the motion lives in
 * Canary.tsx's stylesheet and stops under reduced motion, leaving the phrase
 * frozen mid-air.
 */
export function CanaryBird({ className = "" }: { className?: string }) {
  const line = { stroke: "var(--peri)", strokeWidth: 1.5, strokeLinejoin: "round", strokeLinecap: "round" } as const;
  return (
    <svg viewBox="0 0 64 60" aria-hidden className={`overflow-visible ${className}`}>
      <g transform="translate(4 16)">
        {/* tail, body, wing */}
        <path d="M14 30 3 37.5l2.5 3L17 34.5Z" fill="var(--lime)" {...line} />
        <ellipse cx="24" cy="27" rx="13" ry="9" transform="rotate(-30 24 27)" fill="var(--lime)" {...line} />
        <path d="M15.5 27.5C20 21.5 27 21 31.5 24.5 27 30 20.5 31 15.5 27.5Z" fill="var(--lime-hi)" {...line} />
        {/* head, beak, eye */}
        <circle cx="34" cy="14.5" r="7.5" fill="var(--lime)" {...line} />
        <path d="M40.8 12.2 46.5 15l-5.7 2.6Z" fill="var(--pink)" {...line} />
        <rect x="35" y="11.5" width="2.5" height="2.5" fill="var(--ink)" />
        {/* legs and toes, gripping the edge at y = 44 */}
        <path d="M23.5 35.2 22.8 43.6M29.2 34.4 29.6 43.6M19.8 43.6h6M26.8 43.6h6" fill="none" {...line} />
      </g>
      {/* the song: all three leave the beak; held still, they hang in a rising line */}
      <rect className="canary-note" x="51" y="24" width="3" height="3" fill="var(--mint-hi)" />
      <rect className="canary-note canary-note-2" x="51" y="24" width="3" height="3" fill="var(--peri)" />
      <rect className="canary-note canary-note-3" x="51" y="24" width="3" height="3" fill="var(--pink)" />
    </svg>
  );
}
