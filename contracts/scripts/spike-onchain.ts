// Spike: deploy Halte on Diana, mint, offer, freeze with an ML-DSA-87 signature verified on chain,
// then simulate a wrong-key freeze and a dealer accept (both must revert). Writes evidence/spike/onchain.json.
import { deriveUnifiedAccount, pqcSign, generatePqcKeypair } from "@qorechain/sdk";
import { createPublicClient, createWalletClient, http, keccak256, toHex, defineChain, parseGwei, decodeErrorResult } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "node:fs";

const chain = defineChain({ id: 9800, name: "QoreChain Diana", nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 }, rpcUrls: { default: { http: ["https://evm-testnet.qore.host"] } } });
const art = JSON.parse(readFileSync("artifacts/contracts/Halte.sol/Halte.json", "utf8"));
const acc = await deriveUnifiedAccount(process.env.QORE_MNEMONIC!.trim(), 0);
const dealer = await deriveUnifiedAccount(process.env.QORE_MNEMONIC!.trim(), 1);
const pub = createPublicClient({ chain, transport: http() });
const wallet = createWalletClient({ chain, account: privateKeyToAccount(acc.privateKey as `0x${string}`), transport: http() });
const fee = { gas: 3_000_000n, maxFeePerGas: parseGwei("250"), maxPriorityFeePerGas: parseGwei("1") };
const out: any = { at: new Date().toISOString(), owner: acc.evm, dealer: dealer.evm, txs: {} };
const wait = async (name: string, hash: `0x${string}`) => { const r = await pub.waitForTransactionReceipt({ hash }); out.txs[name] = { hash, status: r.status, gasUsed: r.gasUsed.toString() }; console.log(name, hash, r.status, r.gasUsed); return r; };

const dep = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode, ...fee });
const depR = await wait("deploy", dep);
const halte = depR.contractAddress!; out.contract = halte;
const id = keccak256(toHex(`spike-${Date.now()}`)); out.passportId = id;
await wait("mint", await wallet.writeContract({ address: halte, abi: art.abi, functionName: "mint", args: [id], ...fee }));
await wait("offer", await wallet.writeContract({ address: halte, abi: art.abi, functionName: "makeOffer", args: [id, dealer.evm], ...fee }));

const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
const nonce = (await pub.readContract({ address: halte, abi: art.abi, functionName: "passports", args: [id] }) as any[])[3];
const digest = await pub.readContract({ address: halte, abi: art.abi, functionName: "freezeDigest", args: [id, nonce, expiry] }) as `0x${string}`;

// wrong key first (simulate only): a fresh ML-DSA-87 key that is not the owner's registered key
const wrong = generatePqcKeypair();
try {
  await pub.simulateContract({ account: wallet.account, address: halte, abi: art.abi, functionName: "freeze", args: [id, expiry, toHex(pqcSign(wrong.secretKey, Buffer.from(digest.slice(2), "hex")))] });
  out.wrongKeyFreeze = "ACCEPTED (bad)";
} catch (e: any) { out.wrongKeyFreeze = `reverted: ${e.shortMessage ?? e.message}`.slice(0, 200); }

const sig = toHex(pqcSign(acc.pqc.secretKey, Buffer.from(digest.slice(2), "hex")));
await wait("freeze", await wallet.writeContract({ address: halte, abi: art.abi, functionName: "freeze", args: [id, expiry, sig], ...fee }));
out.statusAfterFreeze = Number(await pub.readContract({ address: halte, abi: art.abi, functionName: "statusOf", args: [id] }));

try {
  await pub.simulateContract({ account: dealer.evm as `0x${string}`, address: halte, abi: art.abi, functionName: "acceptOffer", args: [1n] });
  out.dealerAccept = "ACCEPTED (bad)";
} catch (e: any) { out.dealerAccept = `reverted: ${e.shortMessage ?? e.message}`.slice(0, 200); }

writeFileSync("../evidence/spike/onchain.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
