"use client";

import { useEffect, useRef, useState } from "react";
import { cn, copyText } from "@/components/kit";
import { blackbox } from "@/lib/catalog";

// A documentation-range address and the release the measured-boot guide verifies against.
const HOST = "203.0.113.7";
const RELEASE = "./2026.09";
const VCPUS = blackbox[0].cores;
const COMMAND = `python3 blackbox-verify --host ${HOST} --release ${RELEASE} --vcpus ${VCPUS}`;

/**
 * A Blackbox's first boot, on a slate faceplate: verify the machine from your own
 * computer, then unlock it. The copy button takes the verify command.
 */
export function ClosingCommand({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    if (!(await copyText(COMMAND))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={cn("max-w-[37rem] border border-night-line bg-night-2", className)}>
      <div className="flex h-11 items-center justify-between gap-4 border-b border-night-line pr-1.5 pl-4">
        <span className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.2em] text-mint-pale/80 uppercase">
          <span aria-hidden className="size-[7px] bg-mint" />
          first boot
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Command copied" : `Copy command: ${COMMAND}`}
          className={cn(
            "flex h-8 items-center gap-2 border px-3 font-mono text-[12px] transition-colors focus-visible:outline-mint-pale",
            copied
              ? "border-mint bg-mint text-ink"
              : "border-night-line text-mint-pale hover:border-mint-pale hover:bg-night-3",
          )}
        >
          <span aria-hidden className={cn("size-[5px]", copied ? "bg-ink" : "bg-mint-pale/70")} />
          {copied ? "copied" : "copy"}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? "Command copied to clipboard." : ""}
        </span>
      </div>
      {/* The verify command is broken over three lines with shell continuations, so it reads whole on a phone. */}
      <div className="overflow-x-auto px-4 py-5 font-mono text-[13px] leading-[1.9] [scrollbar-width:none] sm:px-5 sm:text-[15px]">
        <p className="text-white/70"># on your own machine, before the passphrase</p>
        <p className="whitespace-pre text-white">
          <span aria-hidden className="text-mint select-none">
            ${" "}
          </span>
          python3 <span className="text-lime">blackbox-verify</span> \
        </p>
        <p className="whitespace-pre text-white">
          {"    "}--host {HOST} \
        </p>
        <p className="whitespace-pre text-white">
          {"    "}--release {RELEASE} --vcpus {VCPUS}
        </p>
        <p className="text-mint">PASS</p>
        <p className="whitespace-nowrap text-white">
          <span aria-hidden className="text-mint select-none">
            ${" "}
          </span>
          ssh root@{HOST} unlock
          <span
            aria-hidden
            className="animate-caret ml-1.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] bg-mint-pale"
          />
        </p>
      </div>
    </div>
  );
}
