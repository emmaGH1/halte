"use client";
import { useState } from "react";

/** "Plug it in": the one call a marketplace, dealer or insurer makes before paying, run live against Diana. */
const ID = "0xbed648483ebb7c1bb1ccb005a5f858540739d25789bc21ea1547803dac915fcd";
const SAY: Record<string, { tone: "go" | "stop" | "wait"; text: string }> = {
  "can-accept": { tone: "go", text: "Sellable. The deal would go through." },
  "reported-missing": { tone: "stop", text: "Do not buy. The owner reported it stolen." },
  "offer-dead": { tone: "stop", text: "Do not buy. This deal was made around a theft report and is dead for good." },
  "offer-expired": { tone: "wait", text: "Expired. Ask the owner for a new offer." },
  "offer-closed": { tone: "wait", text: "Closed. This offer was already used or withdrawn." },
  "offer-mismatch": { tone: "stop", text: "Do not buy. The offer belongs to another item." },
  "no-offer": { tone: "wait", text: "No such offer." },
  clear: { tone: "go", text: "Not reported stolen." },
};

export function Plug() {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ json: string; verdict?: string; block?: string } | null>(null);
  async function run() {
    setBusy(true);
    const res = await fetch(`/api/check/${ID}?offer=2`, { cache: "no-store" }).catch(() => null);
    const j = res ? await res.json().catch(() => null) : null;
    setBusy(false);
    if (!j) { setOut({ json: "// Diana did not answer. Try again in a moment." }); return; }
    const slim = j.error ? j : { verdict: j.verdict, status: j.passport?.status, offer: j.offer?.id, outcome: j.offer?.outcome, block: j.block };
    setOut({ json: JSON.stringify(slim, null, 2), verdict: j.verdict, block: j.block });
  }
  const say = out?.verdict ? SAY[out.verdict] : null;
  return (
    <div className="plug" data-demo="plug">
      <div className="plug-tabs mono"><span>Before you pay</span><span className="dim">one HTTPS call · or one contract read</span></div>
      <pre className="code"><span className="dim">GET</span> /api/check/{ID.slice(0, 10)}…{ID.slice(-4)}<span className="dim">?offer=2</span></pre>
      <button className="btn" onClick={run} disabled={busy} data-demo="plug-run">
        {busy ? "Asking QoreChain…" : out ? "Ask again" : "Run it live"} <span aria-hidden>→</span>
      </button>
      {out && (
        <div className="plug-out" aria-live="polite">
          {say && <p className={`plug-say ${say.tone}`} data-demo="plug-verdict"><b>{say.tone === "go" ? "✓" : say.tone === "stop" ? "✕" : "…"}</b> {say.text}</p>}
          <pre className="code res">{out.json}</pre>
          {out.block && <p className="fine">Answered by QoreChain Diana at block {Number(out.block).toLocaleString("en-US")}. This is the real passport from our recorded run: stolen, found, and its old deal is still refused.</p>}
        </div>
      )}
      <pre className="code sol"><span className="dim">{"// or from your own contract on QoreChain"}</span>{"\n"}halte.statusOf(passportId) <span className="dim">{"// 1 active · 2 stolen"}</span></pre>
    </div>
  );
}
