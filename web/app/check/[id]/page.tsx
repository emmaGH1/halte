"use client";
import { use, useEffect, useState } from "react";
import deployment from "@/lib/deployment.json";
import { SiteFooter, SiteNav, Wordmark } from "../../ui";

type R = {
  verdict: "can-accept" | "reported-missing" | "offer-dead" | "offer-expired" | "offer-closed" | "offer-mismatch" | "no-offer" | "clear";
  passport: { id: string; status: string; holder: string; holderName: string | null; epoch: number; frozenTx: { url: string; block: string } | null };
  offer: null | { id: string; dealer: string | null; dealerName: string | null; outcome: string; expiry?: number; madeTx?: string | null; acceptedTx?: string | null };
  block: string;
  contract: string;
  askedAt: string;
};
type Fail = { code: "bad-id" | "bad-offer" | "unknown" | "transport"; error: string };

const short = (s: string) => `${s.slice(0, 8)}…${s.slice(-4)}`;
const n = (s: string | number) => Number(s).toLocaleString("en-US");
const who = (a: string | null, name: string | null) => (a ? name ? `${name} (${short(a)})` : short(a) : "its dealer");

function words(r: R): { tone: "go" | "stop" | "wait"; head: string; em: string; line: string } {
  const o = r.offer;
  const dealer = o ? who(o.dealer, o.dealerName) : "";
  switch (r.verdict) {
    case "can-accept":
      return { tone: "go", head: "Can accept.", em: `Offer #${o!.id} is live.`, line: `The contract would let ${dealer} accept offer #${o!.id} at block ${n(r.block)}.` };
    case "reported-missing":
      return { tone: "stop", head: "Reported missing.", em: "Do not accept.", line: o ? `Offer #${o.id} to ${dealer} is refused: PassportFrozen. The holder's ML-DSA-87 report froze this passport.` : "The holder's ML-DSA-87 report froze this passport. Every offer on it is refused." };
    case "offer-dead":
      return { tone: "stop", head: `Offer #${o!.id} is dead.`, em: "Ask for a new one.", line: `Refused: StaleOffer. The passport moved on after this offer was signed (a missing report, a recovery or a handoff), and the old offer never comes back.` };
    case "offer-expired":
      return { tone: "wait", head: `Offer #${o!.id} expired.`, em: "Ask for a new one.", line: `The holder signed it for a limited time and that time has passed. Refused: Expired.` };
    case "offer-closed":
      return { tone: "wait", head: `Offer #${o!.id} is closed.`, em: o?.outcome === "accepted" ? "Already accepted." : "Withdrawn.", line: o?.outcome === "accepted" ? "This offer was already used: the passport changed hands with it." : "The holder withdrew this offer, or it was already used." };
    case "offer-mismatch":
      return { tone: "stop", head: "Wrong passport.", em: "Do not accept.", line: `Offer #${o!.id} belongs to a different passport than the one on this card.` };
    case "no-offer":
      return { tone: "wait", head: `No offer #${o!.id}.`, em: "Nothing to accept.", line: "This passport has no offer with that number. Ask the holder to sign one to you." };
    default:
      return { tone: "go", head: "Not reported missing.", em: "No offer named.", line: "This passport is active. To buy, ask the holder to sign an offer to you, then check its number here." };
  }
}

export default function Counter({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = rawId.toLowerCase();
  const [r, setR] = useState<R | null>(null);
  const [fail, setFail] = useState<Fail | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask() {
    setBusy(true);
    const offer = new URLSearchParams(location.search).get("offer");
    const res = await fetch(`/api/check/${id}${offer ? `?offer=${encodeURIComponent(offer)}` : ""}`, { cache: "no-store" }).catch(() => null);
    const j = res ? await res.json().catch(() => null) : null;
    setBusy(false);
    if (!res?.ok || !j || j.error) { setR(null); setFail(j?.code ? j : { code: "transport", error: "The check never reached Diana." }); return; }
    setFail(null); setR(j);
  }
  useEffect(() => { ask(); }, [id]); // eslint-disable-line

  const w = r ? words(r) : null;
  const no = `HLT-${id.slice(2, 6)}-${id.slice(6, 10)}`.toUpperCase();
  const frozen = r?.passport.status === "frozen";

  return (
    <div className="paper" id="top">
      <div className="grain" aria-hidden />
      <SiteNav
        brand={<Wordmark mode={frozen ? "frozen" : "static"} />}
        refText={`Counter check · ${no}`}
        links={[{ href: "/#method", label: "Method" }, { href: "/#replay", label: "Replay" }, { href: "https://github.com/emmaGH1/halte", label: "Source", ext: true }]}
        cta={{ href: "/", label: "New passport" }}
      />
      <main className="pp counter">
        <span className="mono kicker">Dealer&apos;s counter · read-only check · QoreChain Diana</span>

        {!r && !fail && <div className="verdict wait" aria-busy="true"><h1>Asking Diana…</h1><p>Reading the passport, the offer and the contract&apos;s answer at one block.</p></div>}

        {fail && (
          <div className={`verdict ${fail.code === "transport" ? "wait" : "stop"}`} role="alert" data-demo="counter-verdict" data-verdict={fail.code}>
            <h1>{fail.code === "transport" ? <>No answer from Diana. <em>Don&apos;t decide on this screen.</em></> : fail.code === "unknown" ? <>No such passport. <em>Do not accept.</em></> : <>Not a passport link. <em>Check the card.</em></>}</h1>
            <p>{fail.code === "transport" ? "The chain could not be read just now, so this page can't tell you anything. Try again in a moment." : fail.code === "unknown" ? `No passport with this id exists on the Halte contract ${short(deployment.contract)}. A card that points nowhere is not a passport.` : fail.error}</p>
          </div>
        )}

        {r && w && (
          <div className={`verdict ${w.tone}`} data-demo="counter-verdict" data-verdict={r.verdict}>
            <h1>{w.head} <em>{w.em}</em></h1>
            <p>{w.line}</p>
            <span className="mono at">Contract answer at block {n(r.block)} · {new Date(r.askedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
        )}

        <button className="ink again" data-demo="counter-refresh" onClick={ask} disabled={busy}>{busy ? "Asking Diana…" : "Ask again"}</button>
        <p className="sr-only" role="status" aria-live="polite">{busy ? "Asking Diana" : w ? `${w.head} ${w.em}` : ""}</p>

        {r && (
          <dl className="facts">
            <div><dt className="mono">Passport</dt><dd className="m">{no} · <span className="dim">{short(r.passport.id)}</span></dd></div>
            <div><dt className="mono">Status</dt><dd className={frozen ? "stopc" : ""}>{frozen ? "Reported missing (frozen)" : "Active"}{r.passport.frozenTx && <> · <a href={r.passport.frozenTx.url} target="_blank" rel="noreferrer">report tx ↗</a></>}</dd></div>
            <div><dt className="mono">Holder</dt><dd>{who(r.passport.holder, r.passport.holderName)}</dd></div>
            {r.offer && (
              <div>
                <dt className="mono">Offer #{r.offer.id}</dt>
                <dd>
                  to {who(r.offer.dealer, r.offer.dealerName)} · <b>{r.offer.outcome === "would succeed" ? "contract would accept" : r.offer.outcome}</b>
                  {r.offer.expiry ? <> · signed until {new Date(r.offer.expiry * 1000).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</> : null}
                  {r.offer.madeTx && <> · <a href={r.offer.madeTx} target="_blank" rel="noreferrer">offer tx ↗</a></>}
                  {r.offer.acceptedTx && <> · <a href={r.offer.acceptedTx} target="_blank" rel="noreferrer">handoff tx ↗</a></>}
                </dd>
              </div>
            )}
          </dl>
        )}

        <p className="fine">
          What this checks: the passport&apos;s state on the Halte contract and, for a named offer, whether the contract would let that offer&apos;s
          dealer accept it, all read at one block. Nothing is signed or sent, and no wallet or login is needed. It doesn&apos;t check that the dealer
          has gas, and it can&apos;t prove the watch on the counter is the one the passport was issued for: this is a demo passport card.
        </p>
        {r && (
          <details className="rp-verify">
            <summary className="mono">Verify independently</summary>
            <p>The same read-only call against Diana, pinned to the same block{r.offer?.dealer ? ", from the offer's dealer" : ""}:</p>
            <pre>{r.offer?.dealer
              ? `curl -s https://evm-testnet.qore.host -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"from":"${r.offer.dealer}","to":"${r.contract}","data":"0xc815729d${BigInt(r.offer.id).toString(16).padStart(64, "0")}"},"0x${BigInt(r.block).toString(16)}"]}'`
              : `curl -s https://evm-testnet.qore.host -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"${r.contract}","data":"0xfb51ed4e${r.passport.id.slice(2)}"},"0x${BigInt(r.block).toString(16)}"]}'`}</pre>
            <p>{r.offer?.dealer ? <>No error means the contract would accept. <code>0xdd656228</code> is PassportFrozen, <code>0xef8d77e3</code> StaleOffer.</> : <>The answer is the passport record: the holder, then the status (1 active, 2 reported missing).</>}</p>
          </details>
        )}
        <p className="fine"><a href={`/p/${id}${r?.offer ? `?offer=${r.offer.id}` : ""}`}>The passport&apos;s full register →</a></p>
      </main>
      <div className="night"><SiteFooter deployTx={deployment.deployTx} /></div>
    </div>
  );
}
