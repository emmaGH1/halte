import { NextResponse } from "next/server";
import { type Hex, zeroHash } from "viem";
import { HALTE_ABI, STATUS, TransportError, contract, pub, simulate } from "@/lib/chain";
import { history } from "@/lib/history";
import replay from "@/lib/replay.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Names for the two demo accounts; any other address is shown as itself.
const NAMES: Record<string, string> = {
  [replay.dealer.toLowerCase()]: "Halte demo dealer",
  [replay.owner.toLowerCase()]: "Halte demo owner",
};
const nameOf = (a: string) => NAMES[a.toLowerCase()] ?? null;

type Verdict = "can-accept" | "reported-missing" | "offer-dead" | "offer-expired" | "offer-closed" | "offer-mismatch" | "no-offer" | "clear";

/**
 * The dealer's counter check. Read-only and holder-free: anyone with the passport id can ask.
 * Passport, offer and the acceptOffer simulation are all pinned to ONE block, so the answer can't mix states.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) return NextResponse.json({ error: "That is not a passport id.", code: "bad-id" }, { status: 400 });
  const id = raw.toLowerCase() as Hex;
  const named = new URL(req.url).searchParams.get("offer");
  if (named !== null && !/^\d{1,12}$/.test(named)) return NextResponse.json({ error: "That is not an offer number.", code: "bad-offer" }, { status: 400 });

  try {
    const block = await pub.getBlockNumber();
    const at = { address: contract(), abi: HALTE_ABI, blockNumber: block } as const;
    const p = (await pub.readContract({ ...at, functionName: "passports", args: [id] })) as any[];
    const status = STATUS[Number(p[1])];
    if (status === "none") return NextResponse.json({ error: "No passport with that id on the Halte contract.", code: "unknown", contract: contract(), block: block.toString() }, { status: 404 });

    const h = await history(id, 0n).catch(() => null);
    const frozenAt = status === "frozen" ? h?.entries.filter((e) => e.event === "Frozen").at(-1) : undefined;
    const passport = {
      id,
      status,
      holder: p[0] as string,
      holderName: nameOf(p[0]),
      epoch: Number(p[2]),
      frozenTx: frozenAt ? { url: frozenAt.url, block: frozenAt.block } : null,
    };

    let offer = null;
    let verdict: Verdict = status === "frozen" ? "reported-missing" : "clear";
    if (named !== null) {
      const o = (await pub.readContract({ ...at, functionName: "offers", args: [BigInt(named)] })) as any[];
      const made = h?.entries.find((e) => e.event === "OfferMade" && e.args.offerId === named);
      const accepted = h?.entries.find((e) => e.event === "Transferred" && e.args.offerId === named);
      if (o[0] !== zeroHash && (o[0] as string).toLowerCase() !== id) {
        verdict = "offer-mismatch"; // the card's offer number belongs to a different passport
        offer = { id: named, dealer: null, dealerName: null, outcome: "belongs to another passport" };
      } else if (o[0] === zeroHash) {
        // deleted on accept or cancel, or never made for this passport
        verdict = status === "frozen" ? "reported-missing" : made ? "offer-closed" : "no-offer";
        offer = { id: named, dealer: made?.args.dealer ?? null, dealerName: made ? nameOf(made.args.dealer) : null, outcome: accepted ? "accepted" : made ? "closed" : "not found", acceptedTx: accepted?.url ?? null };
      } else {
        const dealer = o[1] as Hex;
        const sim = await simulate(dealer, "acceptOffer", [BigInt(named)], block);
        verdict =
          sim.outcome === "would succeed" ? "can-accept"
          : sim.outcome === "PassportFrozen" ? "reported-missing"
          : sim.outcome === "StaleOffer" ? "offer-dead"
          : sim.outcome === "Expired" ? "offer-expired"
          : "offer-closed";
        offer = { id: named, dealer, dealerName: nameOf(dealer), outcome: sim.outcome, epoch: Number(o[2]), expiry: Number(o[3]), madeTx: made?.url ?? null };
      }
    }

    return NextResponse.json({ verdict, passport, offer, block: block.toString(), contract: contract(), askedAt: new Date().toISOString() });
  } catch (e) {
    const msg = (e as Error).message.split("\n")[0].slice(0, 160);
    return NextResponse.json({ error: e instanceof TransportError ? msg : `Diana RPC unreachable: ${msg}`, code: "transport" }, { status: 502 });
  }
}
