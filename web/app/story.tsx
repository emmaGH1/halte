"use client";
import { useEffect, useRef, useState } from "react";
import replay from "@/lib/replay.json";

/**
 * "See it in 60 seconds": the recorded run on Diana told as a story in plain words. Every scene links its
 * real transaction, and the three "can the shop buy?" answers are asked again on Diana when the page opens,
 * pinned to the blocks where they were first asked.
 */
type Answer = { outcome: string; match: boolean };
const tx = (h: string) => `https://explore.qore.network/tx/${h.replace(/^0x/, "").toUpperCase()}`;
const hash = (label: string) => replay.steps.find((s) => s.label === label)!.hash!;

type Scene = {
  title: string;
  body: string;
  status: "active" | "stolen" | "found";
  verdict?: { ok: boolean; text: string; check: number };
  proof?: { label: string; hash: string };
  arrow?: "offer" | "refused";
};

const SCENES: Scene[] = [
  {
    title: "Ana owns a watch.",
    body: "It has a Halte passport on QoreChain. Only Ana's key can sell it or report it stolen, and that key is quantum-safe.",
    status: "active",
    proof: { label: "Passport issued", hash: hash("mint (owner)") },
  },
  {
    title: "She offers it to Bob's shop.",
    body: "Ana signs an offer to Bob. Before paying, Bob scans the passport and asks the chain.",
    status: "active",
    arrow: "offer",
    verdict: { ok: true, text: "Bob can buy it.", check: 0 },
    proof: { label: "Ana's signed offer", hash: hash("PQ-signed offer to the dealer, relayed by the dealer") },
  },
  {
    title: "The watch is stolen. Ana reports it.",
    body: "One signature from Ana's phone. Same shop, same offer, a minute later:",
    status: "stolen",
    arrow: "refused",
    verdict: { ok: false, text: "Bob is refused.", check: 1 },
    proof: { label: "Ana's stolen report", hash: hash("owner's ML-DSA-87 report (freeze), relayed by the dealer") },
  },
  {
    title: "The watch is found.",
    body: "Ana marks it recovered. Bob's old offer still had 59 minutes left, yet it stays dead: any deal made before or during the theft can never come back.",
    status: "found",
    arrow: "refused",
    verdict: { ok: false, text: "Old offer: still refused.", check: 2 },
    proof: { label: "Ana's recovery", hash: hash("owner's ML-DSA-87 recovery, relayed by the dealer") },
  },
  {
    title: "Why quantum-safe?",
    body: "Quantum computers are expected to break the keys most wallets use today. A thief with a broken key could then fake Ana's report or sell her watch. Halte only obeys Ana's post-quantum signature (ML-DSA-87), checked inside the contract on QoreChain.",
    status: "found",
  },
];

const STATUS = { active: "Active", stolen: "Stolen", found: "Recovered" } as const;
const SAY: Record<string, string> = { "would succeed": "can buy", PassportFrozen: "refused (reported stolen)", StaleOffer: "refused (offer dead)" };
const STEP_MS = 11_000;

export function Story() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [answers, setAnswers] = useState<Answer[] | null | "off">(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch("/api/replay", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setAnswers(j.results ?? "off"))
      .catch(() => setAnswers("off"));
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!playing) return;
    if (i >= SCENES.length - 1) { setPlaying(false); return; }
    timer.current = setTimeout(() => setI((x) => x + 1), STEP_MS);
    return () => clearTimeout(timer.current);
  }, [playing, i]);

  const s = SCENES[i];
  const last = i === SCENES.length - 1;
  const go = (n: number) => { setPlaying(false); setI(Math.max(0, Math.min(SCENES.length - 1, n))); };
  const a = s.verdict && Array.isArray(answers) ? answers[s.verdict.check] : null;

  return (
    <section className="story" data-demo="story" aria-roledescription="story" aria-label="See it in 60 seconds">
      <div className="story-top">
        <span className="mono">See it in 60 seconds</span>
        <div className="dots" role="tablist" aria-label="Scenes">
          {SCENES.map((_, k) => (
            <button key={k} role="tab" aria-selected={k === i} aria-label={`Scene ${k + 1}`} className={k === i ? "on" : k < i ? "done" : ""} onClick={() => go(k)}>
              {playing && k === i && <i style={{ animationDuration: `${STEP_MS}ms` }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="stage" key={i} data-demo={`story-scene-${i + 1}`}>
        <div className="cast" aria-hidden>
          <div className="who"><span className="face">A</span><small>Ana · owner</small></div>
          <div className={`wire ${s.arrow ?? ""}`}>
            <span className={`pp-chip ${s.status}`}>⌚ Passport · {STATUS[s.status]}</span>
            {s.arrow && <span className="line" />}
          </div>
          <div className={`who ${s.arrow ? "" : "dim"}`}><span className="face shop">B</span><small>Bob&apos;s shop</small></div>
        </div>

        <h2>{s.title}</h2>
        <p>{s.body}</p>

        {s.verdict && (
          <div className={`say ${s.verdict.ok ? "yes" : "no"}`} data-demo="story-verdict">
            <b>{s.verdict.ok ? "✓" : "✕"} {s.verdict.text}</b>
            <small>
              {a ? <>QoreChain, asked just now: <em>{SAY[a.outcome] ?? a.outcome}</em>{a.match ? "" : " (differs from the record)"}</>
                : answers === "off" ? "As recorded on QoreChain" : "Asking QoreChain…"}
            </small>
          </div>
        )}

        {last && (
          <div className="say yes">
            <b>Every step above is a real transaction on QoreChain&apos;s test network.</b>
            <small>Now try it yourself: issue a passport, report it stolen, and watch the shop get refused.</small>
          </div>
        )}

        {s.proof && (
          <a className="proof" href={tx(s.proof.hash)} target="_blank" rel="noreferrer">{s.proof.label}: real transaction ↗</a>
        )}
      </div>

      <div className="story-act">
        {i === 0 && !playing ? (
          <button className="btn" data-demo="story-play" onClick={() => { setPlaying(true); }}>▶ Play the story</button>
        ) : last ? (
          <a className="btn" href="#try" data-demo="story-try">Try it yourself ↓</a>
        ) : (
          <button className="btn" data-demo="story-next" onClick={() => go(i + 1)}>Next →</button>
        )}
        {i > 0 && <button className="ghost" onClick={() => go(i - 1)}>Back</button>}
        {i === 0 && !playing && <button className="ghost" onClick={() => go(1)}>Step through</button>}
      </div>
    </section>
  );
}
