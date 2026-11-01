import { Section, Wide } from "@/components/kit";
import { CanaryRecord } from "@/components/sections/CanaryRecord";
import { CanaryRules } from "@/components/sections/CanaryRules";

/*
 * The section's own motion, kept beside it rather than in globals.css: the
 * bird's notes, the pixel running between the mirrors, the missing month's
 * blink. All of it waits for prefers-reduced-motion: no-preference; without
 * it, the notes hang still in a rising line.
 */
const MOTION = `
.canary-note-2 { transform: translate(3.5px, -8px); }
.canary-note-3 { transform: translate(7px, -16px); }
@media (prefers-reduced-motion: no-preference) {
  .canary-note { animation: canary-note 3.6s ease-out infinite both; }
  .canary-note-2 { animation-delay: 1.2s; }
  .canary-note-3 { animation-delay: 2.4s; }
  .canary-travel { animation: canary-travel 2.8s ease-in-out infinite alternate; }
  .canary-blink { animation: canary-blink 2.4s steps(1) infinite; }
}
@keyframes canary-note {
  0% { opacity: 0; transform: translate(0, 0); }
  15%, 75% { opacity: 1; }
  100% { opacity: 0; transform: translate(9px, -24px); }
}
@keyframes canary-travel {
  from { transform: translateX(0); }
  to { transform: translateX(18px); }
}
@keyframes canary-blink {
  0%, 60% { opacity: 1; }
  61%, 100% { opacity: 0; }
}
`;

export function Canary() {
  return (
    <Section id="canary" aria-labelledby="canary-title">
      <style href="canary-motion" precedence="medium">
        {MOTION}
      </style>
      <Wide>
        <CanaryRecord />
        <CanaryRules className="mt-20 sm:mt-24 lg:mt-28" />
      </Wide>
    </Section>
  );
}
