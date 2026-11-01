"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/kit";
import { blackboxFeatures } from "@/lib/catalog";
import { BbChip, BbHashPixels, BbLeds, BbScrews, BbTick, BbVents } from "@/components/sections/BlackboxArt";

// What goes into the launch measurement, in the measured-boot guide's words.
const INPUTS = [
  { label: "Firmware", file: "OVMF.amdsev.fd", note: "built from public edk2 sources" },
  { label: "Kernel", file: "vmlinuz", note: "Debian's signed kernel, unmodified" },
  { label: "Initramfs", file: "initrd.img", note: "the program that asks for your passphrase" },
  { label: "Command line", file: "cryptopts= ip= bb.*", note: "carries your SSH key and addresses" },
] as const;

// What the verifier checks before it prints PASS.
const CHECKS = [
  "signature chains to AMD's root",
  "measurement equals the one you computed",
  "host key matches the signed report",
] as const;

const measured = blackboxFeatures.find((f) => f.id === "measured") ?? blackboxFeatures[1];
const VERIFY = measured.cmd.replace(/^\$ /, "");
const HOST = VERIFY.split(" ").pop() ?? "203.0.113.7";

const CSS = [
  "@keyframes bbc-x{0%{left:0;opacity:0}5%{opacity:1}30%{left:calc(100% - 6px);opacity:1}33%,100%{left:calc(100% - 6px);opacity:0}}",
  "@keyframes bbc-y{0%{top:0;opacity:0}5%{opacity:1}30%{top:calc(100% - 6px);opacity:1}33%,100%{top:calc(100% - 6px);opacity:0}}",
  "@keyframes bbc-stub{0%{left:0;opacity:0}4%{opacity:1}22%{left:calc(45% - 3px);opacity:1}24%,100%{left:calc(45% - 3px);opacity:0}}",
  "@keyframes bbc-trunk{0%,22%{left:calc(45% - 3px);opacity:0}24%{opacity:1}44%{left:calc(100% - 6px);opacity:1}47%,100%{left:calc(100% - 6px);opacity:0}}",
  "[data-chain=idle] *{animation-play-state:paused!important}",
].join("");

const CYCLE_MS = 5600;

/** A pixel that travels along a connector, one pass per cycle, at its own offset. */
function Runner({ axis, step }: { axis: "x" | "y"; step: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute size-[6px] bg-mint opacity-0 motion-reduce:hidden",
        axis === "x" ? "top-1/2 -mt-[3px]" : "left-1/2 -ml-[3px]",
      )}
      style={{ animation: `bbc-${axis} ${CYCLE_MS}ms linear ${step * (CYCLE_MS * 0.3)}ms infinite` }}
    />
  );
}

/** Arrowhead, pointing right or down, at the end of a connector. */
function Head({ dir }: { dir: "right" | "down" }) {
  return dir === "right" ? (
    <svg aria-hidden viewBox="0 0 8 10" className="absolute top-1/2 right-0 h-[10px] w-2 -translate-y-1/2 fill-peri">
      <path d="M0 0 8 5 0 10Z" />
    </svg>
  ) : (
    <svg aria-hidden viewBox="0 0 10 8" className="absolute bottom-0 left-1/2 h-2 w-[10px] -translate-x-1/2 fill-peri">
      <path d="M0 0h10L5 8Z" />
    </svg>
  );
}

/** Between two stages: a line down when they stack, a line across when they sit side by side. */
function Link({ step, converge, className }: { step: number; converge?: boolean; className?: string }) {
  return (
    <li aria-hidden className={cn("relative h-12 xl:h-auto", className)}>
      {/* Stacked: one line down the middle. */}
      <div className="absolute inset-0 xl:hidden">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-peri" />
        <Head dir="down" />
        <Runner axis="y" step={step} />
      </div>

      {/* Side by side. The first link gathers the four inputs onto a bus, then carries them across. */}
      <div className="absolute inset-0 hidden xl:block">
        {converge ? (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" fill="none">
              <path
                d="M0 12.5H45M0 37.5H45M0 62.5H45M0 87.5H45M45 12.5V87.5M45 50H97"
                stroke="var(--peri)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {[12.5, 37.5, 62.5, 87.5].map((y) => (
              <span key={y} className="absolute size-[5px] -translate-1/2 bg-peri" style={{ left: "45%", top: `${y}%` }} />
            ))}
            {[12.5, 37.5, 62.5, 87.5].map((y) => (
              <span
                key={`r${y}`}
                className="absolute -mt-[3px] size-[6px] bg-mint opacity-0 motion-reduce:hidden"
                style={{ top: `${y}%`, animation: `bbc-stub ${CYCLE_MS}ms linear infinite` }}
              />
            ))}
            <span
              className="absolute top-1/2 -mt-[3px] size-[6px] bg-mint opacity-0 motion-reduce:hidden"
              style={{ animation: `bbc-trunk ${CYCLE_MS}ms linear infinite` }}
            />
          </>
        ) : (
          <>
            <span className="absolute inset-x-0 top-1/2 h-px bg-peri" />
            <Runner axis="x" step={step} />
          </>
        )}
        <Head dir="right" />
      </div>
    </li>
  );
}

/** A stage's caption: a numbered mint badge, a title, and where it happens. */
function Caption({ n, title, where, className }: { n: number; title: string; where: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3.5 pb-4", className)}>
      <span
        aria-hidden
        className="notch flex size-9 shrink-0 items-center justify-center bg-mint font-display text-[19px] leading-none font-extrabold text-ink [--notch:7px]"
      >
        {n}
      </span>
      <span>
        <span className="block font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-white">{title}</span>
        <span className="mt-1 block font-mono text-[11px] tracking-[0.16em] text-white/70 uppercase">{where}</span>
      </span>
    </div>
  );
}

function Box({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("relative border border-night-line bg-night-2", className)}>{children}</div>;
}

/**
 * The measured-boot chain as a wiring diagram: four inputs gathered into one
 * launch measurement the CPU signs, checked by the verifier on your computer,
 * and only then the passphrase. Side by side from xl; stacked below it.
 * Mint pixels run the wires while it is on screen and pause off it; reduced
 * motion hides them.
 */
export function BlackboxChain() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-chain={inView ? "run" : "idle"} className="relative border border-night-line bg-night bg-dots">
      <style>{CSS}</style>
      <BbScrews />

      <div
        aria-hidden
        className="flex h-11 items-center justify-between gap-4 border-b border-night-line bg-night-2 px-6 font-mono text-[11px] tracking-[0.16em] text-white/70 uppercase"
      >
        <span className="flex items-center gap-4">
          U1
          <span className="hidden sm:inline">measured boot · AMD SEV-SNP</span>
        </span>
        <span className="flex items-center gap-4">
          <BbVents count={9} className="hidden sm:flex" />
          <BbLeds slot={1} />
        </span>
      </div>

      <ol
        className="grid grid-cols-1 px-4 pt-8 pb-8 sm:px-8 xl:grid-cols-[minmax(0,1.05fr)_56px_minmax(0,1fr)_44px_minmax(0,1fr)_44px_minmax(0,1fr)] xl:grid-rows-[auto_1fr] xl:px-8 xl:pt-10 xl:pb-10"
        aria-label="Measured boot, step by step"
      >
        {/* 1. What boots */}
        <li className="contents">
          <Caption n={1} title="What boots" where="measured at launch" className="xl:col-start-1 xl:row-start-1" />
          <Box className="flex flex-col xl:col-start-1 xl:row-start-2">
            {/* From xl the four rows share the height equally, so the bus taps land on their centres. */}
            <ul className="grid flex-1 sm:grid-cols-2 xl:grid-cols-1 xl:grid-rows-4">
              {INPUTS.map((input, i) => (
                <li
                  key={input.label}
                  className={cn(
                    "flex flex-col justify-center gap-1 px-4 py-3.5 xl:min-h-[82px]",
                    i > 0 && "border-t border-night-line",
                    i === 1 && "sm:max-xl:border-t-0 sm:max-xl:border-l",
                    i === 3 && "sm:max-xl:border-l",
                  )}
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="font-mono text-[11px] tracking-[0.16em] text-white/70 uppercase">{input.label}</span>
                    <span className="font-mono text-[14px] text-mint-pale">{input.file}</span>
                  </span>
                  <span className="text-[15px] leading-snug text-white/80">{input.note}</span>
                </li>
              ))}
            </ul>
          </Box>
        </li>

        <Link step={0} converge className="xl:col-start-2 xl:row-start-2" />

        {/* 2. One measurement, signed by the CPU */}
        <li className="contents">
          <Caption n={2} title="One number" where="signed by the CPU" className="xl:col-start-3 xl:row-start-1" />
          <Box className="flex flex-col gap-4 p-5 xl:col-start-3 xl:row-start-2 xl:px-4">
            <span className="font-mono text-[11px] tracking-[0.16em] text-white/70 uppercase">Launch measurement</span>
            <BbHashPixels seed={11} cells={64} cols={16} className="w-full max-w-[300px]" />
            <p className="text-[16px] leading-snug text-pretty text-white/80">
              Change one byte of the four and this number changes. Nothing the host does can make other bytes produce
              it.
            </p>
            <div className="mt-auto flex items-center gap-4 border-t border-night-line pt-4">
              <BbChip className="size-12 shrink-0" />
              <p>
                <span className="block font-display text-[18px] leading-tight font-bold text-white">Signed in silicon</span>
                <span className="mt-0.5 block font-mono text-[12px] text-white/75">AMD SEV-SNP · EPYC 7B13</span>
              </p>
            </div>
          </Box>
        </li>

        <Link step={1} className="xl:col-start-4 xl:row-start-2" />

        {/* 3. The verifier, at home */}
        <li className="contents">
          <Caption n={3} title="You check it" where="on your own computer" className="xl:col-start-5 xl:row-start-1" />
          <Box className="flex flex-col gap-4 p-5 xl:col-start-5 xl:row-start-2 xl:px-4">
            {/* Continued with a backslash before the flag, so it never wraps mid-flag. */}
            <p className="font-mono text-[13px] leading-snug break-words whitespace-pre-wrap text-mint-pale">
              <span className="text-mint">$</span> {VERIFY.replace(/ --/, " \\\n    --")}
            </p>
            <ul className="flex flex-col gap-2.5">
              {CHECKS.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-[15px] leading-snug text-white/85">
                  <span className="mt-[4px]">
                    <BbTick tone="bg-mint" />
                  </span>
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-auto flex items-center justify-between bg-lime px-4 py-2.5 text-ink">
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase">verdict</span>
              <span className="font-display text-[26px] leading-none font-extrabold tracking-[-0.02em]">PASS</span>
            </p>
          </Box>
        </li>

        <Link step={2} className="xl:col-start-6 xl:row-start-2" />

        {/* 4. Only then, the passphrase */}
        <li className="contents">
          <Caption n={4} title="You unlock it" where="only after a PASS" className="xl:col-start-7 xl:row-start-1" />
          <Box className="flex flex-col gap-3 p-5 xl:col-start-7 xl:row-start-2 xl:px-4">
            <p className="font-mono text-[13px] leading-snug break-words text-mint-pale">
              <span className="text-mint">$</span> ssh root@{HOST} unlock
            </p>
            <p className="font-mono text-[13px] leading-snug break-words text-white/85">
              Please unlock disk root_crypt: <span className="text-lime">********</span>
            </p>
            <p className="flex items-center gap-2.5 font-mono text-[13px] leading-snug font-semibold text-lime">
              <BbTick />
              Disk unlocked. Booting.
            </p>
            <p className="font-mono text-[12px] leading-snug text-white/70">over SSH, never into the console</p>
            <div className="mt-auto border border-pink/70 px-3.5 py-3">
              <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-pink-soft uppercase">
                <span aria-hidden className="size-[7px] bg-pink" />
                On a fail
              </p>
              <p className="mt-1.5 text-[15px] leading-snug text-pretty text-white/85">
                Do not type it. The machine is not what it claims to be.
              </p>
            </div>
          </Box>
        </li>
      </ol>
    </div>
  );
}
