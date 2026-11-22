"use client";
import { use, useEffect, useState } from "react";

type Step = { kind: "ok" | "no" | "info"; text: string; tx?: string; small?: string; demo?: string };
type P = { id: string; owner: string; status: string; epoch: number; offer: null | { id: string; open: boolean; live: boolean; dealer: string }; contract: string };

const short = (s: string) => `${s.slice(0, 10)}…${s.slice(-6)}`;

export default function Passport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [p, setP] = useState<P | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("offer");
    setOfferId(q);
    try { setSteps(JSON.parse(sessionStorage.getItem(`halte:${id}`) ?? "[]")); } catch {}
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
    push({ kind: "ok", text: `Dealer offer #${r.offerId} opened`, tx: r.tx.url, small: `dealer ${short(r.dealer)}` });
  }
  async function freeze() {
    const r = await act("freeze", { id }, "freeze");
    if (!r) return;
    await refresh();
    push({ kind: "ok", demo: "pqc-verified", text: "Reported missing · frozen", tx: r.tx.url, small: `ML-DSA-87 signature (${r.signatureBytes} bytes) verified on chain by pqcVerify` });
  }
  async function wrongKey() {
    const r = await act("wrong-key-freeze", { id }, "wrong");
    if (!r) return;
    push(r.refused
      ? { kind: "no", demo: "refused", text: `Freeze with a wrong key: refused (${r.reason})`, small: `checked against ${r.checkedAgainst}` }
      : { kind: "info", text: "Wrong-key freeze was NOT refused", small: r.checkedAgainst });
  }
  async function accept() {
    if (!offerId) return;
    const r = await act("accept", { offerId }, "accept");
    if (!r) return;
    push(r.refused
      ? { kind: "no", demo: "refused", text: `Dealer accept: refused (${r.reason})`, small: `checked against ${r.checkedAgainst}` }
      : { kind: "info", text: "Dealer accept would go through: the offer is live", small: r.checkedAgainst });
  }
  async function recover() {
    const r = await act("recover", { id }, "recover");
    if (!r) return;
    await refresh();
    push({ kind: "ok", text: "Recovered by the owner · active", tx: r.tx.url, small: `ML-DSA-87 signature verified on chain; epoch now ${r.epoch}, so offers made before the freeze stay dead` });
  }

  const status = p?.status ?? "…";
  return (
    <main>
      <a href="/" className="brand" style={{ textDecoration: "none" }}><span className="mark" aria-hidden /> Halte</a>
      {!p && <div className="card"><div className="row"><span className="k">Reading passport from Diana…</span></div></div>}
      {p && <div className="card">
        <div className="row"><span className="k">Passport</span><span className="v" data-demo="passport-id" data-value={id}>{short(id)}</span></div>
        <div className="row"><span className="k">Status</span><span className={`pill ${status}`} data-demo="passport-status">{status}</span></div>
        {p && <div className="row"><span className="k">Owner</span><span className="v">{short(p.owner)}</span></div>}
        {offerId && <div className="row"><span className="k">Dealer offer</span><span className="v" data-demo="offer-id">#{offerId} · {p?.offer?.live ? "live" : "dead"}</span></div>}
      </div>}

      <ol className="timeline">
        {steps.map((s, i) => (
          <li key={i} className={s.kind} data-demo={s.demo}>
            {s.text}
            {s.tx && <> · <a data-demo="tx-link" href={s.tx} target="_blank" rel="noreferrer">tx</a></>}
            {s.small && <small>{s.small}</small>}
          </li>
        ))}
      </ol>

      <div className="stack">
        {status === "active" && !offerId && <button data-demo="offer" className="ghost" onClick={offer} disabled={!!busy}>{busy === "offer" ? "Opening offer…" : "1 · A dealer makes an offer"}</button>}
        {status === "active" && <button data-demo="report-missing" className="red" onClick={freeze} disabled={!!busy}>{busy === "freeze" ? "Signing with ML-DSA-87…" : "Report missing"}</button>}
        {offerId && <button data-demo="dealer-accept" className="ghost" onClick={accept} disabled={!!busy}>{busy === "accept" ? "Dealer accepting…" : "Dealer accepts the offer"}</button>}
        {status === "active" && <button data-demo="wrong-key-freeze" className="ghost" onClick={wrongKey} disabled={!!busy}>{busy === "wrong" ? "Trying…" : "Try a freeze with a stolen (wrong) key"}</button>}
        {status === "frozen" && <button data-demo="recover" onClick={recover} disabled={!!busy}>{busy === "recover" ? "Signing with ML-DSA-87…" : "Owner recovers the watch"}</button>}
      </div>
      {err && <p className="err">{err}</p>}
      <p className="note">Contract {p ? short(p.contract) : ""} on QoreChain Diana. The demo owner&apos;s ML-DSA-87 key is held by the Halte server. &ldquo;Refused&rdquo; results are live checks against Diana (eth_call), not broadcast.</p>
    </main>
  );
}
