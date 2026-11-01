// The comparison's stage furniture: rack screws, a vent grille, and the faint
// periwinkle contours behind the two windows. All decoration, all aria-hidden.

/** A rack screw: a 7px head with a slot across it. */
export function SignupScrew({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 7 7" className={`size-[7px] ${className}`}>
      <circle cx="3.5" cy="3.5" r="3" fill="var(--bg-3)" stroke="var(--ink-4)" strokeWidth="1" />
      <path d="M1.9 5.1 5.1 1.9" stroke="var(--ink-3)" strokeWidth="1" />
    </svg>
  );
}

/** A row of vent slots, as punched in a rack panel. */
export function SignupVents({ count = 8, className = "" }: { count?: number; className?: string }) {
  return (
    <span aria-hidden className={`flex gap-[3px] ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="h-3.5 w-[3px] bg-ink-4" />
      ))}
    </span>
  );
}

/* Contours ---------------------------------------------------------------- */

const W = 1200;
const H = 680;
// Rings spread from the start node, which sits at the top centre of the stage.
const CX = W / 2;
const CY = 44;
const RINGS = 34;
const STEPS = 160;

/** One ring, a touch out of true. Fixed maths, rounded, so the server and the browser draw the same path. */
function ring(k: number) {
  const r = 40 + k * 17;
  const pts: string[] = [];
  for (let i = 0; i < STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    const wob = 1 + 0.022 * Math.sin(3 * t + k * 0.22) + 0.012 * Math.sin(7 * t - k * 0.31);
    const x = CX + Math.cos(t) * r * 2.1 * wob;
    const y = CY + Math.sin(t) * r * wob;
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

const PATHS = Array.from({ length: RINGS }, (_, k) => ring(k));

/** Close-set periwinkle rings, like a sounding from the start node, fading as they spread. Never animated. */
export function SignupContours({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMin meet"
      fill="none"
      stroke="var(--peri)"
      className={className}
    >
      {PATHS.map((d, k) => (
        <path
          key={k}
          d={d}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          opacity={(0.85 - (k / RINGS) * 0.7).toFixed(2)}
        />
      ))}
    </svg>
  );
}
