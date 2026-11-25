import deployment from "@/lib/deployment.json";
import { txUrl } from "@/lib/chain";
import { readLive } from "@/lib/live";
import { MintButton } from "./mint";
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
        links={[{ href: "#method", label: "Method" }, { href: "#proof", label: "Proof" }, { href: "/check", label: "Check a passport" }, { href: "https://github.com/emmaGH1/halte", label: "Source", ext: true }]}
        cta={{ href: "#top", label: "Issue a passport" }}
      />

      <section className="hero hero--b">
        <HeroArt />
        <h1>
          <span className="sw">Stolen means</span>
          <em>unsellable<i>.</i></em>
        </h1>
        <p className="claim" data-demo="claim">A missing-watch report blocks every transfer of its passport.</p>
        <div className="hero-copy">
          <p className="lede">
            A digital passport for a luxury watch, on QoreChain. If the watch is stolen, the owner reports it with a
            quantum-safe signature and no dealer can buy it. Even after it&apos;s found, any deal made around the theft stays dead.
          </p>
          <div className="cta">
            <MintButton tour />
            <MintButton variant="btn ghost-btn" />
          </div>
          <p className="cta-note">
            New here? The tour issues you a real passport and walks you through it: sell it, report it stolen, watch the dealer get
            refused. About two minutes. Or <a href="/check/0xbed648483ebb7c1bb1ccb005a5f858540739d25789bc21ea1547803dac915fcd?offer=2" data-demo="check-link">check a passport like a dealer</a>.
          </p>
          <p className="fine">
            Runs on QoreChain Diana testnet. No wallet needed: for this demo the owner&apos;s and dealer&apos;s ML-DSA-87 keys are held by the Halte server. Or <a href="/own" data-demo="own-link">hold your own key</a>: generated in your browser, never sent to Halte.
          </p>
        </div>
        <div className="fig-cap">
          <span className="mono red">Fig. 5 · Stop lever</span>
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
          <h2>Every mechanical watch has a lever that stops it. <em>Halte is that lever for a stolen watch&apos;s sale.</em></h2>
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
