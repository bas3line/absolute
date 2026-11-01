"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  BOOT_MS,
  REBOOT_MS,
  REBUILD_MS,
  SEED_BALANCE,
  SEED_KEYS,
  STOP_MS,
  TODAY,
  addMonths,
  cycleTotal,
  fakeIpv4,
  fakeIpv6Block,
  fingerprint,
  hashString,
  imageLabel,
  isBlackbox,
  laterOf,
  locationOf,
  nextName,
  planIn,
  planOf,
  prng,
  randomString,
  seedInvoices,
  seedServers,
  usd,
  type ImageId,
  type Invoice,
  type Server,
  type SshKey,
} from "./data";

/*
 * The whole demo panel's state lives here, in memory, for as long as this tab is open.
 * Nothing is written to cookies, localStorage, sessionStorage or IndexedDB. "lock"
 * drops it all on the floor.
 */

export type LogKind = "session" | "deploy" | "power" | "destroy" | "billing" | "keys" | "network";
export type LogItem = { id: number; at: number; kind: LogKind; text: string };
export type Toast = { id: number; text: string; tone: "info" | "danger" };
export type Net = "clearnet" | "onion";
export type PowerOp = "reboot" | "off" | "on" | "rebuild";

type State = {
  credential: string | null;
  servers: Server[];
  keys: SshKey[];
  invoices: Invoice[];
  balance: number;
  log: LogItem[];
  toasts: Toast[];
  net: Net;
  seq: number;
};

const EMPTY: State = {
  credential: null,
  servers: [],
  keys: [],
  invoices: [],
  balance: 0,
  log: [],
  toasts: [],
  net: "clearnet",
  seq: 1,
};

type Action =
  | { type: "unlock"; credential: string; now: number }
  | { type: "lock" }
  | { type: "net"; net: Net; now: number }
  | { type: "power"; id: string; op: PowerOp; image?: ImageId; now: number }
  | { type: "disk-unlocked"; id: string; now: number }
  | { type: "settle"; now: number }
  | { type: "deploy"; server: Server; invoice: Invoice; now: number }
  | { type: "destroy"; id: string; now: number }
  | { type: "renew"; id: string; months: number; invoice: Invoice; now: number }
  | { type: "auto-renew"; id: string; on: boolean; now: number }
  | { type: "credit"; invoice: Invoice; now: number }
  | { type: "rdns"; id: string; name: string | null; now: number }
  | { type: "key-add"; key: SshKey; now: number }
  | { type: "key-remove"; id: string; now: number }
  | { type: "note"; kind: LogKind; text: string; now: number }
  | { type: "forget" }
  | { type: "toast"; text: string; tone?: Toast["tone"] }
  | { type: "toast-dismiss"; id: number };

/** Appends a line to this tab's activity list, and optionally a toast. */
function note(s: State, kind: LogKind, text: string, at: number, toast?: string | false, tone: Toast["tone"] = "info"): State {
  const log = [{ id: s.seq, at, kind, text }, ...s.log].slice(0, 200);
  const toasts = toast ? [...s.toasts, { id: s.seq + 1, text: toast, tone }].slice(-4) : s.toasts;
  return { ...s, log, toasts, seq: s.seq + 2 };
}

const TRANSITIONAL = new Set(["booting", "rebooting", "rebuilding", "stopping"]);
const replace = (s: State, box: Server) => s.servers.map((x) => (x.id === box.id ? box : x));

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "unlock": {
      const fresh: State = {
        ...EMPTY,
        credential: a.credential,
        servers: seedServers(a.now),
        keys: SEED_KEYS,
        invoices: seedInvoices(),
        balance: SEED_BALANCE,
      };
      return note(fresh, "session", `signed in with credential ${fingerprint(a.credential)}. no email, no name on file.`, a.now);
    }
    case "lock":
      return EMPTY;
    case "net":
      return note(
        { ...s, net: a.net },
        "network",
        a.net === "onion" ? "switched this panel to the onion mirror" : "switched this panel back to clearnet",
        a.now,
        a.net === "onion" ? "On the onion mirror now. Same panel." : "Back on clearnet.",
      );
    case "power": {
      const box = s.servers.find((x) => x.id === a.id);
      if (!box) return s;
      const bb = isBlackbox(box);
      const up = box.status === "running" || box.status === "locked";
      let next: Server | null = null;
      let line = "";
      let toast = "";
      if (a.op === "reboot" && up) {
        next = { ...box, status: "rebooting", startedAt: null, opStart: a.now, opMs: REBOOT_MS };
        line = `rebooted ${box.id}`;
        toast = bb ? `Rebooting ${box.id}. It comes back waiting for unlock.` : `Rebooting ${box.id}.`;
      } else if (a.op === "off" && up) {
        next = { ...box, status: "stopping", startedAt: null, opStart: a.now, opMs: STOP_MS };
        line = `powered off ${box.id}`;
        toast = `Powering off ${box.id}.`;
      } else if (a.op === "on" && box.status === "stopped") {
        next = { ...box, status: "booting", opStart: a.now, opMs: REBOOT_MS };
        line = `powered on ${box.id}`;
        toast = `Booting ${box.id}.`;
      } else if (a.op === "rebuild" && (up || box.status === "stopped")) {
        const image = a.image ?? box.image;
        next = { ...box, image, status: "rebuilding", startedAt: null, opStart: a.now, opMs: REBUILD_MS, encrypted: bb ? false : box.encrypted };
        line = `reinstalled ${box.id} on ${imageLabel(image)}. the old disk was replaced.`;
        toast = `Reinstalling ${box.id} on ${imageLabel(image)}.`;
      }
      if (!next) return s;
      return note({ ...s, servers: replace(s, next) }, "power", line, a.now, toast);
    }
    case "disk-unlocked": {
      const box = s.servers.find((x) => x.id === a.id);
      if (!box || box.status !== "locked") return s;
      const first = !box.encrypted;
      return note(
        { ...s, servers: replace(s, { ...box, status: "running", startedAt: a.now, encrypted: true }) },
        "power",
        first
          ? `${box.id}: encrypted at first boot over SSH, after blackbox-verify. the panel never saw the passphrase.`
          : `${box.id}: unlocked over SSH, after blackbox-verify. the panel never saw the passphrase.`,
        a.now,
        `${box.id} is running.`,
      );
    }
    case "settle": {
      let changed = false;
      const done: string[] = [];
      const waiting: string[] = [];
      const servers = s.servers.map((x) => {
        if (!TRANSITIONAL.has(x.status) || a.now < x.opStart + x.opMs) return x;
        changed = true;
        // opStart/opMs stay as a record of how long the last transition took.
        if (x.status === "stopping") return { ...x, status: "stopped" as const, startedAt: null };
        // A Blackbox boots into its initramfs and waits there for you.
        if (isBlackbox(x)) {
          waiting.push(x.id);
          return { ...x, status: "locked" as const, startedAt: null };
        }
        done.push(x.id);
        return { ...x, status: "running" as const, startedAt: x.opStart + x.opMs };
      });
      if (!changed) return s;
      let out: State = { ...s, servers };
      for (const id of done) out = note(out, "power", `${id} is up`, a.now, `${id} is up.`);
      for (const id of waiting) out = note(out, "power", `${id} is waiting in its initramfs`, a.now, `${id} is waiting for you in its initramfs.`);
      return out;
    }
    case "deploy":
      return note(
        { ...s, servers: [...s.servers, a.server], invoices: [a.invoice, ...s.invoices] },
        "deploy",
        `deployed ${a.server.id}: ${planOf(a.server).name}, ${locationOf(a.server.location).code}, ${imageLabel(a.server.image)}. paid with ${a.invoice.method}.`,
        a.now,
        `Payment confirmed. ${a.server.id} is provisioning.`,
      );
    case "destroy": {
      if (!s.servers.some((x) => x.id === a.id)) return s;
      return note(
        { ...s, servers: s.servers.filter((x) => x.id !== a.id) },
        "destroy",
        `destroyed ${a.id}. its disk and its data are gone.`,
        a.now,
        `${a.id} is gone. Nothing to recover.`,
        "danger",
      );
    }
    case "renew": {
      const box = s.servers.find((x) => x.id === a.id);
      if (!box) return s;
      const expires = addMonths(laterOf(box.expires, TODAY), a.months);
      return note(
        { ...s, servers: replace(s, { ...box, expires, cycle: a.months }), invoices: [a.invoice, ...s.invoices] },
        "billing",
        `renewed ${a.id} for ${a.months} mo with ${a.invoice.method}. expires ${expires}.`,
        a.now,
        `${a.id} now expires on ${expires}.`,
      );
    }
    case "auto-renew": {
      const box = s.servers.find((x) => x.id === a.id);
      if (!box) return s;
      return note(
        { ...s, servers: replace(s, { ...box, autoRenew: a.on }) },
        "billing",
        `auto-renew ${a.on ? "on" : "off"} for ${a.id}`,
        a.now,
      );
    }
    case "credit":
      return note(
        { ...s, balance: Math.round((s.balance + a.invoice.usd) * 100) / 100, invoices: [a.invoice, ...s.invoices] },
        "billing",
        `added ${usd(a.invoice.usd)} of credit with ${a.invoice.method}`,
        a.now,
        `${usd(a.invoice.usd)} added to the balance.`,
      );
    case "rdns": {
      const box = s.servers.find((x) => x.id === a.id);
      if (!box) return s;
      return note(
        { ...s, servers: replace(s, { ...box, rdns: a.name }) },
        "network",
        a.name ? `set reverse DNS for ${box.id} to ${a.name}` : `cleared reverse DNS for ${box.id}`,
        a.now,
        a.name ? `Reverse DNS set. Live within a minute.` : "Reverse DNS cleared.",
      );
    }
    case "key-add":
      return note({ ...s, keys: [...s.keys, a.key] }, "keys", `added ssh key "${a.key.name}"`, a.now, `Key "${a.key.name}" added.`);
    case "key-remove": {
      const key = s.keys.find((k) => k.id === a.id);
      if (!key) return s;
      return note(
        { ...s, keys: s.keys.filter((k) => k.id !== a.id) },
        "keys",
        `removed ssh key "${key.name}"`,
        a.now,
        `Key "${key.name}" removed.`,
      );
    }
    case "note":
      return note(s, a.kind, a.text, a.now);
    case "forget":
      return { ...s, log: [] };
    case "toast":
      return { ...s, toasts: [...s.toasts, { id: s.seq, text: a.text, tone: a.tone ?? "info" }].slice(-4), seq: s.seq + 1 };
    case "toast-dismiss":
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
  }
}

/* Telemetry --------------------------------------------------------------- */

export type Sample = { cpu: number; ram: number; rx: number; tx: number };
export const HISTORY = 60;
const ZERO: Sample = { cpu: 0, ram: 0, rx: 0, tx: 0 };

// Typical idle traffic for a port, in Mbit/s: a small, believable share of it.
const PORT_NET: Record<string, number> = { "100 Mbps": 6, "1 Gbps": 18, "10 Gbps": 42 };

/** What a box idles at: share of CPU, share of RAM, Mbit/s in. Stable per box name. */
function profileOf(box: Server) {
  const r = prng(hashString(`profile:${box.id}`));
  const plan = planOf(box);
  return {
    cpu: 0.12 + r() * 0.3,
    ram: 0.35 + r() * 0.3,
    net: (PORT_NET[plan.port] ?? 18) * (0.5 + r()),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function nextSample(prev: Sample, box: Server, now: number, r: () => number): Sample {
  const p = profileOf(box);
  switch (box.status) {
    case "running": {
      const spike = r() < 0.05 ? 0.25 + 0.35 * r() : 0;
      const burst = r() < 0.06 ? p.net * (1 + 2 * r()) : 0;
      return {
        cpu: clamp(prev.cpu + (p.cpu - prev.cpu) * 0.3 + (r() - 0.5) * 0.14 + spike, 0.02, 0.99),
        ram: clamp(prev.ram + (p.ram - prev.ram) * 0.06 + (r() - 0.5) * 0.02, 0.04, 0.97),
        rx: Math.max(0, prev.rx + (p.net - prev.rx) * 0.35 + (r() - 0.5) * p.net * 0.6 + burst),
        tx: Math.max(0, prev.tx + (p.net * 0.42 - prev.tx) * 0.35 + (r() - 0.5) * p.net * 0.3 + burst * 0.3),
      };
    }
    case "locked":
      // Sitting in the initramfs: an idle sshd and nothing else.
      return { cpu: 0.01 + 0.02 * r(), ram: 0.03, rx: 0.02 * r(), tx: 0.01 * r() };
    case "booting":
    case "rebooting":
    case "rebuilding": {
      const t = clamp((now - box.opStart) / Math.max(1, box.opMs), 0, 1);
      return {
        cpu: clamp(0.55 + 0.4 * r(), 0, 0.99),
        ram: p.ram * t * (0.75 + 0.25 * r()),
        rx: p.net * 0.08 * r(),
        tx: p.net * 0.03 * r(),
      };
    }
    case "stopping":
      return { cpu: prev.cpu * 0.4, ram: prev.ram * 0.5, rx: prev.rx * 0.2, tx: prev.tx * 0.2 };
    default:
      return ZERO;
  }
}

/**
 * Live numbers for every box, kept outside React state so a tick only re-renders the
 * charts that subscribe to it, not the whole panel.
 */
export class Telemetry {
  private hist = new Map<string, Sample[]>();
  private subs = new Set<() => void>();
  private version = 0;

  subscribe = (fn: () => void) => {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  };
  getVersion = () => this.version;

  /** A believable last minute for a box, deterministic per box name. */
  seed(box: Server, now: number) {
    const r = prng(hashString(box.id));
    const p = profileOf(box);
    let prev: Sample = { cpu: p.cpu, ram: p.ram, rx: p.net, tx: p.net * 0.4 };
    const out: Sample[] = [];
    for (let i = HISTORY - 1; i >= 0; i--) {
      const at = now - i * 1000;
      // A box that is booting now was off before its boot started.
      const view: Server = box.status === "booting" && at < box.opStart ? { ...box, status: "stopped" } : box;
      prev = nextSample(prev, view, at, r);
      out.push(prev);
    }
    this.hist.set(box.id, out);
  }

  reset(servers: Server[], now: number) {
    this.hist.clear();
    for (const s of servers) this.seed(s, now);
    this.bump();
  }

  add(box: Server) {
    this.hist.set(box.id, Array.from({ length: HISTORY }, () => ZERO));
    this.bump();
  }

  drop(id: string) {
    this.hist.delete(id);
    this.bump();
  }

  step(servers: Server[], now: number) {
    for (const box of servers) {
      const h = this.hist.get(box.id) ?? Array.from({ length: HISTORY }, () => ZERO);
      const next = nextSample(h[h.length - 1] ?? ZERO, box, now, Math.random);
      this.hist.set(box.id, [...h.slice(1 - HISTORY), next]);
    }
    this.bump();
  }

  series(id: string): Sample[] {
    return this.hist.get(id) ?? [];
  }

  latest(id: string): Sample {
    const h = this.hist.get(id);
    return h?.[h.length - 1] ?? ZERO;
  }

  private bump() {
    this.version++;
    for (const fn of this.subs) fn();
  }
}

/* Context ----------------------------------------------------------------- */

type Actions = ReturnType<typeof useActions>;
type Store = { state: State; actions: Actions; telemetry: Telemetry };

const StoreCtx = createContext<Store | null>(null);
const ClockCtx = createContext(0);

export function useDash() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useDash outside <DashProvider>");
  return v;
}

/** Wall-clock milliseconds, ticking once a second while the panel is unlocked. */
export function useClock() {
  return useContext(ClockCtx);
}

/** Re-renders on every telemetry tick and returns the store to read from. */
export function useTelemetry() {
  const { telemetry } = useDash();
  useSyncExternalStore(telemetry.subscribe, telemetry.getVersion, telemetry.getVersion);
  return telemetry;
}

export type DeployConfig = {
  plan: string;
  location: string;
  image: ImageId;
  keyId: string | null;
  months: number;
  method: string;
};

function useActions(
  dispatch: (a: Action) => void,
  stateRef: { current: State },
  telemetry: Telemetry,
  setNow: (n: number) => void,
) {
  return useMemo(() => {
    const stamp = () => Date.now();
    return {
      unlock(credential: string) {
        const now = stamp();
        setNow(now);
        dispatch({ type: "unlock", credential, now });
        telemetry.reset(seedServers(now), now);
      },
      lock() {
        dispatch({ type: "lock" });
        telemetry.reset([], 0);
      },
      setNet(net: Net) {
        dispatch({ type: "net", net, now: stamp() });
      },
      power(id: string, op: PowerOp, image?: ImageId) {
        dispatch({ type: "power", id, op, image, now: stamp() });
      },
      /** Demo only: stands in for you running blackbox-verify and then `ssh root@… unlock` yourself. */
      diskUnlocked(id: string) {
        dispatch({ type: "disk-unlocked", id, now: stamp() });
      },
      /** Adds the box (provisioning) and its paid invoice; returns the name it was given. */
      deploy(cfg: DeployConfig) {
        const now = stamp();
        const s = stateRef.current;
        const plan = planIn(cfg.location, cfg.plan);
        const loc = locationOf(cfg.location);
        const id = nextName(plan.id, loc.id, s.servers.map((x) => x.id));
        const bb = plan.line === "blackbox";
        const server: Server = {
          id,
          plan: plan.id,
          location: loc.id,
          image: cfg.image,
          ipv4: fakeIpv4(id),
          ipv6: bb ? fakeIpv6Block(id) : null,
          status: "booting",
          startedAt: null,
          opStart: now,
          opMs: BOOT_MS,
          created: TODAY,
          expires: addMonths(TODAY, cfg.months),
          cycle: cfg.months,
          autoRenew: true,
          keyId: cfg.keyId,
          rdns: null,
          encrypted: false,
          transferTb: 0,
        };
        const invoice: Invoice = {
          id: `inv-${now}`,
          date: TODAY,
          what: id,
          months: cfg.months,
          usd: cycleTotal(plan, cfg.months),
          method: cfg.method,
        };
        dispatch({ type: "deploy", server, invoice, now });
        telemetry.add(server);
        return id;
      },
      destroy(id: string) {
        dispatch({ type: "destroy", id, now: stamp() });
        telemetry.drop(id);
      },
      renew(id: string, months: number, method: string) {
        const now = stamp();
        const box = stateRef.current.servers.find((x) => x.id === id);
        if (!box) return;
        const invoice: Invoice = { id: `inv-${now}`, date: TODAY, what: id, months, usd: cycleTotal(planOf(box), months), method };
        dispatch({ type: "renew", id, months, invoice, now });
      },
      setAutoRenew(id: string, on: boolean) {
        dispatch({ type: "auto-renew", id, on, now: stamp() });
      },
      addCredit(amount: number, method: string) {
        const now = stamp();
        dispatch({ type: "credit", invoice: { id: `inv-${now}`, date: TODAY, what: "account credit", months: null, usd: amount, method }, now });
      },
      setRdns(id: string, name: string | null) {
        dispatch({ type: "rdns", id, name, now: stamp() });
      },
      addKey(name: string, type: string, fp: string) {
        const key: SshKey = { id: `k-${randomString(6)}`, name, type, fingerprint: fp, added: TODAY };
        dispatch({ type: "key-add", key, now: stamp() });
        return key;
      },
      removeKey(id: string) {
        dispatch({ type: "key-remove", id, now: stamp() });
      },
      note(kind: LogKind, text: string) {
        dispatch({ type: "note", kind, text, now: stamp() });
      },
      forget() {
        dispatch({ type: "forget" });
      },
      toast(text: string, tone?: Toast["tone"]) {
        dispatch({ type: "toast", text, tone });
      },
      dismissToast(id: number) {
        dispatch({ type: "toast-dismiss", id });
      },
    };
  }, [dispatch, stateRef, telemetry, setNow]);
}

export function DashProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [telemetry] = useState(() => new Telemetry());
  const [now, setNow] = useState(0);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const actions = useActions(dispatch, stateRef, telemetry, setNow);
  const unlocked = state.credential !== null;

  // One heartbeat for the whole panel: the clock, the telemetry, and finishing boots.
  useEffect(() => {
    if (!unlocked) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const servers = stateRef.current.servers;
      telemetry.step(servers, t);
      if (servers.some((x) => TRANSITIONAL.has(x.status) && t >= x.opStart + x.opMs)) dispatch({ type: "settle", now: t });
    }, 1000);
    return () => window.clearInterval(id);
  }, [unlocked, telemetry]);

  const store = useMemo(() => ({ state, actions, telemetry }), [state, actions, telemetry]);
  return (
    <StoreCtx.Provider value={store}>
      <ClockCtx.Provider value={now}>{children}</ClockCtx.Provider>
    </StoreCtx.Provider>
  );
}

/** Lock: drop everything in memory and go back to the gate. */
export function useLock() {
  const { actions } = useDash();
  const router = useRouter();
  return () => {
    actions.lock();
    router.replace("/dashboard");
  };
}

/** Ticks a local clock for animations finer than the panel's one-second heartbeat. */
export function useNow(interval: number, active = true) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, interval);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [interval, active]);
  return now;
}
