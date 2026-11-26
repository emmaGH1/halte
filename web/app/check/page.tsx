"use client";
import { useState } from "react";
import deployment from "@/lib/deployment.json";
import { SiteFooter, SiteNav, Wordmark } from "../ui";

/** Paste a passport link or id; go to its counter check. Accepts /p/…, /check/… or a bare 0x id, keeps ?offer=. */
export default function CheckIndex() {
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  function go(e: React.FormEvent) {
    e.preventDefault();
    const id = v.match(/0x[0-9a-fA-F]{64}/)?.[0];
    if (!id) return setErr("That doesn't contain a passport id (0x followed by 64 hex characters).");
    const offer = v.match(/[?&]offer=(\d{1,12})/)?.[1] ?? v.match(/^\s*#?(\d{1,12})\s*$/m)?.[1];
    location.href = `/check/${id.toLowerCase()}${offer ? `?offer=${offer}` : ""}`;
  }
  return (
    <div className="paper" id="top">
      <div className="grain" aria-hidden />
      <SiteNav brand={<Wordmark />} refText="Counter check" links={[{ href: "/#how", label: "How it works" }, { href: "/#quantum", label: "Quantum-safe" }, { href: "https://github.com/emmaGH1/halte", label: "Source", ext: true }]} cta={{ href: "/", label: "New passport" }} />
      <main className="pp counter">
        <span className="mono kicker">Dealer&apos;s counter · read-only check · QoreChain Diana</span>
        <div className="verdict wait"><h1>Check a passport <em>before you accept it.</em></h1><p>Scan the QR on a passport card with your phone camera, or paste its link here.</p></div>
        <form className="paste" onSubmit={go}>
          <label className="mono" htmlFor="pl">Passport link or id</label>
          <input id="pl" value={v} onChange={(e) => { setV(e.target.value); setErr(""); }} placeholder="https://…/p/0x…?offer=2" autoComplete="off" spellCheck={false} />
          <button className="ink" type="submit">Check it</button>
        </form>
        {err && <p className="err" role="alert">{err}</p>}
        <p className="fine">Try the finished run: <a href={`/check/0xbed648483ebb7c1bb1ccb005a5f858540739d25789bc21ea1547803dac915fcd?offer=2`}>passport HLT-BED6-4848, offer #2</a>, reported missing and then recovered, so its old offer stays dead.</p>
      </main>
      <div className="night"><SiteFooter deployTx={deployment.deployTx} /></div>
    </div>
  );
}
