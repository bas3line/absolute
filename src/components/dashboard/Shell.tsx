"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/kit";
import { brand } from "@/lib/brand";
import { CREDENTIAL_LENGTH, fingerprint } from "./data";
import { Wordmark } from "./Gate";
import { NAV } from "./nav";
import { Palette } from "./Palette";
import { useDash, useLock, type Toast } from "./store";
import { Button, CopyButton, Icon, LABEL, Led, MUTED, motion, useNativeModal } from "./ui";

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function Shell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Arriving from the gate: put focus at the top of the content, not on <body>.
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={cn("min-h-dvh bg-bg lg:grid lg:grid-cols-[248px_minmax(0,1fr)]", motion.fade)}>
      <a
        href="#main"
        className="sr-only z-[60] bg-marker px-3 py-2 font-mono text-[12px] text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-bg lg:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-line px-5">
          <Link href="/dashboard" aria-label="absolute, overview" className="-m-1 p-1">
            <Wordmark size="sm" />
          </Link>
        </div>
        <nav aria-label="Panel" className="flex-1 overflow-y-auto px-3 py-4">
          <NavList />
        </nav>
        <SideFoot />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <TopBar onMenu={() => setDrawer(true)} onPalette={() => setPalette(true)} drawerOpen={drawer} />
        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-16 pt-8 outline-none sm:px-6 lg:px-10 lg:pt-10"
        >
          {children}
        </main>
        <footer className={cn("border-t border-line px-4 py-3 font-mono text-[11px] sm:px-6 lg:px-10", MUTED)}>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>demo: this panel runs in the tab&rsquo;s memory</span>
            <span>web access logs: /dev/null</span>
            <span className="hidden sm:inline">canary signed {brand.canaryUpdated} · verify it with gpg --verify</span>
          </p>
        </footer>
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} />
      <Palette open={palette} onClose={() => setPalette(false)} />
      <Toasts />
    </div>
  );
}

/* Navigation ---------------------------------------------------------------- */

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return <NavItems active={usePathname()} onNavigate={onNavigate} />;
}

function NavItems({ active, onNavigate }: { active: string | null; onNavigate?: () => void }) {
  const { state } = useDash();
  const counts: Record<string, number | undefined> = {
    "/dashboard/servers": state.servers.length,
    "/dashboard/activity": state.log.length,
  };
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const on = active !== null && (n.href === "/dashboard" ? active === n.href : active.startsWith(n.href));
        const count = counts[n.href];
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              onClick={onNavigate}
              aria-current={on ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-3 px-3 text-[14.5px] transition-colors focus-visible:-outline-offset-2",
                on ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-bg-2 hover:text-ink",
              )}
            >
              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[2px]", on ? "bg-accent" : "bg-transparent")} />
              <Icon name={n.icon} />
              <span className="flex-1">{n.label}</span>
              {count !== undefined ? (
                <span className={cn("font-mono text-[11px] tabular-nums", on ? "text-accent" : MUTED)}>
                  <span className="sr-only">(</span>
                  {count}
                  <span className="sr-only">)</span>
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SideFoot() {
  const { state } = useDash();
  const up = state.servers.filter((s) => s.status === "running").length;
  return (
    <div className="shrink-0 border-t border-line px-5 py-4 font-mono text-[11px]">
      <p className={LABEL}>fleet</p>
      <div className="mt-2.5 flex items-center gap-1.5" aria-hidden>
        {state.servers.map((s) => (
          <Led key={s.id} status={s.status} size={9} />
        ))}
      </div>
      <p className={cn("mt-2", MUTED)}>
        {up} of {state.servers.length} running
      </p>
      <p className="mt-4 flex items-center gap-2 text-ink-2">
        <span aria-hidden className="size-[6px] bg-accent" />
        canary signed {brand.canaryUpdated}
      </p>
      <p className={cn("mt-1.5 truncate", MUTED)}>
        via {state.net === "onion" ? brand.onion : "clearnet"}
      </p>
    </div>
  );
}

/* Top bar ------------------------------------------------------------------- */

function TopBar({ onMenu, onPalette, drawerOpen }: { onMenu: () => void; onPalette: () => void; drawerOpen: boolean }) {
  const lock = useLock();
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-bg/95 px-3 backdrop-blur-sm sm:gap-3 sm:px-6 lg:px-10">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        className="grid size-9 place-items-center border border-line-2 text-ink transition-colors hover:border-ink lg:hidden"
      >
        <Icon name="menu" />
      </button>
      <Link href="/dashboard" aria-label="absolute, overview" className="lg:hidden">
        <Wordmark size="sm" />
      </Link>

      <div className="hidden min-w-0 flex-1 lg:block">
        <Suspense fallback={<span className={cn("font-mono text-[12px]", MUTED)}>panel</span>}>
          <Crumbs />
        </Suspense>
      </div>
      <div className="flex-1 lg:hidden" />

      <button
        type="button"
        onClick={onPalette}
        aria-label="Search and commands"
        aria-keyshortcuts="Meta+K Control+K /"
        className="flex h-8 items-center gap-2 border border-line-2 px-2 font-mono text-[12px] text-ink-2 transition-colors hover:border-ink hover:text-ink sm:px-2.5"
      >
        <Icon name="search" />
        <span className="hidden 2xl:inline">search</span>
        <kbd className="hidden border border-line-2 bg-bg-2 px-1 text-[11px] leading-[16px] text-ink-2 sm:inline">⌘K</kbd>
      </button>
      <div className="hidden md:block">
        <NetToggle />
      </div>
      <div className="hidden md:block">
        <CredentialChip />
      </div>
      <span className={cn("hidden h-8 items-center gap-2 border border-dashed border-line-2 px-2.5 font-mono text-[11.5px] xl:flex", MUTED)}>
        demo · memory only
      </span>
      <Button size="sm" onClick={lock} aria-label="Lock the panel and forget this session">
        <Icon name="lock" />
        <span className="hidden sm:inline">lock</span>
      </Button>
    </header>
  );
}

function Crumbs() {
  const pathname = usePathname();
  const box = useSearchParams().get("id");
  const parts = pathname.replace(/^\/dashboard\/?/, "").split("/").filter(Boolean);
  // One box is /dashboard/servers?id=…; its name is the last crumb.
  if (box && parts.at(-1) === "servers") parts.push(encodeURIComponent(box));
  const trail = parts.length ? parts : ["overview"];
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 items-center gap-2 font-mono text-[12px]">
        <li>
          <Link href="/dashboard" className={cn("transition-colors hover:text-ink", MUTED)}>
            panel
          </Link>
        </li>
        {trail.map((p, i) => {
          const last = i === trail.length - 1;
          const href = `/dashboard/${parts.slice(0, i + 1).join("/")}`;
          return (
            <li key={`${p}-${i}`} className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="text-ink-4">
                /
              </span>
              {last ? (
                <span aria-current="page" className="truncate text-ink">
                  {decodeURIComponent(p)}
                </span>
              ) : (
                <Link href={href} className={cn("transition-colors hover:text-ink", MUTED)}>
                  {p}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** clearnet / onion mirror, as a two-position switch. Simulated: the panel is the same either way. */
export function NetToggle({ className }: { className?: string }) {
  const { state, actions } = useDash();
  const onion = state.net === "onion";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={onion}
      aria-label="Use the onion mirror"
      onClick={() => actions.setNet(onion ? "clearnet" : "onion")}
      className={cn("flex h-8 items-stretch border border-line-2 font-mono text-[11.5px] transition-colors hover:border-ink", className)}
    >
      <span className={cn("flex items-center gap-1.5 px-2", !onion ? "bg-ink text-white" : "text-ink-2")}>
        <Icon name="globe" scale={1.5} />
        clearnet
      </span>
      <span className={cn("flex items-center gap-1.5 px-2", onion ? "bg-accent text-white" : "text-ink-2")}>
        <Icon name="onion" scale={1.5} />
        onion
      </span>
    </button>
  );
}

/** The credential's first and last four, and a toggle that reveals the whole thing. */
export function CredentialChip({ inline }: { inline?: boolean }) {
  const { state } = useDash();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const credential = state.credential ?? "";

  useEffect(() => {
    if (!open || inline) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, inline]);

  return (
    <div ref={wrap} className={cn("relative", inline && "w-full")}>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-8 items-center gap-2 border border-line-2 px-2.5 font-mono text-[12px] text-ink transition-colors hover:border-ink",
          inline && "w-full",
        )}
      >
        <span className={MUTED}>credential</span>
        <span className="flex-1 text-left">{fingerprint(credential)}</span>
        <Icon name={open ? "eyeOff" : "eye"} />
        <span className="sr-only">{open ? "hide the full credential" : "reveal the full credential"}</span>
      </button>
      {open ? (
        <div
          id={id}
          role="region"
          aria-label="Account credential"
          className={cn(
            "z-40 border bg-paper p-4",
            inline ? "mt-2 border-line-2" : "absolute right-0 top-[calc(100%+6px)] w-[min(400px,calc(100vw-24px))] border-ink",
            motion.fade,
          )}
        >
          <p className={LABEL}>{CREDENTIAL_LENGTH} characters · the whole account</p>
          <p className="mt-2.5 break-all bg-ink px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-white">{credential}</p>
          <div className="mt-3 flex items-start justify-between gap-3">
            <p className="text-[14px] leading-snug text-ink-2">Anyone holding this is you. There&rsquo;s no email to tell you apart.</p>
            <CopyButton text={credential} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* Mobile drawer ------------------------------------------------------------- */

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [ref, close, onBackdrop] = useNativeModal(open, onClose);
  const lock = useLock();
  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      onClose={close}
      onClick={onBackdrop}
      className="m-0 h-dvh max-h-dvh w-[min(320px,88vw)] max-w-none border-r border-line-2 bg-bg p-0 text-ink backdrop:bg-night/45"
    >
      {open ? (
        <div className={cn("flex h-full flex-col", motion.drawer)}>
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pl-5 pr-2">
            <Wordmark size="sm" />
            <button
              type="button"
              data-autofocus
              onClick={close}
              aria-label="Close menu"
              className="grid size-9 place-items-center text-ink-2 hover:bg-bg-2 hover:text-ink"
            >
              <Icon name="close" />
            </button>
          </div>
          <nav aria-label="Panel" className="px-3 py-4">
            <NavList onNavigate={close} />
          </nav>
          <div className="mt-auto space-y-3 border-t border-line px-5 py-5">
            <CredentialChip inline />
            <NetToggle className="w-full [&>span]:flex-1 [&>span]:justify-center" />
            <p className={cn("font-mono text-[11px]", MUTED)}>demo · memory only · canary signed {brand.canaryUpdated}</p>
            <Button className="w-full" onClick={lock}>
              <Icon name="lock" /> lock and forget
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

/* Toasts -------------------------------------------------------------------- */

function Toasts() {
  const { state, actions } = useDash();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col gap-2"
    >
      {state.toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={actions.dismissToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const id = window.setTimeout(() => onDismiss(toast.id), 5200);
    return () => window.clearTimeout(id);
  }, [toast.id, onDismiss]);
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 border bg-paper py-3 pl-3.5 pr-2",
        toast.tone === "danger" ? "border-[#b23a2c]" : "border-ink",
        motion.toast,
      )}
    >
      <span aria-hidden className={cn("mt-[5px] size-[7px] shrink-0", toast.tone === "danger" ? "bg-[#b23a2c]" : "bg-accent")} />
      <p className="min-w-0 flex-1 text-[15px] leading-snug text-ink">{toast.text}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="grid size-6 shrink-0 place-items-center text-ink-2 hover:text-ink"
      >
        <Icon name="close" scale={1} />
      </button>
    </div>
  );
}
