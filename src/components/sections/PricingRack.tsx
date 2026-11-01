"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { cn, usePrefersReducedMotion } from "@/components/kit";
import { COLS, EARS, PIXEL, PricingBlade } from "@/components/sections/PricingBlade";
import {
  blackboxTerms,
  fmt,
  fromIn,
  lines,
  locations,
  planCount,
  type Line,
  type Location,
  type LocationId,
  type Plan,
} from "@/lib/catalog";

type Filter = "all" | Line;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "blackbox", label: lines.blackbox.name },
  { id: "vds", label: lines.vds.name },
  { id: "vps", label: lines.vps.name },
];

// The line under the filter, worded from catalog.lines.
const EXPLAIN: Record<Filter, string> = {
  all: "VPS shares resources. VDS keeps them to itself. Every plan includes a dedicated IPv4 and full root or RDP access.",
  blackbox: "Zero-knowledge VPS, Montreal only: SEV-SNP encrypted RAM, LUKS2 disk, measured boot, no guest agent.",
  vds: "Dedicated resources: the cores are kept to yourself. Unmetered, dedicated IPv4.",
  vps: "Shared resources: the budget line. Unmetered, dedicated IPv4.",
};

/** Keeps "SEV-SNP" from breaking at its hyphen. */
const unbroken = (s: string) =>
  s.split(/(SEV-SNP)/).map((part, i) =>
    part === "SEV-SNP" ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );

const count = (l: Location, f: Filter) => (f === "all" ? l.plans.length : l.plans.filter((p) => p.line === f).length);

/** The tab's second line: the cheapest plan you can actually deploy there today. */
const fromLabel = (l: Location) => (l.plans.some((p) => p.inStock) ? `from ${fmt(fromIn(l))}` : "out of stock");

/** "A, B and C" */
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/**
 * Every plan in every location: a tab per location, a filter per line, and the plans
 * themselves as blades in a rack cabinet. Montreal opens first, Blackbox on top.
 */
export function PricingRack() {
  const [loc, setLoc] = useState<LocationId>("yul");
  const [line, setLine] = useState<Filter>("all");
  // Rows slide in only after a choice, never on first paint (the section already reveals).
  const [moved, setMoved] = useState(false);
  const reduced = usePrefersReducedMotion();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const strip = useRef<HTMLDivElement>(null);

  const here = locations.find((l) => l.id === loc) ?? locations[0];
  const shown = line === "all" ? here.plans : here.plans.filter((p) => p.line === line);
  const boxes = shown.filter((p) => p.line === "blackbox");
  // Unit numbers run on through both groups, so `start` is where each one picks up.
  const groups = [
    { id: "blackbox", plans: boxes, start: 0 },
    { id: "standard", plans: shown.filter((p) => p.line !== "blackbox"), start: boxes.length },
  ].filter((g) => g.plans.length > 0);
  const label = FILTERS.find((f) => f.id === line)?.label ?? "";
  const elsewhere = line === "all" ? [] : locations.filter((l) => count(l, line) > 0);

  function pick(id: LocationId, focus = false) {
    setLoc(id);
    setMoved(true);
    const el = tabs.current[locations.findIndex((l) => l.id === id)];
    const box = strip.current;
    if (!el || !box) return;
    if (focus) el.focus({ preventScroll: true });
    // Keep the chosen chip inside its own scroller without moving the page.
    const left = el.offsetLeft - 20;
    const right = el.offsetLeft + el.offsetWidth + 20 - box.clientWidth;
    const behavior = reduced ? "auto" : "smooth";
    if (left < box.scrollLeft) box.scrollTo({ left, behavior });
    else if (right > box.scrollLeft) box.scrollTo({ left: right, behavior });
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = locations.findIndex((l) => l.id === loc);
    const n = locations.length;
    const to: Record<string, number> = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
    if (!(e.key in to)) return;
    e.preventDefault();
    pick(locations[to[e.key]].id, true);
  }

  const row = (p: Plan, i: number) => (
    <PricingBlade
      key={p.id}
      plan={p}
      slot={i + 1}
      city={here.city}
      style={
        moved && !reduced
          ? { animation: `rise 420ms cubic-bezier(0.2, 0.7, 0.2, 1) ${Math.min(i, 8) * 35}ms both` }
          : undefined
      }
    />
  );

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase" id="pricing-locations">
        Location
      </p>
      {/* The chips scroll inside this strip on narrow screens; the page never does. */}
      <div
        ref={strip}
        className="relative -mx-5 mt-3 overflow-x-auto px-5 py-1 [scrollbar-width:thin] sm:-mx-8 sm:px-8 lg:-mx-1 lg:px-1"
      >
        <div role="tablist" aria-labelledby="pricing-locations" className="flex w-max min-w-full gap-2">
          {locations.map((l, i) => {
            const on = l.id === loc;
            return (
              <button
                key={l.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                id={`pricing-tab-${l.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="pricing-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => pick(l.id)}
                onKeyDown={onKey}
                className={cn(
                  "flex flex-1 shrink-0 flex-col items-start gap-2 border px-4 py-3 text-left font-mono whitespace-nowrap transition-colors",
                  on ? "border-ink bg-ink text-paper" : "border-line-2 bg-paper text-ink hover:border-ink",
                )}
              >
                <span className="flex items-center gap-2 text-[14px] leading-none">
                  <span aria-hidden className={cn("size-[6px] shrink-0", on ? "bg-mint" : "bg-line-2")} />
                  {l.city}
                </span>
                <span className={cn("pl-[14px] text-[12px] leading-none", on ? "text-mint-pale" : "text-ink-3")}>
                  {fromLabel(l)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="pricing-panel"
        role="tabpanel"
        aria-labelledby={`pricing-tab-${loc}`}
        className="mt-3 border border-line-2 bg-bg-2"
      >
        {/* Cabinet header: where you are, and which line you are looking at. */}
        <div className="grid gap-6 border-b border-line-2 bg-paper px-5 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-10 lg:px-6">
          <div>
            <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">
              <span className="border border-line-2 px-1.5 py-[3px] leading-none text-ink">{here.code}</span>
              {here.country}
            </p>
            <p className="mt-4 font-display text-[30px] leading-none font-bold tracking-[-0.035em] text-ink [font-variation-settings:'opsz'_48]">
              {here.city}
            </p>
            <p className="mt-3 max-w-[54ch] text-[16px] leading-[1.45] text-pretty text-ink-2">{unbroken(here.note)}</p>
          </div>

          <fieldset>
            <legend className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Line</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const on = f.id === line;
                return (
                  <label
                    key={f.id}
                    className={cn(
                      "flex h-10 cursor-pointer items-center gap-2.5 border pr-1.5 pl-3 font-mono text-[12px] tracking-[0.14em] uppercase transition-colors",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                      on ? "border-ink bg-ink text-paper" : "border-line-2 bg-paper text-ink-2 hover:border-ink hover:text-ink",
                    )}
                  >
                    <input
                      type="radio"
                      name="pricing-line"
                      value={f.id}
                      checked={on}
                      onChange={() => {
                        setLine(f.id);
                        setMoved(true);
                      }}
                      className="sr-only"
                    />
                    {f.id === "all" ? null : <span aria-hidden className={cn("size-[7px]", PIXEL[f.id])} />}
                    {f.label}
                    <span
                      className={cn(
                        "min-w-7 px-1.5 py-[5px] text-center text-[11px] leading-none tracking-normal",
                        on ? "bg-night-3 text-white" : "bg-bg text-ink-3",
                      )}
                    >
                      <span className="sr-only">, </span>
                      {count(here, f.id)}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-4 max-w-[50ch] text-[16px] leading-[1.45] text-pretty text-ink-2">{unbroken(EXPLAIN[line])}</p>
          </fieldset>
        </div>

        {/* Column labels for the one-line rows; below xl each row labels its own specs. */}
        {groups.length > 0 ? (
          <div aria-hidden className={cn("hidden border-b border-line-2 px-[9px] xl:grid", EARS)}>
            <span />
            <div
              className={cn(
                "grid gap-x-3 px-5 py-3 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase",
                COLS,
              )}
            >
              <span>Plan</span>
              <span>CPU</span>
              <span>Memory</span>
              <span>Storage</span>
              <span>Port</span>
              <span>Transfer</span>
              <span>Per month</span>
              <span />
            </div>
            <span />
          </div>
        ) : null}

        <div key={`${loc}-${line}`} className="flex flex-col gap-2 p-2">
          {groups.map((g) =>
            g.id === "blackbox" ? (
              <div key={g.id} className="flex flex-col gap-2">
                <div className="grid gap-x-8 gap-y-3 bg-lime px-5 py-4 text-ink lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-6">
                  <div>
                    <p className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.14em] uppercase">
                      <span aria-hidden className="size-[7px] bg-ink" />
                      {lines.blackbox.name} · {lines.blackbox.short}
                    </p>
                    <p className="mt-2 max-w-[70ch] font-mono text-[13px] leading-relaxed text-ink-2">
                      {blackboxTerms.transfer}
                    </p>
                  </div>
                  <a
                    href="#blackbox"
                    className="inline-flex items-center gap-2 justify-self-start font-medium text-ink underline decoration-ink/40 underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    How Blackbox works
                    <span aria-hidden>→</span>
                  </a>
                </div>
                <ul aria-label={`${lines.blackbox.name} plans in ${here.city}`} className="flex flex-col gap-2">
                  {g.plans.map((p, i) => row(p, g.start + i))}
                </ul>
              </div>
            ) : (
              <div key={g.id} className="flex flex-col gap-2">
                {groups.length > 1 ? (
                  <p className="flex items-center gap-2.5 px-1 pt-4 pb-1 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">
                    <span aria-hidden className="size-[7px] bg-ink-3" />
                    Standard line · VPS and VDS · unmetered
                  </p>
                ) : null}
                <ul aria-label={`Plans in ${here.city}`} className="flex flex-col gap-2">
                  {g.plans.map((p, i) => row(p, g.start + i))}
                </ul>
              </div>
            ),
          )}

          {groups.length === 0 ? (
            // An empty bay: the line is not sold here, so point at where it is.
            <div className="bg-hatch border border-line-2 px-4 py-12 sm:py-16">
              <div className="mx-auto max-w-[30rem] border border-line-2 bg-paper p-6 text-center">
                <p className="font-display text-[24px] leading-tight font-bold tracking-[-0.03em] text-ink">
                  No {label} in {here.city}.
                </p>
                <p className="mt-2 text-[16px] leading-[1.45] text-ink-2">
                  {label} runs in{" "}
                  {elsewhere.length === 1 ? `${elsewhere[0].city} only` : list(elsewhere.map((l) => l.city))}.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {elsewhere.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => pick(l.id)}
                      className="inline-flex h-10 items-center gap-2 border border-line-2 bg-paper px-3 font-mono text-[13px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
                    >
                      {l.city}
                      <span aria-hidden>→</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-line-2 bg-paper px-5 py-4 font-mono text-[13px] leading-relaxed text-ink-2 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-6">
          <p aria-live="polite">
            {here.plans.length} plans in {here.city}. {planCount} across all {locations.length} locations.
            {line === "all" ? null : <span className="sr-only"> Showing {shown.length}.</span>}
          </p>
          <p>Seven-day minimum, prorated. Then renew on whatever cycle you set.</p>
        </div>
      </div>
    </div>
  );
}
