import type { CSSProperties } from "react";
import { CtaButton } from "@/components/kit";
import { blackbox, fmt, lines, locations, type Plan } from "@/lib/catalog";
import { BbCores, BbLeds, BbVents, cx } from "@/components/sections/BlackboxArt";

const home = locations.find((l) => l.id === "yul");
const PLACE = home ? `${home.city}, ${home.country}` : "Montreal, Canada";
const STOCKED = blackbox.filter((p) => p.inStock).length;

/** A rack rail: a slate strip punched with square mounting holes. */
const RAIL: CSSProperties = {
  backgroundImage: "linear-gradient(var(--night) 0 6px, transparent 6px)",
  backgroundSize: "6px 18px",
  backgroundRepeat: "repeat-y",
  backgroundPosition: "center 10px",
};

function Rail() {
  return <div aria-hidden className="bg-night-3" style={RAIL} />;
}

const short = (p: Plan) => p.name.replace(/^Blackbox\s+/, "");

/** "4 TB / 31 days" with each figure kept on the line with its unit. */
const tight = (s: string) => s.replace(/(\d) (?=[A-Za-z])/g, "$1 ");

/**
 * One tier as a 1U blade: unit label and LEDs, the name, the specs, the price
 * and its deploy button. Side by side from lg; a stacked card below it, with the
 * price beside the name.
 */
function Blade({ plan, slot, lead }: { plan: Plan; slot: number; lead: boolean }) {
  const [dollar, ...rest] = fmt(plan.usd);
  const figure = rest.join("");
  const specs = [
    { label: "vCPU", value: String(plan.cores), cores: plan.cores },
    { label: "RAM", value: plan.ram },
    { label: "Disk", value: plan.disk },
    { label: "Port", value: plan.port },
    { label: "Transfer", value: plan.transfer },
  ];

  // Phones: strip, then name beside price, specs, button. From lg every part has a
  // fixed cell: strip, name and specs run the full height; price over button at the right.
  return (
    // Every column has a fixed share, so the four blades line up like units in one rack.
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-5 border border-night-line bg-night-2 px-5 py-5 sm:px-6 lg:grid-cols-[48px_minmax(0,0.7fr)_minmax(0,2fr)_190px] lg:gap-x-8 lg:gap-y-4 lg:py-6 xl:grid-cols-[48px_minmax(0,0.7fr)_minmax(0,2fr)_210px] xl:gap-x-10">
      <div
        aria-hidden
        className="order-1 col-span-2 flex items-center gap-3 lg:col-span-1 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex-col lg:items-start lg:gap-2.5 lg:self-stretch"
      >
        <span className="font-mono text-[11px] tracking-[0.16em] text-white/70">U{slot}</span>
        <BbLeds slot={slot} />
        <BbVents count={6} className="ml-auto lg:mt-auto lg:ml-0 lg:flex-col lg:[&>span]:h-[3px] lg:[&>span]:w-[18px]" />
      </div>

      {/* On the narrowest phones the price drops under the name instead of squeezing it. */}
      <div className="order-2 min-w-0 max-[385px]:col-span-2 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] leading-none tracking-[0.16em] text-white/70 uppercase">
          {lines.blackbox.name}
          {lead ? <span className="bg-lime px-1.5 py-[4px] text-ink">start here</span> : null}
        </p>
        <h4 className="mt-2.5 font-display text-[32px] leading-none font-bold tracking-[-0.035em] text-white [font-variation-settings:'opsz'_48] sm:text-[36px]">
          {short(plan)}
        </h4>
        <p className="mt-3 flex items-center gap-2 font-mono text-[12px] text-white/80">
          <span aria-hidden className={cx("size-[7px]", plan.inStock ? "bg-mint" : "bg-pink")} />
          {plan.inStock ? "In stock" : "Out of stock"}
        </p>
        <p className="mt-1 font-mono text-[12px] text-white/75">{plan.cpu}</p>
      </div>

      {/* Phones: one wrapping line of values, labels kept for screen readers. From sm a labelled grid;
          from lg a wrapping row; from 1400px fixed columns, so the four blades line up exactly. */}
      <dl className="order-4 col-span-2 flex flex-wrap gap-x-5 gap-y-2 border-t border-night-line pt-4 sm:grid sm:grid-cols-3 sm:gap-x-6 sm:gap-y-4 sm:pt-5 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:flex lg:flex-wrap lg:content-center lg:justify-between lg:gap-x-8 lg:self-stretch lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 xl:pl-10 min-[1400px]:grid min-[1400px]:grid-cols-[0.6fr_1fr_1fr_0.8fr_1.35fr] min-[1400px]:gap-x-4">
        {specs.map((s) => (
          <div key={s.label} className="flex min-w-0 items-center gap-2 sm:block lg:self-center">
            <span aria-hidden className="size-[5px] shrink-0 bg-peri sm:hidden" />
            <dt className="font-mono text-[11px] tracking-[0.16em] text-white/65 uppercase max-sm:sr-only">{s.label}</dt>
            <dd className="flex items-center gap-2.5 font-mono text-[15px] leading-snug whitespace-nowrap text-white sm:mt-1.5 sm:whitespace-normal lg:whitespace-nowrap">
              {tight(s.value)}
              {s.cores ? (
                <>
                  <span className="-ml-1.5 sm:hidden"> vCPU</span>
                  <BbCores n={s.cores} />
                </>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      <p className="order-3 flex items-baseline justify-end font-display leading-[0.8] max-[385px]:col-span-2 max-[385px]:justify-start font-extrabold tracking-[-0.05em] text-mint-pale [font-variation-settings:'opsz'_96] lg:col-start-4 lg:row-start-1 lg:self-end">
        <span className="self-start pt-[0.06em] text-[22px] tracking-normal sm:text-[26px]">{dollar}</span>
        <span className="text-[46px] sm:text-[56px] xl:text-[60px]">{figure}</span>
        <span className="ml-1.5 font-mono text-[13px] font-normal tracking-normal text-white/70">
          <span aria-hidden>/mo</span>
          <span className="sr-only"> per month</span>
        </span>
      </p>

      <div className="order-5 col-span-2 lg:col-span-1 lg:col-start-4 lg:row-start-2 lg:self-start">
        <CtaButton href="#deploy" tone={lead ? "lime" : "mint"} className="w-full justify-between whitespace-nowrap">
          Deploy {short(plan)}
        </CtaButton>
      </div>
    </li>
  );
}

/**
 * The four Blackbox tiers racked one above another in a Montreal cabinet: a
 * header plate with where they live, the blades between two punched rails,
 * and the terms under the rack.
 */
export function BlackboxTiers({ terms }: { terms: readonly string[] }) {
  const cheapest = Math.min(...blackbox.map((p) => p.usd));
  return (
    <div>
      <div className="border border-night-line">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-night-line bg-night-3 px-5 py-3 font-mono text-[12px] text-white/85 sm:px-6">
          <span className="flex items-center gap-2.5">
            <span aria-hidden className="size-[7px] bg-mint" />
            {PLACE} · dedicated hardware in a colo
          </span>
          <span className="text-white/75">
            {blackbox.length} tiers · {STOCKED} in stock
          </span>
        </div>
        <div className="grid grid-cols-[14px_minmax(0,1fr)_14px] bg-night sm:grid-cols-[24px_minmax(0,1fr)_24px]">
          <Rail />
          <ol className="flex flex-col gap-1.5 px-1.5 py-1.5 sm:gap-2 sm:px-2 sm:py-2" aria-label="Blackbox tiers">
            {blackbox.map((plan, i) => (
              <Blade key={plan.id} plan={plan} slot={i + 1} lead={plan.usd === cheapest} />
            ))}
          </ol>
          <Rail />
        </div>
      </div>
      <ul className="mt-5 flex flex-col gap-1.5 font-mono text-[12px] leading-relaxed text-white/72">
        {terms.map((t) => (
          <li key={t} className="flex gap-2.5">
            <span aria-hidden className="mt-[0.55em] size-[5px] shrink-0 bg-peri" />
            <span className="max-w-[92ch]">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
