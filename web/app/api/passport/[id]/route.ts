import { NextResponse } from "next/server";
import { type Hex } from "viem";
import { STATUS, contract, readOffer, readPassport } from "@/lib/chain";
import { isHolder } from "@/lib/guard";
import { history } from "@/lib/history";
import { keyBytesOf } from "@/lib/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) return NextResponse.json({ error: "That is not a passport id.", code: "bad-id" }, { status: 400 });
  const id = raw.toLowerCase() as Hex;
  const q = new URL(req.url).searchParams;
  const min = /^\d{1,12}$/.test(q.get("min") ?? "") ? BigInt(q.get("min")!) : 0n;
  try {
    let h = await history(id, min); // waits for the RPC to reach `min`, so the reads below are fresh too
    const p = await readPassport(id);
    // RPC nodes lag each other: a passport that exists must show its own Minted event before we answer
    for (let i = 0; p.status !== 0 && !h.entries.some((e) => e.event === "Minted") && i < 6; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      h = await history(id, BigInt(h.block) + 1n);
    }
    if (p.status === 0) return NextResponse.json({ error: "No passport with that id on this contract.", code: "unknown", contract: contract() }, { status: 404 });
    // the latest offer for this passport, from the chain, unless the link names one
    const named = q.get("offer");
    const offerId = named && /^\d{1,12}$/.test(named) ? named : h.entries.filter((e) => e.event === "OfferMade").at(-1)?.args.offerId;
    let offer = null;
    if (offerId) {
      const o = await readOffer(BigInt(offerId));
      const made = h.entries.find((e) => e.event === "OfferMade" && e.args.offerId === offerId);
      if (made) {
        offer = {
          id: offerId,
          dealer: made.args.dealer,
          epoch: Number(made.args.epoch),
          open: o.open,
          live: o.open && o.epoch === p.epoch && p.status === 1 && o.expiry * 1000 > Date.now(),
        };
      }
    }
    const keyBytes = await keyBytesOf(p.owner as Hex);
    return NextResponse.json({
      id,
      owner: p.owner,
      status: STATUS[p.status],
      epoch: p.epoch,
      nonce: p.nonce.toString(),
      keyBytes,
      offer,
      history: h.entries,
      block: h.block,
      yours: isHolder(req, id),
      contract: contract(),
    });
  } catch (e) {
    return NextResponse.json({ error: `Diana RPC unreachable: ${(e as Error).message.split("\n")[0].slice(0, 160)}`, code: "transport" }, { status: 502 });
  }
}
