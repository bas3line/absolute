"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cn } from "@/components/kit";
import { fmt, payments } from "@/lib/catalog";
import { CYCLES, TODAY, addMonths, cycleTotal, daysBetween, laterOf, locationOf, planOf, usd } from "./data";
import { PAY_GLYPHS } from "./glyphs";
import { serverHref } from "./nav";
import { Pay } from "./Pay";
import { useDash } from "./store";
import { Button, CellBar, DISPLAY, Dialog, Icon, LABEL, Led, MUTED, PageHeader, Panel, Pixels, Segmented, motion } from "./ui";

const DAYS_PER_CELL = 7.5; // 24 cells ≈ six months
const CREDIT = [10, 25, 50, 100];

export function Billing() {
  const { state, actions } = useDash();
  const [renewing, setRenewing] = useState<string | null>(null);
  const [crediting, setCrediting] = useState(false);
  const boxes = [...state.servers].sort((a, b) => a.expires.localeCompare(b.expires));
  const first = boxes[0];

  return (
    <div className={motion.rise}>
      <PageHeader
        eyebrow="Billing"
        lead="A balance, not a name."
        trail="Invoices say what, never who."
        intro="Pay with crypto, cash by mail or card. Every server has an expiry and a renewal cycle you set: seven-day minimum, prorated. Expired services are removed along with their data."
        actions={
          <Button variant="primary" onClick={() => setCrediting(true)}>
            <Icon name="plus" /> add credit
          </Button>
        }
      />

      <section aria-label="Totals" className="mt-8 grid gap-px border border-line-2 bg-line-2 sm:grid-cols-3">
        <Tile label="Account balance">
          <span className="font-dot text-[48px] font-bold leading-[0.8] tracking-[-0.02em] text-ink">{usd(state.balance)}</span>
          <span className="mt-3 block font-mono text-[12px] text-ink-2">credit on the account. the account is the credential.</span>
        </Tile>
        <Tile label="Next expiry">
          <span className="font-dot text-[48px] font-bold leading-[0.8] tracking-[-0.02em] text-ink">
            {first ? daysBetween(TODAY, first.expires) : 0}
          </span>
          <span className="ml-2 font-mono text-[12px] text-ink-2">days</span>
          <span className="mt-3 block font-mono text-[12px] text-ink-2">{first ? `${first.id}, on ${first.expires}` : "nothing running"}</span>
        </Tile>
        <Tile label="Names on invoices" accent>
          <span className="font-dot text-[48px] font-bold leading-[0.8] tracking-[-0.02em] text-accent">0</span>
          <span className="mt-3 block font-mono text-[12px] text-ink-2">
            of {state.invoices.length} invoices. each holds an amount, a method, a time and what it was for.
          </span>
        </Tile>
      </section>

      <Panel title="renewals" status={`${boxes.length} boxes · ■ ≈ ${DAYS_PER_CELL} days`} className="mt-8">
        <ul className="divide-y divide-line">
          {boxes.map((b) => {
            const plan = planOf(b);
            const left = daysBetween(TODAY, b.expires);
            const soon = left <= 14;
            return (
              <li key={b.id} className="grid gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <Led status={b.status} size={9} />
                  <span className="min-w-0">
                    <Link
                      href={serverHref(b.id)}
                      className="block truncate font-mono text-[13px] text-ink underline-offset-4 hover:text-accent hover:underline"
                    >
                      {b.id}
                    </Link>
                    <span className={cn("block font-mono text-[11px]", MUTED)}>
                      {plan.name} · {fmt(plan.usd)}/mo · {locationOf(b.location).code}
                    </span>
                  </span>
                </div>
                <div className="min-w-0">
                  <CellBar
                    cells={24}
                    lit={Math.min(24, Math.max(left > 0 ? 1 : 0, Math.round(left / DAYS_PER_CELL)))}
                    size={8}
                    gap={2}
                    on={soon ? "bg-mint shadow-[inset_0_0_0_1px_var(--accent)]" : "bg-accent"}
                    className="flex-wrap"
                  />
                  <p className="mt-2 text-[15px] text-ink">
                    <span className="font-mono tabular-nums">{left}</span> days. Expires on <span className="font-mono">{b.expires}</span>.
                  </p>
                  <p className={cn("mt-0.5 font-mono text-[11.5px]", MUTED)}>renews every {b.cycle} mo · auto-renew {b.autoRenew ? "on" : "off"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={b.autoRenew}
                    aria-label={`Auto-renew ${b.id}`}
                    onClick={() => actions.setAutoRenew(b.id, !b.autoRenew)}
                    className="flex h-8 items-stretch border border-line-2 font-mono text-[11.5px] transition-colors hover:border-ink"
                  >
                    <span className={cn("flex items-center px-2", b.autoRenew ? "bg-ink text-white" : "text-ink-2")}>auto</span>
                    <span className={cn("flex items-center px-2", !b.autoRenew ? "bg-ink text-white" : "text-ink-2")}>manual</span>
                  </button>
                  <Button variant={soon ? "primary" : "ghost"} size="sm" onClick={() => setRenewing(b.id)}>
                    <Icon name="plus" /> renew
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="invoices" status="no names, no addresses" className="mt-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left font-mono text-[12.5px]">
            <caption className="sr-only">Invoices. They carry no names, because there are none to carry.</caption>
            <thead>
              <tr className={cn("border-b border-line", LABEL)}>
                <th scope="col" className="px-5 py-3 font-normal">
                  Date
                </th>
                <th scope="col" className="px-3 py-3 font-normal">
                  For
                </th>
                <th scope="col" className="px-3 py-3 font-normal">
                  Term
                </th>
                <th scope="col" className="px-3 py-3 text-right font-normal">
                  Amount
                </th>
                <th scope="col" className="px-3 py-3 font-normal">
                  Method
                </th>
                <th scope="col" className="px-5 py-3 text-right font-normal">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {state.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-5 py-3 tabular-nums text-ink-2">{inv.date}</td>
                  <td className="px-3 py-3 text-ink">{inv.what}</td>
                  <td className="px-3 py-3 text-ink-2">{inv.months ? `${inv.months} mo` : "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-ink">{usd(inv.usd)}</td>
                  <td className="px-3 py-3 text-ink-2">{inv.method}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 text-accent">
                      <Icon name="check" scale={1.5} /> paid
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={cn("border-t border-line px-5 py-3 font-mono text-[11px]", MUTED)}>
          An invoice is an amount, a method, a timestamp and a description. Delete the account and they stay as anonymous
          financial records.
        </p>
      </Panel>

      <section aria-labelledby="methods" className="mt-10">
        <h2 id="methods" className={cn("text-[clamp(1.5rem,2.4vw,1.9rem)] leading-tight text-ink", DISPLAY)}>
          Three ways to pay. <span className="text-accent">None ask your name.</span>
        </h2>
        <ul className="mt-6 grid border-y border-line md:grid-cols-3">
          {payments.map((p, i) => (
            <li key={p.id} className={cn("flex gap-5 py-6 md:px-6", i === 0 && "md:pl-0", i > 0 && "border-line max-md:border-t md:border-l")}>
              <Pixels rows={PAY_GLYPHS[p.id]} scale={4} palette={{ "#": "var(--ink)", o: "var(--accent)" }} className="mt-0.5" />
              <div className="min-w-0">
                <p className="text-[17px] font-semibold text-ink">{p.name}</p>
                <p className="mt-2 text-pretty text-[16px] leading-relaxed text-ink-2">{p.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={renewing !== null} onClose={() => setRenewing(null)} title={`renew ${renewing ?? ""}`} wide>
        {renewing ? <Renew id={renewing} onClose={() => setRenewing(null)} /> : null}
      </Dialog>
      <Dialog open={crediting} onClose={() => setCrediting(false)} title="add credit" wide>
        {crediting ? <AddCredit onClose={() => setCrediting(false)} /> : null}
      </Dialog>
    </div>
  );
}

function Tile({ label, children, accent }: { label: string; children: ReactNode; accent?: boolean }) {
  return (
    <div className={cn("p-5 sm:p-6", accent ? "bg-tint" : "bg-paper")}>
      <h2 className={LABEL}>{label}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Done({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div role="status">
      <p className="flex items-center gap-2 text-[17px] text-ink">
        <Icon name="check" className="text-accent" /> Paid.
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{children}</p>
      <div className="mt-6 flex justify-end">
        <Button variant="accent" onClick={onClose} data-autofocus>
          done
        </Button>
      </div>
    </div>
  );
}

function Renew({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, actions } = useDash();
  const box = state.servers.find((s) => s.id === id);
  const [months, setMonths] = useState(box?.cycle ?? 1);
  const [done, setDone] = useState(false);
  if (!box) return <p className="text-[15px] text-ink">That box no longer exists.</p>;
  const plan = planOf(box);
  const total = cycleTotal(plan, months);

  if (done)
    return (
      <Done onClose={onClose}>
        {box.id} now expires on <span className="font-mono text-ink">{box.expires}</span> and renews every {box.cycle} mo.
      </Done>
    );

  return (
    <div>
      <p className="text-[15px] leading-relaxed text-ink-2">
        {box.id} expires on <span className="font-mono text-ink">{box.expires}</span>. Renewing adds the cycle from there, to{" "}
        <span className="font-mono text-ink">{addMonths(laterOf(box.expires, TODAY), months)}</span>, and makes it the
        cycle this box renews on.
      </p>
      <Segmented
        className="mt-4"
        legend="Renew for"
        value={String(months)}
        onChange={(v) => setMonths(Number(v))}
        options={CYCLES.map((c) => ({ value: String(c.months), label: c.label }))}
      />
      <div className="mt-5">
        <Pay
          amountUsd={total}
          what={`${box.id} · ${months} mo of ${plan.name}`}
          seed={`${box.id}:${months}`}
          onPaid={(method) => {
            actions.renew(box.id, months, method);
            setDone(true);
          }}
        />
      </div>
    </div>
  );
}

function AddCredit({ onClose }: { onClose: () => void }) {
  const { state, actions } = useDash();
  const [amount, setAmount] = useState(25);
  const [done, setDone] = useState(false);
  if (done) return <Done onClose={onClose}>The balance is {usd(state.balance)} now. It belongs to the credential, and nothing else.</Done>;
  return (
    <div>
      <p className="text-[15px] leading-relaxed text-ink-2">
        Credit sits on the account until you spend it. An account with no balance, no services and no open tickets is
        deleted after 24 hours.
      </p>
      <Segmented
        className="mt-4"
        legend="Add"
        value={String(amount)}
        onChange={(v) => setAmount(Number(v))}
        options={CREDIT.map((n) => ({ value: String(n), label: usd(n) }))}
      />
      <div className="mt-5">
        <Pay
          amountUsd={amount}
          what={`account credit · ${usd(amount)}`}
          seed={`credit:${amount}`}
          onPaid={(method) => {
            actions.addCredit(amount, method);
            setDone(true);
          }}
        />
      </div>
    </div>
  );
}
