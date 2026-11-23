import { NextResponse } from "next/server";
import { parseEventLogs, toHex, type Hex } from "viem";
import { HALTE_ABI, STATUS, dealerAccount, ownerAccount, ownerWrite, pub, readPassport, signAction, simulate } from "@/lib/chain";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const isId = (x: unknown): x is Hex => typeof x === "string" && /^0x[0-9a-fA-F]{64}$/.test(x);

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  try {
    switch (action) {
      case "mint": {
        const id = toHex(crypto.getRandomValues(new Uint8Array(32)));
        const tx = await ownerWrite("mint", [id]);
        const p = await readPassport(id);
        return NextResponse.json({ id, status: STATUS[p.status], owner: p.owner, tx });
      }
      case "offer": {
        if (!isId(body.id)) throw new Error("bad passport id");
        const dealer = await dealerAccount();
        const tx = await ownerWrite("makeOffer", [body.id, dealer.evm]);
        const receipt = await pub.getTransactionReceipt({ hash: tx.hash });
        const ev = parseEventLogs({ abi: HALTE_ABI, logs: receipt.logs, eventName: "OfferMade" })[0] as any;
        return NextResponse.json({ offerId: ev.args.offerId.toString(), dealer: dealer.evm, tx });
      }
      case "freeze":
      case "recover": {
        if (!isId(body.id)) throw new Error("bad passport id");
        const s = await signAction(action, body.id);
        const tx = await ownerWrite(action, [body.id, s.expiry, s.signature]);
        const p = await readPassport(body.id);
        return NextResponse.json({ status: STATUS[p.status], epoch: p.epoch, signatureBytes: (s.signature.length - 2) / 2, signature: s.signature, digest: s.digest, tx });
      }
      case "wrong-key-freeze": {
        if (!isId(body.id)) throw new Error("bad passport id");
        const owner = await ownerAccount();
        const s = await signAction("freeze", body.id, { wrongKey: true });
        const r = await simulate(owner.evm as Hex, "freeze", [body.id, s.expiry, s.signature]);
        const p = await readPassport(body.id);
        return NextResponse.json({ ...r, status: STATUS[p.status], checkedAgainst: "Diana live state (eth_call, not broadcast)" });
      }
      case "accept": {
        const offerId = BigInt(body.offerId ?? 0);
        const dealer = await dealerAccount();
        const r = await simulate(dealer.evm as Hex, "acceptOffer", [offerId]);
        return NextResponse.json({ ...r, checkedAgainst: "Diana live state (eth_call, not broadcast)" });
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.split("\n")[0].slice(0, 240) }, { status: 500 });
  }
}

