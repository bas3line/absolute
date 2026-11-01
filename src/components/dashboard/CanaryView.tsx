"use client";

import { useEffect, useRef, useState } from "react";
import { cn, usePrefersReducedMotion } from "@/components/kit";
import { brand } from "@/lib/brand";
import { B64, prng } from "./data";
import { BIRD_OPEN, BIRD_PALETTE, BIRD_SHUT } from "./glyphs";
import { CopyButton, DISPLAY, Icon, LABEL, MUTED, PageHeader, Panel, Pixels, motion } from "./ui";

/*
 * The last twelve statements, one a month, dated on the day of brand.canaryUpdated. Each carries
 * a proof of freshness: a Bitcoin block from the day of signing.
 * Block heights are masked and hashes truncated: in this demo they are placeholders, not records.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Bitcoin: about 144 blocks a day. Only the leading digits are shown, so an estimate is enough.
const LATEST_BLOCK = 973_600;
const BLOCKS_PER_MONTH = 4_380;
const HEX = "0123456789abcdef";
const STATEMENTS = [
  "We have NOT received any National Security Letters or FISA court orders.",
  "We have NOT received any gag orders preventing disclosure of government requests.",
  "We have NOT been compelled to hand over encryption keys or implement backdoors.",
  "We have NOT been subject to any search or seizure of our servers.",
  "No law enforcement agency has requested or obtained user data from us.",
];
const VERIFY = "gpg --verify canary.txt.asc";

const pad = (n: number) => String(n).padStart(2, "0");
const DAY = Number(brand.canaryUpdated.slice(8, 10));
function monthly(y: number, m: number) {
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return { y: yy, m: mm, iso: `${yy}-${pad(mm + 1)}-${pad(Math.min(DAY, last))}` };
}
function maskBlock(n: number) {
  const s = String(Math.floor(n / 10_000));
  return `${s}x,xxx`;
}

const [Y, M] = brand.canaryUpdated.split("-").map(Number);
const HISTORY = Array.from({ length: 12 }, (_, i) => {
  const back = 11 - i;
  const at = monthly(Y, M - 1 - back);
  const next = monthly(Y, M - back);
  const r = prng(at.y * 12 + at.m);
  const pick = (set: string, k: number) => Array.from({ length: k }, () => set[(r() * set.length) | 0]).join("");
  return {
    date: at.iso,
    file: `canary-${at.y}-${pad(at.m + 1)}.txt.asc`,
    month: MONTHS[at.m],
    next: next.iso,
    block: maskBlock(LATEST_BLOCK - back * BLOCKS_PER_MONTH),
    hash: `0000…${pick(HEX, 4)}`,
    sig: Array.from({ length: 3 }, (_, j) => (j === 0 ? `iHUEARYKAB0WIQ${pick(B64, 50)}` : pick(B64, j === 2 ? 32 : 64))),
    crc: pick(B64, 4),
  };
});
const LATEST = HISTORY.length - 1;

const PROMISES = [
  "Updated and re-signed every month.",
  "Carries a Bitcoin block hash from the day it's signed, so it can't be written in advance.",
  "PGP-signed. Import the key once, then gpg --verify each statement.",
  "If it disappears, goes stale, or the signature fails verification, assume the worst.",
];

function Bird() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(el);
    const id = window.setInterval(() => {
      if (visible && !document.hidden) setTick((t) => t + 1);
    }, 230);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [reduced]);
  const phrase = tick % 12;
  const open = reduced || (phrase < 8 && phrase % 2 === 0);
  const notes = [0, 1, 2].map((k) => {
    const age = reduced ? k * 2 : (tick + k * 3) % 7;
    return { x: 16 + k * 2 + (age > 3 ? 1 : 0), y: 5 - age, a: Math.max(0.2, 1 - age / 7) };
  });
  return (
    <div ref={ref} className="relative" aria-hidden>
      <Pixels rows={open ? BIRD_OPEN : BIRD_SHUT} palette={BIRD_PALETTE} scale={7} />
      <svg viewBox="0 0 22 16" width={154} height={112} shapeRendering="crispEdges" className="absolute inset-0">
        {notes.map((n, k) => (n.y >= 0 ? <rect key={k} x={n.x} y={n.y} width={1} height={1} fill="var(--accent)" opacity={n.a} /> : null))}
      </svg>
    </div>
  );
}

export function CanaryView() {
  const [selected, setSelected] = useState(LATEST);
  const entry = HISTORY[selected];
  const latest = HISTORY[LATEST];

  return (
    <div className={motion.rise}>
      <PageHeader
        eyebrow="Warrant canary"
        lead="The canary is still singing."
        trail="Re-signed every month."
        intro="A signed statement that nothing has happened we can't talk about. If it disappears, goes stale, or the signature fails verification, assume the worst."
      />

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Panel
          as="article"
          className="xl:self-start"
          title={entry.file}
          status={
            <span className="inline-flex items-center gap-1.5 text-accent">
              <Icon name="check" scale={1.5} /> PGP-signed
            </span>
          }
          live
        >
          <div className="px-5 py-6 font-mono text-[12.5px] leading-[1.75] text-ink-2 sm:px-8 sm:py-8">
            <p className={MUTED}>-----BEGIN PGP SIGNED MESSAGE-----</p>
            <p className={MUTED}>Hash: SHA512</p>
            <p className="mt-5 text-ink">
              absolute · warrant canary · <time dateTime={entry.date}>{entry.date}</time>
            </p>
            <p className="mt-5 text-ink">As of {entry.date}:</p>
            <ol className="mt-2 space-y-1">
              {STATEMENTS.map((s, i) => (
                <li key={s} className="flex gap-3 text-pretty text-ink">
                  <span className="w-4 shrink-0 text-right font-medium text-accent">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-pretty text-ink">This statement is updated and re-signed monthly.</p>
            <p className="mt-5 break-words">
              Proof of freshness: Bitcoin block {entry.block}, mined {entry.date}, hash {entry.hash}
            </p>
            <p>Next statement due: {entry.next}</p>
            <p className={cn("mt-5", MUTED)}>-----BEGIN PGP SIGNATURE-----</p>
            <span className="sr-only">Signature block.</span>
            <div aria-hidden className={cn("mt-2 break-all", MUTED)}>
              {entry.sig.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              <p>={entry.crc}</p>
            </div>
            <p className={MUTED}>-----END PGP SIGNATURE-----</p>
            <p className={cn("mt-4 font-sans text-[12px] leading-snug", MUTED)}>
              Demo copy: block height masked, hash and signature are placeholders.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-night bg-night px-5 py-3 font-mono text-[12.5px] text-white/80">
            <p>
              <span className="text-mint">verify with:</span> <code className="text-white">{VERIFY}</code>
            </p>
            <CopyButton text={VERIFY} dark />
          </div>
        </Panel>

        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex items-end justify-between gap-6 border-b border-line pb-6">
            <Bird />
            <dl className="text-right font-mono text-[11.5px] leading-relaxed">
              <dt className={MUTED}>status</dt>
              <dd className="text-accent">singing</dd>
              <dt className={cn("mt-2", MUTED)}>last signed</dt>
              <dd className="text-ink">{latest.date}</dd>
              <dt className={cn("mt-2", MUTED)}>next due</dt>
              <dd className="text-ink">{latest.next}</dd>
            </dl>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className={LABEL}>Last 12 statements</h2>
              <p className="font-mono text-[11.5px] text-ink-2">one a month</p>
            </div>
            <ol className="mt-4 grid grid-cols-12 gap-1 sm:gap-1.5">
              {HISTORY.map((c, i) => {
                const on = i === selected;
                return (
                  <li key={c.date}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`Canary signed ${c.date}`}
                      onClick={() => setSelected(i)}
                      className="group block w-full"
                    >
                      <span className={cn("block aspect-square w-full transition-colors", on ? "bg-accent" : "bg-accent-mid group-hover:bg-mint")} />
                      <span aria-hidden className={cn("mt-2 block text-center font-mono text-[11px]", on ? "font-semibold text-accent" : MUTED)}>
                        {c.month[0]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className={cn("mt-3 font-mono text-[11.5px]", MUTED)}>
              Showing <span className="text-ink">{entry.date}</span>. Pick a month to read it.
            </p>
          </div>

          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {PROMISES.map((p) => (
              <li key={p} className="flex items-start gap-3.5 py-3.5 text-[16px] leading-relaxed text-ink">
                <Icon name="check" className="mt-[6px] text-accent" />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <p className={cn("text-balance text-[24px] leading-[1.1] text-ink", DISPLAY)}>
            A canary sings until it can&rsquo;t. <span className="text-accent">Silence is the message.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
