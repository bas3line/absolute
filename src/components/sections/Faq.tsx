import type { ReactNode } from "react";
import { Kicker, Reveal, Section, Title, Wide } from "@/components/kit";
import { FaqList, type FaqItem } from "@/components/sections/FaqList";
import { brand } from "@/lib/brand";
import { blackbox, blackboxTerms, coins, fmt, locations, systems, type Line } from "@/lib/catalog";

function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono text-[0.9em] text-ink">{children}</code>;
}

const LINK =
  "font-medium text-accent underline decoration-accent-mid underline-offset-4 transition-colors hover:decoration-accent";

/** The cheapest plan on a line, and how many locations sell it. */
function line(l: Line) {
  const plans = locations.flatMap((loc) => loc.plans.filter((p) => p.line === l));
  return {
    from: fmt(Math.min(...plans.map((p) => p.usd))),
    at: locations.filter((loc) => loc.plans.some((p) => p.line === l)).length,
  };
}
const VPS = line("vps");
const VDS = line("vds");
const CORE = blackbox[0];
const tb = (transfer: string) => transfer.split(" / ")[0];
const tier = (name: string) => name.replace("Blackbox ", "");

/** "Debian 12 and 13, Ubuntu 24.04 LTS and 26.04 LTS, …". */
const OSES = systems.map((s) => `${s.name} ${s.versions.join(" and ")}`).join(", ");

const QA: FaqItem[] = [
  {
    q: "What does “anonymous” mean here?",
    a: (
      <>
        You set up a server without handing over a name, an email address or a phone number, and there is no KYC: a
        randomly generated 32-character credential is the whole account. That covers what we learn. What your server
        gives away is up to you, because privacy stays a shared responsibility: use key-based SSH and strong passwords,
        and don&rsquo;t run scripts from sources you don&rsquo;t know. The panel has an onion address if you&rsquo;d
        rather it never saw your IP either.
      </>
    ),
  },
  {
    q: "Do you keep logs?",
    a: (
      <>
        No traffic logs: no packet inspection, no flow logs, no activity monitoring, and the web server&rsquo;s access
        log goes to <Code>/dev/null</Code>. What is stored is what an account needs to work: the credential, your
        balance, invoices (amount, method, time), the address each crypto payment was sent to, your servers&rsquo;
        configuration (hostname, IP, OS, specs, expiry) and your support tickets. An account with a zero balance, no
        services and no open tickets is deleted after 24 hours. The{" "}
        <a href="#canary" className={LINK}>
          canary
        </a>{" "}
        says whether anyone has asked for any of it.
      </>
    ),
  },
  {
    q: "How do I pay, and how fast is the server up?",
    a: (
      <>
        Crypto ({coins.join(", ")}), watched on self-hosted nodes, with a fresh address per invoice on BTC, LTC and
        XMR. Cash by mail, with the credential in the envelope rather than your name. Or a card, through a processor
        that sees an amount and an opaque customer record, never what it was for; its card form does see your IP, as
        any processor&rsquo;s does. Once the payment is confirmed the server is live in about 30 seconds, credentials in
        your panel. Nobody reviews you first.
      </>
    ),
  },
  {
    q: "Blackbox, VPS or VDS?",
    a: (
      <>
        A VPS shares its host&rsquo;s resources and is the budget line, from {VPS.from}/mo in {VPS.at} locations. A VDS
        keeps its cores to itself, from {VDS.from}/mo in {VDS.at} locations. Both are unmetered with a dedicated IPv4. Blackbox is
        the zero-knowledge VPS: AMD SEV-SNP encrypted RAM, a LUKS2 disk only you can unlock, measured boot and no guest
        agent, in Montreal, from {fmt(CORE.usd)}/mo with {tb(CORE.transfer)} of transfer per 31 days on {tier(CORE.name)}.
        If the host should be unable to read the machine, it&rsquo;s Blackbox.
      </>
    ),
  },
  {
    q: "Why is Blackbox only in Montreal?",
    a: (
      <>
        Because it needs the whole stack, down to the CPU, the firmware it boots and the network that routes your
        addresses. That only exists on the owned hardware in a Montreal colo, which is also where LUKS2, bring-your-own
        IP and ASN, and reverse DNS you set yourself live. The other {locations.length - 1} locations sell the standard
        VPS and VDS lines.
      </>
    ),
  },
  {
    q: "Can I reset my root password on a Blackbox?",
    a: (
      <>
        No. There is no guest agent inside a Blackbox and no virtio port for one, so the host has no way to run anything
        in it. That is the point, and why there is no reset-password button. The disk is the same: you type the LUKS2
        passphrase yourself, over SSH, after <Code>blackbox-verify</Code> prints <Code>PASS</Code>. Lose it and nobody
        can recover the data, us included. Keep it somewhere that isn&rsquo;t the server.
      </>
    ),
  },
  {
    q: "What happens past the Blackbox transfer allowance?",
    a: (
      <>
        {tier(CORE.name)} includes {tb(CORE.transfer)} per 31 days and each tier doubles it (
        {blackbox
          .slice(1)
          .map((b) => `${tier(b.name)} ${tb(b.transfer)}`)
          .join(", ")}
        ). {blackboxTerms.transfer} The standard VPS and VDS lines are unmetered.
      </>
    ),
  },
  {
    q: "Can I stop when I’m done?",
    a: (
      <>
        Yes. The minimum is seven days, prorated; after that, renew on whatever cycle you set, or delete the server the
        moment the job is done. Deleting the account destroys every server and every record naming it; invoices stay as
        anonymous financial records (amount, method, status, dates).
      </>
    ),
  },
  {
    q: "Which operating systems can I run?",
    a: (
      <>
        {OSES}. Full root or RDP from the first minute, and reinstall to another from the panel whenever you like. A
        Blackbox also boots any ISO, your own kernel as a UKI, or a disk image you built and encrypted at home.
      </>
    ),
  },
  {
    q: "Who reads abuse reports?",
    a: (
      <>
        On a Blackbox, a person, every time. Run a Tor relay, a VPN exit or a mail server and reports will come, most
        of them automated and many of them wrong. A human reads each one and talks to you before anything happens to
        the machine. No script suspends you because a blocklist said so.
      </>
    ),
  },
];

// Without script the buttons can't open anything, so every answer prints open and the toggles go.
const NOSCRIPT =
  "[data-faq-panel]{grid-template-rows:1fr!important}[data-faq-panel]>div{visibility:visible!important}[data-faq-glyph]{display:none!important}";

/** A 7px screw head: a ring with a slot through it, for the corners of a panel. */
function Screw({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 7 7" width={7} height={7} aria-hidden className={`absolute text-ink-4 ${className}`}>
      <circle cx={3.5} cy={3.5} r={3} fill="none" stroke="currentColor" />
      <path d="M1.4 5.6 5.6 1.4" stroke="currentColor" />
    </svg>
  );
}

/** The faceplate under the title: where to ask anything the list doesn't cover. */
function AskPanel({ className }: { className?: string }) {
  return (
    <div className={`relative max-w-[26rem] border border-line bg-paper px-6 pt-5 pb-6 ${className ?? ""}`}>
      <Screw className="top-2 left-2" />
      <Screw className="top-2 right-2" />
      <Screw className="bottom-2 left-2" />
      <Screw className="right-2 bottom-2" />
      <div className="flex items-center justify-between gap-4">
        <Kicker pixel="peri">Anything else</Kicker>
        <span aria-hidden className="font-mono text-[11px] text-ink-3">
          U1
        </span>
      </div>
      <p className="mt-4 text-[16px] leading-relaxed text-pretty text-ink-2">
        Open a ticket from the control panel, over its onion address if you like. It doesn&rsquo;t ask who&rsquo;s
        asking either.
      </p>
      <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 border-t border-line pt-4 font-mono text-[13px]">
        <dt className="text-ink-3">panel</dt>
        <dd className="truncate text-ink">{brand.onion}</dd>
        <dt className="text-ink-3">asker</dt>
        <dd className="text-ink">one 32-character credential</dd>
      </dl>
    </div>
  );
}

export function Faq() {
  return (
    <Section id="faq" aria-labelledby="faq-title">
      <noscript>
        <style>{NOSCRIPT}</style>
      </noscript>
      <Wide className="grid gap-y-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16 xl:gap-x-24">
        {/* On phones the title, the list and the panel stack in that order; on desktop the title and panel stick. */}
        <div className="contents lg:sticky lg:top-28 lg:block lg:self-start">
          <Title id="faq-title" kicker="Questions" sub="What people ask before they pay. None of it needs your name.">
            We answer the question, not the person.
          </Title>
          <AskPanel className="order-3 lg:mt-12" />
        </div>

        <Reveal className="order-2">
          <FaqList items={QA} />
        </Reveal>
      </Wide>
    </Section>
  );
}
