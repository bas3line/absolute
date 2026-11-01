import type { ReactNode } from "react";
import { Reveal, Section, Tag, Title, Wide } from "@/components/kit";
import {
  FEATURES_CSS,
  IdentityFace,
  IPv4Face,
  LiveFace,
  LogFace,
  RenewFace,
  RootFace,
  Screw,
} from "@/components/sections/FeaturesFaces";
import { blackbox, fmt, fromUsd, locations, promises, systems } from "@/lib/catalog";

// A server component: the only client parts are the kit's components (Reveal,
// Section...), and all the motion is CSS. Only components, never plain helpers
// like cn, can be imported from the client kit.

/*
 * The six platform promises as six rack modules, each with its unit number, a
 * screw in every ear, and a face that draws the promise working. Titles and
 * bodies come straight from the catalogue; the faces and spec lines are ours.
 * A bento, not a row of equal boxes: on a wide screen the six sit 4/2, 2/4, 3/3
 * on a six-column grid; on a tablet the wide two take the full width; on a
 * phone it's one column.
 */

type PromiseId = (typeof promises)[number]["id"];

type Module = {
  tag: string;
  spec: string[];
  face: ReactNode;
  span: string;
};

// Blackbox is the one line with a transfer allowance: "4 TB–32 TB / 31 days".
const allowance = `${blackbox[0].transfer.split(" / ")[0]}–${blackbox[blackbox.length - 1].transfer}`;

const MODULES: Record<PromiseId, Module> = {
  identity: {
    tag: "identity",
    spec: ["account: 32-char credential", "email: none", "phone: none", "kyc: none"],
    face: <IdentityFace />,
    span: "md:col-span-2 xl:col-span-4",
  },
  fast: {
    tag: "30 s",
    spec: ["live: about 30 s after payment", "review: none"],
    face: <LiveFace />,
    span: "xl:col-span-2",
  },
  root: {
    tag: "root",
    spec: ["access: root or RDP", `systems: ${systems.length}`, "reinstall: from the panel"],
    face: <RootFace />,
    span: "xl:col-span-2",
  },
  renew: {
    tag: "renewal",
    spec: ["minimum: 7 days, prorated", "cycle: yours to set", "account with no balance or services: deleted after 24 h"],
    face: <RenewFace />,
    span: "md:col-span-2 xl:col-span-4",
  },
  logs: {
    tag: "logs",
    spec: ["web access logs: /dev/null", "packet inspection: none", "flow logs: none"],
    face: <LogFace />,
    span: "xl:col-span-3",
  },
  ipv4: {
    tag: "ipv4",
    spec: ["ipv4: dedicated", "standard line: unmetered", `blackbox: ${allowance}`],
    face: <IPv4Face />,
    span: "xl:col-span-3",
  },
};

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const say = (n: number) => WORDS[n] ?? String(n);

// No two screws are ever turned alike.
const turn = (unit: number, corner: number) => (unit * 53 + corner * 71) % 180;

/** The mono spec line in a module's lower ear, parts parted by periwinkle pixels. */
function Spec({ parts }: { parts: string[] }) {
  return (
    <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11.5px] leading-snug text-ink-3">
      {parts.map((part, i) => {
        const cut = part.indexOf(": ");
        return (
          <span key={part} className="flex min-w-0 items-center gap-x-2.5">
            {i > 0 ? (
              <>
                <span aria-hidden className="size-[4px] shrink-0 bg-peri" />
                <span className="sr-only">, </span>
              </>
            ) : null}
            {cut > 0 ? (
              <span className="min-w-0 break-words">
                {part.slice(0, cut + 1)} <span className="text-ink-2">{part.slice(cut + 2)}</span>
              </span>
            ) : (
              <span className="text-ink-2">{part}</span>
            )}
          </span>
        );
      })}
    </p>
  );
}

function RackModule({ title, body, module: m, unit }: { title: string; body: string; module: Module; unit: number }) {
  return (
    <article className="flex h-full flex-col border border-line-2 bg-paper">
      {/* Upper ear: screws, unit number, status LED, vents and the module's tag. */}
      <div aria-hidden className="flex h-10 shrink-0 items-center gap-2.5 px-3">
        <Screw turn={turn(unit, 0)} />
        <span className="font-mono text-[11px] tracking-[0.14em] text-ink-3">U{unit}</span>
        <span className="ft-led size-[6px] bg-mint" style={{ animationDelay: `${unit * -470}ms` }} />
        <span className="ml-auto flex gap-[3px]">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="h-3 w-[3px] bg-line" />
          ))}
        </span>
        <Tag className="tracking-[0.12em] uppercase">{m.tag}</Tag>
        <Screw turn={turn(unit, 1)} />
      </div>
      <div className="px-3">{m.face}</div>
      <div className="px-4 pt-6 pb-7 sm:px-5">
        <h3 className="font-display text-[26px] leading-[1.08] font-bold tracking-[-0.035em] text-balance text-ink">
          {title}
        </h3>
        <p className="mt-3 max-w-[54ch] text-[16.5px] leading-[1.55] text-pretty text-ink-2">{body}</p>
      </div>
      {/* Lower ear: the spec, between two more screws. */}
      <div className="mt-auto flex min-h-10 items-center gap-2.5 border-t border-line px-3 py-2">
        <Screw turn={turn(unit, 2)} />
        <Spec parts={m.spec} />
        <Screw turn={turn(unit, 3)} />
      </div>
    </article>
  );
}

export function Features() {
  const six = say(promises.length);
  return (
    <Section id="servers" aria-labelledby="servers-title" data-ft="">
      <style href="features-motion" precedence="default">
        {FEATURES_CSS}
      </style>
      <Wide>
        <Title
          id="servers-title"
          kicker="Servers"
          sub={
            <>
              {six.charAt(0).toUpperCase() + six.slice(1)} things every plan includes, in all {say(locations.length)}{" "}
              locations. Plans start at {fmt(fromUsd)} a month.
            </>
          }
        >
          Built so there is nothing to find.
        </Title>

        <ul className="mt-14 grid grid-cols-1 gap-4 sm:mt-16 md:grid-cols-2 lg:mt-20 lg:gap-5 xl:grid-cols-6">
          {promises.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 2) * 90} className={MODULES[p.id].span}>
              <RackModule title={p.title} body={p.body} module={MODULES[p.id]} unit={i + 1} />
            </Reveal>
          ))}
        </ul>
      </Wide>
    </Section>
  );
}
