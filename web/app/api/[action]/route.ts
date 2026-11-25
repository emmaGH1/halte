import { NextResponse } from "next/server";
import { parseEventLogs, toHex, type Hex } from "viem";
import {
  ContractRefusal, HALTE_ABI, STATUS, TransportError, dealerAccount, ownerAccount, pub, readOffer, readPassport, send, signAction, signOffer, simulate,
} from "@/lib/chain";
import { atLeast } from "@/lib/history";
import { Refusal, clientIp, holderKey, idempotent, rateLimit, readSession, requireHolder, sessionCookie, withSignerLock } from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const isId = (x: unknown): x is Hex => typeof x === "string" && /^0x[0-9a-fA-F]{64}$/.test(x);
const CHECKED = "Diana live state (eth_call at the block shown, not broadcast)";

async function existing(id: unknown) {
  if (!isId(id)) throw new Refusal(400, "That is not a passport id.", "bad-id");
  const p = await readPassport(id);
  if (p.status === 0) throw new Refusal(404, "No passport with that id on this contract.", "unknown");
  return { id: id.toLowerCase() as Hex, p };
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const cookie = req.headers.get("cookie");
  const idem = req.headers.get("idempotency-key");
  try {
    switch (action) {
      // ---- writes: rate-limited, idempotent, one in-flight tx per signer ----
      case "mint": {
        await rateLimit("mint", clientIp(req));
        const owner = await ownerAccount();
        const out = await idempotent(idem, async () => {
          const id = toHex(crypto.getRandomValues(new Uint8Array(32)));
          const tx = await withSignerLock(owner.evm, () => send(owner, "mint", [id]));
          return { id, owner: owner.evm, tx };
        });
        const res = NextResponse.json({ ...out, key: holderKey(out.id), status: "active" });
        res.headers.set("set-cookie", sessionCookie([...readSession(cookie).filter((x) => x !== out.id), out.id]));
        return res;
      }
      case "offer": {
        const { id } = await existing(body.id);
        requireHolder(req, id);
        await rateLimit("write", clientIp(req));
        const dealer = await dealerAccount();
        return NextResponse.json(await idempotent(idem, () => withSignerLock(dealer.evm, async () => {
          const s = await signOffer(id, dealer.evm as Hex); // the owner's ML-DSA-87 key signs; the dealer relays
          const tx = await send(dealer, "makeOffer", [id, dealer.evm, s.expiry, s.signature]);
          const receipt = await pub.getTransactionReceipt({ hash: tx.hash });
          const ev = parseEventLogs({ abi: HALTE_ABI, logs: receipt.logs, eventName: "OfferMade" })[0] as any;
          return { offerId: ev.args.offerId.toString(), dealer: dealer.evm, signatureBytes: (s.signature.length - 2) / 2, tx };
        })));
      }
      case "freeze":
      case "recover": {
        const { id } = await existing(body.id);
        requireHolder(req, id);
        await rateLimit("write", clientIp(req));
        const dealer = await dealerAccount();
        return NextResponse.json(await idempotent(idem, () => withSignerLock(dealer.evm, async () => {
          const s = await signAction(action, id); // signed by the owner's key, relayed by the dealer account
          const tx = await send(dealer, action, [id, s.expiry, s.signature]);
          const p = await readPassport(id);
          return { status: STATUS[p.status], epoch: p.epoch, signatureBytes: (s.signature.length - 2) / 2, signature: s.signature, tx };
        })));
      }

      // ---- live checks: eth_call against Diana, never broadcast ----
      case "accept": {
        const { id } = await existing(body.id);
        if (!/^\d{1,12}$/.test(String(body.offerId ?? ""))) throw new Refusal(400, "That is not an offer id.", "bad-offer");
        const offerId = BigInt(body.offerId);
        // RPC nodes lag each other: never answer from a node that hasn't reached the state this page already showed
        const floor = /^\d{1,12}$/.test(String(body.min ?? "")) ? await atLeast(BigInt(body.min)) : undefined;
        // a pinned read can land on a node that hasn't got that block yet: retry briefly instead of answering wrong
        const again = async <T,>(fn: () => Promise<T>) => { for (let i = 0; ; i++) { try { return await fn(); } catch (e) { if (i >= 3 || e instanceof ContractRefusal) throw e; await new Promise((r) => setTimeout(r, 1200)); } } };
        const o = await again(() => readOffer(offerId, floor));
        // a closed offer was deleted, so its passport id reads as zero; only an open one must match
        if (o.open && o.passportId.toLowerCase() !== id) throw new Refusal(400, "That offer is for a different passport.", "offer-mismatch");
        const dealer = await dealerAccount();
        const r = await again(() => simulate(dealer.evm as Hex, "acceptOffer", [offerId], floor));
        return NextResponse.json({ ...r, dealer: dealer.evm, checkedAgainst: CHECKED });
      }
      case "thief-sell": {
        // a thief holding the owner's classical secp256k1 key lists the watch without the owner's PQ signature
        const { id } = await existing(body.id);
        const owner = await ownerAccount();
        const thief = toHex(crypto.getRandomValues(new Uint8Array(20)));
        const r = await simulate(owner.evm as Hex, "makeOffer", [id, thief, BigInt(Math.floor(Date.now() / 1000) + 3600), "0x"]);
        return NextResponse.json({ ...r, from: owner.evm, checkedAgainst: CHECKED });
      }
      case "wrong-key-freeze": {
        // someone forges a missing report with an ML-DSA-87 key of their own, to block the owner's sale
        const { id } = await existing(body.id);
        const dealer = await dealerAccount();
        const s = await signAction("freeze", id, { wrongKey: true });
        const r = await simulate(dealer.evm as Hex, "freeze", [id, s.expiry, s.signature]);
        return NextResponse.json({ ...r, checkedAgainst: CHECKED });
      }
      case "thief-unfreeze": {
        // a thief signs the recovery with an ML-DSA-87 key of their own
        const { id } = await existing(body.id);
        const dealer = await dealerAccount();
        const s = await signAction("recover", id, { wrongKey: true });
        const r = await simulate(dealer.evm as Hex, "recover", [id, s.expiry, s.signature]);
        return NextResponse.json({ ...r, checkedAgainst: CHECKED });
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 404 });
    }
  } catch (e) {
    if (e instanceof Refusal) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    if (e instanceof ContractRefusal) return NextResponse.json({ error: e.message, reason: e.reason, code: "contract-refused" }, { status: 409 });
    if (e instanceof TransportError) return NextResponse.json({ error: e.message, code: "transport" }, { status: 502 });
    console.error(action, e);
    return NextResponse.json({ error: (e as Error).message.split("\n")[0].slice(0, 240), code: "error" }, { status: 500 });
  }
}
