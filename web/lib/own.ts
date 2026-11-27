// "Hold your own key": everything secret lives in this browser. Load with dynamic import() only.
import { buildRegisterPqcKeyMsg, deriveUnifiedAccount, EthNativeSigner, generateMnemonic, openEvmWindowMsg, pqcSign, signProofOfPossession, type UnifiedAccount } from "@qorechain/sdk";
import { createPublicClient, createWalletClient, defineChain, hexToBytes, http, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import abi from "./halte-abi.json";
import deployment from "./deployment.json";
import replay from "./replay.json";
import { txUrl } from "./tx-url";

const CONTRACT = deployment.contract as Hex;
const STORE = "halte:own:v1";
const diana = defineChain({ id: 9800, name: "QoreChain Diana", nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 }, rpcUrls: { default: { http: ["https://evm-testnet.qore.host"] } } });
const pub = createPublicClient({ chain: diana, transport: http() }); // Diana's EVM RPC allows browser origins
const nativeTxUrl = (hash: string) => txUrl(hash.replace(/^0x/i, ""));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Saved = { mnemonic: string; evm: string; cosmos: string; passport?: string; createdAt: string };
export const load = (): Saved | null => { try { return JSON.parse(localStorage.getItem(STORE) ?? "null"); } catch { return null; } };
const save = (s: Saved) => localStorage.setItem(STORE, JSON.stringify(s));
export const forget = () => localStorage.removeItem(STORE);

let cached: { m: string; acc: UnifiedAccount } | null = null;
async function acc(s: Saved) {
  if (cached?.m !== s.mnemonic) cached = { m: s.mnemonic, acc: await deriveUnifiedAccount(s.mnemonic, 0) };
  return cached.acc;
}

async function api(path: string, body?: object) {
  const res = await fetch(path, body
    ? { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify(body) }
    : { cache: "no-store" }).catch(() => null);
  const j = res ? await res.json().catch(() => ({ error: "Unreadable answer." })) : { error: "Network error: Halte did not answer." };
  if (!res?.ok || j.error) throw Object.assign(new Error(j.error ?? `HTTP ${res?.status}`), { code: j.code });
  return j;
}

const native = async (a: UnifiedAccount, mode: "classical" | "hybrid", messages: any[]) => {
  const info = await api(`/api/own/account?a=${a.cosmos}`);
  const signed = new EthNativeSigner(a, { signMode: mode, signBytesVersion: info.signBytesVersion }).sign({
    chainId: info.chainId, accountNumber: BigInt(info.accountNumber), sequence: BigInt(info.sequence),
    fee: { amount: [{ denom: "uqor", amount: "100000" }], gas: "800000" }, messages,
  });
  // signed here; Halte only passes the bytes on, because Diana's REST and RPC refuse browser origins
  let bin = ""; for (const b of signed.txRawBytes) bin += String.fromCharCode(b);
  return (await api("/api/own/broadcast", { tx: btoa(bin) })).tx as string;
};

export type Step = { key: string; label: string; state: "todo" | "doing" | "done" | "failed"; tx?: string; note?: string };
export const STEPS: Step[] = [
  { key: "keys", label: "Generate your keys in this browser (secp256k1 + ML-DSA-87)", state: "todo" },
  { key: "fund", label: "Halte sends your new account 1 test QOR for fees", state: "todo" },
  { key: "register", label: "Register your ML-DSA-87 key on QoreChain, with proof of possession", state: "todo" },
  { key: "window", label: "Open an EVM window, hybrid-signed, scoped to the Halte contract", state: "todo" },
  { key: "mint", label: "Issue the passport from your own address", state: "todo" },
];

/** The whole onboarding. Resumable: each step checks the chain first, so a reload carries on. */
export async function onboard(update: (key: string, patch: Partial<Step>) => void): Promise<string> {
  let s = load();
  const run = async <T,>(key: string, fn: () => Promise<T>) => {
    update(key, { state: "doing" });
    try { const out = await fn(); return out; } catch (e) { update(key, { state: "failed", note: (e as Error).message }); throw e; }
  };

  await run("keys", async () => {
    if (!s) {
      const mnemonic = generateMnemonic(256);
      const a = await deriveUnifiedAccount(mnemonic, 0);
      s = { mnemonic, evm: a.evm, cosmos: a.cosmos, createdAt: new Date().toISOString() };
      save(s); // saved before anything is sent, so nothing is lost if the page closes
    }
    update("keys", { state: "done", note: s.evm });
  });
  const a = await acc(s!);

  let info = await api(`/api/own/account?a=${a.cosmos}`);
  await run("fund", async () => {
    if (!info.exists) {
      const f = await api("/api/own/fund", { address: a.cosmos });
      update("fund", { tx: nativeTxUrl(f.tx) });
      for (let i = 0; i < 20 && !info.exists; i++) { await sleep(1200); info = await api(`/api/own/account?a=${a.cosmos}`); }
      if (!info.exists) throw new Error("The funding hasn't reached Diana yet. Try again in a moment.");
    }
    update("fund", { state: "done" });
  });

  await run("register", async () => {
    if (!info.registered) {
      const pop = signProofOfPossession({ chainId: info.chainId, account: a.cosmos, keypair: a.pqc });
      // registration is the one message QoreChain accepts signed classically: the key doesn't exist yet
      const h = await native(a, "classical", [buildRegisterPqcKeyMsg(a.cosmos, { pqcKeypair: a.pqc, proofOfPossession: pop })]);
      update("register", { tx: nativeTxUrl(h) });
      for (let i = 0; i < 20 && !info.registered; i++) { await sleep(1200); info = await api(`/api/own/account?a=${a.cosmos}`); }
      if (!info.registered) throw new Error("The key registration hasn't confirmed yet. Try again in a moment.");
    }
    update("register", { state: "done" });
  });

  if (s!.passport) {
    update("window", { state: "done", note: "already used" });
    update("mint", { state: "done", tx: undefined, note: s!.passport });
    return s!.passport;
  }

  await run("window", async () => {
    const perTx = 600_000n * 250_000_000_000n / 1_000_000_000_000n; // uqor per admitted tx (gas × fee cap)
    const h = await native(a, "hybrid", [openEvmWindowMsg({ sender: a.cosmos, blocks: 2_000n, maxTxs: 2n, maxValue: perTx * 2n, allowedTargets: [CONTRACT] })]);
    update("window", { state: "done", tx: nativeTxUrl(h) });
    await sleep(4000); // the window tx advances the account's nonce; let it settle
  });

  return run("mint", async () => {
    const id = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const wallet = createWalletClient({ chain: diana, transport: http(), account: privateKeyToAccount(a.privateKey as Hex) });
    const h = await wallet.writeContract({ address: CONTRACT, abi, functionName: "mint", args: [id], gas: 600_000n, maxFeePerGas: 250_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n });
    const r = await pub.waitForTransactionReceipt({ hash: h, timeout: 60_000 });
    if (r.status !== "success") throw new Error("The mint reverted on Diana.");
    s = { ...s!, passport: id };
    save(s);
    update("mint", { state: "done", tx: txUrl(h, r.blockNumber), note: id });
    return id;
  });
}

/** Sign an offer, report or recovery with the ML-DSA-87 key in this browser; the dealer account relays it. */
export async function signAndRelay(kind: "offer" | "freeze" | "recover", id: Hex) {
  const s = load();
  if (!s) throw new Error("No key in this browser.");
  const a = await acc(s);
  const p = (await pub.readContract({ address: CONTRACT, abi, functionName: "passports", args: [id] })) as any[];
  const expiry = BigInt(Math.floor(Date.now() / 1000) + (kind === "offer" ? 3600 : 600));
  const digest = (await pub.readContract(kind === "offer"
    ? { address: CONTRACT, abi, functionName: "offerDigest", args: [id, replay.dealer, p[2], p[4], expiry] }
    : { address: CONTRACT, abi, functionName: kind === "freeze" ? "freezeDigest" : "recoverDigest", args: [id, p[3], expiry] })) as Hex;
  const signature = toHex(pqcSign(a.pqc.secretKey, hexToBytes(digest)));
  return api("/api/own/relay", { action: kind, id, expiry: expiry.toString(), signature });
}
