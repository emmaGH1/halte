import { NextResponse } from "next/server";
import { type Hex } from "viem";
import { TransportError, contract, simulate } from "@/lib/chain";
import replay from "@/lib/replay.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-asks Diana, right now, the exact question the recorded release run asked: can this dealer accept
 * offer #2? Each call is pinned to the block where it was first asked, so the answer can't drift.
 */
export async function GET() {
  const checks = replay.steps.filter((s) => s.kind === "check") as { from: string; offerId: string; block: string; expected: string; label: string }[];
  try {
    const results = await Promise.all(
      checks.map(async (c) => {
        const r = await simulate(c.from as Hex, "acceptOffer", [BigInt(c.offerId)], BigInt(c.block));
        return { block: c.block, expected: c.expected, outcome: r.outcome, match: r.outcome === c.expected };
      }),
    );
    return NextResponse.json({ contract: contract(), offerId: replay.offerId, dealer: replay.dealer, askedAt: new Date().toISOString(), results });
  } catch (e) {
    const unavailable = e instanceof TransportError;
    return NextResponse.json({ error: unavailable ? "Diana did not serve that historical state right now. The recorded run is linked below." : (e as Error).message, code: unavailable ? "historical-unavailable" : "error" }, { status: 502 });
  }
}
