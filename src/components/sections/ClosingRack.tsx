import type { CSSProperties } from "react";
import { blackbox, locations } from "@/lib/catalog";

/*
 * One rack, drawn in isometric line art: periwinkle edges on slate faces, LEDs
 * as screen-square pixels, and one server slid out on its rails in mint. That
 * one is yours. Depth runs along x, width along y, height along z; the front of
 * the rack is the face at x = DX.
 */

// The smallest Blackbox, in the one place Blackbox runs.
const PLAN = blackbox[0];
const SITE = locations.find((l) => l.id === "yul") ?? locations[0];
/** "2 vCPU · 4 GB · SEV-SNP", from the catalogue's own fields. */
const SPEC = [`${PLAN.cores} vCPU`, PLAN.ram.replace(/\s*DDR\d$/, ""), PLAN.cpu.split(" · ").at(-1)].join(" · ");

const C = Math.sqrt(3) / 2;
const S = 0.5;

const DX = 120; // depth
const WY = 160; // width across the front
const H = 312; // height
const RAIL = 12; // front posts
const BASE = 22; // kick plate to the first unit
const PITCH = 30; // one U
const UNIT = 26; // a 1U faceplate; the rest of the pitch is the gap
const PULL = 84; // how far your server sits out on its rails
const PULLED_SLOT = 5;

const r = (n: number) => Math.round(n * 1000) / 1000;

type P3 = readonly [number, number, number];
const sx = ([x, y]: P3) => (x - y) * C;
const sy = ([x, y, z]: P3) => (x + y) * S - z;
const pts = (...ps: P3[]) => ps.map((p) => `${r(sx(p))},${r(sy(p))}`).join(" ");

/** Maps a front face's flat drawing (u across from the left post, v down from the top) onto the plane x = at. */
const onFront = (at: number) => `matrix(${r(C)} ${-S} 0 1 ${r((at - WY) * C)} ${r((at + WY) * S - H)})`;
/** The left-facing side, y = WY: u runs back to front, v down from the top. */
const ON_SIDE = `matrix(${r(C)} ${S} 0 1 ${r(-WY * C)} ${r(WY * S - H)})`;
/** The roof, z = H, in plain x/y. */
const ON_TOP = `matrix(${r(C)} ${S} ${r(-C)} ${S} 0 ${-H})`;
/** Where a point on a front face, given in that face's u/v, lands on screen. */
const frontPt = (at: number, u: number, v: number): [number, number] => {
  const p: P3 = [at, WY - u, H - v];
  return [sx(p), sy(p)];
};

const zBot = (slot: number) => BASE + slot * PITCH;
const zTop = (slot: number, span = 1) => zBot(slot) + UNIT + (span - 1) * PITCH;

type Led = { from: number; fill: string; blink?: [number, number] };
type Unit = { slot: number; span: 1 | 2; kind: "server" | "storage" | "ports" | "empty"; leds?: Led[] };

// Bottom to top. Slot 5 is missing on purpose: it's out on the rails.
const UNITS: Unit[] = [
  {
    slot: 0,
    span: 1,
    kind: "server",
    leds: [
      { from: 12, fill: "var(--mint)" },
      { from: 22, fill: "var(--pink)", blink: [4.4, -0.6] },
    ],
  },
  {
    slot: 1,
    span: 1,
    kind: "server",
    leds: [
      { from: 12, fill: "var(--mint)", blink: [5.2, -3.1] },
      { from: 22, fill: "var(--lime)" },
    ],
  },
  { slot: 2, span: 1, kind: "empty" },
  {
    slot: 3,
    span: 2,
    kind: "storage",
    leds: [
      { from: 12, fill: "var(--mint)" },
      { from: 22, fill: "var(--lime)", blink: [3.6, -1.4] },
    ],
  },
  {
    slot: 6,
    span: 1,
    kind: "server",
    leds: [
      { from: 12, fill: "var(--mint)" },
      { from: 22, fill: "var(--pink)", blink: [6, -2.2] },
    ],
  },
  {
    slot: 7,
    span: 1,
    kind: "server",
    leds: [
      { from: 12, fill: "var(--mint)", blink: [4.8, -4] },
      { from: 22, fill: "var(--lime)" },
    ],
  },
  { slot: 8, span: 1, kind: "ports", leds: [{ from: 12, fill: "var(--peri)" }] },
];

const FACE_W = WY - 2 * RAIL;
const LINE = { stroke: "var(--peri)", strokeWidth: 1.25 } as const;
const HAIR = { stroke: "var(--peri)", strokeWidth: 1, strokeOpacity: 0.55 } as const;

/** Vent slots and the two ear screws every faceplate shares, in face coordinates. */
function Faceplate({ top, h, tone = "slate" }: { top: number; h: number; tone?: "slate" | "mint" }) {
  const detail = tone === "mint" ? { stroke: "var(--night)", strokeWidth: 1, strokeOpacity: 0.45 } : HAIR;
  return (
    <>
      {Array.from({ length: 11 }, (_, k) => (
        <line key={k} x1={RAIL + 20 + k * 5} x2={RAIL + 20 + k * 5} y1={top + 7} y2={top + h - 7} {...detail} />
      ))}
      {[RAIL + 7, WY - RAIL - 7].map((u) => (
        <g key={u} {...detail}>
          <circle cx={u} cy={top + h / 2} r={2.6} fill="none" />
          <path d={`M${u - 1.8} ${top + h / 2 + 1.8} L${u + 1.8} ${top + h / 2 - 1.8}`} />
        </g>
      ))}
    </>
  );
}

/** A screen-square pixel on a faceplate, optionally blinking on its own slow clock. */
function Pixel({ at, u, v, fill, blink }: { at: number; u: number; v: number; fill: string; blink?: [number, number] }) {
  const [x, y] = frontPt(at, u, v);
  return (
    <rect
      x={r(x - 2.5)}
      y={r(y - 2.5)}
      width={5}
      height={5}
      fill={fill}
      className={blink ? "cr-led" : undefined}
      style={blink ? ({ "--d": `${blink[0]}s`, "--o": `${blink[1]}s` } as CSSProperties) : undefined}
    />
  );
}

function RackUnit({ unit }: { unit: Unit }) {
  const top = H - zTop(unit.slot, unit.span);
  const h = zTop(unit.slot, unit.span) - zBot(unit.slot);
  return (
    <>
      <g transform={onFront(DX)}>
        {unit.kind === "empty" ? (
          <rect x={RAIL} y={top} width={FACE_W} height={h} fill="url(#cr-hatch)" {...HAIR} strokeDasharray="3 3" />
        ) : (
          <rect x={RAIL} y={top} width={FACE_W} height={h} fill="var(--night-2)" {...LINE} />
        )}
        {unit.kind === "server" ? <Faceplate top={top} h={h} /> : null}
        {unit.kind === "storage"
          ? [0, 1].map((row) =>
              Array.from({ length: 6 }, (_, col) => (
                <g key={`${row}-${col}`}>
                  <rect
                    x={RAIL + 14 + col * 16}
                    y={top + 5 + row * 24}
                    width={13}
                    height={20}
                    fill="var(--night)"
                    {...HAIR}
                  />
                  <line
                    x1={RAIL + 17 + col * 16}
                    x2={RAIL + 24 + col * 16}
                    y1={top + 21 + row * 24}
                    y2={top + 21 + row * 24}
                    {...HAIR}
                  />
                </g>
              )),
            )
          : null}
        {unit.kind === "ports"
          ? Array.from({ length: 12 }, (_, k) => (
              <rect key={k} x={RAIL + 14 + k * 9} y={top + 10} width={6} height={6} fill="var(--night)" {...HAIR} />
            ))
          : null}
      </g>
      {unit.leds?.map((led) => (
        <Pixel key={led.from} at={DX} u={WY - RAIL - led.from} v={top + h / 2} fill={led.fill} blink={led.blink} />
      ))}
    </>
  );
}

/** A front post with its square mounting holes. */
function Rail({ u }: { u: number }) {
  return (
    <g transform={onFront(DX)}>
      <rect x={u} y={0} width={RAIL} height={H} fill="var(--night-3)" {...LINE} />
      {Array.from({ length: 30 }, (_, k) => (
        <rect key={k} x={u + RAIL / 2 - 2} y={8 + k * 10} width={4} height={3} fill="var(--night)" />
      ))}
    </g>
  );
}

/** Your server, out on its rails: mint, three tones of it, with its own LEDs. */
function Pulled() {
  const z0 = zBot(PULLED_SLOT);
  const z1 = zTop(PULLED_SLOT);
  const at = DX + PULL;
  const back = PULL + 8;
  const top = H - z1;
  return (
    <g className="cr-pull">
      <polygon
        points={pts([back, RAIL, z1], [at, RAIL, z1], [at, WY - RAIL, z1], [back, WY - RAIL, z1])}
        fill="var(--mint-pale)"
        stroke="var(--night)"
        strokeWidth={1}
      />
      <polygon
        points={pts([back, WY - RAIL, z1], [at, WY - RAIL, z1], [at, WY - RAIL, z0], [back, WY - RAIL, z0])}
        fill="var(--mint-hi)"
        stroke="var(--night)"
        strokeWidth={1}
      />
      <g transform={onFront(at)}>
        <rect x={RAIL} y={top} width={FACE_W} height={UNIT} fill="var(--mint)" stroke="var(--night)" strokeWidth={1} />
        <Faceplate top={top} h={UNIT} tone="mint" />
      </g>
      <Pixel at={at} u={WY - RAIL - 12} v={top + UNIT / 2} fill="var(--night)" />
      <Pixel at={at} u={WY - RAIL - 22} v={top + UNIT / 2} fill="var(--night)" blink={[2.4, 0]} />
    </g>
  );
}

// The floor plate the rack stands on, and the ground the server slides out over.
const F0 = -20;
const FX = DX + PULL + 40;
const FY = WY + 20;
const STEP = 24;

function Floor() {
  const xs = Array.from({ length: Math.floor((FX - F0) / STEP) + 1 }, (_, k) => F0 + k * STEP);
  const ys = Array.from({ length: Math.floor((FY - F0) / STEP) + 1 }, (_, k) => F0 + k * STEP);
  return (
    <g>
      {xs.map((x) => (
        <line
          key={`x${x}`}
          x1={r(sx([x, F0, 0]))}
          y1={r(sy([x, F0, 0]))}
          x2={r(sx([x, FY, 0]))}
          y2={r(sy([x, FY, 0]))}
          stroke="var(--night-line)"
        />
      ))}
      {ys.map((y) => (
        <line
          key={`y${y}`}
          x1={r(sx([F0, y, 0]))}
          y1={r(sy([F0, y, 0]))}
          x2={r(sx([FX, y, 0]))}
          y2={r(sy([FX, y, 0]))}
          stroke="var(--night-line)"
        />
      ))}
      <polygon points={pts([F0, F0, 0], [FX, F0, 0], [FX, FY, 0], [F0, FY, 0])} fill="none" {...HAIR} />
    </g>
  );
}

const CSS = `
.cr-art *{vector-effect:non-scaling-stroke}
.cr-led{animation:cr-blink var(--d,4s) linear var(--o,0s) infinite}
@keyframes cr-blink{0%,62%{opacity:1}63%,100%{opacity:.16}}
.cr-pull{transition:transform 1.1s cubic-bezier(.2,.7,.2,1) .35s}
[data-shown="false"] .cr-pull{transform:translate(${r(-PULL * C)}px,${-PULL * S}px)}
.cr-callout{transition:opacity .5s ease 1.25s}
[data-shown="false"] .cr-callout{opacity:0}
.cr-travel{opacity:0;animation:cr-travel var(--d,4s) linear var(--o,2s) infinite}
@keyframes cr-travel{0%{transform:none;opacity:0}6%{opacity:1}72%{transform:translate(var(--tx),var(--ty));opacity:1}80%,100%{transform:translate(var(--tx),var(--ty));opacity:0}}
@media (prefers-reduced-motion:reduce){
.cr-led,.cr-travel{animation:none}
.cr-pull,.cr-callout{transition:none;transform:none!important;opacity:1!important}
}`;

// Without script the reveal never fires, so the server prints already out.
const NOSCRIPT = ".cr-pull{transform:none!important}.cr-callout{opacity:1!important}";

/** A dashed leader from a point on the rack to a mono label card, with a pixel riding it. */
function Callout({
  from,
  to,
  lines,
  pixel,
  width,
  clock,
}: {
  from: [number, number];
  to: [number, number];
  lines: { text: string; fill: string; opacity?: number }[];
  pixel: string;
  width: number;
  clock: [number, number];
}) {
  const height = 22 + lines.length * 22;
  return (
    <g className="cr-callout">
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke="var(--peri)" strokeDasharray="3 4" />
      <rect x={r(from[0] - 3)} y={r(from[1] - 3)} width={6} height={6} fill="var(--night)" stroke="var(--peri)" />
      <rect
        x={r(from[0] - 2.5)}
        y={r(from[1] - 2.5)}
        width={5}
        height={5}
        fill={pixel}
        className="cr-travel"
        style={
          {
            "--tx": `${r(to[0] - from[0] - 3)}px`,
            "--ty": `${r(to[1] - from[1])}px`,
            "--d": `${clock[0]}s`,
            "--o": `${clock[1]}s`,
          } as CSSProperties
        }
      />
      <g transform={`translate(${r(to[0])} ${r(to[1] - height / 2)})`}>
        <rect width={width} height={height} fill="var(--night-2)" stroke="var(--peri)" />
        {lines.map((l, i) => (
          <text
            key={l.text}
            x={14}
            y={26 + i * 22}
            className="font-mono whitespace-pre"
            fontSize={13}
            fill={l.fill}
            fillOpacity={l.opacity}
          >
            {l.text}
          </text>
        ))}
      </g>
    </g>
  );
}

// Screen origin of the drawing inside the viewBox.
const OX = 186;
const OY = 332;
const VB_W = 640;
const VB_H = 560;

export function ClosingRack() {
  const z0 = zBot(PULLED_SLOT);
  const z1 = zTop(PULLED_SLOT);
  const at = DX + PULL;
  const mid = (z0 + z1) / 2;
  const unitFrom: [number, number] = [r(sx([at, RAIL, mid])), r(sy([at, RAIL, mid]))];
  const roof: P3 = [DX, 0, H];
  const roofFrom: [number, number] = [r(sx(roof)), r(sy(roof))];
  const cardX = 238;
  const cardW = 212;
  const below = UNITS.filter((u) => u.slot < PULLED_SLOT);
  const above = UNITS.filter((u) => u.slot > PULLED_SLOT);
  const uplinkFrom: P3 = [DX, WY / 2, 0];
  const uplinkTo: P3 = [FX, WY / 2, 0];

  return (
    <>
      <noscript>
        <style>{NOSCRIPT}</style>
      </noscript>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        aria-hidden
        className="cr-art block h-auto w-full"
        fill="none"
        strokeLinejoin="round"
      >
        <style>{CSS}</style>
        <defs>
          <pattern id="cr-hatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={6} stroke="var(--night-line)" strokeWidth={1.5} />
          </pattern>
        </defs>

        <g transform={`translate(${OX} ${OY})`}>
          <Floor />

          {/* The uplink: a dashed run out across the floor, a pink pixel on it now and then. */}
          <line
            x1={r(sx(uplinkFrom))}
            y1={r(sy(uplinkFrom))}
            x2={r(sx(uplinkTo))}
            y2={r(sy(uplinkTo))}
            stroke="var(--pink)"
            strokeDasharray="3 4"
          />
          <rect
            x={r(sx(uplinkFrom) - 2.5)}
            y={r(sy(uplinkFrom) - 2.5)}
            width={5}
            height={5}
            fill="var(--pink)"
            className="cr-travel"
            style={
              {
                "--tx": `${r(sx(uplinkTo) - sx(uplinkFrom))}px`,
                "--ty": `${r(sy(uplinkTo) - sy(uplinkFrom))}px`,
                "--d": "5.5s",
                "--o": "0.8s",
              } as CSSProperties
            }
          />
          <rect x={r(sx(uplinkTo) - 3)} y={r(sy(uplinkTo) - 3)} width={6} height={6} fill="var(--pink)" />

          {/* The open front, dark between the posts, then everything below your server. */}
          <g transform={onFront(DX)}>
            <rect x={RAIL} y={0} width={FACE_W} height={H} fill="var(--night)" {...LINE} />
            <rect x={RAIL} y={H - 14} width={FACE_W} height={14} fill="var(--night-3)" {...LINE} />
          </g>
          {below.map((u) => (
            <RackUnit key={u.slot} unit={u} />
          ))}
          <Rail u={WY - RAIL} />

          <Pulled />

          {/* Re-darken the opening above the slot so the server's tail hides inside while it slides. */}
          <g transform={onFront(DX)}>
            <rect x={RAIL} y={0} width={FACE_W} height={H - zTop(PULLED_SLOT) - 0.5} fill="var(--night)" />
            <rect x={RAIL} y={0} width={FACE_W} height={14} fill="var(--night-3)" {...LINE} />
          </g>
          {above.map((u) => (
            <RackUnit key={u.slot} unit={u} />
          ))}
          <Rail u={0} />

          {/* The side panel and roof close the box. */}
          <polygon points={pts([0, WY, 0], [DX, WY, 0], [DX, WY, H], [0, WY, H])} fill="var(--night-2)" {...LINE} />
          <g transform={ON_SIDE}>
            {[24, H - 80].map((v0) =>
              Array.from({ length: 8 }, (_, row) =>
                [0, 1, 2].map((col) => (
                  <rect
                    key={`${v0}-${row}-${col}`}
                    x={16 + col * 32}
                    y={v0 + row * 7}
                    width={24}
                    height={2.5}
                    fill="var(--night)"
                  />
                )),
              ),
            )}
          </g>
          <polygon points={pts([0, 0, H], [DX, 0, H], [DX, WY, H], [0, WY, H])} fill="var(--night-3)" {...LINE} />
          <g transform={ON_TOP} {...HAIR}>
            {[44, 116].map((y) => (
              <g key={y}>
                <circle cx={64} cy={y} r={20} fill="var(--night-2)" />
                <circle cx={64} cy={y} r={4} />
                <path d={`M44 ${y} H84 M64 ${y - 20} V${y + 20}`} />
              </g>
            ))}
          </g>

          <Callout
            from={roofFrom}
            to={[cardX, roofFrom[1]]}
            width={cardW}
            pixel="var(--peri)"
            clock={[6.5, 3.4]}
            lines={[
              { text: `${SITE.code} · ${SITE.city}`, fill: "var(--mint-pale)" },
              { text: "names on file: 0", fill: "#fff", opacity: 0.72 },
            ]}
          />
          <Callout
            from={unitFrom}
            to={[cardX, unitFrom[1]]}
            width={cardW}
            pixel="var(--lime)"
            clock={[4.2, 2]}
            lines={[
              { text: `U${PULLED_SLOT + 1} · ${PLAN.name}`, fill: "var(--lime)" },
              { text: SPEC, fill: "#fff", opacity: 0.72 },
            ]}
          />
        </g>
      </svg>
    </>
  );
}
