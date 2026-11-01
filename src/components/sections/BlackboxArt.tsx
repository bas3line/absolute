// Rack furniture for the Blackbox band: screws, vents, LEDs, core maps, a chip
// and a pixel tick. Server-safe (no client kit), all decoration, all aria-hidden.

/** Joins classes. The kit's `cn` is a client function, so server files bring their own. */
export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/** A 7px slotted screw head, lit for the slate panels. Each corner sits at its own angle. */
export function BbScrew({ className, turn = 45 }: { className?: string; turn?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 7 7" className={cx("absolute size-[7px] text-white/40", className)} style={{ rotate: `${turn}deg` }}>
      <circle cx="3.5" cy="3.5" r="3" fill="none" stroke="currentColor" />
      <path d="M1.2 3.5h4.6" stroke="currentColor" />
    </svg>
  );
}

/** Four screws, one per corner. */
export function BbScrews({ inset = "2" }: { inset?: "2" | "3" }) {
  const t = inset === "2" ? "top-2" : "top-3";
  const b = inset === "2" ? "bottom-2" : "bottom-3";
  const l = inset === "2" ? "left-2" : "left-3";
  const r = inset === "2" ? "right-2" : "right-3";
  return (
    <>
      <BbScrew className={`${t} ${l}`} turn={20} />
      <BbScrew className={`${t} ${r}`} turn={75} />
      <BbScrew className={`${b} ${l}`} turn={130} />
      <BbScrew className={`${b} ${r}`} turn={45} />
    </>
  );
}

/** A row of punched vent slots. */
export function BbVents({ count = 9, className }: { count?: number; className?: string }) {
  return (
    <span aria-hidden className={cx("flex gap-[3px]", className)}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="h-[11px] w-[3px] bg-night-line" />
      ))}
    </span>
  );
}

/** Power lit and steady, activity blinking slowly; each slot keeps its own rhythm. */
export function BbLeds({ slot = 0, className }: { slot?: number; className?: string }) {
  return (
    <span aria-hidden className={cx("flex gap-[3px] bg-night p-[3px] ring-1 ring-night-line", className)}>
      <span className="size-[5px] bg-mint" />
      <span className="relative size-[5px] bg-night-3">
        <span
          className="animate-caret absolute inset-0 bg-lime"
          style={{ animationDuration: `${2.6 + slot * 0.55}s`, animationDelay: `${-slot * 0.7}s` }}
        />
      </span>
    </span>
  );
}

/** One lit pixel per core, four to a row: a tiny core map beside the vCPU figure. */
export function BbCores({ n, className }: { n: number; className?: string }) {
  return (
    <span aria-hidden className={cx("grid grid-cols-[repeat(4,5px)] gap-[2px]", className)}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="size-[5px] bg-mint" />
      ))}
    </span>
  );
}

// Drawn at 1:1, 7×6 CSS pixels, so every cell lands on a whole pixel.
const CHECK_BITS = ["......#", ".....##", "#...##.", "##.##..", ".###...", "..#...."];
const CHECK_PX = CHECK_BITS.flatMap((row, y) => row.split("").flatMap((c, x) => (c === "#" ? [{ x, y }] : [])));

/** A pixel check mark in the current colour. */
export function BbCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 6" shapeRendering="crispEdges" aria-hidden className={cx("h-[6px] w-[7px] shrink-0", className)}>
      {CHECK_PX.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
    </svg>
  );
}

/** The tick in a cell: an ink check on a lit square. */
export function BbTick({ tone = "bg-lime" }: { tone?: string }) {
  return (
    <span aria-hidden className={cx("flex size-[13px] shrink-0 pt-[4px] pl-[3px] text-ink", tone)}>
      <BbCheck />
    </span>
  );
}

/**
 * A processor seen from above: a die inside a package, pins on every side, and
 * a lit key cell in the corner of the die (the key that never leaves the chip).
 */
export function BbChip({ className }: { className?: string }) {
  const pins = [12, 20, 28, 36, 44];
  return (
    <svg aria-hidden viewBox="0 0 56 56" fill="none" className={className} shapeRendering="crispEdges">
      {pins.map((p) => (
        <g key={p} stroke="var(--peri-soft)">
          <path d={`M${p}.5 2v6M${p}.5 48v6M2 ${p}.5h6M48 ${p}.5h6`} />
        </g>
      ))}
      <rect x="8.5" y="8.5" width="39" height="39" fill="var(--night)" stroke="var(--peri-soft)" />
      <rect x="16.5" y="16.5" width="23" height="23" stroke="var(--peri)" />
      <rect x="31" y="19" width="6" height="6" fill="var(--mint)" />
      <path d="M19.5 34.5h8M19.5 31.5h5" stroke="var(--peri-soft)" />
    </svg>
  );
}

/** A seeded run of cell colours: the same on the server and in the browser. */
function hashTones(seed: number, cells: number) {
  const tones: string[] = [];
  // Park–Miller: small enough multiplier that every step is an exact integer.
  for (let i = 0, s = Math.max(1, seed); i < cells; i++) {
    s = (s * 16807) % 2147483647;
    const v = s / 2147483647;
    tones.push(v < 0.42 ? "bg-mint-pale" : v < 0.68 ? "bg-peri" : v < 0.8 ? "bg-mint" : "bg-night-line");
  }
  return tones;
}

/**
 * A row of pixels standing in for a hash: fixed, seeded, so the server and the
 * browser draw the same cells. It is a picture of a number, not a real one.
 */
export function BbHashPixels({ seed = 7, cells = 48, cols = 16, className }: { seed?: number; cells?: number; cols?: number; className?: string }) {
  const tone = hashTones(seed, cells);
  return (
    <span
      aria-hidden
      className={cx("grid gap-[3px]", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {tone.map((t, i) => (
        <span key={i} className={cx("aspect-square w-full", t)} />
      ))}
    </span>
  );
}
