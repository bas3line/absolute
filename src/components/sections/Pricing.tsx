import type { ReactNode } from "react";
import { Kicker, Reveal, Section, Title, Wide } from "@/components/kit";
import { coins, payments } from "@/lib/catalog";
import { PricingRack } from "@/components/sections/PricingRack";

type PaymentId = (typeof payments)[number]["id"];

// One small object per way to pay: ink outlines, one flat fill each, drawn on a 40px grid.
const GLYPHS: Record<PaymentId, ReactNode> = {
  // A coin in front of the node that watches for it.
  crypto: (
    <>
      <rect x="17.25" y="6.25" width="17.5" height="25.5" className="fill-paper" />
      <path d="M21 11.5h10M21 15.5h10" className="stroke-peri" />
      <path d="M30.5 26.5h1.5" />
      <circle cx="15" cy="25" r="10.25" className="fill-mint" />
      <circle cx="15" cy="25" r="5.75" />
    </>
  ),
  // An envelope with a stamp and the address lines left blank.
  cash: (
    <>
      <rect x="5.25" y="10.25" width="29.5" height="20" className="fill-paper" />
      <rect x="25.75" y="13.75" width="5.5" height="6.5" className="fill-pink" />
      <path d="M9.5 21.5h10M9.5 25.5h6.5" className="stroke-peri" />
    </>
  ),
  // A card: a lime chip, a stripe, and no name embossed on it.
  card: (
    <>
      <rect x="5.25" y="9.25" width="29.5" height="21.5" className="fill-paper" />
      <rect x="9.75" y="14.25" width="7" height="5.5" className="fill-lime" />
      <path d="M9.5 25.5h4M16.5 25.5h4M23.5 25.5h4" className="stroke-peri" />
    </>
  ),
};

// What each tile says beyond the catalogue's one-liner.
const DETAIL: Partial<Record<PaymentId, string>> = {
  crypto:
    "Ethereum-family and Tron coins use a small pool of addresses instead, and a pooled address is never shared by two open invoices.",
  card: "Opening the card form loads the processor's script, so it also sees your IP address and browser, as any card processor does.",
};

function Payments() {
  return (
    // The heading takes the first of four columns only from xl; at lg a quarter is too narrow for it.
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      <div className="pb-5 md:col-span-3 xl:col-span-1 xl:pr-6 xl:pb-0">
        <Kicker pixel="pink">Payment</Kicker>
        <h3 className="mt-4 max-w-[20ch] font-display text-[28px] leading-[1.05] font-bold tracking-[-0.035em] text-balance text-ink">
          Three ways to pay. The account never asks who you are.
        </h3>
        <p className="mt-4 max-w-[40ch] font-mono text-[13px] leading-relaxed text-ink-3">
          Prices in USD, per month. Once a payment is confirmed the server is live in about 30 seconds.
        </p>
      </div>

      <ul className="grid gap-3 md:col-span-3 md:grid-cols-3">
        {payments.map((p) => (
          <li key={p.id} className="flex flex-col border border-line-2 bg-paper p-6">
            <span aria-hidden className="grid size-14 place-items-center border border-line bg-bg">
              <svg
                viewBox="0 0 40 40"
                className="size-10 fill-none stroke-ink"
                strokeWidth={1.5}
                strokeLinecap="square"
              >
                {GLYPHS[p.id]}
              </svg>
            </span>
            <p className="mt-6 font-display text-[22px] leading-tight font-bold tracking-[-0.03em] text-ink">{p.name}</p>
            {p.id === "crypto" ? (
              <>
                <ul aria-label="Coins accepted" className="mt-4 flex flex-wrap gap-1.5">
                  {coins.map((c) => (
                    <li
                      key={c}
                      className="border border-line-2 bg-bg px-2 py-[5px] font-mono text-[12px] leading-none tracking-[0.08em] text-ink"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[16px] leading-[1.45] text-pretty text-ink-2">
                  Watched on self-hosted nodes, with no payment company in between. A fresh address per invoice on
                  BTC, LTC and XMR.
                </p>
              </>
            ) : (
              <p className="mt-2 text-[16px] leading-[1.45] text-pretty text-ink-2">{p.note}</p>
            )}
            {DETAIL[p.id] ? (
              <div className="mt-auto pt-5">
                <p className="border-t border-line pt-4 font-mono text-[13px] leading-relaxed text-ink-3">{DETAIL[p.id]}</p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Thirty-two random characters, the shape the order page generates. This one is only an example.
const SAMPLE = ["q7Rk2Vxa", "N4pLw9cT", "b3HsY8mZ", "e5JfU6dG"];

/** What paying hands back, drawn to scale: four groups of eight on a ruler. */
function CredentialStrip() {
  return (
    <div className="mt-3 grid gap-x-8 gap-y-4 border border-line-2 bg-paper px-6 py-5 lg:grid-cols-[auto_auto_minmax(0,1fr)] lg:items-center">
      <span className="flex shrink-0 items-center gap-2.5 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">
        <span aria-hidden className="size-[7px] bg-mint" />
        Your account
      </span>
      <figure className="m-0 justify-self-start">
        <span className="sr-only">An example credential, 32 random characters long.</span>
        <code
          aria-hidden
          className="grid grid-cols-2 gap-x-[1ch] gap-y-2 bg-bg px-3 pt-2 pb-1.5 font-mono text-[15px] tracking-normal text-ink sm:flex"
        >
          {SAMPLE.map((g) => (
            <span key={g} className="relative pb-2">
              {g}
              {/* One tick per character; the eighth stands taller. */}
              <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[repeating-linear-gradient(90deg,var(--ink-4)_0_1px,transparent_1px_1ch)]" />
              <span className="absolute right-0 bottom-0 h-[7px] w-px bg-ink-3" />
            </span>
          ))}
        </code>
        <figcaption className="mt-1.5 text-right font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">
          32 characters
        </figcaption>
      </figure>
      <p className="text-[16px] leading-[1.45] text-pretty text-ink-2">
        A random credential is the whole account: no email, no password, no reset link.
      </p>
    </div>
  );
}

export function Pricing() {
  return (
    <Section id="pricing" aria-labelledby="pricing-title">
      <Wide>
        <Reveal>
          <Title
            id="pricing-title"
            kicker="Pricing"
            sub="Every plan in every location, priced per month. Rent for as little as seven days. Stop renewing and the server expires: expired services are removed along with their data."
          >
            You pay for the machine. Nothing else is for sale.
          </Title>
        </Reveal>

        <Reveal delay={80} className="mt-12 lg:mt-16">
          <PricingRack />
        </Reveal>

        <Reveal delay={80} className="mt-16 lg:mt-20">
          <Payments />
          <CredentialStrip />
        </Reveal>
      </Wide>
    </Section>
  );
}
