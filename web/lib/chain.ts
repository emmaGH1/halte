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
/** Demo owner (account 0): holds the registered ML-DSA-87 key. Server-held for the judge demo. */
export const ownerAccount = () => (owner ??= deriveUnifiedAccount(mnemonic(), 0));
/** Demo dealer (account 1): only ever simulates; never needs funds. */
export const dealerAccount = () => (dealer ??= deriveUnifiedAccount(mnemonic(), 1));

const FEE = { gas: 3_000_000n, maxFeePerGas: parseGwei("250"), maxPriorityFeePerGas: parseGwei("1") };

async function accountSequence(address: string) {
  const res = await fetch(`${REST}/cosmos/auth/v1beta1/accounts/${address}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`account query failed: HTTP ${res.status}`);
  const body = (await res.json()) as { account?: Record<string, any> };
  const acc = (body.account?.base_account ?? body.account ?? {}) as Record<string, string>;
  return { accountNumber: BigInt(acc.account_number ?? "0"), sequence: BigInt(acc.sequence ?? "0") };
}

export type WindowInfo = { openedTx?: string; remainingTxs?: string; remainingBlocks?: string; scopedTo: string };

/**
 * Every EVM write needs a live EVM window, opened by a hybrid-signed (secp256k1 + ML-DSA-87)
 * native transaction. Halte's window is scoped: it admits calls to the Halte contract only.
 */
export async function ensureWindow(): Promise<WindowInfo> {
  const acc = await ownerAccount();
  const target = contract();
  const w: any = await fetchEvmWindow({ rest: REST, address: acc.cosmos });
  if (w.found && w.live && BigInt(w.remainingTxs ?? 0) > 1n && BigInt(w.remainingBlocks ?? 0) > 20n) {
    return { remainingTxs: String(w.remainingTxs), remainingBlocks: String(w.remainingBlocks), scopedTo: target };
  }
  const maxTxs = 200n;
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
    await new Promise((r) => setTimeout(r, 4000)); // let the EVM nonce settle after the window tx
    return { openedTx: res.transactionHash, remainingTxs: String(maxTxs), remainingBlocks: "17280", scopedTo: target };
  } finally {
    transport.disconnect();
  }
}

export async function ownerWrite(functionName: string, args: unknown[]) {
  const acc = await ownerAccount();
  const window = await ensureWindow();
  const wallet = createWalletClient({ chain: diana, account: privateKeyToAccount(acc.privateKey as Hex), transport: http() });
  // simulate first so a refusal is reported, not paid for
  await pub.simulateContract({ account: wallet.account, address: contract(), abi: HALTE_ABI, functionName, args } as any);
  const hash = await wallet.writeContract({ address: contract(), abi: HALTE_ABI, functionName, args, ...FEE } as any);
  const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 45_000 });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted on chain (${hash})`);
  return { hash, url: txUrl(hash), block: receipt.blockNumber.toString(), window };
}

/** Run a call against live Diana state without broadcasting; returns the contract's refusal, if any. */
export async function simulate(from: Hex, functionName: string, args: unknown[]) {
  try {
    await pub.simulateContract({ account: from, address: contract(), abi: HALTE_ABI, functionName, args } as any);
    return { refused: false as const };
  } catch (e) {
    if (e instanceof BaseError) {
      const r = e.walk((x) => x instanceof ContractFunctionRevertedError);
      if (r instanceof ContractFunctionRevertedError) return { refused: true as const, reason: r.data?.errorName ?? r.reason ?? "reverted" };
    }
    return { refused: true as const, reason: (e as Error).message.slice(0, 160) };
  }
}

export async function readPassport(id: Hex) {
  const p = (await pub.readContract({ address: contract(), abi: HALTE_ABI, functionName: "passports", args: [id] })) as any[];
  return { owner: p[0] as string, status: Number(p[1]), epoch: Number(p[2]), nonce: BigInt(p[3]) };
}

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
  const signature = toHex(pqcSign(key, Buffer.from(digest.slice(2), "hex")));
  return { expiry, digest, signature };
}

export const STATUS = ["none", "active", "frozen"] as const;
