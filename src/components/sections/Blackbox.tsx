import type { ReactNode } from "react";
import { CtaButton, Kicker, Section, Title, Wide } from "@/components/kit";
import { blackbox, blackboxTerms, fmt } from "@/lib/catalog";
import { BlackboxChain } from "@/components/sections/BlackboxChain";
import { BlackboxGuarantees } from "@/components/sections/BlackboxGuarantees";
import { BlackboxTerminal } from "@/components/sections/BlackboxTerminal";
import { BlackboxTiers } from "@/components/sections/BlackboxTiers";

// A server component: the terminal and the chain are the only client parts.
// The kit's `cn` is a client function, so nothing here calls it.

const FROM = fmt(Math.min(...blackbox.map((p) => p.usd)));

/** The spec plate under the headline: what is different, in one word each. */
const PLATE = [
  { label: "Memory", value: "SEV-SNP" },
  { label: "Disk", value: "LUKS2" },
  { label: "Boot", value: "Measured" },
  { label: "Guest agent", value: "None" },
] as const;

/** What encryption does not cover, from the measured-boot guide's own list. */
const LIMITS = [
  {
    title: "The console",
    body: "Serial and VNC pass through the host. Watch the boot there; never type a secret into it.",
  },
  {
    title: "Metadata",
    body: "Traffic volume, packet headers, CPU use and the fact the machine exists are visible, as at any transit provider.",
  },
  {
    title: "The first boot",
    body: "The root filesystem starts as a stock image the host could read. Encrypt it at first boot, or write your own pre-encrypted disk.",
  },
] as const;

/** A part of the band: a kicker, a display heading one size under the section title, a sub. */
function Part({
  id,
  kicker,
  pixel = "mint",
  title,
  sub,
}: {
  id: string;
  kicker: ReactNode;
  pixel?: "mint" | "lime" | "pink" | "peri";
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="max-w-[54rem]">
      <Kicker tone="night" pixel={pixel}>
        {kicker}
      </Kicker>
      <h3
        id={id}
        className="mt-4 font-display text-[clamp(1.875rem,3.6vw,3.25rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance text-mint-pale [font-variation-settings:'opsz'_96]"
      >
        {title}
      </h3>
      {sub ? <p className="mt-4 max-w-[46rem] text-[17px] leading-relaxed text-pretty text-white/72">{sub}</p> : null}
    </div>
  );
}

/**
 * Blackbox, the flagship: a slate band right after the hero. The claim and a
 * live unlock session, the measured-boot chain, the eight guarantees, the four
 * tiers racked in Montreal, and what none of it protects.
 */
export function Blackbox() {
  return (
    <Section id="blackbox" tone="night" aria-labelledby="blackbox-title">
      <Wide>
        {/* Side by side only from xl: narrower, the headline column would wrap the plate. */}
        <div className="grid gap-y-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,44%)] xl:items-center xl:gap-x-16">
          <div>
            <Title
              id="blackbox-title"
              tone="night"
              kicker="Blackbox · zero-knowledge VPS"
              sub="Memory encrypted by the CPU with AMD SEV-SNP, a LUKS2 disk behind a passphrase only you type, no guest agent, and a boot chain the CPU measures and signs. No logs and no KYC, at a price you would pay for an ordinary VPS."
            >
              {/* One sentence a line: balanced wrapping would split "We" from its sentence. */}
              <span className="block">We host it.</span> <span className="block">We cannot read it.</span>
            </Title>

            <div className="mt-9 flex flex-wrap items-center gap-3 sm:gap-4">
              <CtaButton href="#blackbox-tiers" tone="lime" size="lg">
                Pick a Blackbox, from {FROM}/mo
              </CtaButton>
              <a
                href="#blackbox-boot"
                className="inline-flex h-[52px] items-center gap-2.5 border border-night-line px-5 font-mono text-[13px] text-white/85 transition-colors hover:border-mint-pale hover:text-mint-pale"
              >
                How you verify it
                <span aria-hidden>↓</span>
              </a>
            </div>

            <dl className="mt-10 grid max-w-[40rem] grid-cols-2 gap-px border border-night-line bg-night-line sm:grid-cols-4">
              {PLATE.map((p) => (
                <div key={p.label} className="bg-night px-4 py-3.5">
                  <dt className="font-mono text-[11px] tracking-[0.16em] text-white/70 uppercase">{p.label}</dt>
                  <dd className="mt-1 font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-white">
                    {p.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <BlackboxTerminal className="xl:max-w-none lg:max-w-[760px]" />
        </div>

        <div id="blackbox-boot" className="mt-24 scroll-mt-24 lg:mt-32">
          <Part
            id="blackbox-boot-title"
            kicker="Measured boot"
            pixel="peri"
            title="Don't trust it. Verify it."
            sub="With measured boot, a Blackbox never boots from its own disk. Firmware, kernel, initramfs and command line go into one launch measurement the CPU signs, and you check it from your own computer before the passphrase leaves your keyboard."
          />
          <div className="mt-10 lg:mt-12">
            <BlackboxChain />
          </div>
        </div>

        <div className="mt-24 lg:mt-32">
          <Part
            id="blackbox-guarantees-title"
            kicker="Eight guarantees"
            title="Eight things your current VPS does not do."
            sub="Every one of them is on by default or one click away, on every size."
          />
          <div className="mt-10 lg:mt-12">
            <BlackboxGuarantees />
          </div>
        </div>

        <div id="blackbox-tiers" className="mt-24 scroll-mt-24 lg:mt-32">
          <Part
            id="blackbox-tiers-title"
            kicker="Four sizes · Montreal"
            pixel="lime"
            title="Same silicon at every size."
            sub={blackboxTerms.sameEverywhere}
          />
          <div className="mt-10 lg:mt-12">
            <BlackboxTiers terms={[blackboxTerms.minimum, blackboxTerms.transfer]} />
          </div>
        </div>

        <div className="mt-24 border-t border-night-line pt-12 lg:mt-32 lg:pt-14">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] xl:gap-14">
            <div>
              <Kicker tone="night" pixel="pink">
                What it does not protect
              </Kicker>
              <h3 className="mt-4 font-display text-[clamp(1.75rem,2.6vw,2.25rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance text-mint-pale">
                The honest limits.
              </h3>
              <p className="mt-3 max-w-[30rem] text-[16px] leading-relaxed text-pretty text-white/72">
                Encrypted memory hides what is on the machine. It is not anonymity, and it does not hide that the
                machine exists.
              </p>
            </div>
            <ul className="grid gap-px border border-night-line bg-night-line md:grid-cols-3">
              {LIMITS.map((l) => (
                <li key={l.title} className="bg-night-2 px-5 py-5 sm:px-6">
                  <p className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.16em] text-pink-soft uppercase">
                    <span aria-hidden className="size-[7px] bg-pink" />
                    {l.title}
                  </p>
                  <p className="mt-3 text-[16px] leading-[1.55] text-pretty text-white/80">{l.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-14 max-w-[64rem] font-display text-[clamp(2rem,4.4vw,4rem)] leading-[1] font-extrabold tracking-[-0.04em] text-balance text-white [font-variation-settings:'opsz'_96]">
            <span className="block">We can stop or delete the machine.</span>{" "}
            <span className="block text-mint-pale">We cannot read it.</span>
          </p>
        </div>
      </Wide>
    </Section>
  );
}
