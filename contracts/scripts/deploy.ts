// Deploy Halte to Diana: open a short creation window, deploy, then open the runtime window
// scoped to the Halte contract only (contract creation and any other target are refused by the chain).
// Writes ../evidence/deploy/<address>.json. Usage: pnpm deploy:testnet
import { StargateClient } from "@cosmjs/stargate";
import { EthNativeSigner, deriveUnifiedAccount, openEvmWindowMsg } from "@qorechain/sdk";
import { evmWindowCost } from "@qorechain/evm";
import { createPublicClient, createWalletClient, defineChain, http, parseGwei } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const REST = "https://api-testnet.qore.host", RPC = "https://rpc-testnet.qore.host";
const chain = defineChain({ id: 9800, name: "QoreChain Diana", nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 }, rpcUrls: { default: { http: ["https://evm-testnet.qore.host"] } } });
const acc = await deriveUnifiedAccount(process.env.QORE_MNEMONIC!.trim(), 0);
const pub = createPublicClient({ chain, transport: http() });
const FEE = { gas: 3_000_000n, maxFeePerGas: parseGwei("250"), maxPriorityFeePerGas: parseGwei("1") };

async function openWindow(maxTxs: bigint, blocks: bigint, allowedTargets?: string[]) {
  const res = await fetch(`${REST}/cosmos/auth/v1beta1/accounts/${acc.cosmos}`).then((r) => r.json());
  const a = res.account?.base_account ?? res.account;
  const msg = openEvmWindowMsg({ sender: acc.cosmos, blocks, maxTxs, maxValue: evmWindowCost({ gas: FEE.gas, maxFeePerGas: FEE.maxFeePerGas }) * maxTxs, ...(allowedTargets ? { allowedTargets } : {}) });
  const signer = new EthNativeSigner(acc, { signMode: "hybrid", rest: REST });
  const t = await StargateClient.connect(RPC);
  try {
    const r: any = await signer.signAndBroadcast(t as any, { chainId: "qorechain-diana", accountNumber: BigInt(a.account_number), sequence: BigInt(a.sequence), fee: { amount: [{ denom: "uqor", amount: "100000" }], gas: "800000" }, messages: [msg] });
    await new Promise((x) => setTimeout(x, 6000));
    return r.transactionHash as string;
  } finally { t.disconnect(); }
}

const art = JSON.parse(readFileSync("artifacts/contracts/Halte.sol/Halte.json", "utf8"));
const creationWindow = await openWindow(1n, 100n);
console.log("creation window", creationWindow);
const wallet = createWalletClient({ chain, account: privateKeyToAccount(acc.privateKey as `0x${string}`), transport: http() });
const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode, ...FEE });
const receipt = await pub.waitForTransactionReceipt({ hash });
const address = receipt.contractAddress!;
console.log("deployed", address, "block", receipt.blockNumber, "tx", hash);
const runtimeWindow = await openWindow(200n, 17_280n, [address]);
console.log("scoped runtime window", runtimeWindow);
mkdirSync("../evidence/deploy", { recursive: true });
writeFileSync(`../evidence/deploy/${address}.json`, JSON.stringify({ at: new Date().toISOString(), address, block: receipt.blockNumber.toString(), deployTx: hash, creationWindowTx: creationWindow, runtimeWindowTx: runtimeWindow, runtimeWindowScope: [address], sourceCommit: process.env.GIT_COMMIT ?? null }, null, 2));
