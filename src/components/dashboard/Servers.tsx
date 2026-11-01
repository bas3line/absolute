"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/components/kit";
import { Sparkbars } from "./charts";
import { imageLabel, locationOf, maskIp, planOf, uptime, type Server } from "./data";
import { serverHref } from "./nav";
import { ServerDetail } from "./ServerDetail";
import { useClock, useDash, useTelemetry } from "./store";
import {
  Button,
  Icon,
  LABEL,
  Led,
  LinkButton,
  MUTED,
  PageHeader,
  Prompt,
  STATUS_LABEL,
  Segmented,
  motion,
} from "./ui";

type Filter = "all" | "running" | "busy" | "stopped";
const BUSY = new Set(["booting", "rebooting", "rebuilding", "stopping"]);
const WAITING = new Set(["booting", "rebooting", "rebuilding", "stopping", "locked"]);
const matches = (f: Filter, s: Server) =>
  f === "all" || (f === "running" ? s.status === "running" : f === "stopped" ? s.status === "stopped" : WAITING.has(s.status));

/** The line as a chip: Blackbox in ink, the standard line outlined. */
function LineTag({ s }: { s: Server }) {
  const line = planOf(s).line;
  return (
    <span
      className={cn(
        "border px-1 font-mono text-[11px] leading-[15px]",
        line === "blackbox" ? "border-ink bg-ink text-white" : "border-line-2 text-ink-2",
      )}
    >
      {line === "blackbox" ? "Blackbox" : line.toUpperCase()}
    </span>
  );
}

const WORDS = ["No boxes.", "One box.", "Two boxes.", "Three boxes.", "Four boxes.", "Five boxes.", "Six boxes.", "Seven boxes."];

/** /dashboard/servers: every box, or one of them with ?id=. */
export function ServersRoute() {
  const id = useSearchParams().get("id");
  return id ? <ServerDetail key={id} id={id} /> : <Servers />;
}

export function Servers() {
  const { state } = useDash();
  const telemetry = useTelemetry();
  const now = useClock();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [revealAll, setRevealAll] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);

  const boxes = state.servers;
  const shown = boxes.filter((s) => matches(filter, s));
  const count = (f: Filter) => boxes.filter((s) => matches(f, s)).length;
  const isShown = (id: string) => revealAll || revealed.includes(id);
  const toggle = (id: string) => setRevealed((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  const upFor = (s: Server) => {
    if (s.status === "running" && s.startedAt) return `up ${uptime(now - s.startedAt)}`;
    if (s.status === "locked") return "waiting for unlock";
    if (BUSY.has(s.status)) {
      const p = Math.min(99, Math.max(0, Math.round(((now - s.opStart) / Math.max(1, s.opMs)) * 100)));
      return `${STATUS_LABEL[s.status]} ${p}%`;
    }
    return STATUS_LABEL[s.status];
  };

  return (
    <div className={motion.rise}>
      <PageHeader
        eyebrow="Servers"
        lead={WORDS[boxes.length] ?? `${boxes.length} boxes.`}
        trail="Nothing links them but you."
        intro="Each one has its own dedicated IPv4. The Blackbox ones keep their memory and disk keys to themselves. Addresses are masked on screen, for shoulders."
        actions={
          <>
            <Button aria-pressed={revealAll} onClick={() => setRevealAll((v) => !v)}>
              <Icon name={revealAll ? "eyeOff" : "eye"} />
              {revealAll ? "mask IPs" : "reveal IPs"}
            </Button>
            <LinkButton href="/dashboard/deploy" variant="primary">
              <Prompt />
              Deploy a box
              <span aria-hidden>→</span>
            </LinkButton>
          </>
        }
      />

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <Segmented
          legend="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `all ${count("all")}` },
            { value: "running", label: `running ${count("running")}` },
            { value: "busy", label: `waiting ${count("busy")}` },
            { value: "stopped", label: `stopped ${count("stopped")}` },
          ]}
        />
        <p className={cn("font-mono text-[11px]", MUTED)} aria-live="polite">
          {shown.length} of {boxes.length} shown · cpu updates every second
        </p>
      </div>

      {/* Wide screens: a table. Each row opens its box; the name is the keyboard target. */}
      <div className="relative mt-4 hidden overflow-x-auto border border-line-2 bg-paper md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Your servers. Open one by its name.</caption>
          <thead>
            <tr className={cn("border-b border-line-2 bg-bg-2", LABEL)}>
              <th scope="col" className="py-3 pl-4 pr-2 font-normal">
                <span className="sr-only">Status</span>
              </th>
              <th scope="col" className="px-3 py-3 font-normal">Name</th>
              <th scope="col" className="hidden px-3 py-3 font-normal xl:table-cell">Plan</th>
              <th scope="col" className="px-3 py-3 font-normal">Location</th>
              <th scope="col" className="px-3 py-3 font-normal">IPv4</th>
              <th scope="col" className="px-3 py-3 font-normal">State</th>
              <th scope="col" className="hidden px-3 py-3 font-normal xl:table-cell">CPU · 20 s</th>
              <th scope="col" className="w-10 py-3 pr-4 font-normal">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((s) => {
              const plan = planOf(s);
              const region = locationOf(s.location);
              const series = telemetry.series(s.id).map((x) => x.cpu);
              const cpu = Math.round((series[series.length - 1] ?? 0) * 100);
              return (
                <tr
                  key={s.id}
                  onClick={() => router.push(serverHref(s.id))}
                  className="group cursor-pointer transition-colors hover:bg-bg-2"
                >
                  <td className="py-3.5 pl-4 pr-2 align-middle">
                    <Led status={s.status} size={10} />
                  </td>
                  <td className="px-3 py-3.5">
                    <Link
                      href={serverHref(s.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="whitespace-nowrap font-mono text-[13.5px] text-ink underline-offset-4 group-hover:text-accent hover:underline"
                    >
                      {s.id}
                    </Link>
                    <span className={cn("mt-1 flex items-center gap-2 whitespace-nowrap font-mono text-[11px]", MUTED)}>
                      <LineTag s={s} />
                      {imageLabel(s.image)}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3.5 xl:table-cell">
                    <span className="block whitespace-nowrap text-[15px] font-medium text-ink">{plan.name}</span>
                    <span className={cn("block whitespace-nowrap font-mono text-[11px]", MUTED)}>
                      {plan.cores} × {plan.cpu.replace(" · SEV-SNP", "")} · {plan.ram}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="flex items-center gap-2">
                      <span className="border border-line-2 px-1 font-mono text-[11px] leading-[16px] text-ink">{region.code}</span>
                      <span className="hidden whitespace-nowrap text-[14px] text-ink-2 min-[1520px]:inline">{region.city}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="flex items-center gap-1.5">
                      <span className="min-w-[8.5rem] font-mono text-[12.5px] tabular-nums text-ink">
                        {isShown(s.id) ? s.ipv4 : maskIp(s.ipv4)}
                      </span>
                      <button
                        type="button"
                        aria-pressed={isShown(s.id)}
                        aria-label={`${isShown(s.id) ? "Mask" : "Reveal"} the IPv4 address of ${s.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(s.id);
                        }}
                        disabled={revealAll}
                        className="grid size-7 place-items-center text-ink-2 transition-colors hover:bg-bg-3 hover:text-ink disabled:opacity-40"
                      >
                        <Icon name={isShown(s.id) ? "eyeOff" : "eye"} />
                      </button>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 font-mono text-[12.5px] tabular-nums text-ink">{upFor(s)}</td>
                  <td className="hidden px-3 py-3.5 xl:table-cell">
                    <span className="flex items-center gap-3">
                      <Sparkbars values={series} active={s.status === "running"} />
                      <span className="w-9 text-right font-mono text-[12px] tabular-nums text-ink-2">
                        {s.status === "running" ? `${cpu}%` : "—"}
                      </span>
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-ink-2 group-hover:text-accent">
                    <Icon name="arrow" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 ? <Empty filter={filter} /> : null}
        <p className={cn("border-t border-line px-4 py-2.5 font-mono text-[11px]", MUTED)}>
          every plan: dedicated IPv4 · full root or RDP · no traffic logging · Blackbox: SEV-SNP memory, LUKS2 disk, no guest agent
        </p>
      </div>

      {/* Narrow screens: cards. */}
      <ul className="mt-4 flex flex-col gap-3 md:hidden">
        {shown.map((s) => {
          const plan = planOf(s);
          const region = locationOf(s.location);
          const series = telemetry.series(s.id).map((x) => x.cpu);
          return (
            <li key={s.id} className="border border-line-2 bg-paper">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <Led status={s.status} size={10} />
                <Link href={serverHref(s.id)} className="min-w-0 flex-1 truncate font-mono text-[14px] text-ink underline-offset-4 hover:text-accent hover:underline">
                  {s.id}
                </Link>
                <span className={cn("font-mono text-[11px]", MUTED)}>{STATUS_LABEL[s.status]}</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3.5 font-mono text-[12px]">
                <div>
                  <dt className={MUTED}>plan</dt>
                  <dd className="text-ink">{plan.name}</dd>
                </div>
                <div>
                  <dt className={MUTED}>location</dt>
                  <dd className="text-ink">
                    {region.code} · {region.city}
                  </dd>
                </div>
                <div>
                  <dt className={MUTED}>ipv4</dt>
                  <dd className="flex items-center gap-1 text-ink">
                    <span className="tabular-nums">{isShown(s.id) ? s.ipv4 : maskIp(s.ipv4)}</span>
                    <button
                      type="button"
                      aria-pressed={isShown(s.id)}
                      aria-label={`${isShown(s.id) ? "Mask" : "Reveal"} the IPv4 address of ${s.id}`}
                      onClick={() => toggle(s.id)}
                      disabled={revealAll}
                      className="grid size-7 place-items-center text-ink-2 disabled:opacity-40"
                    >
                      <Icon name={isShown(s.id) ? "eyeOff" : "eye"} />
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className={MUTED}>state</dt>
                  <dd className="tabular-nums text-ink">{upFor(s)}</dd>
                </div>
              </dl>
              <div className="flex items-center gap-3 border-t border-line px-4 py-3">
                <Sparkbars values={series} active={s.status === "running"} />
                <LineTag s={s} />
                <Link href={serverHref(s.id)} className="ml-auto font-mono text-[12px] text-accent" aria-label={`Open ${s.id}`}>
                  open →
                </Link>
              </div>
            </li>
          );
        })}
        {shown.length === 0 ? (
          <li className="border border-line-2 bg-paper">
            <Empty filter={filter} />
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function Empty({ filter }: { filter: Filter }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-[16px] text-ink">{filter === "all" ? "No boxes. The rack is empty." : "Nothing in this state right now."}</p>
      {filter === "all" ? (
        <LinkButton href="/dashboard/deploy" variant="primary" className="mt-5">
          <Prompt /> Deploy one
        </LinkButton>
      ) : null}
    </div>
  );
}
