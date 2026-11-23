import "server-only";
import { decodeFunctionData, parseEventLogs, type Hex } from "viem";
import { HALTE_ABI, contract, deployBlock, pub, txUrl } from "./chain";

export type Entry = {
  event: "Minted" | "OfferMade" | "Transferred" | "Frozen" | "Recovered" | "OfferCancelled";
  block: string;
  logIndex: number;
  hash: Hex;
  url: string;
  sender: string; // who broadcast it: for PQ-signed actions this is the relayer, not the holder
  args: Record<string, string>;
  pq?: { signatureBytes: number; signature: Hex; expiry: string }; // the ML-DSA-87 signature carried in the call
};

const NAMES = new Set(["Minted", "OfferMade", "Transferred", "Frozen", "Recovered", "OfferCancelled"]);

/** Wait until the RPC node we hit has caught up with a block we already saw in a receipt. */
export async function atLeast(block: bigint) {
  let latest = await pub.getBlockNumber();
  for (let i = 0; latest < block && i < 12; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    latest = await pub.getBlockNumber();
  }
  return latest;
}

/** The passport's full register, rebuilt from Halte's events on Diana. Works from any browser. */
export async function history(id: Hex, minBlock = 0n): Promise<{ entries: Entry[]; block: string }> {
  const latest = await atLeast(minBlock);
  const ranges: [bigint, bigint][] = [];
  for (let from = deployBlock(); from <= latest; from += 9_000n) ranges.push([from, from + 8_999n > latest ? latest : from + 8_999n]);
  const logs = (await Promise.all(ranges.map(([fromBlock, toBlock]) => pub.getLogs({ address: contract(), fromBlock, toBlock })))).flat();
  const parsed = (parseEventLogs({ abi: HALTE_ABI, logs }) as any[]).filter(
    (l) => NAMES.has(l.eventName) && String(l.args.id).toLowerCase() === id.toLowerCase(),
  );
  const entries = await Promise.all(
    parsed.slice(0, 40).map(async (l): Promise<Entry> => {
      const tx = await pub.getTransaction({ hash: l.transactionHash });
      const e: Entry = {
        event: l.eventName,
        block: l.blockNumber.toString(),
        logIndex: l.logIndex,
        hash: l.transactionHash,
        url: txUrl(l.transactionHash),
        sender: tx.from,
        args: Object.fromEntries(Object.entries(l.args).map(([k, v]) => [k, String(v)])),
      };
      if (l.eventName === "Frozen" || l.eventName === "Recovered" || l.eventName === "OfferMade") {
        try {
          const call = decodeFunctionData({ abi: HALTE_ABI, data: tx.input }) as any;
          const sig = call.args.at(-1) as Hex;
          const expiry = call.args.at(-2) as bigint;
          e.pq = { signatureBytes: (sig.length - 2) / 2, signature: sig, expiry: expiry.toString() };
        } catch {}
      }
      return e;
    }),
  );
  entries.sort((a, b) => (BigInt(a.block) === BigInt(b.block) ? a.logIndex - b.logIndex : BigInt(a.block) < BigInt(b.block) ? -1 : 1));
  return { entries, block: latest.toString() };
}
