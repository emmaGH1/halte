import "server-only";
import { StargateClient } from "@cosmjs/stargate";
import {
  EthNativeSigner,
  deriveUnifiedAccount,
  fetchEvmWindow,
  generatePqcKeypair,
  openEvmWindowMsg,
  pqcSign,
  type UnifiedAccount,
} from "@qorechain/sdk";
import { evmWindowCost } from "@qorechain/evm";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseGwei,
  toHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import abi from "./halte-abi.json";
import deployment from "./deployment.json";

export const HALTE_ABI = abi as any;
export const CHAIN_ID = "qorechain-diana";
export const REST = "https://api-testnet.qore.host";
export const RPC = "https://rpc-testnet.qore.host";
export const EVM_RPC = "https://evm-testnet.qore.host";
export const EXPLORER = "https://explore.qore.network";

export const diana = defineChain({
  id: 9800,
  name: "QoreChain Diana",
  nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 },
  rpcUrls: { default: { http: [EVM_RPC] } },
});

export const contract = () => {
  const a = deployment.contract;
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) throw new Error("lib/deployment.json has no contract address");
  return a as Hex;
};
export const deployBlock = () => BigInt(deployment.deployBlock);

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash.replace(/^0x/, "").toUpperCase()}`;

export const pub = createPublicClient({ chain: diana, transport: http() });

let owner: Promise<UnifiedAccount> | null = null;
let dealer: Promise<UnifiedAccount> | null = null;
const mnemonic = () => {
  const m = process.env.QORE_MNEMONIC?.trim();
  if (!m) throw new Error("QORE_MNEMONIC is not set");
  return m;
};
/** Demo owner (account 0): issues passports and holds the registered ML-DSA-87 key that signs offers and reports. */
export const ownerAccount = () => (owner ??= deriveUnifiedAccount(mnemonic(), 0));
/** Demo dealer (account 1): its own PoP-registered ML-DSA-87 key, so it may accept; it also relays the owner's signed messages. */
export const dealerAccount = () => (dealer ??= deriveUnifiedAccount(mnemonic(), 1));

const FEE = { gas: 600_000n, maxFeePerGas: parseGwei("250"), maxPriorityFeePerGas: parseGwei("1") };

/** A failure to reach Diana, kept apart from a contract refusal so the page never shows one as the other. */
export class TransportError extends Error {}

async function accountSequence(address: string) {
  const res = await fetch(`${REST}/cosmos/auth/v1beta1/accounts/${address}`, { cache: "no-store" });
  if (!res.ok) throw new TransportError(`account query failed: HTTP ${res.status}`);
  const body = (await res.json()) as { account?: Record<string, any> };
  const acc = (body.account?.base_account ?? body.account ?? {}) as Record<string, string>;
  return { accountNumber: BigInt(acc.account_number ?? "0"), sequence: BigInt(acc.sequence ?? "0") };
}

export type WindowInfo = { openedTx?: string; remainingTxs?: string; remainingBlocks?: string; scopedTo: string };

/**
 * Every EVM write needs a live EVM window, opened by a hybrid-signed (secp256k1 + ML-DSA-87)
 * native transaction. Halte's windows are scoped: they admit calls to the Halte contract only.
 * Call only under the signer's lock: the native renewal shares the account sequence with EVM writes.
 */
export async function ensureWindow(acc: UnifiedAccount): Promise<WindowInfo> {
  const target = contract();
  const w: any = await fetchEvmWindow({ rest: REST, address: acc.cosmos });
  // reuse only a window scoped to exactly one target, Halte: a wider window would admit calls elsewhere
  const targets: string[] = (w.allowedTargets ?? []).map((t: string) => t.toLowerCase());
  const scoped = targets.length === 1 && targets[0] === target.toLowerCase();
  if (w.found && w.live && scoped && BigInt(w.remainingTxs ?? 0) > 1n && BigInt(w.remainingBlocks ?? 0) > 20n) {
    return { remainingTxs: String(w.remainingTxs), remainingBlocks: String(w.remainingBlocks), scopedTo: target };
  }
  const maxTxs = 60n;
  const perTx = evmWindowCost({ gas: FEE.gas, maxFeePerGas: FEE.maxFeePerGas });
  const msg = openEvmWindowMsg({ sender: acc.cosmos, blocks: 17_280n, maxTxs, maxValue: perTx * maxTxs, allowedTargets: [target] });
  const { accountNumber, sequence } = await accountSequence(acc.cosmos);
  const signer = new EthNativeSigner(acc, { signMode: "hybrid", rest: REST });
  const transport = await StargateClient.connect(RPC);
  try {
    const res: any = await signer.signAndBroadcast(transport as any, {
      chainId: CHAIN_ID,
      accountNumber,
      sequence,
      fee: { amount: [{ denom: "uqor", amount: "100000" }], gas: "800000" },
      messages: [msg],
    });
    if (res.code) throw new Error(`window renewal refused: code ${res.code}`);
    await new Promise((r) => setTimeout(r, 4000)); // let the EVM nonce settle after the window tx
    return { openedTx: res.transactionHash, remainingTxs: String(maxTxs), remainingBlocks: "17280", scopedTo: target };
  } finally {
    transport.disconnect();
  }
}

export type Sent = { hash: Hex; url: string; block: string; sender: string; window: WindowInfo };

/**
 * Send one Halte call from a demo signer. Simulated first, so a refusal is reported and never paid for.
 * The caller holds the signer's lock (see lib/guard.ts).
 */
export async function send(acc: UnifiedAccount, functionName: string, args: unknown[]): Promise<Sent> {
  const window = await ensureWindow(acc);
  const wallet = createWalletClient({ chain: diana, account: privateKeyToAccount(acc.privateKey as Hex), transport: http() });
  const pre = await simulate(wallet.account.address, functionName, args);
  if (pre.outcome !== "would succeed") throw new ContractRefusal(pre.outcome);
  const nonce = await pub.getTransactionCount({ address: wallet.account.address, blockTag: "pending" });
  const hash = await wallet.writeContract({ address: contract(), abi: HALTE_ABI, functionName, args, nonce, ...FEE } as any);
  const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 45_000 });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted on chain (${hash})`);
  return { hash, url: txUrl(hash), block: receipt.blockNumber.toString(), sender: wallet.account.address, window };
}

export class ContractRefusal extends Error {
  constructor(public reason: string) {
    super(`Halte refused: ${reason}`);
  }
}

export type Check = { outcome: string; block: string };

/**
 * eth_call against live Diana state, never broadcast. Returns "would succeed" or the contract's
 * exact custom error name. Anything that isn't a decoded contract answer throws TransportError.
 */
export async function simulate(from: Hex, functionName: string, args: unknown[], at?: bigint): Promise<Check> {
  let block: bigint;
  try {
    block = at ?? (await pub.getBlockNumber());
  } catch (e) {
    throw new TransportError(`Diana RPC unreachable: ${(e as Error).message.split("\n")[0]}`);
  }
  try {
    await pub.simulateContract({ account: from, address: contract(), abi: HALTE_ABI, functionName, args, blockNumber: block } as any);
    return { outcome: "would succeed", block: block.toString() };
  } catch (e) {
    const r = e instanceof BaseError ? e.walk((x) => x instanceof ContractFunctionRevertedError) : null;
    if (r instanceof ContractFunctionRevertedError && r.data?.errorName) return { outcome: r.data.errorName, block: block.toString() };
    throw new TransportError(`Diana did not give a contract answer: ${(e as Error).message.split("\n")[0].slice(0, 160)}`);
  }
}

export async function readPassport(id: Hex) {
  const p = (await pub.readContract({ address: contract(), abi: HALTE_ABI, functionName: "passports", args: [id] })) as any[];
  return { owner: p[0] as string, status: Number(p[1]), epoch: Number(p[2]), nonce: BigInt(p[3]), offerNonce: BigInt(p[4]) };
}

export async function readOffer(offerId: bigint) {
  const o = (await pub.readContract({ address: contract(), abi: HALTE_ABI, functionName: "offers", args: [offerId] })) as any[];
  return { passportId: o[0] as Hex, dealer: o[1] as string, epoch: Number(o[2]), expiry: Number(o[3]), open: o[4] as boolean };
}

const pqHex = (key: Uint8Array, digest: Hex) => toHex(pqcSign(key, Buffer.from(digest.slice(2), "hex")));

/** The owner's ML-DSA-87 signature over a freeze or recovery digest (or a random key's, for the thief). */
export async function signAction(kind: "freeze" | "recover", id: Hex, opts: { wrongKey?: boolean } = {}) {
  const acc = await ownerAccount();
  const p = await readPassport(id);
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 600);
  const digest = (await pub.readContract({
    address: contract(),
    abi: HALTE_ABI,
    functionName: kind === "freeze" ? "freezeDigest" : "recoverDigest",
    args: [id, p.nonce, expiry],
  })) as Hex;
  const key = opts.wrongKey ? generatePqcKeypair().secretKey : acc.pqc.secretKey;
  return { expiry, digest, signature: pqHex(key, digest) };
}

/** The owner's ML-DSA-87 signature over a transfer offer to one named dealer. */
export async function signOffer(id: Hex, dealer: Hex) {
  const acc = await ownerAccount();
  const p = await readPassport(id);
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const digest = (await pub.readContract({
    address: contract(),
    abi: HALTE_ABI,
    functionName: "offerDigest",
    args: [id, dealer, BigInt(p.epoch), p.offerNonce, expiry],
  })) as Hex;
  return { expiry, digest, signature: pqHex(acc.pqc.secretKey, digest) };
}

export const STATUS = ["none", "active", "frozen"] as const;
