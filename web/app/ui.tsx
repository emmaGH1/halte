"use client";
import { useEffect, useState } from "react";
import { heldMark, movement, type Geometry } from "@/lib/art";

/** The Halte mark. "ticking": the hand sweeps; "frozen": it stops and the red wedge shows the held time. */
export function HeldLogo({ mode = "static", size = 28 }: { mode?: "static" | "ticking" | "frozen"; size?: number }) {
  const [deg, setDeg] = useState(84);
  useEffect(() => {
    if (mode !== "ticking") return;
    setDeg((new Date().getSeconds() * 6) % 360);
    const t = setInterval(() => setDeg((d) => (d + 6) % 360), 1000);
    return () => clearInterval(t);
  }, [mode]);
  const stop = mode === "static" ? 84 : deg;
  const a = ((stop - 90) * Math.PI) / 180;
  const [hx, hy] = [70 * Math.cos(a), 70 * Math.sin(a)];
  return (
    <svg viewBox="-100 -100 200 200" width={size} height={size} className={`held ${mode}`} aria-hidden>
      <g dangerouslySetInnerHTML={{ __html: heldMark({ stop: Math.max(stop, 1), wedge: mode !== "ticking" }) }} />
      <line x1="0" y1="0" x2={hx.toFixed(1)} y2={hy.toFixed(1)} stroke="currentColor" strokeWidth="9" className="hand" />
      <circle r="11" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ mode = "static" as "static" | "ticking" | "frozen" }) {
  return (
    <a href="/" className="wordmark" aria-label="Halte home">
      <HeldLogo mode={mode} />
      <span>HALTE</span>
    </a>
  );
}

/** The calibre drawing. `stopped` swings the lever in and halts the balance wheel mid-beat. */
export function Calibre({ geo, viewBox, stopped, uid, className = "" }: { geo: Geometry; viewBox: string; stopped: boolean; uid: string; className?: string }) {
  const m = movement(geo, uid);
  return (
    <svg viewBox={viewBox} className={`calibre ${stopped ? "stopped" : "running"} ${className}`} aria-hidden preserveAspectRatio="xMidYMid slice">
      <g dangerouslySetInnerHTML={{ __html: m.svg }} />
    </svg>
  );
}

/** A round seal with a circular legend and the held-time mark. */
export function Seal({ text, show, tone = "red", size = 150 }: { text: string; show: boolean; tone?: "red" | "grey"; size?: number }) {
  const r = 92;
  return (
    <svg viewBox="-100 -100 200 200" width={size} height={size} className={`seal ${show ? "in" : ""} ${tone}`} aria-hidden>
      <defs><path id={`seal-${tone}`} d={`M -73 0 A 73 73 0 1 1 73 0 A 73 73 0 1 1 -73 0`} /></defs>
      <circle r={r} className="s2" /><circle r={r - 7} className="s1" /><circle r={r * 0.56} className="s1" />
      <text className="st"><textPath href={`#seal-${tone}`}>{text}</textPath></text>
      <g transform="scale(0.44)" dangerouslySetInnerHTML={{ __html: heldMark({ stop: 84 }) }} />
      <g transform="scale(0.44)"><line x1="0" y1="0" x2="69.6" y2="-7.3" stroke="currentColor" strokeWidth="9" /><circle r="11" fill="currentColor" /></g>
    </svg>
  );
}

/** Landing-page hero art: the calibre runs, then the stop lever engages and the seal lands. */
export function HeroArt() {
  const [stopped, setStopped] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStopped(true), 2600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="hero-art">
      <Calibre geo={{ cx: 520, cy: 520, R: 404 }} viewBox="0 0 1040 1040" stopped={stopped} uid="hero" />
      <div className="hero-seal"><Seal text="PASSPORT FROZEN · ONE SIGNATURE · ONE BLOCK · " show={stopped} size={170} /></div>
    </div>
  );
}
