import type { ReactNode } from "react";
import { blackboxFeatures } from "@/lib/catalog";
import { cx } from "@/components/sections/BlackboxArt";

type Feature = (typeof blackboxFeatures)[number];

/**
 * Every address on this page is from a documentation range (203.0.113.0/24,
 * 2001:db8::/32), whatever sample the catalogue carries.
 */
function proofOut(f: Feature) {
  return f.id === "v6" ? f.out.replace(/^\S+/, "2001:db8:0:149::/64") : f.out;
}

/**
 * A command line that wraps only between words: each word is kept whole, so a
 * flag never splits at its own hyphen ("--initrd") and a path never at a dash.
 */
function Words({ text }: { text: string }) {
  // Each output line is its own block; inside a line, words break only at spaces.
  // A leading "$" is the prompt, lit mint.
  return (
    <>
      {text.split("\n").map((line, j) => (
        <span key={j} className="block">
          {line.split(/( +)/).map((part, i) =>
            part.trim() ? (
              <span key={i} className={cx("whitespace-nowrap", i === 0 && part === "$" && "text-mint")}>
                {part}
              </span>
            ) : (
              part
            ),
          )}
        </span>
      ))}
    </>
  );
}

/** The terminal proof under a guarantee: the command in mint-pale, its output in white. */
function Proof({ cmd, out }: { cmd: string; out: string }) {
  return (
    <pre className="overflow-x-auto border border-night-line bg-night px-3.5 py-3 font-mono text-[13px] leading-[1.65] whitespace-pre-wrap">
      {cmd ? (
        <span className="block text-mint-pale">
          <Words text={cmd} />
        </span>
      ) : null}
      {out ? (
        <span className="block text-white/80">
          <Words text={out} />
        </span>
      ) : null}
    </pre>
  );
}

/** Three steps joined by arrows, for the guarantees that are a flow rather than a command. */
function Flow({ steps, note }: { steps: string[]; note?: string }) {
  return (
    <div className="border border-night-line bg-night px-3.5 py-3 font-mono text-[13px] leading-[1.65]">
      <ol className="flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2.5 text-white/85">
            <span aria-hidden className={cx("size-[7px] shrink-0", i === steps.length - 1 ? "bg-lime" : "bg-peri")} />
            {s}
          </li>
        ))}
      </ol>
      {note ? <p className="mt-2 text-[12px] text-white/65">{note}</p> : null}
    </div>
  );
}

// The two guarantees with no command of their own get a flow drawn from the same text.
const EXTRA: Partial<Record<Feature["id"], ReactNode>> = {
  byoip: (
    <Flow
      steps={["AS64500 · 198.51.100.0/24", "your BGP session, our transit", "announced from your Blackbox"]}
      note="example ASN and prefix"
    />
  ),
  abuse: <Flow steps={["a report arrives", "a person reads it", "you hear first"]} />,
};

/**
 * The eight Blackbox guarantees, in the catalogue's order: a numbered grid of
 * slate panels with hairline seams, each with its proof at the foot.
 */
export function BlackboxGuarantees() {
  return (
    <ol className="grid gap-px border border-night-line bg-night-line md:grid-cols-2 xl:grid-cols-4">
      {blackboxFeatures.map((f, i) => {
        const out = proofOut(f);
        const proof = f.cmd || out ? <Proof cmd={f.cmd} out={out} /> : (EXTRA[f.id] ?? null);
        return (
          <li key={f.id} className="flex flex-col bg-night-2 px-6 pt-6 pb-7 xl:px-7">
            <span className="flex items-center justify-between gap-4">
              <span className="font-dot text-[44px] leading-[0.8] font-extrabold text-mint">
                <span className="sr-only">Guarantee </span>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span aria-hidden className="h-px flex-1 bg-night-line" />
              <span aria-hidden className="size-[7px] bg-mint" />
            </span>
            <h4 className="mt-7 font-display text-[23px] leading-[1.12] font-bold tracking-[-0.025em] text-balance text-white">
              {f.title}
            </h4>
            <p className="mt-3 text-[16px] leading-[1.55] text-pretty text-white/72">{f.body}</p>
            {proof ? <div className="mt-auto pt-6">{proof}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
