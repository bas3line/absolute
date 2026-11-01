"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/kit";
import { blackboxTerms, fmt } from "@/lib/catalog";
import { PixelChart } from "./charts";
import { Console } from "./Console";
import {
  BLACKBOX_FAMILIES,
  FAMILIES,
  RELEASE,
  TODAY,
  allowanceTb,
  daysBetween,
  imageLabel,
  imageOf,
  isWindows,
  locationOf,
  maskIp,
  maskIp6,
  measurementOf,
  planOf,
  randomString,
  rdnsSettable,
  shortFp,
  uptime,
  type ImageId,
  type Server,
} from "./data";
import { OS } from "./glyphs";
import { Shred } from "./Shred";
import { useClock, useDash, useNow, useTelemetry, type Sample } from "./store";
import {
  Button,
  CellBar,
  Cmd,
  CopyButton,
  DANGER_TEXT,
  DISPLAY,
  Dialog,
  Icon,
  LABEL,
  Led,
  LinkButton,
  MUTED,
  Meta,
  Panel,
  Pixels,
  STATUS_LABEL,
  Spin,
  inputClass,
  motion,
} from "./ui";

const BUSY = new Set(["booting", "rebooting", "rebuilding", "stopping"]);
const ramGb = (ram: string) => Number.parseFloat(ram) || 1;

export function ServerDetail({ id }: { id: string }) {
  const { state, actions } = useDash();
  const router = useRouter();
  const box = state.servers.find((s) => s.id === id);
  const [shredding, setShredding] = useState<Server | null>(null);

  if (shredding) {
    return (
      <Shred
        box={shredding}
        onDone={() => {
          actions.destroy(shredding.id);
          router.push("/dashboard/servers");
        }}
      />
    );
  }
  if (!box) return <Missing id={id} />;
  return <Detail box={box} onDestroy={() => setShredding(box)} />;
}

function Missing({ id }: { id: string }) {
  return (
    <div className={cn("max-w-[44rem]", motion.rise)}>
      <Link href="/dashboard/servers" className={cn("inline-flex items-center gap-2 font-mono text-[12px] hover:text-ink", MUTED)}>
        <Icon name="back" /> servers
      </Link>
      <p className={cn("mt-8", LABEL)}>404, more or less</p>
      <h1 className={cn("mt-4 text-balance text-[clamp(2rem,3.6vw,3.1rem)] leading-[1] text-ink", DISPLAY)}>
        No box called <span className="font-mono text-[0.8em] font-semibold tracking-[-0.03em]">{id}</span>.
        <br />
        <span className="text-accent">It was never here, or it was destroyed.</span>
      </h1>
      <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-ink-2">
        Deleted and expired servers are removed along with their data, so there&rsquo;s nothing left to show. If you
        reloaded the page, this demo panel forgot its session too: it only ever lived in the tab.
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        <LinkButton href="/dashboard/servers">All servers</LinkButton>
        <LinkButton href="/dashboard/deploy" variant="primary">
          Deploy a box →
        </LinkButton>
      </div>
    </div>
  );
}

type Confirm = null | "reboot" | "off" | "rebuild" | "destroy" | "password";

function Detail({ box, onDestroy }: { box: Server; onDestroy: () => void }) {
  const { state, actions } = useDash();
  const telemetry = useTelemetry();
  const now = useClock();
  const plan = planOf(box);
  const loc = locationOf(box.location);
  const bb = plan.line === "blackbox";
  const win = isWindows(box.image);
  const series = telemetry.series(box.id);
  const latest: Sample = series[series.length - 1] ?? { cpu: 0, ram: 0, rx: 0, tx: 0 };
  const consoleInput = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [reveal, setReveal] = useState(false);
  const running = box.status === "running";
  const locked = box.status === "locked";
  const up = running || locked;
  const busy = BUSY.has(box.status);
  const key = state.keys.find((k) => k.id === box.keyId);
  const left = daysBetween(TODAY, box.expires);
  const noAgentId = useId();

  return (
    <div className={motion.rise}>
      <Link
        href="/dashboard/servers"
        className={cn("inline-flex items-center gap-2 font-mono text-[12px] transition-colors hover:text-ink", MUTED)}
      >
        <Icon name="back" /> servers
      </Link>

      <header className="mt-5 flex flex-col gap-6 border-b border-line pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2.5 font-mono text-[12px] text-ink-2">
            <Led status={box.status} size={10} />
            <span aria-live="polite">{STATUS_LABEL[box.status]}</span>
            {running && box.startedAt ? <span className={MUTED}>· up {uptime(now - box.startedAt)}</span> : null}
            <span className={cn("border px-1 leading-[16px]", bb ? "border-ink bg-ink text-white" : "border-line-2 text-ink-2")}>
              {bb ? "Blackbox" : plan.line.toUpperCase()}
            </span>
          </p>
          <h1 className="mt-3 break-all font-mono text-[clamp(1.75rem,3.6vw,2.8rem)] font-semibold leading-none tracking-[-0.04em] text-ink">
            {box.id}
          </h1>
          <p className={cn("mt-3 font-mono text-[12px] leading-relaxed", MUTED)}>
            {plan.name} · {plan.cores} × {plan.cpu} · {plan.ram} · {plan.disk} · {plan.port} · {loc.city} ({loc.code}) ·{" "}
            {imageLabel(box.image)}
          </p>
        </div>
        <dl className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 font-mono text-[12.5px]">
          <dt className={MUTED}>ipv4</dt>
          <dd className="tabular-nums text-ink">{reveal ? box.ipv4 : maskIp(box.ipv4)}</dd>
          <dd className={cn("flex flex-col gap-1.5", box.ipv6 ? "row-span-2" : "")}>
            <Button size="sm" aria-pressed={reveal} onClick={() => setReveal((r) => !r)}>
              <Icon name={reveal ? "eyeOff" : "eye"} />
              {reveal ? "mask" : "reveal"}
            </Button>
          </dd>
          {box.ipv6 ? (
            <>
              <dt className={MUTED}>ipv6</dt>
              <dd className="truncate tabular-nums text-ink">{reveal ? box.ipv6 : maskIp6(box.ipv6)}</dd>
            </>
          ) : null}
          <dt className={MUTED}>{win ? "rdp" : "ssh"}</dt>
          <dd className="col-span-2 flex items-center gap-2 text-ink">
            <span className="truncate">{win ? (reveal ? box.ipv4 : maskIp(box.ipv4)) : `root@${reveal ? box.ipv4 : maskIp(box.ipv4)}`}</span>
            <CopyButton text={win ? `mstsc /v:${box.ipv4}` : `ssh root@${box.ipv4}`} label={win ? "copy rdp" : "copy ssh"} />
          </dd>
        </dl>
      </header>

      {/* Power ------------------------------------------------------------- */}
      <section aria-label="Power" className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setConfirm("reboot")} disabled={!up}>
            <Icon name="reboot" /> reboot
          </Button>
          {box.status === "stopped" ? (
            <Button variant="accent" onClick={() => actions.power(box.id, "on")}>
              <Icon name="power" /> power on
            </Button>
          ) : (
            <Button onClick={() => setConfirm("off")} disabled={!up}>
              <Icon name="power" /> power off
            </Button>
          )}
          <Button onClick={() => setConfirm("rebuild")} disabled={busy}>
            <Icon name="rebuild" /> reinstall
          </Button>
          <Button onClick={() => consoleInput.current?.focus()} disabled={!running}>
            <Icon name="terminal" /> console
          </Button>
          {bb ? (
            <Button disabled aria-describedby={noAgentId}>
              <Icon name="keys" /> reset password
            </Button>
          ) : (
            <Button onClick={() => setConfirm("password")} disabled={!running}>
              <Icon name="keys" /> reset {win ? "Administrator" : "root"} password
            </Button>
          )}
          <Button variant="danger" className="sm:ml-auto" onClick={() => setConfirm("destroy")} disabled={busy}>
            <Icon name="trash" /> destroy
          </Button>
        </div>
        {bb ? (
          <p id={noAgentId} className={cn("font-mono text-[11.5px] leading-relaxed", MUTED)}>
            No reset-password button: a Blackbox has no guest agent, and no virtio port for one. Nothing outside can run
            anything inside it.
          </p>
        ) : null}
        <Progress box={box} />
        {locked ? <UnlockPanel box={box} cores={plan.cores} /> : null}
      </section>

      {/* Live charts ------------------------------------------------------- */}
      <section aria-label="Live usage" className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartPanel
          title="cpu"
          value={`${Math.round(latest.cpu * 100)}`}
          unit="%"
          foot={`avg ${pct(avg(series.map((s) => s.cpu)))} · peak ${pct(Math.max(0, ...series.map((s) => s.cpu)))} · ${plan.cores} × ${plan.cpu.replace(" · SEV-SNP", "")}`}
        >
          <PixelChart values={series.map((s) => s.cpu)} max={1} />
        </ChartPanel>
        {bb ? (
          <TransferPanel box={box} allowance={allowanceTb(plan) ?? 0} ram={plan.ram} />
        ) : (
          <ChartPanel title="ram" value={(latest.ram * ramGb(plan.ram)).toFixed(1)} unit={`of ${ramGb(plan.ram)} GB`} foot={`${plan.ram} · ${plan.disk}`}>
            <PixelChart values={series.map((s) => s.ram)} max={1} />
          </ChartPanel>
        )}
        <NetPanel series={series} port={plan.port} blackbox={bb} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Console box={box} inputRef={consoleInput} sample={latest} className="flex-1" />
          {bb ? <Attestation box={box} cores={plan.cores} /> : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {bb ? (
            <Panel title="disk encryption" status={running ? "unlocked by you" : box.encrypted ? "locked" : "not yet encrypted"} live={running}>
              <div className="flex gap-4 px-5 py-5">
                <Pixels rows={DISK} scale={4} palette={{ "#": "var(--accent)", o: running ? "var(--marker)" : "var(--ink-4)" }} />
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold leading-snug text-ink">
                    LUKS2, <span className="text-accent">passphrase typed only by you.</span>
                  </p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
                    aes-xts-plain64, 512-bit key, argon2id. You send the passphrase over SSH after blackbox-verify prints
                    PASS. Nobody can recover it, the host included.
                  </p>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel title="details">
            <Meta
              className="mx-5 my-4"
              rows={[
                ["plan", `${plan.name} · ${fmt(plan.usd)}/mo`],
                ["location", `${loc.city}, ${loc.country}${loc.owned ? " · owned hardware" : ""}`],
                ["system", imageLabel(box.image)],
                ["port", `${plan.port} · ${plan.transfer}`],
                ["created", box.created],
                ["access", win ? "Administrator password, in the panel" : key ? `${key.name} · ${shortFp(key.fingerprint)}` : "root password, in the panel"],
                ["traffic logging", "none: no packet inspection, no flow logs"],
              ]}
            />
          </Panel>

          <NetworkPanel box={box} reveal={reveal} />

          <Panel title="expiry" status={`${left} days`}>
            <div className="px-5 py-4">
              <CellBar cells={30} lit={Math.min(30, Math.max(0, left))} size={6} gap={2} className="flex-wrap" />
              <p className="mt-3 text-[15px] text-ink">
                Expires on <span className="font-mono">{box.expires}</span>. Expired services are removed along with their data.
              </p>
              <p className={cn("mt-1 font-mono text-[11.5px]", MUTED)}>
                {fmt(plan.usd)}/mo · renews every {box.cycle} mo · auto-renew {box.autoRenew ? "on" : "off"}
              </p>
              <LinkButton href="/dashboard/billing" size="sm" className="mt-4">
                renew →
              </LinkButton>
            </div>
          </Panel>
        </div>
      </div>

      {bb ? <Limits /> : null}

      <section
        aria-labelledby="danger"
        className="mt-6 flex flex-col gap-4 border border-[#b23a2c]/35 bg-[#fdf6f5] px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 id="danger" className={cn("font-mono text-[11px] uppercase tracking-[0.14em]", DANGER_TEXT)}>
            Destroy
          </h2>
          <p className="mt-2 max-w-[60ch] text-[16px] leading-relaxed text-ink-2">
            Deletes the server and its disk. Deleted services are removed along with their data; there&rsquo;s no backup
            to restore from.
          </p>
        </div>
        <Button variant="danger" onClick={() => setConfirm("destroy")} disabled={busy}>
          <Icon name="trash" /> destroy {box.id}
        </Button>
      </section>

      <PowerDialogs box={box} which={confirm} onClose={() => setConfirm(null)} onDestroy={onDestroy} />
    </div>
  );
}

const DISK = ["#########", "#.......#", "#.#####.#", "#.#...#.#", "#.#.o.#.#", "#.#...#.#", "#.#####.#", "#.......#", "#########"];

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (v: number) => `${Math.round(v * 100)}%`;

function ChartPanel({ title, value, unit, foot, children }: { title: string; value: string; unit: string; foot: string; children: ReactNode }) {
  return (
    <Panel title={`${title} — last 60 s`} status="live" live className="flex flex-col" bodyClassName="flex flex-1 flex-col">
      <div className="flex-1 px-5 pt-5">
        <p className="flex items-baseline gap-2">
          <span className="font-dot text-[44px] font-bold leading-[0.8] tracking-[-0.02em] text-ink tabular-nums">{value}</span>
          <span className="font-mono text-[12px] text-ink-2">{unit}</span>
        </p>
        <div className="mt-5">{children}</div>
      </div>
      <p className={cn("mt-4 border-t border-line px-5 py-2.5 font-mono text-[11px]", MUTED)}>{foot}</p>
    </Panel>
  );
}

function niceMax(v: number) {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  return steps.find((s) => s >= v * 1.15) ?? Math.ceil(v);
}

function NetPanel({ series, port, blackbox }: { series: Sample[]; port: string; blackbox: boolean }) {
  const rx = series.map((s) => s.rx);
  const tx = series.map((s) => s.tx);
  const top = niceMax(Math.max(1, ...rx, ...tx));
  const last = series[series.length - 1] ?? { rx: 0, tx: 0 };
  return (
    <ChartPanel
      title="network"
      value={last.rx.toFixed(last.rx < 10 ? 1 : 0)}
      unit={`↓ in · ${last.tx.toFixed(last.tx < 10 ? 1 : 0)} ↑ out, Mbit/s`}
      foot={blackbox ? `${port} port · the host sees volume and headers, like any transit` : `${port} port · scale 0–${top} Mbit/s · in above, out below`}
    >
      <PixelChart values={rx} mirror={tx} max={top} />
    </ChartPanel>
  );
}

/** Blackbox: transfer against the 31-day allowance, in place of a RAM chart the host can't draw. */
function TransferPanel({ box, allowance, ram }: { box: Server; allowance: number; ram: string }) {
  const CELLS = 24;
  const lit = allowance ? Math.min(CELLS, Math.round((box.transferTb / allowance) * CELLS)) : 0;
  return (
    <Panel title="transfer — this 31 days" status="allowance" className="flex flex-col" bodyClassName="flex flex-1 flex-col">
      <div className="flex-1 px-5 pt-5">
        <p className="flex items-baseline gap-2">
          <span className="font-dot text-[44px] font-bold leading-[0.8] tracking-[-0.02em] text-ink tabular-nums">{box.transferTb.toFixed(1)}</span>
          <span className="font-mono text-[12px] text-ink-2">of {allowance} TB used</span>
        </p>
        <CellBar cells={CELLS} lit={lit} size={8} gap={2} className="mt-6 flex-wrap" />
        <p className="mt-4 text-pretty text-[14px] leading-snug text-ink-2">{blackboxTerms.transfer}</p>
      </div>
      <p className={cn("mt-4 border-t border-line px-5 py-2.5 font-mono text-[11px]", MUTED)}>
        ram: {ram}, encrypted by SEV-SNP. no guest agent, so the panel can&rsquo;t see how much is used.
      </p>
    </Panel>
  );
}

/** A Blackbox's launch measurement, how to check it, and what it covers. */
function Attestation({ box, cores }: { box: Server; cores: number }) {
  const m = measurementOf(box.id);
  const cmd = `python3 blackbox-verify --host ${box.ipv4} --release ./${RELEASE.id} --vcpus ${cores}`;
  return (
    <Panel title="attestation" status={box.status === "locked" ? "verify before you unlock" : "SEV-SNP active"} live={box.status === "running"}>
      <Meta
        className="mx-5 my-4"
        rows={[
          ["memory", "AMD SEV-SNP · key never leaves the chip"],
          ["boot", `measured · release ${RELEASE.id}`],
          ["kernel", RELEASE.kernel],
          ["vCPUs", String(cores)],
          ["guest policy", `${RELEASE.policy} · debugging off`],
          [
            "expected measurement",
            <span key="m" className="inline-flex items-center gap-2">
              <span title={m}>
                {m.slice(0, 10)}…{m.slice(-6)}
              </span>
              <CopyButton text={m} />
            </span>,
          ],
        ]}
      />
      <div className="border-t border-night bg-night px-4 py-3 font-mono text-[12px] leading-relaxed text-white/85">
        <p>
          <span className="text-mint">$ </span>
          <Cmd text={cmd} />
        </p>
        <p className="text-white/70">verdict must be PASS before you type a passphrase.</p>
      </div>
      <p className={cn("px-5 py-3 font-mono text-[11px] leading-relaxed", MUTED)}>
        Run it on your own computer, never on the server. The verifier recomputes the number itself; the panel&rsquo;s copy is
        a convenience. This demo&rsquo;s measurement is made up. Boot your own UKI by URL and SHA-256 and the CPU measures
        your bytes instead.
      </p>
    </Panel>
  );
}

/** What a locked Blackbox needs from you. The passphrase never goes through the panel. */
function UnlockPanel({ box, cores }: { box: Server; cores: number }) {
  const { actions } = useDash();
  const first = !box.encrypted;
  const verb = first ? "encrypt" : "unlock";
  return (
    <div className="border border-ink bg-paper" role="status">
      <div className="flex items-start gap-3 border-b border-line bg-lime px-4 py-2.5">
        <span aria-hidden className="mt-[6px] size-[8px] shrink-0 bg-ink" />
        <p className="font-mono text-[12.5px] text-ink">
          {first
            ? "First boot: waiting in its initramfs. Nothing from its disk has run."
            : "Waiting for unlock in its initramfs. Nothing from its disk has run."}
        </p>
      </div>
      <ol className="grid gap-px bg-line md:grid-cols-2">
        <li className="bg-paper px-4 py-3.5">
          <p className={LABEL}>1 · verify, on your own computer</p>
          <p className="mt-2 bg-night px-3 py-2 font-mono text-[12px] leading-relaxed text-white/85">
            <span className="text-mint">$ </span>
            <Cmd text={`python3 blackbox-verify --host ${box.ipv4} --release ./${RELEASE.id} --vcpus ${cores}`} />
          </p>
          <p className={cn("mt-2 font-mono text-[11.5px]", MUTED)}>PASS, or don&rsquo;t type anything.</p>
        </li>
        <li className="bg-paper px-4 py-3.5">
          <p className={LABEL}>2 · {verb}, over SSH</p>
          <p className="mt-2 bg-night px-3 py-2 font-mono text-[12px] leading-relaxed text-white/85">
            <span className="text-mint">$ </span>ssh root@{box.ipv4} {verb}
          </p>
          <p className={cn("mt-2 font-mono text-[11.5px]", MUTED)}>
            {first ? "Asks for a new passphrase once, then encrypts the root in place." : "Asks for your passphrase, then the system boots."}
          </p>
        </li>
      </ol>
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
        <Button variant="accent" size="sm" onClick={() => actions.diskUnlocked(box.id)}>
          <Icon name="check" scale={1.5} /> demo: I did that
        </Button>
        <p className={cn("font-mono text-[11.5px]", MUTED)}>
          The panel never sees the passphrase. Don&rsquo;t type it into the console either: that passes through the host.
        </p>
      </div>
    </div>
  );
}

/** Addresses, and reverse DNS where it can be set: the owned Montreal hardware. */
function NetworkPanel({ box, reveal }: { box: Server; reveal: boolean }) {
  const { actions } = useDash();
  const settable = rdnsSettable(box);
  const bb = box.ipv6 !== null;
  const [value, setValue] = useState(box.rdns ?? "");
  const [tried, setTried] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const clean = value.trim().replace(/\.$/, "");
  const valid = clean === "" || /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(clean);
  return (
    <Panel title="network" status={settable ? "rDNS: yours to set" : "dedicated IPv4"}>
      <Meta
        className="mx-5 my-4"
        rows={[
          ["ipv4", `${reveal ? box.ipv4 : maskIp(box.ipv4)} · dedicated`],
          ...(box.ipv6 ? ([["ipv6", `${reveal ? box.ipv6 : maskIp6(box.ipv6)} · routed to it`]] as [string, string][]) : []),
          ...(bb ? ([["BYOIP · BYOASN", "your own space, or your own BGP session"]] as [string, string][]) : []),
          ...(settable ? ([["reverse dns", box.rdns ?? "not set"]] as [string, string][]) : []),
        ]}
      />
      {settable ? (
        <form
          className="border-t border-line px-5 py-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (!valid) return;
            actions.setRdns(box.id, clean || null);
          }}
        >
          <label htmlFor={inputId} className={LABEL}>
            reverse dns for {reveal ? box.ipv4 : maskIp(box.ipv4)}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id={inputId}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="mail.example.com"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={tried && !valid ? true : undefined}
              aria-describedby={hintId}
              className={cn(inputClass(tried && !valid), "h-9 min-w-0 flex-1")}
            />
            <Button type="submit" size="sm" className="h-9">
              set
            </Button>
          </div>
          <p id={hintId} aria-live="polite" className={cn("mt-1.5 font-mono text-[11.5px]", tried && !valid ? DANGER_TEXT : MUTED)}>
            {tried && !valid ? "That isn't a hostname. Something like mail.example.com." : "Live within a minute. Empty clears it."}
          </p>
        </form>
      ) : null}
    </Panel>
  );
}

/** The honest list, from the measured-boot guide: what a Blackbox does not hide. */
function Limits() {
  const items: [string, string][] = [
    ["The console.", "Serial and VNC pass through the host. They can watch; don't type secrets into them."],
    ["Metadata.", "Traffic volume, packet headers, CPU use and the fact that the machine exists, as at any transit provider."],
    ["Disk integrity.", "LUKS2 with XTS hides your data but doesn't authenticate it. A host could corrupt ciphertext blindly; it can't read it."],
    ["Availability.", "The host can stop or delete the machine. It cannot read it."],
  ];
  return (
    <section aria-labelledby="limits" className="mt-6 border border-line-2 bg-bg-2 bg-hatch">
      <div className="border-b border-line-2 bg-paper px-5 py-3">
        <h2 id="limits" className={LABEL}>
          What a Blackbox still shows the host
        </h2>
      </div>
      <ul className="grid gap-px bg-line-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(([k, v]) => (
          <li key={k} className="bg-paper px-5 py-4">
            <p className="text-[16px] font-semibold text-ink">{k}</p>
            <p className="mt-1.5 text-pretty text-[15px] leading-relaxed text-ink-2">{v}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A live bar for whatever the box is doing, with the line that matters. */
function Progress({ box }: { box: Server }) {
  const busy = BUSY.has(box.status);
  const now = useNow(200, busy);
  if (!busy) return <p className="sr-only" aria-live="polite" />;
  const bb = planOf(box).line === "blackbox";
  const p = now ? Math.min(1, Math.max(0, (now - box.opStart) / Math.max(1, box.opMs))) : 0;
  const note =
    box.status === "rebooting"
      ? bb
        ? "rebooting. it comes back waiting for unlock."
        : "rebooting."
      : box.status === "rebuilding"
        ? `reinstalling ${imageLabel(box.image)} on a fresh disk.`
        : box.status === "stopping"
          ? "powering off."
          : bb
            ? "booting into its initramfs. it will wait for you to verify and unlock."
            : "provisioning. about 30 seconds after payment.";
  return (
    <div className="flex flex-wrap items-center gap-3 border border-line-2 bg-bg-2 px-4 py-3" role="status" aria-live="polite">
      <Spin className="text-accent" />
      <span className="font-mono text-[12.5px] text-ink">{note}</span>
      <span className="ml-auto flex items-center gap-3">
        <CellBar cells={20} lit={Math.round(p * 20)} size={7} gap={2} on={box.status === "stopping" ? "bg-ink-3" : "bg-accent"} />
        <span className="w-10 text-right font-mono text-[12px] tabular-nums text-ink-2">{Math.round(p * 100)}%</span>
      </span>
    </div>
  );
}

function PowerDialogs({ box, which, onClose, onDestroy }: { box: Server; which: Confirm; onClose: () => void; onDestroy: () => void }) {
  const { actions } = useDash();
  const bb = planOf(box).line === "blackbox";
  return (
    <>
      <Dialog open={which === "reboot"} onClose={onClose} title={`reboot ${box.id}`}>
        <p className="text-[17px] leading-snug text-ink">{bb ? "It comes back locked." : "Restart it now?"}</p>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-2">
          {bb
            ? "A Blackbox reboots into its initramfs with a fresh host key and waits there. Verify it again, then unlock it over SSH. Until then it stays offline."
            : "Anything that lived only in memory is lost. The disk is untouched."}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>cancel</Button>
          <Button
            variant="accent"
            data-autofocus
            onClick={() => {
              actions.power(box.id, "reboot");
              onClose();
            }}
          >
            <Icon name="reboot" /> reboot now
          </Button>
        </div>
      </Dialog>

      <Dialog open={which === "off"} onClose={onClose} title={`power off ${box.id}`}>
        <p className="text-[17px] leading-snug text-ink">Power it off?</p>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-2">
          {bb ? "Memory goes with it. Power it on again from here; it will boot into its initramfs and wait for you." : "Power it on again from here whenever you like."}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>cancel</Button>
          <Button
            variant="accent"
            data-autofocus
            onClick={() => {
              actions.power(box.id, "off");
              onClose();
            }}
          >
            <Icon name="power" /> power off
          </Button>
        </div>
      </Dialog>

      <Dialog open={which === "password"} onClose={onClose} title={`reset password · ${box.id}`}>
        <ResetPassword box={box} onClose={onClose} />
      </Dialog>

      <RebuildDialog box={box} open={which === "rebuild"} onClose={onClose} />
      <DestroyDialog box={box} open={which === "destroy"} onClose={onClose} onConfirm={onDestroy} />
    </>
  );
}

/** Ordinary VPS and VDS only: the host sets a new password through the guest agent. */
function ResetPassword({ box, onClose }: { box: Server; onClose: () => void }) {
  const { actions } = useDash();
  const [fresh, setFresh] = useState<string | null>(null);
  const user = isWindows(box.image) ? "Administrator" : "root";
  if (fresh) {
    return (
      <div role="status">
        <p className="text-[17px] text-ink">New {user} password:</p>
        <p className="mt-3 break-all bg-ink px-3 py-3 font-mono text-[14px] text-white">{fresh}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-ink-2">Demo: made in this tab, kept nowhere.</p>
          <CopyButton text={fresh} />
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="accent" onClick={onClose} data-autofocus>
            done
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[17px] leading-snug text-ink">Set a new {user} password?</p>
      <p className="mt-2 text-[16px] leading-relaxed text-ink-2">
        An ordinary VPS or VDS has a guest agent, so the host can do this for you. It&rsquo;s also why a Blackbox, which has
        none, can&rsquo;t.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button onClick={onClose}>cancel</Button>
        <Button
          variant="accent"
          data-autofocus
          onClick={() => {
            setFresh(randomString(20));
            actions.note("power", `reset the ${user} password on ${box.id}`);
          }}
        >
          <Icon name="keys" /> reset it
        </Button>
      </div>
    </div>
  );
}

function RebuildDialog({ box, open, onClose }: { box: Server; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={`reinstall ${box.id}`} wide>
      <RebuildForm box={box} onClose={onClose} />
    </Dialog>
  );
}

function RebuildForm({ box, onClose }: { box: Server; onClose: () => void }) {
  const { actions } = useDash();
  const bb = planOf(box).line === "blackbox";
  const families = FAMILIES.filter((f) => !bb || BLACKBOX_FAMILIES.includes(f.family));
  const [image, setImage] = useState<ImageId>(box.image);
  const [ok, setOk] = useState(false);
  const name = useId();
  const options = families.flatMap((f) => f.images);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        actions.power(box.id, "rebuild", image);
        onClose();
      }}
    >
      <p className="text-[16px] leading-relaxed text-ink">
        {bb
          ? `Reinstalling replaces the disk with a fresh template and comes back on release ${RELEASE.id}. It boots into its initramfs; encrypt it again at first boot.`
          : "Reinstalling wipes the disk and installs a fresh system."}
      </p>
      <fieldset className="mt-5">
        <legend className={cn("mb-2.5", LABEL)}>system</legend>
        <div className={cn("grid grid-cols-2 gap-px border border-line-2 bg-line-2", bb ? "sm:grid-cols-4" : "sm:grid-cols-4 md:grid-cols-5")}>
          {options.map((img, i) => (
            <label
              key={img.id}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 px-2 py-4 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent",
                image === img.id ? "bg-accent-soft text-accent" : "bg-paper text-ink hover:bg-bg-2",
              )}
            >
              <input
                type="radio"
                name={name}
                value={img.id}
                checked={image === img.id}
                onChange={() => setImage(img.id)}
                className="sr-only"
                data-autofocus={i === 0 ? true : undefined}
              />
              <Pixels rows={OS[imageOf(img.id).family]} scale={3} />
              <span className="font-mono text-[12px]">{imageLabel(img.id)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {bb ? (
        <p className={cn("mt-3 font-mono text-[11.5px] leading-relaxed", MUTED)}>
          Anything else: write your own disk image by URL and SHA-256, or boot any ISO.
        </p>
      ) : null}
      <label className="mt-5 flex cursor-pointer items-start gap-3 text-[16px] text-ink">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 size-4 accent-[#b23a2c]" />
        I understand everything on {box.id}&rsquo;s disk is overwritten.
      </label>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button onClick={onClose}>cancel</Button>
        <Button type="submit" variant="danger-solid" disabled={!ok}>
          <Icon name="rebuild" /> reinstall on {imageLabel(image)}
        </Button>
      </div>
    </form>
  );
}

function DestroyDialog({ box, open, onClose, onConfirm }: { box: Server; open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={`destroy ${box.id}`} tone="danger">
      <DestroyForm box={box} onClose={onClose} onConfirm={onConfirm} />
    </Dialog>
  );
}

function DestroyForm({ box, onClose, onConfirm }: { box: Server; onClose: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState("");
  const [tried, setTried] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const match = typed.trim() === box.id;
  const bb = planOf(box).line === "blackbox";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!match) return;
        onClose();
        onConfirm();
      }}
    >
      <p className="text-[17px] leading-snug text-ink">This can&rsquo;t be undone.</p>
      <p className="mt-2 text-[16px] leading-relaxed text-ink-2">
        The server and its {planOf(box).disk} are deleted, along with their data.
        {bb ? " Without your passphrase, that disk was never readable anyway." : ""}
      </p>
      <label htmlFor={inputId} className={cn("mt-6 block", LABEL)}>
        type <span className="normal-case tracking-normal text-ink">{box.id}</span> to confirm
      </label>
      <input
        id={inputId}
        data-autofocus
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={tried && !match ? true : undefined}
        aria-describedby={hintId}
        className={cn(inputClass(tried && !match), "mt-2 h-11")}
      />
      <p id={hintId} className={cn("mt-2 min-h-[1.2rem] font-mono text-[12px]", tried && !match ? DANGER_TEXT : MUTED)} aria-live="polite">
        {tried && !match ? "That isn't the box's name. Nothing was destroyed." : match ? "Names match." : "Case and dashes count."}
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button onClick={onClose}>keep it</Button>
        <Button type="submit" variant="danger-solid" aria-disabled={!match}>
          <Icon name="trash" /> destroy {box.id}
        </Button>
      </div>
    </form>
  );
}
