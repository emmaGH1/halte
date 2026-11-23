// scripts/check-live.mjs: for judges. Re-checks every live claim the README makes, straight from
// QoreChain Diana (EVM JSON-RPC + Cosmos REST) and the live site. It never trusts the app.
// Node 20+, nothing to install, no account, no money:  node scripts/check-live.mjs
import { readFileSync } from "node:fs";

const LIVE = process.env.LIVE_URL ?? "https://halte-roan.vercel.app";
const EVM = "https://evm-testnet.qore.host";
const REST = "https://api-testnet.qore.host";
const CONTRACT = "0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4";
const OWNER = "0xB047D9D582ed279bb73791164D6527E477Cc33f9"; // demo owner (qor1kpran4vza5nehdehjyty6ef8u3mucvleeqw08f)
const DEALER = "0xAa5D98cB68a67AA47c3F858B054919EbE6070414"; // demo dealer + relayer (qor14fwe3jmg5ea2glplsk9s2jgea0nqwpq55ucz83)
const deploy = JSON.parse(readFileSync(new URL(`../evidence/deploy/${CONTRACT}.json`, import.meta.url), "utf8"));
const release = JSON.parse(readFileSync(new URL(`../evidence/release/${CONTRACT}.json`, import.meta.url), "utf8"));

// selectors (keccak256 of the signature, first 4 bytes), precomputed so this file needs no packages
const SEL = { pqcKeyStatus: "850dfe51", acceptOffer: "c815729d", makeOffer: "86695a73", statusOf: "c7df14e2" };
const ERR = { "0xef8d77e3": "StaleOffer", "0xf35e1976": "BadPqcSignature", "0xdd656228": "PassportFrozen" };

const word = (hex) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");
const num = (n) => BigInt(n).toString(16).padStart(64, "0");
async function rpc(method, params) {
  const r = await fetch(EVM, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error && method !== "eth_call") throw new Error(`${method}: ${j.error.message}`);
  return j;
}
const call = (from, to, data) => rpc("eth_call", [{ from, to, data }, "latest"]);
const revertName = (res) => {
  const d = res.error?.data;
  const sel = typeof d === "string" ? d.slice(0, 10) : typeof d?.data === "string" ? d.data.slice(0, 10) : null;
  if (!res.error) return "would succeed";
  return ERR[sel] ?? `reverted (${sel ?? res.error.message})`;
};
const receipt = async (hash) => {
  const r = (await rpc("eth_getTransactionReceipt", [hash])).result;
  if (!r) throw new Error(`no receipt for ${hash}`);
  return r;
};
const cosmosTx = async (hash) => {
  const r = await fetch(`${REST}/cosmos/tx/v1beta1/txs/${hash}`);
  if (!r.ok) throw new Error(`REST ${r.status} for ${hash}`);
  return (await r.json()).tx_response;
};
const attrs = (tx, type) => tx.events.filter((e) => e.type === type).map((e) => Object.fromEntries(e.attributes.map((a) => [a.key, a.value])));
const txOf = (label) => release.steps.find((s) => s.kind === "tx" && s.step.startsWith(label));

const checks = [
  {
    claim: "The live site runs the Halte contract this README names",
    run: async () => {
      const v = await (await fetch(`${LIVE}/version.json`)).json();
      if (v.contract?.toLowerCase() !== CONTRACT) throw new Error(`site reports ${v.contract}`);
      return `${LIVE} → ${v.contract} (deploy ${v.commit})`;
    },
  },
  {
    claim: "Halte is deployed on Diana (chain 9800) from the listed owner account",
    run: async () => {
      const chain = (await rpc("eth_chainId", [])).result;
      if (chain !== "0x2648") throw new Error(`chain id ${chain}`);
      const r = await receipt(deploy.deployTx);
      if (r.status !== "0x1" || r.contractAddress?.toLowerCase() !== CONTRACT) throw new Error("deploy receipt does not create this contract");
      if (r.from.toLowerCase() !== OWNER.toLowerCase()) throw new Error(`deployed by ${r.from}`);
      return `deploy tx ${deploy.deployTx.slice(0, 12)}… at block ${BigInt(r.blockNumber)}`;
    },
  },
  {
    claim: "Both demo accounts hold a registered ML-DSA-87 key (2,592 bytes) with proof of possession, per the pqcKeyStatus precompile",
    run: async () => {
      const out = [];
      for (const a of [OWNER, DEALER]) {
        const res = (await call(a, "0x0000000000000000000000000000000000000a02", `0x${SEL.pqcKeyStatus}${word(a)}`)).result;
        const w = (i) => BigInt(`0x${res.slice(2 + i * 64, 2 + (i + 1) * 64)}`);
        const [registered, alg, , pop, len] = [w(0), w(1), w(2), w(3), w(4)];
        if (registered !== 1n || alg !== 1n || pop !== 1n || len !== 2592n) throw new Error(`${a}: registered=${registered} alg=${alg} pop=${pop} len=${len}`);
        out.push(`${a.slice(0, 8)}… ✓`);
      }
      return out.join(" · ");
    },
  },
  {
    claim: "The EVM window was opened by a hybrid-signed native tx (pqc_hybrid_verify = verified) and is scoped to the Halte contract only",
    run: async () => {
      const tx = await cosmosTx(deploy.runtimeWindowTx);
      const h = attrs(tx, "pqc_hybrid_verify")[0];
      const w = attrs(tx, "pqc_evm_window_opened")[0];
      if (tx.code !== 0 || h?.status !== "verified") throw new Error(`hybrid status ${h?.status}`);
      if (w?.allowed_targets?.toLowerCase() !== CONTRACT) throw new Error(`window targets ${w?.allowed_targets}`);
      return `tx ${deploy.runtimeWindowTx.slice(0, 10)}… · ${h.algorithm_id} verified · targets ${w.allowed_targets}`;
    },
  },
  {
    claim: "The owner's ML-DSA-87 report (freeze) landed on chain, carried a 4,627-byte signature and was sent by the dealer account, not the holder",
    run: async () => {
      const s = txOf("owner's ML-DSA-87 report");
      const r = await receipt(s.hash);
      const tx = (await rpc("eth_getTransactionByHash", [s.hash])).result;
      // freeze(bytes32 id, uint64 expiry, bytes sig): the signature length word sits at the offset in arg 3
      const body = tx.input.slice(10);
      const off = Number(BigInt(`0x${body.slice(128, 192)}`)) * 2;
      const len = Number(BigInt(`0x${body.slice(off, off + 64)}`));
      if (r.status !== "0x1") throw new Error("freeze tx failed");
      if (len !== 4627) throw new Error(`signature is ${len} bytes`);
      if (tx.from.toLowerCase() !== DEALER.toLowerCase()) throw new Error(`sent by ${tx.from}`);
      return `tx ${s.hash.slice(0, 12)}… · ${len}-byte signature · from ${tx.from.slice(0, 8)}… (holder is ${OWNER.slice(0, 8)}…)`;
    },
  },
  {
    claim: "Every transaction in the recorded release run succeeded on Diana (mint, signed offer, freeze, recovery, real handoff)",
    run: async () => {
      const txs = release.steps.filter((s) => s.kind === "tx");
      for (const s of txs) if ((await receipt(s.hash)).status !== "0x1") throw new Error(`${s.step} failed: ${s.hash}`);
      return `${txs.length} of ${txs.length} successful`;
    },
  },
  {
    claim: "Right now, the offer made before the report is dead: the same dealer accepting it is refused with StaleOffer",
    run: async () => {
      const res = await call(DEALER, CONTRACT, `0x${SEL.acceptOffer}${num(release.offerId)}`);
      const got = revertName(res);
      if (got !== "StaleOffer") throw new Error(`got ${got}`);
      return `acceptOffer(${release.offerId}) from the dealer → ${got}`;
    },
  },
  {
    claim: "Right now, a stolen classical key can't list the watch: an offer from the holder's own address without the ML-DSA-87 signature is refused",
    run: async () => {
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
      // makeOffer(id, dealer, expiry, bytes "") : head (4 words) + empty bytes
      const data = `0x${SEL.makeOffer}${word(release.passport)}${word(DEALER)}${num(expiry)}${num(128)}${num(0)}`;
      const got = revertName(await call(OWNER, CONTRACT, data));
      if (got !== "BadPqcSignature") throw new Error(`got ${got}`);
      return `makeOffer from ${OWNER.slice(0, 8)}… with no PQ signature → ${got}`;
    },
  },
  {
    claim: "The handoff passport really changed hands to the dealer through an owner-signed offer",
    run: async () => {
      const r = await receipt(txOf("the dealer accepts").hash);
      const t = r.logs.find((l) => l.address.toLowerCase() === CONTRACT && l.topics.length === 4);
      const to = `0x${t.topics[3].slice(26)}`;
      if (to.toLowerCase() !== DEALER.toLowerCase()) throw new Error(`Transferred to ${to}`);
      return `Transferred(${release.handoffPassport.slice(0, 10)}…) → ${to.slice(0, 8)}…`;
    },
  },
];

let passed = 0;
for (const c of checks) {
  try {
    const saw = await c.run(LIVE);
    passed++;
    console.log(`PASS  ${c.claim}${saw ? `\n      ${saw}` : ""}`);
  } catch (e) {
    console.log(`FAIL  ${c.claim}: ${e.message}`);
  }
}
console.log(`\n${passed} of ${checks.length} passed.`);
process.exit(passed === checks.length ? 0 : 1);
