"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MintButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function mint() {
    setBusy(true); setErr("");
    const r = await fetch("/api/mint", { method: "POST" }).then((x) => x.json()).catch((e) => ({ error: String(e) }));
    if (r.error) { setErr(r.error); setBusy(false); return; }
    sessionStorage.setItem(`halte:${r.id}`, JSON.stringify([{ kind: "ok", text: "Passport issued · active", tx: r.tx.url, small: `block ${Number(r.tx.block).toLocaleString("en-US")}` }]));
    router.push(`/p/${r.id}`);
  }
  return (
    <>
      <button className="btn" data-demo="mint" onClick={mint} disabled={busy}>
        {busy ? "Issuing on Diana…" : "Issue a demo passport"} <span aria-hidden>→</span>
      </button>
      {err && <p className="err">{err}</p>}
    </>
  );
}
