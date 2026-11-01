"use client";

import { useId } from "react";
import { cn, usePrefersReducedMotion } from "@/components/kit";
import { motion as s } from "./ui";

/*
 * The gate's picture, drawn rather than printed: an island in periwinkle contour lines with a
 * two-unit server on its summit, LEDs on, and one dashed path in from the edge of the water.
 * Pixel squares walk the path. While a credential is read, a mint line sweeps across and the
 * contours behind it turn deep mint.
 */

const W = 640;
const H = 400;
const TOP = 72; // the viewBox starts here: nothing but sky above
const LEVELS = 10;
const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** One contour: a wobbly ellipse that shrinks and rises with each level, leaning a little right. */
function contour(k: number) {
  const sc = 1 - k * 0.068;
  const cx = 300 + k * 4.5;
  const cy = 290 - k * 12;
  const at = (t: number) => {
    const f =
      1 +
      0.07 * Math.sin(2 * t + 0.5 + 0.15 * k) +
      0.045 * Math.sin(3 * t + 2.1 - 0.2 * k) +
      0.025 * Math.sin(5 * t + 0.9 + 0.4 * k);
    return [r1(cx + Math.cos(t) * 236 * sc * f), r1(cy + Math.sin(t) * 90 * sc * f)] as const;
  };
  const pts = Array.from({ length: 120 }, (_, i) => at((i / 120) * Math.PI * 2).join(" "));
  return { d: `M${pts.join("L")}Z`, cx, cy, at };
}
const RINGS = Array.from({ length: LEVELS }, (_, k) => contour(k));
const SUMMIT = RINGS[LEVELS - 1];

// The server: two 1U boxes, 84 × 48 on the ground, isometric, centred on the summit.
const BW = 84;
const BD = 48;
const ORIGIN = [SUMMIT.cx - ((BW - BD) / 2) * C30, SUMMIT.cy - ((BW + BD) / 2) * S30] as const;
const iso = (x: number, y: number, z: number) => [r1(ORIGIN[0] + (x - y) * C30), r1(ORIGIN[1] + (x + y) * S30 - z)] as const;
const poly = (...p: (readonly [number, number])[]) => p.map((q) => q.join(",")).join(" ");
// Face-local frames: u runs along the face, v up. Content drawn in them follows the skew.
const FRONT = `matrix(${r1(C30 * 1000) / 1000} ${S30} 0 -1 ${iso(0, BD, 0).join(" ")})`;
const SIDE = `matrix(${-r1(C30 * 1000) / 1000} ${S30} 0 -1 ${iso(BW, 0, 0).join(" ")})`;

const UNITS = [
  { z0: 0, z1: 18, leds: ["var(--mint)", "var(--lime)", "var(--pink)"], blink: [false, true, false] },
  { z0: 21, z1: 39, leds: ["var(--mint)", "var(--mint)", "var(--lime)"], blink: [true, false, false] },
];

// The one way in: from the edge of the water, up the slope, to the front of the box.
const END = iso(24, BD, 0);
const PATH = `M0 338 L92 338 C150 338 192 304 222 274 S${r1(END[0] - 26)} ${r1(END[1] + 18)} ${END[0]} ${END[1]}`;
const PATH_STOPS = [[92, 338], [222, 274], END] as const;
const WALKERS = ["var(--mint)", "var(--pink)", "var(--peri)"];
const MARKS = [
  { at: RINGS[2].at(2.55), fill: "var(--pink)" },
  { at: RINGS[5].at(0.55), fill: "var(--mint)" },
  { at: RINGS[7].at(3.6), fill: "var(--peri)" },
];

function Screw({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 7 7" width={7} height={7} className={cn("absolute", className)}>
      <circle cx={3.5} cy={3.5} r={3} fill="var(--bg-2)" stroke="var(--ink-3)" strokeWidth={1} />
      <path d="M1.7 5.3 5.3 1.7" stroke="var(--ink-3)" strokeWidth={1} />
    </svg>
  );
}

export function GateIsland({ scanning, className }: { scanning: boolean; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const clip = `scan${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const live = !reduced;

  const unit = (u: (typeof UNITS)[number], ui: number) => {
    const { z0, z1 } = u;
    return (
      <g key={ui}>
        <polygon points={poly(iso(BW, 0, z0), iso(BW, BD, z0), iso(BW, BD, z1), iso(BW, 0, z1))} fill="var(--night-3)" />
        <polygon points={poly(iso(0, BD, z0), iso(BW, BD, z0), iso(BW, BD, z1), iso(0, BD, z1))} fill="var(--ink)" />
        <polygon points={poly(iso(0, 0, z1), iso(BW, 0, z1), iso(BW, BD, z1), iso(0, BD, z1))} fill="var(--night-2)" />
        <g fill="var(--ink)">
          {[8, 14, 20, 26, 32, 38].map((x) => (
            <rect key={x} transform={SIDE} x={x} y={z0 + 5} width={2.5} height={z1 - z0 - 10} />
          ))}
        </g>
        <g transform={FRONT}>
          {u.leds.map((fill, i) => (
            <rect
              key={i}
              x={7 + i * 8}
              y={z0 + 7}
              width={5}
              height={5}
              fill={scanning ? "var(--mint)" : fill}
              className={live && (scanning || u.blink[i]) ? s.led : undefined}
              style={{ animationDelay: scanning ? `${(ui * 3 + i) * 140}ms` : `${(ui + i) * 900}ms` }}
            />
          ))}
          <rect x={36} y={z0 + 7} width={40} height={5} fill="var(--night-3)" />
          <rect x={36} y={z0 + 7} width={10} height={5} fill="var(--mint-pale)" />
        </g>
        <polygon
          points={poly(iso(0, BD, z0), iso(BW, BD, z0), iso(BW, 0, z0), iso(BW, 0, z1), iso(0, 0, z1), iso(0, BD, z1))}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1.25}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={poly(iso(0, BD, z1), iso(BW, BD, z1), iso(BW, 0, z1))}
          fill="none"
          stroke="var(--night-line)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={iso(BW, BD, z0)[0]}
          y1={iso(BW, BD, z0)[1]}
          x2={iso(BW, BD, z1)[0]}
          y2={iso(BW, BD, z1)[1]}
          stroke="var(--night-line)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  };

  return (
    <div className={cn("relative border border-line-2 bg-paper", className)}>
      <Screw className="left-2 top-2" />
      <Screw className="right-2 top-2" />
      <Screw className="bottom-2 left-2" />
      <Screw className="bottom-2 right-2" />

      <div className="flex h-10 items-center justify-between gap-3 border-b border-line px-6 font-mono text-[11px] text-ink-3">
        <span className="truncate">
          U1–U2<span className="hidden sm:inline"> · two units, one way in</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-ink-2" aria-hidden>
          <span className={cn("size-[7px]", scanning ? "bg-mint" : "bg-accent", live && scanning && s.blink)} />
          {scanning ? "reading credential" : "idle · lights on"}
        </span>
      </div>

      <svg
        viewBox={`0 ${TOP} ${W} ${H - TOP}`}
        role="img"
        aria-label="A small server on the summit of an island, drawn in contour lines, with one dashed path leading up to it from the water."
        className="block h-auto w-full"
      >
        <defs>
          <clipPath id={clip}>
            <rect x={-W} y={0} width={W} height={H} className={scanning && live ? s.sweep : undefined} />
          </clipPath>
        </defs>

        {/* Water: two dashed rings and the horizon. */}
        <g fill="none" stroke="var(--peri-soft)" strokeWidth={1.25} vectorEffect="non-scaling-stroke">
          <ellipse cx={304} cy={296} rx={286} ry={104} strokeDasharray="2 7" vectorEffect="non-scaling-stroke" />
          <ellipse cx={306} cy={300} rx={330} ry={122} strokeDasharray="2 9" vectorEffect="non-scaling-stroke" />
          <path d="M24 92H616" strokeDasharray="1 6" vectorEffect="non-scaling-stroke" />
        </g>

        {/* The island, terrace by terrace, bottom up: each fill hides what's behind it. */}
        <g stroke="var(--peri)" strokeWidth={1.25} strokeLinejoin="round" vectorEffect="non-scaling-stroke">
          {RINGS.map((r, k) => (
            <path key={k} d={r.d} fill="var(--paper)" vectorEffect="non-scaling-stroke" />
          ))}
        </g>

        {/* While reading: the same contours in deep mint, revealed behind the sweep. */}
        {scanning ? (
          <g clipPath={live ? `url(#${clip})` : undefined} fill="none" stroke="var(--accent)" strokeWidth={1.5}>
            {RINGS.map((r, k) => (
              <path key={k} d={r.d} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        ) : null}

        {MARKS.map((m, i) => (
          <rect
            key={i}
            x={m.at[0] - 3}
            y={m.at[1] - 3}
            width={6}
            height={6}
            fill={m.fill}
            className={live ? s.led : undefined}
            style={{ animationDelay: `${i * 1300}ms` }}
          />
        ))}

        <path d={PATH} fill="none" stroke="var(--ink)" strokeWidth={1.25} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        <rect x={-1} y={333} width={8} height={10} fill="var(--ink)" />
        {live
          ? WALKERS.map((fill, i) => (
              <rect key={i} x={-3.5} y={-3.5} width={7} height={7} fill={fill} stroke="var(--ink)" strokeWidth={1} vectorEffect="non-scaling-stroke">
                <animateMotion dur={scanning ? "1.6s" : "7.5s"} repeatCount="indefinite" begin={`-${i * 2.5}s`} path={PATH} />
              </rect>
            ))
          : PATH_STOPS.map(([x, y], i) => (
              <rect key={i} x={x - 3.5} y={y - 3.5} width={7} height={7} fill={WALKERS[i]} stroke="var(--ink)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}

        {UNITS.map(unit)}

        {scanning && live ? <rect x={-2} y={0} width={3} height={H} fill="var(--mint)" className={s.sweep} /> : null}
      </svg>

      <ul className="flex flex-wrap gap-x-6 gap-y-1.5 border-t border-line px-6 py-3 font-mono text-[11px] text-ink-2">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-[7px] bg-mint" />
          no email, no KYC
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-[7px] bg-peri" />
          no traffic logging
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-[7px] bg-pink" />
          Blackbox disk key: yours
        </li>
      </ul>
    </div>
  );
}
