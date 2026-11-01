import type { CSSProperties } from "react";
import { Section, Title, Wide } from "@/components/kit";
import { LedgerPlay } from "@/components/sections/LedgerPlay";

// A server component. The only moving part is LedgerPlay, which clears the
// matrix until it scrolls in and then sweeps it once. Plain helpers like cn
// can't be imported from the client kit, so classes are joined here.
const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

/*
 * What each kind of host keeps on a customer. The fields are ordered so the
 * sets nest: a "privacy" host keeps the first 5, a budget VPS the first 9, a
 * typical cloud all 14. That keeps every row's squares contiguous, so the
 * matrix reads as a staircase with our row as the empty step. Two of the first
 * five are ones absolute only holds if you choose to: a ticket, a card payment.
 */
const FIELDS = [
  "email",
  "signup IP",
  "login IP history",
  "card processor ID",
  "support tickets",
  "legal name",
  "phone",
  "card number",
  "billing address",
  "date of birth",
  "ID scan",
  "selfie",
  "access logs",
  "traffic flow logs",
] as const;

type Field = (typeof FIELDS)[number];

type Host = {
  name: string;
  /** Column label on phones, where the hosts become the columns. */
  short: string;
  keeps: number;
  /** Kept only if the customer chooses to: opens a ticket, pays by card. */
  chosen?: readonly Field[];
  note: string;
  self?: boolean;
};

// Best first, like a leaderboard: here the best score is the smallest.
const HOSTS: Host[] = [
  {
    name: "absolute",
    short: "absolute",
    keeps: 0,
    chosen: ["card processor ID", "support tickets"],
    note: "Never asks who you are. Keeps a support ticket only if you open one, and a card processor ID only if you pay by card.",
    self: true,
  },
  {
    name: "A ‘privacy’ host",
    short: "‘privacy’ host",
    keeps: 5,
    note: "Skips the ID check, but wants an email and logs every login.",
  },
  {
    name: "A budget VPS",
    short: "budget VPS",
    keeps: 9,
    note: "Takes a card, so your legal name and billing address come with it.",
  },
  {
    name: "A typical cloud",
    short: "typical cloud",
    keeps: 14,
    note: "Full KYC: an ID scan, a selfie, and flow logs of everything you send.",
  },
];

type Cell = "kept" | "chosen" | "not";

function cellOf(host: Host, field: Field, j: number): Cell {
  if (host.chosen?.includes(field)) return "chosen";
  return j < host.keeps ? "kept" : "not";
}

const SAID: Record<Cell, string> = { kept: "kept", chosen: "kept only if you choose", not: "not kept" };

const N = FIELDS.length;
/** How long the read head takes to cross the matrix; each column lights as it passes. */
const SWEEP_MS = 1300;

// Squares a host keeps start lit on the server. LedgerPlay's "armed" clears
// them without a transition, and "play" relights each one as the head reaches its column.
const LIGHT =
  "border-pink bg-pink [transition:background-color_160ms_var(--d),border-color_160ms_var(--d)] group-data-[state=armed]:border-white/30 group-data-[state=armed]:bg-transparent group-data-[state=armed]:[transition:none]";

/** One square of the matrix: pink when the host keeps the field, a hollow outline when it doesn't. */
function squareClass(cell: Cell, self?: boolean) {
  if (self) return "border-ink/40";
  return cell === "kept" ? LIGHT : "border-white/30";
}

/** The centre pixel of an "only if you choose" square. */
function Pip({ self, className }: { self?: boolean; className: string }) {
  return <span aria-hidden className={cx(className, self ? "bg-ink" : "bg-white")} />;
}

/** A rack screw head for the panel's corners. */
function Screw({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 8 8" className={cx("absolute size-2 stroke-white/40", className)}>
      <circle cx="4" cy="4" r="3.5" fill="none" />
      <path d="M1.8 6.2 6.2 1.8" />
    </svg>
  );
}

/** The literal empty table: what an identity query returns when it's run against us. */
function Query({ className }: { className?: string }) {
  const lines = [" name | email | ip", "------+-------+----"];
  const more = <span className="text-mint">records-&gt;</span>;
  return (
    <div
      role="img"
      aria-label="A query for the name, email and IP address of every customer with an email on file returns zero rows."
      className={cx("min-w-0 border border-night-line bg-night-2", className)}
    >
      <div className="flex items-center justify-between border-b border-night-line px-5 py-3 font-mono text-[11px] tracking-[0.18em] text-white/70 uppercase">
        <span>records · read-only</span>
        <span className="flex gap-1.5">
          <span className="size-[7px] bg-mint" />
          <span className="size-[7px] bg-night-line" />
        </span>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[13px] leading-[1.75] text-white/80">
        <span className="text-mint">records=&gt;</span> select name, email, ip
        {"\n"}
        {more}
        {"   from customers\n"}
        {more}
        {"   where email is not null;"}
        {"\n"}
        {lines.join("\n")}
        {"\n"}
        <span className="text-lime">(0 rows)</span>
        {"\n\n"}
        <span className="text-mint">records=&gt;</span>{" "}
        <span className="animate-caret inline-block h-[1.05em] w-[0.6em] translate-y-[0.18em] bg-mint-pale motion-reduce:animate-none" />
      </pre>
    </div>
  );
}

/**
 * The ledger: every kind of host against the 14 things a host can keep on a
 * customer. From lg it's a matrix, fields across and hosts down, with absolute's
 * row a lime strip of hollow squares, two of them pipped. Below lg the matrix turns on its side so
 * every field keeps a readable label: fields down, hosts across.
 */
export function Ledger() {
  const most = HOSTS[HOSTS.length - 1];

  return (
    <Section id="ledger" tone="night" aria-labelledby="ledger-title">
      <Wide className="grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:gap-y-16 xl:gap-x-16 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Title
          id="ledger-title"
          tone="night"
          kicker="What hosts keep on you"
          sub={`A typical cloud keeps all ${most.keeps} things below on every customer, long after they cancel. absolute asks for none of them. Two can exist only by your choice: a support ticket if you open one, a card processor ID if you pay by card.`}
        >
          Subpoena us for a name and you get an empty table.
        </Title>

        <Query className="order-last lg:order-none" />

        <div className="lg:col-span-2">
          <div className="relative border border-night-line bg-night-2">
            <Screw className="top-2 left-2" />
            <Screw className="top-2 right-2" />
            <Screw className="bottom-2 left-2" />
            <Screw className="right-2 bottom-2" />

            {/* Faceplate: what the panel is, and the legend both layouts share. */}
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-night-line px-5 py-4 sm:px-8 lg:px-6 xl:px-8">
              <p className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.18em] text-white/75 uppercase">
                <span aria-hidden className="size-[7px] animate-pulse bg-mint motion-reduce:animate-none" />
                Customer records, by host
              </p>
              <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[12px] text-white/80">
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-3 bg-pink" />
                  kept on file
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="flex size-3 items-center justify-center border border-white/45">
                    <Pip className="size-1" />
                  </span>
                  only if you choose
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-3 border border-white/45" />
                  not kept
                </li>
              </ul>
            </div>

            {/* lg+: fields across, hosts down. Each row and the sweep are placed on explicit grid rows
                so the sweep can lie over all four host rows. */}
            <LedgerPlay className="hidden lg:block">
              <div
                role="table"
                aria-label="Customer data kept, by kind of host"
                className="relative grid grid-cols-[minmax(0,1fr)_repeat(14,clamp(36px,3.75vw,54px))_clamp(96px,10vw,150px)]"
              >
                <div role="row" className="col-span-full grid grid-cols-subgrid" style={{ gridRow: 1 }}>
                  <span
                    role="columnheader"
                    className="self-end pb-5 pl-6 font-mono text-[11px] tracking-[0.18em] text-white/70 uppercase xl:pl-8"
                  >
                    Host
                  </span>
                  {/* Labels stand on a tick, like a ruler, so each one points down its column. */}
                  {FIELDS.map((field) => (
                    <span key={field} role="columnheader" className="flex flex-col items-center justify-end gap-3 pt-8">
                      <span className="rotate-180 font-mono text-[12px] leading-none whitespace-nowrap text-white/85 [writing-mode:vertical-rl]">
                        {field}
                      </span>
                      <span aria-hidden className="h-2 w-px bg-white/40" />
                    </span>
                  ))}
                  <span
                    role="columnheader"
                    className="self-end pr-6 pb-5 text-right font-mono text-[11px] tracking-[0.18em] text-white/70 uppercase xl:pr-8"
                  >
                    Kept
                  </span>
                </div>

                {HOSTS.map((host, i) => (
                  <div
                    key={host.name}
                    role="row"
                    className={cx(
                      "col-span-full grid grid-cols-subgrid border-t",
                      host.self ? "border-lime bg-lime text-ink" : "border-night-line text-white",
                    )}
                    style={{ gridRow: i + 2 }}
                  >
                    {/* Under xl the name column is too narrow for the note to read as a line, so it waits. */}
                    <div role="rowheader" className="self-center py-7 pr-4 pl-6 xl:pr-8 xl:pl-8">
                      <p className="font-display text-[24px] leading-tight font-bold tracking-[-0.03em] xl:text-[30px]">
                        {host.name}
                      </p>
                      <p
                        className={cx(
                          "mt-1.5 hidden max-w-[36ch] text-[16px] leading-snug text-pretty xl:block",
                          host.self ? "text-ink-2" : "text-white/72",
                        )}
                      >
                        {host.note}
                      </p>
                    </div>
                    {FIELDS.map((field, j) => {
                      const cell = cellOf(host, field, j);
                      return (
                        <span key={field} role="cell" className="flex items-center justify-center">
                          <span
                            aria-hidden
                            className={cx(
                              "flex size-6 items-center justify-center border xl:size-8",
                              squareClass(cell, host.self),
                            )}
                            style={{ "--d": `${Math.round(((j + 0.5) / N) * SWEEP_MS)}ms` } as CSSProperties}
                          >
                            {cell === "chosen" ? <Pip self={host.self} className="size-1.5 xl:size-2" /> : null}
                          </span>
                          <span className="sr-only">{SAID[cell]}</span>
                        </span>
                      );
                    })}
                    <span role="cell" className="flex flex-col items-end justify-center pr-6 xl:pr-8">
                      <span className="font-display text-[56px] leading-none font-extrabold tracking-[-0.04em] tabular-nums [font-variation-settings:'opsz'_96] xl:text-[72px]">
                        {host.keeps}
                      </span>
                      {host.chosen ? (
                        <span className="mt-1.5 font-mono text-[11px] leading-none tracking-[0.04em] text-ink-2">
                          by default
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}

                {/* The read head: parked at the first column while armed, then one pass to the last. */}
                <div
                  aria-hidden
                  className="pointer-events-none relative overflow-hidden [grid-column:2/-2]"
                  style={{ gridRow: `2 / ${HOSTS.length + 2}` }}
                >
                  <span
                    className="absolute inset-0 opacity-0 [transition:translate_var(--sweep)_linear,opacity_300ms_var(--sweep)] group-data-[state=armed]:opacity-100 group-data-[state=armed]:[transition:none] group-data-[state=play]:translate-x-full"
                    style={{ "--sweep": `${SWEEP_MS}ms` } as CSSProperties}
                  >
                    <span className="absolute inset-y-0 left-0 w-0.5 bg-mint" />
                  </span>
                </div>
              </div>
            </LedgerPlay>

            {/* Below lg: the same table on its side, so every field keeps a full label. */}
            <table className="w-full table-fixed border-collapse lg:hidden">
              <caption className="sr-only">Customer data kept, by kind of host</caption>
              <colgroup>
                <col className="w-[124px] sm:w-[40%]" />
                {HOSTS.map((host) => (
                  <col key={host.name} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <td />
                  {HOSTS.map((host) => (
                    <th
                      key={host.name}
                      scope="col"
                      className={cx(
                        "px-1 pt-5 pb-4 align-bottom font-normal",
                        host.self ? "bg-lime text-ink" : "text-white",
                      )}
                    >
                      <span
                        className={cx(
                          "block text-[12px] leading-tight sm:text-[13px]",
                          host.self ? "font-semibold" : "text-white/80",
                        )}
                      >
                        {host.short}
                      </span>
                      <span className="sr-only"> keeps </span>
                      <span className="mt-2 block font-display text-[32px] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
                        {host.keeps}
                      </span>
                      {host.chosen ? (
                        <span className="mt-1 block font-mono text-[11px] leading-tight text-ink-2">by default</span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((field, j) => (
                  <tr key={field} className="border-t border-night-line">
                    {/* One row height for all, so a label that wraps doesn't knock the squares off the grid. */}
                    <th
                      scope="row"
                      className="h-12 pr-3 pl-5 text-left font-mono text-[12px] leading-[1.25] font-normal text-white/85 sm:pl-8 sm:text-[13px]"
                    >
                      {field}
                    </th>
                    {HOSTS.map((host) => {
                      const cell = cellOf(host, field, j);
                      return (
                        <td key={host.name} className={cx(host.self && "bg-lime")}>
                          <span
                            aria-hidden
                            className={cx(
                              "mx-auto flex size-[18px] items-center justify-center border",
                              host.self ? "border-ink/40" : cell === "kept" ? "border-pink bg-pink" : "border-white/30",
                            )}
                          >
                            {cell === "chosen" ? <Pip self={host.self} className="size-1.5" /> : null}
                          </span>
                          <span className="sr-only">{SAID[cell]}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 max-w-[112ch] font-mono text-[12px] leading-relaxed text-white/70">
            Rows are composites, not named companies: what each kind of host typically asks for at signup and still
            holds after you cancel. On absolute&rsquo;s row, no email, phone, name, address or ID is ever asked for, and
            neither visitor IP addresses nor traffic are logged. Delete the account and every record naming it goes;
            invoices stay as anonymous amounts and dates.
          </p>
        </div>
      </Wide>
    </Section>
  );
}
