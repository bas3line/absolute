import type { CSSProperties, ReactNode } from "react";

/*
 * The island: an isometric topographic island, drawn in code. Contour rings
 * stacked into terraces, a sea of fine drifting lines, and a server rack on the
 * summit. Five label chips hang off it on dashed wires, each one a thing a
 * Blackbox will show you; a pixel runs down each wire and goes out at the rack.
 * All static geometry is computed once here, on the server; the motion is CSS,
 * and stops under reduced motion.
 */

/* World and camera --------------------------------------------------------- */

// World units are viewBox pixels: x and y lie on the sea, z points up. Azimuth 45°, elevation 30°.
const VW = 700;
const VH = 620;
const OX = 350;
const OY = 398;
const C = Math.cos(Math.PI / 6);
const S = 0.5;

type Pt = readonly [number, number];

const iso = (x: number, y: number, z: number): Pt => [OX + (x - y) * C, OY + (x + y) * S - z];
const r1 = (n: number) => Math.round(n * 10) / 10;
const poly = (ps: readonly Pt[]) => ps.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ");
const line = (ps: readonly Pt[]) => "M" + ps.map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L");

// A deterministic 0–1 hash, so the sea is the same on every render.
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* Island ------------------------------------------------------------------- */

const RINGS = 10;
const LIFT = 7.5;
const R0 = 188;
// Each ring's size against the shore: wide terraces low down, closer together toward the summit.
const SHRINK = [1, 0.925, 0.858, 0.798, 0.744, 0.696, 0.652, 0.612, 0.576, 0.544];
const SAMPLES = 120;

/** Ring i's outline on the sea plane: a wobbly circle whose wobble calms toward the summit. */
function plan(k: number, i: number): Array<[number, number]> {
  const calm = 1 - (Math.max(0, i) / RINGS) * 0.5;
  const cx = -i * 0.8;
  const cy = i * 0.9;
  return Array.from({ length: SAMPLES }, (_, j) => {
    const t = (j / SAMPLES) * Math.PI * 2;
    const n =
      0.07 * Math.sin(2 * t + 0.6 + i * 0.13) +
      0.043 * Math.sin(3 * t + 2.1 - i * 0.21) +
      0.024 * Math.sin(5 * t + 0.3 + i * 0.37) +
      0.011 * Math.sin(7 * t + 1.7 + i * 0.5);
    const r = R0 * k * (1 + n * calm);
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  });
}

/** The part of a projected ring that faces the viewer: leftmost point to rightmost, through the bottom. */
function frontChain(ps: readonly Pt[]): Pt[] {
  let l = 0;
  let r = 0;
  ps.forEach(([x], j) => {
    if (x < ps[l][0]) l = j;
    if (x > ps[r][0]) r = j;
  });
  const walk = (dir: 1 | -1) => {
    const out: Pt[] = [];
    for (let j = l; ; j = (j + dir + ps.length) % ps.length) {
      out.push(ps[j]);
      if (j === r) break;
    }
    return out;
  };
  const a = walk(1);
  const b = walk(-1);
  const meanY = (c: Pt[]) => c.reduce((s, p) => s + p[1], 0) / c.length;
  return meanY(a) > meanY(b) ? a : b;
}

// Ring i stands LIFT tall on ring i - 1; ring 0 stands on the sea. Its wall is the band under its front edge.
const RINGS_DRAWN = SHRINK.map((k, i) => {
  const z = (i + 1) * LIFT;
  const top = plan(k, i).map(([x, y]) => iso(x, y, z));
  const chain = frontChain(top);
  const foot = chain.map(([x, y]) => [x, y + LIFT] as const);
  return {
    top: poly(top),
    wall: poly([...chain, ...[...foot].reverse()]),
    foot: line(foot),
    // Every fifth contour is an index contour, drawn heavier, as on a survey map.
    index: i % 5 === 4,
  };
});
const SUMMIT_Z = RINGS * LIFT;
// Terrace walls: a pale wash of periwinkle over paper. Flat, like the terraces, just a shade down.
const WALL = "color-mix(in srgb, var(--peri) 22%, var(--paper))";

// Depth contours under the water, dashed, widening out from the shore. The outermost bounds the sea.
const SOUNDINGS = [1.15, 1.31, 1.47].map((k, n) => poly(plan(k, -(n + 1)).map(([x, y]) => iso(x, y, 0))));
const SEA_EDGE = SOUNDINGS[SOUNDINGS.length - 1];

// Dash patterns for the sea, each 120 long so a drift of 120 loops without a seam.
const SWELLS = ["96 6 12 6", "70 6 38 6", "110 10", "54 6 54 6", "30 6 78 6"];
const SEA = Array.from({ length: 46 }, (_, n) => {
  const y = 214 + n * 8.4;
  return {
    y: r1(y),
    dash: SWELLS[Math.floor(hash(n) * SWELLS.length)],
    offset: r1(hash(n + 40) * 120),
    dur: r1(22 + hash(n + 80) * 18),
    right: n % 2 === 1,
    // Calmer toward the far and near edges of the sea.
    opacity: r1(0.55 - Math.min(1, Math.abs(y - OY) / 190) * 0.3),
  };
});

/* Boat --------------------------------------------------------------------- */

// A rowing boat in the shallows, bow on to the island. Decoration only.
const BOAT_X = 40;
const BOAT_Y = 238;
const HEADING = Math.atan2(-BOAT_Y - 10, -BOAT_X);
const BL = 62;
const BB = 21;

/** A point in the boat's frame, s along the keel (bow +), w across it, z up from the water. */
const onBoat = (s: number, w: number, z: number) => {
  const [ca, sa] = [Math.cos(HEADING), Math.sin(HEADING)];
  return iso(BOAT_X + s * ca - w * sa, BOAT_Y + s * sa + w * ca, z);
};

// Half the hull in plan, stern to bow.
const HULL_HALF: Array<[number, number]> = [
  [-0.5, 0.34],
  [-0.32, 0.47],
  [-0.06, 0.5],
  [0.18, 0.45],
  [0.34, 0.31],
  [0.45, 0.14],
  [0.5, 0],
];
const hull = (k: number, z: number) =>
  [...HULL_HALF, ...HULL_HALF.slice(0, -1).reverse().map(([s, w]) => [s, -w] as [number, number])].map(([s, w]) =>
    onBoat(s * BL * k, w * BB * k, z),
  );

const GUNWALE = hull(1, 6);
const WATERLINE = hull(0.86, 0);
// Which side of the boat faces the viewer: its oar is drawn over the hull, the other under it.
const NEAR = Math.cos(HEADING) - Math.sin(HEADING) > 0 ? 1 : -1;
// The oars rest in their locks amidships, blades trailing in the water.
const oar = (side: 1 | -1) => ({
  shaft: line([onBoat(-2, side * 9, 7), onBoat(-14, side * 34, 0.8)]),
  blade: line([onBoat(-13, side * 31.5, 1), onBoat(-16.5, side * 40, 0)]),
});
const BOAT = {
  wall: poly([...frontChain(GUNWALE), ...frontChain(WATERLINE).reverse()]),
  top: poly(GUNWALE),
  well: poly(hull(0.8, 6)),
  thwarts: [-0.14, 0.14].map((s) => line([onBoat(s * BL, -0.4 * BB, 6), onBoat(s * BL, 0.4 * BB, 6)])).join(""),
  near: oar(NEAR),
  far: oar(-NEAR as 1 | -1),
  wake: [1, -1].map((side) => line([onBoat(-0.5 * BL, side * 0.34 * BB, 0), onBoat(-0.5 * BL - 30, side * 22, 0)])),
  lamp: onBoat(0.47 * BL, 0, 8),
};

/* Rack --------------------------------------------------------------------- */

const RX0 = -44;
const RX1 = 52;
const RY0 = -41;
const RY1 = 21;
const W = RX1 - RX0; // 96, the front
const D = RY1 - RY0; // 62, the side
const PLINTH = 8;
const RZ0 = SUMMIT_Z + PLINTH;
const H = 196;
const RZ1 = RZ0 + H;

/** The three faces of a box that face the viewer: top, front (+y) and side (+x). */
function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  return {
    top: poly([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)]),
    front: poly([iso(x0, y1, z1), iso(x1, y1, z1), iso(x1, y1, z0), iso(x0, y1, z0)]),
    side: poly([iso(x1, y1, z1), iso(x1, y0, z1), iso(x1, y0, z0), iso(x1, y1, z0)]),
  };
}

const BODY = box(RX0, RY0, RZ0, RX1, RY1, RZ1);
const BASE = box(RX0 - 6, RY0 - 6, SUMMIT_Z, RX1 + 6, RY1 + 6, RZ0);

// Face planes as SVG matrices, so parts can be drawn flat in each face's own units.
const c4 = r1(C * 1000) / 1000;
const at = (p: Pt) => `${r1(p[0])} ${r1(p[1])}`;
// Front: u along +x from the left edge, v down from the top.
const FRONT = `matrix(${c4} ${S} 0 1 ${at(iso(RX0, RY1, RZ1))})`;
// Side: u along -y from the front corner, v down from the top.
const SIDE = `matrix(${c4} ${-S} 0 1 ${at(iso(RX1, RY1, RZ1))})`;
// Top: u along +x, v along +y, from the back corner.
const TOP = `matrix(${c4} ${S} ${-c4} ${S} ${at(iso(RX0, RY0, RZ1))})`;

const onFront = (u: number, v: number) => iso(RX0 + u, RY1, RZ1 - v);
const onSide = (u: number, v: number) => iso(RX1, RY1 - u, RZ1 - v);
const onTop = (u: number, v: number) => iso(RX0 + u, RY0 + v, RZ1);

/* Wires and chips ---------------------------------------------------------- */

type Wire = {
  id: string;
  label: string;
  chip: ReactNode;
  /** Which way the chip hangs off its anchor. */
  side: "l" | "r";
  /** Port on the rack first, chip anchor last. */
  pts: Pt[];
  pixel: string;
  dur: number;
  delay: number;
  /** Shown on phones, where there is room for three. */
  phone: boolean;
};

// A wire leaves its port along the face's outward normal for `run`, then runs level to the chip at x.
const OUT_FRONT: Pt = [-C, S];
const OUT_SIDE: Pt = [C, S];
const out = (port: Pt, dir: Pt, run: number, toX: number): Pt[] => {
  const bend: Pt = [port[0] + dir[0] * run, port[1] + dir[1] * run];
  return [port, bend, [toX, bend[1]]];
};
// From a gland on the lid it rises straight up to y, then runs level to x.
const rise = (port: Pt, toY: number, toX: number): Pt[] => [port, [port[0], toY], [toX, toY]];

const G1 = onTop(24, 46);
const G2 = onTop(80, 20);
const PORT_BOOT = onFront(18, 8 + 18 * 6 + 8.5);
const PORT_DISK = onSide(31, 116);
const PORT_AGENT = onSide(31, 170);

const Dim = ({ children }: { children: ReactNode }) => <span className="text-ink-3">{children}</span>;

// What a Blackbox shows you once it is up: the dmesg line, the verifier's verdict, the unlock prompt, the missing port.
// Chip anchors sit close to the rack, so the longer chips fit beside it on phones and at lg.
const WIRES: Wire[] = [
  {
    id: "root",
    label: "a root prompt",
    chip: (
      <>
        root@blackbox:~#
        <span aria-hidden className="animate-caret -mr-0.5 ml-1 inline-block h-[1.05em] w-[0.55em] bg-ink" />
      </>
    ),
    side: "l",
    pts: rise(G1, 52, 312),
    pixel: "var(--mint)",
    dur: 6.4,
    delay: -1.2,
    phone: true,
  },
  {
    id: "snp",
    label: "memory encryption reported active by AMD SEV-SNP",
    chip: (
      <>
        <Dim>SEV-SNP:</Dim> active
      </>
    ),
    side: "r",
    pts: rise(G2, 82, 432),
    pixel: "var(--pink)",
    dur: 7.2,
    delay: -4.6,
    phone: true,
  },
  {
    id: "boot",
    label: "a measured boot that passed verification",
    chip: (
      <>
        <Dim>
          <span className="max-sm:hidden">measured </span>boot:
        </Dim>{" "}
        PASS
      </>
    ),
    side: "l",
    pts: out(PORT_BOOT, OUT_FRONT, 30, 250),
    pixel: "var(--peri)",
    dur: 5.8,
    delay: -2.9,
    phone: true,
  },
  {
    id: "disk",
    label: "a LUKS2 disk that only your passphrase opens",
    chip: (
      <>
        LUKS2 <Dim>·</Dim> your passphrase
      </>
    ),
    side: "r",
    pts: out(PORT_DISK, OUT_SIDE, 36, 458),
    pixel: "var(--mint)",
    dur: 6.8,
    delay: -0.4,
    phone: false,
  },
  {
    id: "agent",
    label: "no virtio port for a guest agent",
    chip: (
      <>
        <Dim>/dev/virtio-ports:</Dim> none
      </>
    ),
    side: "r",
    pts: out(PORT_AGENT, OUT_SIDE, 40, 462),
    pixel: "var(--pink)",
    dur: 6.1,
    delay: -3.7,
    phone: false,
  },
];

const segLen = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Keyframes for the pixel on one wire: in at the chip, along each leg at an even pace, out at the port. */
function travel(name: string, pts: readonly Pt[]) {
  const path = [...pts].reverse();
  const legs = path.slice(1).map((p, i) => segLen(path[i], p));
  const total = legs.reduce((a, b) => a + b, 0);
  const [from, to] = [6, 60];
  const tr = (p: Pt) => `transform:translate(${r1(p[0])}px,${r1(p[1])}px)`;
  const frames = [`0%{${tr(path[0])};opacity:0}`, `${from}%{${tr(path[0])};opacity:1}`];
  let run = 0;
  legs.forEach((len, i) => {
    run += len;
    frames.push(`${r1(from + ((to - from) * run) / total)}%{${tr(path[i + 1])};opacity:1}`);
  });
  frames.push(`${to + 5}%{${tr(path[path.length - 1])};opacity:0}`, `100%{${tr(path[path.length - 1])};opacity:0}`);
  return `@keyframes ${name}{${frames.join("")}}`;
}

/** Where a pixel waits under reduced motion: halfway along its wire. */
function halfway(pts: readonly Pt[]): Pt {
  const legs = pts.slice(1).map((p, i) => segLen(pts[i], p));
  let left = legs.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < legs.length; i++) {
    if (left <= legs[i]) {
      const t = left / legs[i];
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    }
    left -= legs[i];
  }
  return pts[pts.length - 1];
}

const CSS = [
  ".hi-sea{animation:hi-sea linear infinite}",
  ".hi-sea-r{animation-name:hi-sea-r}",
  "@keyframes hi-sea{to{stroke-dashoffset:-120}}",
  "@keyframes hi-sea-r{to{stroke-dashoffset:120}}",
  ".hi-led{animation:hi-led steps(1,end) infinite}",
  "@keyframes hi-led{0%{opacity:1}64%{opacity:.16}}",
  ".hi-px{animation:linear infinite both}",
  ".hi-bob{animation:hi-bob 5.5s ease-in-out infinite}",
  "@keyframes hi-bob{50%{transform:translateY(-1.6px)}}",
  ...WIRES.map((w) => travel(`hi-px-${w.id}`, w.pts)),
  "@media (prefers-reduced-motion:reduce){.hi-anim{animation:none!important}}",
].join("");

/* Small parts -------------------------------------------------------------- */

const NS = "non-scaling-stroke";

/** A screw head: a small disc with a slot across it. */
function Screw({ x, y, r = 2.1 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="var(--night-2)" stroke="var(--ink)" strokeWidth={0.8} vectorEffect={NS} />
      <path d={`M${x - r * 0.7} ${y + r * 0.7}L${x + r * 0.7} ${y - r * 0.7}`} stroke="var(--ink)" strokeWidth={0.8} vectorEffect={NS} />
    </g>
  );
}

/** One LED: a lit square. With a period it blinks; without, it stays on. */
function Led({ x, y, fill, size = 4, blink }: { x: number; y: number; fill: string; size?: number; blink?: [number, number] }) {
  const style: CSSProperties | undefined = blink
    ? { animationDuration: `${blink[0]}s`, animationDelay: `${blink[1]}s` }
    : undefined;
  return <rect x={x} y={y} width={size} height={size} fill={fill} className={blink ? "hi-anim hi-led" : undefined} style={style} />;
}

type UnitKind = "server" | "disks" | "switch" | "blank" | "vent" | "power";

// The rack's ten units, top to bottom.
const UNITS: Array<{ at: number; size: 1 | 2; kind: UnitKind; port?: boolean }> = [
  { at: 0, size: 1, kind: "server" },
  { at: 1, size: 1, kind: "server" },
  { at: 2, size: 2, kind: "disks" },
  { at: 4, size: 1, kind: "switch" },
  { at: 5, size: 1, kind: "blank" },
  { at: 6, size: 1, kind: "server", port: true },
  { at: 7, size: 1, kind: "server" },
  { at: 8, size: 1, kind: "vent" },
  { at: 9, size: 1, kind: "power" },
];
const U = 18;
const UTOP = 8;

const slots = (xs: number[], y: number, w: number, h: number) => xs.map((x) => `M${x} ${y}h${w}v${h}h${-w}z`).join("");
const range = (n: number, from: number, step: number) => Array.from({ length: n }, (_, i) => r1(from + i * step));

function Unit({ at: k, size, kind, port, n }: { at: number; size: 1 | 2; kind: UnitKind; port?: boolean; n: number }) {
  const y = UTOP + k * U;
  const h = size * U - 2;
  return (
    <g>
      <rect x={12} y={y + 1} width={72} height={h} fill="var(--night-3)" stroke="var(--ink)" strokeWidth={0.9} vectorEffect={NS} />
      {kind === "server" ? (
        <>
          {port ? (
            <>
              <rect x={14.5} y={y + 4} width={8} height={9} fill="var(--ink)" />
              <rect x={16.5} y={y + 6} width={4} height={3} fill="var(--night-line)" />
            </>
          ) : (
            <rect x={14.5} y={y + 4} width={8} height={9} fill="var(--night-2)" stroke="var(--ink)" strokeWidth={0.8} vectorEffect={NS} />
          )}
          <path d={slots(range(9, 27, 3.6), y + 4, 1.6, 10)} fill="var(--ink)" />
          <Led x={64} y={y + 6.5} fill="var(--mint)" />
          <Led x={72} y={y + 6.5} fill={n % 2 ? "var(--lime)" : "var(--pink)"} blink={[1.9 + n * 0.37, -n * 0.6]} />
        </>
      ) : null}
      {kind === "disks"
        ? range(6, 15, 11.4).map((x, j) => (
            <g key={j}>
              <rect x={x} y={y + 3.5} width={9.6} height={h - 5} fill="var(--ink)" />
              <rect x={x + 2} y={y + 7} width={5.6} height={1.6} fill="var(--night-3)" />
              <rect x={x + 2} y={y + 11} width={5.6} height={1.6} fill="var(--night-3)" />
              <Led x={x + 3.4} y={y + h - 7.5} size={3} fill={j === 4 ? "var(--lime)" : "var(--mint)"} blink={j === 1 || j === 4 ? [2.6 + j * 0.5, -j] : undefined} />
            </g>
          ))
        : null}
      {kind === "switch" ? (
        <>
          <path d={slots(range(7, 15, 6.4), y + 3.5, 4.6, 4) + slots(range(7, 15, 6.4), y + 9.5, 4.6, 4)} fill="var(--ink)" />
          <Led x={62} y={y + 4} size={3} fill="var(--mint)" />
          <Led x={67} y={y + 4} size={3} fill="var(--lime)" blink={[3.1, -1.3]} />
          <Led x={72} y={y + 4} size={3} fill="var(--mint)" blink={[4.3, -2.2]} />
          <Led x={77} y={y + 4} size={3} fill="var(--mint)" />
          <path d={`M62 ${y + 11}h18`} stroke="var(--night-line)" strokeWidth={1} vectorEffect={NS} />
        </>
      ) : null}
      {kind === "blank" ? (
        <>
          <Screw x={17.5} y={y + 1 + h / 2} r={1.9} />
          <Screw x={78.5} y={y + 1 + h / 2} r={1.9} />
        </>
      ) : null}
      {kind === "vent" ? (
        <path d={[4, 8, 12].map((d) => slots(range(8, 22, 7.2), y + d, 5.4, 1.8)).join("")} fill="var(--ink)" />
      ) : null}
      {kind === "power" ? (
        <>
          {range(4, 16, 11).map((x) => (
            <g key={x}>
              <rect x={x} y={y + 3.5} width={8} height={10} fill="var(--ink)" />
              <rect x={x + 2} y={y + 6} width={1.3} height={4} fill="var(--night-3)" />
              <rect x={x + 4.7} y={y + 6} width={1.3} height={4} fill="var(--night-3)" />
            </g>
          ))}
          <Led x={70} y={y + 6} fill="var(--mint)" size={5} />
        </>
      ) : null}
    </g>
  );
}

/** A socket a wire plugs into, drawn flat on its face. */
function Socket({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 6} y={y - 4.5} width={12} height={9} fill="var(--ink)" stroke="var(--night-line)" strokeWidth={0.9} vectorEffect={NS} />
      <rect x={x - 3} y={y - 1.5} width={6} height={3} fill="var(--night-3)" />
    </g>
  );
}

/** A cable gland on the lid: a ring with a dark bore. */
function Gland({ u, v }: { u: number; v: number }) {
  return (
    <g>
      <circle cx={u} cy={v} r={5.5} fill="var(--night-2)" stroke="var(--ink)" strokeWidth={0.9} vectorEffect={NS} />
      <circle cx={u} cy={v} r={2.6} fill="var(--ink)" />
    </g>
  );
}

/* The figure --------------------------------------------------------------- */

const pct = (n: number, of: number) => `${r1((n / of) * 1000) / 10}%`;

export function HeroIsland({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label={`An island drawn as stacked contour lines, with a Blackbox server rack on its summit. Wires run from the rack to ${WIRES.map((w) => w.label).join(", ")}.`}
      className={["relative aspect-[700/620] w-full select-none", className].filter(Boolean).join(" ")}
    >
      <style>{CSS}</style>
      <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 size-full overflow-visible" fill="none" aria-hidden>
        <defs>
          <clipPath id="hero-island-sea">
            <polygon points={SEA_EDGE} />
          </clipPath>
          {/* The summit, surveyed: a fine lattice of points. */}
          <pattern id="hero-island-grid" width={9} height={9} patternUnits="userSpaceOnUse">
            <rect width={9} height={9} fill="var(--paper)" />
            <rect x={4} y={4} width={1.2} height={1.2} fill="var(--peri)" />
          </pattern>
        </defs>

        {/* The sea: fine level lines whose breaks drift, inside the deepest sounding. */}
        <g clipPath="url(#hero-island-sea)" stroke="var(--peri)" strokeWidth={1}>
          {SEA.map((s, n) => (
            <line
              key={n}
              x1={0}
              x2={VW}
              y1={s.y}
              y2={s.y}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              strokeOpacity={s.opacity}
              vectorEffect={NS}
              className={s.right ? "hi-anim hi-sea hi-sea-r" : "hi-anim hi-sea"}
              style={{ animationDuration: `${s.dur}s` }}
            />
          ))}
        </g>
        {SOUNDINGS.map((p, n) => (
          <polygon
            key={n}
            points={p}
            stroke="var(--peri)"
            strokeWidth={1}
            strokeDasharray="2 5"
            strokeLinecap="round"
            strokeOpacity={0.9 - n * 0.2}
            vectorEffect={NS}
          />
        ))}

        {/* The island, terrace by terrace from the shore up: the wall, then the terrace on top. */}
        {RINGS_DRAWN.map((r, i) => (
          <g key={i}>
            <polygon points={r.wall} fill={WALL} />
            <path d={r.foot} stroke="var(--peri)" strokeWidth={i === 0 ? 1.4 : 0.8} strokeOpacity={i === 0 ? 1 : 0.55} vectorEffect={NS} />
            <polygon
              points={r.top}
              fill={i === RINGS - 1 ? "url(#hero-island-grid)" : "var(--paper)"}
              stroke="var(--peri)"
              strokeWidth={r.index ? 1.6 : 1}
              strokeLinejoin="round"
              vectorEffect={NS}
            />
          </g>
        ))}

        {/* The boat: wake on the water, then the far oar, the hull, the near oar. It rides a slow swell. */}
        <g clipPath="url(#hero-island-sea)" stroke="var(--peri)" strokeWidth={1.2} strokeDasharray="5 4">
          {BOAT.wake.map((d) => (
            <path key={d} d={d} vectorEffect={NS} />
          ))}
        </g>
        <g className="hi-anim hi-bob">
          <path d={BOAT.far.shaft} stroke="var(--ink)" strokeWidth={1.2} vectorEffect={NS} />
          <path d={BOAT.far.blade} stroke="var(--ink)" strokeWidth={3} />
          <polygon points={BOAT.wall} fill={WALL} stroke="var(--ink)" strokeWidth={1} strokeLinejoin="round" vectorEffect={NS} />
          <polygon points={BOAT.top} fill="var(--paper)" stroke="var(--ink)" strokeWidth={1} strokeLinejoin="round" vectorEffect={NS} />
          <polygon points={BOAT.well} fill="var(--bg-3)" stroke="var(--ink-3)" strokeWidth={0.8} vectorEffect={NS} />
          <path d={BOAT.thwarts} stroke="var(--ink)" strokeWidth={2} />
          <path d={BOAT.near.shaft} stroke="var(--ink)" strokeWidth={1.2} vectorEffect={NS} />
          <path d={BOAT.near.blade} stroke="var(--ink)" strokeWidth={3} />
          <rect x={BOAT.lamp[0] - 2.5} y={BOAT.lamp[1] - 2.5} width={5} height={5} fill="var(--mint)" stroke="var(--ink)" strokeWidth={0.8} vectorEffect={NS} />
        </g>

        {/* The rack: plinth, then body, faces painted top, front, side. */}
        <polygon points={BASE.top} fill="var(--night-2)" />
        <polygon points={BASE.front} fill="var(--night)" />
        <polygon points={BASE.side} fill="var(--ink)" />
        <polygon points={BODY.top} fill="var(--night-3)" />
        <polygon points={BODY.front} fill="var(--night-2)" />
        <polygon points={BODY.side} fill="var(--night)" />

        <g transform={TOP}>
          <rect x={4} y={4} width={W - 8} height={D - 8} stroke="var(--night-line)" strokeWidth={0.9} vectorEffect={NS} />
          <path d={range(7, 14, 5).map((v) => `M34 ${v}h36v2h-36z`).join("")} fill="var(--night)" />
          <Gland u={24} v={46} />
          <Gland u={80} v={20} />
          {[
            [8, 8],
            [W - 8, 8],
            [8, D - 8],
            [W - 8, D - 8],
          ].map(([x, y]) => (
            <Screw key={`${x}-${y}`} x={x} y={y} />
          ))}
        </g>

        <g transform={FRONT}>
          {/* Rails, with a mounting hole every third of a unit. */}
          {[3, W - 10].map((x) => (
            <g key={x}>
              <rect x={x} y={4} width={7} height={H - 8} fill="var(--night-3)" />
              <path d={range(30, 7, 6).map((v) => `M${x + 2.4} ${v}h2.2v2.2h-2.2z`).join("")} fill="var(--ink)" />
            </g>
          ))}
          {UNITS.map((u, n) => (
            <Unit key={u.at} {...u} n={n} />
          ))}
        </g>

        <g transform={SIDE}>
          <rect x={4} y={4} width={D - 8} height={H - 8} stroke="var(--night-line)" strokeWidth={0.9} vectorEffect={NS} />
          <path
            d={range(16, 14, 6)
              .map((v) => slots([11, 26, 41], v, 10, 2.2))
              .join("")}
            fill="var(--ink)"
          />
          <Socket x={31} y={116} />
          {/* An asset tag with nothing on it worth reading. */}
          <rect x={11} y={130} width={40} height={18} fill="var(--paper)" />
          <path d={slots([14, 16.4, 19.6, 21, 24.2, 27.4, 29, 32, 34.6, 37, 40.2, 42], 133, 1.2, 9)} fill="var(--ink)" />
          <rect x={44.5} y={133} width={4} height={4} fill="var(--mint)" />
          <Socket x={31} y={170} />
          {[
            [9, 9],
            [D - 9, 9],
            [9, H - 9],
            [D - 9, H - 9],
          ].map(([x, y]) => (
            <Screw key={`${x}-${y}`} x={x} y={y} />
          ))}
        </g>

        {/* Lit edges where the lid meets the faces, and the front corner. */}
        <path
          d={line([iso(RX0, RY1, RZ1), iso(RX1, RY1, RZ1), iso(RX1, RY0, RZ1)]) + line([iso(RX1, RY1, RZ1), iso(RX1, RY1, RZ0)])}
          stroke="var(--night-line)"
          strokeWidth={1.2}
          strokeLinejoin="round"
          vectorEffect={NS}
        />

        {/* Wires: dashed, from each port to its chip, with a plug at the chip end. */}
        {WIRES.map((w) => (
          <g key={w.id} className={w.phone ? undefined : "max-sm:hidden"}>
            <path d={line(w.pts)} stroke="var(--ink-3)" strokeWidth={1.2} strokeDasharray="4 3" vectorEffect={NS} />
            <rect x={w.pts[0][0] - 2.5} y={w.pts[0][1] - 2.5} width={5} height={5} fill="var(--ink)" />
          </g>
        ))}
        {WIRES.map((w) => {
          const [hx, hy] = halfway(w.pts);
          return (
            <rect
              key={w.id}
              x={-4}
              y={-4}
              width={8}
              height={8}
              fill={w.pixel}
              stroke="var(--ink)"
              strokeWidth={1}
              vectorEffect={NS}
              className={["hi-anim hi-px", w.phone ? "" : "max-sm:hidden"].join(" ")}
              style={{
                transform: `translate(${r1(hx)}px, ${r1(hy)}px)`,
                animationName: `hi-px-${w.id}`,
                animationDuration: `${w.dur}s`,
                animationDelay: `${w.delay}s`,
              }}
            />
          );
        })}
      </svg>

      {WIRES.map((w) => {
        const [x, y] = w.pts[w.pts.length - 1];
        return (
          <div
            key={w.id}
            aria-hidden
            className={[
              "absolute flex -translate-y-1/2 items-center gap-2 border border-line-2 bg-paper py-[5px] pr-2.5 pl-2 font-mono text-[11px] leading-none whitespace-nowrap text-ink xl:text-[12px]",
              w.side === "l" ? "-translate-x-full" : "",
              w.phone ? "" : "max-sm:hidden",
            ].join(" ")}
            style={{ left: pct(x, VW), top: pct(y, VH) }}
          >
            <span aria-hidden className="size-[6px] shrink-0 border border-ink" style={{ background: w.pixel }} />
            {w.chip}
          </div>
        );
      })}
    </div>
  );
}
