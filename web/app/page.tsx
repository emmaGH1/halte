"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function mint() {
    setBusy(true); setErr("");
    const r = await fetch("/api/mint", { method: "POST" }).then((x) => x.json()).catch((e) => ({ error: String(e) }));
    if (r.error) { setErr(r.error); setBusy(false); return; }
    sessionStorage.setItem(`halte:${r.id}`, JSON.stringify([{ kind: "ok", text: "Passport minted · active", tx: r.tx.url }]));
    router.push(`/p/${r.id}`);
  }
  return (
    <main>
      <div className="brand"><span className="mark" aria-hidden /> Halte</div>
      <h1>Stolen means unsellable.</h1>
      <p className="lede">
        Every watch gets a passport on QoreChain. Report it missing and the passport freezes: every open dealer offer dies at once.
        Only the owner&apos;s post-quantum key can freeze it or lift the freeze. A stolen ordinary key can&apos;t.
      </p>
      <button className="red" data-demo="mint" onClick={mint} disabled={busy}>
        {busy ? "Minting on Diana…" : "Mint a demo passport"}
      </button>
      {err && <p className="err">{err}</p>}
      <p className="note">
        Runs on QoreChain Diana testnet. For this demo the owner&apos;s ML-DSA-87 key is held by the Halte server, so you can try it
        without a wallet. Every step is a real Diana transaction or a live check against Diana, linked as you go.
      </p>
    </main>
  );
}
