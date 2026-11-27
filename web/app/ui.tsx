"use client";
import { useEffect, useRef, useState } from "react";
import { heldMark, movement, type Geometry } from "@/lib/art";
import { deployTxUrl } from "@/lib/tx-url";

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

type NavLink = { href: string; label: string; ext?: boolean };

/** Sticky site header. Desktop: numbered links + CTA. Mobile: a menu button that opens a full-screen sheet. */
export function SiteNav({ brand, refText, links, cta }: { brand: React.ReactNode; refText?: string; links: NavLink[]; cta?: NavLink }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const burger = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) {
      if (wasOpen.current) burger.current?.focus(); // hand focus back to the button that opened the menu
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const items = () => [burger.current, ...Array.from(sheet.current?.querySelectorAll<HTMLElement>("a") ?? [])].filter(Boolean) as HTMLElement[];
    items()[1]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab") return;
      const all = items(), first = all[0], last = all[all.length - 1]; // keep Tab inside the open menu
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  const ext = (l: NavLink) => (l.ext ? { target: "_blank", rel: "noreferrer" } : {});
  return (
    <header className={`site${scrolled ? " scrolled" : ""}${open ? " open" : ""}`}>
      <div className="site-in">
        {brand}
        {refText && <span className="mono ref">{refText}</span>}
        <nav className="desk mono" aria-label="Primary">
          {links.map((l, i) => <a key={l.href} href={l.href} {...ext(l)}><b>{String(i + 1).padStart(2, "0")}</b>{l.label}</a>)}
          {cta && <a className="nav-cta" href={cta.href}>{cta.label} <span aria-hidden>→</span></a>}
        </nav>
        <button ref={burger} className="burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>
          <span /><span />
        </button>
      </div>
      <div id="site-menu" ref={sheet} className="sheet" hidden={!open} role="dialog" aria-modal="true" aria-label="Menu">
        <nav aria-label="Menu">
          {links.map((l, i) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} {...ext(l)}>
              <span className="mono">{String(i + 1).padStart(2, "0")}</span><em>{l.label}</em>{l.ext && <i aria-hidden>↗</i>}
            </a>
          ))}
        </nav>
        {cta && <a className="sheet-cta" href={cta.href} onClick={() => setOpen(false)}>{cta.label} <span aria-hidden>→</span></a>}
        <p className="mono sheet-foot"><span className="live">QoreChain Diana testnet</span></p>
      </div>
    </header>
  );
}

/** Dark caseback footer: brand, three columns, a large engraved wordmark, base line. */
export function SiteFooter() {
  const gh = "https://github.com/emmaGH1/halte";
  return (
    <footer className="foot">
      <div className="foot-top">
        <div className="foot-brand">
          <a href="/" className="wordmark" aria-label="Halte home"><HeldLogo mode="frozen" size={30} /><span>HALTE</span></a>
          <p className="foot-tag">Stolen watches, <em>unsellable.</em></p>
          <p className="foot-note">The stolen-watch check for dealers, marketplaces and insurers. Every offer, report and recovery is signed with the owner&apos;s ML-DSA-87 key and checked on chain.</p>
        </div>
        <div className="foot-cols">
          <div><span className="mono">Navigate</span><a href="/#how">How it works</a><a href="/#proof">Proof</a><a href="/">Issue a passport</a></div>
          <div><span className="mono">On chain</span><a href={deployTxUrl} target="_blank" rel="noreferrer">Deploy transaction ↗</a><span>Diana testnet</span></div>
          <div><span className="mono">Project</span><a href={gh} target="_blank" rel="noreferrer">Source ↗</a><a href={`${gh}/blob/main/docs/AUDIT.md`} target="_blank" rel="noreferrer">QCAI audit ↗</a><span>Apache-2.0</span></div>
        </div>
      </div>
      <div className="foot-mark" aria-hidden>HALTE</div>
      <div className="foot-base mono">
        <span>Built for Build Before Q-Day · 2026</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
