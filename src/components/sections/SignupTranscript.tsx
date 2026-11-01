"use client";

import { memo, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { cn } from "@/components/kit";
import { brand } from "@/lib/brand";
import { blackbox, fmt, locations, price } from "@/lib/catalog";
import { SignupContours, SignupScrew, SignupVents } from "@/components/sections/SignupArt";

/* The two sessions -------------------------------------------------------- */

// The flagship's smallest size, in the one place it is sold.
const PLAN = blackbox[0];
const CITY = locations.find((l) => l.plans.includes(PLAN))?.city ?? "Montreal";

// Documentation-range address and a made-up credential: examples, never real ones.
const IP = "203.0.113.7";
const HOST = "blackbox";
const CREDENTIAL = "q7XkR2mVd9LpW4tBn3cF8hJs6yZa1GeT";
const MASKED = CREDENTIAL.slice(0, 4) + "•".repeat(CREDENTIAL.length - 4);

// An example rate, not a quote: a month of the plan in Monero at $300 per XMR.
const XMR_USD = 300;
const XMR = (price(PLAN.usd) / XMR_USD).toFixed(4);

const VERIFY = `blackbox-verify --host ${IP}`;
const SSH = `ssh root@${IP} encrypt`;
const PHRASE = "********";

type Field = { label: string; value: string; upload?: string; stop?: string };

// Every box is required. The form gets as far as the ID check and no further; the counts under it read this array.
const FIELDS: Field[] = [
  { label: "Full name", value: "M▒▒▒▒ K▒▒▒▒▒▒" },
  { label: "Email", value: "m.k▒▒▒▒▒@▒▒▒▒▒.▒▒" },
  { label: "Password", value: "••••••••••••" },
  { label: "Phone (SMS code)", value: "+▒▒ ▒▒▒ 812 · 418207" },
  { label: "Card number", value: "4▒▒▒ ▒▒▒▒ ▒▒▒▒ 0417" },
  { label: "Billing address", value: "▒▒ ▒▒▒▒▒▒ Rd, ▒▒▒▒" },
  { label: "Date of birth", value: "19▒▒-▒▒-▒▒" },
  { label: "Government ID (upload)", value: "passport.jpg", upload: "uploading", stop: "in review" },
  { label: "Selfie (liveness check)", value: "" },
  { label: "Company", value: "" },
  { label: "Use case", value: "" },
];
const STOP = FIELDS.findIndex((f) => f.stop);

/* One timeline, in milliseconds after the figure comes into view ------------
 *
 * Nothing here re-renders while it plays. Every beat is a CSS animation with a
 * fixed delay, set once at mount: lines are hidden until their moment, states
 * show only inside their window, each typed character is transparent until its
 * keystroke. Off screen the figure pauses them all with animation-play-state,
 * and under reduced motion they're dropped, which leaves the finished state.
 */

const TYPE_MS = 30; // typing in your terminal, per character
const GEN_MS = 20; // the credential printing, per character
const KEY_MS = 80; // the passphrase, per key
const FIELD_MS = 22; // the form's typing, per character
const UPLOAD_MS = 950;
const SPIN_MS = 480;
const BLINK_MS = 900;

// First a pixel runs from the start node down into each window; both sessions begin as it lands.
const RUN_AT = 150;
const RUN_MS = 1000;
const START = RUN_AT + RUN_MS;

const L = (() => {
  const cred = START + 250;
  const credTyped = cred + CREDENTIAL.length * GEN_MS;
  const mask = credTyped + 900;
  const plan = credTyped + 350;
  const pay = plan + 380;
  const wait = pay + 380;
  const paid = wait + 1300;
  const boot = paid + 300;
  const live = boot + 1700;
  const term = live + 450;
  const verify = term + 300;
  const verifyTyped = verify + VERIFY.length * TYPE_MS;
  const pass = verifyTyped + 450;
  const ssh = pass + 400;
  const sshTyped = ssh + SSH.length * TYPE_MS;
  const phrase = sshTyped + 350;
  const phraseTyped = phrase + PHRASE.length * KEY_MS;
  const enc = phraseTyped + 300;
  const booted = enc + 1300;
  const root = booted + 400;
  return { cred, mask, plan, pay, wait, paid, boot, live, term, verify, verifyTyped, pass, ssh, sshTyped, phrase, enc, booted, root };
})();

// The form: one slot per field, typed (or uploaded) in order, up to the ID check.
const R = (() => {
  let cursor = START + 300;
  const slots = FIELDS.slice(0, STOP + 1).map((f) => {
    const at = cursor;
    const done = at + (f.upload ? UPLOAD_MS : 110 + f.value.length * FIELD_MS);
    cursor = done + 140;
    return { at, done };
  });
  const stall = slots[STOP].done;
  return { slots, stall, notice: stall + 500 };
})();

const CSS = [
  "@keyframes sg-hide{from,to{visibility:hidden}}",
  "@keyframes sg-show{from,to{visibility:visible}}",
  "@keyframes sg-ink{from,to{color:transparent}}",
  "@keyframes sg-cur{from,to{background-color:var(--ink)}}",
  // The form's caret: a hairline inside the next character's box, so nothing reflows.
  "@keyframes sg-bar{from,to{box-shadow:inset 2px 0 0 var(--ink)}}",
  "@keyframes sg-off{from,to{background-color:var(--line-2)}}",
  "@keyframes sg-row{from,to{background-color:var(--bg)}}",
  "@keyframes sg-clr{from,to{background-color:transparent;outline-color:transparent}}",
  "@keyframes sg-spin{0%,24.9%{opacity:1}25%,100%{opacity:.2}}",
  "@keyframes sg-blink{0%,49.9%{opacity:1}50%,100%{opacity:.25}}",
  // The start pixels: along the dashed line, then down into the window. cq units read the connector's own box.
  "@keyframes sg-runl{0%{transform:none}55%{transform:translateX(-100cqw)}100%{transform:translate(-100cqw,100cqh)}}",
  "@keyframes sg-runr{0%{transform:none}55%{transform:translateX(100cqw)}100%{transform:translate(100cqw,100cqh)}}",
  // Inline `animation` shorthands reset play-state to running, hence !important.
  "[data-sg=paused] *{animation-play-state:paused!important}",
  "@media (prefers-reduced-motion:reduce){[data-sg] *{animation:none!important}}",
].join("");

/** Hidden for the first `ms` of the run, then as styled. */
const until = (ms: number): CSSProperties => ({ animation: `sg-hide ${ms}ms linear` });

/** Shown only from `a` to `b`. The element also carries `invisible`, which is where it rests. */
const between = (a: number, b: number): CSSProperties => ({ animation: `sg-show ${b - a}ms linear ${a}ms` });

/** Blinks from `a` to `b`, a whole number of times, then holds lit. */
const blink = (a: number, b: number): CSSProperties => ({
  animation: `sg-blink ${BLINK_MS}ms steps(1) ${a}ms ${Math.max(1, Math.floor((b - a) / BLINK_MS))}`,
});

/** Ten cells lit evenly from `a` to `b`: a progress bar for one beat. */
const ticks = (a: number, b: number) => Array.from({ length: 10 }, (_, j) => a + ((j + 1) * (b - a)) / 10);

/** Plays while the figure overlaps the top three quarters of the window; pauses otherwise. */
function usePlaying(target: RefObject<Element | null>) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), {
      rootMargin: "0px 0px -25% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return playing;
}

/* Pixel parts (no icon library) -------------------------------------------- */

// Drawn at 1:1, 7×6 CSS pixels, so every cell lands on a whole pixel.
const CHECK_BITS = ["......#", ".....##", "#...##.", "##.##..", ".###...", "..#...."];
const CHECK_PX = CHECK_BITS.flatMap((row, y) => row.split("").flatMap((c, x) => (c === "#" ? [{ x, y }] : [])));

function PixelCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 6" shapeRendering="crispEdges" aria-hidden className={cn("h-[6px] w-[7px] shrink-0", className)}>
      {CHECK_PX.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
    </svg>
  );
}

/** absolute's done mark: an ink pixel check on a mint cell. */
function Tick() {
  return (
    <span aria-hidden className="flex size-[13px] bg-mint pt-[4px] pl-[3px] text-ink">
      <PixelCheck />
    </span>
  );
}

/** A plain line of output: one periwinkle pixel. */
function Dot() {
  return <span aria-hidden className="size-[7px] bg-peri" />;
}

// Clockwise through a 2×2 block: top-left, top-right, bottom-right, bottom-left.
const SPIN_ORDER = [0, 1, 3, 2];

/** Four cells lit in turn. Runs a fixed number of turns, enough to reach `to`, then stops. */
function Spin({ to, className }: { to: number; className?: string }) {
  const turns = Math.ceil(to / SPIN_MS);
  return (
    <span aria-hidden className={cn("grid grid-cols-2 gap-px", className)}>
      {[0, 1, 2, 3].map((cell) => (
        <span
          key={cell}
          className="size-[5px] bg-current opacity-20"
          style={{
            animation: `sg-spin ${SPIN_MS}ms linear ${(SPIN_ORDER.indexOf(cell) * SPIN_MS) / 4}ms ${turns}`,
          }}
        />
      ))}
    </span>
  );
}

/** A row of cells, each lit from its own moment (`null` stays unlit). */
function Bar({ at, on, size = 7, gap = 2 }: { at: Array<number | null>; on: string; size?: number; gap?: number }) {
  return (
    <span aria-hidden className="inline-flex shrink-0 align-middle" style={{ gap }}>
      {at.map((t, i) => (
        <span
          key={i}
          className={cn("inline-block", t === null ? "bg-line-2" : on)}
          style={{ width: size, height: size, animation: t === null ? undefined : `sg-off ${t}ms linear` }}
        />
      ))}
    </span>
  );
}

/** Children laid over one another in one grid cell, so a change of state never moves the layout. */
function Stack({ as: As = "span", className, children }: { as?: "span" | "div"; className?: string; children: ReactNode }) {
  return <As className={cn("grid [&>*]:col-start-1 [&>*]:row-start-1", className)}>{children}</As>;
}

/**
 * Text typed one key at a time. Each character is its own span, transparent until its
 * keystroke, so the line wraps where it finally will from the first frame; words are held
 * together so a flag never splits at its hyphens. The cursor is the next character's own
 * box: an ink block in the terminal, an ink bar in the form. Each ▒ run is a solid
 * redaction bar one monospace cell (0.6em) per character, shown whole when its first key
 * lands; the ▒ glyph isn't in Plex Mono and would fall back wider.
 */
function Typed({
  text,
  at,
  per,
  cursor,
  cursorFrom = at,
  block,
  loose = false,
}: {
  text: string;
  at: number;
  per: number;
  cursor: "block" | "bar";
  /** When the cursor first shows on the first character; defaults to when typing starts. */
  cursorFrom?: number;
  /** Colour class for redacted runs. */
  block: string;
  /** Let a word break between any two characters (with `break-all` on the parent), for strings too long for a phone. */
  loose?: boolean;
}) {
  const cur = cursor === "block" ? "sg-cur" : "sg-bar";
  const words: ReactNode[] = [];
  let i = 0;
  // Spaces stay loose between words, so the line can still break there.
  for (const word of text.split(/( )/)) {
    if (!word) continue;
    const keys: ReactNode[] = [];
    for (const part of word.split(/(▒+)/)) {
      if (!part) continue;
      if (part.startsWith("▒")) {
        keys.push(
          <span
            key={i}
            className={cn("inline-block h-[0.9em] align-[-0.12em]", block)}
            style={{ width: `${part.length * 0.6}em`, ...until(at + (i + 1) * per) }}
          />,
        );
        i += part.length;
        continue;
      }
      for (const ch of part) {
        const shown = at + (i + 1) * per;
        const from = i === 0 ? cursorFrom : at + i * per;
        keys.push(
          <span key={i} style={{ animation: `sg-ink ${shown}ms linear, ${cur} ${shown - from}ms linear ${from}ms` }}>
            {ch}
          </span>,
        );
        i++;
      }
    }
    words.push(
      word === " " ? (
        keys[0]
      ) : (
        <span key={`w${i}`} className={loose ? undefined : "whitespace-nowrap"}>
          {keys}
        </span>
      ),
    );
  }
  return <>{words}</>;
}

/** The terminal's cursor parked after a typed line, from `from` to `to`. */
function Parked({ from, to }: { from: number; to: number }) {
  return <span style={{ animation: `sg-cur ${to - from}ms linear ${from}ms` }}>{" "}</span>;
}

/* Window chrome ------------------------------------------------------------ */

type Led = "mint" | "lime" | "pink";
const LEDS: Led[] = ["mint", "lime", "pink"];
const LED_BG: Record<Led, string> = { mint: "bg-mint", lime: "bg-lime", pink: "bg-pink" };

/** Slate title bar: three square LEDs, one of them lit (and blinking while it works), a mono title, a status. */
function TitleBar({
  title,
  status,
  lit,
  litStyle,
}: {
  title: string;
  status: ReactNode;
  lit: Led;
  litStyle?: CSSProperties;
}) {
  return (
    <div aria-hidden className="flex h-10 items-center gap-3 bg-night px-4 font-mono text-[12px] leading-none">
      <span className="flex shrink-0 gap-[5px]">
        {LEDS.map((led) => (
          <span
            key={led}
            className={cn("size-2", LED_BG[led], led !== lit && "opacity-30")}
            style={led === lit ? litStyle : undefined}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1 truncate text-center text-white/80">{title}</span>
      <span className="shrink-0">{status}</span>
    </div>
  );
}

/** One transcript line: a fixed gutter for the glyph, wrapped text with a hanging indent. */
function Line({
  glyph,
  children,
  className,
  style,
}: {
  glyph?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("grid grid-cols-[1.7em_minmax(0,1fr)]", className)} style={style}>
      <span className="flex h-[1.75em] items-center">{glyph}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

// Both windows share the body measure; the two-up layout at lg is the narrowest, so it steps down a size there.
const BODY = "font-mono text-[14px] leading-[1.75] lg:text-[13px] xl:text-[14px]";
const PAD = "px-4 sm:px-6 lg:px-5 xl:px-6";
const HEAD = cn("flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line bg-bg py-3", PAD);
const FOOT = cn(
  "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line bg-bg py-3 font-mono text-[12px] text-ink-3",
  PAD,
);

/* Left: absolute ------------------------------------------------------------ */

const prompt = <span className="font-semibold text-accent">$</span>;

const AbsoluteWindow = memo(function AbsoluteWindow() {
  return (
    <div aria-hidden className="flex flex-1 flex-col border border-line-2 bg-paper text-ink">
      <TitleBar
        lit="mint"
        litStyle={blink(L.cred, L.root)}
        title="absolute.example/order"
        status={
          <Stack className="justify-items-end">
            <span className="invisible text-white/70" style={between(0, L.cred)}>
              ready
            </span>
            <span className="invisible text-mint-pale" style={between(L.cred, L.root)}>
              running
            </span>
            <span className="text-mint" style={until(L.root)}>
              done
            </span>
          </Stack>
        }
      />

      <div className={cn("flex flex-1 flex-col", BODY)}>
        <div className={HEAD}>
          <span className="font-sans text-[16px] font-semibold text-ink">New account</span>
          <span className="text-[12px] text-ink-3">no email, no password</span>
        </div>

        <div className={cn("flex flex-col gap-2.5 pt-6 pb-5", PAD)}>
          <Line style={until(L.cred)} glyph={<Dot />}>
            credential generated
            <Stack className="font-medium break-all">
              <span className="invisible" style={between(0, L.mask)}>
                <Typed text={CREDENTIAL} at={L.cred} per={GEN_MS} cursor="block" block="" loose />
              </span>
              <span style={until(L.mask)}>{MASKED}</span>
            </Stack>
            <span className="block text-ink-3">the whole account. no email, no phone, no KYC.</span>
          </Line>

          <Line style={until(L.plan)} glyph={<Dot />}>
            {PLAN.name} · {CITY} · <span className="font-semibold">{fmt(PLAN.usd)}/mo</span>
            <span className="block text-ink-3">
              {PLAN.cores} vCPU · {PLAN.ram} · {PLAN.disk}
            </span>
          </Line>

          <Line style={until(L.pay)} glyph={<Dot />}>
            pay <span className="font-semibold text-accent">{XMR} XMR</span> to 8Bx…f3Qa
            <span className="block text-ink-3">fresh address, this invoice only · example rate</span>
          </Line>

          <Stack as="div">
            <Line
              className="invisible text-ink-3"
              style={between(L.wait, L.paid)}
              glyph={<Spin to={L.paid} className="text-accent" />}
            >
              watching a self-hosted node…
            </Line>
            <Line style={until(L.paid)} glyph={<Tick />}>
              payment seen on a self-hosted node
            </Line>
          </Stack>

          <Stack as="div">
            <Line
              className="invisible"
              style={between(L.boot, L.live)}
              glyph={<Spin to={L.live} className="text-accent" />}
            >
              provisioning <Bar at={ticks(L.boot, L.live)} on="bg-mint" />
            </Line>
            <Line style={until(L.live)} glyph={<Tick />}>
              server live at {IP}
              <span className="block text-ink-3">about 30s after payment · waiting in its initramfs</span>
            </Line>
          </Stack>

          {/* The rest happens on your own computer: the verifier never runs on the server it checks. */}
          <div className="mt-3 flex items-center gap-3 text-[12px] text-ink-3" style={until(L.term)}>
            <span className="shrink-0">your own terminal</span>
            <span className="h-px flex-1 bg-line-2" />
          </div>

          <Line style={until(L.verify)} glyph={prompt}>
            <span className="font-medium">
              <Typed text={VERIFY} at={L.verify} per={TYPE_MS} cursor="block" block="" />
              <Parked from={L.verifyTyped} to={L.pass} />
            </span>
          </Line>

          <Line style={until(L.pass)} glyph={<Tick />}>
            PASS · measurement matches the release
          </Line>

          <Line style={until(L.ssh)} glyph={prompt}>
            <span className="font-medium">
              <Typed text={SSH} at={L.ssh} per={TYPE_MS} cursor="block" block="" />
              <Parked from={L.sshTyped} to={L.phrase} />
            </span>
          </Line>

          <Line style={until(L.phrase)} glyph={<Dot />}>
            passphrase: <Typed text={PHRASE} at={L.phrase} per={KEY_MS} cursor="block" block="" />
            <span className="block text-ink-3">only you ever type it; nobody can recover it</span>
          </Line>

          <Stack as="div">
            <Line
              className="invisible"
              style={between(L.enc, L.booted)}
              glyph={<Spin to={L.booted} className="text-accent" />}
            >
              encrypting in place <Bar at={ticks(L.enc, L.booted)} on="bg-mint" />
            </Line>
            <Line style={until(L.booted)} glyph={<Tick />}>
              LUKS2 on disk · booting
            </Line>
          </Stack>
        </div>

        <div className={cn("mt-auto bg-lime py-3 font-semibold", PAD)} style={until(L.root)}>
          root@{HOST}:~# <span className="animate-caret bg-ink">{" "}</span>
        </div>
      </div>

      <div className={FOOT}>
        <Stack>
          <span className="invisible" style={between(0, L.root)}>
            › no email, no phone, no KYC
          </span>
          <span className="text-ink" style={until(L.root)}>
            › live in about 30s, no name on file
          </span>
        </Stack>
        <span className="hidden shrink-0 sm:inline">0 fields</span>
      </div>
    </div>
  );
});

/* Right: a typical cloud ---------------------------------------------------- */

type Slot = { at: number; done: number };

const ROW = cn(
  // On phones the label sits over its box, as phone forms do; from sm it's a column at the left.
  "grid grid-cols-[minmax(0,1fr)_14px] items-center gap-x-3 border-b border-line py-1.5",
  "sm:grid-cols-[11.5rem_minmax(0,1fr)_14px] lg:grid-cols-[8.75rem_minmax(0,1fr)_14px] xl:grid-cols-[11.5rem_minmax(0,1fr)_14px]",
  "-mx-2 px-2",
);

function FieldRow({ field, slot }: { field: Field; slot?: Slot }) {
  const stop = Boolean(field.stop);
  // The row under the cursor greys while it's filled; the ID row turns pink and stays that way.
  const rowStyle: CSSProperties | undefined = !slot
    ? undefined
    : stop
      ? { animation: `sg-clr ${slot.at}ms linear` }
      : { animation: `sg-row ${slot.done - slot.at}ms linear ${slot.at}ms` };

  return (
    <li className={cn(ROW, stop && "bg-pink-soft outline-2 -outline-offset-2 outline-pink")} style={rowStyle}>
      <span className={cn("col-span-2 text-[12px] leading-[1.4] sm:col-span-1", slot ? "text-ink-2" : "text-ink-3")}>
        {field.label}
        <span className="text-ink-3">*</span>
      </span>

      <span className="flex min-h-[26px] min-w-0 items-center">
        {slot && !field.upload ? (
          <span className="truncate">
            <Typed text={field.value} at={slot.at} per={FIELD_MS} cursor="bar" block="bg-ink-4" />
          </span>
        ) : null}
        {slot && field.upload ? (
          <Stack className="min-w-0 items-center">
            <span className="invisible flex min-w-0 items-center gap-2" style={between(slot.at, slot.done)}>
              <Bar at={Array.from({ length: 8 }, (_, j) => slot.at + ((j + 1) * UPLOAD_MS) / 8)} on="bg-ink-3" size={6} />
              <span className="truncate text-ink-2">{field.upload}…</span>
            </span>
            <span className="flex flex-wrap items-center gap-x-2" style={until(slot.done)}>
              {field.value}
              <span className="bg-pink px-1.5 text-[12px] leading-[1.6] font-medium text-ink">{field.stop}</span>
            </span>
          </Stack>
        ) : null}
      </span>

      <span className="flex justify-end text-ink-3">
        {slot && !stop ? (
          <span className="flex" style={until(slot.done)}>
            <PixelCheck />
          </span>
        ) : null}
        {slot && stop ? (
          <Stack className="place-items-center text-ink">
            <span className="invisible" style={between(slot.done, L.root)}>
              <Spin to={L.root} />
            </span>
            <span className="size-2 border border-ink bg-pink" style={until(L.root)} />
          </Stack>
        ) : null}
      </span>
    </li>
  );
}

const CloudWindow = memo(function CloudWindow() {
  return (
    <div aria-hidden className="flex flex-1 flex-col border border-line-2 bg-paper text-ink">
      <TitleBar
        lit="pink"
        litStyle={blink(R.stall, L.root)}
        title="cloud.example/signup"
        status={
          <Stack className="justify-items-end">
            <span className="invisible text-white/70" style={between(0, R.slots[0].at)}>
              ready
            </span>
            <span className="invisible text-mint-pale" style={between(R.slots[0].at, R.stall)}>
              filling
            </span>
            <span className="text-pink" style={until(R.stall)}>
              stopped
            </span>
          </Stack>
        }
      />

      <div className={cn("flex-1 pb-5", BODY)}>
        <div className={HEAD}>
          <span className="font-sans text-[16px] font-semibold text-ink">Create your account</span>
          <span className="text-[12px] text-ink-3">all fields required</span>
        </div>

        <div className={PAD}>
          <ol className="mt-3">
            {FIELDS.map((f, i) => (
              <FieldRow key={f.label} field={f} slot={R.slots[i]} />
            ))}
          </ol>

          <p className="mt-4 grid grid-cols-[1.7em_minmax(0,1fr)] text-ink" style={until(R.notice)}>
            <span className="flex h-[1.75em] items-center">
              <span className="size-2 border border-ink bg-pink" />
            </span>
            <span className="text-pretty">Stopped for an identity check. Review can take up to 72 hours.</span>
          </p>
        </div>
      </div>

      <div className={FOOT}>
        <span className="flex min-w-0 items-center gap-3">
          <Bar at={FIELDS.map((_, i) => (i < STOP ? R.slots[i].done : null))} on="bg-pink" size={9} gap={3} />
          <Stack className="shrink-0 text-ink-2">
            {R.slots.slice(0, STOP).map((s, k) => (
              <span key={k} className="invisible" style={between(k === 0 ? 0 : R.slots[k - 1].done, s.done)}>
                {k}/{FIELDS.length}
              </span>
            ))}
            <span style={until(R.slots[STOP - 1].done)}>
              {STOP}/{FIELDS.length}
            </span>
          </Stack>
        </span>
        <Stack className="shrink-0 justify-items-start sm:justify-items-end">
          <span className="invisible" style={between(0, R.stall)}>
            continue →
          </span>
          <span className="text-ink-2" style={until(R.stall)}>
            waiting on review
          </span>
        </Stack>
      </div>
    </div>
  );
});

/* Captions under each window ------------------------------------------------- */

const BIG = "font-display text-[clamp(2.5rem,4.6vw,4.5rem)] leading-none font-extrabold tracking-[-0.04em] [font-variation-settings:'opsz'_96]";

function Caption({ name, pixel, big, children }: { name: string; pixel: string; big: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-6 sm:mt-8">
      <p className="flex items-center gap-2.5 font-mono text-[12px] tracking-[0.16em] text-ink-2 uppercase">
        <span aria-hidden className={cn("size-[9px]", pixel)} />
        {name}
      </p>
      <p className={cn("mt-3 text-ink", BIG)}>{big}</p>
      <p className="mt-4 max-w-[30rem] text-[16px] leading-relaxed text-pretty text-ink-2 sm:text-[17px]">{children}</p>
    </div>
  );
}

/* The start node and its two dashed runs (two-up layout only) ---------------- */

/** Half of the connector: from the start node along the top, then down into this column's window. */
function Run({ side }: { side: "left" | "right" }) {
  const left = side === "left";
  return (
    <span
      aria-hidden
      className={cn(
        "absolute bottom-full hidden h-[52px] w-[calc(50%+var(--gap)/2)] border-t border-dashed border-ink-3 [container-type:size] lg:block",
        left ? "left-1/2 border-l" : "right-1/2 border-r",
      )}
    >
      <span
        className={cn(
          "invisible absolute -top-[4.5px] size-2",
          left ? "-right-[4px] bg-mint" : "-left-[4px] bg-pink",
        )}
        style={{
          animation: `sg-show ${RUN_MS}ms linear ${RUN_AT}ms, ${left ? "sg-runl" : "sg-runr"} ${RUN_MS}ms linear ${RUN_AT}ms`,
        }}
      />
    </span>
  );
}

/* The comparison ------------------------------------------------------------- */

export function SignupTranscript() {
  const ref = useRef<HTMLElement>(null);
  const playing = usePlaying(ref);
  const [run, setRun] = useState(0);

  return (
    <figure
      ref={ref}
      data-sg={playing ? "run" : "paused"}
      className="relative mt-12 border border-line-2 bg-bg-2 bg-dots px-3 pt-4 pb-8 sm:mt-16 sm:px-8 sm:pt-6 sm:pb-12 lg:px-12 lg:pt-[33px] lg:pb-14 xl:px-16"
    >
      <style>{CSS}</style>
      <SignupContours className="pointer-events-none absolute inset-0 hidden size-full lg:block" />
      <SignupScrew className="absolute top-2.5 left-2.5" />
      <SignupScrew className="absolute top-2.5 right-2.5" />
      <SignupScrew className="absolute bottom-2.5 left-2.5" />
      <SignupScrew className="absolute right-2.5 bottom-2.5" />

      <div className="relative flex h-[30px] items-center justify-between gap-3 pl-3 sm:pl-0">
        <span aria-hidden className="flex items-center gap-3 font-mono text-[11px] tracking-[0.16em] text-ink-3">
          U1
          <SignupVents />
        </span>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          aria-label="Replay both sessions"
          className="inline-flex h-[30px] items-center gap-2 border border-line-2 bg-paper px-3 font-mono text-[12px] text-ink-2 transition-colors hover:border-ink hover:text-ink motion-reduce:hidden"
        >
          <span aria-hidden>↺</span>
          replay
        </button>
      </div>

      <div
        key={run}
        className="relative mt-5 grid gap-y-14 [--gap:2.5rem] sm:mt-6 lg:mt-[37px] lg:grid-cols-2 lg:gap-x-(--gap) xl:[--gap:4rem]"
      >
        <span
          aria-hidden
          className="absolute -top-[67px] left-1/2 z-10 hidden h-[30px] -translate-x-1/2 items-center gap-2.5 bg-night px-3.5 font-mono text-[12px] whitespace-nowrap text-mint-pale lg:flex"
        >
          <span className="size-[7px] bg-mint" />
          two signups · both from nothing
        </span>

        <div className="relative flex min-w-0 flex-col">
          <Run side="left" />
          <AbsoluteWindow />
          <Caption name={brand.name} pixel="bg-mint" big={<span className="bg-lime px-2">~30s</span>}>
            From payment seen to a live server. The credential is the whole account.
          </Caption>
        </div>
        <div className="relative flex min-w-0 flex-col">
          <Run side="right" />
          <CloudWindow />
          <Caption
            name="a typical cloud"
            pixel="bg-pink"
            big={
              <>
                stuck at{" "}
                <span className="bg-pink px-2 whitespace-nowrap">
                  {STOP} of {FIELDS.length}
                </span>
              </>
            }
          >
            Name, phone, card and birthday go in. Then a passport scan, and up to 72 hours of review.
          </Caption>
        </div>
      </div>

      <figcaption className="sr-only">
        absolute, in its order page and then your own terminal. It generates a {CREDENTIAL.length}-character
        credential, which is the whole account, and masks it; takes {PLAN.name} in {CITY} at {fmt(PLAN.usd)} a month;
        asks for {XMR} XMR, at an example rate, to a fresh address used for this invoice only; sees the payment on a
        self-hosted node; and has the server live at {IP} about 30 seconds after payment, waiting in its initramfs. On
        your own computer, {VERIFY} reports PASS: the launch measurement matches the release. Then {SSH} asks for a
        passphrase only you ever type, encrypts the disk in place with LUKS2, and boots to a root prompt. No fields, no
        name on file. A typical cloud, in a signup form with {FIELDS.length} required fields:{" "}
        {FIELDS.map((f) => f.label).join(", ")}. It takes the first {STOP}, uploads a passport, then stops: identity
        check pending, review can take up to 72 hours.
      </figcaption>
    </figure>
  );
}
