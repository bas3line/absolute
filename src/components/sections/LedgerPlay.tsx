"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cn, useInView } from "@/components/kit";

const MOTION_OK = "(prefers-reduced-motion: no-preference)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MOTION_OK);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const canMove = () => window.matchMedia(MOTION_OK).matches;
// The server, and the client while it hydrates, render the finished table.
const cannotMove = () => false;

/**
 * Plays the ledger's one sweep, by state only: the markup inside is the
 * finished table, so without script (Tor Browser on Safest) or with reduced
 * motion every square is already where it ends up. With script it reads
 * "static", then "armed" (squares cleared, read head parked) until the matrix
 * scrolls in, then "play" (the head crosses once and the squares light behind it).
 */
export function LedgerPlay({ children, className }: { children: ReactNode; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>("0px 0px -25% 0px");
  const motion = useSyncExternalStore(subscribe, canMove, cannotMove);
  const state = !motion ? "static" : inView ? "play" : "armed";
  return (
    <div ref={ref} data-state={state} className={cn("group", className)}>
      {children}
    </div>
  );
}
