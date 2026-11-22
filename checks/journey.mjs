// checks/journey.mjs: one check per journey step in docs/PLAN.md (Halte).
// Each check drives the LIVE url at phone width, logged out, the way a judge arrives,
// then independently re-reads Diana (EVM JSON-RPC + Cosmos REST). It never trusts the app's own claim.
// After approval, agents don't edit this file.
//
// UI contract the app must expose (data-demo attributes):
//   mint, passport-id, passport-status, tx-link (href = explorer or REST url containing the tx hash)
//   offer, offer-id, report-missing, pqc-verified, dealer-accept, refused, wrong-key-freeze, recover
//   /version.json -> { commit, contract }   (contract = Halte passport contract address on Diana)

export const url = process.env.LIVE_URL ?? "https://halte-roan.vercel.app";
const EVM = "https://evm-testnet.qore.host";
const REST = "https://api-testnet.qore.host";
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const T = 90_000;

export async function deployId() {
  const r = await fetch(`${url}/version.json`).catch(() => null);
  return r?.ok ? `deploy ${(await r.json()).commit}` : "";
}

async function version() {
  const r = await fetch(`${url}/version.json`);
  if (!r.ok) throw new Error(`no /version.json on ${url}`);
  const v = await r.json();
  if (!/^0x[0-9a-fA-F]{40}$/.test(v.contract ?? "")) throw new Error("version.json has no contract address");
  return v;
}

async function rpc(method, params) {
  const r = await fetch(EVM, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  return r.json();
}

// statusOf(bytes32 id) -> uint8 (0 none, 1 active, 2 frozen). selector computed at runtime.
async function chainStatus(contract, id) {
  const { keccak_256 } = await import("@noble/hashes/sha3").catch(() => ({}));
  if (!keccak_256) throw new Error("install @noble/hashes for on-chain checks");
  const sel = Buffer.from(keccak_256(new TextEncoder().encode("statusOf(bytes32)"))).toString("hex").slice(0, 8);
  const res = await rpc("eth_call", [{ to: contract, data: `0x${sel}${id.replace(/^0x/, "").padStart(64, "0")}` }, "latest"]);
  if (res.error) throw new Error(`statusOf reverted: ${res.error.message}`);
  return Number(BigInt(res.result));
}

function txHashFrom(href) {
  const m = String(href).match(/(0x)?([0-9a-fA-F]{64})/);
  if (!m) throw new Error(`no tx hash in link ${href}`);
  return m[2];
}

// a tx is real if Diana has it: EVM receipt (status 0x1) or Cosmos tx (code 0)
async function txOk(hash) {
  const r = await rpc("eth_getTransactionReceipt", [`0x${hash}`]);
  if (r.result) return r.result.status === "0x1";
  const c = await fetch(`${REST}/cosmos/tx/v1beta1/txs/${hash.toUpperCase()}`).then((x) => x.json()).catch(() => null);
  return c?.tx_response?.code === 0;
}

async function phone(fn) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext(PHONE)).newPage();
    return await fn(page);
  } finally {
    await browser.close();
  }
}

const sel = (p, k) => p.locator(`[data-demo=${k}]`).first();

// shared run: J1 mints, later steps reuse the same fresh passport within one status run
let run = null;

async function mintFresh(page) {
  await page.goto(url, { waitUntil: "networkidle" });
  await sel(page, "mint").click({ timeout: 15_000 });
  await sel(page, "passport-id").waitFor({ timeout: T });
  const id = (await sel(page, "passport-id").getAttribute("data-value")) ?? (await sel(page, "passport-id").innerText());
  if (!/^0x[0-9a-fA-F]{64}$/.test(id.trim())) throw new Error(`passport id is not a bytes32: ${id}`);
  return id.trim();
}

export default {
  J1: (ctx) =>
    phone(async (page) => {
      const v = await version();
      const id = await mintFresh(page);
      const shown = (await sel(page, "passport-status").innerText()).toLowerCase();
      if (!shown.includes("active")) throw new Error(`app shows "${shown}", not active`);
      const hash = txHashFrom(await sel(page, "tx-link").getAttribute("href"));
      if (!(await txOk(hash))) throw new Error(`mint tx ${hash} not successful on Diana`);
      const s = await chainStatus(v.contract, id);
      if (s !== 1) throw new Error(`chain says status ${s} for ${id}, not active (1)`);
      run = { id, contract: v.contract, url: page.url() };
      ctx.save("J1-mint", { id, hash, contract: v.contract });
      return `fresh passport ${id.slice(0, 10)}… active on Diana (tx ${hash.slice(0, 8)}…)`;
    }),

  J2: (ctx) =>
    phone(async (page) => {
      if (!run) throw new Error("J1 did not produce a passport");
      await page.goto(run.url, { waitUntil: "networkidle" });
      await sel(page, "offer").click({ timeout: 15_000 });
      await sel(page, "offer-id").waitFor({ timeout: T });
      await sel(page, "report-missing").click();
      await sel(page, "pqc-verified").waitFor({ timeout: T });
      const shown = (await sel(page, "passport-status").innerText()).toLowerCase();
      if (!shown.includes("frozen")) throw new Error(`app shows "${shown}", not frozen`);
      const hash = txHashFrom(await page.locator("[data-demo=tx-link]").last().getAttribute("href"));
      if (!(await txOk(hash))) throw new Error(`freeze tx ${hash} not successful on Diana`);
      const s = await chainStatus(run.contract, run.id);
      if (s !== 2) throw new Error(`chain says status ${s}, not frozen (2)`);
      run.url = page.url();
      ctx.save("J2-freeze", { id: run.id, hash });
      return `ML-DSA freeze landed (tx ${hash.slice(0, 8)}…); chain status frozen`;
    }),

  J3: (ctx) =>
    phone(async (page) => {
      if (!run) throw new Error("no frozen passport from J2");
      await page.goto(run.url, { waitUntil: "networkidle" });
      await sel(page, "dealer-accept").click({ timeout: 15_000 });
      await sel(page, "refused").waitFor({ timeout: T });
      const s = await chainStatus(run.contract, run.id);
      if (s !== 2) throw new Error(`after dealer accept, chain status is ${s}, expected still frozen (2)`);
      ctx.save("J3-refused", { id: run.id, text: await sel(page, "refused").innerText() });
      return "dealer accept refused; passport still frozen on chain";
    }),

  "J3!": () =>
    phone(async (page) => {
      const v = await version();
      const id = await mintFresh(page);
      await sel(page, "wrong-key-freeze").click({ timeout: 15_000 });
      await sel(page, "refused").waitFor({ timeout: T });
      if (await sel(page, "pqc-verified").isVisible()) throw new Error("app shows pqc-verified for a wrong-key freeze");
      const s = await chainStatus(v.contract, id);
      if (s !== 1) throw new Error(`wrong-key freeze changed chain status to ${s}`);
      return "wrong-key freeze refused; chain status stayed active";
    }),

  J4: (ctx) =>
    phone(async (page) => {
      if (!run) throw new Error("no frozen passport");
      await page.goto(run.url, { waitUntil: "networkidle" });
      await sel(page, "recover").click({ timeout: 15_000 });
      await page.waitForFunction(() => /active/i.test(document.querySelector("[data-demo=passport-status]")?.textContent ?? ""), null, { timeout: T });
      const hash = txHashFrom(await page.locator("[data-demo=tx-link]").last().getAttribute("href"));
      if (!(await txOk(hash))) throw new Error(`recover tx ${hash} not successful on Diana`);
      if ((await chainStatus(run.contract, run.id)) !== 1) throw new Error("chain status not active after recover");
      await sel(page, "dealer-accept").click();
      await sel(page, "refused").waitFor({ timeout: T });
      ctx.save("J4-recover", { id: run.id, hash });
      return `recovered (tx ${hash.slice(0, 8)}…); stale pre-freeze offer still refused`;
    }),
};
