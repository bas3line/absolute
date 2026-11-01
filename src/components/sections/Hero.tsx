import { Fragment, type CSSProperties } from "react";
import { CtaButton, Kicker, Wide } from "@/components/kit";
import { panelDemo } from "@/lib/brand";
import { blackbox, coins, fmt, locations, planCount } from "@/lib/catalog";
import { HeroIsland } from "./HeroIsland";

// The copy rises in on load. CSS only, so it shows without JavaScript.
const RISE = "motion-safe:animate-[rise_800ms_cubic-bezier(0.2,0.7,0.2,1)_both]";
const after = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

// Small counts read better as words in a sentence.
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const say = (n: number) => WORDS[n] ?? String(n);

// Every coin, then the two ways to pay without one.
const PAY = [...coins, "cash by mail", "card"];

// What is asked of you, and what you get. An empty pixel for nothing asked; a lit one for what there is.
const STATS = [
  { value: "0", label: "emails asked", lit: false },
  { value: "0", label: "KYC checks", lit: false },
  // Credentials are in the panel about 30 seconds after payment confirms.
  { value: "~30s", label: "to a live server", lit: true },
  { value: String(locations.length), label: "locations", lit: true },
  { value: String(planCount), label: "plans", lit: true },
] as const;

/**
 * The first screen. Copy on the left, the island on the right (under the copy
 * on phones), and along the foot a rail of the numbers that matter: zeros for
 * what is asked of you, then what you get.
 */
export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-bg">
      <div className="flex flex-col pt-16 lg:min-h-[min(100svh,1000px)]">
        <Wide className="grid flex-1 items-center gap-x-8 gap-y-12 pt-10 pb-12 sm:pt-14 lg:grid-cols-2 lg:pt-8 lg:pb-10 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] xl:gap-x-12">
          <div>
            <Kicker className={RISE}>No email · No KYC · No logs</Kicker>
            <h1
              id="hero-title"
              className={`mt-6 font-display text-[clamp(3.1rem,7.2vw,7.4rem)] leading-[0.92] font-extrabold tracking-[-0.045em] text-balance text-ink [font-variation-settings:'opsz'_96] ${RISE}`}
              style={after(60)}
            >
              Servers that never learn your name.
            </h1>
            <p
              className={`mt-7 max-w-[34rem] text-[18px] leading-relaxed text-pretty text-ink-2 sm:text-[20px] ${RISE}`}
              style={after(140)}
            >
              Anonymous VPS and VDS in {say(locations.length)} locations, and Blackbox: a VPS whose memory not even the
              host can read. Pay in crypto, cash or card. We never ask who you are.
            </p>
            <div className={`mt-9 flex flex-wrap items-center gap-3 ${RISE}`} style={after(220)}>
              <CtaButton href="#blackbox" size="lg">
                Deploy a Blackbox — from {fmt(blackbox[0].usd)}/mo
              </CtaButton>
              <CtaButton href="#pricing" size="lg" tone="ink">
                All {planCount} plans
              </CtaButton>
            </div>
            <p className={`mt-5 font-mono text-[12px] leading-relaxed text-ink-3 ${RISE}`} style={after(280)}>
              {/* Lines break between ways to pay, never inside one, and never before a dot. */}
              {PAY.map((m, i) => (
                <Fragment key={m}>
                  {i > 0 ? " " : null}
                  <span className="whitespace-nowrap">
                    {m}
                    {i < PAY.length - 1 ? " ·" : null}
                  </span>
                </Fragment>
              ))}
            </p>
            {/* The way into the panel: the demo credential types itself in at the gate. */}
            <a
              href={panelDemo}
              className={`group mt-8 flex max-w-[34rem] items-center gap-3.5 border border-line-2 bg-paper py-3 pr-4 pl-3 transition-colors hover:border-ink ${RISE}`}
              style={after(340)}
            >
              <span aria-hidden className="grid size-9 shrink-0 place-items-center bg-ink">
                <span className="size-3 bg-mint" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-ink">Open the control panel</span>
                <span className="block font-mono text-[11.5px] leading-snug text-ink-3">
                  a working demo: deploy, reboot and shred boxes in this tab
                </span>
              </span>
              <span aria-hidden className="text-ink-2 transition-transform group-hover:translate-x-0.5 group-hover:text-ink">
                →
              </span>
            </a>
          </div>

          <HeroIsland className="mx-auto max-w-[680px]" />
        </Wide>

        <Wide className="pb-6 lg:pb-8">
          <dl className="grid grid-cols-3 border-t border-line-2 lg:grid-cols-5">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={[
                  "flex flex-col-reverse justify-end gap-2.5 border-line py-5 pr-3 lg:py-6",
                  // Three across on phones, five from lg; a hairline between neighbours, none at a row's start.
                  i % 3 === 0 ? "" : "border-l pl-4 sm:pl-6",
                  i >= 3 ? "max-lg:border-t" : "",
                  i === STATS.length - 1 ? "max-lg:col-span-2" : "",
                  i > 0 ? "lg:border-l lg:pl-6" : "",
                ].join(" ")}
              >
                <dt className="flex items-start gap-2 font-mono text-[11px] leading-snug text-ink-3 sm:text-[12px]">
                  <span
                    aria-hidden
                    className={`mt-[3px] size-[7px] shrink-0 ${s.lit ? "bg-mint" : "border border-ink-3"}`}
                  />
                  {s.label}
                </dt>
                <dd className="font-display text-[clamp(2.4rem,4.4vw,4rem)] leading-none font-extrabold tracking-[-0.04em] text-ink [font-variation-settings:'opsz'_96]">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </Wide>
      </div>
    </section>
  );
}
