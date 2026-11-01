"use client";

import { useEffect, useRef, useState } from "react";
import { cn, usePrefersReducedMotion } from "@/components/kit";
import { planOf, type Server } from "./data";
import { DANGER_TEXT, Spin, motion } from "./ui";

/*
 * Destroying a box, shown as what it is: the name, printed in slate cells inside its frame,
 * comes apart from left to right. Each cell flashes mint as it is overwritten, then falls
 * away as periwinkle and fades. The steps print alongside. When it's done, onDone removes the box.
 */

const DURATION = 2600;
const HOLD = 700;
const INK = "#3d3b4f"; // --ink
const DEBRIS = "#7b8cff"; // --peri
const FLASH = "#28e99f"; // --mint

export function Shred({ box, onDone }: { box: Server; onDone: () => void }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  const [p, setP] = useState(0);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    wrap.current?.focus();
  }, []);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const rect = cv.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const pitch = Math.max(4, Math.round(w / 130));
    const cols = Math.floor(w / pitch);
    const rows = Math.floor(h / pitch);

    // Rasterise the name and a frame around it to the cell grid.
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const ox = off.getContext("2d", { willReadFrequently: true });
    if (!ox) return;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-plex-mono").trim() || "monospace";
    let size = rows * 0.42;
    ox.font = `500 ${size}px ${family}`;
    const tw = ox.measureText(box.id).width;
    if (tw > cols * 0.84) size *= (cols * 0.84) / tw;
    ox.font = `500 ${size}px ${family}`;
    ox.textAlign = "center";
    ox.textBaseline = "middle";
    ox.fillStyle = "#000";
    ox.fillText(box.id, cols / 2, rows / 2 + size * 0.05);
    ox.fillRect(1, 1, cols - 2, 1);
    ox.fillRect(1, rows - 2, cols - 2, 1);
    ox.fillRect(1, 1, 1, rows - 2);
    ox.fillRect(cols - 2, 1, 1, rows - 2);
    const a = ox.getImageData(0, 0, cols, rows).data;

    // Seeded jitter, so every shred of the same name breaks the same way.
    let seed = box.id.length * 2654435761;
    const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const cells: { x: number; y: number; th: number; jx: number; jy: number }[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (a[(y * cols + x) * 4 + 3] < 110) continue;
        cells.push({ x, y, th: (x / cols) * 0.78 + rand() * 0.22, jx: rand() - 0.5, jy: rand() });
      }
    }

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const s = pitch - 1;
      for (const c of cells) {
        const d = t * 1.25 - c.th;
        if (d < 0) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = INK;
          ctx.fillRect(c.x * pitch, c.y * pitch, s, s);
        } else if (d < 0.06) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = FLASH;
          ctx.fillRect(c.x * pitch, c.y * pitch, s, s);
        } else {
          const e = d - 0.06;
          const alpha = 1 - e / 0.45;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = DEBRIS;
          const k = Math.max(1, s * (1 - e));
          ctx.fillRect(c.x * pitch + c.jx * e * 120, c.y * pitch + (0.4 + c.jy) * e * e * 260, k, k);
        }
      }
      ctx.globalAlpha = 1;
    };

    if (reduced) {
      draw(0);
      setTimeout(() => setP(1), 0);
      const id = window.setTimeout(() => doneRef.current(), 1200);
      return () => window.clearTimeout(id);
    }

    let raf = 0;
    let finish = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      draw(t);
      setP(t);
      if (t < 1) raf = requestAnimationFrame(loop);
      else finish = window.setTimeout(() => doneRef.current(), HOLD);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(finish);
    };
  }, [box.id, reduced]);

  const plan = planOf(box);
  const steps = [
    { at: 0.05, text: `stopping ${box.id}` },
    { at: 0.3, text: `deleting its ${plan.disk}` },
    { at: 0.55, text: "removing its data along with it" },
    { at: 0.78, text: "taking it off your server list" },
  ];

  return (
    <div
      ref={wrap}
      tabIndex={-1}
      role="alertdialog"
      aria-modal="true"
      aria-label={`Destroying ${box.id}`}
      className={cn("fixed inset-0 z-[70] grid place-items-center bg-bg/95 px-4 outline-none backdrop-blur-[2px]", motion.fade)}
    >
      <div className="w-full max-w-[760px]">
        <p className={cn("flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]", DANGER_TEXT)}>
          <span aria-hidden className="size-[7px] bg-[#b23a2c]" />
          destroying
        </p>
        <canvas ref={ref} aria-hidden className="mt-4 block aspect-[4/1] w-full" />
        <ol className="mt-6 space-y-1.5 font-mono text-[12.5px]" aria-live="polite">
          {steps.map((st) =>
            p >= st.at ? (
              <li key={st.text} className={cn("flex items-center gap-2.5 text-ink-2", motion.fade)}>
                {p >= st.at + 0.2 || p >= 1 ? (
                  <span aria-hidden className="size-[7px] bg-accent" />
                ) : (
                  <Spin className="text-accent" />
                )}
                {st.text}… {p >= st.at + 0.2 || p >= 1 ? "done" : ""}
              </li>
            ) : null,
          )}
          {p >= 1 ? (
            <li className={cn("pt-2 text-[14px] text-ink", motion.fade)}>{box.id}: gone. Nothing to recover.</li>
          ) : null}
        </ol>
      </div>
    </div>
  );
}
