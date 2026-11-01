"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/components/kit";

export type FaqItem = { q: string; a: ReactNode };

// Five 3px pixels per arm on a 4px pitch, so the plus reads as squares, not a stroke.
const ARM = [0, 4, 8, 12, 16];
const MID = 8;

/** A plus in square pixels. Open, its upright drains away from the middle out and the box lights mint. */
function PlusMinus({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      data-faq-glyph
      className={cn(
        "grid size-9 shrink-0 place-items-center border transition-colors duration-200",
        open ? "border-mint bg-mint text-ink" : "border-line-2 bg-paper text-ink group-hover:border-ink",
      )}
    >
      <svg viewBox="0 0 19 19" width={19} height={19} shapeRendering="crispEdges" fill="currentColor">
        {ARM.map((x) => (
          <rect key={`h${x}`} x={x} y={MID} width={3} height={3} />
        ))}
        {ARM.filter((y) => y !== MID).map((y) => (
          <rect
            key={`v${y}`}
            x={MID}
            y={y}
            width={3}
            height={3}
            className="transition-opacity duration-150 motion-reduce:transition-none"
            style={{ opacity: open ? 0 : 1, transitionDelay: `${(Math.abs(y - MID) / 4 - 1) * 60}ms` }}
          />
        ))}
      </svg>
    </span>
  );
}

/**
 * The questions, one open at a time. Each row is a real button that says whether
 * it's expanded; the answer below it eases open on a grid row.
 */
export function FaqList({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();

  return (
    <ul className="border-b border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        const qid = `${base}q${i}`;
        const aid = `${base}a${i}`;
        return (
          <li key={item.q} className="border-t border-line">
            <h3>
              <button
                id={qid}
                type="button"
                aria-expanded={isOpen}
                aria-controls={aid}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group grid w-full cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3 py-6 text-left focus-visible:outline-offset-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:py-7"
              >
                <span
                  aria-hidden
                  className={cn(
                    "pt-3 font-mono text-[12px] leading-none transition-colors",
                    isOpen ? "text-accent" : "text-ink-3",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="pt-1 font-display text-[20px] leading-[1.22] font-bold tracking-[-0.02em] text-balance text-ink sm:text-[22px]">
                  {item.q}
                </span>
                <PlusMinus open={isOpen} />
              </button>
            </h3>
            <div
              id={aid}
              role="region"
              aria-labelledby={qid}
              data-faq-panel
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              {/* Hidden, not just clipped, while shut: the canary link inside stays out of the tab order. */}
              <div
                className={cn(
                  "min-h-0 overflow-hidden transition-[visibility] duration-300 motion-reduce:transition-none",
                  isOpen ? "visible" : "invisible",
                )}
              >
                <p className="max-w-[62ch] pr-11 pb-8 pl-[3rem] text-[16px] leading-relaxed text-pretty text-ink-2 sm:pr-12 sm:pb-9 sm:pl-[4rem] sm:text-[17px]">
                  {item.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
