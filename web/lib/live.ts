import "server-only";
import { parseAbi, type Hex } from "viem";
import { HALTE_ABI, contract, deployBlock, ownerAccount, pub, txUrl } from "./chain";

const PQC_KEY_STATUS = "0x0000000000000000000000000000000000000a02";
const keyAbi = parseAbi(["function pqcKeyStatus(address) view returns (bool registered, uint8 algorithmId, bytes pubkey)"]);

export type Live = {
  ok: boolean;
  block?: string;
  contract: string;
  minted?: number;
  frozen?: number;
  lastFreeze?: { hash: string; url: string; block: string } | null;
  keyBytes?: number;
};

async function events(name: "Minted" | "Frozen", latest: bigint) {
  // Diana's RPC caps log ranges, so scan from the deploy block in 9,000-block chunks
  const ranges: [bigint, bigint][] = [];
  for (let from = deployBlock(); from <= latest; from += 9_000n) ranges.push([from, from + 8_999n > latest ? latest : from + 8_999n]);
  const parts = await Promise.all(
    ranges.map(([fromBlock, toBlock]) => pub.getContractEvents({ address: contract(), abi: HALTE_ABI, eventName: name, fromBlock, toBlock } as any)),
  );
  return parts.flat();
}

/** Byte length of the ML-DSA key an address registered with QoreChain (0 if none). */
export async function keyBytesOf(address: Hex) {
  const k = await pub.readContract({ address: PQC_KEY_STATUS, abi: keyAbi, functionName: "pqcKeyStatus", args: [address] }).catch(() => null);
  return k && k[0] ? (k[2].length - 2) / 2 : 0;
}

/** Read the live proof shown on the landing page straight from Diana. Never throws. */
export async function readLive(): Promise<Live> {
  const base: Live = { ok: false, contract: contract() };
  try {
    const latest = await pub.getBlockNumber();
    const owner = await ownerAccount();
    const [minted, frozen, key] = await Promise.all([
      events("Minted", latest).catch(() => null),
      events("Frozen", latest).catch(() => null),
      pub.readContract({ address: PQC_KEY_STATUS, abi: keyAbi, functionName: "pqcKeyStatus", args: [owner.evm as Hex] }).catch(() => null),
    ]);
    const last = frozen?.at(-1) as any;
    return {
      ok: true,
      contract: contract(),
      block: latest.toString(),
      minted: minted?.length,
      frozen: frozen?.length,
      lastFreeze: last ? { hash: last.transactionHash, url: txUrl(last.transactionHash), block: last.blockNumber.toString() } : null,
      keyBytes: key ? (key[2].length - 2) / 2 : undefined,
    };
  } catch {
    return base;
  }
}
