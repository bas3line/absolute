import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Glyphs: periwinkle line, one or two lit pixels, 96 × 56             */
/* ------------------------------------------------------------------ */

const LINE = {
  fill: "none",
  stroke: "var(--peri)",
  strokeWidth: 1.5,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 96 56" aria-hidden className="h-20 w-[137px] overflow-visible">
      {children}
    </svg>
  );
}

/** A key with a lit pixel in its bow. */
function KeyGlyph() {
  return (
    <Glyph>
      <circle cx="17" cy="28" r="12" {...LINE} />
      <circle cx="17" cy="28" r="5" {...LINE} />
      <rect x="15" y="26" width="4" height="4" fill="var(--mint-hi)" />
      <path d="M29 25h60v6H29M71 31v8h6v-8M82 31v11h6V31" {...LINE} />
    </Glyph>
  );
}

/** An isometric cube centred on (x, y): the outline, then the three inner edges. */
function Cube({ x, y, top }: { x: number; y: number; top?: string }) {
  const s = 11;
  const w = s * 0.866;
  return (
    <>
      {top ? <path d={`M${x} ${y - s}l${w} ${s / 2}L${x} ${y}l${-w} ${-s / 2}Z`} fill={top} /> : null}
      <path
        d={`M${x} ${y - s}l${w} ${s / 2}v${s}L${x} ${y + s}l${-w} ${-s / 2}v${-s}Z M${x - w} ${y - s / 2}L${x} ${y}l${w} ${-s / 2}M${x} ${y}v${s}`}
        {...LINE}
      />
    </>
  );
}

/** Three blocks on a chain; the newest is lit. */
function BlockGlyph() {
  return (
    <Glyph>
      <Cube x={13} y={30} />
      <Cube x={48} y={30} />
      <Cube x={83} y={30} top="var(--lime)" />
      <path d="M23 30h15M58 30h15" {...LINE} strokeDasharray="2 3" />
      <rect x="81" y="7" width="4" height="4" fill="var(--mint-hi)" />
    </Glyph>
  );
}

/** Two notched pages, the same lines on each, and a pixel running between them. */
function MirrorGlyph() {
  const page = (x: number) => (
    <>
      <path d={`M${x} 10h20l7 7v29H${x}Z`} {...LINE} />
      <path d={`M${x + 6} 22h15M${x + 6} 28h13M${x + 6} 34h9`} {...LINE} />
    </>
  );
  return (
    <Glyph>
      {page(4)}
      {page(65)}
      <path d="M36 28h24" {...LINE} strokeDasharray="2 3" />
      <rect className="canary-travel" x="35" y="26" width="4" height="4" fill="var(--mint-hi)" />
    </Glyph>
  );
}

/** Four signed months, then a gap where the fifth should be. */
function MissedGlyph() {
  return (
    <Glyph>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={2 + i * 19} y={21} width={14} height={14} fill="var(--mint)" />
      ))}
      <rect x={78} y={21} width={14} height={14} {...LINE} strokeDasharray="3 2.5" />
      <rect className="canary-blink" x="83" y="26" width="4" height="4" fill="var(--pink)" />
    </Glyph>
  );
}

const RULES = [
  {
    name: "One key",
    text: "Every canary is signed with the same ed25519 key. Check the fingerprint gpg prints against this page; a new key would mean something happened.",
    glyph: <KeyGlyph />,
  },
  {
    name: "A fresh block hash",
    text: "Each one names a recent Bitcoin block, when it was mined and its hash, so it can't be written in advance and left on a timer.",
    glyph: <BlockGlyph />,
  },
  {
    name: "Two mirrors",
    text: "The same file is published on the clearnet site and the onion address. Fetch both; diff should print nothing.",
    glyph: <MirrorGlyph />,
  },
  {
    name: "A missed month",
    text: "If a month is missed, the file disappears or the signature fails, don't wait for an explanation. There won't be one.",
    glyph: <MissedGlyph />,
  },
];

/**
 * The four rules the canary keeps, ruled into cells: stacked, then 2 × 2, then one row from xl,
 * where a cell is wide enough to keep "A fresh block hash" on one line.
 * A server component, so it builds its class string by hand: kit's cn lives on the client.
 */
export function CanaryRules({ className = "" }: { className?: string }) {
  return (
    <ul
      aria-label="How the canary works"
      className={`grid gap-px border border-line-2 bg-line-2 md:grid-cols-2 xl:grid-cols-4 ${className}`}
    >
      {RULES.map((r, i) => (
        <li key={r.name} className="flex flex-col bg-bg p-5 pb-8 sm:p-6 sm:pb-10">
          {/* A raised plate on a dot lattice, numbered like a rack unit. */}
          <div className="relative flex h-36 items-center justify-center border border-line bg-paper bg-dots [--dot:var(--line-2)]">
            <span className="absolute top-3 left-3.5 bg-paper px-0.5 font-mono text-[11px] tracking-[0.16em] text-ink-3">
              {String(i + 1).padStart(2, "0")}
            </span>
            {r.glyph}
          </div>
          <h3 className="mt-7 px-1 font-display text-[24px] leading-[1.1] font-bold tracking-[-0.03em] text-ink [font-variation-settings:'opsz'_48]">
            {r.name}
          </h3>
          <p className="mt-3 px-1 text-[16px] leading-relaxed text-pretty text-ink-2">{r.text}</p>
        </li>
      ))}
    </ul>
  );
}
