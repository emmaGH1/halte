"use client";
import { useState } from "react";
import replay from "@/lib/replay.json";

type R = { block: string; expected: string; outcome: string; match: boolean };
const short = (s: string) => `${s.slice(0, 8)}…${s.slice(-4)}`;
const n = (s: string) => Number(s).toLocaleString("en-US");
const tx = (h: string) => `https://explore.qore.network/tx/${h.replace(/^0x/, "").toUpperCase()}`;
const EVIDENCE = "https://github.com/emmaGH1/halte/blob/main/evidence/release/0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4.json";

const TITLE: Record<string, string> = {
  "mint (owner)": "Passport issued",
  "PQ-signed offer to the dealer, relayed by the dealer": "Owner signs offer #2 to the dealer (ML-DSA-87)",
  "owner's ML-DSA-87 report (freeze), relayed by the dealer": "Reported missing (owner's ML-DSA-87 signature)",
  "owner's ML-DSA-87 recovery, relayed by the dealer": "Found and recovered (owner's ML-DSA-87 signature)",
};
const SAY: Record<string, string> = { "would succeed": "would accept", PassportFrozen: "refused · PassportFrozen", StaleOffer: "refused · StaleOffer" };

export function Replay() {
  const [res, setRes] = useState<R[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function ask() {
    setBusy(true); setErr("");
    const r = await fetch("/api/replay", { cache: "no-store" }).then((x) => x.json()).catch(() => ({ error: "Network error." }));
    setBusy(false);
    if (r.error) setErr(r.error); else setRes(r.results);
  }
  let k = 0;
  return (
    <div className="replay">
      <ol className="rp-steps">
        {replay.steps.map((s, i) => {
          if (s.kind === "tx") {
            return (
              <li key={i} className="tx">
                <span className="mono">block {n(s.block)}</span>
                <b>{TITLE[s.label] ?? s.label}</b>
                <a href={tx(s.hash!)} target="_blank" rel="noreferrer">tx ↗</a>
              </li>
            );
          }
          const r = res?.[k++];
          const result = r ? r.outcome : s.expected!;
          return (
            <li key={i} className={`ask ${result === "would succeed" ? "yes" : "no"}`} data-demo="replay-check">
              <span className="mono">block {n(s.block)}</span>
              <b>Can dealer {short(replay.dealer)} accept offer #{replay.offerId}? <em>{SAY[result] ?? result}</em></b>
              <span className="mono tag">{r ? (r.match ? "Diana answered just now ✓" : "Diana's answer differs from the record") : "recorded"}</span>
            </li>
          );
        })}
      </ol>
      <div className="rp-act">
        <button className="ghost" data-demo="replay" onClick={ask} disabled={busy}>{busy ? "Asking Diana…" : res ? "Ask Diana again" : "Replay it on Diana now"}</button>
        <a className="link" href={EVIDENCE} target="_blank" rel="noreferrer">The recorded run ↗</a>
      </div>
      <span className="sr-only" role="status" aria-live="polite">{busy ? "Asking Diana" : res ? "Diana answered all three questions" : ""}</span>
      {err && <p className="err" role="alert">{err}</p>}
      <details className="rp-verify">
        <summary className="mono">Verify independently</summary>
        <p>The same read-only call, pinned to each block. Any EVM client works; nothing is signed or sent:</p>
        <pre>{`curl -s https://evm-testnet.qore.host -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"from":"${replay.dealer}","to":"0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4","data":"0xc815729d${BigInt(replay.offerId).toString(16).padStart(64, "0")}"},"0x${(10611677).toString(16)}"]}'`}</pre>
        <p>Change the last value to <code>0x{(10611671).toString(16)}</code> (before the report: no error) or <code>0x{(10611679).toString(16)}</code> (after recovery: <code>0xef8d77e3</code>, StaleOffer). At block 10,611,677 Diana answers <code>0xdd656228</code>, PassportFrozen.</p>
      </details>
    </div>
  );
}
