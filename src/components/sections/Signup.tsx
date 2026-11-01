import { Reveal, Section, Title, Wide } from "@/components/kit";
import { SignupTranscript } from "@/components/sections/SignupTranscript";

export function Signup() {
  return (
    <Section id="compare" aria-labelledby="compare-title">
      <Wide>
        <Reveal>
          <Title
            id="compare-title"
            kicker="Signup, side by side"
            sub="Both start from nothing. absolute generates a credential, takes the payment and has the server live in about 30 seconds. A typical cloud wants your name, phone, card and passport, then stops to check them."
          >
            A root shell, without telling anyone who you are.
          </Title>
        </Reveal>

        <SignupTranscript />

        <p className="mt-5 max-w-[120ch] font-mono text-[12px] leading-relaxed text-ink-3">
          Shown with Monero at an example rate. BTC, LTC and XMR get a fresh address per invoice; ETH, TRX, BNB, USDT
          and USDC draw from a small pool, one open invoice per address; every coin is watched on self-hosted nodes.
          Cash by mail asks for nothing more. A card goes through a card processor, which handles the card and sees
          the amount and an opaque customer record, never the plan or the server.
        </p>
      </Wide>
    </Section>
  );
}
