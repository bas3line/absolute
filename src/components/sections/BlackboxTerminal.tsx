"use client";

import { memo, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/components/kit";
import { blackboxFeatures, unlockTranscript } from "@/lib/catalog";
import { BbCheck } from "@/components/sections/BlackboxArt";

/* The script ------------------------------------------------------------------
 *
 * The verifier runs first, on your own computer, then the unlock flow exactly as
 * the catalogue prints it. Lines are typed (commands, the passphrase) or printed
 * whole (output), on one fixed timeline set at mount.
 */

type Kind = "cmd" | "out" | "ok";
type Src = { t: Kind; s: string; c?: string };

const measured = blackboxFeatures.find((f) => f.id === "measured") ?? blackboxFeatures[1];

const VERIFY: Src[] = [
  { t: "cmd", s: measured.cmd, c: "# on your own computer" },
  ...measured.out.split("\n").map((s, i, all): Src => ({ t: i === all.length - 1 ? "ok" : "out", s })),
];

const SCRIPT: Src[] = [...VERIFY, ...unlockTranscript];

const TYPE_MS = 30; // a command, per character
const KEY_MS = 130; // the passphrase, per key
const START = 450;

type Beat = {
  t: Kind;
  text: string;
  comment?: string;
  /** For the passphrase prompt: what prints at once, then how many keys are typed. */
  lead?: string;
  keys?: number;
  at: number;
  typed: number;
  next: number;
};

const BEATS: Beat[] = (() => {
  let t = START;
  return SCRIPT.map((line) => {
    if (line.t === "cmd") {
      const text = line.s.replace(/^\$ /, "");
      const at = t;
      const typed = at + text.length * TYPE_MS;
      t = typed + 420;
      return { t: line.t, text, comment: line.c, at, typed, next: t };
    }
    const secret = /^(.*: )(\*+)$/.exec(line.s);
    if (secret) {
      const at = t;
      const typed = at + 520 + secret[2].length * KEY_MS;
      t = typed + 480;
      return { t: line.t, text: line.s, lead: secret[1], keys: secret[2].length, at, typed, next: t };
    }
    const at = t;
    // A verdict or an unlock is a moment: hold on it before the next line.
    t = at + (line.t === "ok" ? 950 : 300);
    return { t: line.t, text: line.s.trim(), at, typed: at, next: t };
  });
})();

const END = BEATS[BEATS.length - 1].next;
const VERIFIED = BEATS[VERIFY.length - 1].at;
const UNLOCKED = BEATS.find((b, i) => i >= VERIFY.length && b.t === "ok")?.at ?? END;

const CSS = [
  "@keyframes bb-hide{from,to{visibility:hidden}}",
  "@keyframes bb-show{from,to{visibility:visible}}",
  "@keyframes bb-ink{from,to{color:transparent}}",
  "@keyframes bb-cur{from,to{background-color:var(--mint-pale)}}",
  // Inline `animation` shorthands reset play-state to running, hence !important.
  "[data-bb=paused] *{animation-play-state:paused!important}",
  // Before hydration (and without script) the window shows its last frame.
  "[data-bb=static] *{animation:none!important}",
  "@media (prefers-reduced-motion:reduce){[data-bb] *{animation:none!important}}",
].join("");

/** Hidden for the first `ms` of the run, then as styled. */
const until = (ms: number): CSSProperties => ({ animation: `bb-hide ${ms}ms linear` });

/** Shown only from `a` to `b`. The element also carries `invisible`, which is where it rests. */
const between = (a: number, b: number): CSSProperties => ({ animation: `bb-show ${b - a}ms linear ${a}ms` });

/**
 * Text typed one key at a time. Each character is transparent until its keystroke,
 * so the line wraps where it finally will from the first frame. The cursor is the
 * next character's own box, lit mint-pale while it waits there.
 */
function Typed({ text, at, per }: { text: string; at: number; per: number }) {
  return (
    <>
      {Array.from(text).map((ch, i) => {
        const shown = at + (i + 1) * per;
        const from = at + i * per;
        return (
          <span key={i} style={{ animation: `bb-ink ${shown}ms linear, bb-cur ${shown - from}ms linear ${from}ms` }}>
            {ch}
          </span>
        );
      })}
    </>
  );
}

/** The cursor parked after a typed line, from `from` to `to`. */
function Parked({ from, to }: { from: number; to: number }) {
  if (to <= from) return null;
  return <span style={{ animation: `bb-cur ${to - from}ms linear ${from}ms` }}> </span>;
}

/** One line: a fixed gutter for the glyph, then text with a hanging indent. */
function Row({ glyph, children, style, className }: { glyph?: ReactNode; children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[1.5em_minmax(0,1fr)]", className)} style={style}>
      <span className="flex h-[1.7em] items-center">{glyph}</span>
      <span className="min-w-0 break-words whitespace-pre-wrap">{children}</span>
    </div>
  );
}

const prompt = <span className="font-semibold text-mint">$</span>;

function BeatRow({ b }: { b: Beat }) {
  if (b.t === "cmd") {
    return (
      <Row glyph={prompt} style={until(b.at)} className="text-mint-pale">
        <Typed text={b.text} at={b.at} per={TYPE_MS} />
        <Parked from={b.typed} to={b.next} />
        {b.comment ? (
          <span className="text-peri-soft" style={until(b.typed)}>
            {"  "}
            {b.comment}
          </span>
        ) : null}
      </Row>
    );
  }
  if (b.lead && b.keys) {
    const k0 = b.at + 520;
    return (
      <Row style={until(b.at)} className="text-white/85">
        {b.lead}
        {Array.from({ length: b.keys }, (_, i) => (
          <span key={i} className="text-lime" style={until(k0 + (i + 1) * KEY_MS)}>
            *
          </span>
        ))}
        <Parked from={b.at + 200} to={b.next} />
      </Row>
    );
  }
  if (b.t === "ok") {
    return (
      <Row
        style={until(b.at)}
        className="font-semibold text-lime"
        glyph={
          <span aria-hidden className="flex size-[13px] bg-lime pt-[4px] pl-[3px] text-ink">
            <BbCheck />
          </span>
        }
      >
        {b.text}
      </Row>
    );
  }
  return (
    <Row style={until(b.at)} className="text-white/80">
      {b.text}
    </Row>
  );
}

/** The whole transcript. Memoised: nothing in it re-renders while it plays. */
const Transcript = memo(function Transcript() {
  return (
    <div aria-hidden className="flex flex-col gap-1 px-4 py-5 font-mono text-[13px] leading-[1.7] sm:px-6 sm:text-[14px] lg:text-[13px] xl:text-[14px]">
      {BEATS.map((b, i) => (
        <div key={i} className={cn(i === VERIFY.length && "mt-4 border-t border-dashed border-night-line pt-4")}>
          <BeatRow b={b} />
        </div>
      ))}
      <Row glyph={prompt} style={until(END)} className="mt-1 text-mint-pale">
        <span className="animate-caret bg-mint-pale"> </span>
      </Row>
    </div>
  );
});

/** Title-bar status: locked until the verifier passes, then verified, then running. */
function Status() {
  return (
    <span className="grid justify-items-end [&>*]:col-start-1 [&>*]:row-start-1">
      <span className="invisible flex items-center gap-2 text-pink-soft" style={between(0, VERIFIED)}>
        <span className="size-[7px] bg-pink" />
        locked
      </span>
      <span className="invisible flex items-center gap-2 text-lime" style={between(VERIFIED, UNLOCKED)}>
        <span className="size-[7px] bg-lime" />
        verified
      </span>
      <span className="flex items-center gap-2 text-mint" style={until(UNLOCKED)}>
        <span className="size-[7px] bg-mint" />
        running
      </span>
    </span>
  );
}

const MOTION_OK = "(prefers-reduced-motion: no-preference)";
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MOTION_OK);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const canMove = () => window.matchMedia(MOTION_OK).matches;
const cannotMove = () => false;

/**
 * The unlock, played as a terminal session: verify, unlock, then prove the
 * memory is encrypted and the guest-agent port is absent. Plays while it is on
 * screen and pauses off it; reduced motion and no-script show the last frame.
 */
export function BlackboxTerminal({ className }: { className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const motion = useSyncExternalStore(subscribe, canMove, cannotMove);
  const [onScreen, setOnScreen] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !motion) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      // Starts as the window's top edge comes in, so typing begins where the eye lands first.
      rootMargin: "0px 0px -6% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [motion]);

  const state = !motion ? "static" : onScreen ? "run" : "paused";

  return (
    <figure ref={ref} data-bb={state} className={cn("relative flex flex-col border border-night-line bg-night-2", className)}>
      <style>{CSS}</style>
      <div
        key={`bar${run}`}
        aria-hidden
        className="flex h-10 items-center gap-3 border-b border-night-line bg-night-3 px-4 font-mono text-[12px] leading-none"
      >
        <span className="flex shrink-0 gap-[5px]">
          <span className="size-2 bg-mint" />
          <span className="size-2 bg-lime opacity-30" />
          <span className="size-2 bg-pink opacity-30" />
        </span>
        <span className="min-w-0 flex-1 truncate text-center text-white/80">your computer — ssh</span>
        <Status />
      </div>

      <div key={run} className="flex-1">
        <Transcript />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-night-line px-4 py-3 font-mono text-[12px] text-white/70 sm:px-6">
        <span>› type the passphrase only over SSH, after a PASS</span>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          aria-label="Replay the unlock session"
          className="inline-flex h-7 shrink-0 items-center gap-2 border border-night-line px-2.5 text-white/80 transition-colors hover:border-mint-pale hover:text-mint-pale motion-reduce:hidden"
        >
          <span aria-hidden>↺</span>
          replay
        </button>
      </div>

      <figcaption className="sr-only">
        A terminal session. First, on your own computer, the verifier: {VERIFY.map((l) => l.s.trim()).join("; ")}.
        Then the unlock: {unlockTranscript.map((l) => l.s.trim()).join("; ")}.
      </figcaption>
    </figure>
  );
}
