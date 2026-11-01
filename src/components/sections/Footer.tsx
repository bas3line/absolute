import type { ReactNode } from "react";
import { Kicker, Wide } from "@/components/kit";
import { brand, nav, panelDemo } from "@/lib/brand";
import { locations } from "@/lib/catalog";

// The product column follows the nav, and always carries the flagship and the map.
const PRODUCT = [
  { label: "Blackbox", href: "#blackbox" },
  { label: "Locations", href: "#regions" },
  ...nav.filter((l) => l.href !== "#blackbox" && l.href !== "#regions"),
];

const YEAR = brand.canaryUpdated.slice(0, 4);

const LINK = "text-[16px] text-ink-2 underline decoration-transparent underline-offset-4 transition-colors hover:text-ink hover:decoration-line-2";

/** |▪|, the nav's mark: dotted slate bars around one lit mint pixel. */
function AbsMark() {
  const dots = [0, 2, 4, 6, 8, 10];
  return (
    <svg viewBox="0 0 9 11" aria-hidden className="h-[22px] w-[18px] shrink-0" shapeRendering="crispEdges">
      {dots.map((y) => (
        <rect key={`l${y}`} x="0" y={y} width="1" height="1" fill="var(--ink)" />
      ))}
      {dots.map((y) => (
        <rect key={`r${y}`} x="8" y={y} width="1" height="1" fill="var(--ink)" />
      ))}
      <rect x="2" y="3" width="5" height="5" fill="var(--ink)" />
      <rect x="3" y="4" width="3" height="3" fill="var(--mint)" />
    </svg>
  );
}

function Column({ title, pixel, children }: { title: string; pixel: "mint" | "peri" | "pink"; children: ReactNode }) {
  return (
    <div>
      <h2>
        <Kicker pixel={pixel}>{title}</Kicker>
      </h2>
      <ul className="mt-6 flex flex-col gap-3.5">{children}</ul>
    </div>
  );
}

/**
 * The foot of the page, on paper: where everything is, then the name in dots
 * across the whole measure, lit at the end like the mark.
 */
export function Footer() {
  return (
    <footer className="border-t border-line bg-bg">
      <Wide>
        <div className="grid gap-14 pt-16 pb-16 sm:pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-20">
          <div className="lg:col-span-4">
            <a href="#top" aria-label={`${brand.name}, back to top`} className="inline-flex items-center gap-2.5">
              <AbsMark />
              <span className="font-dot text-[23px] leading-none font-extrabold tracking-[-0.01em] text-ink">
                {brand.name}
              </span>
            </a>
            <p className="mt-6 max-w-[20rem] font-display text-[24px] leading-[1.15] font-bold tracking-[-0.02em] text-balance text-ink">
              {brand.tagline}
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:col-span-8 lg:col-start-6 xl:col-span-7 xl:col-start-6"
          >
            <Column title="Product" pixel="mint">
              {PRODUCT.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={LINK}>
                    {l.label}
                  </a>
                </li>
              ))}
            </Column>
            <Column title="Access" pixel="peri">
              <li>
                <a href={panelDemo} className={LINK}>
                  Control panel demo
                </a>
              </li>
              <li className="flex flex-col gap-1">
                <span className="text-[16px] text-ink-2">Over Tor</span>
                <span className="font-mono text-[13px] break-all text-ink">{brand.onion}</span>
              </li>
              <li>
                <a href="#deploy" className={LINK}>
                  Verify a Blackbox
                </a>
              </li>
            </Column>
            <Column title="Small print" pixel="pink">
              <li className="text-[16px] text-ink-2">No email. No names.</li>
              <li className="text-[16px] text-ink-2">No cookies on this page.</li>
              <li className="text-[16px] text-ink-2">{locations.length} locations.</li>
              <li className="text-[16px] text-ink-2">
                © {YEAR} {brand.name}
              </li>
            </Column>
          </nav>
        </div>

        {/* The name across the full measure: Doto is monospaced at 0.6em, so 20cqw sets eight letters and the lit pixel edge to edge. */}
        <div aria-hidden className="@container border-t border-line pt-8 pb-6 sm:pt-12 sm:pb-10">
          <p className="flex items-end font-dot text-[20cqw] leading-[0.72] font-extrabold text-ink select-none">
            <span>{brand.name}</span>
            {/* The full stop is the mark's lit pixel: mint, set in an ink square two dots wide. */}
            <span className="mb-[0.026em] ml-[0.02em] grid size-[0.177em] shrink-0 place-items-center bg-ink">
              <span className="size-[0.1em] bg-mint" />
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-line py-6 font-mono text-[12px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>anonymous compute. lights on, nobody home.</p>
          <p>
            <a href="#canary" className="underline decoration-transparent underline-offset-4 transition-colors hover:text-ink hover:decoration-line-2">
              canary signed {brand.canaryUpdated}
            </a>
          </p>
        </div>
      </Wide>
    </footer>
  );
}
