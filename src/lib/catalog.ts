// Everything absolute sells: plans, prices, locations, systems and ways to pay, as of
// 2026-10-30. Prices are list prices times MARKUP; change MARKUP, not the numbers.
// Stock flags are a snapshot, not live.

/** Multiplier on every list price. 1 = as listed. */
export const MARKUP = 1;

export const price = (usd: number) => Math.round(usd * MARKUP * 100) / 100;
export const fmt = (usd: number) => `$${price(usd).toFixed(2)}`;

export type Line = "blackbox" | "vps" | "vds";

export type Plan = {
  id: string;
  name: string;
  line: Line;
  /** Core count and the CPU model behind it, e.g. 2 × "EPYC 7B13". */
  cores: number;
  cpu: string;
  ram: string;
  disk: string;
  port: string;
  transfer: string;
  usd: number;
  inStock: boolean;
};

export type LocationId = "nyc" | "yul" | "lhr" | "cdg" | "fra" | "nl" | "sin" | "hkg";

export type Location = {
  id: LocationId;
  code: string;
  city: string;
  country: string;
  cc: string;
  /** One line on why you would pick it. */
  note: string;
  /** Equirectangular position, 0–1 (x from -180°, y from +90°). */
  x: number;
  y: number;
  /** Montreal is the owned-hardware location: Blackbox, LUKS2, BYOIP, rDNS. */
  owned?: boolean;
  plans: Plan[];
};

const p = (
  line: Line,
  name: string,
  cores: number,
  cpu: string,
  ram: string,
  disk: string,
  port: string,
  usd: number,
  inStock = true,
  transfer = "Unmetered",
): Plan => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  name,
  line,
  cores,
  cpu,
  ram,
  disk,
  port,
  transfer,
  usd,
  inStock,
});

const SNP = "EPYC 7B13 · SEV-SNP";

/** The zero-knowledge line. Montreal only; the four tiers differ only in size. */
export const blackbox: Plan[] = [
  p("blackbox", "Blackbox Core", 2, SNP, "4 GB DDR4", "50 GB NVMe", "10 Gbps", 9.99, true, "4 TB / 31 days"),
  p("blackbox", "Blackbox Plus", 4, SNP, "8 GB DDR4", "100 GB NVMe", "10 Gbps", 19.99, true, "8 TB / 31 days"),
  p("blackbox", "Blackbox Max", 6, SNP, "16 GB DDR4", "200 GB NVMe", "10 Gbps", 39.99, true, "16 TB / 31 days"),
  p("blackbox", "Blackbox Ultra", 8, SNP, "32 GB DDR4", "400 GB NVMe", "10 Gbps", 79.99, true, "32 TB / 31 days"),
];

export const locations: Location[] = [
  {
    id: "nyc",
    code: "NYC",
    city: "New York City",
    country: "United States",
    cc: "US",
    note: "US East. Sub-millisecond to the NY4/NY5 financial datacenters, Tier 1 peering.",
    x: 0.2944,
    y: 0.2738,
    plans: [
      p("vps", "VPS-100", 4, "Xeon Silver 4214", "4 GB DDR4", "40 GB NVMe", "10 Gbps", 15.59),
      p("vds", "VDS-100", 2, "Ryzen 9 9900X", "4 GB DDR4", "40 GB NVMe", "1 Gbps", 16.79),
      p("vds", "VDS-150", 2, "Core i9 14900K", "4 GB DDR5", "40 GB NVMe", "10 Gbps", 17.99),
      p("vps", "VPS-150", 6, "Xeon Silver 4214", "6 GB DDR4", "60 GB NVMe", "10 Gbps", 25.19),
      p("vds", "VDS-200", 4, "Ryzen 9 9900X", "8 GB DDR4", "80 GB NVMe", "1 Gbps", 31.19),
      p("vps", "VPS-200", 8, "Xeon Silver 4214", "8 GB DDR4", "80 GB NVMe", "10 Gbps", 34.79),
      p("vps", "VPS-250", 10, "Xeon Silver 4214", "10 GB DDR4", "100 GB NVMe", "10 Gbps", 44.39),
      p("vds", "VDS-250", 6, "Ryzen 9 9900X", "12 GB DDR4", "120 GB NVMe", "1 Gbps", 44.39),
      p("vds", "VDS-300", 6, "Core i9 14900K", "12 GB DDR5", "120 GB NVMe", "10 Gbps", 45.59),
      p("vds", "VDS-350", 8, "Ryzen 9 9900X", "16 GB DDR4", "160 GB NVMe", "1 Gbps", 57.59),
      p("vds", "VDS-400", 10, "Ryzen 9 9900X", "20 GB DDR4", "200 GB NVMe", "1 Gbps", 70.79),
      p("vds", "VDS-450", 10, "Core i9 14900K", "20 GB DDR5", "200 GB NVMe", "10 Gbps", 71.99),
    ],
  },
  {
    id: "yul",
    code: "YUL",
    city: "Montreal",
    country: "Canada",
    cc: "CA",
    note: "Owned hardware in a Montreal colo. Home of Blackbox: SEV-SNP, LUKS2, BYOIP, rDNS.",
    x: 0.2956,
    y: 0.2472,
    owned: true,
    plans: [
      ...blackbox,
      p("vps", "VPS-100", 4, "Xeon Gold 6148", "4 GB DDR4", "40 GB NVMe", "10 Gbps", 15.59),
      p("vds", "VDS-150", 2, "Core i9 14900K", "4 GB DDR5", "40 GB NVMe", "1 Gbps", 17.99),
      p("vps", "VPS-150", 6, "Xeon Gold 6148", "6 GB DDR4", "60 GB NVMe", "10 Gbps", 25.19),
      p("vps", "VPS-200", 8, "Xeon Gold 6148", "8 GB DDR4", "80 GB NVMe", "10 Gbps", 34.79),
      p("vps", "VPS-250", 10, "Xeon Gold 6148", "10 GB DDR4", "100 GB NVMe", "10 Gbps", 44.39),
      p("vds", "VDS-300", 6, "Core i9 14900K", "12 GB DDR5", "120 GB NVMe", "1 Gbps", 45.59),
      p("vds", "VDS-450", 10, "Core i9 14900K", "20 GB DDR5", "200 GB NVMe", "1 Gbps", 71.99, false),
    ],
  },
  {
    id: "lhr",
    code: "LHR",
    city: "London",
    country: "United Kingdom",
    cc: "GB",
    note: "LINX peering, close to LD4/LD5. Good reach into Europe, the Middle East and Africa.",
    x: 0.4996,
    y: 0.2138,
    plans: [
      p("vps", "VPS-100", 4, "EPYC 74F3", "4 GB DDR4", "40 GB NVMe", "10 Gbps", 15.59),
      p("vps", "VPS-150", 6, "EPYC 74F3", "6 GB DDR4", "60 GB NVMe", "10 Gbps", 25.19),
      p("vps", "VPS-200", 8, "EPYC 74F3", "8 GB DDR4", "80 GB NVMe", "10 Gbps", 34.79),
      p("vps", "VPS-250", 10, "EPYC 74F3", "10 GB DDR4", "100 GB NVMe", "10 Gbps", 44.39),
    ],
  },
  {
    id: "cdg",
    code: "CDG",
    city: "Paris",
    country: "France",
    cc: "FR",
    note: "France-IX peering. Under 5 ms in France, 10–20 ms to London, Amsterdam, Frankfurt.",
    x: 0.5065,
    y: 0.2286,
    plans: [
      p("vps", "VPS-100", 4, "Xeon Silver 4214", "4 GB DDR4", "40 GB NVMe", "1 Gbps", 15.59),
      p("vps", "VPS-150", 6, "Xeon Silver 4214", "6 GB DDR4", "60 GB NVMe", "1 Gbps", 25.19),
      p("vps", "VPS-200", 8, "Xeon Silver 4214", "8 GB DDR4", "80 GB NVMe", "1 Gbps", 34.79),
      p("vps", "VPS-250", 10, "Xeon Silver 4214", "10 GB DDR4", "100 GB NVMe", "1 Gbps", 44.39),
    ],
  },
  {
    id: "fra",
    code: "FRA",
    city: "Frankfurt",
    country: "Germany",
    cc: "DE",
    note: "DE-CIX, the busiest internet exchange on the planet. Low latency across Europe.",
    x: 0.5241,
    y: 0.2216,
    plans: [
      p("vds", "VDS-100", 2, "Ryzen 9 9900X", "4 GB DDR4", "40 GB NVMe", "1 Gbps", 16.79),
      p("vds", "VDS-200", 4, "Ryzen 9 9900X", "8 GB DDR4", "80 GB NVMe", "1 Gbps", 31.19),
      p("vds", "VDS-250", 6, "Ryzen 9 9900X", "12 GB DDR4", "120 GB NVMe", "1 Gbps", 44.39, false),
      p("vds", "VDS-350", 8, "Ryzen 9 9900X", "16 GB DDR4", "160 GB NVMe", "1 Gbps", 57.59, false),
      p("vds", "VDS-400", 10, "Ryzen 9 9900X", "20 GB DDR4", "200 GB NVMe", "1 Gbps", 70.79, false),
    ],
  },
  {
    id: "nl",
    code: "NL",
    city: "Eygelshoven",
    country: "Netherlands",
    cc: "NL",
    note: "Southern Netherlands, routed to AMS-IX. Privacy-friendly Dutch jurisdiction.",
    x: 0.5168,
    y: 0.2173,
    plans: [
      p("vds", "VDS-150", 2, "Core i9 14900K", "4 GB DDR5", "40 GB NVMe", "10 Gbps", 17.99),
      p("vds", "VDS-300", 6, "Core i9 14900K", "12 GB DDR5", "120 GB NVMe", "10 Gbps", 45.59),
      p("vds", "VDS-450", 10, "Core i9 14900K", "20 GB DDR5", "200 GB NVMe", "10 Gbps", 71.99, false),
    ],
  },
  {
    id: "sin",
    code: "SIN",
    city: "Singapore",
    country: "Singapore",
    cc: "SG",
    note: "The APAC gateway: lowest latency to Southeast Asia, India and Australia.",
    x: 0.7884,
    y: 0.4925,
    plans: [
      p("vds", "VDS-100", 2, "Ryzen 7 7900", "4 GB DDR4", "40 GB NVMe", "1 Gbps", 16.79, false),
      p("vds", "VDS-200", 4, "Ryzen 7 7900", "8 GB DDR4", "80 GB NVMe", "1 Gbps", 31.19, false),
      p("vds", "VDS-250", 6, "Ryzen 7 7900", "12 GB DDR4", "120 GB NVMe", "1 Gbps", 44.39, false),
      p("vds", "VDS-350", 8, "Ryzen 7 7900", "16 GB DDR4", "160 GB NVMe", "1 Gbps", 57.59, false),
      p("vds", "VDS-400", 10, "Ryzen 7 7900", "20 GB DDR4", "200 GB NVMe", "1 Gbps", 70.79, false),
    ],
  },
  {
    id: "hkg",
    code: "HKG",
    city: "Hong Kong",
    country: "Hong Kong",
    cc: "HK",
    note: "The shortest hop to mainland China, Taiwan, Japan and Korea. 100 Mbps unmetered.",
    x: 0.8171,
    y: 0.376,
    plans: [
      p("vps", "VPS-100", 4, "EPYC 7B13", "4 GB DDR4", "40 GB NVMe", "100 Mbps", 15.59),
      p("vps", "VPS-150", 6, "EPYC 7B13", "6 GB DDR4", "60 GB NVMe", "100 Mbps", 25.19),
      p("vps", "VPS-200", 8, "EPYC 7B13", "8 GB DDR4", "80 GB NVMe", "100 Mbps", 34.79),
      p("vps", "VPS-250", 10, "EPYC 7B13", "10 GB DDR4", "100 GB NVMe", "100 Mbps", 44.39),
    ],
  },
];

export const planCount = locations.reduce((n, l) => n + l.plans.length, 0);
export const fromUsd = Math.min(...locations.flatMap((l) => l.plans.map((pl) => pl.usd)));
export const fromStandardUsd = Math.min(
  ...locations.flatMap((l) => l.plans.filter((pl) => pl.line !== "blackbox").map((pl) => pl.usd)),
);
export const fromIn = (l: Location) => Math.min(...l.plans.filter((pl) => pl.inStock).map((pl) => pl.usd));

/** The eight Blackbox guarantees, in order, with the proof each one shows. */
export const blackboxFeatures = [
  {
    id: "snp",
    title: "Encrypted storage and RAM",
    body: "Memory is encrypted by the CPU with AMD SEV-SNP, under a key that never leaves the chip. Nobody can read it, even from the hypervisor. The disk is LUKS2, with a passphrase only you ever type.",
    cmd: '$ dmesg | grep -i "memory encryption"',
    out: "Memory Encryption Features active: AMD SEV SEV-ES SEV-SNP",
  },
  {
    id: "measured",
    title: "Measured boot",
    body: "Firmware, kernel, initramfs and command line are part of a launch measurement the CPU signs. Change a byte and the number changes, and the verifier refuses before you type your passphrase.",
    cmd: "$ blackbox-verify --host 203.0.113.7",
    out: "reported measurement  match\nverdict               OK",
  },
  {
    id: "agent",
    title: "No guest agent",
    body: "An ordinary VPS has an agent inside that the host can use to reset root, run a command or read a file. A Blackbox has none, and no virtio port for one. That is why there is no reset-password button.",
    cmd: "$ ls /dev/virtio-ports/",
    out: "ls: cannot access '/dev/virtio-ports/': No such file or directory",
  },
  {
    id: "byo",
    title: "Your kernel, your image, any ISO",
    body: "Hand the node your own UKI by URL and SHA-256, write your own pre-encrypted disk image over the volume, or boot any ISO. On a measured machine the CPU measures your bytes, not ours.",
    cmd: "$ ukify build --linux vmlinuz --initrd initrd.img --output blackbox.efi",
    out: "",
  },
  {
    id: "v6",
    title: "Dedicated /64 IPv6",
    body: "A dedicated IPv4 and a whole /64 of IPv6 routed to your machine. Eighteen quintillion addresses that are yours alone.",
    cmd: "",
    out: "2001:db8:0:149::/64  routed to your VM",
  },
  {
    id: "byoip",
    title: "BYOIP and BYOASN",
    body: "Announce your own RPKI-verified space over the network, or run your own BGP session with transit and originate your prefixes yourself. Panel buttons, not tickets.",
    cmd: "",
    out: "",
  },
  {
    id: "rdns",
    title: "Reverse DNS you set",
    body: "Set rDNS for your IPv4 and IPv6 from the panel, live within a minute. Mail servers need it; you do not need us for it.",
    cmd: "$ dig -x 203.0.113.7 +short",
    out: "mail.example.com.",
  },
  {
    id: "abuse",
    title: "Abuse reports read by a person",
    body: "Run a Tor relay, a VPN exit or a mail server and reports will come, most automated and many wrong. A human reads every one and talks to you first. No script suspends you because a blocklist said so.",
    cmd: "",
    out: "",
  },
] as const;

/** The unlock flow every Blackbox boots into. */
export const unlockTranscript = [
  { t: "cmd", s: "$ ssh root@203.0.113.7", c: "# the box waits in its initramfs" },
  { t: "out", s: "Please unlock disk root_crypt: ********" },
  { t: "ok", s: "  Disk unlocked. Booting." },
  { t: "cmd", s: "$ ssh root@203.0.113.7", c: "# same machine, now running" },
  { t: "cmd", s: '$ dmesg | grep -i "Memory Encryption"' },
  { t: "out", s: "Memory Encryption Features active: AMD SEV SEV-ES SEV-SNP" },
  { t: "cmd", s: "$ ls /dev/virtio-ports/" },
  { t: "out", s: "ls: cannot access '/dev/virtio-ports/': No such file or directory" },
] as const;

/** Account and platform facts that hold on every line. */
export const promises = [
  { id: "identity", title: "Zero identity", body: "A randomly generated 32-character credential is the whole account. No email, no phone, no KYC." },
  { id: "fast", title: "Live in about 30 seconds", body: "Payment confirmed, credentials in your panel. Nobody reviews you first." },
  { id: "root", title: "Full root or RDP", body: "Install anything. No managed-hosting guardrails. Reinstall to another OS from the panel." },
  { id: "renew", title: "Custom renewal cycles", body: "Seven-day minimum, prorated, then renew on whatever cycle you set. Delete it the moment the job is done." },
  { id: "logs", title: "No traffic logging", body: "No packet inspection, no flow logs, no activity monitoring. Web access logs go to /dev/null." },
  { id: "ipv4", title: "Dedicated IPv4 on every plan", body: "Never a shared address. The standard line is unmetered." },
] as const;

export const lines = {
  blackbox: { name: "Blackbox", short: "Zero-knowledge VPS", note: "Montreal. SEV-SNP encrypted RAM, LUKS2 disk, measured boot, no guest agent." },
  vps: { name: "VPS", short: "Shared resources", note: "The budget line. Unmetered, dedicated IPv4." },
  vds: { name: "VDS", short: "Dedicated resources", note: "Cores kept to yourself. Unmetered, dedicated IPv4." },
} as const;

/** Every coin is watched on self-hosted nodes; BTC, LTC and XMR get a fresh address per invoice. */
export const coins = ["XMR", "BTC", "LTC", "ETH", "TRX", "BNB", "USDT", "USDC"] as const;

export const payments = [
  { id: "crypto", name: "Crypto", note: "XMR, BTC, LTC, ETH, TRX, BNB, USDT, USDC on self-hosted nodes. A fresh address per invoice on BTC, LTC and XMR." },
  { id: "cash", name: "Cash by mail", note: "For the patient. Put the credential in the envelope, not your name." },
  { id: "card", name: "Card", note: "Through a card processor, which sees an amount and an opaque customer record, never what it was for." },
] as const;

export const systems = [
  { name: "Debian", versions: ["12", "13"], note: "SEV-SNP and LUKS available." },
  { name: "Ubuntu", versions: ["24.04 LTS", "26.04 LTS"], note: "Web stacks, Docker, Python." },
  { name: "Rocky Linux", versions: ["9"], note: "RHEL compatible." },
  { name: "AlmaLinux", versions: ["9", "10"], note: "RHEL compatible, confidential-computing ready." },
  { name: "CentOS", versions: ["10"], note: "RHEL stream." },
  { name: "FreeBSD", versions: ["14", "15"], note: "ZFS, jails." },
  { name: "OpenBSD", versions: ["7.8", "7.9"], note: "Security first." },
  { name: "Windows Server", versions: ["2022", "2025"], note: "Full RDP, .NET, IIS, MT4/MT5." },
] as const;

export const blackboxTerms = {
  minimum: "7-day minimum, prorated.",
  transfer:
    "Transfer is counted as the larger of inbound or outbound, never both. Past the allowance the port slows to 10 Mbps instead of billing you.",
  sameEverywhere: "Every tier is protected identically: same silicon, same encryption, same keys nobody else holds. Core, Plus, Max and Ultra differ only in size.",
} as const;
