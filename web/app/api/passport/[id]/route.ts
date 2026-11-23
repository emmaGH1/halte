import { NextResponse } from "next/server";
import { type Hex } from "viem";
import { HALTE_ABI, STATUS, contract, pub, readPassport } from "@/lib/chain";
import { keyBytesOf } from "@/lib/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^0x[0-9a-fA-F]{64}$/.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const p = await readPassport(id as Hex);
  const offerId = new URL(req.url).searchParams.get("offer");
  let offer = null;
  if (offerId) {
    const o = (await pub.readContract({ address: contract(), abi: HALTE_ABI, functionName: "offers", args: [BigInt(offerId)] })) as any[];
    offer = { id: offerId, passportId: o[0], dealer: o[1], epoch: Number(o[2]), open: o[3], live: o[3] && Number(o[2]) === p.epoch && p.status === 1 };
  }
  const keyBytes = await keyBytesOf(p.owner as Hex);
  return NextResponse.json({ id, keyBytes, owner: p.owner, status: STATUS[p.status], epoch: p.epoch, nonce: p.nonce.toString(), offer, contract: contract() });
}
