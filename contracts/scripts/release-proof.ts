// Release proof on Diana, with real ML-DSA-87 signatures and the real precompiles.
// The owner (account 0) signs; the dealer (account 1) relays, so sender ≠ owner in every PQ receipt.
// Same passport, same offer, same dealer: accept passes before the report, is refused while frozen,
// and is refused as stale after recovery. A second offer is then accepted for real (a live handoff).
// Writes ../evidence/release/<contract>.json. Usage: npx tsx --env-file=.env scripts/release-proof.ts <contract>
import { deriveUnifiedAccount, generatePqcKeypair, pqcSign } from "@qorechain/sdk";
import {
  BaseError, ContractFunctionRevertedError, createPublicClient, createWalletClient, defineChain, http, keccak256, parseGwei, toHex, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const chain = defineChain({ id: 9800, name: "QoreChain Diana", nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 }, rpcUrls: { default: { http: ["https://evm-testnet.qore.host"] } } });
const FEE = { gas: 3_000_000n, maxFeePerGas: parseGwei("250"), maxPriorityFeePerGas: parseGwei("1") };
const address = process.argv[2] as Hex;
if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? "")) throw new Error("usage: release-proof.ts <contract>");
const abi = JSON.parse(readFileSync("artifacts/contracts/Halte.sol/Halte.json", "utf8")).abi;
const m = process.env.QORE_MNEMONIC!.trim();
const owner = await deriveUnifiedAccount(m, 0);
const dealer = await deriveUnifiedAccount(m, 1);
const pub = createPublicClient({ chain, transport: http() });
const wallet = (a: typeof owner) => createWalletClient({ chain, account: privateKeyToAccount(a.privateKey as Hex), transport: http() });
const ownerW = wallet(owner), dealerW = wallet(dealer);
const url = (h: string) => `https://explore.qore.network/tx/${h.replace(/^0x/, "").toUpperCase()}`;
let minBlock = 0n; // RPC nodes can lag each other: never check state older than the last receipt
const log: any = { contract: address, at: new Date().toISOString(), owner: { evm: owner.evm, cosmos: owner.cosmos }, dealer: { evm: dealer.evm, cosmos: dealer.cosmos }, steps: [] };

const read = (functionName: string, args: unknown[], blockNumber?: bigint) => pub.readContract({ address, abi, functionName, args, ...(blockNumber ? { blockNumber } : {}) }) as Promise<any>;
const passport = async (id: Hex, blockNumber?: bigint) => {
  const p = await read("passports", [id], blockNumber);
  return { owner: p[0] as string, status: Number(p[1]), epoch: p[2] as bigint, nonce: p[3] as bigint, offerNonce: p[4] as bigint };
};
async function send(w: ReturnType<typeof wallet>, label: string, functionName: string, args: unknown[]) {
  await pub.simulateContract({ account: w.account, address, abi, functionName, args });
  const hash = await w.writeContract({ address, abi, functionName, args, ...FEE });
  const r = await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (r.status !== "success") throw new Error(`${label} reverted: ${hash}`);
  if (r.blockNumber > minBlock) minBlock = r.blockNumber;
  const step = { step: label, kind: "tx", sender: w.account.address, hash, url: url(hash), block: r.blockNumber.toString(), gasUsed: r.gasUsed.toString() };
  log.steps.push(step); console.log("✓", label, step.block, hash);
  return r;
}
async function check(label: string, from: Hex, functionName: string, args: unknown[], expect: string) {
  let block = await pub.getBlockNumber();
  for (let i = 0; block < minBlock && i < 20; i++) { await new Promise((x) => setTimeout(x, 1500)); block = await pub.getBlockNumber(); }
  if (block < minBlock) throw new Error(`${label}: RPC is behind the last receipt`);
  let outcome = "would succeed";
  try { await pub.simulateContract({ account: from, address, abi, functionName, args, blockNumber: block }); }
  catch (e) {
    const r = e instanceof BaseError ? e.walk((x) => x instanceof ContractFunctionRevertedError) : null;
    if (!(r instanceof ContractFunctionRevertedError)) throw new Error(`${label}: transport failure, not a contract answer: ${(e as Error).message}`);
    outcome = r.data?.errorName ?? "reverted";
  }
  const step = { step: label, kind: "eth_call", from, functionName, args: args.map(String), block: block.toString(), outcome, expected: expect };
  log.steps.push(step);
  if (outcome !== expect) throw new Error(`${label}: expected ${expect}, got ${outcome}`);
  console.log("✓", label, "→", outcome, "@", block.toString());
}
const sign = (secretKey: Uint8Array, digest: Hex) => toHex(pqcSign(secretKey, Buffer.from(digest.slice(2), "hex")));
const expiry = () => BigInt(Math.floor(Date.now() / 1000) + 3600);

async function signedOffer(id: Hex) {
  const p = await passport(id); const e = expiry();
  const digest = await read("offerDigest", [id, dealer.evm, p.epoch, p.offerNonce, e]);
  return [id, dealer.evm, e, sign(owner.pqc.secretKey, digest)];
}
async function signed(kind: "freeze" | "recover", id: Hex, key = owner.pqc.secretKey) {
  const p = await passport(id); const e = expiry();
  const digest = await read(kind === "freeze" ? "freezeDigest" : "recoverDigest", [id, p.nonce, e]);
  return [id, e, sign(key, digest)];
}
const lastOffer = async () => (await read("offerCount", [])) as bigint;

// ---- passport A: the same-offer control ----
const id = keccak256(toHex(`halte-release-proof-${Date.now()}`));
log.passport = id;
await send(ownerW, "mint (owner)", "mint", [id]);
await send(dealerW, "PQ-signed offer to the dealer, relayed by the dealer", "makeOffer", await signedOffer(id));
const offerId = await lastOffer(); log.offerId = offerId.toString();
await check("positive control: the dealer could accept this offer now", dealer.evm as Hex, "acceptOffer", [offerId], "would succeed");
await check("a stolen classical key offers the passport to itself (no PQ signature)", owner.evm as Hex, "makeOffer", [id, dealer.evm, expiry(), "0x"], "BadPqcSignature");
await check("a freeze signed with a key that isn't the owner's", dealer.evm as Hex, "freeze", await signed("freeze", id, generatePqcKeypair().secretKey), "BadPqcSignature");
await send(dealerW, "owner's ML-DSA-87 report (freeze), relayed by the dealer", "freeze", await signed("freeze", id));
await check("same dealer, same offer, while reported missing", dealer.evm as Hex, "acceptOffer", [offerId], "PassportFrozen");
await send(dealerW, "owner's ML-DSA-87 recovery, relayed by the dealer", "recover", await signed("recover", id));
await check("same dealer, same offer, after recovery", dealer.evm as Hex, "acceptOffer", [offerId], "StaleOffer");
const after = await passport(id);
log.finalHolder = after.owner;
if (after.owner.toLowerCase() !== owner.evm.toLowerCase()) throw new Error("holder changed");

// ---- passport B: a real handoff ----
const id2 = keccak256(toHex(`halte-release-handoff-${Date.now()}`));
log.handoffPassport = id2;
await send(ownerW, "mint a second passport (owner)", "mint", [id2]);
await send(dealerW, "PQ-signed offer, relayed by the dealer", "makeOffer", await signedOffer(id2));
const o2 = await lastOffer();
await send(dealerW, "the dealer accepts: the passport changes hands", "acceptOffer", [o2]);
const p2 = await passport(id2);
if (p2.owner.toLowerCase() !== dealer.evm.toLowerCase()) throw new Error("handoff did not land");
log.handoffHolder = p2.owner;

mkdirSync("../evidence/release", { recursive: true });
writeFileSync(`../evidence/release/${address}.json`, JSON.stringify(log, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
console.log("written evidence/release/" + address + ".json");
