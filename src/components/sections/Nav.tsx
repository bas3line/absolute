"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { GhostButton, Wide, cn } from "@/components/kit";
import { brand, nav, panelDemo } from "@/lib/brand";

// Scroll state without a setState-in-effect: the bar gets its hairline once the page moves.
const onScroll = (cb: () => void) => {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
};
const isScrolled = () => window.scrollY > 12;
const notScrolled = () => false;

/**
 * The header, fixed over the page. Clear over the hero's print at the top,
 * white paper with a hairline once the page scrolls.
 */
export function Nav() {
  const scrolled = useSyncExternalStore(onScroll, isScrolled, notScrolled);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mark the section in view with brackets around its link.
  useEffect(() => {
    const ids = ["top", ...nav.map((l) => l.href.slice(1))];
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id === "top" ? null : e.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // The open menu: focus its first link; close on Escape, on a click outside, or when the viewport grows past it.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && headerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => {
      if (wide.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300",
          solid ? "border-line bg-bg/90 backdrop-blur-md" : "border-transparent bg-transparent",
        )}
      >
        <Wide className="flex h-16 items-center gap-4 lg:gap-6">
          <a href="#top" aria-label={`${brand.name}, back to top`} className="shrink-0">
            <Wordmark />
          </a>

          <nav aria-label="Primary" className="ml-auto hidden lg:flex">
            <ul className="flex items-center gap-1">
              {nav.map((l) => {
                const current = active === l.href.slice(1);
                return (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      aria-current={current ? "location" : undefined}
                      className={cn(
                        "group relative inline-flex h-8 items-center px-3 text-[14px] transition-colors hover:text-ink",
                        current ? "text-ink" : "text-ink-2",
                      )}
                    >
                      <Bracket side="l" on={current} />
                      {l.label}
                      <Bracket side="r" on={current} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {/* Lives in the menu below md, where it would crowd the bar. `!`, to beat the button's own display. */}
            <GhostButton href={panelDemo} className="h-9! whitespace-nowrap max-md:hidden!">
              <span aria-hidden className="size-[6px] bg-mint" />
              dashboard
            </GhostButton>
            <DeployButton />
            <button
              ref={buttonRef}
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label="Menu"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex h-9 items-center gap-2 border border-line-2 bg-bg px-3 font-mono text-[12px] text-ink-2 transition-colors hover:border-ink hover:text-ink lg:hidden"
            >
              <MenuGlyph open={open} />
              <span aria-hidden className="max-sm:hidden">
                {open ? "close" : "menu"}
              </span>
            </button>
          </div>
        </Wide>

        <div
          id={menuId}
          ref={panelRef}
          hidden={!open}
          className="absolute inset-x-0 top-full max-h-[calc(100svh-4rem)] overflow-y-auto border-b border-line bg-bg lg:hidden"
        >
          <Wide className="py-6">
            <nav aria-label="Menu">
              <ul className="flex flex-col">
                {nav.map((l, i) => (
                  <li key={l.href} className="border-b border-line">
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active === l.href.slice(1) ? "location" : undefined}
                      className="flex items-baseline gap-4 py-3.5 text-[22px] font-medium tracking-[-0.02em] text-ink transition-colors hover:text-accent aria-[current=location]:text-accent"
                    >
                      <span className="font-mono text-[11px] font-normal text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
              <GhostButton href={panelDemo} className="whitespace-nowrap md:hidden!">
                <span aria-hidden className="size-[6px] bg-mint" />
                dashboard demo
              </GhostButton>
              <p className="flex items-center gap-2 font-mono text-[11px] text-ink-2 md:ml-auto">
                <span aria-hidden className="size-[5px] bg-mint" />
                control panel also over Tor
              </p>
            </div>
          </Wide>
        </div>
      </header>
    </>
  );
}

/** |▪| — the absolute value of one lit pixel, set beside the word in Doto. */
function Wordmark() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex items-center gap-2.5">
        <AbsMark />
        <span className="font-dot text-[23px] leading-none font-extrabold tracking-[-0.01em] text-ink">absolute</span>
      </span>
      <span
        aria-hidden
        className="hidden border-l border-line-2 pl-3 font-mono text-[10px] leading-[1.35] text-ink-3 sm:block"
      >
        anonymous
        <br />
        compute.
      </span>
    </span>
  );
}

function AbsMark() {
  // Dotted slate bars, like the dots of the face beside it, around one lit mint pixel.
  const dots = [0, 2, 4, 6, 8, 10];
  return (
    <svg viewBox="0 0 9 11" aria-hidden className="h-[22px] w-[18px] shrink-0" shapeRendering="crispEdges">
      {dots.map((y) => (
        <rect key={`l${y}`} x="0" y={y} width="1" height="1" fill="var(--ink)" />
      ))}
      {dots.map((y) => (
        <rect key={`r${y}`} x="8" y={y} width="1" height="1" fill="var(--ink)" />
      ))}
      <rect x="2" y="3" width="5" height="5" fill="var(--ink)" />
      <rect x="3" y="4" width="3" height="3" fill="var(--mint)" />
    </svg>
  );
}

function Bracket({ side, on }: { side: "l" | "r"; on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-y-1 w-[5px] border-y transition-[opacity,border-color] duration-200 group-hover:opacity-100 group-focus-visible:opacity-100",
        side === "l" ? "left-0 border-l" : "right-0 border-r",
        on ? "border-ink opacity-100" : "border-ink-3 opacity-0",
      )}
    />
  );
}

function DeployButton() {
  return (
    <a
      href="#blackbox"
      className="notch inline-flex h-9 items-center gap-2 bg-mint pr-5 pl-3.5 text-[13px] font-medium whitespace-nowrap text-ink transition-colors [--notch:8px] hover:bg-mint-hi"
    >
      Deploy
      <span aria-hidden>→</span>
    </a>
  );
}

function MenuGlyph({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden className="size-2.5" shapeRendering="crispEdges" fill="currentColor">
      {open ? (
        <>
          <rect x="0" y="0" width="2" height="2" />
          <rect x="2" y="2" width="2" height="2" />
          <rect x="4" y="4" width="2" height="2" />
          <rect x="6" y="6" width="2" height="2" />
          <rect x="8" y="8" width="2" height="2" />
          <rect x="8" y="0" width="2" height="2" />
          <rect x="6" y="2" width="2" height="2" />
          <rect x="2" y="6" width="2" height="2" />
          <rect x="0" y="8" width="2" height="2" />
        </>
      ) : (
        <>
          <rect x="0" y="1" width="10" height="1.5" />
          <rect x="0" y="4.25" width="10" height="1.5" />
          <rect x="0" y="7.5" width="10" height="1.5" />
        </>
      )}
    </svg>
  );
}
