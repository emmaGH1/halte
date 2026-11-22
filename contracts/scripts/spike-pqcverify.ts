// Spike: does Diana's pqcVerify precompile accept an ML-DSA-87 signature made by our registered key,
// and reject a tampered one? Read-only (eth_call). Writes evidence/spike/pqcverify.json.
import { deriveUnifiedAccount, pqcSign } from "@qorechain/sdk";
import { createPublicClient, http, toHex, keccak256, encodePacked } from "viem";
import { pqcVerify, pqcKeyStatus } from "@qorechain/evm";
import { writeFileSync } from "node:fs";

const acc = await deriveUnifiedAccount(process.env.QORE_MNEMONIC!.trim(), 0);
const client = createPublicClient({ transport: http("https://evm-testnet.qore.host") });
const status = await pqcKeyStatus(client, acc.evm as `0x${string}`);
const msg = keccak256(encodePacked(["string", "uint256", "bytes32", "uint256"], ["HALTE_FREEZE", 9800n, keccak256(toHex("demo-passport")), 1n]));
const sig = pqcSign(acc.pqc.secretKey, Buffer.from(msg.slice(2), "hex"));
const pub = toHex(acc.pqc.publicKey);
const good = await pqcVerify(client, { pubkey: pub, signature: toHex(sig), message: msg });
const tampered = msg.slice(0, -2) + (msg.endsWith("00") ? "01" : "00");
const bad = await pqcVerify(client, { pubkey: pub, signature: toHex(sig), message: tampered as `0x${string}` });
const out = { at: new Date().toISOString(), account: acc.evm, registered: status.registered, algorithmId: status.algorithmId, registeredMatches: status.pubkey.toLowerCase() === pub.toLowerCase(), pubkeyBytes: acc.pqc.publicKey.length, sigBytes: sig.length, message: msg, goodVerifies: good, tamperedVerifies: bad };
writeFileSync("../evidence/spike/pqcverify.json", JSON.stringify(out, null, 2));
console.log(out);
