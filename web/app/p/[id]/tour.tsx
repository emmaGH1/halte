"use client";
import { useEffect, useState } from "react";

/**
 * Guided tour over the real passport page: a card at the bottom of the screen says what to tap next and
 * highlights that real button. The step is read from the passport's own state on Diana, so the tour never
 * runs ahead of the chain.
 */
type Check = { demo: string; text: string; block: string };
type Ev = { event: string; block: string };
type Props = { id: string; yours: boolean; status: string; offerLive: boolean; checks: Check[]; history: Ev[]; busy: string };

const STEPS: { target?: string; title: string; body: string }[] = [
  { target: "offer", title: "Offer it to a dealer", body: "You own this watch. To sell it, tap “The owner offers it to a dealer”. Your quantum-safe key signs the offer." },
  { target: "dealer-accept", title: "The dealer checks before paying", body: "Now you're the dealer. Tap “The dealer tries to buy it”. QoreChain answers whether this sale would go through." },
  { target: "report-missing", title: "Your watch is stolen", body: "✓ The dealer could buy it. Now imagine the watch is stolen. Tap “Report missing”: one signature and the passport freezes." },
  { target: "dealer-accept", title: "The thief walks into the shop", body: "Same dealer, same offer. Tap “The dealer tries to buy it” again." },
  { target: "recover", title: "The watch is found", body: "✕ Refused: a stolen watch can't be sold. Now the watch turns up. Tap “The owner recovers the watch”." },
  { target: "dealer-accept", title: "Does the old deal come back?", body: "The passport is active again. Tap “The dealer tries to buy it” one more time." },
  { title: "Stolen means unsellable", body: "✕ Still refused. The report killed every older offer for good, so a deal arranged around a theft can never be used. Each step above is a real transaction on QoreChain: tap “view tx” in the register." },
];

const after = (checks: Check[], block?: string) =>
  !!block && checks.some((c) => c.text.startsWith("The dealer tries") && Number(c.block) >= Number(block));

function stepOf(p: Props): number {
  const last = (e: string) => [...p.history].reverse().find((h) => h.event === e)?.block;
  if (p.status === "frozen") return after(p.checks, last("Frozen")) ? 4 : 3;
  const rec = last("Recovered");
  if (rec) return after(p.checks, rec) ? 6 : 5;
  if (!p.offerLive) return 0;
  return p.checks.some((c) => c.demo === "accept-would-succeed") ? 2 : 1;
}

export function Tour(p: Props) {
  const [on, setOn] = useState(false);
  const key = `halte:tour:${p.id}`;
  useEffect(() => {
    try {
      if (new URLSearchParams(location.search).get("tour") === "1") sessionStorage.setItem(key, "1");
      setOn(sessionStorage.getItem(key) === "1");
    } catch {}
  }, [key]);

  const i = stepOf(p);
  const s = STEPS[i];
  const active = on && p.yours && p.status !== "…";

  useEffect(() => {
    document.body.classList.toggle("touring", active);
    if (!active || !s.target || p.busy) return;
    const el = document.querySelector<HTMLElement>(`[data-demo="${s.target}"]`);
    if (!el) return;
    el.classList.add("tour-target");
    const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    return () => { clearTimeout(t); el.classList.remove("tour-target"); };
  }, [active, i, s.target, p.busy]);
  useEffect(() => () => document.body.classList.remove("touring"), []);

  if (!active) return null;
  const end = () => { try { sessionStorage.removeItem(key); } catch {} setOn(false); };
  return (
    <aside className="tour" data-demo="tour-card" data-step={i + 1} aria-live="polite">
      <div className="tour-top">
        <span className="mono">Guided tour · {i + 1} of {STEPS.length}</span>
        <button className="linkish" onClick={end}>{i === STEPS.length - 1 ? "Close" : "Exit tour"}</button>
      </div>
      <div className="tour-bar"><i style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} /></div>
      <h3>{s.title}</h3>
      <p>{p.busy ? "Signing and sending to QoreChain… this takes about 10 seconds." : s.body}</p>
      {i === STEPS.length - 1 && (
        <div className="tour-act">
          <a className="btn" href="#break" onClick={end}>Now try to break it ↓</a>
        </div>
      )}
    </aside>
  );
}
