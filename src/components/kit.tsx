"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** The wide measure every section shares: no ruled column, just a margin. */
export function Wide({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-14", className)} {...props} />;
}

export type Tone = "paper" | "night";

/**
 * One section of the page, full bleed. "paper" is the grey page; "night" is a
 * slate band whose text is mint-pale and white. Put a `Wide` inside it.
 */
export function Section({ className, tone = "paper", ...props }: ComponentProps<"section"> & { tone?: Tone }) {
  return (
    <section
      data-tone={tone}
      {...props}
      className={cn(
        "scroll-mt-16 py-20 sm:py-28 lg:py-32",
        tone === "night" ? "bg-night text-white [--dot:var(--night-line)] [--hatch:var(--night-line)]" : "bg-bg text-ink",
        className,
      )}
    />
  );
}

/** Small mono label: a lit pixel, then uppercase letterspaced text. */
export function Kicker({
  children,
  tone = "paper",
  pixel = "mint",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  pixel?: "mint" | "lime" | "pink" | "peri";
  className?: string;
}) {
  const px = { mint: "bg-mint", lime: "bg-lime", pink: "bg-pink", peri: "bg-peri" }[pixel];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.2em] uppercase",
        tone === "night" ? "text-mint-pale/80" : "text-ink-3",
        className,
      )}
    >
      <span aria-hidden className={cn("size-[7px] shrink-0", px)} />
      {children}
    </span>
  );
}

/**
 * A section title in the display face: heavy, tight, one tone. The sub-line
 * sits under it in the body face. On night the title is mint-pale.
 */
export function Title({
  children,
  sub,
  id,
  kicker,
  tone = "paper",
  as: Tag = "h2",
  className,
}: {
  children: ReactNode;
  sub?: ReactNode;
  id?: string;
  kicker?: ReactNode;
  tone?: Tone;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("max-w-[58rem]", className)}>
      {kicker ? (
        <Kicker tone={tone} className="mb-5">
          {kicker}
        </Kicker>
      ) : null}
      <Tag
        id={id}
        className={cn(
          "font-display text-[clamp(2.25rem,5.2vw,4.5rem)] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance [font-variation-settings:'opsz'_96]",
          tone === "night" ? "text-mint-pale" : "text-ink",
        )}
      >
        {children}
      </Tag>
      {sub ? (
        <p
          className={cn(
            "mt-5 max-w-[44rem] text-[17px] leading-relaxed text-pretty sm:text-[19px]",
            tone === "night" ? "text-white/72" : "text-ink-2",
          )}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Copies text: the async clipboard first, then a hidden textarea and execCommand
 * for insecure contexts and older browsers. Resolves false if both are blocked.
 */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

const CTA_TONE = {
  mint: "bg-mint text-ink hover:bg-mint-hi",
  ink: "bg-ink text-paper hover:bg-night-3",
  lime: "bg-lime text-ink hover:bg-lime-hi",
} as const;

/**
 * Call to action: a flat block with its top-right corner cut. Mint is the
 * primary, ink the secondary, lime the primary on night bands.
 */
export function CtaButton({
  href,
  children,
  className,
  size = "md",
  tone = "mint",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  size?: "md" | "lg";
  tone?: keyof typeof CTA_TONE;
}) {
  return (
    <a
      href={href}
      className={cn(
        "notch group inline-flex items-center gap-3 font-medium transition-colors",
        CTA_TONE[tone],
        size === "lg" ? "h-[52px] pr-7 pl-5 text-[16px]" : "h-10 pr-5 pl-4 text-sm",
        className,
      )}
    >
      {children}
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </a>
  );
}

/** Quiet secondary link-button with a hairline border. */
export function GhostButton({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex h-10 items-center gap-2 border border-line-2 px-4 font-mono text-[12px] text-ink-2 transition-colors hover:border-ink hover:text-ink",
        className,
      )}
    >
      {children}
    </a>
  );
}

/** Hairline-bordered tag, mono. */
export function Tag({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  /** "accent" violet chip, "marker" yellow highlight. */
  tone?: "muted" | "accent" | "marker";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-1.5 py-0.5 font-mono text-[11px] leading-none",
        tone === "accent" && "bg-accent text-white",
        tone === "marker" && "bg-marker text-ink",
        tone === "muted" && "border border-line-2 text-ink-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** True once the element has scrolled into view (stays true). */
export function useInView<T extends Element>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);
  return [ref, inView] as const;
}

/** Fades and lifts children in when they enter the viewport. */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const [ref, shown] = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      data-shown={shown}
      className={cn("reveal", className)}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Respects the user's reduced-motion preference. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
