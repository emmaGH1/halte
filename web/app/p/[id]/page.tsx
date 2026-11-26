"use client";
import { use, useEffect, useState } from "react";
import { guillocheBand, rosette } from "@/lib/art";
import deployment from "@/lib/deployment.json";
import replay from "@/lib/replay.json";
import { Calibre, Seal, SiteFooter, SiteNav, Wordmark } from "../../ui";
import { Tour } from "./tour";

type Entry = { event: string; block: string; hash: string; url: string; sender: string; args: Record<string, string>; pq?: { signatureBytes: number; signature: string } };
type P = {
  id: string; owner: string; status: string; epoch: number; nonce: string; key: { state: "ok" | "unusable" | "unavailable"; bytes?: number }; contract: string; block: string; yours: boolean;
  offer: null | { id: string; open: boolean; live: boolean; dealer: string; epoch: number; reason: string; checkedAt?: string };
  history: Entry[];
};
type Check = { kind: "no" | "yes"; text: string; small: string; block: string; demo: string };
type Row = { kind: "ok" | "no" | "yes" | "info"; text: string; small?: string; tx?: string; demo?: string; block: string };

const short = (s: string) => `${s.slice(0, 10)}…${s.slice(-6)}`;
const n = (s: string | number) => Number(s).toLocaleString("en-US");
const BAND = guillocheBand(640, 70);
const ROSE = rosette(150, 9, 18, 22);
const OFFER_STATE: Record<string, string> = {
  "would succeed": "live: its dealer could accept now",
  PassportFrozen: "blocked: reported missing",
  StaleOffer: "dead: a report or transfer moved the epoch on",
  Expired: "expired",
  OfferClosed: "closed",
  NoPqcKey: "dealer has no usable PQ key",
  unavailable: "state unavailable right now",
};
const RECORDED = "https://github.com/emmaGH1/halte/blob/main/evidence/release/0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4.json";

function rowsOf(p: P | null, checks: Check[]): Row[] {
  const rows: Row[] = [];
  const who = (a: string) => (p && a.toLowerCase() === p.owner.toLowerCase() ? "the holder" : short(a));
  for (const e of p?.history ?? []) {
    const relayed = `relayed by ${short(e.sender)}${p && e.sender.toLowerCase() !== (e.args.owner ?? p.owner).toLowerCase() ? " (not the holder)" : ""}`;
    const pq = e.pq ? `ML-DSA-87 signature (${n(e.pq.signatureBytes)} bytes) verified on chain by pqcVerify` : "";
    if (e.event === "Minted") rows.push({ kind: "ok", text: "Passport issued · active", small: `holder ${short(e.args.owner)} · PoP-proven ML-DSA-87 key required · block ${n(e.block)}`, tx: e.url, block: e.block });
    if (e.event === "OfferMade") rows.push({ kind: "ok", demo: "offer-made", text: `The owner signs transfer offer #${e.args.offerId} to a dealer`, small: `${pq} · ${relayed} · dealer ${short(e.args.dealer)} · epoch ${e.args.epoch}`, tx: e.url, block: e.block });
    if (e.event === "Frozen") rows.push({ kind: "ok", demo: "pqc-verified", text: "Reported missing · frozen", small: `${pq} · ${relayed} · block ${n(e.block)}`, tx: e.url, block: e.block });
    if (e.event === "Recovered") rows.push({ kind: "ok", text: "Recovered by the owner · active", small: `${pq} · ${relayed} · epoch now ${e.args.epoch}, so every older offer stays dead`, tx: e.url, block: e.block });
    if (e.event === "Transferred") rows.push({ kind: "ok", text: `Changed hands: ${who(e.args.from)} → ${short(e.args.to)}`, small: `offer #${e.args.offerId} · block ${n(e.block)}`, tx: e.url, block: e.block });
    if (e.event === "OfferCancelled") rows.push({ kind: "info", text: `Offer #${e.args.offerId} withdrawn by the holder`, tx: e.url, block: e.block });
  }
  // live checks sit after the chain entries of the block they were run against
  for (const c of checks) {
    let i = rows.length;
    while (i > 0 && BigInt(rows[i - 1].block) > BigInt(c.block)) i--;
    rows.splice(i, 0, { ...c, block: c.block });
  }
  return rows;
}

export default function Passport({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = rawId.toLowerCase();
  const [p, setP] = useState<P | null>(null);
  const [missing, setMissing] = useState<"" | "bad-id" | "unknown" | "transport">("");
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState("");
  const [say, setSay] = useState("");
  const [err, setErr] = useState<{ text: string; recorded?: boolean } | null>(null);
  const [mine, setMine] = useState(false); // the holder's key lives in this browser ("Hold your own key")

  useEffect(() => {
    try { setChecks(JSON.parse(sessionStorage.getItem(`halte:checks:${id}`) ?? "[]")); } catch {}
  }, [id]);
  // the holder's capability travels in the fragment (#k=…): never sent to a server log, kept out of copied read-only links
  const holderKey = () => new URLSearchParams(location.hash.slice(1)).get("k") ?? "";
  const headers = (): Record<string, string> => (holderKey() ? { "x-halte-key": holderKey() } : {});

  async function refresh(min?: string) {
    const here = new URLSearchParams(location.search);
    const offer = here.get("offer");
    const q = new URLSearchParams();
    if (offer) q.set("offer", offer);
    const floor = min ?? here.get("min");
    if (floor) q.set("min", floor);
    const res = await fetch(`/api/passport/${id}?${q}`, { cache: "no-store", headers: headers() }).catch(() => null);
    const r = res ? await res.json().catch(() => ({ code: "transport" })) : { code: "transport" };
    if (r.error || !res?.ok) { if (!p) setMissing(r.code === "bad-id" || r.code === "unknown" ? r.code : "transport"); return; }
    setMissing(""); setP(r);
    try {
      const saved = JSON.parse(localStorage.getItem("halte:own:v1") ?? "null");
      setMine(!!saved?.evm && saved.evm.toLowerCase() === String(r.owner).toLowerCase());
    } catch {}
  }
  useEffect(() => { refresh(); }, [id]); // eslint-disable-line

  function check(c: Check) {
    setChecks((prev) => {
      const next = [...prev, c];
      try { sessionStorage.setItem(`halte:checks:${id}`, JSON.stringify(next)); } catch {}
      return next;
    });
    setSay(c.text);
  }

  async function act(action: string, extra: object, label: string, announce: string) {
    setBusy(label); setErr(null); setSay(announce);
    const res = await fetch(`/api/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID(), ...headers() },
      body: JSON.stringify({ id, ...extra }),
    }).catch(() => null);
    const r = res ? await res.json().catch(() => ({ error: "Unreadable answer from the server." })) : { error: "Network error: the request never reached Halte." };
    setBusy("");
    if (r.error) {
      const recorded = ["read-only", "rate-limited", "daily-cap", "transport"].includes(r.code);
      setErr({ text: r.code === "contract-refused" ? `Halte refused before sending: ${r.reason}` : r.error, recorded });
      setSay(r.error);
      return null;
    }
    return r;
  }

  async function write(action: "offer" | "freeze" | "recover", label: string, done: string) {
    const r = await act(action, {}, label, label === "freeze" || label === "recover" ? "Signing with ML-DSA-87 and sending to Diana" : "Sending to Diana");
    if (!r) return;
    if (action === "offer") history.replaceState(null, "", `/p/${id}?offer=${r.offerId}&min=${r.tx.block}${location.hash}`);
    await refresh(r.tx.block);
    setSay(done);
  }

  // sign with the ML-DSA-87 key held in this browser; only the signature leaves the device
  async function ownWrite(kind: "offer" | "freeze" | "recover", done: string) {
    setBusy(`own-${kind}`); setErr(null); setSay("Signing with your ML-DSA-87 key in this browser");
    try {
      const r = await (await import("@/lib/own")).signAndRelay(kind, id as `0x${string}`);
      if (kind === "offer") history.replaceState(null, "", `/p/${id}?offer=${r.offerId}&min=${r.tx.block}`);
      await refresh(r.tx.block);
      setSay(done);
    } catch (e) {
      const m = (e as Error & { code?: string });
      setErr({ text: m.code === "contract-refused" ? `Halte refused before sending: ${m.message}` : m.message, recorded: ["read-only", "rate-limited", "daily-cap", "transport"].includes(m.code ?? "") });
      setSay(m.message);
    } finally {
      setBusy("");
    }
  }

  async function accept() {
    if (!p?.offer) return;
    const r = await act("accept", { offerId: p.offer.id, min: p.block }, "accept", "Asking Diana whether the dealer could buy it");
    if (!r) return;
    check(r.outcome === "would succeed"
      ? { kind: "yes", demo: "accept-would-succeed", text: "The contract would let this dealer accept the offer now", small: `checked against ${r.checkedAgainst} · block ${n(r.block)}`, block: r.block }
      : { kind: "no", demo: "refused", text: `The dealer tries to buy it: refused (${r.outcome})`, small: `same dealer, same offer · checked against ${r.checkedAgainst} · block ${n(r.block)}`, block: r.block });
  }
  async function thief(action: "thief-sell" | "thief-unfreeze" | "wrong-key-freeze") {
    const r = await act(action, {}, action, "Asking Diana");
    if (!r) return;
    const what = action === "thief-sell" ? "A thief with the owner's classical key tries to sell it"
      : action === "wrong-key-freeze" ? "Someone forges a missing report with their own key" : "A thief signs a recovery with their own ML-DSA-87 key";
    check(r.outcome === "would succeed"
      ? { kind: "yes", demo: "thief-not-refused", text: `${what}: NOT refused`, small: `block ${n(r.block)}`, block: r.block }
      : { kind: "no", demo: "refused", text: `${what}: refused (${r.outcome})`, small: `checked against ${r.checkedAgainst} · block ${n(r.block)}`, block: r.block });
  }

  const status = p?.status ?? "…";
  const frozen = status === "frozen";
  const recovered = status === "active" && p?.history.some((e) => e.event === "Recovered");
  const transferred = !!p?.history.some((e) => e.event === "Transferred");
  const lastPq = [...(p?.history ?? [])].reverse().find((e) => e.pq && (e.event === "Frozen" || e.event === "Recovered"))
    ?? [...(p?.history ?? [])].reverse().find((e) => e.pq);
  const lastFreeze = [...(p?.history ?? [])].reverse().find((e) => e.event === "Frozen");
  const rows = rowsOf(p, checks);
  const offer = p?.offer;
  const yours = !!p?.yours;
  const sawPositive = checks.some((c) => c.demo === "accept-would-succeed");
  const no = `HLT-${id.slice(2, 6)}-${id.slice(6, 10)}`.toUpperCase();
  const sealText = frozen ? `GELÉ · FROZEN · ${lastFreeze ? `BLOCK ${n(lastFreeze.block)}` : "ON CHAIN"} · ` : "RESTITUÉ · RECOVERED · OWNER SIGNED · ";
  const nav = (
    <SiteNav
      brand={<Wordmark mode={frozen ? "frozen" : "ticking"} />}
      refText={`Passport ${no}`}
      links={[{ href: "/#how", label: "How it works" }, { href: "/#proof", label: "Proof" }, { href: "https://github.com/emmaGH1/halte", label: "Source", ext: true }]}
      cta={{ href: "/", label: "New passport" }}
    />
  );

  if (missing && !p) {
    return (
      <div className="paper" id="top">
        <div className="grain" aria-hidden />
        {nav}
        <main className="pp">
          <div className="pp-head">
            <span className="mono">Demo transfer passport · QoreChain Diana</span>
            <h1>{missing === "transport" ? <>Diana is not answering. <em>Try again shortly.</em></> : <>No such passport. <em>Nothing to sell.</em></>}</h1>
          </div>
          <p className="fine">
            {missing === "bad-id" ? "That link does not hold a passport id." : missing === "unknown" ? `No passport with this id exists on the Halte contract ${short(deployment.contract)}.` : "The page could not reach QoreChain Diana's RPC."}{" "}
            <a href="/">Issue a demo passport →</a>
          </p>
        </main>
        <div className="night"><SiteFooter deployTx={deployment.deployTx} /></div>
      </div>
    );
  }

  return (
    <div className="paper" id="top">
      <div className="grain" aria-hidden />
      {nav}

      <main className="pp">
        <div className="pp-head">
          <span className="mono">Demo transfer passport · QoreChain Diana</span>
          <h1>
            {!p ? <>Reading the passport…</> : frozen ? <>Reported missing. <em>Unsellable.</em></> : transferred ? <>Passport transferred. <em>New holder on chain.</em></> : recovered ? <>Recovered. <em>Back with its owner.</em></> : <>In its owner&apos;s hands. <em>For sale only by them.</em></>}
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
                  {recovered && !frozen && <s className="was">Frozen</s>}
                  <span data-demo="passport-status">{status}</span>
                </b>
              </div>
              <div className="f"><span className="mono">Holder</span><b className="m">{short(p.owner)}</b></div>
              <div className="f"><span className="mono">Holder key</span><b>{p.key.state === "ok" ? `ML-DSA-87 · ${n(p.key.bytes ?? 0)} bytes · PoP` : p.key.state === "unusable" ? "No usable ML-DSA-87 key" : "Key status unavailable"}</b></div>
              <div className="f"><span className="mono">Verifier</span><b>pqcVerify · 0x…0a01</b></div>
              <div className="f"><span className="mono">Epoch · nonce</span><b>{p.epoch} · {p.nonce}</b></div>
              {offer && (
                <div className="f wide">
                  <span className="mono">Dealer offer</span>
                  <b data-demo="offer-id" data-live={offer.live ? "1" : "0"} className={offer.live ? "" : "dead"}>
                    #{offer.id} · {OFFER_STATE[offer.reason] ?? offer.reason}{offer.checkedAt ? <small className="mono"> contract answer for its dealer · block {n(offer.checkedAt)}</small> : null}
                  </b>
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
              <Seal key={sealText} text={sealText} show={frozen || !!recovered} tone={frozen ? "red" : "grey"} size={140} />
            </div>
          </div>

          <div className="microprint">
            <span className="mono lbl">
              {lastPq?.pq ? `Owner's ML-DSA-87 signature · ${n(lastPq.pq.signatureBytes)} bytes · ${lastPq.event === "OfferMade" ? "offer" : lastPq.event === "Frozen" ? "report" : "recovery"} · read back from the tx` : "Owner signature · awaiting a signed offer or report"}
            </span>
            <p>{lastPq?.pq ? lastPq.pq.signature.slice(2) : "0".repeat(1400)}</p>
          </div>
        </article>

        <section className="register" aria-labelledby="reg-h">
          <h2 className="mono" id="reg-h">Register <span className="dim">· from Diana{p ? ` @ block ${n(p.block)}` : ""}</span></h2>
          <ol className="timeline">
            {rows.map((s, i) => (
              <li key={i} className={s.kind} data-demo={s.demo}>
                <span className="mono idx">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  {s.text}
                  {s.tx ? <> · <a data-demo="tx-link" href={s.tx} target="_blank" rel="noreferrer">view tx ↗</a></> : <span className="mono tag"> · live check, not sent</span>}
                  {s.small && <small>{s.small}</small>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <p className="sr-only" role="status" aria-live="polite">{say}</p>

        <div className="actions">
          {yours && status === "active" && !offer?.live && !transferred && (
            <button data-demo="offer" className="ghost" onClick={() => write("offer", "offer", "Offer opened")} disabled={!!busy}>{busy === "offer" ? "Owner signing the offer…" : "The owner offers it to a dealer"}</button>
          )}
          {offer && !transferred && (
            <button data-demo="dealer-accept" className={!sawPositive && status === "active" ? "ink" : "ghost"} onClick={accept} disabled={!!busy}>{busy === "accept" ? "Asking Diana…" : "The dealer tries to buy it"}</button>
          )}
          {yours && frozen && (
            <button data-demo="recover" className="ink" onClick={() => write("recover", "recover", "Recovered. The passport is active again.")} disabled={!!busy}>{busy === "recover" ? "Signing with ML-DSA-87…" : "The owner recovers the watch"}</button>
          )}
          {yours && status === "active" && !transferred && (
            <button data-demo="report-missing" className="red" onClick={() => write("freeze", "freeze", "Reported missing. The passport is frozen.")} disabled={!!busy}>{busy === "freeze" ? "Signing with ML-DSA-87…" : "Report missing"}</button>
          )}
        </div>
        {mine && (
          <div className="actions own-actions" data-demo="own-actions">
            {status === "active" && !offer?.live && !transferred && (
              <button data-demo="own-offer" className="ghost" onClick={() => ownWrite("offer", "Offer opened, signed in this browser")} disabled={!!busy}>{busy === "own-offer" ? "Signing in this browser…" : "Offer it to the dealer (sign here)"}</button>
            )}
            {frozen && (
              <button data-demo="own-recover" className="ink" onClick={() => ownWrite("recover", "Recovered with your key")} disabled={!!busy}>{busy === "own-recover" ? "Signing in this browser…" : "Recover it (sign here)"}</button>
            )}
            {status === "active" && !transferred && (
              <button data-demo="own-report" className="red" onClick={() => ownWrite("freeze", "Reported missing with your key")} disabled={!!busy}>{busy === "own-report" ? "Signing in this browser…" : "Report missing (sign here)"}</button>
            )}
          </div>
        )}
        {mine && <p className="fine custody" data-demo="own-custody">Your key: generated in this browser and never sent anywhere. Each button signs here with your ML-DSA-87 key; Halte&apos;s dealer account only relays the signature. <a href="/own">Your key →</a></p>}
        {yours && <p className="fine custody" data-demo="custody-note">Hosted demo: Halte holds this demo holder&apos;s ML-DSA-87 key and signs when you press. The contract still verifies each signature against the holder&apos;s registered key.</p>}
        <div className="actions attacks" id="break" aria-label="Try to break it">
          <span className="mono">Try to break it</span>
          {status === "active" && !transferred && !mine && (
            <button data-demo="thief-sell" className="ghost" onClick={() => thief("thief-sell")} disabled={!!busy}>{busy === "thief-sell" ? "Trying…" : "A thief with the classical key tries to sell it"}</button>
          )}
          {status === "active" && !transferred && (
            <button data-demo="wrong-key-freeze" className="ghost" onClick={() => thief("wrong-key-freeze")} disabled={!!busy}>{busy === "wrong-key-freeze" ? "Trying…" : "Someone forges a missing report"}</button>
          )}
          {frozen && (
            <button data-demo="thief-unfreeze" className="ghost" onClick={() => thief("thief-unfreeze")} disabled={!!busy}>{busy === "thief-unfreeze" ? "Trying…" : "A thief tries to lift the report"}</button>
          )}
        </div>
        {p && (
          <p className="fine">
            <button className="linkish" data-demo="copy-public-link" onClick={() => {
              const u = `${location.origin}/p/${id}${offer ? `?offer=${offer.id}` : ""}`;
              navigator.clipboard?.writeText(u).then(() => setSay("Public read-only link copied"), () => setSay(u));
            }}>Copy public read-only link</button>
            {" · "}<a data-demo="counter-link" href={`/check/${id}${offer ? `?offer=${offer.id}` : ""}`}>Dealer&apos;s counter check</a>
            {" · "}<a data-demo="card-link" href={`/card/${id}${offer ? `?offer=${offer.id}` : ""}`}>Print a demo passport card (QR)</a>
            {yours && !mine && <> · the address bar holds this passport&apos;s private control key; share the public link instead.</>}
          </p>
        )}
        {p && !yours && !mine && (
          <p className="fine" data-demo="read-only">
            Read-only here: this passport was issued in another browser, so only live checks run. <a href="/">Issue your own →</a>
          </p>
        )}
        {err && (
          <p className="err" role="alert">
            {err.text}
            {err.recorded && <> <a href={RECORDED} target="_blank" rel="noreferrer">See the recorded run on Diana ↗</a></>}
          </p>
        )}
        <p className="fine">
          Contract {short(p?.contract ?? deployment.contract)} on QoreChain Diana testnet.{" "}
          {mine || (p && ![replay.owner, replay.dealer].some((a) => a.toLowerCase() === p.owner.toLowerCase()))
            ? <>Self-custody: this holder&apos;s keys are not Halte&apos;s{mine ? "; they were generated in this browser" : ""}. The demo dealer&apos;s key is held by the Halte server.</>
            : <>Demo custody: the owner&apos;s and the dealer&apos;s ML-DSA-87 keys are held by the Halte server.</>}{" "}
          The holder signs every offer, report and recovery; the dealer&apos;s account relays them,
          so each receipt shows a sender who is not the holder. &ldquo;Live check&rdquo; rows are eth_calls against Diana, not broadcast.
        </p>
        {p && <Tour id={id} yours={yours} status={status} offerLive={!!offer?.live} checks={checks} history={p.history} busy={busy} />}
      </main>
      <div className="night"><SiteFooter deployTx={deployment.deployTx} /></div>
    </div>
  );
}
