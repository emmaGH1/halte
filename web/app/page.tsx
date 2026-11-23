import deployment from "@/lib/deployment.json";
import { txUrl } from "@/lib/chain";
import { readLive } from "@/lib/live";
import { MintButton } from "./mint";
import { HeroArt, Wordmark } from "./ui";

export const revalidate = 30;

const short = (s: string, a = 6, b = 4) => `${s.slice(0, a)}…${s.slice(-b)}`;
const n = (s?: string) => (s ? Number(s).toLocaleString("en-US") : "—");

const FIGS: { n: string; title: string; body: string; glyph: string }[] = [
  { n: "01", title: "Issue", body: "The owner issues a passport for the watch. Halte refuses unless the owner already holds a registered ML-DSA-87 key on QoreChain, so every passport can be frozen later.", glyph: `<rect x="14" y="8" width="36" height="48" class="g"/><path d="M20 18h24M20 26h24M20 34h14" class="g"/><circle cx="40" cy="46" r="6" class="g acc"/>` },
  { n: "02", title: "Offer", body: "A dealer receives a transfer offer, stamped with the passport's current epoch. While the watch is with its owner, the offer is live.", glyph: `<path d="M8 24h40l-8-8M56 40H16l8 8" class="g"/>` },
  { n: "03", title: "Report", body: "The watch goes missing. The owner signs a report with their quantum-safe key. Anyone may relay it; the contract checks it with the pqcVerify precompile and freezes the passport.", glyph: `<path d="M6 40c6-14 10-14 14 0s8 14 12 0 8-14 12 0 8 10 14 0" class="g"/><path d="M6 50h52" class="g acc"/>` },
  { n: "04", title: "Refuse", body: "The freeze bumped the epoch. Every outstanding offer is now stale, so a dealer's accept reverts: PassportFrozen. A thief holding the owner's classical key gets BadPqcSignature.", glyph: `<circle cx="32" cy="32" r="22" class="g acc"/><path d="M16 32h32" class="g acc"/>` },
  { n: "05", title: "Recover", body: "The watch is found. Only the owner's registered ML-DSA-87 key can lift the freeze. Offers made before it stay dead, so the thief's sale can never be revived.", glyph: `<circle cx="22" cy="32" r="10" class="g"/><path d="M32 32h24M48 32v8M54 32v6" class="g"/>` },
];

export default async function Home() {
  const live = await readLive();
  return (
    <div className="catalogue">
      <div className="grain" aria-hidden />
      <header className="bar">
        <Wordmark />
        <span className="mono ref">Ref. H-01 · QoreChain Diana</span>
        <nav className="mono">
          <a href="#method"><b>01</b>Method</a>
          <a href="#proof"><b>02</b>Proof</a>
          <a href="https://github.com/emmaGH1/halte"><b>03</b>Source</a>
        </nav>
      </header>

      <section className="hero">
        <HeroArt />
        <h1>
          <span className="sw">Stolen means</span>
          <em>unsellable<i>.</i></em>
        </h1>
        <div className="hero-copy">
          <p className="lede">
            A digital passport for fine watches. Report one missing and it freezes in a single block. Every open sale dies with it,
            and only the owner&apos;s quantum-safe key can lift it.
          </p>
          <div className="cta">
            <MintButton />
            <a className="link" href="#method">How it stops a sale</a>
          </div>
          <p className="fine">
            Runs on QoreChain Diana testnet. No wallet needed: for this demo the owner&apos;s ML-DSA-87 key is held by the Halte server.
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
          <div className="tr"><span className="mono">Owner key</span><span>ML-DSA-87 (FIPS 204) · {live.keyBytes ? `${live.keyBytes.toLocaleString("en-US")}-byte` : "registered"} public key</span></div>
          <div className="tr">
            <span className="mono">Last freeze</span>
            <span>
              {live.lastFreeze ? <><a href={live.lastFreeze.url} target="_blank" rel="noreferrer">tx {short(live.lastFreeze.hash, 10, 4)}</a> · block {n(live.lastFreeze.block)}</> : "none yet"} · verified by pqcVerify
            </span>
          </div>
          <div className="tr"><span className="mono">Passports</span><span>{live.minted ?? "—"} issued · {live.frozen ?? "—"} {live.frozen === 1 ? "freeze" : "freezes"} signed on chain</span></div>
          <div className="tr"><span className="mono">Contract</span><span><a href={txUrl(deployment.deployTx)} target="_blank" rel="noreferrer">{short(live.contract)}</a> · reached only through a scoped EVM window</span></div>
        </div>
        <div className="rail mono">Fig. 1 · Calibre H-01 with the stop lever engaged</div>
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

      <section className="verify" id="proof">
        <div className="sec-head">
          <span className="mono">Proof</span>
          <h2>Don&apos;t trust the page. <em>Check the chain.</em></h2>
        </div>
        <div className="vgrid">
          <div><span className="mono">Contract</span><p>{live.contract}</p><a href={txUrl(deployment.deployTx)} target="_blank" rel="noreferrer">Deploy transaction ↗</a></div>
          <div><span className="mono">Precompiles</span><p>pqcVerify at 0x…0a01 checks every freeze and recovery. pqcKeyStatus at 0x…0a02 supplies the owner&apos;s registered key.</p></div>
          <div><span className="mono">Audit</span><p>Two-stage QCAI audit with every finding answered in the repository.</p><a href="https://github.com/emmaGH1/halte/blob/main/docs/AUDIT.md">docs/AUDIT.md ↗</a></div>
          <div><span className="mono">Tests</span><p>Hardhat tests cover wrong keys, replay, expiry, stale offers and transfers.</p><a href="https://github.com/emmaGH1/halte">github.com/emmaGH1/halte ↗</a></div>
        </div>
      </section>

      <footer className="foot mono">
        <span>Halte · Stolen means unsellable</span>
        <span>Built for Build Before Q-Day · QoreChain Diana testnet · Apache-2.0</span>
      </footer>
    </div>
  );
}
