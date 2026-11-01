import { CtaButton, Kicker, Reveal, Section, Wide } from "@/components/kit";
import { ClosingCommand } from "@/components/sections/ClosingCommand";
import { ClosingRack } from "@/components/sections/ClosingRack";
import { blackbox, fmt } from "@/lib/catalog";

/**
 * The end of the page, on a night band: one sentence in lime, one button, and the
 * first-boot check a Blackbox asks for. On wide screens, the rack it lands in.
 */
export function Closing() {
  return (
    <Section id="deploy" tone="night" aria-labelledby="deploy-title" className="overflow-hidden">
      <Wide className="grid grid-cols-[minmax(0,1fr)] items-center gap-16 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:gap-12">
        <div className="min-w-0">
          <Kicker tone="night" pixel="lime">
            Deploy
          </Kicker>
          <h2
            id="deploy-title"
            className="mt-6 font-display text-[clamp(2.75rem,6.2vw,5.75rem)] leading-[0.94] font-extrabold tracking-[-0.045em] text-balance text-lime [font-variation-settings:'opsz'_96]"
          >
            Your server is up before anyone asks who you are.
          </h2>
          <p className="mt-6 max-w-[34rem] text-[18px] leading-relaxed text-pretty text-white/72 sm:text-[20px]">
            One credential, no name to give.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            <CtaButton href="#blackbox" size="lg" tone="lime">
              Deploy a Blackbox
            </CtaButton>
            <p className="font-mono text-[12px] leading-relaxed text-white/72">
              from {fmt(blackbox[0].usd)}/mo
              <span aria-hidden className="mx-2 text-white/40">
                ·
              </span>
              crypto, cash or card
            </p>
          </div>
          <ClosingCommand className="mt-12 sm:mt-14" />
        </div>

        <Reveal className="hidden xl:block">
          <ClosingRack />
        </Reveal>
      </Wide>
    </Section>
  );
}
