"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/components/kit";
import { brand } from "@/lib/brand";
import { price } from "@/lib/catalog";
import { FleetStrip } from "./charts";
import { TODAY, addMonths, clock, daysBetween, fingerprint, locationOf, planOf, usd } from "./data";
import { BIRD_OPEN, BIRD_PALETTE } from "./glyphs";
import { serverHref } from "./nav";
import { useDash, useTelemetry } from "./store";
import { CellBar, Icon, LABEL, Led, LinkButton, MUTED, PageHeader, Panel, Pixels, Prompt, STATUS_LABEL, motion } from "./ui";

export function Overview() {
  const { state } = useDash();
  const boxes = state.servers;
  const running = boxes.filter((b) => b.status === "running").length;
  const booting = boxes.filter((b) => ["booting", "rebooting", "rebuilding"].includes(b.status)).length;
  const locked = boxes.filter((b) => b.status === "locked").length;
  const stopped = boxes.filter((b) => b.status === "stopped" || b.status === "stopping").length;
  const spend = Math.round(boxes.reduce((sum, b) => sum + price(planOf(b).usd), 0) * 100) / 100;
  const soonest = [...boxes].sort((a, b) => a.expires.localeCompare(b.expires))[0];
  const daysLeft = soonest ? daysBetween(TODAY, soonest.expires) : 0;
  // What the account holds: a credential, a balance, a creation date.
  const held = [`credential ${fingerprint(state.credential ?? "")}`, `balance ${usd(state.balance)}`, "creation date"];

  return (
    <div className={motion.rise}>
      <PageHeader
        eyebrow="Overview"
        lead="Lights on. Nobody home."
        trail={`${boxes.length} ${boxes.length === 1 ? "box" : "boxes"}, 0 names on file.`}
        actions={
          <LinkButton href="/dashboard/deploy" variant="primary">
            <Prompt />
            Deploy a box
            <span aria-hidden>→</span>
          </LinkButton>
        }
      />

      <section aria-label="At a glance" className="mt-8 grid gap-px border border-line-2 bg-line-2 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Boxes running" foot={`${booting} provisioning · ${locked} waiting for unlock · ${stopped} stopped`}>
          <span className="flex items-baseline gap-2">
            <Big>{String(running).padStart(2, "0")}</Big>
            <span className="font-mono text-[13px] text-ink-2">/ {String(boxes.length).padStart(2, "0")}</span>
          </span>
          <span className="mt-4 flex gap-1.5" aria-hidden>
            {boxes.map((b) => (
              <Led key={b.id} status={b.status} size={10} />
            ))}
          </span>
        </Stat>

        <Stat label="Monthly spend" foot={`balance ${usd(state.balance)} · crypto, cash or card`}>
          <span className="flex items-baseline gap-1.5">
            <span className="self-start pt-1 font-mono text-[14px] text-ink-2">$</span>
            <Big>{spend.toFixed(2)}</Big>
            <span className="font-mono text-[12px] text-ink-2">/ mo</span>
          </span>
          <span className="mt-3 block font-mono text-[12.5px] text-ink">every plan at its listed monthly price</span>
        </Stat>

        <Stat label="Next expiry" foot={soonest ? `${soonest.id} · ${soonest.expires}` : "nothing running"}>
          <span className="flex items-baseline gap-2">
            <Big>{daysLeft}</Big>
            <span className="font-mono text-[12px] text-ink-2">days, unless renewed</span>
          </span>
          <CellBar cells={30} lit={Math.min(30, Math.max(0, daysLeft))} size={6} gap={2} className="mt-4" />
        </Stat>

        <Stat label="Names on file" foot="no email, no phone, no KYC" highlight>
          <span className="flex items-baseline gap-2">
            <Big className="text-accent">0</Big>
            <span className="font-mono text-[12px] text-ink-2">the account is these {held.length}:</span>
          </span>
          <span className="mt-4 flex flex-col gap-1 font-mono text-[11.5px] text-ink">
            {held.map((h) => (
              <span key={h} className="flex items-center gap-2">
                <span aria-hidden className="size-[6px] shrink-0 bg-accent" />
                {h}
              </span>
            ))}
          </span>
        </Stat>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Fleet />
          <Session />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <CanaryCard />
          <ThisTab />
        </div>
      </div>

      <SpendByBox />
    </div>
  );
}

function Big({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-dot text-[56px] font-bold leading-[0.8] tracking-[-0.02em] text-ink tabular-nums", className)}>
      {children}
    </span>
  );
}

function Stat({
  label,
  foot,
  children,
  highlight,
}: {
  label: string;
  foot: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col p-5 sm:p-6", highlight ? "bg-tint" : "bg-paper")}>
      <h2 className={LABEL}>{label}</h2>
      <div className="mt-6 flex-1">{children}</div>
      <p className={cn("mt-5 border-t pt-3 font-mono text-[11.5px] leading-snug", highlight ? "border-accent-line text-ink-2" : "border-line text-ink-2")}>
        {foot}
      </p>
    </div>
  );
}

/* The fleet ----------------------------------------------------------------- */

function Fleet() {
  const { state } = useDash();
  const telemetry = useTelemetry();
  return (
    <Panel title="fleet — live" status="1 s refresh" live>
      {state.servers.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-[16px] text-ink">No boxes. The rack is empty.</p>
          <LinkButton href="/dashboard/deploy" variant="primary" className="mt-5">
            <Prompt /> Deploy one
          </LinkButton>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {state.servers.map((b) => {
            const cpu = Math.round(telemetry.latest(b.id).cpu * 100);
            const plan = planOf(b);
            return (
              <li key={b.id}>
                <Link
                  href={serverHref(b.id)}
                  className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-bg-2 focus-visible:-outline-offset-2 sm:grid-cols-[auto_minmax(0,15rem)_minmax(0,1fr)_4.5rem] sm:px-5"
                >
                  <Led status={b.status} size={10} />
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[13px] text-ink group-hover:text-accent">{b.id}</span>
                    <span className={cn("mt-0.5 block truncate font-mono text-[11px]", MUTED)}>
                      {plan.name} · {locationOf(b.location).code} · {STATUS_LABEL[b.status]}
                    </span>
                  </span>
                  <span className="col-span-3 row-start-2 min-w-0 sm:col-span-1 sm:row-start-auto">
                    <FleetStrip id={b.id} status={b.status} />
                  </span>
                  <span className="col-start-3 row-start-1 text-right font-mono text-[12px] tabular-nums text-ink sm:col-start-auto sm:row-start-auto">
                    {b.status === "running" ? (
                      `${cpu}% cpu`
                    ) : (
                      <span className={MUTED}>{b.status === "stopped" ? "off" : b.status === "locked" ? "locked" : "…"}</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className={cn("flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line px-5 py-2.5 font-mono text-[11px]", MUTED)}>
        <span className="flex items-center gap-1.5">
          <Led status="running" size={7} /> running
        </span>
        <span className="flex items-center gap-1.5">
          <Led status="booting" size={7} /> provisioning
        </span>
        <span className="flex items-center gap-1.5">
          <Led status="locked" size={7} /> waiting for unlock
        </span>
        <span className="flex items-center gap-1.5">
          <Led status="stopped" size={7} /> stopped
        </span>
        <span className="ml-auto">density follows cpu</span>
      </p>
    </Panel>
  );
}

function Session() {
  const { state } = useDash();
  const items = state.log.slice(0, 5);
  return (
    <Panel title="this session" status="memory only">
      <ul className="divide-y divide-line">
        {items.map((l) => (
          <li key={l.id} className="flex gap-4 px-5 py-2.5 font-mono text-[12px]">
            <time className={cn("shrink-0 tabular-nums", MUTED)}>{clock(l.at)}</time>
            <span className="min-w-0 text-ink">{l.text}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3">
        <p className="text-[15px] text-ink-2">Demo: gone when this tab closes. It&rsquo;s never sent anywhere.</p>
        <Link href="/dashboard/activity" className="shrink-0 font-mono text-[12px] text-accent underline-offset-4 hover:underline">
          activity →
        </Link>
      </div>
    </Panel>
  );
}

/* The right column ---------------------------------------------------------- */

function CanaryCard() {
  return (
    <Panel title="warrant canary" status="singing" live>
      <div className="flex items-end justify-between gap-4 px-5 pb-5 pt-6">
        <Pixels rows={BIRD_OPEN} palette={BIRD_PALETTE} scale={5} label="A pixel canary, singing" />
        <dl className="text-right font-mono text-[11.5px] leading-relaxed">
          <dt className={MUTED}>last signed</dt>
          <dd className="text-ink">{brand.canaryUpdated}</dd>
          <dt className={cn("mt-2", MUTED)}>next due</dt>
          <dd className="text-ink">{addMonths(brand.canaryUpdated, 1)}</dd>
        </dl>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3">
        <p className="font-mono text-[11.5px] text-ink-2">0 NSLs · 0 gag orders · 0 seizures</p>
        <Link href="/dashboard/canary" className="shrink-0 font-mono text-[12px] text-accent underline-offset-4 hover:underline">
          read it →
        </Link>
      </div>
    </Panel>
  );
}

/** Not a claim: the panel checks this tab's storage and reports what it finds. */
function ThisTab() {
  const { state } = useDash();
  const [found, setFound] = useState<{ cookies: number; local: number; session: number } | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const count = (s: () => Storage) => {
        try {
          return s().length;
        } catch {
          return 0;
        }
      };
      setFound({
        cookies: document.cookie ? document.cookie.split(";").filter(Boolean).length : 0,
        local: count(() => window.localStorage),
        session: count(() => window.sessionStorage),
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const rows: [string, string, boolean][] = found
    ? [
        ["cookies", `${found.cookies} set`, found.cookies === 0],
        ["localStorage", `${found.local} keys`, found.local === 0],
        ["sessionStorage", `${found.session} keys`, found.session === 0],
        ["panel", state.net === "onion" ? brand.onion : "clearnet", true],
      ]
    : [];
  return (
    <Panel title="what this demo tab holds" status="checked on load">
      <ul className="divide-y divide-line px-5 font-mono text-[12px]">
        {rows.map(([k, v, ok]) => (
          <li key={k} className="flex items-center gap-3 py-2.5">
            <Icon name={ok ? "check" : "close"} className={ok ? "text-accent" : "text-[#b23a2c]"} />
            <span className="text-ink-2">{k}</span>
            <span className="ml-auto truncate text-ink">{v}</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-5 py-3 text-[15px] leading-snug text-ink-2">
        Everything you see lives in this tab&rsquo;s memory. Lock, or close it, and it&rsquo;s gone.
      </p>
    </Panel>
  );
}

/** Each box's monthly price as a run of cells, so the bigger boxes look as expensive as they are. */
function SpendByBox() {
  const { state } = useDash();
  const UNIT = 2; // one cell per $2
  const monthly = (b: (typeof state.servers)[number]) => price(planOf(b).usd);
  const rows = [...state.servers].sort((a, b) => monthly(b) - monthly(a));
  const total = rows.reduce((s, b) => s + monthly(b), 0);
  return (
    <Panel title="spend by box" status={`■ ≈ $${UNIT} a month`} className="mt-6">
      <ul className="divide-y divide-line">
        {rows.map((b) => {
          const each = monthly(b);
          const n = Math.max(1, Math.round(each / UNIT));
          return (
            <li
              key={b.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-2.5 sm:grid-cols-[13rem_minmax(0,1fr)_8rem]"
            >
              <span className="truncate font-mono text-[12.5px] text-ink">{b.id}</span>
              <CellBar cells={n} lit={n} size={8} gap={2} className="col-span-2 row-start-2 flex-wrap sm:col-span-1 sm:row-start-auto" />
              <span className="text-right font-mono text-[12px] tabular-nums text-ink-2">
                {usd(each)} <span className={MUTED}>· {Math.round((each / Math.max(1, total)) * 100)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
