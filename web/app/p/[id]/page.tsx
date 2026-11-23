"use client";
import { use, useEffect, useState } from "react";
import { guillocheBand, rosette } from "@/lib/art";
import { Calibre, Seal, Wordmark } from "../../ui";

type Step = { kind: "ok" | "no" | "info"; text: string; tx?: string; small?: string; demo?: string };
type P = { id: string; owner: string; status: string; epoch: number; nonce: string; keyBytes?: number; offer: null | { id: string; open: boolean; live: boolean; dealer: string }; contract: string };
type Sig = { hex: string; block?: string; kind: "freeze" | "recover" };

const short = (s: string) => `${s.slice(0, 10)}…${s.slice(-6)}`;
const BAND = guillocheBand(640, 70);
const ROSE = rosette(150, 9, 18, 22);

export default function Passport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [p, setP] = useState<P | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [sig, setSig] = useState<Sig | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setOfferId(new URLSearchParams(location.search).get("offer"));
    try { setSteps(JSON.parse(sessionStorage.getItem(`halte:${id}`) ?? "[]")); } catch {}
    try { setSig(JSON.parse(sessionStorage.getItem(`halte:sig:${id}`) ?? "null")); } catch {}
  }, [id]);

  async function refresh(o = offerId) {
    const r = await fetch(`/api/passport/${id}${o ? `?offer=${o}` : ""}`, { cache: "no-store" }).then((x) => x.json());
    if (!r.error) setP(r);
  }
  useEffect(() => { refresh(); }, [id, offerId]); // eslint-disable-line

  function push(s: Step) {
    setSteps((prev) => {
      const next = [...prev, s];
      try { sessionStorage.setItem(`halte:${id}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  function keepSig(s: Sig) {
    setSig(s);
    try { sessionStorage.setItem(`halte:sig:${id}`, JSON.stringify(s)); } catch {}
  }

  async function act(action: string, body: object, label: string) {
    setBusy(label); setErr("");
    const r = await fetch(`/api/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then((x) => x.json()).catch((e) => ({ error: String(e) }));
    setBusy("");
    if (r.error) { setErr(r.error); return null; }
    return r;
  }

  async function offer() {
    const r = await act("offer", { id }, "offer");
    if (!r) return;
    history.replaceState(null, "", `/p/${id}?offer=${r.offerId}`);
    await refresh(r.offerId);
    setOfferId(r.offerId);
    push({ kind: "ok", text: `Dealer offer #${r.offerId} opened`, tx: r.tx.url, small: `dealer ${short(r.dealer)} · epoch-stamped` });
  }
  async function freeze() {
    const r = await act("freeze", { id }, "freeze");
    if (!r) return;
    await refresh();
    keepSig({ hex: r.signature, block: r.tx.block, kind: "freeze" });
    push({ kind: "ok", demo: "pqc-verified", text: "Reported missing · frozen", tx: r.tx.url, small: `ML-DSA-87 signature (${r.signatureBytes.toLocaleString("en-US")} bytes) verified on chain by pqcVerify · block ${Number(r.tx.block).toLocaleString("en-US")}` });
  }
  async function wrongKey() {
    const r = await act("wrong-key-freeze", { id }, "wrong");
    if (!r) return;
    push(r.refused
      ? { kind: "no", demo: "refused", text: `A stolen key tries to freeze it: refused (${r.reason})`, small: `checked against ${r.checkedAgainst}` }
      : { kind: "info", text: "Wrong-key freeze was NOT refused", small: r.checkedAgainst });
  }
  async function accept() {
    if (!offerId) return;
    const r = await act("accept", { offerId }, "accept");
    if (!r) return;
    push(r.refused
      ? { kind: "no", demo: "refused", text: `Dealer tries to buy it: refused (${r.reason})`, small: `checked against ${r.checkedAgainst}` }
      : { kind: "info", text: "Dealer accept would go through: the offer is live", small: r.checkedAgainst });
  }
  async function recover() {
    const r = await act("recover", { id }, "recover");
    if (!r) return;
    await refresh();
    keepSig({ hex: r.signature, block: r.tx.block, kind: "recover" });
    push({ kind: "ok", text: "Recovered by the owner · active", tx: r.tx.url, small: `ML-DSA-87 signature verified on chain · epoch now ${r.epoch}, so offers made before the freeze stay dead` });
  }

  const status = p?.status ?? "…";
  const frozen = status === "frozen";
  const recovered = status === "active" && (p?.epoch ?? 0) > 0;
  const no = `HLT-${id.slice(2, 6)}-${id.slice(6, 10)}`.toUpperCase();
  const sealText = frozen ? `GELÉ · FROZEN · ${sig?.kind === "freeze" && sig.block ? `BLOCK ${Number(sig.block).toLocaleString("en-US")}` : "ON CHAIN"} · ` : "RESTITUÉ · RECOVERED · OWNER SIGNED · ";

  return (
    <div className="paper">
      <div className="grain" aria-hidden />
      <header className="bar slim">
        <Wordmark mode={frozen ? "frozen" : "ticking"} />
        <span className="mono ref">Passport {no}</span>
        <nav className="mono"><a href="/#method">Method</a><a href="/#proof">Proof</a></nav>
      </header>

      <main className="pp">
        <div className="pp-head">
          <span className="mono">Digital passport · QoreChain Diana</span>
          <h1>
            {!p ? <>Reading the passport…</> : frozen ? <>Reported missing. <em>Unsellable.</em></> : recovered ? <>Recovered. <em>Back with its owner.</em></> : <>In its owner&apos;s hands. <em>For sale only by them.</em></>}
          </h1>
        </div>

        <article className={`cert ${frozen ? "is-frozen" : ""}`}>
          <svg className="band" viewBox="0 0 640 70" preserveAspectRatio="none" aria-hidden dangerouslySetInnerHTML={{ __html: BAND }} />
          <svg className="rose" viewBox="-170 -170 340 340" aria-hidden dangerouslySetInnerHTML={{ __html: ROSE }} />
          <div className="micro-line top" aria-hidden>{"HALTE · ML-DSA-87 · PQCVERIFY 0x0A01 · ".repeat(12)}</div>
          <div className="micro-line bottom" aria-hidden>{"STOLEN MEANS UNSELLABLE · QORECHAIN DIANA · ".repeat(12)}</div>
          <div className="foil" aria-hidden />

          <div className="ctitle">
            <h2>Certificat de provenance</h2>
            <span className="mono">Certificate of provenance · Nº {no}</span>
          </div>

          {!p && <p className="loading mono">Reading passport from Diana…</p>}
          {p && (
            <div className="fields">
              <div className="f"><span className="mono">Passport</span><b className="m" data-demo="passport-id" data-value={id}>{short(id)}</b></div>
              <div className="f">
                <span className="mono">Status</span>
                <b className={`status ${status}`}>
                  {frozen && <s className="was">Active</s>}
                  {recovered && <s className="was">Frozen</s>}
                  <span data-demo="passport-status">{status}</span>
                </b>
              </div>
              <div className="f"><span className="mono">Holder</span><b className="m">{short(p.owner)}</b></div>
              <div className="f"><span className="mono">Holder key</span><b>ML-DSA-87 · {p.keyBytes ? `${p.keyBytes.toLocaleString("en-US")} bytes` : "registered"}</b></div>
              <div className="f"><span className="mono">Verifier</span><b>pqcVerify · 0x…0a01</b></div>
              <div className="f"><span className="mono">Epoch · nonce</span><b>{p.epoch} · {p.nonce}</b></div>
              {offerId && (
                <div className="f wide">
                  <span className="mono">Dealer offer</span>
                  <b data-demo="offer-id" className={p.offer?.live ? "" : "dead"}>#{offerId} · {p.offer?.live ? "live" : "dead: the epoch moved on"}</b>
                </div>
              )}
            </div>
          )}

          <div className="figure">
            <div className="fig-draw">
              <Calibre geo={{ cx: 260, cy: 260, R: 196 }} viewBox="0 0 520 520" stopped={frozen} uid="pp" />
              <span className="mono cap">Fig. 1 · {frozen ? "Stop lever engaged" : "Running"}</span>
            </div>
            <div className="fig-seal">
              <Seal key={sealText} text={sealText} show={frozen || recovered} tone={frozen ? "red" : "grey"} size={140} />
            </div>
          </div>

          <div className="microprint">
            <span className="mono lbl">
              {sig ? `ML-DSA-87 signature · ${((sig.hex.length - 2) / 2).toLocaleString("en-US")} bytes · ${sig.kind}` : "Owner signature · awaiting a signed report"}
            </span>
            <p>{sig ? sig.hex.slice(2) : "0".repeat(1400)}</p>
          </div>
        </article>

        <section className="register">
          <h2 className="mono">Register</h2>
          <ol className="timeline">
            {steps.map((s, i) => (
              <li key={i} className={s.kind} data-demo={s.demo}>
                <span className="mono idx">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  {s.text}
                  {s.tx && <> · <a data-demo="tx-link" href={s.tx} target="_blank" rel="noreferrer">view tx ↗</a></>}
                  {s.small && <small>{s.small}</small>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="actions">
          {status === "active" && !offerId && <button data-demo="offer" className="ghost" onClick={offer} disabled={!!busy}>{busy === "offer" ? "Opening offer…" : "A dealer makes an offer"}</button>}
          {status === "active" && <button data-demo="report-missing" className="red" onClick={freeze} disabled={!!busy}>{busy === "freeze" ? "Signing with ML-DSA-87…" : "Report missing"}</button>}
          {offerId && <button data-demo="dealer-accept" className="ghost" onClick={accept} disabled={!!busy}>{busy === "accept" ? "Dealer accepting…" : "The dealer tries to buy it"}</button>}
          {status === "active" && <button data-demo="wrong-key-freeze" className="ghost" onClick={wrongKey} disabled={!!busy}>{busy === "wrong" ? "Trying…" : "A thief tries with a stolen key"}</button>}
          {frozen && <button data-demo="recover" className="ink" onClick={recover} disabled={!!busy}>{busy === "recover" ? "Signing with ML-DSA-87…" : "The owner recovers the watch"}</button>}
        </div>
        {err && <p className="err">{err}</p>}
        <p className="fine">
          Contract {p ? short(p.contract) : ""} on QoreChain Diana. The demo owner&apos;s ML-DSA-87 key is held by the Halte server.
          &ldquo;Refused&rdquo; results are live checks against Diana (eth_call), not broadcast.
        </p>
      </main>
    </div>
  );
}
