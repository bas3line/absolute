"use client";

import type { CSSProperties, ReactNode } from "react";
import { CtaButton, cn } from "@/components/kit";
import { fmt, lines, type Plan } from "@/lib/catalog";

// Nothing is checked out on this page: every Deploy button goes to the deploy section.
const CHECKOUT = "#deploy";

/** A rack ear either side of the row from md. The header strip uses the same three columns. */
export const EARS = "md:grid-cols-[1.5rem_minmax(0,1fr)_1.5rem]";

/** From xl a row is one line: plan, five specs, price, button. The header strip shares it. */
export const COLS =
  "xl:grid-cols-[minmax(9.5rem,1fr)_minmax(11rem,1.15fr)_minmax(5.75rem,0.6fr)_minmax(6.25rem,0.6fr)_minmax(4.75rem,0.5fr)_minmax(5.75rem,0.6fr)_8rem_8.5rem]";

/** One flat colour per line, used on its tag and on the filter chip. */
export const PIXEL = { blackbox: "bg-mint", vds: "bg-peri", vps: "bg-pink" } as const;

// Every colour a row uses, once for the paper rows and once for the slate Blackbox ones.
const PAPER = {
  row: "border-line-2 bg-paper",
  ear: "border-line",
  unit: "text-ink-3",
  vent: "bg-line-2",
  screw: "text-ink-4",
  handle: "bg-line-2",
  kind: "border border-line-2 py-[4px] text-ink-2",
  name: "text-ink",
  price: "text-ink",
  per: "text-ink-3",
  rule: "border-line",
  label: "text-ink-3",
  value: "text-ink",
  core: "bg-peri",
  snp: "border border-line-2 text-ink-2",
  bezel: "bg-night",
  off: "bg-night-3",
  blank: "border-line-2 text-ink-2",
  plate: "bg-paper",
};

const NIGHT: typeof PAPER = {
  row: "border-night bg-night",
  ear: "border-night-line",
  unit: "text-mint-pale/80",
  vent: "bg-night-line",
  screw: "text-night-line",
  handle: "bg-night-line",
  kind: "bg-lime py-[5px] text-ink",
  name: "text-white",
  price: "text-mint-pale",
  per: "text-white/70",
  rule: "border-night-line",
  label: "text-white/70",
  value: "text-white",
  core: "bg-mint",
  snp: "border border-mint/60 text-mint-pale",
  bezel: "bg-night-2 ring-1 ring-night-line",
  off: "bg-night-3",
  blank: "border-night-line text-white/80",
  plate: "bg-night",
};

type Theme = typeof PAPER;

/** A figure never wraps away from its unit: "40 GB" breaks as a whole. */
const keep = (s: string) => s.replace(/(\d) (?=[A-Za-z])/g, "$1 ");

/** A 7px slotted screw head. Each one sits at its own angle, as screws do. */
function Screw({ at, turn, tone }: { at: string; turn: number; tone: string }) {
  return (
    <svg aria-hidden viewBox="0 0 7 7" className={cn("absolute size-[7px]", at, tone)} style={{ rotate: `${turn}deg` }}>
      <circle cx="3.5" cy="3.5" r="3" fill="none" stroke="currentColor" />
      <path d="M1.2 3.5h4.6" stroke="currentColor" />
    </svg>
  );
}

/** Power and activity. A plan that is out of stock sits dark, like an empty slot. */
function Leds({ slot, live, t, className }: { slot: number; live: boolean; t: Theme; className?: string }) {
  return (
    <span aria-hidden className={cn("flex gap-[3px] p-[3px]", t.bezel, className)}>
      <span className={cn("size-[5px]", live ? "bg-mint" : t.off)} />
      <span className={cn("relative size-[5px]", t.off)}>
        {live ? (
          <span
            className="animate-caret absolute inset-0 bg-lime"
            style={{ animationDuration: `${2.8 + (slot % 5) * 0.6}s`, animationDelay: `${-slot * 0.7}s` }}
          />
        ) : null}
      </span>
    </span>
  );
}

/** One lit pixel per core: a tiny core map under the cpu figure. */
function Cores({ n, tone }: { n: number; tone: string }) {
  return (
    <span aria-hidden className="grid grid-cols-[repeat(10,4px)] gap-[2px]">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={cn("size-[4px]", tone)} />
      ))}
    </span>
  );
}

function Spec({ label, t, wide, children }: { label: string; t: Theme; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2 md:col-span-1")}>
      <dt className={cn("font-mono text-[11px] tracking-[0.14em] uppercase xl:sr-only", t.label)}>{label}</dt>
      <dd className={cn("mt-1.5 font-mono text-[14px] leading-snug xl:mt-0", t.value)}>{children}</dd>
    </div>
  );
}

/**
 * One plan as a 1U blade in the rack: ears with screws and the unit number from md,
 * a faceplate strip on phones. From xl it is one line under the header strip; between
 * md and xl the specs drop to a second tier; on phones it stacks into a card.
 * Blackbox rows are slate with a lime tag and a mint button.
 */
export function PricingBlade({
  plan,
  slot,
  city,
  style,
}: {
  plan: Plan;
  slot: number;
  city: string;
  style?: CSSProperties;
}) {
  const t = plan.line === "blackbox" ? NIGHT : PAPER;
  const live = plan.inStock;
  const [model, chip] = plan.cpu.split(" · ");
  const [allowance, period] = plan.transfer.split(" / ");
  const unit = `U${String(slot).padStart(2, "0")}`;
  const [whole, cents] = fmt(plan.usd).slice(1).split(".");

  return (
    <li style={style} className={cn("relative grid border", EARS, t.row)}>
      {/* Phones: the faceplate runs across the top, as it did on the old blades. */}
      <div
        aria-hidden
        className={cn(
          "flex h-9 items-center justify-between gap-4 border-b px-5 font-mono text-[11px] tracking-[0.14em] md:hidden",
          t.ear,
          t.unit,
        )}
      >
        <span>{unit}</span>
        <span className="flex gap-[3px]">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={cn("h-[11px] w-[3px]", t.vent)} />
          ))}
        </span>
        <Leds slot={slot} live={live} t={t} />
      </div>

      <div aria-hidden className={cn("relative hidden border-r md:block", t.ear)}>
        <Screw at="top-2 left-1/2 -translate-x-1/2" turn={20 + slot * 25} tone={t.screw} />
        <span
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-180 font-mono text-[11px] tracking-[0.14em] [writing-mode:vertical-rl]",
            t.unit,
          )}
        >
          {unit}
        </span>
        <Screw at="bottom-2 left-1/2 -translate-x-1/2" turn={75 + slot * 40} tone={t.screw} />
      </div>

      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 p-5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-x-6 md:gap-y-5 xl:gap-x-3 xl:py-4",
          COLS,
        )}
      >
        <div className="col-start-1 row-start-1 min-w-0">
          <p className="flex items-center gap-2.5 font-mono text-[11px] leading-none tracking-[0.14em] uppercase">
            <Leds slot={slot} live={live} t={t} className="max-md:hidden" />
            <span className={cn("flex items-center gap-1.5 px-2", t.kind)}>
              {plan.line === "blackbox" ? null : <span aria-hidden className={cn("size-[6px]", PIXEL[plan.line])} />}
              {lines[plan.line].name}
            </span>
          </p>
          <h3
            className={cn(
              "mt-3 font-display text-[22px] leading-none font-bold tracking-[-0.03em] [font-variation-settings:'opsz'_48]",
              t.name,
            )}
          >
            {plan.name}
          </h3>
        </div>

        <dl
          className={cn(
            "col-span-2 col-start-1 row-start-2 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t pt-4 md:gap-y-4",
            "md:col-span-3 md:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]",
            "xl:col-span-5 xl:col-start-2 xl:row-start-1 xl:grid-cols-subgrid xl:items-center xl:gap-x-3 xl:border-t-0 xl:pt-0",
            t.rule,
          )}
        >
          <Spec label="CPU" t={t} wide>
            {/* Side by side while there is room; stacked in the narrow xl column. */}
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2 xl:flex-col xl:items-start">
              <span>
                {plan.cores} × {model}
              </span>
              <span className="flex items-center gap-2.5">
                <Cores n={plan.cores} tone={t.core} />
                {chip ? (
                  <span className={cn("px-1.5 py-[3px] text-[11px] leading-none tracking-[0.08em]", t.snp)}>
                    {chip}
                  </span>
                ) : null}
              </span>
            </span>
          </Spec>
          <Spec label="RAM" t={t}>
            {keep(plan.ram)}
          </Spec>
          <Spec label="Storage" t={t}>
            {keep(plan.disk)}
          </Spec>
          <Spec label="Port" t={t}>
            {keep(plan.port)}
          </Spec>
          <Spec label="Transfer" t={t}>
            {period ? (
              <>
                {keep(allowance)}
                <span className={cn("block text-[12px]", t.label)}>per {keep(period)}</span>
              </>
            ) : (
              plan.transfer
            )}
          </Spec>
        </dl>

        <p className={cn("col-start-2 row-start-1 flex items-baseline self-start md:self-center xl:col-start-7", t.price)}>
          <span className="sr-only">{fmt(plan.usd)} per month</span>
          <span aria-hidden className="flex items-baseline font-display [font-variation-settings:'opsz'_96]">
            <span className="self-start pt-[0.2em] text-[18px] font-bold">$</span>
            <span className="text-[40px] leading-[0.85] font-extrabold tracking-[-0.05em]">{whole}</span>
            <span className="text-[20px] font-bold tracking-[-0.02em]">.{cents}</span>
            <span className={cn("ml-1.5 font-mono text-[13px] font-normal", t.per)}>/mo</span>
          </span>
        </p>

        <div className="col-span-2 col-start-1 row-start-3 md:col-span-1 md:col-start-3 md:row-start-1 md:w-[8.5rem] xl:col-start-8 xl:w-auto">
          {live ? (
            <CtaButton
              href={CHECKOUT}
              tone={plan.line === "blackbox" ? "mint" : "ink"}
              className="w-full justify-between whitespace-nowrap max-md:h-12 max-md:text-[16px]"
            >
              <span>
                Deploy
                <span className="sr-only">
                  {" "}
                  {plan.name} in {city}
                </span>
              </span>
            </CtaButton>
          ) : (
            // An empty slot: hatched, no link, nothing to press.
            <span
              className={cn(
                "bg-hatch flex h-10 w-full items-center justify-center border font-mono text-[11px] tracking-[0.14em] uppercase max-md:h-12",
                t.blank,
              )}
            >
              <span className={cn("px-2 py-1", t.plate)}>Out of stock</span>
            </span>
          )}
        </div>
      </div>

      <div aria-hidden className={cn("relative hidden border-l md:block", t.ear)}>
        <Screw at="top-2 left-1/2 -translate-x-1/2" turn={130 + slot * 15} tone={t.screw} />
        <span className={cn("absolute top-1/2 left-1/2 h-7 w-[3px] -translate-x-1/2 -translate-y-1/2", t.handle)} />
        <Screw at="bottom-2 left-1/2 -translate-x-1/2" turn={45 + slot * 30} tone={t.screw} />
      </div>
    </li>
  );
}
