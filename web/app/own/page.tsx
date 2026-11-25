"use client";
import { useEffect, useState } from "react";
import deployment from "@/lib/deployment.json";
import type { Saved, Step } from "@/lib/own";
import { SiteFooter, SiteNav, Wordmark } from "../ui";

const own = () => import("@/lib/own"); // the SDK loads only here and on your own passport

export default function Own() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [reveal, setReveal] = useState(false);

  useEffect(() => { own().then((m) => { setSteps(m.STEPS.map((s) => ({ ...s }))); setSaved(m.load()); }); }, []);

  async function start() {
    setBusy(true); setErr("");
    const m = await own();
    setSteps(m.STEPS.map((s) => ({ ...s })));
    try {
      const id = await m.onboard((key, patch) => setSteps((prev) => prev!.map((s) => (s.key === key ? { ...s, ...patch } : s))));
      setSaved(m.load());
      location.href = `/p/${id}`;
    } catch (e) {
      setErr((e as Error).message);
      setSaved(m.load());
    } finally {
      setBusy(false);
    }
  }

  async function startOver() {
    if (!confirm("Forget the key in this browser? Without its recovery phrase, its passport can't be changed again.")) return;
    (await own()).forget();
    setSaved(null); setSteps((await own()).STEPS.map((s) => ({ ...s }))); setReveal(false);
  }

  const started = steps?.some((s) => s.state !== "todo");
  return (
    <div className="paper" id="top">
      <div className="grain" aria-hidden />
      <SiteNav brand={<Wordmark />} refText="Hold your own key" links={[{ href: "/#method", label: "Method" }, { href: "/check", label: "Check a passport" }, { href: "https://github.com/emmaGH1/halte", label: "Source", ext: true }]} cta={{ href: "/", label: "Hosted demo" }} />
      <main className="pp counter own">
        <span className="mono kicker">Self-custody trial · QoreChain Diana testnet</span>
        <div className="verdict wait">
          <h1>Hold your own key. <em>Halte never sees it.</em></h1>
          <p>
            Your browser generates the keys, registers your ML-DSA-87 key on QoreChain and issues a passport from your own address.
            Every offer, report and recovery is then signed here, on this device. Halte only funds the new account with test QOR and
            relays what you signed. The contract checks each signature against your registered key.
          </p>
        </div>

        <ol className="own-steps" aria-live="polite">
          {steps?.map((s, i) => (
            <li key={s.key} className={s.state} data-demo={`own-step-${s.key}`} data-state={s.state}>
              <span className="mono idx">{s.state === "done" ? "✓" : s.state === "failed" ? "✕" : String(i + 1).padStart(2, "0")}</span>
              <div>
                {s.label}{s.state === "doing" ? "…" : ""}
                {s.tx && <> · <a href={s.tx} target="_blank" rel="noreferrer">tx ↗</a></>}
                {s.note && <small>{s.note}</small>}
              </div>
            </li>
          ))}
        </ol>

        {saved?.passport ? (
          <div className="own-act">
            <a className="btn ink" href={`/p/${saved.passport}`} data-demo="own-open">Open my passport →</a>
          </div>
        ) : (
          <div className="own-act">
            <button className="ink" data-demo="own-start" onClick={start} disabled={busy || !steps}>
              {busy ? "Working… keep this page open" : saved ? "Carry on where it stopped" : "Generate my key and issue a passport"}
            </button>
          </div>
        )}
        {err && <p className="err" role="alert">{err} {started && "Press the button again to carry on; finished steps are skipped."}</p>}

        {saved && (
          <section className="own-key">
            <h2 className="mono">Your key in this browser</h2>
            <p>Address <b className="m">{saved.evm}</b></p>
            <p>Native <b className="m">{saved.cosmos}</b></p>
            <p>
              Its recovery phrase is stored only in this browser&apos;s local storage. Write it down to keep control of the passport on another
              device; anyone with it controls the passport. Testnet only.
            </p>
            <button className="ghost" onClick={() => setReveal((v) => !v)}>{reveal ? "Hide recovery phrase" : "Show recovery phrase"}</button>
            {reveal && <p className="phrase m" data-demo="own-phrase">{saved.mnemonic}</p>}
            <button className="linkish" onClick={startOver}>Forget this key and start over</button>
          </section>
        )}

        <p className="fine">
          Takes about 30 seconds and four transactions. Limited to a few new keys per visitor every ten minutes. What&apos;s still trusted:
          Halte&apos;s server ships this page&apos;s code, and the dealer account relays your signatures (it can refuse to, but it can&apos;t change them).
          The demo dealer&apos;s key stays hosted: it&apos;s a different party.
        </p>
      </main>
      <div className="night"><SiteFooter deployTx={deployment.deployTx} /></div>
    </div>
  );
}
