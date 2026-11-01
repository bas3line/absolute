"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { cn, usePrefersReducedMotion } from "@/components/kit";
import { brand } from "@/lib/brand";
import { CREDENTIAL_LENGTH, DEMO_CREDENTIAL, fingerprint, prng } from "./data";
import { GateIsland } from "./GateIsland";
import { DOORWAY } from "./glyphs";
import { useDash } from "./store";
import { Button, DANGER_TEXT, Eyebrow, LABEL, MUTED, Prompt, inputClass, motion } from "./ui";

const CELLS = 24;
// The order the key's cells light in: shuffled once, the same every time.
const ORDER = (() => {
  const r = prng(0x7a4);
  const idx = Array.from({ length: CELLS }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const rank = new Array<number>(CELLS);
  idx.forEach((cell, k) => (rank[cell] = k));
  return rank;
})();
const UNLOCK_MS = 1500;

function validate(raw: string): { credential: string } | { error: string } {
  const credential = raw.replace(/\s+/g, "");
  if (!credential) return { error: "Paste your credential first." };
  if (credential.length !== CREDENTIAL_LENGTH)
    return { error: `A credential is exactly ${CREDENTIAL_LENGTH} characters. That one is ${credential.length}.` };
  return { credential };
}

/** The doorway with its light on, in nine squares. */
function Mark({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 11 11" width={size} height={size} aria-hidden className="shrink-0">
      {DOORWAY.flatMap((row, y) =>
        [...row].map((ch, x) => (
          <rect key={`${x}-${y}`} x={x * 4} y={y * 4} width={3} height={3} fill={ch === "o" ? "var(--accent)" : "var(--ink)"} />
        )),
      )}
    </svg>
  );
}

export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark size={size === "sm" ? 16 : 19} />
      <span className={cn("font-dot font-bold leading-none tracking-[-0.02em] text-ink", size === "sm" ? "text-[21px]" : "text-[26px]")}>
        {brand.name}
      </span>
    </span>
  );
}

export function Gate() {
  const { actions } = useDash();
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [t, setT] = useState(0);
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Arriving from the site's panel links (/dashboard?demo): the demo credential types itself in and unlocks.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("demo")) return;
    const id = window.setTimeout(() => {
      setValue(DEMO_CREDENTIAL);
      setT(0);
      setPending(DEMO_CREDENTIAL);
    }, 450);
    return () => window.clearTimeout(id);
  }, []);

  // The unlock: cells light in a fixed shuffle, three lines print, then the panel opens.
  useEffect(() => {
    if (!pending) return;
    const total = reduced ? 300 : UNLOCK_MS;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / total);
      setT(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else window.setTimeout(() => actions.unlock(pending), reduced ? 0 : 180);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pending, reduced, actions]);

  const go = (raw: string) => {
    const v = validate(raw);
    if ("error" in v) {
      setError(v.error);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setT(0);
    setPending(v.credential);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(value);
  };

  const demo = () => {
    setValue(DEMO_CREDENTIAL);
    go(DEMO_CREDENTIAL);
  };

  const lit = Math.floor(t * CELLS * 1.08);
  const lines = pending
    ? [
        t > 0.05 && `credential ${fingerprint(pending)} accepted`,
        t > 0.38 && "no email, no phone, no name on file",
        t > 0.7 && "opening the demo fleet",
      ].filter(Boolean)
    : [];

  return (
    <div className="relative min-h-dvh bg-bg">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1320px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <div className="flex min-w-0 flex-col px-5 pb-10 pt-6 sm:px-10 lg:pb-12 lg:pl-12 lg:pr-14 lg:pt-10">
          <div className="flex items-center justify-between gap-4">
            <Wordmark />
            <p className={cn("hidden items-center gap-2 font-mono text-[11px] sm:flex", MUTED)}>
              <span aria-hidden className="size-[6px] bg-accent" />
              clearnet · also at {brand.onion}
            </p>
          </div>

          <div className={cn("my-auto pt-14 lg:pt-0", motion.rise)}>
            <Eyebrow>Control panel</Eyebrow>
            <h1 className="mt-5 text-balance font-display text-[clamp(2.3rem,4.2vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink [font-variation-settings:'opsz'_96]">
              Paste your credential.
              <br />
              <span className="text-accent">That&rsquo;s the account.</span>
            </h1>

            <form onSubmit={submit} noValidate className="mt-10 max-w-[30rem]" aria-busy={pending ? true : undefined}>
              <label htmlFor={inputId} className={cn("block", LABEL)}>
                your credential ({CREDENTIAL_LENGTH} characters)
              </label>
              <div className="mt-2.5 flex">
                <input
                  ref={inputRef}
                  id={inputId}
                  name="credential"
                  type="text"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={Boolean(pending)}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="32 random characters"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={cn(error ? errorId : "", hintId) || undefined}
                  className={cn(inputClass(Boolean(error)), "h-12 text-[14px]")}
                />
              </div>
              <p id={errorId} role="alert" className={cn("mt-2 min-h-[1.25rem] font-mono text-[12px]", DANGER_TEXT)}>
                {error}
              </p>

              {pending ? (
                <div className="mt-3" role="status" aria-live="polite">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex gap-[3px]">
                      {Array.from({ length: CELLS }, (_, i) => (
                        <span
                          key={i}
                          className={cn("size-[11px] transition-colors duration-150", ORDER[i] < lit ? (i === CELLS - 1 ? "bg-marker" : "bg-accent") : "bg-bg-3")}
                        />
                      ))}
                    </span>
                    <span className="font-mono text-[12px] text-ink">{t >= 1 ? "unlocked" : "unlocking…"}</span>
                  </div>
                  <ul className="mt-4 space-y-1 font-mono text-[12px] text-ink-2">
                    {lines.map((l) => (
                      <li key={String(l)} className={cn("flex gap-2", motion.fade)}>
                        <span aria-hidden className="text-accent">
                          ›
                        </span>
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <Button type="submit" variant="primary" size="lg">
                    <Prompt />
                    Unlock
                    <span aria-hidden>→</span>
                  </Button>
                  <Button onClick={demo} size="lg" className="text-[13px]">
                    use the demo credential
                  </Button>
                </div>
              )}

              <p id={hintId} className="mt-8 max-w-[36ch] text-pretty text-[16px] leading-relaxed text-ink">
                No email, no phone, no KYC. Keep it safe: there&rsquo;s no address to send a reset to.
              </p>
            </form>
          </div>

          <ul className={cn("mt-12 grid gap-1.5 font-mono text-[11.5px] sm:grid-cols-2", MUTED)}>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-[5px] bg-ink-4" />
              demo: runs in this tab&rsquo;s memory
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-[5px] bg-ink-4" />
              web access logs go to /dev/null
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-[5px] bg-ink-4" />
              live in about 30 seconds
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-[5px] bg-accent" />
              canary signed {brand.canaryUpdated}
            </li>
          </ul>
        </div>

        <div className="relative flex min-w-0 items-center border-t border-line bg-dots px-5 py-10 sm:px-10 lg:border-l lg:border-t-0 lg:px-12 lg:py-12">
          <figure className="w-full">
            <GateIsland scanning={Boolean(pending)} />
            <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-mono text-[11px] leading-relaxed">
              <span className="text-accent">Lights on. Nobody signed the guest book.</span>
              <span className={MUTED}>the credential is the only way up</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
