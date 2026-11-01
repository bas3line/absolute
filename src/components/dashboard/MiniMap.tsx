"use client";

import { useEffect, useRef } from "react";
import { cn, usePrefersReducedMotion } from "@/components/kit";
import { locations } from "@/lib/catalog";
import { fromInStock } from "./data";
import { MASK, decodeMask, toCell } from "./worldmask";

/*
 * A dot-matrix world from New York to Hong Kong, on a raised panel: Natural Earth land as pale
 * periwinkle cells, coasts a step darker, and each of the catalogue's eight locations a slate
 * marker (grey when nothing there is in stock). The chosen one gets a mint heart and a ring of
 * deep-mint cells pulsing out of it. Clicking a marker picks the location; the list beside the
 * map is the keyboard route to the same choice.
 */

const LAND = decodeMask();
const MARKS = locations.map((l) => ({ code: l.id, city: l.city, open: fromInStock(l) !== null, ...toCell(l.x, l.y) }));
// globals.css, spelled out for canvas.
const WATER = "#e9e9ec";
const INLAND = "#c9d0ff";
const COAST = "#7b8cff"; // --peri
const INK = "#3d3b4f"; // --ink
const SOLD = "#b4b3bd"; // --ink-4
const MINT = "#28e99f"; // --mint
const PAPER = "#f5f5f4"; // --paper
const PULSE_MS = 2200;

export function MiniMap({
  selected,
  hovered,
  onPick,
  onHover,
  className,
}: {
  selected: string;
  hovered: string | null;
  onPick: (code: string) => void;
  onHover: (code: string | null) => void;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const live = useRef({ selected, hovered });
  const redraw = useRef(() => {});

  useEffect(() => {
    live.current = { selected, hovered };
    redraw.current();
  }, [selected, hovered]);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const layer = document.createElement("canvas");
    const lctx = layer.getContext("2d");
    if (!lctx) return;
    let step = 1;
    let cols = MASK.cols;
    let rows = MASK.rows;
    let px = 1;
    let py = 1;
    let dot = 1;
    let raf = 0;
    let visible = false;

    const X = (c: number) => Math.round(c * px + (px - dot) / 2);
    const Y = (r: number) => Math.round(r * py + (py - dot) / 2);
    const cell = (c: number, r: number) => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return;
      ctx.fillRect(X(c), Y(r), dot, dot);
    };

    const build = () => {
      const rect = cv.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      step = rect.width / MASK.cols < 3 ? 2 : 1;
      cols = MASK.cols / step;
      rows = MASK.rows / step;
      cv.width = layer.width = Math.round(rect.width * dpr);
      cv.height = layer.height = Math.round(rect.height * dpr);
      px = cv.width / cols;
      py = cv.height / rows;
      dot = Math.max(1, Math.round(Math.min(px, py) * 0.66));
      const land = new Uint8Array(cols * rows);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          let n = 0;
          for (let y = 0; y < step; y++) for (let x = 0; x < step; x++) n += LAND[(r * step + y) * MASK.cols + c * step + x];
          land[r * cols + c] = n * 2 >= step * step ? 1 : 0;
        }
      const isLand = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && land[r * cols + c] === 1;
      lctx.clearRect(0, 0, layer.width, layer.height);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const on = land[r * cols + c];
          const edge = on && (!isLand(c - 1, r) || !isLand(c + 1, r) || !isLand(c, r - 1) || !isLand(c, r + 1));
          lctx.fillStyle = !on ? WATER : edge ? COAST : INLAND;
          lctx.fillRect(X(c), Y(r), dot, dot);
        }
      return true;
    };

    const draw = (now: number, still: boolean) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(layer, 0, 0);
      const { selected: sel, hovered: hov } = live.current;
      MARKS.forEach((m, k) => {
        const c = Math.floor(m.col / step);
        const r = Math.floor(m.row / step);
        const on = m.code === sel;
        const hot = m.code === hov;
        if (on || hot) {
          const R = Math.max(2.5, 6 / step);
          const phase = still ? 0.45 : (now / PULSE_MS + k * 0.3) % 1;
          const alpha = (1 - phase) ** 1.3 * (on ? 0.9 : 0.5);
          ctx.fillStyle = `rgba(9,115,72,${alpha.toFixed(3)})`;
          const span = Math.ceil(R) + 1;
          for (let dy = -span; dy <= span; dy++)
            for (let dx = -span; dx <= span; dx++) if (Math.abs(Math.hypot(dx, dy) - phase * R) < 0.5) cell(c + dx, r + dy);
        }
        ctx.fillStyle = m.open ? INK : SOLD;
        if (on || hot) {
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cell(c + dx, r + dy);
          ctx.fillStyle = on ? MINT : PAPER;
          cell(c, r);
        } else {
          // Every location is a small plus, so all eight read at a glance.
          cell(c, r);
          cell(c - 1, r);
          cell(c + 1, r);
          cell(c, r - 1);
          cell(c, r + 1);
        }
      });
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      draw(now, false);
    };
    const start = () => {
      if (!raf && !reduced && visible) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    redraw.current = () => {
      if (!raf) draw(performance.now(), true);
    };

    if (build()) draw(performance.now(), true);
    const ro = new ResizeObserver(() => {
      if (build() && !raf) draw(performance.now(), true);
    });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(cv);
    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      redraw.current = () => {};
    };
  }, [reduced]);

  const sel = MARKS.find((m) => m.code === (hovered ?? selected));
  const flip = sel ? sel.col / MASK.cols > 0.6 : false;

  return (
    <div className={cn("relative border border-line-2 bg-paper", className)}>
      <canvas ref={ref} aria-hidden className="pixelated block w-full" style={{ aspectRatio: `${MASK.cols} / ${MASK.rows}` }} />
      {/* Pointer targets. The location list next to the map is the keyboard and screen reader route. */}
      <div aria-hidden>
        {MARKS.map((m) => (
          <button
            key={m.code}
            type="button"
            tabIndex={-1}
            disabled={!m.open}
            onClick={() => onPick(m.code)}
            onMouseEnter={() => onHover(m.code)}
            onMouseLeave={() => onHover(null)}
            title={m.city}
            className="absolute size-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer disabled:cursor-not-allowed"
            style={{ left: `${(m.col / MASK.cols) * 100}%`, top: `${(m.row / MASK.rows) * 100}%` }}
          />
        ))}
      </div>
      {sel ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -translate-y-full whitespace-nowrap bg-ink px-1.5 py-1 font-mono text-[11px] leading-none text-white",
            flip && "-translate-x-full",
          )}
          style={{
            left: `calc(${(sel.col / MASK.cols) * 100}% ${flip ? "- 10px" : "+ 10px"})`,
            top: `calc(${(sel.row / MASK.rows) * 100}% - 8px)`,
          }}
        >
          {sel.city}
        </span>
      ) : null}
    </div>
  );
}
