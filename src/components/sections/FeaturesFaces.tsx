import type { ReactNode } from "react";
import { systems } from "@/lib/catalog";

/*
 * The faces of the six rack modules in Features: small UI mock-ups drawn in
 * code, with periwinkle line art and pixel squares. No images. Each face is a
 * size container, so it lays itself out for the card it sits in (a span-4 card
 * on a laptop, a phone column) rather than for the window.
 *
 * Motion is CSS, one loop per face, built below from millisecond timelines. An
 * animated element's own style is the face's finished state, so with reduced
 * motion (animation: none) every face still reads, stopped at its telling moment.
 *
 * Every address is from the documentation range (203.0.113.0/24), and every
 * credential is made up for the drawing.
 */

// Server component: cn lives in the client kit, so it can't be called from here.
const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

type Stop = [ms: number, css: string];

/** Keyframes for one element on a loop, from millisecond stops, and the class that plays them. */
function track(name: string, loop: number, stops: Stop[]) {
  const frames = stops.map(([ms, css]) => `${+((ms / loop) * 100).toFixed(3)}%{${css}}`).join("");
  return `@keyframes ${name}{${frames}}.${name}{animation:${name} ${loop}ms ease-in-out infinite}`;
}

/** Opacity 0 outside [from, to], fading over `fade` ms at each end. */
function between(name: string, loop: number, from: number, to: number, fade = 300) {
  return track(name, loop, [
    [0, "opacity:0"],
    [from, "opacity:0"],
    [from + fade, "opacity:1"],
    [to, "opacity:1"],
    [to + fade, "opacity:0"],
    [loop, "opacity:0"],
  ]);
}

/** The inverse of `between`: opacity 1 outside [from, to], 0 inside it. */
function outside(name: string, loop: number, from: number, to: number, fade = 300) {
  return track(name, loop, [
    [0, "opacity:1"],
    [from, "opacity:1"],
    [from + fade, "opacity:0"],
    [to, "opacity:0"],
    [to + fade, "opacity:1"],
    [loop, "opacity:1"],
  ]);
}

/** A rider: it appears at the start of its rail at `at`, reaches the end `dur` later, and is gone. */
function ride(name: string, loop: number, at: number, dur: number, axis: "X" | "Y" = "X") {
  const p = (pc: number, o: number) => `transform:translate${axis}(${pc}%);opacity:${o}`;
  return track(name, loop, [
    [0, p(0, 0)],
    [at, p(0, 0)],
    [at + 1, p(0, 1)],
    [at + dur, p(100, 1)],
    [at + dur + 1, p(100, 0)],
    [loop, p(100, 0)],
  ]);
}

/** A colour that sits at `off` until `on` arrives at `at`, holds until `until`, then eases back. */
function lamp(name: string, loop: number, prop: string, off: string, on: string, at: number, until: number) {
  return track(name, loop, [
    [0, `${prop}:${off}`],
    [at, `${prop}:${off}`],
    [at + 120, `${prop}:${on}`],
    [until, `${prop}:${on}`],
    [loop, `${prop}:${off}`],
  ]);
}

/* Parts ------------------------------------------------------------------- */

/** A 7px screw head: a ring with a slot, each turned to its own angle. */
export function Screw({ turn = 0 }: { turn?: number }) {
  return (
    <svg viewBox="0 0 14 14" width={7} height={7} aria-hidden className="block shrink-0">
      <circle cx="7" cy="7" r="6" fill="var(--bg-2)" stroke="var(--ink-3)" strokeWidth="2" />
      <path d="M3 7h8" stroke="var(--ink-3)" strokeWidth="2" transform={`rotate(${turn} 7 7)`} />
    </svg>
  );
}

/**
 * The sunken face a diagram is drawn on: dot lattice, hairline, fixed height.
 * A night face is slate; --cap carries the caption colour for either.
 */
function Face({ label, night = false, children }: { label: string; night?: boolean; children: ReactNode }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cx(
        "@container relative h-[252px] overflow-hidden border bg-dots",
        night
          ? "border-night bg-night [--cap:rgb(255_255_255/0.72)] [--dot:var(--night-line)]"
          : "border-line bg-bg [--cap:var(--ink-3)]",
      )}
    >
      {children}
    </div>
  );
}

/** A flat UI window with a mono title bar. */
function Window({
  title,
  aside,
  night = false,
  className,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  night?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col border", night ? "border-night bg-night" : "border-line-2 bg-paper", className)}>
      <div
        className={cx(
          "flex h-7 shrink-0 items-center gap-3 border-b px-2.5 font-mono text-[11px] leading-none",
          night ? "border-night-line text-white/70" : "border-line text-ink-3",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{title}</span>
        {aside ? <span className="shrink-0">{aside}</span> : null}
      </div>
      {children}
    </div>
  );
}

type Rider = { cls: string; rest?: number; children?: ReactNode };

/**
 * A dashed periwinkle connector. Riders sit on it, each a pixel crossing on its
 * own timeline; at rest (reduced motion) they wait `rest` percent of the way along.
 */
function Rail({ riders = [], vertical = false, className }: { riders?: Rider[]; vertical?: boolean; className?: string }) {
  return (
    <span className={cx("relative border-dashed border-peri", vertical ? "w-0 border-l" : "h-0 border-t", className)}>
      {riders.map((r) => (
        <span
          key={r.cls}
          className={cx(
            "absolute",
            vertical ? "top-0 bottom-[7px] left-[-4px] w-[7px]" : "top-[-4px] right-[7px] left-0 h-[7px]",
            r.cls,
          )}
          style={{ transform: `translate${vertical ? "Y" : "X"}(${r.rest ?? 50}%)` }}
        >
          {r.children ?? <span className="block size-[7px] bg-mint" />}
        </span>
      ))}
    </span>
  );
}

const Px = ({ className }: { className: string }) => <span className={cx("block size-[7px] shrink-0", className)} />;

/**
 * Two states of one label stacked in a single grid cell, so it is always as wide
 * as the longer. `after` is the resting state; `before` shows until the swap.
 * The classes are `${cls}-b` and `${cls}-a`.
 */
function Swap({ cls, before, after, className }: { cls: string; before: ReactNode; after: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-grid", className)}>
      <span className={cx("col-start-1 row-start-1 opacity-0", `${cls}-b`)}>{before}</span>
      <span className={cx("col-start-1 row-start-1", `${cls}-a`)}>{after}</span>
    </span>
  );
}

/* U1 · zero identity ---------------------------------------------------------- */

const FORM = [
  { label: "email", value: "you@example.com" },
  { label: "phone", value: "+1 555 0142" },
  { label: "name", value: "Jane Doe" },
  { label: "id / kyc", value: "passport.jpg" },
];
// Made up: 32 random characters, the length of a real credential.
const CREDENTIAL = "q7Xm2Rk9vT4pLw8ZbN3cH6dYf5Js1GaE";
const MASKED = "•".repeat(CREDENTIAL.length);

const L1 = 10_000;
const strikeAt = (i: number) => 600 + i * 450;
const U1_CSS = [
  ...FORM.flatMap((_, i) => {
    const t = strikeAt(i);
    const bg = (c: string) => `background-color:${c}`;
    const s = (x: number, o: number) => `transform:scaleX(${x});opacity:${o}`;
    return [
      track(`ft-u1r${i}`, L1, [
        [0, bg("transparent")],
        [t, bg("transparent")],
        [t + 300, bg("var(--pink-soft)")],
        [9300, bg("var(--pink-soft)")],
        [9800, bg("transparent")],
        [L1, bg("transparent")],
      ]),
      track(`ft-u1s${i}`, L1, [
        [0, s(0, 1)],
        [t, s(0, 1)],
        [t + 300, s(1, 1)],
        [9300, s(1, 1)],
        [9800, s(1, 0)],
        [L1, s(0, 0)],
      ]),
      between(`ft-u1m${i}`, L1, t, 9300),
    ];
  }),
  ride("ft-u1go", L1, 2250, 450),
  between("ft-u1row", L1, 2700, 9300),
  between("ft-u1val", L1, 2700, 7200),
  // The mask is the inverse: whenever the credential isn't showing, the mask is.
  track("ft-u1mask", L1, [
    [0, "opacity:1"],
    [2700, "opacity:1"],
    [3000, "opacity:0"],
    [7200, "opacity:0"],
    [7500, "opacity:1"],
    [L1, "opacity:1"],
  ]),
];

/** The credential, which later masks itself like any secret, on one line or split over two. */
function CredValue({ rows, className }: { rows: 1 | 2; className: string }) {
  const cut = (s: string) => (rows === 1 ? [s] : [s.slice(0, 16), s.slice(16)]);
  return (
    <span className={cx("relative block min-w-0 font-mono whitespace-nowrap", className)}>
      <span className="ft-u1val block">
        {cut(CREDENTIAL).map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </span>
      <span className="ft-u1mask absolute inset-0 opacity-0">
        {cut(MASKED).map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}

export function IdentityFace() {
  return (
    <Face label="A sign-up form with its email, phone, name and ID fields struck out. In their place, one randomly generated 32-character credential: the whole account.">
      <div className="absolute inset-0 flex items-center justify-center px-3 @md:px-6">
        <Window
          title="sign up"
          aside="all required"
          className="w-full max-w-[340px] @2xl:w-[300px] @2xl:shrink-0 @3xl:w-[330px]"
        >
          <ul className="flex flex-col gap-1 p-2">
            {FORM.map((f, i) => (
              <li
                key={f.label}
                className={cx("flex h-[28px] items-center gap-2 bg-pink-soft px-1.5 @2xl:h-[30px]", `ft-u1r${i}`)}
              >
                <span className={cx("w-2.5 shrink-0 font-mono text-[13px] text-ink", `ft-u1m${i}`)}>-</span>
                <span className="w-[62px] shrink-0 font-mono text-[11px] text-ink-3">{f.label}</span>
                <span className="relative font-mono text-[12.5px] whitespace-nowrap text-ink-2">
                  {f.value}
                  <span className={cx("absolute inset-x-[-3px] top-[calc(50%-1px)] h-[2px] origin-left bg-ink", `ft-u1s${i}`)} />
                </span>
              </li>
            ))}
            {/* Narrow cards: the credential is the form's one added row. Wide cards print it beside. */}
            <li className="ft-u1row flex flex-col gap-1 bg-mint px-1.5 py-1.5 @2xl:hidden">
              <span className="flex items-center gap-2 font-mono text-[11px] leading-none text-ink">
                <span className="w-2.5 shrink-0 text-[13px]">+</span>
                credential
                <span className="ml-auto">{CREDENTIAL.length} chars</span>
              </span>
              <CredValue rows={1} className="pl-[18px] text-[12px] text-ink" />
            </li>
          </ul>
        </Window>
        {/* Widths sum to under each breakpoint's container, padding included. */}
        <Rail className="hidden w-12 shrink-0 @2xl:block @3xl:w-16" riders={[{ cls: "ft-u1go" }]} />
        <Window
          night
          title="your credential"
          aside={<span className="text-mint">{CREDENTIAL.length} characters</span>}
          className="hidden w-[264px] shrink-0 @2xl:flex @3xl:w-[310px]"
        >
          <div className="px-3.5 pt-3.5 pb-3.5">
            <CredValue rows={2} className="text-[17px] leading-[1.5] text-mint-pale @3xl:text-[19px]" />
          </div>
          <p className="border-t border-night-line px-3.5 py-2.5 font-mono text-[11px] text-white/70">
            this is the whole account.
          </p>
        </Window>
      </div>
    </Face>
  );
}

/* U2 · live in about 30 seconds ---------------------------------------------- */

const L2 = 8000;
const PAID = 600;
const BAR = [1300, 4300] as const;
const UP = 5000;
const DONE2 = 7500;
const U2_CSS = [
  lamp("ft-u2paid", L2, "background-color", "var(--line-2)", "var(--mint)", PAID, DONE2),
  between("ft-u2s-a", L2, PAID, DONE2, 200),
  outside("ft-u2s-b", L2, PAID, DONE2, 200),
  ride("ft-u2go0", L2, PAID + 200, 500, "Y"),
  // Thirty pixels, one a second in spirit, revealed in thirty hard steps.
  track("ft-u2bar", L2, [
    [0, "clip-path:inset(0 100% 0 0)"],
    [BAR[0], "clip-path:inset(0 100% 0 0);animation-timing-function:steps(30,end)"],
    [BAR[1], "clip-path:inset(0 0 0 0)"],
    [DONE2, "clip-path:inset(0 0 0 0);opacity:1"],
    [DONE2 + 300, "clip-path:inset(0 0 0 0);opacity:0"],
    [L2, "clip-path:inset(0 100% 0 0);opacity:0"],
  ]),
  ride("ft-u2go1", L2, BAR[1] + 100, 500, "Y"),
  lamp("ft-u2run", L2, "background-color", "var(--line-2)", "var(--mint)", UP, DONE2),
  between("ft-u2r-a", L2, UP, DONE2, 200),
  outside("ft-u2r-b", L2, UP, DONE2, 200),
  between("ft-u2cred", L2, UP, DONE2),
];

const PIXELS = Array.from({ length: 30 }, (_, i) => i);

function PixelRow({ className }: { className: string }) {
  return (
    <span className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]">
      {PIXELS.map((i) => (
        <span key={i} className={cx("aspect-square", className)} />
      ))}
    </span>
  );
}

export function LiveFace() {
  return (
    <Face label="A payment confirmed on a self-hosted node, thirty pixels of provisioning, then the server's address and root login in the panel. About 30 seconds end to end.">
      <div className="absolute inset-0 flex flex-col justify-center px-4 @md:px-6">
        <Window
          title={
            <>
              <Px className="ft-u2paid bg-mint" />
              invoice
            </>
          }
          aside={<Swap cls="ft-u2s" before="waiting" after="confirmed" className="justify-items-end" />}
        >
          <p className="truncate px-2.5 py-2 font-mono text-[12px] text-ink-2">xmr, watched on a self-hosted node</p>
        </Window>
        <Rail vertical className="h-4 shrink-0 self-center" riders={[{ cls: "ft-u2go0" }]} />
        <div className="flex flex-col gap-1.5">
          <span className="flex justify-between font-mono text-[11px] text-ink-3">
            <span>provisioning</span>
            <span>about 30 s</span>
          </span>
          <span className="relative block">
            <PixelRow className="bg-line-2" />
            <span className="ft-u2bar absolute inset-0">
              <PixelRow className="bg-mint" />
            </span>
          </span>
        </div>
        <Rail vertical className="h-4 shrink-0 self-center" riders={[{ cls: "ft-u2go1" }]} />
        <Window
          title="panel"
          aside={
            <span className="flex items-center gap-2">
              <Px className="ft-u2run bg-mint" />
              <Swap cls="ft-u2r" before="building" after="running" />
            </span>
          }
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-2.5 py-2 font-mono text-[12px]">
            <dt className="text-ink-3">ipv4</dt>
            <dd className="ft-u2cred text-ink">203.0.113.24</dd>
            <dt className="text-ink-3">login</dt>
            <dd className="ft-u2cred text-ink">root · ••••••••••</dd>
          </dl>
        </Window>
      </div>
    </Face>
  );
}

/* U3 · full root or RDP ------------------------------------------------------- */

// The picker cycles through three of the eight; each frame holds a third of the loop.
const PICKS: string[] = ["Debian", "OpenBSD", "Windows Server"];
const PICKED = PICKS.flatMap((name) => systems.filter((s) => s.name === name));
const L3 = 7200;
const U3_CSS = [
  "@keyframes ft-u3f{0%,33.33%{opacity:1}33.34%,100%{opacity:0}}",
  ...PICKED.map((_, f) => `.ft-u3f${f}{animation:ft-u3f ${L3}ms linear ${f ? f * (L3 / 3) - L3 : 0}ms infinite}`),
];

export function RootFace() {
  return (
    <Face
      label={`A reinstall picker listing ${systems.map((s) => s.name).join(", ")}. Linux and BSD come up with root, Windows Server with RDP.`}
    >
      <div className="absolute inset-0 flex flex-col justify-center px-4 @md:px-6">
        <Window title="reinstall" aside="panel">
          <ul className="grid grid-cols-2 gap-0.5 p-1.5">
            {systems.map((s) => {
              const f = PICKS.indexOf(s.name);
              return (
                <li
                  key={s.name}
                  className="relative flex h-[26px] min-w-0 items-center gap-2 px-2 font-mono text-[12px] text-ink-2"
                >
                  {f >= 0 ? (
                    <span className={cx("absolute inset-0 bg-mint", f > 0 && "opacity-0", `ft-u3f${f}`)}>
                      <span className="absolute top-[calc(50%-3.5px)] left-2 size-[7px] bg-ink" />
                    </span>
                  ) : null}
                  <span className="relative size-[7px] shrink-0 border border-ink-3" />
                  <span className="relative truncate">{s.name}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-3 border-t border-line px-2.5 py-2">
            <span className="grid min-w-0 flex-1">
              {PICKED.map((s, f) => (
                <span
                  key={s.name}
                  className={cx(
                    "col-start-1 row-start-1 min-w-0 font-mono text-[11px] leading-[16px]",
                    f > 0 && "opacity-0",
                    `ft-u3f${f}`,
                  )}
                >
                  <span className="block truncate text-ink-2">versions: {s.versions.join(" · ")}</span>
                  <span className="block truncate text-ink-3">
                    access: <span className="text-ink">{s.name === "Windows Server" ? "RDP" : "root"}</span>
                  </span>
                </span>
              ))}
            </span>
            <span className="notch flex h-8 shrink-0 items-center bg-mint pr-4 pl-3 font-mono text-[12px] text-ink">
              reinstall
            </span>
          </div>
        </Window>
      </div>
    </Face>
  );
}

/* U4 · custom renewal cycles -------------------------------------------------- */

const DAYS = 35;
const MIN = 7;
// An example cycle: the real one is whatever you set.
const CYCLE = 14;
// The job ends part-way through the second cycle, and the server goes with it.
const GONE = MIN + CYCLE + 5;

const SEGMENTS = [
  {
    from: 0,
    to: MIN,
    cell: "bg-pink-soft bg-hatch [--hatch:var(--pink)]",
    label: "7-day minimum",
    note: "prorated",
    short: "7-day minimum, prorated",
  },
  {
    from: MIN,
    to: MIN + CYCLE,
    cell: "bg-mint-pale",
    label: `renew every ${CYCLE} days`,
    note: "or whatever cycle you set",
    short: `renew every ${CYCLE} days, or any cycle`,
  },
  { from: MIN + CYCLE, to: GONE, cell: "bg-peri-soft", label: "renewed", note: "", short: "renewed" },
  {
    from: GONE,
    to: DAYS,
    cell: "border border-dashed border-ink-3",
    label: "deleted",
    note: "the job was done",
    short: "deleted when the job was done",
    gone: true,
  },
];

const L4 = 9000;
const ARRIVE = 6000;
const U4_CSS = [
  track("ft-u4now", L4, [
    [0, "transform:translateX(0);opacity:0"],
    [300, "transform:translateX(0);opacity:1;animation-timing-function:linear"],
    [ARRIVE, "transform:translateX(100%);opacity:1"],
    [8500, "transform:translateX(100%);opacity:1"],
    [8800, "transform:translateX(100%);opacity:0"],
    [L4, "transform:translateX(0);opacity:0"],
  ]),
  lamp("ft-u4del", L4, "background-color", "var(--pink-soft)", "var(--pink)", ARRIVE, ARRIVE + 900),
  between("ft-u4gone", L4, ARRIVE + 100, 8600),
];

const span = (from: number, to: number) => ({ gridColumn: `${from + 1} / ${to + 1}` });

export function RenewFace() {
  return (
    <Face label="A 35-day billing strip: a 7-day prorated minimum, then a renewal cycle you set, then the server deleted the day the job was done.">
      <div className="absolute inset-0 flex flex-col justify-center px-4 @md:px-6 @2xl:px-8">
        <Window title="billing" aside="panel">
          <div className="flex items-center gap-2.5 p-2.5 font-mono text-[12px] text-ink-2">
            <span className="whitespace-nowrap">renew every</span>
            <span className="flex h-7 shrink-0 items-center gap-1 border border-line-2 bg-bg px-2 text-[12.5px] text-ink">
              {CYCLE} days
              <span className="animate-caret h-3.5 w-[2px] shrink-0 bg-ink" />
            </span>
            <span className="ft-u4del notch ml-auto flex h-7 shrink-0 items-center border border-ink bg-pink-soft pr-3.5 pl-2.5 text-ink">
              delete
            </span>
          </div>
        </Window>

        <div className="mt-4 @2xl:mt-5">
          {/* The ruler: day numbers, a week apart. */}
          <div className="grid grid-cols-[repeat(35,minmax(0,1fr))] gap-x-[2px] font-mono text-[11px] leading-none text-ink-3">
            {[0, 7, 14, 21, 28].map((d) => (
              <span key={d} style={span(d, d + 7)} className="pb-1.5">
                {d === 0 ? "day 1" : d + 1}
              </span>
            ))}
          </div>
          <div className="relative">
            <div className="grid h-5 grid-cols-[repeat(35,minmax(0,1fr))] gap-x-[2px] @2xl:h-7">
              {SEGMENTS.flatMap((s) =>
                Array.from({ length: s.to - s.from }, (_, i) => <span key={s.from + i} className={s.cell} />),
              )}
            </div>
            {/* Today: walks the strip to the day the server is deleted. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-[-5px] left-0"
              style={{ width: `${(GONE / DAYS) * 100}%` }}
            >
              <span className="ft-u4now absolute inset-0" style={{ transform: "translateX(100%)" }}>
                <span className="absolute inset-y-0 left-[-2px] w-[2px] bg-ink" />
                <span className="absolute top-[-3px] left-[-5px] size-[8px] bg-ink" />
              </span>
            </span>
          </div>

          {/* Wide: a bracket under each stretch of the strip. */}
          <div className="mt-2 hidden grid-cols-[repeat(35,minmax(0,1fr))] gap-x-[2px] @2xl:grid">
            {SEGMENTS.map((s) => (
              <div key={s.from} style={span(s.from, s.to)} className={cx("min-w-0", s.gone && "ft-u4gone")}>
                <span className="block h-1.5 border-x border-b border-ink-3" />
                <span className="mt-1.5 block truncate font-mono text-[11px] leading-[15px] text-ink-2">{s.label}</span>
                {s.note ? (
                  <span className="block truncate font-mono text-[11px] leading-[15px] text-ink-3">{s.note}</span>
                ) : null}
              </div>
            ))}
          </div>

          {/* Narrow: a legend. */}
          <ul className="mt-3 flex flex-col gap-1.5 font-mono text-[11px] leading-[14px] text-ink-2 @2xl:hidden">
            {SEGMENTS.map((s) => (
              <li key={s.from} className={cx("flex items-center gap-2", s.gone && "ft-u4gone")}>
                <span className={cx("size-[10px] shrink-0", s.cell)} />
                <span className="truncate">{s.short}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Face>
  );
}

/* U5 · no traffic logging ----------------------------------------------------- */

const LOG = [
  ["203.0.113.51", "GET /servers 200"],
  ["203.0.113.8", "POST /order 302"],
  ["203.0.113.97", "GET /panel 200"],
  ["203.0.113.23", "POST /invoice 200"],
  ["203.0.113.140", "GET /canary 200"],
  ["203.0.113.66", "GET /status 200"],
];

const U5_CSS = "@keyframes ft-drain{from{transform:translateY(-50%)}to{transform:none}}.ft-drain{animation:ft-drain 15s linear infinite}";

export function LogFace() {
  return (
    <Face label="The web access log, visitor addresses and all, drifting down into /dev/null. No packet inspection and no flow logs either.">
      <div className="absolute inset-3 flex flex-col gap-2">
        <Window
          night
          title="access.log"
          aside={
            <span className="flex items-center gap-2">
              <span className="ft-led size-[6px] bg-mint" />
              CustomLog /dev/null
            </span>
          }
          className="min-h-0 flex-1"
        >
          <div className="relative flex-1 overflow-hidden">
            {/* Two copies, sliding down by one: the loop has no seam. */}
            <ul className="ft-drain absolute inset-x-0 top-0">
              {[...LOG, ...LOG].map(([ip, line], i) => (
                <li key={i} className="flex h-[26px] items-center gap-3 px-3 font-mono text-[12px] whitespace-nowrap">
                  <span className="w-[98px] shrink-0 text-mint-pale/80">{ip}</span>
                  <span className="text-white/85">{line}</span>
                </li>
              ))}
            </ul>
            <div className="absolute inset-x-0 bottom-0 flex h-11 items-center justify-center border-t border-dashed border-night-line bg-night bg-hatch [--hatch:var(--night-line)]">
              <span className="bg-night px-2 py-0.5 font-mono text-[12px] text-mint">/dev/null</span>
            </div>
          </div>
        </Window>
        <ul className="flex flex-wrap gap-2">
          {["packet inspection", "flow logs"].map((t) => (
            <li
              key={t}
              className="flex h-7 items-center gap-2 border border-line-2 bg-paper px-2 font-mono text-[11.5px] whitespace-nowrap text-ink-2"
            >
              <Px className="bg-pink" />
              {t}: <span className="text-ink">none</span>
            </li>
          ))}
        </ul>
      </div>
    </Face>
  );
}

/* U6 · dedicated IPv4, unmetered ---------------------------------------------- */

// 203.0.113.0/24, drawn as 32 × 8; one address is lit, and it is yours.
const BLOCK = Array.from({ length: 256 }, (_, i) => i);
const MINE = 24;

const L6 = 6400;
const U6_CSS = [
  track("ft-u6flow", L6, [
    [0, "transform:scaleX(.38)"],
    [1400, "transform:scaleX(.74)"],
    [2600, "transform:scaleX(.52)"],
    [4200, "transform:scaleX(.9)"],
    [5400, "transform:scaleX(.6)"],
    [L6, "transform:scaleX(.38)"],
  ]),
];

export function IPv4Face() {
  return (
    <Face label={`The block 203.0.113.0/24 with one address, 203.0.113.${MINE}, lit as yours and never shared, beside a transfer meter for the standard line with no cap.`}>
      <div className="absolute inset-0 flex flex-col justify-center gap-3.5 px-4 @md:px-6 @xl:flex-row @xl:items-center @xl:gap-6">
        <div className="w-full max-w-[300px] @xl:w-[300px] @xl:shrink-0">
          <div className="mb-1.5 flex justify-between gap-3 font-mono text-[11px] text-ink-3">
            <span>203.0.113.0/24</span>
            <span>shared: never</span>
          </div>
          <div className="grid grid-cols-[repeat(32,minmax(0,1fr))] gap-[2px]">
            {BLOCK.map((i) => (
              <span key={i} className={cx("aspect-square", i === MINE ? "ft-led bg-mint" : "bg-line-2")} />
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-ink">
            <Px className="bg-mint" />
            203.0.113.{MINE}
            <span className="text-ink-3">· dedicated, yours</span>
          </div>
        </div>
        <Window title="transfer" aside="standard line" className="w-full max-w-[300px] @xl:max-w-none @xl:flex-1">
          <div className="px-2.5 pt-2.5 pb-3">
            <div className="flex items-baseline justify-between gap-3 font-mono">
              <span className="text-[15px] text-ink">unmetered</span>
              <span className="text-[11px] text-ink-3">cap: none</span>
            </div>
            <div className="relative mt-2 h-3 overflow-hidden border border-line-2 bg-bg">
              <span
                className="ft-u6flow absolute inset-y-0 left-0 w-full origin-left bg-peri"
                style={{ transform: "scaleX(.62)" }}
              />
            </div>
          </div>
        </Window>
      </div>
    </Face>
  );
}

/* Motion ---------------------------------------------------------------------- */

export const FEATURES_CSS = [
  // The status LED on every module's ear.
  "@keyframes ft-led{0%,100%{opacity:1}50%{opacity:.3}}.ft-led{animation:ft-led 2.8s ease-in-out infinite}",
  ...U1_CSS,
  ...U2_CSS,
  ...U3_CSS,
  ...U4_CSS,
  U5_CSS,
  ...U6_CSS,
  "@media (prefers-reduced-motion:reduce){[data-ft] *{animation:none!important}}",
].join("");
