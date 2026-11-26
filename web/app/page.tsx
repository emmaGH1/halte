import deployment from "@/lib/deployment.json";
import { txUrl } from "@/lib/chain";
import { readLive } from "@/lib/live";
import { MintButton } from "./mint";
import { Plug } from "./plug";
import { Replay } from "./replay";
import { HeroArt, SiteFooter, SiteNav, Wordmark } from "./ui";

export const revalidate = 30;

const short = (s: string, a = 6, b = 4) => `${s.slice(0, a)}…${s.slice(-b)}`;
const n = (s?: string) => (s ? Number(s).toLocaleString("en-US") : "—");

const FIGS: { n: string; title: string; body: string; glyph: string }[] = [
  { n: "01", title: "Issue", body: "The owner issues a passport for the watch. Halte refuses unless the owner already holds a registered ML-DSA-87 key on QoreChain, so every passport can be frozen later.", glyph: `<rect x="14" y="8" width="36" height="48" class="g"/><path d="M20 18h24M20 26h24M20 34h14" class="g"/><circle cx="40" cy="46" r="6" class="g acc"/>` },
  { n: "02", title: "Offer", body: "The owner signs a transfer offer to one named dealer with their ML-DSA-87 key, stamped with the passport's epoch. A stolen classical key alone can't list the watch: BadPqcSignature.", glyph: `<path d="M8 24h40l-8-8M56 40H16l8 8" class="g"/>` },
  { n: "03", title: "Report", body: "The watch goes missing. The owner signs a report with their quantum-safe key. Anyone may relay it; the contract checks it with the pqcVerify precompile and freezes the passport.", glyph: `<path d="M6 40c6-14 10-14 14 0s8 14 12 0 8-14 12 0 8 10 14 0" class="g"/><path d="M6 50h52" class="g acc"/>` },
  { n: "04", title: "Refuse", body: "The same dealer who could buy a minute ago is now refused: PassportFrozen. The freeze bumped the epoch, so every outstanding offer is dead, not just paused.", glyph: `<circle cx="32" cy="32" r="22" class="g acc"/><path d="M16 32h32" class="g acc"/>` },
  { n: "05", title: "Recover", body: "The watch is found. Only the owner's registered ML-DSA-87 key can lift the freeze. Offers made before it stay dead (StaleOffer), so a sale arranged during the theft can never be revived.", glyph: `<circle cx="22" cy="32" r="10" class="g"/><path d="M32 32h24M48 32v8M54 32v6" class="g"/>` },
];

export default async function Home() {
  const live = await readLive();
  return (
    <div className="catalogue catalogue--hero-variant" id="top">
      <div className="grain" aria-hidden />
      <SiteNav
        brand={<Wordmark />}
        refText="Ref. H-01 · QoreChain Diana"
        links={[{ href: "#plug", label: "Plug it in" }, { href: "#method", label: "Method" }, { href: "#proof", label: "Proof" }, { href: "/check", label: "Check a passport" }, { href: "https://github.com/emmaGH1/halte", label: "Source", ext: true }]}
        cta={{ href: "#top", label: "Issue a passport" }}
      />

      <section className="hero hero--b">
        <HeroArt />
        <h1>
          <span className="sw">Stolen means</span>
          <em>unsellable<i>.</i></em>
        </h1>
        <p className="claim" data-demo="claim">A stop button for stolen goods. One quantum-safe report, and every buyer who checks is told “do not buy”.</p>
        <div className="hero-copy">
          <p className="lede">
            Stolen watches, bikes, phones and art get resold because the buyer has no way to check. Halte gives each item a
            passport on QoreChain. The owner presses stop with a quantum-safe signature, and any marketplace, dealer or insurer
            asks one question before paying: is this sellable? Our first pilot is luxury watches.
          </p>
          <div className="cta">
            <MintButton tour />
            <MintButton variant="btn ghost-btn" />
          </div>
          <p className="cta-note">
            The tour puts you in both seats, owner and dealer, on a real passport: sell, report stolen, watch the sale get refused.
            About two minutes. Or <a href="/check/0xbed648483ebb7c1bb1ccb005a5f858540739d25789bc21ea1547803dac915fcd?offer=2" data-demo="check-link">check a passport like a dealer</a>.
          </p>
          <p className="fine">
            Runs on QoreChain Diana testnet. No wallet needed: for this demo the owner&apos;s and dealer&apos;s ML-DSA-87 keys are held by the Halte server. Or <a href="/own" data-demo="own-link">hold your own key</a>: generated in your browser, never sent to Halte.
          </p>
        </div>
        <div className="fig-cap">
          <span className="mono red">Pilot 01 · Luxury watches</span>
          <p>One signed report halts every sale.</p>
        </div>

        <div className="proof-table" id="live">
          <div className="mono th">
            <span className={live.ok ? "live" : "live off"}>{live.ok ? "Live from QoreChain Diana" : "Diana unreachable right now"}</span>
            <span className="dim">{live.ok ? `block ${n(live.block)}` : ""}</span>
          </div>
          <div className="tr"><span className="mono">Owner key</span><span className="v"><b>{live.keyBytes ? `ML-DSA-87 · ${live.keyBytes.toLocaleString("en-US")} bytes` : "Key status unavailable"}</b><small>FIPS 204 public key, registered on chain</small></span></div>
          <div className="tr">
            <span className="mono">Last freeze</span>
            <span className="v">
              {live.lastFreeze ? <><b><a href={live.lastFreeze.url} target="_blank" rel="noreferrer">tx {short(live.lastFreeze.hash, 10, 4)}</a></b><small>block {n(live.lastFreeze.block)} · verified by pqcVerify</small></> : <><b>none yet</b><small>verified by pqcVerify</small></>}
            </span>
          </div>
          <div className="tr"><span className="mono">Passports</span><span className="v"><b>{live.minted ?? "—"} issued · {live.frozen ?? "—"} frozen</b><small>each freeze signed by the owner&apos;s own key</small></span></div>
          <div className="tr"><span className="mono">Contract</span><span className="v"><b><a href={txUrl(deployment.deployTx)} target="_blank" rel="noreferrer">{short(live.contract)}</a></b><small>reached only through a scoped EVM window</small></span></div>
        </div>
        <div className="rail mono">Fig. 1 · Calibre H-01 with the stop lever engaged</div>
      </section>

      <section className="seats" id="who">
        <div className="sec-head">
          <span className="mono">How it fits</span>
          <h2>The owner presses stop. <em>Everyone about to pay can ask.</em></h2>
        </div>
        <ol className="seat-row">
          <li><span className="mono">The owner</span><h3>Presses stop</h3><p>One signature from their quantum-safe key, on their phone. No police report, no call centre, no waiting.</p></li>
          <li className="mid"><span className="mono">QoreChain</span><h3>Holds the answer</h3><p>The contract checks the signature with QoreChain&apos;s built-in post-quantum verifier and freezes the passport. Every pending deal dies.</p></li>
          <li><span className="mono">Anyone about to pay</span><h3>Asks first</h3><p>Same answer for everyone, in a second, with no account and no fee.</p></li>
        </ol>
        <ul className="buyers">
          <li><b>Marketplaces</b><span>Block the listing before it goes live.</span></li>
          <li><b>Dealers and pawnshops</b><span>Check at the counter before handing over cash.</span></li>
          <li><b>Insurers</b><span>Pay a theft claim once. The item stays flagged wherever it surfaces.</span></li>
        </ul>
      </section>

      <section className="plug-sec" id="plug">
        <div className="sec-head">
          <span className="mono">Plug it in</span>
          <h2>One question before you pay. <em>Ask it now.</em></h2>
          <p className="sec-sub">This is the whole integration. Tap to ask QoreChain about a real passport.</p>
        </div>
        <Plug />
        <div className="whyq">
          <span className="mono red">Why quantum-safe</span>
          <p>A stop button is only worth something if a thief can&apos;t un-press it. Ordinary wallet keys are expected to fall to quantum computers (Q-Day). Then a thief could forge a “found it” and sell the item anyway. Halte only accepts ML-DSA-87 signatures (the NIST FIPS 204 standard), checked on chain by QoreChain. Our tests show a classical key being refused at every step.</p>
        </div>
      </section>

      <section className="replay-sec" id="replay">
        <div className="sec-head">
          <span className="mono">Replay</span>
          <h2>Same dealer, same offer, three answers. <em>Ask the chain yourself.</em></h2>
          <p className="sec-sub">A recorded run on QoreChain Diana. Before the report the dealer could accept offer #2. While the watch was missing, the same call was refused. After it was found, the offer stayed dead. Each question is pinned to the block where it was first asked, so Diana gives the same answer today.</p>
        </div>
        <Replay />
      </section>

      <section className="method" id="method">
        <div className="sec-head">
          <span className="mono">Method</span>
          <h2>Five steps, all on chain. <em>Shown with the watch pilot.</em></h2>
        </div>
        <ol className="figs">
          {FIGS.map((f) => (
            <li key={f.n}>
              <span className="mono fn">Fig. {f.n}</span>
              <svg viewBox="0 0 64 64" className="glyph" aria-hidden dangerouslySetInnerHTML={{ __html: f.glyph }} />
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="night">
      <section className="verify" id="proof">
        <div className="sec-head">
          <span className="mono">Proof</span>
          <h2>Don&apos;t trust the page. <em>Check the chain.</em></h2>
        </div>
        <div className="vgrid">
          <div><span className="mono">Contract</span><b className="big m">{short(live.contract)}</b><p>Halte.sol on QoreChain Diana testnet.</p><a href={txUrl(deployment.deployTx)} target="_blank" rel="noreferrer">Deploy transaction ↗</a></div>
          <div><span className="mono">Precompiles</span><b className="big m">0x…0a01 · 0x…0a02</b><p>pqcVerify checks every offer, freeze and recovery. pqcKeyStatus supplies each holder&apos;s registered, PoP-proven key.</p></div>
          <div><span className="mono">Audit</span><b className="big">QCAI, two stages</b><p>Every finding answered in the repository.</p><a href="https://github.com/emmaGH1/halte/blob/main/docs/AUDIT.md">docs/AUDIT.md ↗</a></div>
          <div><span className="mono">Tests</span><b className="big">21 Hardhat tests</b><p>Wrong keys, replay, expiry, stale offers, ordering races, plus a release run on Diana with real ML-DSA-87.</p><a href="https://github.com/emmaGH1/halte/blob/main/evidence/release/0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4.json">Recorded release run ↗</a></div>
        </div>
      </section>

      <SiteFooter deployTx={deployment.deployTx} block={live.ok ? live.block : undefined} />
      </div>
    </div>
  );
}
