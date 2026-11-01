"use client";

import { cn } from "@/components/kit";
import { clock } from "./data";
import { useClock, useDash, type LogKind } from "./store";
import { Button, DISPLAY, Icon, MUTED, Panel, motion } from "./ui";

/*
 * The access log is the joke and the point: it's empty, and it stays empty, because web access
 * logs go to /dev/null. Below it, labelled for what it is, a list of what you did in this demo
 * tab, held in memory and dropped when the tab closes.
 */

// An empty folder in pixels, 34 × 22: tab, outline, four blank log lines and a waiting cursor.
const W = 34;
const H = 22;
const FOLDER = (() => {
  const cells: { x: number; y: number; c: "line" | "faint" | "cursor" }[] = [];
  const put = (x: number, y: number, c: "line" | "faint" | "cursor" = "line") => cells.push({ x, y, c });
  for (let x = 3; x <= 11; x++) put(x, 2);
  put(2, 3);
  put(12, 3);
  for (let x = 1; x <= 32; x++) {
    if (x < 2 || x > 12) put(x, 4);
    put(x, 20);
  }
  put(1, 3);
  for (let y = 4; y <= 20; y++) {
    put(1, y);
    put(32, y);
  }
  for (const y of [8, 11, 14, 17]) for (let x = 5; x <= 28; x += 2) put(x, y, "faint");
  put(5, 8, "cursor");
  return cells;
})();
const DUST = [
  { x: 16, y: 1, d: 0 },
  { x: 22, y: 0, d: 900 },
  { x: 27, y: 2, d: 1700 },
  { x: 8, y: 0, d: 2400 },
];

function EmptyFolder() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W * 7} height={H * 7} shapeRendering="crispEdges" aria-hidden className="block h-auto max-w-full">
      {FOLDER.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={1}
          height={1}
          fill={c.c === "line" ? "var(--mint-pale)" : c.c === "cursor" ? "var(--mint)" : "var(--night-line)"}
          className={c.c === "cursor" ? motion.blink : undefined}
        />
      ))}
      {DUST.map((d) => (
        <rect
          key={`${d.x}-${d.y}`}
          x={d.x}
          y={d.y}
          width={1}
          height={1}
          fill="var(--peri-soft)"
          className={motion.drift}
          style={{ ["--delay" as string]: `${d.d}ms` }}
        />
      ))}
    </svg>
  );
}

const KIND_LABEL: Record<LogKind, string> = {
  session: "session",
  deploy: "deploy",
  power: "power",
  destroy: "destroy",
  billing: "billing",
  keys: "keys",
  network: "network",
};

export function Activity() {
  const { state, actions } = useDash();
  const now = useClock();

  return (
    <div className={motion.rise}>
      <section aria-labelledby="audit" className="border border-night bg-night text-white">
        <div className="flex h-9 items-center gap-3 border-b border-night-line px-3 font-mono text-[11px]">
          <span aria-hidden className="flex gap-[3px]">
            <span className="size-[7px] bg-white/25" />
            <span className="size-[7px] bg-white/25" />
            <span className="size-[7px] bg-white/25" />
          </span>
          <span className="flex-1 truncate text-center text-white/80">access.log — every visitor, every request</span>
          <span className="shrink-0 text-mint">0 lines</span>
        </div>
        <div className="grid items-center gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-14 lg:px-14 lg:py-16">
          <EmptyFolder />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mint-pale/80">
              <span aria-hidden className="size-[7px] bg-mint" />
              Activity
            </p>
            <h1 id="audit" className={cn("mt-5 text-balance text-[clamp(2.2rem,4.8vw,3.8rem)] leading-[0.98] text-mint-pale", DISPLAY)}>
              Nothing here.
              <br />
              <span className="text-mint">That&rsquo;s the point.</span>
            </h1>
            <p className="mt-5 max-w-[54ch] text-pretty text-[16px] leading-relaxed text-white/80">
              Web access logs go to /dev/null: no visitor IPs, no request times, no user agents. On your servers, no packet
              inspection, no flow logs, no activity monitoring.
            </p>
            <p className="mt-7 max-w-full overflow-hidden border border-night-line bg-night-2 px-3.5 py-2.5 font-mono text-[12.5px] text-white/85">
              <span className="text-white/70"># the web server&rsquo;s whole access-log setting</span>
              <span className="block">
                <span className="text-mint">CustomLog</span> /dev/null combined
              </span>
            </p>
            <p className="mt-4 max-w-[60ch] text-pretty font-mono text-[11.5px] leading-relaxed text-white/70">
              Error and job logs are kept for debugging crashes. They carry server identifiers, never a visitor&rsquo;s address.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="this-tab" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="this-tab" className={cn("text-[26px] leading-tight text-ink", DISPLAY)}>
              What you did in this session
            </h2>
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <span className="bg-mint px-1.5 py-0.5 font-mono text-[11.5px] text-ink">this tab only, gone when you close it</span>
              <span className={cn("font-mono text-[11.5px]", MUTED)}>demo: kept in memory, never sent anywhere</span>
            </p>
          </div>
          <Button onClick={actions.forget} disabled={state.log.length === 0}>
            <Icon name="close" /> forget it now
          </Button>
        </div>

        <Panel className="mt-5" title="session.mem" status={`${state.log.length} ${state.log.length === 1 ? "entry" : "entries"}`} live={state.log.length > 0}>
          {state.log.length === 0 ? (
            <p className="px-5 py-10 text-center text-[16px] text-ink-2">
              Forgotten. Reboot something and it&rsquo;ll show up here, and nowhere else.
            </p>
          ) : (
            <ol className="divide-y divide-line" aria-live="polite">
              {state.log.map((l) => (
                <li key={l.id} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[4.75rem_5.5rem_minmax(0,1fr)_auto]">
                  <time className="font-mono text-[12px] tabular-nums text-ink" dateTime={new Date(l.at).toISOString()}>
                    {clock(l.at)}
                  </time>
                  <span className="hidden sm:block">
                    <span
                      className={cn(
                        "inline-block border px-1 font-mono text-[11px] leading-[16px]",
                        l.kind === "destroy" ? "border-[#b23a2c]/40 text-[#b23a2c]" : "border-accent-line bg-accent-soft text-accent",
                      )}
                    >
                      {KIND_LABEL[l.kind]}
                    </span>
                  </span>
                  <span className="min-w-0 text-[15px] leading-snug text-ink">{l.text}</span>
                  <span className={cn("col-start-2 font-mono text-[11px] sm:col-start-auto sm:text-right", MUTED)}>{ago(now - l.at)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <p className={cn("mt-3 font-mono text-[11px]", MUTED)}>
          Lock the panel or close the tab and this list is gone. This demo never sends it anywhere.
        </p>
      </section>
    </div>
  );
}

function ago(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
