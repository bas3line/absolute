"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Reveal, Title, cn, copyText } from "@/components/kit";
import { CanaryBird } from "@/components/sections/CanaryBird";
import { brand } from "@/lib/brand";

/* ------------------------------------------------------------------ */
/* This year's canaries, derived from brand.canaryUpdated.             */
/* Everything is seeded, so server and client render the same bytes.  */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/*
 * PLACEHOLDERS until the first real canary is signed: the Bitcoin block, its
 * time and hash, the key fingerprint and the site address. They are plausible
 * (the height follows the chain at about 144 blocks a day) but not real; swap
 * them for the signed file's values, and everything below derives from them.
 */
const SITE = "https://absolute.example";
const LATEST_BLOCK = 973_588;
const LATEST_MINED = "08:14:27";
const LATEST_SIGNED = "08:31:05";
const LATEST_HASH = "000000000000000000013c7a5e92d04bf1863ac9e27d5b0f48e6a1d3c9b2f57e";
const FINGERPRINT = "C7A1 0E4D 5B38 92F6 1D0C  A4E7 3F95 2D81 61F0 3B92";
const FPR = FINGERPRINT.replace(/\s+/g, "");
const UID = "absolute canary";
const BLOCKS_PER_DAY = 144; // a block every ten minutes

const HEX = "0123456789abcdef";
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const STATEMENTS = [
  "We have NOT received any National Security Letters or FISA court orders.",
  "We have NOT received any gag orders preventing disclosure of government requests.",
  "We have NOT been compelled to hand over encryption keys or implement backdoors.",
  "We have NOT been subject to any search or seizure of our servers.",
  "No law enforcement agency has requested or obtained user data from us.",
];

const IMPORT_CMD = `curl -s ${SITE}/pgp.txt | gpg --import`;

type Entry = {
  month: number;
  date: string;
  file: string;
  next: string;
  block: number;
  /** "2026-10-30 08:14:27", UTC. */
  mined: string;
  hash: string;
  /** The signature time as gpg prints it: "Fri Oct 30 08:31:05 2026 UTC". */
  signed: string;
  sig: string[];
  crc: string;
};

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The 30th of a month, or its last day when it has no 30th. `m` is 0-based and may overflow. */
function thirtieth(y: number, m: number) {
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return `${yy}-${pad(mm + 1)}-${pad(Math.min(30, last))}`;
}

const utc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** "2026-10-30", "08:31:05" → "Fri Oct 30 08:31:05 2026 UTC", gpg's C-locale date. */
function gpgDate(iso: string, time: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${DAY_NAMES[new Date(utc(iso)).getUTCDay()]} ${MONTH_NAMES[m - 1].slice(0, 3)} ${d} ${time} ${y} UTC`;
}

const clock = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;

const [Y, M] = brand.canaryUpdated.split("-").map(Number);
/** This month, 0-based: the latest canary was signed in it. */
const NOW = M - 1;
const LATEST_DATE = thirtieth(Y, NOW);

const SIGNED: Entry[] = Array.from({ length: NOW + 1 }, (_, m) => {
  const back = NOW - m;
  const r = seeded(Y * 12 + m);
  const pick = (set: string, k: number) => Array.from({ length: k }, () => set[(r() * set.length) | 0]).join("");
  const date = thirtieth(Y, m);
  // Older canaries: a block on the morning of the 30th, the chain's height then, signed a few minutes later.
  const days = Math.round((utc(LATEST_DATE) - utc(date)) / 86_400_000);
  const minedAt = 6 * 3600 + Math.floor(r() * 9 * 3600);
  const signedAt = minedAt + 360 + Math.floor(r() * 1800);
  // A real block hash opens with nineteen zeros, then a nonzero digit.
  const hash = `${"0".repeat(19)}${pick("123456789abcdef", 1)}${pick(HEX, 44)}`;
  return {
    month: m,
    date,
    file: back === 0 ? "canary.txt" : `canary-${Y}-${pad(m + 1)}.txt`,
    next: thirtieth(Y, m + 1),
    block: back === 0 ? LATEST_BLOCK : LATEST_BLOCK - days * BLOCKS_PER_DAY + Math.round((r() - 0.5) * 40),
    mined: `${date} ${back === 0 ? LATEST_MINED : clock(minedAt)}`,
    hash: back === 0 ? LATEST_HASH : hash,
    signed: gpgDate(date, back === 0 ? LATEST_SIGNED : clock(signedAt)),
    // An ed25519 signature is short: two full armour lines and a tail.
    sig: [`iHUEARYKAB0WIQ${pick(B64, 50)}`, pick(B64, 64), pick(B64, 28)],
    crc: pick(B64, 4),
  };
});

const LATEST = SIGNED.length - 1;

/** "2026-10-30" → "30 October", spelled out by hand so server and client agree. */
function dayMonth(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH_NAMES[m - 1]}`;
}

/* ------------------------------------------------------------------ */
/* Rack hardware                                                       */
/* ------------------------------------------------------------------ */

/** A slotted screw head, 7px, for panel corners. */
function Screw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 7" aria-hidden className={cn("absolute size-[7px]", className)}>
      <circle cx="3.5" cy="3.5" r="3" fill="var(--night-2)" stroke="var(--night-line)" />
      <path d="M1.9 5.1 5.1 1.9" stroke="var(--mint-pale)" strokeOpacity="0.55" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The year, as a row of lit pixels on a rack panel                    */
/* ------------------------------------------------------------------ */

// The bird's perch and the pixels share these columns. At lg the panel is narrow, so the gaps close up.
const COLS = "grid grid-cols-12 gap-1.5 px-5 sm:gap-2.5 sm:px-7 lg:gap-1.5 xl:gap-2.5";

function Calendar({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  const latest = SIGNED[LATEST];
  return (
    <div>
      {/* The bird perches on the panel, over this month. */}
      <div aria-hidden className={COLS}>
        <div className="flex justify-center" style={{ gridColumnStart: NOW + 1 }}>
          <CanaryBird className="-mb-px w-[72px] shrink-0 sm:w-[92px]" />
        </div>
      </div>

      <div className="relative bg-night pt-5 pb-6 text-white sm:pt-6">
        <Screw className="top-2 left-2" />
        <Screw className="top-2 right-2" />
        <Screw className="bottom-2 left-2" />
        <Screw className="right-2 bottom-2" />

        <div className="flex items-center gap-3 px-5 font-mono text-[11px] tracking-[0.16em] text-white/70 uppercase sm:px-7">
          <span className="border border-night-line px-1.5 py-0.5 tracking-normal text-mint-pale">U1</span>
          <span>canary · {Y}</span>
          <span aria-hidden className="ml-auto flex gap-[3px]">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="h-3 w-[3px] bg-night-3" />
            ))}
          </span>
        </div>

        <ol aria-label={`Canaries in ${Y}. Pick a month to read it.`} className={cn(COLS, "mt-5")}>
          {Array.from({ length: 12 }, (_, m) => {
            const entry = SIGNED[m];
            const initial = MONTH_NAMES[m][0];
            if (!entry) {
              return (
                <li key={m}>
                  <span aria-hidden className="block aspect-square w-full border border-white/35" />
                  <span aria-hidden className="mt-2.5 block text-center font-mono text-[11px] leading-[15px] text-white/70">
                    {initial}
                  </span>
                  <span className="sr-only">
                    {MONTH_NAMES[m]} {Y}, due {thirtieth(Y, m)}
                  </span>
                </li>
              );
            }
            const on = m === selected;
            const current = m === NOW;
            return (
              <li key={m}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`${MONTH_NAMES[m]} ${Y}, signed ${entry.date}${current ? ", this month" : ""}`}
                  onClick={() => onSelect(m)}
                  className="group block w-full focus-visible:outline-offset-4 focus-visible:outline-mint-pale"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "relative block aspect-square w-full transition-colors",
                      current ? "bg-lime group-hover:bg-lime-hi" : "bg-mint group-hover:bg-mint-hi",
                    )}
                  >
                    {current ? (
                      <span className="absolute -inset-[3px] border border-lime motion-safe:animate-pulse" />
                    ) : null}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-2.5 block text-center font-mono text-[11px] leading-[15px] transition-colors",
                      on ? "bg-mint-pale text-night" : "text-white/70 group-hover:text-white",
                    )}
                  >
                    {initial}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <dl className="mx-5 mt-6 grid grid-cols-3 gap-x-4 border-t border-night-line pt-4 font-mono sm:mx-7">
          <div>
            <dt className="text-[11px] tracking-[0.12em] text-white/70 uppercase">On time</dt>
            <dd className="mt-1 text-[13px] text-mint sm:text-[14px]">
              {NOW + 1} of {NOW + 1}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-[0.12em] text-white/70 uppercase">Signed</dt>
            <dd className="mt-1 text-[13px] text-white sm:text-[14px]">{latest.date}</dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-[0.12em] text-white/70 uppercase">Next due</dt>
            <dd className="mt-1 text-[13px] text-lime sm:text-[14px]">{latest.next}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The signed message                                                  */
/* ------------------------------------------------------------------ */

function Check() {
  return (
    <svg viewBox="0 0 7 6" width={14} height={12} shapeRendering="crispEdges" aria-hidden className="shrink-0">
      <path d="M6 0h1v1H6zM5 1h2v1H5zM0 2h1v1H0zM4 2h2v1H4zM0 3h2v1H0zM3 3h2v1H3zM1 4h3v1H1zM2 5h1v1H2z" fill="var(--mint)" />
    </svg>
  );
}

/** A command line on paper: the prompt in deep mint, the command free to wrap at its spaces. */
function Prompt({ children }: { children: string }) {
  return (
    <p className="grid grid-cols-[1.25rem_minmax(0,1fr)] text-ink">
      <span aria-hidden className="text-accent select-none">
        $
      </span>
      <code className="[overflow-wrap:anywhere]">{children}</code>
    </p>
  );
}

type Out = { p: string; s: string; tone: "cmd" | "out" | "ok" | "warn"; indent?: boolean };

const OUT_TONE = {
  cmd: "text-white",
  out: "text-white/75",
  ok: "text-mint",
  warn: "text-pink-soft",
} as const;

function Document({ entry, current }: { entry: Entry; current: boolean }) {
  const latest = SIGNED[LATEST];
  const verifyCmd = `curl -s ${SITE}/${entry.file} | gpg --verify`;
  const both = `${IMPORT_CMD}\n${verifyCmd}`;
  const outId = useId();

  const [ran, setRan] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const ok = await copyText(both);
    // Both clipboard routes blocked: say so, and leave the commands on screen to copy by hand.
    setCopied(ok);
    setFailed(!ok);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        setCopied(false);
        setFailed(false);
      },
      ok ? 1600 : 3200,
    );
  };

  // What gpg prints for this month: the key going in, then the signature it checks.
  const out: Out[] = [
    { p: "$", s: IMPORT_CMD, tone: "cmd" },
    { p: "gpg:", s: `key ${FPR.slice(-16)}: public key "${UID}" imported`, tone: "out" },
    { p: "gpg:", s: "Total number processed: 1", tone: "out" },
    { p: "gpg:", s: "imported: 1", tone: "out", indent: true },
    { p: "$", s: verifyCmd, tone: "cmd" },
    { p: "gpg:", s: `Signature made ${entry.signed}`, tone: "out" },
    { p: "gpg:", s: `using EDDSA key ${FPR}`, tone: "out", indent: true },
    { p: "gpg:", s: `Good signature from "${UID}" [unknown]`, tone: "ok" },
    { p: "gpg:", s: "WARNING: This key is not certified with a trusted signature!", tone: "warn" },
    { p: "gpg:", s: "There is no indication that the signature belongs to the owner.", tone: "warn", indent: true },
    { p: "", s: `Primary key fingerprint: ${FINGERPRINT}`, tone: "cmd" },
  ];
  const verdict = current
    ? `# the fingerprint matches the one above. Good until ${entry.next}.`
    : `# superseded by ${latest.file}, signed ${latest.date}.`;

  return (
    <figure aria-label={`Warrant canary signed ${entry.date}`} className="border border-line-2 bg-paper">
      <div className="flex h-11 items-center gap-3 bg-night px-4 font-mono text-[12px] sm:px-6">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-[7px] bg-mint motion-safe:animate-pulse" />
          <span className="size-[7px] bg-lime" />
          <span className="size-[7px] bg-pink" />
        </span>
        <span className="truncate text-mint-pale">{entry.file}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2 text-mint">
          <Check />
          good <span className="max-sm:hidden">signature</span>
        </span>
      </div>

      <div className="px-5 py-7 font-mono text-[13px] leading-[1.8] text-ink sm:px-8 sm:py-8 sm:text-[14px]">
        <p className="text-ink-3">-----BEGIN PGP SIGNED MESSAGE-----</p>
        <p className="text-ink-3">Hash: SHA512</p>

        <p className="mt-5 font-medium">
          As of <time dateTime={entry.date}>{entry.date}</time>:
        </p>
        <ol className="mt-3 space-y-2">
          {STATEMENTS.map((s, i) => (
            <li key={s} className="flex items-baseline gap-3.5">
              <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center bg-mint font-medium text-ink">
                {i + 1}
              </span>
              <span className="text-pretty">{s}</span>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-pretty">This statement is updated and re-signed monthly.</p>
        <p className="mt-2 text-pretty">
          Proof of freshness: Bitcoin block <span className="bg-lime px-1">{entry.block}</span>, mined{" "}
          {entry.mined} UTC, hash <span className="break-all">{entry.hash}</span>
        </p>

        <p className="mt-6 text-ink-3">-----BEGIN PGP SIGNATURE-----</p>
        <span className="sr-only">Signature block.</span>
        {/* One run of base64 that fills the measure, so a narrow column never strands a two-letter line. */}
        <div aria-hidden className="mt-4 text-ink-3">
          <p className="break-all">{entry.sig.join("")}</p>
          <p>={entry.crc}</p>
        </div>
        <p className="text-ink-3">-----END PGP SIGNATURE-----</p>
      </div>

      <div className="border-t border-line-2 px-5 py-5 sm:px-8 sm:py-6">
        <div className="font-mono text-[13px] leading-[1.75] sm:text-[14px]">
          <p className="text-ink-3"># import the key, first time only</p>
          <Prompt>{IMPORT_CMD}</Prompt>
          <p className="mt-2 text-ink-3"># verify {current ? "the canary" : "this month's canary"}</p>
          <Prompt>{verifyCmd}</Prompt>
        </div>
        <p className="mt-4 font-mono text-[12px] leading-relaxed text-ink-3">
          Key fingerprint <span className="text-ink [overflow-wrap:anywhere]">{FINGERPRINT}</span>
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-10 items-center border border-line-2 px-4 font-mono text-[12px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
          >
            {copied ? "copied" : failed ? "select them" : "copy both"}
          </button>
          <button
            type="button"
            aria-expanded={ran}
            aria-controls={outId}
            onClick={() => setRan((r) => !r)}
            className="notch group inline-flex h-10 items-center gap-3 bg-ink pr-5 pl-4 text-sm font-medium text-paper transition-colors hover:bg-night-3"
          >
            {ran ? "Hide output" : "Show the output"}
            <span aria-hidden className={cn("transition-transform", ran ? "rotate-[-90deg]" : "group-hover:translate-x-0.5")}>
              →
            </span>
          </button>
        </div>
        <span className="sr-only" aria-live="polite">
          {copied ? "Commands copied." : failed ? "Copy failed, select the commands." : ""}
        </span>
      </div>

      <div id={outId} hidden={!ran} className="bg-night px-5 py-5 font-mono text-[12px] leading-[1.75] sm:px-8 sm:py-6 sm:text-[13px]">
        {/* Keyed by month, so picking another one runs the commands again. */}
        <ol key={entry.date} aria-label="What gpg prints">
          {out.map((l, i) => (
            <li
              key={i}
              style={{ transitionDelay: `${i * 110}ms` }}
              className={cn(
                "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2 transition-[opacity,translate] duration-300 starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none",
                l.tone === "cmd" && l.p === "$" && i > 0 && "mt-3",
              )}
            >
              {l.p ? <span className={l.p === "$" ? "text-mint select-none" : "text-white/70"}>{l.p}</span> : null}
              <span
                className={cn(
                  "[overflow-wrap:anywhere]",
                  OUT_TONE[l.tone],
                  l.indent && "pl-[2ch] sm:pl-[4ch]",
                  !l.p && "col-span-2",
                )}
              >
                {l.s}
              </span>
            </li>
          ))}
          <li
            style={{ transitionDelay: `${out.length * 110 + 120}ms` }}
            className="mt-3 text-mint-pale transition-opacity duration-300 starting:opacity-0 motion-reduce:transition-none"
          >
            {verdict}
          </li>
        </ol>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Title and calendar on the left, the document on the right           */
/* ------------------------------------------------------------------ */

export function CanaryRecord() {
  const [selected, setSelected] = useState(LATEST);
  const latest = SIGNED[LATEST];

  return (
    <div className="grid gap-y-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-12 lg:[grid-template-areas:'title_title'_'cal_doc'] xl:grid-cols-[minmax(0,1fr)_minmax(0,37rem)] xl:grid-rows-[auto_1fr] xl:gap-x-20 xl:gap-y-14 xl:[grid-template-areas:'title_doc'_'cal_doc']">
      <Reveal className="min-w-0 lg:[grid-area:title]">
        <Title
          id="canary-title"
          kicker="Warrant canary"
          sub={
            <>
              If it goes stale, disappears or fails to verify, assume the worst. A canary sings until it can&rsquo;t;
              silence is the message.
            </>
          }
        >
          The canary was signed on <time dateTime={latest.date}>{dayMonth(latest.date)}</time>. It is signed again
          every month.
        </Title>
      </Reveal>

      {/* The document runs longer than the panel, so the panel keeps pace with it. */}
      <Reveal delay={80} className="min-w-0 lg:[grid-area:cal]">
        <div className="lg:sticky lg:top-24">
          <Calendar selected={selected} onSelect={setSelected} />
        </div>
      </Reveal>

      <Reveal delay={140} className="min-w-0 lg:[grid-area:doc]">
        <Document entry={SIGNED[selected]} current={selected === LATEST} />
      </Reveal>
    </div>
  );
}
