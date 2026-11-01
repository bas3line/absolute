"use client";

import { useEffect, useRef } from "react";
import { cn, usePrefersReducedMotion } from "@/components/kit";
import type { Status } from "./data";
import { useDash } from "./store";

// Canvas can't read CSS variables cheaply per cell, so the palette is spelled out once here,
// matching globals.css: periwinkle for data, pink for the mirrored series, deep mint for "now".
const PERI = "#7b8cff";
const PERI_SOFT = "#b9c3ff";
const PINK = "#e58fdc"; // --pink a step deeper, so the out-edge reads on a raised panel
const PINK_SOFT = "#f5c4f0";
const NOW = "#097348"; // --accent
const MINT = "#28e99f";
const LIME = "#c4dc4f"; // --lime-hi a step deeper, so a waiting box's column reads on a raised panel
const OFF = "#b4b3bd"; // --ink-4
const EMPTY = "#e6e6ea";

/** Sizes a canvas to its box at up to 2× DPR and tells you when it is on screen. */
function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, deps: unknown[] = []) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const state = useRef({ w: 0, h: 0, dpr: 1, visible: false, ctx: null as CanvasRenderingContext2D | null });
  const redraw = useRef(() => {});

  useEffect(() => {
    drawRef.current = draw;
    redraw.current();
  });

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const st = state.current;
    st.ctx = ctx;
    redraw.current = () => {
      if (!st.visible || !st.w) return;
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.clearRect(0, 0, st.w, st.h);
      drawRef.current(ctx, st.w, st.h);
    };
    const ro = new ResizeObserver(() => {
      const r = cv.getBoundingClientRect();
      st.w = r.width;
      st.h = r.height;
      st.dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(r.width * st.dpr));
      cv.height = Math.max(1, Math.round(r.height * st.dpr));
      redraw.current();
    });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      st.visible = e.isIntersecting;
      redraw.current();
    });
    io.observe(cv);
    return () => {
      ro.disconnect();
      io.disconnect();
      redraw.current = () => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [ref, state] as const;
}

/**
 * The last minute as columns of square cells, one column a second. The newest column is drawn
 * deep mint; each column's top cell is full periwinkle, the cells under it a pale step, so the
 * edge reads like a line. Cells stay square: the row count follows the canvas height.
 * `mirror` hangs a second series below the middle (network out), in pink.
 */
export function PixelChart({
  values,
  mirror,
  max,
  className,
}: {
  values: number[];
  mirror?: number[];
  max: number;
  className?: string;
}) {
  const [ref] = useCanvas(
    (ctx, w, h) => {
      const cols = Math.max(1, values.length);
      const pitch = w / cols;
      const gap = pitch >= 7 ? 2 : 1;
      const size = Math.max(1, pitch - gap);
      let rows = Math.max(4, Math.floor((h + gap) / pitch));
      if (mirror && rows % 2) rows -= 1;
      const top = h - rows * pitch + gap; // bottom-align the grid
      const half = mirror ? rows / 2 : rows;
      const level = (v: number) => (v <= 0 ? 0 : Math.min(half, Math.max(1, Math.round((v / max) * half))));
      const y = (row: number) => Math.round(top + row * pitch);
      for (let c = 0; c < cols; c++) {
        const x = Math.round(c * pitch);
        const latest = c === cols - 1;
        const up = level(values[c] ?? 0);
        for (let r = 0; r < half; r++) {
          const on = r < up;
          ctx.fillStyle = !on ? EMPTY : latest ? NOW : r === up - 1 ? PERI : PERI_SOFT;
          ctx.fillRect(x, y(half - 1 - r), size, size);
        }
        if (mirror) {
          const down = level(mirror[c] ?? 0);
          for (let r = 0; r < half; r++) {
            const on = r < down;
            ctx.fillStyle = !on ? EMPTY : latest ? NOW : r === down - 1 ? PINK : PINK_SOFT;
            ctx.fillRect(x, y(half + r), size, size);
          }
        }
      }
    },
    [Boolean(mirror)],
  );
  return <canvas ref={ref} aria-hidden className={cn("block h-[132px] w-full", className)} />;
}

/** A small live sparkline of pixel bars for table rows. */
export function Sparkbars({ values, active, cols = 20, rows = 6 }: { values: number[]; active: boolean; cols?: number; rows?: number }) {
  const series = values.slice(-cols);
  const pad = cols - series.length;
  return (
    <svg viewBox={`0 0 ${cols * 4} ${rows * 4}`} width={cols * 4} height={rows * 4} shapeRendering="crispEdges" aria-hidden className="block shrink-0">
      {Array.from({ length: cols }, (_, c) => {
        const v = c < pad ? 0 : series[c - pad];
        const lit = v > 0 ? Math.max(1, Math.round(v * rows)) : 0;
        return Array.from({ length: rows }, (_, r) => {
          const on = r < lit;
          const fill = !on ? EMPTY : !active ? OFF : c === cols - 1 ? NOW : r === lit - 1 ? PERI : PERI_SOFT;
          return <rect key={`${c}-${r}`} x={c * 4} y={(rows - 1 - r) * 4} width={3} height={3} fill={fill} />;
        });
      })}
    </svg>
  );
}

/**
 * One box in the fleet as a strip of LEDs. Running boxes flicker at a density that follows their
 * CPU; a booting box sweeps a mint column across; a stopped one is dark. Canvas, ~9 fps,
 * paused offscreen, one still frame for reduced motion.
 */
export function FleetStrip({ id, status, className }: { id: string; status: Status; className?: string }) {
  const { telemetry } = useDash();
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);
  const refresh = useRef(() => {});
  // A status change repaints straight away, which is all reduced motion gets.
  useEffect(() => {
    statusRef.current = status;
    refresh.current();
  }, [status]);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const CELL = 5;
    const GAP = 2;
    const PITCH = CELL + GAP;
    let cols = 0;
    let rows = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let lit = new Float32Array(0);
    let hue = new Uint8Array(0);
    let raf = 0;
    let last = 0;
    let visible = false;
    let frame = 0;
    // Seeded so the first frame is the same every time.
    let seed = id.length * 7919 + 17;
    const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      cols = Math.max(1, Math.floor((w + GAP) / PITCH));
      rows = Math.max(1, Math.floor((h + GAP) / PITCH));
      lit = new Float32Array(cols * rows);
      hue = new Uint8Array(cols * rows);
      step(true);
      draw();
    };

    const step = (all: boolean) => {
      const st = statusRef.current;
      const cpu = telemetry.latest(id).cpu;
      const n = cols * rows;
      if (st === "running") {
        const density = 0.12 + cpu * 0.7;
        const flips = all ? n : Math.max(2, Math.round(n * 0.08));
        for (let k = 0; k < flips; k++) {
          const i = all ? k : (rand() * n) | 0;
          lit[i] = rand() < density ? 1 : 0;
          hue[i] = rand() < 0.3 ? 1 : 0;
        }
      } else if (st === "stopping") {
        for (let i = 0; i < n; i++) if (rand() < 0.25) lit[i] = 0;
      } else if (st === "stopped") {
        lit.fill(0);
      } else if (st === "locked") {
        // Waiting for unlock: dark, but for one lime column at the door.
        lit.fill(0);
        for (let r = 0; r < rows; r++) {
          lit[r * cols] = 1;
          hue[r * cols] = 3;
        }
      } else {
        // Booting: a mint sweep with a periwinkle wake.
        const head = frame % (cols + 6);
        for (let c = 0; c < cols; c++) {
          const d = head - c;
          for (let r = 0; r < rows; r++) {
            const i = r * cols + c;
            if (d === 0) {
              lit[i] = 1;
              hue[i] = 2;
            } else if (d > 0 && d < 5) {
              lit[i] = rand() < 0.7 - d * 0.12 ? 1 : 0;
              hue[i] = 1;
            } else {
              lit[i] = rand() < 0.05 ? 1 : 0;
              hue[i] = 0;
            }
          }
        }
      }
      frame++;
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          ctx.fillStyle = lit[i] ? (hue[i] === 3 ? LIME : hue[i] === 2 ? MINT : hue[i] === 1 ? PERI : PERI_SOFT) : EMPTY;
          ctx.fillRect(c * PITCH, r * PITCH, CELL, CELL);
        }
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || t - last < 110) return;
      last = t;
      step(false);
      draw();
    };

    resize();
    refresh.current = () => {
      step(true);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(cv);
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      refresh.current = () => {};
    };
  }, [id, reduced, telemetry]);

  return <canvas ref={ref} aria-hidden className={cn("block h-[26px] w-full", className)} />;
}
