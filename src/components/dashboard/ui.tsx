"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/components/kit";
import { prng, type Status } from "./data";
import { ICONS, type IconName, type Rows } from "./glyphs";
import "./dash.css";

/*
 * The panel's building blocks. Square corners, hairlines, mono labels, raised panels on grey paper.
 * Mint fills the primary action and live LEDs; deep mint (accent) is the only mint used as text;
 * periwinkle draws the charts.
 */

/** Muted label slate: ink-3 is 5.2:1 on the grey page and 5.7:1 on a raised panel. */
export const MUTED = "text-ink-3";
export const DANGER_TEXT = "text-[#b23a2c]";
export const LABEL = "font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3";
/** Class names from dash.css. */
export const motion = {
  rise: "dash-rise",
  fade: "dash-fade",
  blink: "dash-blink",
  spin: "dash-spin",
  pulse: "dash-pulse",
  drawer: "dash-drawer",
  drift: "dash-drift",
  toast: "dash-toast",
  led: "dash-led",
  sweep: "dash-sweep",
} as const;
const s = motion;

/* Pixel art ---------------------------------------------------------------- */

export function Pixels({
  rows,
  palette,
  scale = 2,
  className,
  label,
}: {
  rows: Rows;
  palette?: Record<string, string>;
  scale?: number;
  className?: string;
  label?: string;
}) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const pal: Record<string, string> = palette ?? { "#": "currentColor", o: "var(--accent)" };
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * scale}
      height={h * scale}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block shrink-0", className)}
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => {
          const fill = pal[ch];
          return fill ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} /> : null;
        }),
      )}
    </svg>
  );
}

export function Icon({ name, className, scale = 2 }: { name: IconName; className?: string; scale?: number }) {
  return <Pixels rows={ICONS[name]} scale={scale} className={className} />;
}

/* Buttons ------------------------------------------------------------------ */

type Variant = "primary" | "accent" | "ghost" | "danger" | "danger-solid" | "quiet";
type Size = "sm" | "md" | "lg";

// The primary is the kit's notched mint block. clip-path would cut an outside focus ring off, so it draws inside.
const VARIANT: Record<Variant, string> = {
  primary: "notch [--notch:9px] bg-mint text-ink font-semibold hover:bg-mint-hi focus-visible:-outline-offset-4",
  accent: "bg-accent text-white hover:bg-accent-deep",
  ghost: "border border-line-2 bg-paper font-mono text-ink-2 hover:border-ink hover:text-ink",
  danger: "border border-[#b23a2c]/45 bg-paper font-mono text-[#b23a2c] hover:border-[#b23a2c] hover:bg-[#fbeeec]",
  "danger-solid": "bg-[#b23a2c] font-medium text-white hover:bg-[#962e22]",
  quiet: "font-mono text-ink-2 hover:text-ink",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[12px]",
  md: "h-10 px-4 text-[13px]",
  lg: "h-12 px-5 text-[15px]",
};

export const buttonClass = (variant: Variant = "ghost", size: Size = "md", className?: string) =>
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-colors select-none",
    "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    VARIANT[variant],
    SIZE[size],
    className,
  );

/** A command line that wraps only between words, never inside a flag, a path or an address. */
export function Cmd({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <Fragment key={i}>
          {i ? " " : null}
          <span className="whitespace-nowrap">{w}</span>
        </Fragment>
      ))}
    </>
  );
}

/** The ">_" chip that marks the one primary action on a view, as on the landing page. */
export function Prompt() {
  return (
    <span aria-hidden className="grid size-5 shrink-0 place-items-center bg-ink font-mono text-[11px] text-mint">
      &gt;_
    </span>
  );
}

export function Button({
  variant = "ghost",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "ghost",
  size = "md",
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "className"> & { variant?: Variant; size?: Size; className?: string }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

/* Panels ------------------------------------------------------------------- */

/** A window's title bar: three squares, a centred title, a status on the right. */
export function TitleBar({
  title,
  status,
  live,
  dark,
  id,
  as: As = "h2",
  className,
}: {
  title: ReactNode;
  status?: ReactNode;
  live?: boolean;
  dark?: boolean;
  id?: string;
  as?: "h2" | "h3" | "p";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-3 border-b px-3 font-mono text-[11px] leading-none",
        dark ? "border-white/10 bg-white/[0.04] text-white/70" : "border-line bg-bg-2 text-ink-2",
        className,
      )}
    >
      <span aria-hidden className="flex shrink-0 gap-[3px]">
        <span className={cn("size-[7px]", live ? (dark ? "bg-mint" : "bg-accent") : dark ? "bg-white/20" : "bg-ink-4")} />
        <span className={cn("size-[7px]", dark ? "bg-white/20" : "bg-ink-4")} />
        <span className={cn("size-[7px]", dark ? "bg-white/20" : "bg-ink-4")} />
      </span>
      <As id={id} className={cn("min-w-0 flex-1 truncate text-center font-normal", dark ? "text-white" : "text-ink")}>
        {title}
      </As>
      {status != null ? <span className="shrink-0 truncate">{status}</span> : <span aria-hidden className="w-[27px]" />}
    </div>
  );
}

export function Panel({
  title,
  status,
  live,
  dark,
  children,
  className,
  bodyClassName,
  as: As = "section",
  headingAs,
}: {
  title?: ReactNode;
  status?: ReactNode;
  live?: boolean;
  dark?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div" | "article" | "figure";
  headingAs?: "h2" | "h3" | "p";
}) {
  const id = useId();
  return (
    <As
      aria-labelledby={title && As !== "div" ? id : undefined}
      className={cn("min-w-0 border", dark ? "border-night bg-night text-white" : "border-line-2 bg-paper", className)}
    >
      {title ? <TitleBar id={id} title={title} status={status} live={live} dark={dark} as={headingAs} /> : null}
      <div className={bodyClassName}>{children}</div>
    </As>
  );
}

/* Page header -------------------------------------------------------------- */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2", LABEL, className)}>
      <span aria-hidden className="inline-block size-[7px] bg-mint" />
      {children}
    </p>
  );
}

/** The display face for page titles: heavy and tight, like the landing page, a size down. */
export const DISPLAY = "font-display font-extrabold tracking-[-0.04em] [font-variation-settings:'opsz'_96]";

export function PageHeader({
  eyebrow,
  lead,
  trail,
  intro,
  actions,
}: {
  eyebrow: ReactNode;
  lead: ReactNode;
  trail?: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className={cn("mt-4 text-balance text-[clamp(2rem,3.6vw,3.1rem)] leading-[1] text-ink", DISPLAY)}>
          {lead}
          {trail ? (
            <>
              <br />
              <span className="text-accent">{trail}</span>
            </>
          ) : null}
        </h1>
        {intro ? <p className="mt-5 max-w-[60ch] text-pretty text-[16px] leading-relaxed text-ink-2">{intro}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/* Status ------------------------------------------------------------------- */

export const STATUS_LABEL: Record<Status, string> = {
  running: "running",
  booting: "provisioning",
  locked: "waiting for unlock",
  rebooting: "rebooting",
  rebuilding: "reinstalling",
  stopping: "powering off",
  stopped: "stopped",
};

/**
 * A square status light: deep mint running, blinking mint in flight, lime with an ink rim
 * waiting for unlock, hollow grey stopped.
 */
export function Led({ status, className, size = 8 }: { status: Status | "danger"; className?: string; size?: number }) {
  const busy = status === "booting" || status === "rebooting" || status === "rebuilding";
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "inline-block shrink-0",
        status === "running" && cn("bg-accent", s.pulse),
        busy && cn("bg-mint shadow-[inset_0_0_0_1px_var(--accent)]", s.blink),
        status === "locked" && "bg-lime-hi shadow-[inset_0_0_0_1.5px_var(--ink)]",
        status === "stopping" && cn("bg-ink-3", s.blink),
        status === "stopped" && "shadow-[inset_0_0_0_1.5px_var(--ink-3)]",
        status === "danger" && "bg-[#b23a2c]",
        className,
      )}
    />
  );
}

/** Four cells taking turns, for anything in flight. */
export function Spin({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-grid shrink-0 grid-cols-2 gap-px", s.spin, className)}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="size-[4px] bg-current" />
      ))}
    </span>
  );
}

/** A row of square cells, `lit` of them filled. */
export function CellBar({
  cells,
  lit,
  size = 7,
  gap = 2,
  on = "bg-accent",
  off = "bg-bg-3",
  className,
}: {
  cells: number;
  lit: number;
  size?: number;
  gap?: number;
  on?: string;
  off?: string;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 align-middle", className)} style={{ gap }}>
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} className={cn("inline-block transition-colors duration-200", i < lit ? on : off)} style={{ width: size, height: size }} />
      ))}
    </span>
  );
}

/* Copy --------------------------------------------------------------------- */

export function CopyButton({
  text,
  label = "copy",
  className,
  dark,
}: {
  text: string;
  label?: string;
  className?: string;
  dark?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the text is on screen to copy by hand.
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 border px-2 font-mono text-[11px] transition-colors",
        dark ? "border-white/20 text-white/75 hover:border-white/60 hover:text-white" : "border-line-2 bg-paper text-ink-2 hover:border-ink hover:text-ink",
        className,
      )}
    >
      <Icon name={copied ? "check" : "copy"} scale={1.5} />
      <span aria-live="polite">{copied ? "copied" : label}</span>
    </button>
  );
}

/* Dialog ------------------------------------------------------------------- */

/**
 * Drives a native <dialog> as a modal: showModal() makes the rest of the page inert (that's the
 * focus trap), Escape closes it, a click on the backdrop closes it, and focus goes back to
 * whatever opened it. Put data-autofocus on the element that should take focus.
 */
export function useNativeModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!open) {
      if (d.open) d.close();
      return;
    }
    const opener = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      if (d.open) d.close();
      if (opener && opener.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
    };
  }, [open]);

  const close = useCallback(() => closeRef.current(), []);
  const onBackdrop = useCallback((e: { target: EventTarget; currentTarget: EventTarget }) => {
    if (e.target === e.currentTarget) closeRef.current();
  }, []);
  return [ref, close, onBackdrop] as const;
}

/** A modal dialog with the panel's title bar. Content mounts only while open, so forms start fresh. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  tone = "default",
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
  wide?: boolean;
}) {
  const titleId = useId();
  const [ref, close, onBackdrop] = useNativeModal(open, onClose);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={close}
      onClick={onBackdrop}
      className={cn(
        "m-auto max-h-[calc(100dvh-24px)] w-[min(var(--w),calc(100vw-24px))] overflow-auto border bg-paper p-0 text-ink",
        "backdrop:bg-night/45",
        tone === "danger" ? "border-[#b23a2c]/50" : "border-line-2",
      )}
      style={{ ["--w" as string]: wide ? "720px" : "540px" }}
    >
      {open ? (
        <div className={s.fade}>
          <div className="flex h-11 items-center gap-3 border-b border-line bg-bg-2 pl-4 pr-1.5">
            <span aria-hidden className={cn("size-[7px] shrink-0", tone === "danger" ? "bg-[#b23a2c]" : "bg-accent")} />
            <h2 id={titleId} className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid size-8 place-items-center text-ink-2 transition-colors hover:bg-bg-3 hover:text-ink"
            >
              <Icon name="close" scale={1.5} />
            </button>
          </div>
          <div className="p-5 sm:p-6">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}

/* Form bits ---------------------------------------------------------------- */

export const inputClass = (invalid?: boolean, dark?: boolean) =>
  cn(
    "w-full border px-3 font-mono text-[13px] outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-0",
    dark
      ? "border-white/20 bg-white/5 text-white placeholder:text-white/55 focus:border-mint-pale focus-visible:outline-mint-pale"
      : "border-line-2 bg-paper text-ink placeholder:text-ink-3 focus:border-accent focus-visible:outline-accent",
    invalid && "border-[#b23a2c] focus:border-[#b23a2c]",
  );

/** A row of native radios styled as a segmented control. Arrow keys work. */
export function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
  className,
  hideLegend,
}: {
  legend: string;
  options: readonly { value: T; label: ReactNode; note?: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={cn(hideLegend ? "sr-only" : cn("mb-2", LABEL))}>{legend}</legend>
      <div className="flex w-fit max-w-full flex-wrap border border-line-2">
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <label
              key={o.value}
              className={cn(
                "relative flex h-9 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap px-3 font-mono text-[12px] transition-colors",
                i > 0 && "border-l border-line-2",
                "has-[:focus-visible]:z-10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                on ? "bg-ink text-white" : "bg-paper text-ink-2 hover:bg-bg-2 hover:text-ink",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={on}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
              {o.note ? <span className={on ? "text-mint" : "text-accent"}>{o.note}</span> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Key/value rows in mono, hairline-divided. */
export function Meta({ rows, className }: { rows: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line border-y border-line font-mono text-[12px]", className)}>
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className={cn("shrink-0", MUTED)}>{k}</dt>
          <dd className="min-w-0 text-right text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A decorative QR-like square. Seeded noise, not an encoded code: it scans as nothing. */
export function FakeQr({ seed, size = 21, className, px = 6 }: { seed: number; size?: number; className?: string; px?: number }) {
  const cells: { x: number; y: number; hot: boolean }[] = [];
  const rand = prng(seed);
  const corners = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  const mid = (size - 1) / 2;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let v = rand() < 0.47 ? 1 : 0;
      for (const [cr, cc] of corners) {
        const lr = r - cr;
        const lc = c - cc;
        if (lr >= -1 && lr <= 7 && lc >= -1 && lc <= 7) {
          const inBox = lr >= 0 && lr <= 6 && lc >= 0 && lc <= 6;
          const ring = lr === 0 || lr === 6 || lc === 0 || lc === 6;
          const eye = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
          v = inBox && (ring || eye) ? 1 : 0;
        }
      }
      // A clear well with one lit pixel in the middle: the doorway.
      if (Math.abs(r - mid) <= 1 && Math.abs(c - mid) <= 1) v = r === mid && c === mid ? 2 : 0;
      if (v) cells.push({ x: c, y: r, hot: v === 2 });
    }
  }
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size * px}
      height={size * px}
      shapeRendering="crispEdges"
      aria-hidden
      className={cn("block shrink-0", className)}
    >
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill={c.hot ? "var(--marker)" : "var(--ink)"} />
      ))}
      <rect x={mid} y={mid} width={1} height={1} fill="none" stroke="var(--ink)" strokeWidth={0.12} />
    </svg>
  );
}
