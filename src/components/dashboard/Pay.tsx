"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/kit";
import { coins, payments } from "@/lib/catalog";
import { fingerprint, hashString, prng, usd } from "./data";
import { PAY_GLYPHS } from "./glyphs";
import { useDash } from "./store";
import { Button, FakeQr, Icon, LABEL, MUTED, Panel, Pixels, Prompt, Segmented, Spin, motion } from "./ui";

type Method = (typeof payments)[number]["id"];
type Coin = (typeof coins)[number];
type Phase = "open" | "waiting" | "seen";
const CONFIRM_MS = 2400;

/** BTC, LTC and XMR get a newly derived address per invoice; the Ethereum family and Tron lease one from a small pool. */
const FRESH: readonly Coin[] = ["XMR", "BTC", "LTC"];
const SHORT: Record<Method, string> = { crypto: "Crypto", cash: "Cash by mail", card: "Card" };

/** A truncated, decorative address in the right shape for the coin. It receives nothing. */
function demoAddress(coin: Coin, seed: string) {
  const r = prng(hashString(`${coin}:${seed}`));
  const pick = (set: string, n: number) => Array.from({ length: n }, () => set[(r() * set.length) | 0]).join("");
  const b58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const hex = "0123456789abcdef";
  const bech = "023456789acdefghjklmnpqrstuvwxyz";
  if (coin === "XMR") return `8${pick(b58, 3)}…${pick(b58, 4)}`;
  if (coin === "BTC") return `bc1q${pick(bech, 3)}…${pick(bech, 4)}`;
  if (coin === "LTC") return `ltc1q${pick(bech, 3)}…${pick(bech, 4)}`;
  if (coin === "TRX") return `T${pick(b58, 3)}…${pick(b58, 4)}`;
  return `0x${pick(hex, 4)}…${pick(hex, 4)}`;
}

/**
 * Pay one invoice: crypto (a decorative QR, a truncated address shaped like the coin's), cash by
 * mail or card, and a button that pretends the payment arrived. Used by the deploy flow, renewals
 * and account credit. onPaid gets the method as it appears on the invoice: a coin, "cash" or "card".
 */
export function Pay({
  amountUsd,
  what,
  seed,
  onPaid,
  disabled,
}: {
  amountUsd: number;
  what: string;
  /** Anything stable for this invoice, so its demo address doesn't change while it's open. */
  seed: string;
  onPaid: (method: string) => void;
  disabled?: boolean;
}) {
  const { state } = useDash();
  const [method, setMethod] = useState<Method>("crypto");
  const [coin, setCoin] = useState<Coin>("XMR");
  const [phase, setPhase] = useState<Phase>("open");
  const paidRef = useRef(onPaid);
  const paidWith = method === "crypto" ? coin : method;
  const withRef = useRef(paidWith);
  useEffect(() => {
    paidRef.current = onPaid;
    withRef.current = paidWith;
  }, [onPaid, paidWith]);

  useEffect(() => {
    if (phase !== "waiting") return;
    const id = window.setTimeout(() => {
      setPhase("seen");
      paidRef.current(withRef.current);
    }, CONFIRM_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const fresh = FRESH.includes(coin);
  const address = demoAddress(coin, seed);
  const locked = phase !== "open";

  return (
    <Panel
      title={method === "crypto" ? `${coin} · ${fresh ? "fresh address" : "pooled address"}` : method === "cash" ? "cash by mail" : "card"}
      status={phase === "seen" ? "paid" : phase === "waiting" ? "watching" : "unpaid"}
      live={phase !== "open"}
    >
      <div className="px-5 pt-5">
        <Segmented
          legend="Pay with"
          value={method}
          onChange={(m) => !locked && setMethod(m)}
          options={payments.map((p) => ({ value: p.id, label: SHORT[p.id] }))}
        />
        <p className="mt-2 max-w-[62ch] text-[15px] leading-snug text-ink-2">{payments.find((p) => p.id === method)?.note}</p>
        {method === "crypto" ? (
          <Segmented
            className="mt-4"
            legend="Coin"
            value={coin}
            onChange={(c) => !locked && setCoin(c)}
            options={coins.map((c) => ({ value: c, label: c }))}
          />
        ) : null}
      </div>

      <div className="grid gap-6 px-5 py-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-2">
          <div className="border border-line-2 bg-white p-2.5 outline outline-[5px] outline-tint">
            {method === "crypto" ? (
              <FakeQr seed={hashString(coin + seed)} px={7} />
            ) : (
              <div className="grid size-[147px] place-items-center">
                <Pixels rows={PAY_GLYPHS[method]} scale={9} palette={{ "#": "var(--ink)", o: "var(--accent)" }} />
              </div>
            )}
          </div>
          <p className={cn("mt-1 max-w-[170px] font-mono text-[11px] leading-snug", MUTED)}>
            {method === "crypto" ? "decorative. it scans as nothing." : method === "cash" ? "an envelope, drawn" : "a card, drawn"}
          </p>
        </div>

        <dl className="min-w-0 font-mono text-[12px]">
          <dt className={LABEL}>invoice total</dt>
          <dd className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="font-dot text-[44px] font-bold leading-[0.85] tracking-[-0.02em] text-ink">{usd(amountUsd)}</span>
            <span className="text-ink-2">{method === "crypto" ? `paid in ${coin}` : "USD"}</span>
          </dd>

          {method === "crypto" ? (
            <>
              <dt className={cn("mt-5", LABEL)}>to</dt>
              <dd className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink">
                <span className="bg-tint px-1.5 py-0.5">{address}</span>
                <span className={MUTED}>{fresh ? "derived for this invoice alone" : "leased to this invoice alone, never two open ones"}</span>
              </dd>
              <dt className={cn("mt-5", LABEL)}>watched on</dt>
              <dd className="mt-1.5 text-ink">a self-hosted node. no block explorer is asked about it.</dd>
            </>
          ) : method === "cash" ? (
            <>
              <dt className={cn("mt-5", LABEL)}>in the envelope</dt>
              <dd className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-ink">
                <span className="bg-tint px-1.5 py-0.5">your credential, {fingerprint(state.credential ?? "")}</span>
                <span className={MUTED}>not your name</span>
              </dd>
            </>
          ) : (
            <>
              <dt className={cn("mt-5", LABEL)}>the processor sees</dt>
              <dd className="mt-1.5 text-ink">an amount and an opaque customer record. not what it was for.</dd>
              <dt className={cn("mt-5", LABEL)}>worth knowing</dt>
              <dd className="mt-1.5 text-pretty text-ink-2">
                its card form loads the processor&rsquo;s own script, so it sees your IP and browser, like any card processor.
              </dd>
            </>
          )}

          <dt className={cn("mt-5", LABEL)}>for</dt>
          <dd className="mt-1.5 text-ink">{what}</dd>
        </dl>
      </div>

      <div className="border-t border-line px-5 py-4" aria-live="polite">
        {phase === "open" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" onClick={() => setPhase("waiting")} disabled={disabled}>
              <Prompt />
              {method === "cash" ? "simulate the letter arriving" : method === "card" ? "simulate the card payment" : "simulate payment"}
            </Button>
            <p className={cn("font-mono text-[11.5px]", MUTED)}>demo: nothing is charged, nothing is sent anywhere.</p>
          </div>
        ) : null}
        {phase === "waiting" ? (
          <p className={cn("flex items-center gap-3 font-mono text-[13px] text-ink", motion.fade)} role="status">
            <Spin className="text-accent" />
            {method === "cash" ? "waiting for the envelope…" : method === "card" ? "waiting for the processor…" : `watching the ${coin} node for the payment…`}
          </p>
        ) : null}
        {phase === "seen" ? (
          <p className={cn("flex items-center gap-3 font-mono text-[13px] text-ink", motion.fade)} role="status">
            <Icon name="check" className="text-accent" />
            payment confirmed. no name attached.
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
