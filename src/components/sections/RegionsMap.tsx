"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { cn, usePrefersReducedMotion } from "@/components/kit";
import { locations, type LocationId } from "@/lib/catalog";
import type { You } from "./RegionsGuess";
import { EUROPE, WORLD, decodeMask, type Mask } from "./worldmask";

export type Pin = {
  id: LocationId;
  code: string;
  city: string;
  lon: number;
  lat: number;
  /** Owned hardware: Montreal, the Blackbox location. */
  owned: boolean;
  /** One of the four Western European pins the inset enlarges. */
  europe: boolean;
};

export const PINS: Pin[] = locations.map((l) => {
  const lon = l.x * 360 - 180;
  const lat = 90 - l.y * 180;
  return {
    id: l.id,
    code: l.code,
    city: l.city,
    lon,
    lat,
    owned: !!l.owned,
    europe: lon > -15 && lon < 30 && lat > 35 && lat < 62,
  };
});
const EU = PINS.filter((p) => p.europe);
// The box round the European pins; the inset centres on it.
const CLUSTER = {
  west: Math.min(...EU.map((p) => p.lon)),
  east: Math.max(...EU.map((p) => p.lon)),
  north: Math.max(...EU.map((p) => p.lat)),
  south: Math.min(...EU.map((p) => p.lat)),
};

/** A geographic window, in degrees. */
export type Frame = { west: number; east: number; north: number; south: number };

type Side = "n" | "s" | "e" | "w";
// The sides of its marker each chip tries first; `place` moves it when those are taken.
const SIDE: Record<LocationId, Side[]> = {
  nyc: ["e", "s"],
  yul: ["n", "w"],
  lhr: ["w", "n"],
  cdg: ["s", "w"],
  fra: ["e", "s"],
  nl: ["n", "e"],
  sin: ["w", "s"],
  hkg: ["e", "n"],
};
// Under this world-map width only the chip in focus is drawn; the rows below carry the rest.
const COMPACT_W = 480;
// Under this inset width its markers shrink and chips drop the city, except the one in focus.
const INSET_COMPACT_W = 380;
// How close, in CSS px, a pointer must come to a marker to pick it.
const PICK_PX = 18;
// Space between a marker and its chip.
const GAP = 14;
// The inset never zooms past this many CSS px per degree (less on a phone, so Britain stays whole).
const INSET_MAX_K = 24;
const INSET_MAX_K_COMPACT = 20;
// The inset centres this many degrees west of the pins' own centre, which keeps Britain in frame.
const INSET_WEST_BIAS = 1;

/**
 * Where a dot grid landed, in CSS px: the canvas size, the grid's top-left corner, the dot pitch and
 * how many dots; and the map behind it: the degrees at that corner and px per degree.
 */
type View = {
  w: number;
  h: number;
  left: number;
  top: number;
  pitch: number;
  cols: number;
  rows: number;
  west: number;
  north: number;
  k: number;
};

const frameOf = (v: View): Frame => ({
  west: v.west,
  east: v.west + (v.cols * v.pitch) / v.k,
  north: v.north,
  south: v.north - (v.rows * v.pitch) / v.k,
});

/** The whole WORLD crop, as wide as the frame allows on a whole-pixel pitch, centred. */
function worldView(w: number, h: number, pitch: number): View | null {
  if (w < pitch * 8 || h < pitch * 4) return null;
  const spanLon = WORLD.east - WORLD.west;
  const spanLat = WORLD.north - WORLD.south;
  const cols = Math.floor(w / pitch);
  const k = (cols * pitch) / spanLon;
  const rows = Math.min(Math.floor(h / pitch), Math.floor((spanLat * k) / pitch));
  return {
    w,
    h,
    left: Math.floor((w - cols * pitch) / 2),
    top: Math.floor((h - rows * pitch) / 2),
    pitch,
    cols,
    rows,
    west: WORLD.west,
    north: WORLD.north - (spanLat - (rows * pitch) / k) / 2,
    k,
  };
}

/**
 * Western Europe, centred on the four pins and zoomed until they sit clear of
 * the edges with room for their chips, but never past INSET_MAX_K nor so far
 * out that the window leaves the EUROPE crop.
 */
function insetView(w: number, h: number, pitch: number): View | null {
  if (w < pitch * 8 || h < pitch * 8) return null;
  const compact = w < INSET_COMPACT_W;
  const mx = compact ? 44 : 120;
  const my = compact ? 40 : 56;
  const cx = (CLUSTER.west + CLUSTER.east) / 2 - INSET_WEST_BIAS;
  const cy = (CLUSTER.north + CLUSTER.south) / 2;
  const fit = Math.min(
    (w - 2 * mx) / (CLUSTER.east - CLUSTER.west + 2 * INSET_WEST_BIAS),
    (h - 2 * my) / (CLUSTER.north - CLUSTER.south),
  );
  const floor = Math.max(
    w / (2 * Math.min(cx - EUROPE.west, EUROPE.east - cx)),
    h / (2 * Math.min(EUROPE.north - cy, cy - EUROPE.south)),
  );
  const k = Math.max(floor, Math.min(compact ? INSET_MAX_K_COMPACT : INSET_MAX_K, fit));
  const cols = Math.floor(w / pitch);
  const rows = Math.floor(h / pitch);
  return {
    w,
    h,
    left: Math.floor((w - cols * pitch) / 2),
    top: Math.floor((h - rows * pitch) / 2),
    pitch,
    cols,
    rows,
    west: cx - (cols * pitch) / 2 / k,
    north: cy + (rows * pitch) / 2 / k,
    k,
  };
}

const sameView = (a: View | null, b: View) =>
  !!a && a.w === b.w && a.h === b.h && a.left === b.left && a.top === b.top && a.pitch === b.pitch && a.k === b.k;

/* ------------------------------------------------------------------ */
/* The dot field                                                       */
/* ------------------------------------------------------------------ */

const decoded = new Map<Mask, Uint8Array>();
function landOf(mask: Mask) {
  let out = decoded.get(mask);
  if (!out) {
    out = decodeMask(mask);
    decoded.set(mask, out);
  }
  return out;
}

/** One cell per dot: land when at least 4 of 9 points across the dot fall on land in the mask. */
function sample(v: View, mask: Mask) {
  const fine = landOf(mask);
  const cell = (mask.east - mask.west) / mask.cols;
  const deg = v.pitch / v.k;
  const out = new Uint8Array(v.cols * v.rows);
  for (let r = 0; r < v.rows; r++) {
    for (let c = 0; c < v.cols; c++) {
      let n = 0;
      for (let sy = 0; sy < 3; sy++) {
        const mr = Math.floor((mask.north - (v.north - (r + (sy + 0.5) / 3) * deg)) / cell);
        if (mr < 0 || mr >= mask.rows) continue;
        for (let sx = 0; sx < 3; sx++) {
          const mc = Math.floor((v.west + (c + (sx + 0.5) / 3) * deg - mask.west) / cell);
          if (mc >= 0 && mc < mask.cols) n += fine[mr * mask.cols + mc];
        }
      }
      out[r * v.cols + c] = n >= 4 ? 1 : 0;
    }
  }
  return out;
}

/** Palette for the canvas, read from the CSS tokens so the map follows the theme. */
function readPalette(el: Element) {
  const s = getComputedStyle(el);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    sea: v("--night-2", "#47455b"),
    grid: v("--night-3", "#524f68"),
    land: v("--night-line", "#615e78"),
    coast: v("--peri", "#7b8cff"),
  };
}

/**
 * Paints the land as square dots on a whole-pixel pitch, so every gap is the
 * same width, with a dashed graticule every `every` degrees under them.
 */
function paint(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, v: View, mask: Mask, every: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(v.w * dpr);
  canvas.height = Math.round(v.h * dpr);
  const pal = readPalette(canvas);
  const land = sample(v, mask);
  const { cols, rows } = v;
  const p = v.pitch * dpr;
  const ox = v.left * dpr;
  const oy = v.top * dpr;
  const isLand = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && land[r * cols + c] === 1;
  const square = (c: number, r: number, d: number) =>
    ctx.fillRect(Math.round(ox + c * p + (p - d) / 2), Math.round(oy + r * p + (p - d) / 2), d, d);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const f = frameOf(v);
  ctx.fillStyle = pal.grid;
  const t = Math.max(1, Math.round(dpr));
  for (let lon = Math.ceil(f.west / every) * every; lon < f.east; lon += every) {
    const x = Math.round(ox + (lon - f.west) * v.k * dpr);
    for (let y = oy; y < oy + rows * p; y += 6 * t) ctx.fillRect(x, Math.round(y), t, 2 * t);
  }
  for (let lat = Math.ceil(f.south / every) * every; lat < f.north; lat += every) {
    const y = Math.round(oy + (f.north - lat) * v.k * dpr);
    for (let x = ox; x < ox + cols * p; x += 6 * t) ctx.fillRect(Math.round(x), y, 2 * t, t);
  }

  // Sea: a faint lattice, so the frame reads as a screen rather than an empty box.
  const sea = Math.max(1, Math.round(p * 0.16));
  ctx.fillStyle = pal.sea;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!land[r * cols + c]) square(c, r, sea);

  // Land: the coastline in periwinkle at full size, the interior smaller and a step quieter.
  const dot = Math.max(2, Math.round(p * 0.65));
  const inner = Math.max(1, Math.round(p * 0.45));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!land[r * cols + c]) continue;
      const coast = !isLand(c - 1, r) || !isLand(c + 1, r) || !isLand(c, r - 1) || !isLand(c, r + 1);
      ctx.fillStyle = coast ? pal.coast : pal.land;
      square(c, r, coast ? dot : inner);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

type Box = { l: number; t: number; r: number; b: number };
// Centred on the marker's axis, or slid so it hangs toward the end or the start of it.
type Align = "c" | "end" | "start";
type Placed = { side: Side; gap: number; box: Box };
// Where "you" is drawn; `up` when the line to the nearest location leaves upward, so the label goes under.
type Me = { x: number; y: number; tx: number; ty: number; arrow: string; onTarget: boolean; up: boolean };

const SIDES: Side[] = ["n", "e", "s", "w"];
const around = (x: number, y: number, r: number): Box => ({ l: x - r, t: y - r, r: x + r, b: y + r });
const ARROWS: Record<string, string> = {
  "1,0": "→",
  "-1,0": "←",
  "0,-1": "↑",
  "0,1": "↓",
  "1,-1": "↗",
  "1,1": "↘",
  "-1,1": "↙",
  "-1,-1": "↖",
};
// The Blackbox tag inside Montreal's chip: 8 tracked capitals at 11px plus its padding and gap.
const TAG_W = 78;

/** A chip's size in CSS px. The face is monospaced, so it follows the character count (7.2px a character at 12px, 6.6px at 11px, 23px of padding). */
const chipSize = (chars: number, compact: boolean, tag: boolean) => ({
  w: chars * (compact ? 6.6 : 7.2) + 23 + (tag ? TAG_W : 0),
  h: compact ? 23 : 24,
});

/**
 * The box a label of size w × h takes on one side of a point, `gap` px out. Slid
 * boxes still overlap the point's axis by 10px, so a straight leader reaches them.
 */
function boxOn(side: Side, align: Align, x: number, y: number, w: number, h: number, gap: number): Box {
  if (side === "n" || side === "s") {
    const l = align === "c" ? x - w / 2 : align === "end" ? x - 10 : x - w + 10;
    const t = side === "n" ? y - gap - h : y + gap;
    return { l, t, r: l + w, b: t + h };
  }
  const t = align === "c" ? y - h / 2 : align === "end" ? y - 8 : y - h + 8;
  const l = side === "e" ? x + gap : x - gap - w;
  return { l, t, r: l + w, b: t + h };
}

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

/**
 * The first spot, in order of preference, that stays in the frame and clear of
 * everything placed: each side centred then slid either way, close in, then
 * further out. When nothing is clear, the spot that covers least.
 */
function place(prefs: Side[], x: number, y: number, w: number, h: number, gap: number, v: View, taken: Box[]): Placed {
  const sides = [...prefs, ...SIDES.filter((s) => !prefs.includes(s))];
  const fits = (b: Box) => b.l >= 4 && b.t >= 4 && b.r <= v.w - 4 && b.b <= v.h - 4;
  let best: Placed | null = null;
  let least = Infinity;
  for (const g of [gap, gap + 12, gap + 24]) {
    for (const side of sides) {
      for (const align of ["c", "end", "start"] as const) {
        const box = boxOn(side, align, x, y, w, h, g);
        if (!fits(box)) continue;
        const cover = taken.reduce((sum, t) => sum + overlap(t, box), 0);
        if (cover === 0) return { side, gap: g, box };
        if (cover < least) {
          least = cover;
          best = { side, gap: g, box };
        }
      }
    }
  }
  if (best) return best;
  // Pressed into a corner, nothing fits whole: take the first choice and push it back inside.
  const b = boxOn(prefs[0], "c", x, y, w, h, gap);
  const dx = Math.max(4 - b.l, Math.min(0, v.w - 4 - b.r));
  const dy = Math.max(4 - b.t, Math.min(0, v.h - 4 - b.b));
  return { side: prefs[0], gap, box: { l: b.l + dx, t: b.t + dy, r: b.r + dx, b: b.b + dy } };
}

/** Absolute position for a placed box: pinned by its right edge on the west side and at the frame's right edge, so an underestimated width never spills. */
function pin(p: Placed, v: View): CSSProperties {
  const left = Math.max(4, p.box.l);
  if (p.side === "w" || p.box.r >= v.w - 4) return { right: v.w - Math.min(p.box.r, v.w - 4), top: p.box.t };
  return { left, top: p.box.t };
}

/* ------------------------------------------------------------------ */
/* Map                                                                 */
/* ------------------------------------------------------------------ */

/**
 * A dot-matrix map on slate. Land comes from a real Natural Earth mask:
 * periwinkle at the coast, quieter inland. Each location is a mint pixel with
 * a ring that breathes out; the nearest is lime, joined by a dashed line to a
 * rough "you" guessed from the time zone, and Montreal, the Blackbox location
 * on owned hardware, wears a pink frame (on a phone, a pink pixel).
 *
 * `world` draws North America to Japan. The four Western European locations
 * sit too close together at that scale, so there they are small dots inside a
 * bracket, and `inset` draws them enlarged; the inset reports the window it
 * shows so the world map can bracket exactly that.
 *
 * The rows below are the control for keyboards and screen readers, so the map
 * adds no tab stops. A pointer picks the nearest marker within PICK_PX.
 */
export function RegionsMap({
  kind,
  active,
  nearest,
  you,
  frame,
  onFrame,
  onHover,
  onPin,
  className,
}: {
  kind: "world" | "inset";
  active: LocationId;
  nearest: LocationId | null;
  you: You | null;
  /** World only: the window the inset shows, bracketed. */
  frame?: Frame | null;
  /** Inset only: told the window it settled on, after every resize. */
  onFrame?: (f: Frame) => void;
  onHover: (id: LocationId | null) => void;
  onPin: (id: LocationId) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [near, setNear] = useState<LocationId | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // The observer fires once on attach, which is the first paint.
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const pitch = window.innerWidth >= 1024 ? 4 : 3;
      const v = kind === "world" ? worldView(width, height, pitch) : insetView(width, height, pitch);
      if (!v) return;
      paint(canvas, ctx, v, kind === "world" ? WORLD : EUROPE, kind === "world" ? 15 : 5);
      setView((prev) => (sameView(prev, v) ? prev : v));
      onFrame?.(frameOf(v));
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [kind, onFrame]);

  const at = (lat: number, lon: number): [number, number] =>
    view ? [Math.round(view.left + (lon - view.west) * view.k), Math.round(view.top + (view.north - lat) * view.k)] : [0, 0];

  // The world map draws everything but Europe in full; the inset draws only Europe.
  const full = PINS.filter((p) => (kind === "world") !== p.europe);
  const dots = kind === "world" ? EU : [];

  /** The marker nearest the pointer, if one is within PICK_PX. */
  const pick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!view) return null;
    const r = e.currentTarget.getBoundingClientRect();
    let best: LocationId | null = null;
    let reach = PICK_PX;
    for (const p of full) {
      const [x, y] = at(p.lat, p.lon);
      const d = Math.hypot(x - (e.clientX - r.left), y - (e.clientY - r.top));
      if (d < reach) {
        reach = d;
        best = p.id;
      }
    }
    return best;
  };

  const compact = view ? view.w < (kind === "world" ? COMPACT_W : INSET_COMPACT_W) : false;
  const activePin = PINS.find((p) => p.id === active);
  const target = PINS.find((p) => p.id === nearest);

  // "You" sits inside the grid even when the guess falls off it; an arrow says which way.
  // Within a few pixels of the location it is the location, so the label hangs off that marker.
  // The inset only shows you when the nearest location is one of its own.
  let me: Me | null = null;
  if (view && you && target && (kind === "world" || target.europe)) {
    const [tx, ty] = at(target.lat, target.lon);
    const [x, y] = at(you.lat, you.lon);
    const x0 = view.left;
    const x1 = view.left + view.cols * view.pitch;
    const y0 = view.top;
    const y1 = view.top + view.rows * view.pitch;
    const cx = Math.max(x0 + 10, Math.min(x1 - 10, x));
    const cy = Math.max(y0 + 10, Math.min(y1 - 10, y));
    const arrow = ARROWS[`${x > x1 ? 1 : x < x0 ? -1 : 0},${y < y0 ? -1 : y > y1 ? 1 : 0}`] ?? "";
    const onTarget = Math.hypot(cx - tx, cy - ty) < 22;
    me = { x: onTarget ? tx : cx, y: onTarget ? ty : cy, tx, ty, arrow, onTarget, up: ty < cy };
  }

  // The bracket round what the inset enlarges, and the tab that names it.
  let bracket: Box | null = null;
  let tab: Box | null = null;
  const tabText = compact ? "Inset" : "Inset · Western Europe";
  if (view && kind === "world" && frame) {
    const [l, t] = at(frame.north, frame.west);
    const [r, b] = at(frame.south, frame.east);
    bracket = { l: Math.max(view.left, l), t: Math.max(view.top, t), r: Math.min(view.left + view.cols * view.pitch, r), b };
    const w = tabText.length * (compact ? 6.6 : 7.2) + 14;
    const top = bracket.t - 20 >= 4 ? bracket.t - 20 : bracket.b;
    tab = { l: bracket.l, t: top, r: bracket.l + w, b: top + 20 };
  }
  const euActive = !!activePin?.europe;
  const euNearest = !!target?.europe;

  // Chips: every full marker, or on a narrow map only the one in focus. Nearest and active choose first.
  const chips = new Map<LocationId, Placed>();
  let youBox: Box | null = null;
  if (view) {
    const taken: Box[] = full.map((p) => around(...at(p.lat, p.lon), compact ? 6 : 9));
    if (tab) taken.push(tab);
    if (bracket) taken.push(bracket);
    if (kind === "inset") taken.push({ l: 0, t: 0, r: compact ? 150 : 200, b: 30 });
    if (me && !me.onTarget) taken.push(around(me.x, me.y, 12));
    const shown = compact && kind === "world" ? full.filter((p) => p.id === active) : full;
    const order = [...shown].sort(
      (a, b) =>
        Number(b.id === nearest) * 2 + Number(b.id === active) - (Number(a.id === nearest) * 2 + Number(a.id === active)),
    );
    for (const p of order) {
      const long = !compact || p.id === active || p.id === nearest || kind === "world";
      const { w, h } = chipSize(p.code.length + (long ? p.city.length : 0), compact, p.owned && !compact);
      const spot = place(SIDE[p.id], ...at(p.lat, p.lon), w, h, GAP, view, taken);
      chips.set(p.id, spot);
      taken.push(spot.box);
    }
    if (me) {
      const w = (me.arrow ? 5 : 3) * 7.2 + 10 + (me.arrow ? 9 : 0);
      youBox = place(me.up ? ["s", "n"] : ["n", "s"], me.x, me.y, w, 18, me.onTarget ? 16 : 14, view, taken).box;
    }
  }

  return (
    <div
      className={cn("relative w-full overflow-hidden", near && "cursor-pointer", className)}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const id = pick(e);
        if (id === near) return;
        setNear(id);
        onHover(id);
      }}
      onPointerLeave={() => {
        if (near === null) return;
        setNear(null);
        onHover(null);
      }}
      onClick={(e) => {
        const id = pick(e);
        if (id) onPin(id);
      }}
    >
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block size-full" />

      {view ? (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full"
          viewBox={`0 0 ${view.w} ${view.h}`}
          fill="none"
        >
          {activePin && activePin.europe === (kind === "inset") ? (
            <Crosshair view={view} at={at(activePin.lat, activePin.lon)} />
          ) : null}

          {bracket ? (
            <rect
              x={bracket.l + 0.5}
              y={bracket.t + 0.5}
              width={bracket.r - bracket.l - 1}
              height={bracket.b - bracket.t - 1}
              stroke={euNearest ? "var(--lime)" : euActive ? "var(--mint)" : "var(--peri-soft)"}
              strokeOpacity={euNearest || euActive ? 1 : 0.7}
              strokeDasharray="3 3"
              shapeRendering="crispEdges"
            />
          ) : null}

          {me && !me.onTarget ? <Connector from={me} to={[me.tx, me.ty]} reduced={reduced} /> : null}

          {/* Leaders from each marker out to its chip. */}
          {full.map((p) => {
            const spot = chips.get(p.id);
            if (!spot) return null;
            const [x, y] = at(p.lat, p.lon);
            const [dx, dy] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[spot.side];
            return (
              <path
                key={p.id}
                d={`M${x + dx * 7 + 0.5} ${y + dy * 7 + 0.5}L${x + dx * spot.gap + 0.5} ${y + dy * spot.gap + 0.5}`}
                stroke="currentColor"
                className={p.id === nearest ? "text-lime" : p.id === active ? "text-mint" : "text-white/45"}
              />
            );
          })}

          {/* Europe at world scale: a pixel each, inside the bracket. */}
          {dots.map((p) => {
            const [x, y] = at(p.lat, p.lon);
            const s = compact ? 2 : 3;
            const fill = p.id === nearest ? "var(--lime)" : p.id === active ? "white" : "var(--mint)";
            return (
              <rect key={p.id} x={x - s / 2} y={y - s / 2} width={s} height={s} fill={fill} shapeRendering="crispEdges" />
            );
          })}

          {full.map((p, k) => {
            const [x, y] = at(p.lat, p.lon);
            const lime = p.id === nearest;
            const on = p.id === active;
            // New York and Montreal sit 15px apart on a desktop world map, so world markers run a size down;
            // on a phone they are 6px apart, too close for Montreal's frame, so its pixel turns pink instead.
            const big = kind === "inset" && !compact;
            const fill = lime ? "var(--lime)" : p.owned && compact && !on ? "var(--pink)" : "var(--mint)";
            const core = compact ? (on || lime ? 6 : 4) : big ? (on || lime ? 12 : 10) : on || lime ? 10 : 8;
            const pad = compact ? 1 : big ? 3 : 2;
            const out = core / 2 + pad;
            return (
              <g key={p.id} transform={`translate(${x} ${y})`} shapeRendering="crispEdges">
                <Ring color={fill} size={core} begin={-k * 0.55} strong={on || lime} reduced={reduced} />
                {/* A slate knockout, so the pixel never merges with the land dots under it. */}
                <rect x={-out} y={-out} width={out * 2} height={out * 2} fill="var(--night)" />
                {p.owned && !compact ? (
                  <rect
                    x={-out - 2.5}
                    y={-out - 2.5}
                    width={out * 2 + 5}
                    height={out * 2 + 5}
                    stroke="var(--pink)"
                    fill="none"
                  />
                ) : null}
                {on ? (
                  <rect x={-out - 0.5} y={-out - 0.5} width={out * 2 + 1} height={out * 2 + 1} stroke="white" />
                ) : null}
                <rect x={-core / 2} y={-core / 2} width={core} height={core} fill={fill} />
              </g>
            );
          })}

          {me && !me.onTarget ? <YouMark x={me.x} y={me.y} /> : null}
        </svg>
      ) : null}

      {view && tab && (!compact || euActive || euNearest) ? (
        <span
          aria-hidden
          style={{ left: tab.l, top: tab.t }}
          className={cn(
            "pointer-events-none absolute z-10 inline-flex h-5 items-center px-[6px] font-mono leading-none whitespace-nowrap uppercase",
            compact ? "text-[11px] tracking-[0.06em]" : "text-[11px] tracking-[0.1em]",
            euNearest ? "bg-lime text-ink" : euActive ? "bg-mint text-ink" : "bg-night-2 text-peri-soft",
          )}
        >
          {tabText}
        </span>
      ) : null}

      {kind === "inset" ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-2 left-2 z-10 inline-flex h-5 items-center bg-night px-[6px] font-mono text-[11px] leading-none tracking-[0.1em] whitespace-nowrap text-peri-soft uppercase"
        >
          {compact ? "Western Europe" : "Inset · Western Europe"}
        </span>
      ) : null}

      {view
        ? full.map((p) => {
            const on = p.id === active;
            const lime = p.id === nearest;
            const spot = chips.get(p.id);
            if (!spot) return null;
            const long = !compact || on || lime || kind === "world";
            return (
              <span
                key={p.id}
                aria-hidden
                style={pin(spot, view)}
                className={cn(
                  "pointer-events-none absolute inline-flex items-center gap-1.5 border px-[6px] py-[5px] font-mono leading-none whitespace-nowrap transition-colors duration-200",
                  compact ? "text-[11px]" : "text-[12px]",
                  lime
                    ? "z-20 border-lime bg-lime text-ink"
                    : on
                      ? "z-20 border-mint bg-mint text-ink"
                      : "z-10 border-night-line bg-night-2 text-white",
                )}
              >
                <span className={cn("font-medium tracking-[0.08em] uppercase", !lime && !on && "text-mint-pale")}>
                  {p.code}
                </span>
                {long ? <span className={lime || on ? "text-ink" : "text-white/80"}>{p.city}</span> : null}
                {p.owned && !compact ? (
                  <span className="-my-[3px] bg-pink px-[5px] py-[3px] text-[11px] tracking-[0.08em] text-ink uppercase">
                    Blackbox
                  </span>
                ) : null}
              </span>
            );
          })
        : null}

      {view && me && youBox ? (
        <span
          aria-hidden
          style={{ left: Math.max(4, youBox.l), top: youBox.t }}
          className="pointer-events-none absolute z-30 bg-night px-[5px] py-[3px] font-mono text-[12px] leading-none font-medium whitespace-nowrap text-lime"
        >
          {me.arrow ? `you ${me.arrow}` : "you"}
        </span>
      ) : null}
    </div>
  );
}

/** Hairlines through the location in focus, across the whole grid. */
function Crosshair({ view, at: [x, y] }: { view: View; at: [number, number] }) {
  const right = view.left + view.cols * view.pitch;
  const bottom = view.top + view.rows * view.pitch;
  return (
    <g stroke="var(--peri-soft)" strokeOpacity={0.5} strokeDasharray="2 3">
      <path d={`M${view.left} ${y + 0.5}H${right}`} />
      <path d={`M${x + 0.5} ${view.top}V${bottom}`} />
    </g>
  );
}

/** A square ring that breathes out from a marker and fades; still, the location in focus keeps one at rest. */
function Ring({
  color,
  size,
  begin,
  strong,
  reduced,
}: {
  color: string;
  size: number;
  begin: number;
  strong: boolean;
  reduced: boolean;
}) {
  if (reduced) {
    const r = size * 1.25;
    return strong ? <rect x={-r} y={-r} width={r * 2} height={r * 2} stroke={color} strokeOpacity={0.45} /> : null;
  }
  const dur = strong ? "2.4s" : "3.2s";
  return (
    <rect
      x={-size / 2}
      y={-size / 2}
      width={size}
      height={size}
      stroke={color}
      vectorEffect="non-scaling-stroke"
      opacity={0}
    >
      <animateTransform
        attributeName="transform"
        type="scale"
        values={strong ? "1.1;3.6" : "1;3"}
        dur={dur}
        begin={`${begin}s`}
        repeatCount="indefinite"
        calcMode="spline"
        keyTimes="0;1"
        keySplines="0.2 0.6 0.3 1"
      />
      <animate
        attributeName="opacity"
        values={strong ? "0.9;0" : "0.6;0"}
        dur={dur}
        begin={`${begin}s`}
        repeatCount="indefinite"
        calcMode="spline"
        keyTimes="0;1"
        keySplines="0.3 0 0.6 1"
      />
    </rect>
  );
}

/** Dashed lime line from you to the nearest location, a pixel riding it. */
function Connector({
  from,
  to: [tx, ty],
  reduced,
}: {
  from: { x: number; y: number };
  to: [number, number];
  reduced: boolean;
}) {
  const d = `M${from.x} ${from.y}L${tx} ${ty}`;
  const len = Math.hypot(tx - from.x, ty - from.y);
  const dur = `${Math.max(1.6, Math.min(4, len / 70)).toFixed(2)}s`;
  return (
    <g>
      <path d={d} stroke="var(--lime)" strokeWidth={1.5} strokeDasharray="5 4" />
      {reduced ? null : (
        <rect x={-2.5} y={-2.5} width={5} height={5} fill="var(--lime)" opacity={0}>
          <animateMotion path={d} dur={dur} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.82;1" dur={dur} repeatCount="indefinite" />
        </rect>
      )}
    </g>
  );
}

/** Where we think you are: a lime target with crosshair ticks. */
function YouMark({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke="var(--lime)" shapeRendering="crispEdges">
      <rect x={-5.5} y={-5.5} width={11} height={11} fill="var(--night)" />
      <rect x={-1.5} y={-1.5} width={3} height={3} fill="var(--lime)" stroke="none" />
      <path d="M0.5 -10V-6M0.5 7V11M-10 0.5H-6M7 0.5H11" />
    </g>
  );
}
