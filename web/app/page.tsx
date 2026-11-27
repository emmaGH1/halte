import { deployTxUrl } from "@/lib/tx-url";
import { readLive } from "@/lib/live";
import { DotIcon, Lattice } from "./lattice";
import { MintButton } from "./mint";
import { Plug } from "./plug";
import { HeldLogo } from "./ui";
import "./home.css";

export const revalidate = 30;

const short = (s: string, a = 6, b = 4) => `${s.slice(0, a)}…${s.slice(-b)}`;
const n = (s?: string | number) => (s !== undefined ? Number(s).toLocaleString("en-US") : "—");
const GH = "https://github.com/emmaGH1/halte";
const COUNTER = "/check/0xbed648483ebb7c1bb1ccb005a5f858540739d25789bc21ea1547803dac915fcd?offer=2";

const STEPS = [
  {
    t: "Register", b: "The owner issues a passport for the watch, bound to their ML-DSA-87 key on QoreChain. Every sale needs that key's signature.",
    icon: ["..#######..", "..#.....#..", "..#.###.#..", "..#.....#..", "..#.###.#..", "..#.....#..", "..#..+..#..", "..#.+++.#..", "..#######.."],
  },
  {
    t: "Report", b: "Stolen? One signature from the owner's phone. QoreChain verifies it on chain and the passport freezes in the next block.",
    icon: ["..#######..", ".#.......#.", ".#...+...#.", ".#...+...#.", ".#...+...#.", "..#.....#..", "..#..+..#..", "...#...#...", "....###...."],
  },
  {
    t: "Refuse", b: "Every dealer, marketplace or insurer that checks is told “do not buy”. Deals made before the report stay dead, even after recovery.",
    icon: ["...#####...", "..#.....#..", ".#.+...+.#.", "#...+.+...#", "#....+....#", "#...+.+...#", ".#.+...+.#.", "..#.....#..", "...#####..."],
  },
];

const FAQ: [string, string][] = [
  ["Is this real or a mock-up?", "Real. Halte.sol is deployed on QoreChain's Diana testnet and you can verify the demo transactions directly against Diana. For the demo, Halte holds the owner's and dealer's keys so you don't need a wallet. You can also generate your own key in the browser."],
  ["What does “quantum-safe” mean here?", "Ordinary wallet keys (ECDSA) are expected to be breakable by large quantum computers, a moment called Q-Day. Halte only accepts the owner's ML-DSA-87 signature (NIST FIPS 204), checked on chain by QoreChain's pqcVerify precompile. A stolen or cracked wallet key can't report, recover or sell."],
  ["What happens when the watch is found?", "The owner signs a recovery and the passport is active again. Every offer made before the report stays refused (StaleOffer), so a sale arranged around the theft can never be completed."],
  ["How does a dealer or marketplace check?", "One HTTPS call to /api/check, or one contract read (statusOf) from any contract on QoreChain. No account, no fee, and the same answer for everyone."],
  ["What is stored on chain?", "A passport id, its status, the holder's address and signed offers. No names, no photos, no personal data."],
];

export default async function Home() {
  const live = await readLive();
  return (
    <div className="hx" id="top">
      <header className="hx-nav">
        <a href="/" className="hx-logo" aria-label="Halte home"><HeldLogo size={22} /><span>Halte</span></a>
        <nav className="hx-links">
          <a href="#how">How it works</a><a href="#check">Check a watch</a><a href="#quantum">Quantum-safe</a><a href={GH} target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <a href="#start" className="hx-pill">Try the demo</a>
      </header>

      <section className="hx-hero">
        <Lattice className="hx-art" />
        <div className="hx-hero-in">
          <span className="hx-eyebrow"><i className="dot" /> Live on QoreChain Diana · block {n(live.block)}</span>
          <h1>Stolen watches, <span>unsellable.</span></h1>
          <p className="hx-sub">The stolen-watch check for dealers, marketplaces and insurers. Owners report a theft with a quantum-safe signature, and every sale of that watch is refused from the next block.</p>
          <div className="hx-cta" id="start">
            <MintButton variant="hx-btn" tour />
            <MintButton variant="hx-btn ghost" />
          </div>
          <p className="hx-fine">No wallet needed: the demo issues you a real passport on QoreChain testnet. <a href="/own" data-demo="own-link">Hold your own key</a> instead.</p>
        </div>
      </section>

      <section className="hx-stats" aria-label="Live from QoreChain">
        <div><b>{n(live.minted)}</b><span>passports issued</span></div>
        <div><b>{n(live.frozen)}</b><span>reported stolen</span></div>
        <div><b>{live.keyBytes ? n(live.keyBytes) : "2,592"}</b><span>byte ML-DSA-87 owner key</span></div>
        <div><b>1 block</b><span>from report to refusal</span></div>
      </section>

      <section className="hx-sec hx-problem">
        <p className="hx-big">A stolen watch can be resold within days. <em>The dealer who buys it has no way to know.</em> Halte gives every watch a passport its owner can stop, and a question anyone can ask before paying.</p>
      </section>

      <section className="hx-sec" id="check">
        <div className="hx-head">
          <span className="hx-eyebrow">Product</span>
          <h2>One question before you pay.</h2>
          <p>This is the whole integration. Tap to ask QoreChain about a real passport from our recorded run: stolen, found, and its old deal still refused.</p>
        </div>
        <div className="hx-product">
          <div className="hx-card" aria-hidden>
            <div className="hx-card-top"><HeldLogo size={18} /><span>Watch passport</span><span className="hx-chip stop">Old deal void</span></div>
            <b className="hx-card-id">HLT-BED6-4848</b>
            <dl>
              <div><dt>Owner key</dt><dd>ML-DSA-87</dd></div>
              <div><dt>Network</dt><dd>QoreChain Diana</dd></div>
              <div><dt>Offer</dt><dd>#2 · dealer</dd></div>
              <div><dt>History</dt><dd>stolen → found</dd></div>
            </dl>
            <Lattice className="hx-card-art" cycle={false} />
          </div>
          <Plug />
        </div>
        <p className="hx-more">Prefer a screen? <a href={COUNTER} data-demo="check-link">Open the dealer&apos;s counter check →</a></p>
      </section>

      <section className="hx-sec" id="how">
        <div className="hx-head">
          <span className="hx-eyebrow">How it works</span>
          <h2>Three steps, all on chain.</h2>
        </div>
        <ol className="hx-steps">
          {STEPS.map((s, i) => (
            <li key={s.t}>
              <span className="hx-num">0{i + 1}</span>
              <DotIcon rows={s.icon} />
              <h3>{s.t}</h3>
              <p>{s.b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="hx-sec" id="quantum">
        <div className="hx-head">
          <span className="hx-eyebrow">Built for after Q-Day</span>
          <h2>A stop button is only worth something if a thief can&apos;t un-press it.</h2>
          <p>When quantum computers break ordinary wallet keys, a thief could fake the owner&apos;s “found it” and sell anyway. Halte never trusts a wallet key alone.</p>
        </div>
        <div className="hx-vs">
          <div className="bad">
            <span className="hx-eyebrow">Wallet key · ECDSA</span>
            <h3>Breakable after Q-Day</h3>
            <ul><li>✕ Can&apos;t report the watch stolen</li><li>✕ Can&apos;t lift a report</li><li>✕ Can&apos;t sign a sale</li></ul>
            <p className="hx-code">Refused · BadPqcSignature</p>
          </div>
          <div className="good">
            <span className="hx-eyebrow">Owner key · ML-DSA-87</span>
            <h3>NIST FIPS 204, lattice-based</h3>
            <ul><li>✓ Registered on QoreChain with proof of possession</li><li>✓ Checked on chain by pqcVerify</li><li>✓ Required for every report, recovery and sale</li></ul>
            <p className="hx-code">Verified · 4,627-byte signature</p>
          </div>
        </div>
      </section>

      <section className="hx-sec" id="proof">
        <div className="hx-head">
          <span className="hx-eyebrow">Proof</span>
          <h2>Don&apos;t trust this page. Check the chain.</h2>
        </div>
        <div className="hx-proof">
          <a href={deployTxUrl} target="_blank" rel="noreferrer"><span>Contract</span><b>{short(live.contract)}</b><i>Deploy transaction ↗</i></a>
          {live.lastFreeze && <a href={live.lastFreeze.url} target="_blank" rel="noreferrer"><span>Last theft report</span><b>block {n(live.lastFreeze.block)}</b><i>Verified by pqcVerify ↗</i></a>}
          <a href={`${GH}/blob/main/docs/AUDIT.md`} target="_blank" rel="noreferrer"><span>Audit</span><b>QCAI, two stages</b><i>Every finding answered ↗</i></a>
          <a href={`${GH}/blob/main/evidence/release/0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4.json`} target="_blank" rel="noreferrer"><span>Tests</span><b>21 Hardhat tests</b><i>Plus a recorded run on Diana ↗</i></a>
        </div>
      </section>

      <section className="hx-sec" id="faq">
        <div className="hx-head"><span className="hx-eyebrow">Questions</span><h2>Frequently asked.</h2></div>
        <div className="hx-faq">
          {FAQ.map(([q, a]) => (<details key={q}><summary>{q}</summary><p>{a}</p></details>))}
        </div>
      </section>

      <section className="hx-final">
        <Lattice className="hx-art" />
        <div>
          <h2>See it refuse a stolen watch.</h2>
          <p>Two minutes, real transactions, no wallet.</p>
          <MintButton variant="hx-btn" tour />
        </div>
      </section>

      <footer className="hx-foot">
        <a href="/" className="hx-logo"><HeldLogo size={18} /><span>Halte</span></a>
        <nav><a href={GH}>GitHub</a><a href={`${GH}/blob/main/docs/AUDIT.md`}>Audit</a><a href="/own">Own key</a><a href={COUNTER}>Counter check</a></nav>
        <span>Built for Build Before Q-Day · QoreChain Diana testnet · block {n(live.block)}</span>
      </footer>
    </div>
  );
}
