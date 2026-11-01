// Everything the panel simulates: seed fleet, keys, invoices and the small pure helpers around them.
// Plans, prices, locations, systems and payment methods always come from catalog.ts, so the panel
// never drifts from the landing page. Prices go through price() so MARKUP applies.

import { brand } from "@/lib/brand";
import { locations, price, systems, type Location, type LocationId, type Plan } from "@/lib/catalog";

/** The panel's idea of today. Fixed, so every render and every screenshot agrees. */
export const TODAY = brand.canaryUpdated;
/** A real credential is a randomly generated 32-character string; this one only opens the demo. */
export const CREDENTIAL_LENGTH = 32;
export const DEMO_CREDENTIAL = "7Q4hN2vXq9LmT3pW8sKd5RfY0cBk2ZxA";
/** What the demo account starts with on its balance. */
export const SEED_BALANCE = 18.4;

/** The measured-boot release a Blackbox boots unless you bring your own (built 2026-09-05). */
export const RELEASE = { id: "2026.09", kernel: "6.12.107+deb13-amd64", policy: "0x30000" } as const;

/** Renewal cycles offered here. No discounts: a month costs a month. */
export const CYCLES = [
  { months: 1, label: "1 mo" },
  { months: 3, label: "3 mo" },
  { months: 6, label: "6 mo" },
  { months: 12, label: "12 mo" },
] as const;

/* Operating systems --------------------------------------------------------- */

export type Family = "debian" | "ubuntu" | "rocky" | "alma" | "centos" | "freebsd" | "openbsd" | "windows";
const FAMILY_OF: Record<string, Family> = {
  Debian: "debian",
  Ubuntu: "ubuntu",
  "Rocky Linux": "rocky",
  AlmaLinux: "alma",
  CentOS: "centos",
  FreeBSD: "freebsd",
  OpenBSD: "openbsd",
  "Windows Server": "windows",
};

export type ImageId = string;
export type Image = { id: ImageId; family: Family; name: string; version: string; note: string };

/** Every system and version from the catalogue, one image each: "debian-13", "ubuntu-24.04", "windows-2025". */
export const FAMILIES = systems.map((s) => {
  const family = FAMILY_OF[s.name] ?? "debian";
  const images: Image[] = s.versions.map((v) => ({
    id: `${family}-${v.replace(/\s*LTS$/, "")}`,
    family,
    name: s.name,
    version: v,
    note: s.note,
  }));
  return { family, name: s.name, note: s.note, images };
});
export const IMAGES: Image[] = FAMILIES.flatMap((f) => f.images);

/**
 * Measured boot needs a Linux template that supports SEV-SNP and encryption; once unlocked, a
 * Blackbox is a normal Debian or Ubuntu. Anything else boots from your own ISO in its panel.
 */
export const BLACKBOX_FAMILIES: readonly Family[] = ["debian", "ubuntu"];

export const imageOf = (id: ImageId): Image => IMAGES.find((i) => i.id === id) ?? IMAGES[0];
export const imageLabel = (id: ImageId) => {
  const i = imageOf(id);
  return `${i.name} ${i.version}`;
};
export const isWindows = (id: ImageId) => imageOf(id).family === "windows";

/* Servers ------------------------------------------------------------------- */

/** "locked" is a Blackbox waiting in its initramfs for you to verify and unlock it over SSH. */
export type Status = "running" | "booting" | "locked" | "rebooting" | "rebuilding" | "stopping" | "stopped";

export type Server = {
  id: string;
  /** A plan id inside its location: the same name can sit on different CPUs in different cities. */
  plan: string;
  location: LocationId;
  image: ImageId;
  ipv4: string;
  /** Blackbox only: the /64 routed to it. The standard line lists a dedicated IPv4 and nothing more. */
  ipv6: string | null;
  status: Status;
  /** When the box last finished booting, in ms. Uptime counts from here. */
  startedAt: number | null;
  /** The transition in progress (boot, reboot, reinstall, stop) and how long it takes. */
  opStart: number;
  opMs: number;
  created: string;
  expires: string;
  /** Renewal cycle in months, set by you. */
  cycle: number;
  autoRenew: boolean;
  keyId: string | null;
  /** Reverse DNS for the IPv4, where it can be set (Montreal). null when it hasn't been. */
  rdns: string | null;
  /** Blackbox: the disk has been encrypted at first boot, so later boots ask to unlock, not encrypt. */
  encrypted: boolean;
  /** Blackbox: TB counted so far in this 31-day window. */
  transferTb: number;
};

export type SshKey = { id: string; name: string; type: string; fingerprint: string; added: string };
export type Invoice = {
  id: string;
  date: string;
  /** What it was for: a server name, or "account credit". */
  what: string;
  months: number | null;
  usd: number;
  /** XMR, BTC, …, "cash" or "card". */
  method: string;
};

/** Provisioning takes about 30 seconds after payment. */
export const BOOT_MS = 30_000;
export const REBOOT_MS = 6000;
export const STOP_MS = 1800;
export const REBUILD_MS = 12_000;

type Seed = Omit<Server, "startedAt" | "opStart" | "opMs"> & { uptime?: number; bootedFor?: number; bootMs?: number };

// Addresses are from the documentation ranges (RFC 5737, RFC 3849): they route nowhere.
const SEEDS: Seed[] = [
  {
    id: "blackbox-plus-yul-01",
    plan: "blackbox-plus",
    location: "yul",
    image: "debian-13",
    ipv4: "203.0.113.41",
    ipv6: "2001:db8:41::/64",
    status: "running",
    uptime: 41 * 86400 + 7 * 3600 + 12 * 60 + 9,
    created: "2026-09-19",
    expires: "2026-11-19",
    cycle: 1,
    autoRenew: true,
    keyId: "k1",
    rdns: "mail.example.com",
    encrypted: true,
    transferTb: 2.9,
  },
  {
    id: "blackbox-core-yul-01",
    plan: "blackbox-core",
    location: "yul",
    image: "ubuntu-24.04",
    ipv4: "203.0.113.7",
    ipv6: "2001:db8:7::/64",
    status: "locked",
    created: "2026-10-02",
    expires: "2027-01-02",
    cycle: 3,
    autoRenew: false,
    keyId: "k2",
    rdns: null,
    encrypted: true,
    transferTb: 0.4,
  },
  {
    id: "vds-150-nl-01",
    plan: "vds-150",
    location: "nl",
    image: "debian-12",
    ipv4: "203.0.113.118",
    ipv6: null,
    status: "running",
    uptime: 12 * 86400 + 3 * 3600 + 48 * 60 + 51,
    created: "2026-08-09",
    expires: "2026-11-09",
    cycle: 3,
    autoRenew: true,
    keyId: "k1",
    rdns: null,
    encrypted: false,
    transferTb: 0,
  },
  {
    id: "vps-100-hkg-01",
    plan: "vps-100",
    location: "hkg",
    image: "ubuntu-24.04",
    ipv4: "203.0.113.23",
    ipv6: null,
    status: "booting",
    bootedFor: 4000,
    bootMs: BOOT_MS,
    created: TODAY,
    expires: "2026-11-30",
    cycle: 1,
    autoRenew: true,
    keyId: "k2",
    rdns: null,
    encrypted: false,
    transferTb: 0,
  },
  {
    id: "vds-200-fra-01",
    plan: "vds-200",
    location: "fra",
    image: "freebsd-14",
    ipv4: "203.0.113.190",
    ipv6: null,
    status: "stopped",
    created: "2026-09-02",
    expires: "2026-12-02",
    cycle: 3,
    autoRenew: false,
    keyId: null,
    rdns: null,
    encrypted: false,
    transferTb: 0,
  },
];

/** The demo fleet, placed in time relative to the moment the panel was unlocked. */
export function seedServers(now: number): Server[] {
  return SEEDS.map(({ uptime, bootedFor, bootMs, ...s }) => ({
    ...s,
    startedAt: s.status === "running" && uptime ? now - uptime * 1000 : null,
    opStart: s.status === "booting" ? now - (bootedFor ?? 0) : 0,
    opMs: s.status === "booting" ? (bootMs ?? BOOT_MS) : 0,
  }));
}

export const SEED_KEYS: SshKey[] = [
  {
    id: "k1",
    name: "laptop",
    type: "ed25519",
    fingerprint: "SHA256:Xq7vL0p3sT9dR2kW8yB4nF6hJ1cA5eG0uMa9mN2c",
    added: "2026-08-09",
  },
  {
    id: "k2",
    name: "yubikey",
    type: "sk-ed25519",
    fingerprint: "SHA256:b4Rt9QmK2wX7cV1nZ8pL3sD6fG0hJ5kA2eY9uTq0",
    added: "2026-09-02",
  },
];

export function seedInvoices(): Invoice[] {
  const rows: [string, string, number | null, string, number?][] = [
    [TODAY, "vps-100-hkg-01", 1, "XMR"],
    ["2026-10-19", "blackbox-plus-yul-01", 1, "XMR"],
    ["2026-10-02", "blackbox-core-yul-01", 3, "BTC"],
    ["2026-09-30", "account credit", null, "cash", 40],
    ["2026-09-19", "blackbox-plus-yul-01", 1, "LTC"],
    ["2026-09-02", "vds-200-fra-01", 3, "card"],
    ["2026-08-09", "vds-150-nl-01", 3, "USDT"],
  ];
  return rows.map(([date, what, months, method, amount], i) => {
    const seed = SEEDS.find((s) => s.id === what);
    const usd = seed && months ? cycleTotal(planIn(seed.location, seed.plan), months) : (amount ?? 0);
    return { id: `inv-${i}`, date, what, months, usd, method };
  });
}

/* Lookups ----------------------------------------------------------------- */

export const locationOf = (id: string): Location => locations.find((l) => l.id === id) ?? locations[0];
export const planIn = (location: string, planId: string): Plan => {
  const l = locationOf(location);
  return l.plans.find((p) => p.id === planId) ?? l.plans[0];
};
export const planOf = (s: Pick<Server, "location" | "plan">) => planIn(s.location, s.plan);
export const isBlackbox = (s: Pick<Server, "location" | "plan">) => planOf(s).line === "blackbox";
/** Reverse DNS is set from the panel on the owned Montreal hardware only. */
export const rdnsSettable = (s: Pick<Server, "location">) => Boolean(locationOf(s.location).owned);
/** "8 TB / 31 days" → 8. Unmetered → null. */
export const allowanceTb = (plan: Plan) => {
  const m = /^(\d+(?:\.\d+)?)\s*TB/.exec(plan.transfer);
  return m ? Number(m[1]) : null;
};
/** Cheapest in-stock price in a location, or null when nothing there is in stock. */
export const fromInStock = (l: Location) => {
  const ok = l.plans.filter((p) => p.inStock);
  return ok.length ? Math.min(...ok.map((p) => p.usd)) : null;
};

/* Money ------------------------------------------------------------------- */

const cents = (n: number) => Math.round(n * 100) / 100;
/** A renewal cycle at the plan's monthly price (after MARKUP), no discount. */
export const cycleTotal = (plan: Plan, months: number) => cents(price(plan.usd) * months);
export const usd = (n: number) => `$${n.toFixed(2)}`;

/* Dates ------------------------------------------------------------------- */

const DAY = 86_400_000;
const parse = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
export const daysBetween = (from: string, to: string) => Math.round((parse(to) - parse(from)) / DAY);
export function addMonths(iso: string, months: number) {
  const y = +iso.slice(0, 4);
  const m = +iso.slice(5, 7) - 1 + months;
  const d = +iso.slice(8, 10);
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return `${yy}-${String(mm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
/** Renewals extend from whichever is later: today, or the current expiry. */
export const laterOf = (a: string, b: string) => (parse(a) >= parse(b) ? a : b);

/* Formatting -------------------------------------------------------------- */

const two = (n: number) => String(n).padStart(2, "0");
export function uptime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${two(h)}:${two(m)}:${two(s % 60)}`;
}
export function clock(at: number) {
  const d = new Date(at);
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

/** "203.0.113.41" → "203.▒.▒▒▒.41": enough to tell boxes apart over a shoulder, not enough to dial. */
export function maskIp(ip: string) {
  const parts = ip.split(".");
  if (parts.length !== 4) return ip.replace(/[0-9a-f]/gi, "▒");
  return [parts[0], "▒".repeat(parts[1].length), "▒".repeat(parts[2].length), parts[3]].join(".");
}
export const maskIp6 = (ip: string) => ip.replace(/:[0-9a-f]+::/i, ":▒▒▒▒::");

/** 7Q4hN2vX…0cBk2ZxA → 7Q4h…2ZxA */
export function fingerprint(credential: string) {
  return credential.length <= 8 ? credential : `${credential.slice(0, 4)}…${credential.slice(-4)}`;
}
export const shortFp = (fp: string) => {
  const body = fp.replace(/^SHA256:/, "");
  return `SHA256:${body.slice(0, 4)}…${body.slice(-4)}`;
};

/* Randomness -------------------------------------------------------------- */

/** FNV-1a, for turning a string into a seed. */
export function hashString(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic PRNG, so seeded drawings render the same bytes on server and client. */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const HEX = "0123456789abcdef";

/** Cryptographic randomness for ids and passwords. Only ever called from event handlers. */
export function randomString(n: number, alphabet = ALNUM) {
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (v) => alphabet[v % alphabet.length]).join("");
}

/**
 * A stand-in for a Blackbox's expected launch measurement: 48 bytes of hex, stable per box.
 * Decorative. The real number is computed from the release and the box's command line.
 */
export function measurementOf(id: string) {
  const r = prng(hashString(`measure:${id}`));
  return Array.from({ length: 96 }, () => HEX[(r() * 16) | 0]).join("");
}

/** A fake but stable SHA256-style fingerprint for a pasted public key. */
export function keyFingerprint(pub: string) {
  const r = prng(hashString(pub.trim()));
  return `SHA256:${Array.from({ length: 43 }, () => B64[(r() * 64) | 0]).join("")}`;
}

/** Loose check for an OpenSSH public key line: a known type, a base64 body, an optional comment. */
const KEY_RE =
  /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(?:256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com)\s+([A-Za-z0-9+/]{40,}={0,3})(?:\s+(.{1,80}))?$/;
export function parsePublicKey(text: string) {
  const line = text.trim().replace(/\s+/g, " ");
  if (!line) return { ok: false as const, error: "Paste a public key first." };
  if (/PRIVATE KEY/.test(line))
    return { ok: false as const, error: "That's a private key. Keep it. Only the line from the .pub file goes here." };
  const m = KEY_RE.exec(line);
  if (!m)
    return {
      ok: false as const,
      error: "That doesn't look like an OpenSSH public key. It should start with ssh-ed25519, ssh-rsa or ecdsa-sha2-….",
    };
  const type = m[1].startsWith("sk-") ? "sk-ed25519" : m[1].replace(/^ssh-/, "").replace(/^ecdsa-sha2-/, "ecdsa-");
  return { ok: true as const, type, comment: m[3]?.trim() ?? "", fingerprint: keyFingerprint(m[2]) };
}

/** Next free name for a plan in a location: vps-100-hkg-02 if vps-100-hkg-01 is taken. */
export function nextName(plan: string, location: string, taken: string[]) {
  for (let n = 1; n < 100; n++) {
    const name = `${plan}-${location}-${two(n)}`;
    if (!taken.includes(name)) return name;
  }
  return `${plan}-${location}-${randomString(3).toLowerCase()}`;
}

/** A plausible address from the 203.0.113.0/24 documentation range for a new box. */
export function fakeIpv4(name: string) {
  const r = prng(hashString(name));
  return `203.0.113.${2 + ((r() * 250) | 0)}`;
}
export const fakeIpv6Block = (name: string) => `2001:db8:${(hashString(name) % 0xfff).toString(16)}::/64`;
