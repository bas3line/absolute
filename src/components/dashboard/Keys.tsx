"use client";

import { useId, useState, type FormEvent } from "react";
import { cn } from "@/components/kit";
import { CREDENTIAL_LENGTH, fingerprint, parsePublicKey, planOf, shortFp, usd } from "./data";
import { useDash, useLock } from "./store";
import { Button, DANGER_TEXT, Dialog, Icon, LABEL, MUTED, Meta, PageHeader, Panel, inputClass, motion } from "./ui";

export function Keys() {
  return (
    <div className={motion.rise}>
      <PageHeader
        eyebrow="Keys"
        lead="Keys, not accounts."
        trail="The credential is the account."
        intro="SSH keys go onto new boxes; on a Blackbox, yours rides the measured command line. The account itself is one 32-character credential, and this page shows everything it holds."
      />
      <div className="mt-8 grid gap-6 2xl:grid-cols-2">
        <SshKeys />
        <Account />
      </div>
      <DeleteAccount />
    </div>
  );
}

/* SSH keys ---------------------------------------------------------------- */

function SshKeys() {
  const { state, actions } = useDash();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const target = state.keys.find((k) => k.id === removing);

  return (
    <Panel title="ssh keys" status={`${state.keys.length} on this account`}>
      <ul className="divide-y divide-line">
        {state.keys.map((k) => {
          const used = state.servers.filter((s) => s.keyId === k.id);
          const bb = used.filter((s) => planOf(s).line === "blackbox").length;
          return (
            <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="text-[16px] font-medium text-ink">{k.name}</span>
                  <span className="border border-line-2 px-1 font-mono text-[11px] leading-[16px] text-ink-2">{k.type}</span>
                </p>
                <p className={cn("mt-1 truncate font-mono text-[11.5px]", MUTED)} title={k.fingerprint}>
                  {shortFp(k.fingerprint)} · added {k.added} · on {used.length} {used.length === 1 ? "box" : "boxes"}
                  {bb ? `, ${bb} measured` : ""}
                </p>
              </div>
              <Button size="sm" variant="danger" onClick={() => setRemoving(k.id)} aria-label={`Remove ssh key ${k.name}`}>
                remove
              </Button>
            </li>
          );
        })}
        {state.keys.length === 0 ? (
          <li className="px-5 py-6 text-[16px] text-ink-2">No keys. New boxes get a root password in the panel; a Blackbox needs a key.</li>
        ) : null}
      </ul>

      <div className="border-t border-line px-5 py-4">
        {adding ? (
          <AddKey onDone={() => setAdding(false)} />
        ) : (
          <Button onClick={() => setAdding(true)}>
            <Icon name="plus" /> add a key
          </Button>
        )}
      </div>

      <Dialog open={target !== undefined} onClose={() => setRemoving(null)} title={`remove "${target?.name ?? ""}"`}>
        <p className="text-[15px] leading-relaxed text-ink">
          New boxes won&rsquo;t get this key. Boxes that already have it keep it in authorized_keys until you take it out
          yourself. On a Blackbox it&rsquo;s part of the measured command line, so the box keeps it until a reinstall.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => setRemoving(null)}>keep it</Button>
          <Button
            variant="danger-solid"
            data-autofocus
            onClick={() => {
              if (target) actions.removeKey(target.id);
              setRemoving(null);
            }}
          >
            remove key
          </Button>
        </div>
      </Dialog>
    </Panel>
  );
}

function AddKey({ onDone }: { onDone: () => void }) {
  const { actions } = useDash();
  const [name, setName] = useState("");
  const [pub, setPub] = useState("");
  const [tried, setTried] = useState(false);
  const nameId = useId();
  const pubId = useId();
  const errId = useId();
  const parsed = parsePublicKey(pub);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!parsed.ok) return;
    actions.addKey(name.trim() || parsed.comment || "unnamed key", parsed.type, parsed.fingerprint);
    onDone();
  };

  return (
    <form onSubmit={submit} className={motion.fade} noValidate>
      <label htmlFor={nameId} className={LABEL}>
        name <span className="normal-case tracking-normal">(only you see it)</span>
      </label>
      <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} placeholder="laptop" className={cn(inputClass(), "mt-2 h-10")} />
      <label htmlFor={pubId} className={cn("mt-4 block", LABEL)}>
        public key
      </label>
      <textarea
        id={pubId}
        value={pub}
        onChange={(e) => setPub(e.target.value)}
        rows={3}
        spellCheck={false}
        placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA… you@laptop"
        aria-invalid={tried && !parsed.ok ? true : undefined}
        aria-describedby={errId}
        className={cn(inputClass(tried && !parsed.ok), "mt-2 resize-y py-2 leading-relaxed")}
      />
      <p id={errId} aria-live="polite" className={cn("mt-1.5 min-h-[1.2rem] font-mono text-[12px]", tried && !parsed.ok ? DANGER_TEXT : MUTED)}>
        {parsed.ok ? `${parsed.type} · ${shortFp(parsed.fingerprint)}` : tried ? parsed.error : "the .pub line. never the private key."}
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="submit" variant="accent">
          add key
        </Button>
        <Button onClick={onDone}>cancel</Button>
      </div>
    </form>
  );
}

/* The account ------------------------------------------------------------- */

/** Everything the account holds, and what it never asks for, as the privacy policy lists them. */
function Account() {
  const { state } = useDash();
  return (
    <Panel title="the account" status="3 fields of account data">
      <div className="px-5 pt-4">
        <p className={LABEL}>what it holds</p>
      </div>
      <Meta
        className="mx-5 mt-2"
        rows={[
          ["credential", `${fingerprint(state.credential ?? "")} · ${CREDENTIAL_LENGTH} random characters`],
          ["balance", usd(state.balance)],
          ["created", "a date, nothing more"],
        ]}
      />
      <div className="px-5 pt-5">
        <p className={LABEL}>never asked for, never stored</p>
        <ul className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11.5px]">
          {["email", "phone", "name", "postal address", "government ID", "visitor IP"].map((x) => (
            <li key={x} className="border border-line-2 px-1.5 leading-[20px] text-ink-2 line-through decoration-ink-3">
              {x}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-5 border-t border-line px-5 py-3.5 text-[15px] leading-relaxed text-ink-2">
        Servers add their configuration and expiry; payments add an invoice. An account with no balance, no services and no
        open tickets is deleted after 24 hours.
      </p>
    </Panel>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-labelledby="delete"
      className="mt-6 grid gap-5 border border-[#b23a2c]/35 bg-[#fdf6f5] px-5 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
    >
      <div>
        <h2 id="delete" className={cn("font-mono text-[11px] uppercase tracking-[0.14em]", DANGER_TEXT)}>
          Delete the account
        </h2>
        <p className="mt-3 max-w-[64ch] text-[16px] leading-relaxed text-ink">
          Every server is destroyed and every record naming the account is deleted.{" "}
          <span className="text-ink-2">Invoices stay, as anonymous financial records: amount, method, status, dates.</span>
        </p>
      </div>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Icon name="trash" /> delete the account
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="delete the account" tone="danger">
        <DeleteForm onClose={() => setOpen(false)} />
      </Dialog>
    </section>
  );
}

function DeleteForm({ onClose }: { onClose: () => void }) {
  const { state } = useDash();
  const lock = useLock();
  const [typed, setTyped] = useState("");
  const [tried, setTried] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const ok = typed.trim().toLowerCase() === "delete";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!ok) return;
        onClose();
        lock();
      }}
    >
      <p className="text-[17px] leading-snug text-ink">This can&rsquo;t be undone.</p>
      <p className="mt-2 text-[16px] leading-relaxed text-ink-2">
        {state.servers.length} {state.servers.length === 1 ? "server is" : "servers are"} destroyed with it, and the{" "}
        {usd(state.balance)} balance goes too. Demo: here, it just forgets this tab&rsquo;s session.
      </p>
      <label htmlFor={inputId} className={cn("mt-6 block", LABEL)}>
        type <span className="normal-case tracking-normal text-ink">delete</span> to confirm
      </label>
      <input
        id={inputId}
        data-autofocus
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={tried && !ok ? true : undefined}
        aria-describedby={hintId}
        className={cn(inputClass(tried && !ok), "mt-2 h-11")}
      />
      <p id={hintId} aria-live="polite" className={cn("mt-2 min-h-[1.2rem] font-mono text-[12px]", tried && !ok ? DANGER_TEXT : MUTED)}>
        {tried && !ok ? "Type the word delete. Nothing has changed yet." : "nothing changes until you confirm."}
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>cancel</Button>
        <Button type="submit" variant="danger-solid" aria-disabled={!ok}>
          delete everything
        </Button>
      </div>
    </form>
  );
}
