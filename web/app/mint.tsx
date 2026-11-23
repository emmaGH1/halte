"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const RECORDED = "https://github.com/emmaGH1/halte/blob/main/evidence/release/0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4.json";

export function MintButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ text: string; recorded: boolean } | null>(null);
  async function mint() {
    setBusy(true); setErr(null);
    const res = await fetch("/api/mint", { method: "POST", headers: { "idempotency-key": crypto.randomUUID() } }).catch(() => null);
    const r = res ? await res.json().catch(() => ({ error: "Unreadable answer from the server." })) : { error: "Network error: the request never reached Halte." };
    if (r.error) { setErr({ text: r.error, recorded: ["read-only", "rate-limited", "daily-cap", "transport"].includes(r.code) }); setBusy(false); return; }
    router.push(`/p/${r.id}?min=${r.tx.block}#k=${r.key}`);
  }
  return (
    <>
      <button className="btn" data-demo="mint" onClick={mint} disabled={busy}>
        {busy ? "Issuing on Diana…" : "Issue a demo passport"} <span aria-hidden>→</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">{busy ? "Issuing a passport on QoreChain Diana" : ""}</span>
      {err && (
        <p className="err" role="alert">
          {err.text} {err.recorded && <a href={RECORDED} target="_blank" rel="noreferrer">See the recorded run ↗</a>}
        </p>
      )}
    </>
  );
}
