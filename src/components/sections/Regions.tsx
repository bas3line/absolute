"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Section, Title, Wide, cn } from "@/components/kit";
import { fmt, fromIn, locations, type LocationId } from "@/lib/catalog";
import { POINTS, closest, noGuess, readGuess, subscribe } from "./RegionsGuess";
import { RegionsMap, type Frame } from "./RegionsMap";
import { WORLD } from "./worldmask";

// Until the browser has guessed (in the server render, or when the clock says nothing) the map
// opens on Montreal, the owned-hardware location and the only home of Blackbox.
const FALLBACK: LocationId = "yul";
const COUNT =
  ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][locations.length] ??
  String(locations.length);
const EXTENT = `${Math.abs(WORLD.west)}°W–${WORLD.east}°E · ${Math.abs(WORLD.south)}°S–${WORLD.north}°N`;

// Each location with what you can buy there: the cheapest plan in stock (null when none is), and how many are out.
const ROWS = locations.map((l) => ({
  l,
  from: l.plans.some((p) => p.inStock) ? fromIn(l) : null,
  total: l.plans.length,
  out: l.plans.filter((p) => !p.inStock).length,
}));
const stocked = (id: LocationId) => ROWS.some((r) => r.l.id === id && r.from !== null);

const coords = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? "E" : "W"}`;

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function Regions() {
  const guess = useSyncExternalStore(subscribe, readGuess, noGuess);
  const nearest = guess?.id ?? null;
  // A row picked by hand wins over the guess; until then the map follows the guess.
  const [pinned, setPinned] = useState<LocationId | null>(null);
  const [hovered, setHovered] = useState<LocationId | null>(null);
  // The window the inset settled on, so the world map can bracket it.
  const [frame, setFrame] = useState<Frame | null>(null);
  const active = hovered ?? pinned ?? nearest ?? FALLBACK;
  const row = ROWS.find((r) => r.l.id === active) ?? ROWS[0];
  const point = POINTS.find((p) => p.id === active) ?? POINTS[0];
  // Out of stock everywhere there: point at the closest location that has something.
  const alt =
    row.from === null ? ROWS.find((r) => r.l.id === closest(point.lat, point.lon, stocked)) ?? null : null;

  const pin = (id: LocationId) => {
    setPinned(id);
    setHovered(null);
  };
  // Shared handlers so a row and its marker behave as one control.
  const bind = (id: LocationId) => ({
    onMouseEnter: () => setHovered(id),
    onMouseLeave: () => setHovered((h) => (h === id ? null : h)),
    onFocus: () => setHovered(id),
    onBlur: () => setHovered((h) => (h === id ? null : h)),
    onClick: () => setPinned(id),
  });
  const map = { active, nearest, you: guess?.at ?? null, onHover: setHovered, onPin: pin };

  return (
    <Section id="regions" tone="night" aria-labelledby="regions-title">
      <Wide>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <Title
            id="regions-title"
            tone="night"
            kicker="Locations"
            sub="New York, Montreal, four cities in Western Europe, Singapore and Hong Kong. Every plan in every one of them has a dedicated IPv4 and full root or RDP. No packet inspection, no flow logs."
          >
            {COUNT} locations. Your browser picks the nearest one.
          </Title>
          <p className="max-w-[21rem] shrink-0 border-l-2 border-pink pl-5 text-[17px] leading-relaxed text-white/85 lg:mb-1.5">
            Montreal runs on owned hardware in a colo, and it is the only place a Blackbox lives: SEV-SNP encrypted
            RAM, a LUKS2 disk only your passphrase opens, measured boot.
          </p>
        </div>

        <div className="relative mt-12 border border-night-line sm:mt-16">
          <Screw at="top-[18px] left-2.5" turn={20} />
          <Screw at="top-[18px] right-2.5" turn={75} />
          <Screw at="bottom-[18px] left-2.5" turn={130} />
          <Screw at="right-2.5 bottom-[18px]" turn={45} />

          <figure className="flex min-w-0 flex-col">
            <Strip>
              <span className="flex items-center gap-4">
                <span className="text-mint-pale">U1</span>
                <span>Coverage</span>
              </span>
              <Vents />
              <span className="flex items-center gap-4">
                <span className="hidden sm:inline">{EXTENT}</span>
                <Leds />
              </span>
            </Strip>

            {/* World and inset side by side on wide screens, stacked below that. */}
            <div className="grid xl:grid-cols-[minmax(0,1fr)_26rem]">
              <RegionsMap kind="world" frame={frame} className="aspect-[280/82]" {...map} />
              <div className="h-[208px] border-t border-night-line sm:h-[280px] xl:h-auto xl:border-t-0 xl:border-l">
                <RegionsMap kind="inset" onFrame={setFrame} className="h-full" {...map} />
              </div>
            </div>

            <figcaption className="flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-night-line bg-night-2 px-5 py-2.5 font-mono text-[12px] leading-snug sm:px-8">
              <span className="min-w-0 text-white/75">
                {guess === null ? (
                  "Guessing the nearest location from your clock…"
                ) : guess.id ? (
                  <>
                    <span className="font-medium text-lime">
                      you → {ROWS.find((r) => r.l.id === guess.id)?.l.code}
                    </span>
                    , guessed from {guess.zone}
                  </>
                ) : (
                  <>
                    <span className="font-medium text-lime">no guess</span>: {guess.zone || "no time zone"} says
                    nothing about where you are
                  </>
                )}
              </span>
              <span className="shrink-0 text-white/75 tabular-nums">
                <span className="font-medium text-mint">{row.l.code}</span> {coords(point.lat, point.lon)}
              </span>
            </figcaption>
          </figure>

          <div className="border-t border-night-line">
            <Strip>
              <span className="flex items-center gap-4">
                <span className="text-mint-pale">U2</span>
                <span>Locations</span>
              </span>
              <span>
                Cheapest in stock<span className="hidden sm:inline">, per month</span>
              </span>
            </Strip>

            <ul aria-label="Locations">
              {ROWS.map(({ l, from, total, out }) => {
                const on = l.id === active;
                const near = l.id === nearest;
                const muted = near ? "text-ink/80" : "text-white/70";
                return (
                  <li key={l.id} className="border-b border-night-line last:border-b-0">
                    <button
                      type="button"
                      aria-pressed={l.id === pinned}
                      {...bind(l.id)}
                      className={cn(
                        "relative grid w-full grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2.5 px-5 py-4 text-left transition-colors focus-visible:-outline-offset-2 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-8 lg:grid-cols-[3.5rem_11.5rem_minmax(0,1fr)_12.5rem] lg:items-center lg:gap-x-6 lg:py-5 xl:grid-cols-[3.5rem_14rem_minmax(0,1fr)_13rem]",
                        near ? "bg-lime text-ink focus-visible:outline-ink" : on ? "bg-night-2" : "hover:bg-night-2",
                        !near && "focus-visible:outline-mint",
                      )}
                    >
                      {on ? (
                        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", near ? "bg-ink" : "bg-mint")} />
                      ) : null}
                      <span
                        className={cn(
                          "col-start-1 row-start-1 pt-[5px] font-mono text-[13px] font-medium tracking-[0.12em] uppercase lg:pt-0",
                          near ? "text-ink" : "text-mint-pale",
                        )}
                      >
                        {l.code}
                      </span>
                      <span className="col-start-2 row-start-1 min-w-0">
                        <span
                          className={cn(
                            "block truncate font-display text-[20px] leading-tight font-bold tracking-[-0.02em] sm:text-[22px]",
                            near ? "text-ink" : "text-white",
                          )}
                        >
                          {l.city}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] leading-none tracking-[0.14em] uppercase">
                          <span className={muted}>{l.country}</span>
                          {near ? <span className="bg-ink px-1.5 py-[3px] text-lime">Nearest</span> : null}
                          {l.owned ? <span className="bg-pink px-1.5 py-[3px] text-ink">Blackbox</span> : null}
                        </span>
                      </span>
                      <span className="col-start-2 row-start-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:col-start-3 sm:row-start-1 sm:block sm:text-right lg:col-start-4">
                        {from !== null ? (
                          <span className="whitespace-nowrap">
                            <span className={cn("mr-1.5 font-mono text-[11px] tracking-[0.14em] uppercase", muted)}>
                              from
                            </span>
                            <span
                              className={cn(
                                "font-display text-[22px] leading-none font-bold tracking-[-0.03em] tabular-nums sm:text-[24px]",
                                near ? "text-ink" : on ? "text-mint" : "text-white",
                              )}
                            >
                              {fmt(from)}
                            </span>
                            <span className={cn("ml-0.5 font-mono text-[12px]", muted)}>/mo</span>
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "font-display text-[19px] leading-none font-bold whitespace-nowrap",
                              near ? "text-ink" : "text-white",
                            )}
                          >
                            Out of stock
                          </span>
                        )}
                        <span
                          className={cn(
                            "block font-mono text-[11px] leading-snug tracking-[0.1em] uppercase sm:mt-2",
                            muted,
                          )}
                        >
                          {total} plans
                          {out > 0 && out < total ? ` · ${out} out of stock` : null}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "col-start-2 row-start-3 text-[16px] leading-snug sm:col-span-2 sm:row-start-2 lg:col-span-1 lg:col-start-3 lg:row-start-1",
                          near ? "text-ink/85" : "text-white/75",
                        )}
                      >
                        {l.note}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-t border-night-line bg-night-2 px-5 py-2.5 font-mono text-[13px] sm:px-8">
              {row.from !== null ? (
                <a
                  href="#pricing"
                  className="group inline-flex items-center gap-2.5 text-white transition-colors hover:text-mint focus-visible:outline-mint"
                >
                  <span aria-hidden className="size-[7px] bg-mint" />
                  <span>
                    Deploy in <span className="text-mint group-hover:text-white">{row.l.city}</span>, from{" "}
                    {fmt(row.from)}/mo
                  </span>
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </a>
              ) : (
                <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 text-white/80">
                  <span aria-hidden className="size-[7px] bg-white/40" />
                  <span>{row.l.city} is out of stock.</span>
                  {alt ? (
                    <button
                      type="button"
                      onClick={() => pin(alt.l.id)}
                      className="text-mint transition-colors hover:text-white focus-visible:outline-mint"
                    >
                      Closest with stock: {alt.l.city} →
                    </button>
                  ) : null}
                </span>
              )}
              <span className="text-white/70">Live about 30 seconds after payment</span>
            </div>
          </div>
        </div>

        <p className="mt-6 max-w-[96ch] font-mono text-[12px] leading-relaxed text-white/70">
          The nearest location is guessed from your time zone, here in the browser: no IP lookup, no location prompt,
          nothing sent. Pick a row to pin it on the map. Prices are per month; stock is a snapshot and changes. Land:
          Natural Earth, public domain.
        </p>
      </Wide>
    </Section>
  );
}

/** Faceplate strip: unit label, vents and LEDs, in the mono label face. */
function Strip({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-11 items-center justify-between gap-4 border-b border-night-line bg-night-2 px-5 font-mono text-[11px] tracking-[0.14em] text-white/75 uppercase sm:px-8">
      {children}
    </div>
  );
}

/** A 7px slotted screw head. Each corner sits at its own angle, as screws do. */
function Screw({ at, turn }: { at: string; turn: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 7 7"
      className={`absolute z-10 size-[7px] text-night-line ${at}`}
      style={{ rotate: `${turn}deg` }}
    >
      <circle cx="3.5" cy="3.5" r="3" fill="none" stroke="currentColor" />
      <path d="M1.2 3.5h4.6" stroke="currentColor" />
    </svg>
  );
}

function Vents() {
  return (
    <span aria-hidden className="hidden flex-1 justify-center gap-[3px] md:flex">
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="h-[11px] w-[3px] bg-night-line" />
      ))}
    </span>
  );
}

/** One lit pixel per location, each blinking on its own slow beat. */
function Leds() {
  return (
    <span aria-hidden className="flex gap-[3px] bg-night p-[3px] ring-1 ring-night-line">
      {locations.map((l, i) => (
        <span key={l.id} className="relative size-[5px] bg-night-3">
          <span
            className="animate-caret absolute inset-0 bg-mint"
            style={{ animationDuration: `${3.1 + i * 0.47}s`, animationDelay: `${-i * 0.9}s` }}
          />
        </span>
      ))}
    </span>
  );
}
