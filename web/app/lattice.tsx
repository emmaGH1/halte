"use client";
import { useEffect, useRef } from "react";

/**
 * The brand visual: a dot lattice (ML-DSA is lattice cryptography) with a watch dial drawn in brighter dots.
 * Every few seconds a red wave runs out from the crown: the passport is reported stolen and the dial stops.
 */
export function Lattice({ className = "", cycle = true }: { className?: string; cycle?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, w = 0, h = 0, dpr = 1;
    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(c);
    const t0 = performance.now();
    const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const gap = w < 600 ? 9 : 11;
      const cx = w * (w < 900 ? 0.5 : 0.68), cy = h * (w < 900 && h > 600 ? 0.27 : 0.5);
      const R = Math.min(w, h) * (w < 900 ? 0.36 : 0.4);
      // 10 s loop: running 0-4.5, wave 4.5-5.5, frozen 5.5-9, release 9-10
      const p = cycle && !still ? t % 10 : 7;
      const wave = p < 4.5 ? -1 : p < 5.5 ? (p - 4.5) * 1.6 : p < 9 ? 9 : 9 - (p - 9) * 9;
      const sec = p < 4.5 ? (t % 60) * 6 : 4.5 * 6; // the seconds hand stops at the freeze
      const hands = [
        { a: ((sec - 90) * Math.PI) / 180, l: R * 0.82, wd: 1.2 },
        { a: ((300 - 90) * Math.PI) / 180, l: R * 0.6, wd: 2.2 },
        { a: ((50 - 90) * Math.PI) / 180, l: R * 0.42, wd: 2.6 },
      ];
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
          let v = 0.08 + hash(x, y) * 0.07;
          const ring = Math.abs(d - R);
          if (ring < gap * 0.7) v = 0.95;
          else if (Math.abs(d - R * 0.9) < gap * 0.5 && Math.round(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 60) % 5 === 0) v = 0.8;
          else if (d < R * 0.9) {
            v = 0.12 + hash(x, y) * 0.08;
            for (const hd of hands) {
              const along = dx * Math.cos(hd.a) + dy * Math.sin(hd.a);
              const off = Math.abs(-dx * Math.sin(hd.a) + dy * Math.cos(hd.a));
              if (along > -gap && along < hd.l && off < gap * 0.45 * hd.wd) v = 0.95;
            }
            if (d < gap * 0.9) v = 1;
          }
          // crown
          if (Math.abs(dy) < gap * 1.2 && dx > R && dx < R + gap * 2.2) v = 0.9;
          const twinkle = 0.06 * Math.sin(t * 2 + hash(y, x) * 20);
          const frozen = wave >= 0 && d / (Math.hypot(w, h) * 0.6) < wave;
          const a = Math.max(0, Math.min(1, v + twinkle));
          const r = v > 0.5 ? gap * 0.3 : gap * 0.2;
          ctx.fillStyle = frozen ? `rgba(255,69,38,${v > 0.5 ? a : a * 0.9})` : `rgba(236,234,228,${a})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [cycle]);
  return <canvas ref={ref} className={`lattice ${className}`} aria-hidden />;
}

/** Small dot-matrix icon from a pattern of rows ("#" lit, "+" accent, "." dim). */
export function DotIcon({ rows, className = "" }: { rows: string[]; className?: string }) {
  const n = rows[0].length;
  return (
    <svg viewBox={`0 0 ${n * 10} ${rows.length * 10}`} className={`doticon ${className}`} aria-hidden>
      {rows.flatMap((r, y) => [...r].map((ch, x) => (
        <circle key={`${x}-${y}`} cx={x * 10 + 5} cy={y * 10 + 5} r={ch === "." ? 1.6 : 3.4} className={ch === "#" ? "on" : ch === "+" ? "acc" : "off"} />
      )))}
    </svg>
  );
}
