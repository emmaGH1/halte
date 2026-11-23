import "server-only";
import { parseAbi, type Hex } from "viem";
import { HALTE_ABI, contract, deployBlock, ownerAccount, pub, txUrl } from "./chain";

const PQC_KEY_STATUS = "0x0000000000000000000000000000000000000a02";
const keyAbi = parseAbi(["function pqcKeyStatus(address) view returns (bool registered, uint8 algorithmId, bytes pubkey, bool possessionProven)"]);

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

export type KeyStatus = { state: "ok" | "unusable" | "unavailable"; bytes?: number; algorithm?: number; pop?: boolean };

/** The holder's key as QoreChain's pqcKeyStatus reports it, validated the way Halte.sol validates it. */
export async function keyStatusOf(address: Hex): Promise<KeyStatus> {
  try {
    const k = await pub.readContract({ address: PQC_KEY_STATUS, abi: keyAbi, functionName: "pqcKeyStatus", args: [address] });
    const bytes = (k[2].length - 2) / 2;
    const ok = k[0] && k[1] === 1 && k[3] && bytes === 2592;
    return { state: ok ? "ok" : "unusable", bytes, algorithm: k[1], pop: k[3] };
  } catch {
    return { state: "unavailable" }; // never default to "registered" when the registry can't be read
  }
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
      keyBytes: key && key[0] && key[1] === 1 && key[3] ? (key[2].length - 2) / 2 : undefined,
    };
  } catch {
    return base;
  }
}
