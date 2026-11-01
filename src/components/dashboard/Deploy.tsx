"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Tag, cn } from "@/components/kit";
import { blackboxTerms, fmt, lines, locations, type Line, type Location, type Plan } from "@/lib/catalog";
import {
  BLACKBOX_FAMILIES,
  CYCLES,
  FAMILIES,
  RELEASE,
  cycleTotal,
  fromInStock,
  imageLabel,
  imageOf,
  locationOf,
  maskIp,
  nextName,
  parsePublicKey,
  planIn,
  shortFp,
  usd,
  type Family,
  type ImageId,
} from "./data";
import { OS, UNIT_PALETTE, rackUnit } from "./glyphs";
import { MiniMap } from "./MiniMap";
import { serverHref } from "./nav";
import { Pay } from "./Pay";
import { useDash, useNow } from "./store";
import {
  Button,
  CellBar,
  Cmd,
  DANGER_TEXT,
  DISPLAY,
  Icon,
  LABEL,
  LinkButton,
  MUTED,
  PageHeader,
  Panel,
  Pixels,
  Prompt,
  Segmented,
  Spin,
  inputClass,
  motion,
} from "./ui";

const STEPS = [
  { id: "location", label: "Location" },
  { id: "plan", label: "Plan" },
  { id: "system", label: "System" },
  { id: "access", label: "Access" },
  { id: "pay", label: "Pay" },
] as const;

type Access = "saved" | "paste" | "password";
const LINE_ORDER: Line[] = ["blackbox", "vps", "vds"];

const linesIn = (l: Location) => LINE_ORDER.filter((ln) => l.plans.some((p) => p.line === ln));
/** The first plan of a line that can be bought here, or the first of the line if none can. */
const firstPlan = (l: Location, line: Line) =>
  l.plans.find((p) => p.line === line && p.inStock) ?? l.plans.find((p) => p.line === line) ?? l.plans[0];

export function Deploy() {
  const { state, actions } = useDash();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [locId, setLocId] = useState<string>("yul");
  const [hover, setHover] = useState<string | null>(null);
  const [line, setLine] = useState<Line>("blackbox");
  const [planId, setPlanId] = useState("blackbox-core");
  const [months, setMonths] = useState<number>(1);
  const [image, setImage] = useState<ImageId>("debian-13");
  const [access, setAccess] = useState<Access>(state.keys.length ? "saved" : "paste");
  const [keyId, setKeyId] = useState<string | null>(state.keys[0]?.id ?? null);
  const [pub, setPub] = useState("");
  const [pubTouched, setPubTouched] = useState(false);
  const [deployed, setDeployed] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Each step change moves focus to the step's heading, so keyboard and screen reader users land in it.
  useEffect(() => {
    if (!moved.current) return;
    headRef.current?.focus();
  }, [step]);

  const loc = locationOf(locId);
  const plan = planIn(locId, planId);
  const bb = plan.line === "blackbox";
  const img = imageOf(image);
  const windows = img.family === "windows";
  const total = cycleTotal(plan, months);
  const name = nextName(plan.id, loc.id, state.servers.map((s) => s.id));
  const parsed = parsePublicKey(pub);
  const savedKey = state.keys.find((k) => k.id === keyId) ?? null;
  const deployedStatus = state.servers.find((s) => s.id === deployed)?.status;
  // What each choice allows: a Blackbox boots Debian or Ubuntu with an SSH key; Windows signs in over RDP.
  const effectiveAccess: Access = windows ? "password" : bb && access === "password" ? (state.keys.length ? "saved" : "paste") : access;

  const pickLocation = (id: string) => {
    const l = locationOf(id);
    if (fromInStock(l) === null) return;
    setLocId(l.id);
    const ln = linesIn(l).includes(line) ? line : linesIn(l)[0];
    setLine(ln);
    const keep = l.plans.find((p) => p.id === planId && p.line === ln && p.inStock);
    const next = keep ?? firstPlan(l, ln);
    setPlanId(next.id);
    if (next.line === "blackbox" && !BLACKBOX_FAMILIES.includes(imageOf(image).family)) setImage("debian-13");
  };
  const pickLine = (ln: Line) => {
    setLine(ln);
    const next = firstPlan(loc, ln);
    setPlanId(next.id);
    if (ln === "blackbox" && !BLACKBOX_FAMILIES.includes(imageOf(image).family)) setImage("debian-13");
  };

  const problem = (() => {
    if (step === 0 && fromInStock(loc) === null) return `Nothing in ${loc.city} is in stock right now. Pick another location.`;
    if (step === 1 && !plan.inStock) return `${plan.name} is out of stock in ${loc.city}. Pick one that isn't.`;
    if (step === 2 && bb && !BLACKBOX_FAMILIES.includes(img.family)) return "A Blackbox runs Debian or Ubuntu.";
    if (step !== 3 || windows) return null;
    if (effectiveAccess === "saved" && !savedKey) return "Pick a saved key, or paste a new one.";
    // The field says what's wrong with the key; this line only says why we didn't move on.
    if (effectiveAccess === "paste" && !parsed.ok) return "The public key needs fixing first.";
    return null;
  })();

  const go = (i: number) => {
    moved.current = true;
    setTried(false);
    setStep(i);
    setReached((r) => Math.max(r, i));
  };
  const next = () => {
    if (problem) {
      setTried(true);
      setPubTouched(true);
      return;
    }
    go(Math.min(STEPS.length - 1, step + 1));
  };

  const paid = (method: string) => {
    let useKey: string | null = null;
    if (!windows && effectiveAccess === "saved") useKey = savedKey?.id ?? null;
    if (!windows && effectiveAccess === "paste" && parsed.ok)
      useKey = actions.addKey(parsed.comment || `key for ${name}`, parsed.type, parsed.fingerprint).id;
    const id = actions.deploy({ plan: plan.id, location: loc.id, image, keyId: useKey, months, method });
    setDeployed(id);
  };

  const reset = () => {
    moved.current = true;
    setDeployed(null);
    setStep(0);
    setReached(0);
    setPub("");
    setPubTouched(false);
    setTried(false);
  };

  const accessLabel = windows
    ? "Administrator password, in the panel"
    : effectiveAccess === "saved"
      ? savedKey
        ? `ssh key "${savedKey.name}"`
        : "—"
      : effectiveAccess === "paste"
        ? parsed.ok
          ? `new ${parsed.type} key`
          : "—"
        : "root password, in the panel";

  return (
    <div className={motion.rise}>
      <PageHeader
        eyebrow="Deploy"
        lead="Five choices. Zero names."
        trail="Live in about 30 seconds."
        intro="Pick a location, a plan and a system, say how you'll get in, then pay with crypto, cash or card. Blackbox, the zero-knowledge line, lives in Montreal."
      />

      <nav aria-label="Deploy steps" className="mt-8">
        <ol className="grid grid-cols-5 border border-line-2">
          {STEPS.map((s, i) => {
            const current = i === step;
            const done = i < step || (deployed !== null && i <= 4);
            const reachable = i <= reached && deployed === null;
            return (
              <li key={s.id} className={cn("min-w-0", i > 0 && "border-l border-line-2")}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  disabled={!reachable || current}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex w-full flex-col gap-2 px-2.5 pb-3 pt-0 text-left transition-colors focus-visible:-outline-offset-2 sm:px-4",
                    current ? "bg-paper" : reachable ? "bg-paper hover:bg-bg-2" : "bg-bg-2",
                  )}
                >
                  <span aria-hidden className={cn("h-[3px] w-full", done ? "bg-accent" : current ? "bg-ink" : "bg-transparent")} />
                  <span className={cn("font-mono text-[11px] tabular-nums", current ? "text-ink" : MUTED)}>
                    0{i + 1}
                    <span className="sr-only">{done ? ", done" : current ? ", current" : ""}</span>
                  </span>
                  <span className={cn("truncate text-[13px] sm:text-[16px]", current ? "font-semibold text-ink" : done ? "text-accent" : "text-ink-2")}>
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="step-title" className="min-w-0">
          <h2 id="step-title" ref={headRef} tabIndex={-1} className={cn("text-[26px] leading-tight text-ink outline-none", DISPLAY)}>
            <span className={cn("mr-2 font-mono text-[13px] font-normal", MUTED)}>0{step + 1}</span>
            {
              [
                "Pick a location.",
                "Pick a plan.",
                "Pick a system.",
                "How will you get in?",
                !deployed
                  ? "Pay for it."
                  : deployedStatus === "running"
                    ? "Paid. It's up."
                    : deployedStatus === "locked"
                      ? "Paid. Your move."
                      : "Paid. Provisioning.",
              ][step]
            }
          </h2>

          <div className="mt-5">
            {step === 0 ? <LocationStep locId={locId} onPick={pickLocation} hover={hover} setHover={setHover} /> : null}
            {step === 1 ? (
              <PlanStep loc={loc} line={line} setLine={pickLine} planId={plan.id} setPlanId={setPlanId} months={months} setMonths={setMonths} />
            ) : null}
            {step === 2 ? <SystemStep image={image} setImage={setImage} blackbox={bb} /> : null}
            {step === 3 ? (
              <AccessStep
                access={effectiveAccess}
                setAccess={setAccess}
                blackbox={bb}
                windows={windows}
                keyId={keyId}
                setKeyId={setKeyId}
                pub={pub}
                setPub={setPub}
                pubTouched={pubTouched || tried}
                onPubBlur={() => setPubTouched(true)}
              />
            ) : null}
            {step === 4 ? (
              deployed ? (
                <Booting id={deployed} onAgain={reset} />
              ) : (
                <Pay amountUsd={total} what={`${name} · ${plan.name} · ${months} mo`} seed={name} onPaid={paid} />
              )
            ) : null}
          </div>

          {step < 4 ? (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <Button onClick={() => go(step - 1)} disabled={step === 0}>
                <Icon name="back" /> back
              </Button>
              <Button variant="primary" onClick={next} aria-describedby={tried && problem ? "step-problem" : undefined}>
                <Prompt />
                continue to {STEPS[step + 1].label.toLowerCase()}
                <span aria-hidden>→</span>
              </Button>
              <p id="step-problem" role="alert" className={cn("font-mono text-[12px]", DANGER_TEXT)}>
                {tried && problem ? problem : ""}
              </p>
            </div>
          ) : !deployed ? (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <Button onClick={() => go(3)}>
                <Icon name="back" /> back
              </Button>
            </div>
          ) : null}
        </section>

        <aside aria-label="Summary" className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <Panel title="your box" status={deployed ? "ordered" : "draft"} live={Boolean(deployed)}>
            <div className="px-5 py-4">
              <p className="break-all font-mono text-[17px] text-ink">{deployed ?? name}</p>
              <p className={cn("mt-1 font-mono text-[11px]", MUTED)}>name picked for you. it&rsquo;s only a label.</p>
            </div>
            <dl className="mx-5 divide-y divide-line border-y border-line font-mono text-[12px]">
              <SumRow k="location" v={`${loc.city} (${loc.code})`} />
              <SumRow k="plan" v={plan.name} />
              <SumRow k="specs" v={`${plan.cores} × ${plan.cpu.replace(" · SEV-SNP", "")} · ${plan.ram}`} />
              <SumRow k="system" v={imageLabel(image)} />
              <SumRow k="access" v={accessLabel} />
              <SumRow k="first term" v={`${months} mo`} />
            </dl>
            <div className="px-5 py-4">
              <p className={LABEL}>total</p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="font-dot text-[38px] font-bold leading-[0.85] tracking-[-0.02em] text-ink">{usd(total)}</span>
                <span className="font-mono text-[12px] text-ink-2">{fmt(plan.usd)} / mo</span>
              </p>
            </div>
            <div className="border-t border-night bg-night px-4 py-3 font-mono text-[12px] leading-relaxed text-white/85">
              {bb ? (
                <>
                  <span className="block">
                    <span className="text-mint">$ </span>
                    <Cmd text={`python3 blackbox-verify --host <ipv4> --release ./${RELEASE.id} --vcpus ${plan.cores}`} />
                  </span>
                  <span className="block">
                    <span className="text-mint">$ </span>ssh root@&lt;ipv4&gt; encrypt
                  </span>
                </>
              ) : windows ? (
                <span className="block">
                  <span className="text-mint">&gt; </span>mstsc /v:&lt;ipv4&gt;
                </span>
              ) : (
                <span className="block">
                  <span className="text-mint">$ </span>ssh root@&lt;ipv4&gt;
                </span>
              )}
            </div>
          </Panel>
          <p className={cn("mt-3 font-mono text-[11px] leading-relaxed", MUTED)}>
            {bb
              ? "What you'll run once it's live. Verify on your own computer; encrypt only after it prints PASS."
              : windows
                ? "What you'll run once it's live: full RDP, the password in your panel."
                : "What you'll run once it's live: full root, nobody asks who you are."}
          </p>
        </aside>
      </div>
    </div>
  );
}

function SumRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className={cn("shrink-0", MUTED)}>{k}</dt>
      <dd className="min-w-0 truncate text-right text-ink">{v}</dd>
    </div>
  );
}

/* Steps ------------------------------------------------------------------- */

const cardClass = (on: boolean, off?: boolean) =>
  cn(
    "relative flex flex-col border bg-paper transition-[border-color,box-shadow,background-color]",
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
    off
      ? "cursor-not-allowed border-dashed border-line-2 bg-bg-2"
      : on
        ? "cursor-pointer border-accent bg-tint shadow-[0_0_0_1px_var(--accent)]"
        : "cursor-pointer border-line-2 hover:border-ink-3",
  );

function LocationStep({
  locId,
  onPick,
  hover,
  setHover,
}: {
  locId: string;
  onPick: (id: string) => void;
  hover: string | null;
  setHover: (v: string | null) => void;
}) {
  const name = useId();
  const sel = locationOf(locId);
  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <figure className="min-w-0">
        <MiniMap selected={locId} hovered={hover} onPick={onPick} onHover={setHover} />
        <figcaption className={cn("mt-2 flex justify-between gap-3 font-mono text-[11px]", MUTED)}>
          <span>land: natural earth, public domain</span>
          <span className="hidden sm:inline">click a location, or use the list</span>
        </figcaption>
        <div className="mt-4 border border-line-2 bg-paper px-4 py-3.5">
          <p className="flex flex-wrap items-center gap-2">
            <span className="border border-line-2 px-1 font-mono text-[11px] leading-[16px] text-ink">{sel.code}</span>
            <span className="text-[16px] font-semibold text-ink">
              {sel.city}, {sel.country}
            </span>
            {sel.owned ? <Tag tone="marker">owned hardware</Tag> : null}
          </p>
          <p className="mt-2 text-pretty text-[15px] leading-relaxed text-ink-2">{sel.note}</p>
        </div>
      </figure>
      <fieldset className="min-w-0">
        <legend className="sr-only">Location</legend>
        <ul className="border-y border-line">
          {locations.map((l) => {
            const on = l.id === locId;
            const hot = l.id === hover;
            const from = fromInStock(l);
            const sold = from === null;
            const lns = linesIn(l);
            return (
              <li key={l.id} className="border-b border-line last:border-b-0">
                <label
                  onMouseEnter={() => setHover(l.id)}
                  onMouseLeave={() => setHover(null)}
                  className={cn(
                    "relative grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-3 pl-3 pr-3 transition-colors",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent",
                    sold ? "cursor-not-allowed" : "cursor-pointer",
                    on ? "bg-tint" : hot && !sold ? "bg-bg-2" : !sold && "hover:bg-bg-2",
                  )}
                >
                  <input
                    type="radio"
                    name={name}
                    value={l.id}
                    checked={on}
                    disabled={sold}
                    onChange={() => onPick(l.id)}
                    onFocus={() => setHover(l.id)}
                    onBlur={() => setHover(null)}
                    className="sr-only"
                  />
                  <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[2px]", on ? "bg-accent" : "bg-transparent")} />
                  <span className={cn("font-mono text-[12px]", on ? "text-accent" : sold ? MUTED : "text-ink-2")}>{l.code}</span>
                  <span className="min-w-0">
                    <span className={cn("block truncate text-[15px] leading-tight", sold ? "text-ink-3" : "text-ink")}>{l.city}</span>
                    <span className={cn("block truncate font-mono text-[11.5px]", MUTED)}>
                      {lns.map((ln) => lines[ln].name).join(" · ")} · {l.plans.length} {l.plans.length === 1 ? "plan" : "plans"}
                    </span>
                  </span>
                  <span className="text-right">
                    {sold ? (
                      <span className={cn("font-mono text-[11.5px]", MUTED)}>out of stock</span>
                    ) : (
                      <>
                        <span className={cn("block font-mono text-[11px]", MUTED)}>from</span>
                        <span className={cn("font-dot text-[20px] font-bold leading-none", on ? "text-accent" : "text-ink")}>{fmt(from)}</span>
                      </>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className={cn("mt-3 font-mono text-[11px] leading-relaxed", MUTED)}>
          Prices are a month, cheapest plan in stock. Stock is a snapshot. Every plan has a dedicated IPv4.
        </p>
      </fieldset>
    </div>
  );
}

function PlanStep({
  loc,
  line,
  setLine,
  planId,
  setPlanId,
  months,
  setMonths,
}: {
  loc: Location;
  line: Line;
  setLine: (l: Line) => void;
  planId: string;
  setPlanId: (v: string) => void;
  months: number;
  setMonths: (n: number) => void;
}) {
  const name = useId();
  const lns = linesIn(loc);
  const shown = loc.plans.filter((p) => p.line === line);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Segmented
          legend={`Line, in ${loc.city}`}
          value={line}
          onChange={setLine}
          options={lns.map((ln) => ({ value: ln, label: lines[ln].name }))}
        />
        {loc.id !== "yul" ? (
          <p className={cn("max-w-[34ch] font-mono text-[11px] leading-relaxed", MUTED)}>Blackbox is Montreal only. Switch to YUL for it.</p>
        ) : null}
      </div>
      <p className="mt-3 max-w-[64ch] text-pretty text-[15px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">{lines[line].short}.</span> {lines[line].note}
      </p>

      <fieldset className="mt-5">
        <legend className="sr-only">Plan</legend>
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {shown.map((p) => (
            <PlanCard key={p.id} p={p} on={p.id === planId} name={name} onPick={() => setPlanId(p.id)} />
          ))}
        </div>
      </fieldset>
      {line === "blackbox" ? (
        <p className={cn("mt-3 max-w-[78ch] font-mono text-[11px] leading-relaxed", MUTED)}>
          {blackboxTerms.sameEverywhere} {blackboxTerms.transfer}
        </p>
      ) : null}

      <Segmented
        className="mt-6"
        legend="First term"
        value={String(months)}
        onChange={(v) => setMonths(Number(v))}
        options={CYCLES.map((c) => ({ value: String(c.months), label: c.label }))}
      />
      <p className={cn("mt-2 font-mono text-[11px]", MUTED)}>
        Seven-day minimum, prorated. After that, renew on whatever cycle you set.
      </p>
    </div>
  );
}

function PlanCard({ p, on, name, onPick }: { p: Plan; on: boolean; name: string; onPick: () => void }) {
  const off = !p.inStock;
  const bb = p.line === "blackbox";
  return (
    <label className={cn(cardClass(on, off), "p-5")}>
      <input type="radio" name={name} value={p.id} checked={on} disabled={off} onChange={onPick} className="sr-only" />
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className={cn("block text-[22px] leading-none", off ? "text-ink-3" : "text-ink", DISPLAY)}>{p.name}</span>
          <span className={cn("mt-1.5 block font-mono text-[11px] uppercase tracking-[0.14em]", MUTED)}>{lines[p.line].short}</span>
        </span>
        {off ? <Tag>out of stock</Tag> : bb ? <Tag tone="marker">SEV-SNP</Tag> : null}
      </span>
      <Pixels rows={rackUnit(p.cores, bb)} palette={UNIT_PALETTE} scale={5} className={cn("mt-5 max-w-full", off && "opacity-40")} />
      <span className="mt-5 flex items-baseline gap-1.5">
        <span className={cn("font-dot text-[36px] font-bold leading-[0.85] tracking-[-0.02em]", off ? "text-ink-3" : "text-ink")}>{fmt(p.usd)}</span>
        <span className="font-mono text-[12px] text-ink-2">/ mo</span>
      </span>
      <span className="mt-4 space-y-1 border-t border-line pt-3 font-mono text-[11.5px] text-ink-2">
        <span className="block">
          {p.cores} × {p.cpu}
        </span>
        <span className="block">
          {p.ram} · {p.disk}
        </span>
        <span className="block">
          {p.port} · {p.transfer}
        </span>
      </span>
    </label>
  );
}

function SystemStep({ image, setImage, blackbox }: { image: ImageId; setImage: (v: ImageId) => void; blackbox: boolean }) {
  const name = useId();
  const cur = imageOf(image);
  const fam = FAMILIES.find((f) => f.family === cur.family) ?? FAMILIES[0];
  const allowed = (f: Family) => !blackbox || BLACKBOX_FAMILIES.includes(f);
  return (
    <div>
      <fieldset>
        <legend className="sr-only">System</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FAMILIES.map((f) => {
            const on = f.family === cur.family;
            const off = !allowed(f.family);
            return (
              <label key={f.family} className={cn(cardClass(on, off), "items-start p-4")}>
                <input
                  type="radio"
                  name={name}
                  value={f.family}
                  checked={on}
                  disabled={off}
                  onChange={() => setImage(f.images[f.images.length - 1].id)}
                  className="sr-only"
                />
                <span className={cn("grid size-[60px] place-items-center", on ? "bg-paper text-accent" : off ? "bg-bg-3 text-ink-3" : "bg-bg-2 text-ink")}>
                  <Pixels rows={OS[f.family]} scale={4} palette={{ "#": "currentColor", o: on ? "var(--mint)" : off ? "var(--ink-4)" : "var(--accent)" }} />
                </span>
                <span className={cn("mt-4 text-[17px] font-semibold leading-none", off ? "text-ink-3" : "text-ink")}>{f.name}</span>
                <span className={cn("mt-1.5 font-mono text-[11.5px]", on ? "text-accent" : MUTED)}>{f.images.map((i) => i.version).join(" · ")}</span>
                <span className="mt-3 text-pretty text-[14px] leading-snug text-ink-2">{off ? "Not on Blackbox. Boot it from your own ISO instead." : f.note}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {fam.images.length > 1 ? (
        <Segmented
          className="mt-5"
          legend={`${fam.name} version`}
          value={image}
          onChange={setImage}
          options={fam.images.map((i) => ({ value: i.id, label: i.version }))}
        />
      ) : null}
      <p className={cn("mt-3 max-w-[78ch] font-mono text-[11px] leading-relaxed", MUTED)}>
        {blackbox
          ? `A Blackbox boots the measured release ${RELEASE.id} into its initramfs and waits for you. Your own UKI, disk image or any ISO can replace it later, from the server's page.`
          : "Full root, or RDP on Windows. Reinstall to another system from the panel whenever you like."}
      </p>
    </div>
  );
}

function AccessStep({
  access,
  setAccess,
  blackbox,
  windows,
  keyId,
  setKeyId,
  pub,
  setPub,
  pubTouched,
  onPubBlur,
}: {
  access: Access;
  setAccess: (a: Access) => void;
  blackbox: boolean;
  windows: boolean;
  keyId: string | null;
  setKeyId: (id: string) => void;
  pub: string;
  setPub: (v: string) => void;
  pubTouched: boolean;
  onPubBlur: () => void;
}) {
  const { state } = useDash();
  const group = useId();
  const keysGroup = useId();
  const pubId = useId();
  const pubErr = useId();
  const parsed = parsePublicKey(pub);
  const options: { id: Access; title: string; note: string; off: string | null }[] = [
    {
      id: "saved",
      title: "A saved SSH key",
      note: `${state.keys.length} on this account`,
      off: windows ? "Windows Server signs in over RDP, not SSH." : null,
    },
    {
      id: "paste",
      title: "Paste a public key",
      note: "the line from your .pub file",
      off: windows ? "Windows Server signs in over RDP, not SSH." : null,
    },
    {
      id: "password",
      title: windows ? "Administrator password, for RDP" : "A root password, in the panel",
      note: "credentials appear in your panel once it's live",
      off: blackbox ? "A Blackbox needs an SSH key: it rides the measured command line, and its initramfs refuses passwords." : null,
    },
  ];

  return (
    <fieldset>
      <legend className="sr-only">Access</legend>
      <div className="flex flex-col gap-3">
        {options.map((o) => {
          const on = access === o.id;
          return (
            <div
              key={o.id}
              className={cn("border transition-colors", o.off ? "border-dashed border-line-2 bg-bg-2" : on ? "border-accent bg-tint" : "border-line-2 bg-paper")}
            >
              <label
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent",
                  o.off ? "cursor-not-allowed" : "cursor-pointer",
                )}
              >
                <input
                  type="radio"
                  name={group}
                  value={o.id}
                  checked={on}
                  disabled={Boolean(o.off)}
                  onChange={() => setAccess(o.id)}
                  className="size-4 shrink-0 accent-accent"
                />
                <span className={cn("text-[16px]", o.off ? "text-ink-3" : "text-ink")}>{o.title}</span>
                <span className={cn("ml-auto hidden font-mono text-[11px] sm:block", MUTED)}>{o.off ? "not for this box" : o.note}</span>
              </label>
              {o.off ? <p className="border-t border-line px-4 py-2.5 text-[14px] leading-snug text-ink-2">{o.off}</p> : null}

              {on && o.id === "saved" && !o.off ? (
                <div className="border-t border-accent-line px-4 py-3">
                  {state.keys.length === 0 ? (
                    <p className="text-[15px] text-ink-2">
                      No saved keys. Paste one instead, or add one on{" "}
                      <Link href="/dashboard/keys" className="text-accent underline">
                        Keys
                      </Link>
                      .
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {state.keys.map((k) => (
                        <li key={k.id}>
                          <label className="flex cursor-pointer items-center gap-3 font-mono text-[12.5px] text-ink">
                            <input
                              type="radio"
                              name={keysGroup}
                              checked={keyId === k.id}
                              onChange={() => setKeyId(k.id)}
                              className="size-3.5 accent-accent"
                            />
                            <span>{k.name}</span>
                            <span className={MUTED}>{k.type}</span>
                            <span className={cn("ml-auto truncate", MUTED)}>{shortFp(k.fingerprint)}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {on && o.id === "paste" && !o.off ? (
                <div className="border-t border-accent-line px-4 py-3">
                  <label htmlFor={pubId} className={LABEL}>
                    public key
                  </label>
                  <textarea
                    id={pubId}
                    value={pub}
                    onChange={(e) => setPub(e.target.value)}
                    onBlur={onPubBlur}
                    rows={3}
                    spellCheck={false}
                    placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA… you@laptop"
                    aria-invalid={pubTouched && !parsed.ok ? true : undefined}
                    aria-describedby={pubErr}
                    className={cn(inputClass(pubTouched && !parsed.ok), "mt-2 resize-y py-2 leading-relaxed")}
                  />
                  <p
                    id={pubErr}
                    className={cn("mt-1.5 min-h-[1.2rem] font-mono text-[12px]", pubTouched && !parsed.ok ? DANGER_TEXT : MUTED)}
                    aria-live="polite"
                  >
                    {parsed.ok
                      ? `looks right: ${parsed.type}, ${shortFp(parsed.fingerprint)}${parsed.comment ? `, "${parsed.comment}"` : ""}`
                      : pubTouched
                        ? parsed.error
                        : "checked loosely, here in the tab. it's saved to the account when you pay."}
                  </p>
                </div>
              ) : null}

              {on && o.id === "password" && !o.off ? (
                <p className="border-t border-accent-line px-4 py-3 text-[15px] leading-snug text-ink-2">
                  {windows
                    ? "The Administrator password shows up in this panel when the box is live. Connect with any RDP client."
                    : "The root password shows up in this panel when the box is live. You can add an SSH key afterwards."}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {blackbox ? (
        <p className={cn("mt-3 max-w-[78ch] font-mono text-[11px] leading-relaxed", MUTED)}>
          Your key is part of what the CPU measures at launch, so nobody can add another one without changing the number you verify.
        </p>
      ) : null}
    </fieldset>
  );
}

/* After payment ------------------------------------------------------------ */

function bootLines(blackbox: boolean, city: string, sys: string) {
  return blackbox
    ? [
        { at: 0.04, text: "payment confirmed. no name attached." },
        { at: 0.2, text: `writing the ${sys} template to its disk in ${city}` },
        { at: 0.45, text: "launching an SEV-SNP guest" },
        { at: 0.65, text: `the CPU measures release ${RELEASE.id}: firmware, kernel, initramfs, command line` },
        { at: 0.88, text: "booting into the initramfs. it will wait for you." },
      ]
    : [
        { at: 0.04, text: "payment confirmed. no name attached." },
        { at: 0.25, text: `provisioning in ${city}` },
        { at: 0.5, text: `installing ${sys}` },
        { at: 0.8, text: "assigning its dedicated IPv4" },
      ];
}

function Booting({ id, onAgain }: { id: string; onAgain: () => void }) {
  const { state } = useDash();
  const box = state.servers.find((s) => s.id === id);
  const booting = box?.status === "booting";
  const now = useNow(200, booting);
  if (!box) {
    return (
      <Panel title={id} status="gone">
        <p className="px-5 py-6 text-[15px] text-ink">That box was destroyed before it finished. Nothing remains.</p>
      </Panel>
    );
  }
  const plan = planIn(box.location, box.plan);
  const bb = plan.line === "blackbox";
  const steps = bootLines(bb, locationOf(box.location).city, imageLabel(box.image));
  const p = booting ? (now ? Math.min(0.99, Math.max(0, (now - box.opStart) / box.opMs)) : 0) : 1;
  const secs = booting && now ? Math.max(0, Math.floor((now - box.opStart) / 1000)) : null;
  const waiting = box.status === "locked";
  return (
    <Panel title={booting ? `provisioning ${box.id}` : box.id} status={booting ? `${secs ?? 0} s` : waiting ? "waiting for you" : "ready"} live>
      <div className="px-5 py-5" role="status" aria-live="polite">
        <div className="flex items-center gap-4">
          <CellBar cells={24} lit={Math.round(p * 24)} size={11} gap={3} className="flex-wrap" />
          <span className="font-mono text-[13px] tabular-nums text-ink">{Math.round(p * 100)}%</span>
        </div>
        <ul className="mt-5 space-y-1.5 font-mono text-[12.5px] text-ink-2">
          {steps
            .filter((l) => p >= l.at)
            .map((l, i, arr) => (
              <li key={l.text} className={cn("flex items-center gap-2.5", motion.fade)}>
                {booting && i === arr.length - 1 ? <Spin className="text-accent" /> : <Icon name="check" scale={1.5} className="text-accent" />}
                {l.text}
              </li>
            ))}
          {!booting ? (
            <li className={cn("flex items-center gap-2.5 text-ink", motion.fade)}>
              <span aria-hidden className={cn("size-[7px]", waiting ? "bg-lime-hi shadow-[inset_0_0_0_1.5px_var(--ink)]" : "bg-accent")} />
              {waiting
                ? `${box.id} is waiting in its initramfs. verify it, then encrypt over SSH.`
                : `${box.id} is ${box.status === "running" ? "live" : box.status}. dedicated IPv4, credentials in your panel.`}
            </li>
          ) : null}
        </ul>
      </div>
      {!booting ? (
        <div className="border-t border-line px-5 py-4">
          <p className="bg-night px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-white/85">
            {bb ? (
              <>
                <span className="block">
                  <span className="text-mint">$ </span>
                  <Cmd text={`python3 blackbox-verify --host ${maskIp(box.ipv4)} --release ./${RELEASE.id} --vcpus ${plan.cores}`} />
                </span>
                <span className="block">
                  <span className="text-mint">$ </span>ssh root@{maskIp(box.ipv4)} encrypt
                </span>
              </>
            ) : imageOf(box.image).family === "windows" ? (
              <>
                <span className="text-mint">&gt; </span>mstsc /v:{maskIp(box.ipv4)}
              </>
            ) : (
              <>
                <span className="text-mint">$ </span>ssh root@{maskIp(box.ipv4)}
              </>
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href={serverHref(box.id)} variant="primary">
              <Prompt /> Open {box.id}
            </LinkButton>
            <LinkButton href="/dashboard/servers">All servers</LinkButton>
            <Button onClick={onAgain}>deploy another</Button>
          </div>
        </div>
      ) : (
        <p className={cn("border-t border-line px-5 py-3 font-mono text-[11.5px]", MUTED)}>
          {box.id} is already in your server list. Provisioning takes about 30 seconds; you can leave this page.
        </p>
      )}
    </Panel>
  );
}
