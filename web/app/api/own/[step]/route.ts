import { NextResponse } from "next/server";
import { StargateClient } from "@cosmjs/stargate";
import { EthNativeSigner, fetchPqcStatus } from "@qorechain/sdk";
import { TxBody, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { parseEventLogs, type Hex } from "viem";
import {
  CHAIN_ID, ContractRefusal, HALTE_ABI, REST, RPC, STATUS, TransportError, dealerAccount, ownerAccount, pub, readPassport, send,
} from "@/lib/chain";
import { Refusal, clientIp, idempotent, rateLimit, withSignerLock } from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * "Hold your own key": the browser generates and keeps the holder's keys. This route never receives a
 * secret. It only (1) funds a brand-new account with a little testnet QOR, (2) passes the browser's
 * already-signed native transactions to Diana, because Diana's REST/RPC don't allow browser origins, and
 * (3) relays the holder's ML-DSA-87 signature through the dealer account, exactly as it does for the
 * hosted demo. The contract checks every signature against the holder's registered key.
 */
const FUND_UQOR = "1000000"; // 1 QOR: two native fees, a one-tx window's escrow and the mint
const ALLOWED = new Set(["/qorechain.pqc.v1.MsgRegisterPQCKeyV2", "/qorechain.pqc.v1.MsgOpenEVMWindow"]);
const isQor = (a: unknown): a is string => typeof a === "string" && /^qor1[02-9ac-hj-np-z]{38}$/.test(a);
const isId = (x: unknown): x is Hex => typeof x === "string" && /^0x[0-9a-fA-F]{64}$/.test(x);

async function account(address: string) {
  const r = await fetch(`${REST}/cosmos/auth/v1beta1/accounts/${address}`, { cache: "no-store" }).catch(() => null);
  if (!r) throw new TransportError("Diana REST unreachable");
  if (r.status === 404) return null;
  if (!r.ok) throw new TransportError(`Diana REST answered ${r.status}`);
  const j = await r.json();
  const a = j.account?.base_account ?? j.account ?? {};
  return { accountNumber: String(a.account_number ?? "0"), sequence: String(a.sequence ?? "0") };
}

const registered = async (address: string) => (await fetchPqcStatus({ rest: REST, address })).registered;

let version: string | undefined;
const signBytesVersion = async () => (version ??= await new EthNativeSigner(await ownerAccount(), { rest: REST }).resolveSignBytesVersion(CHAIN_ID));

export async function GET(req: Request, { params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (step !== "account") return NextResponse.json({ error: "unknown" }, { status: 404 });
  const a = new URL(req.url).searchParams.get("a");
  if (!isQor(a)) return NextResponse.json({ error: "That is not a qor1 address.", code: "bad-address" }, { status: 400 });
  try {
    const [acc, reg, ver] = await Promise.all([account(a), registered(a), signBytesVersion()]);
    return NextResponse.json({ exists: !!acc, ...(acc ?? {}), registered: reg, signBytesVersion: ver, chainId: CHAIN_ID });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, code: "transport" }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const idem = req.headers.get("idempotency-key");
  try {
    switch (step) {
      case "fund": {
        if (!isQor(body.address)) throw new Refusal(400, "That is not a qor1 address.", "bad-address");
        await rateLimit("mint", clientIp(req));
        const treasury = await ownerAccount();
        return NextResponse.json(await idempotent(idem, () => withSignerLock(treasury.evm, async () => {
          // only brand-new accounts: the faucet tops up nobody twice
          if (await account(body.address)) throw new Refusal(409, "This account already exists on Diana, so it isn't funded again.", "already-funded");
          const signer = new EthNativeSigner(treasury, { signMode: "hybrid", rest: REST });
          const seq = await account(treasury.cosmos);
          const tm = await StargateClient.connect(RPC);
          try {
            const r = await signer.bankSend(tm as any, body.address, [{ denom: "uqor", amount: FUND_UQOR }], {
              chainId: CHAIN_ID, accountNumber: BigInt(seq!.accountNumber), sequence: BigInt(seq!.sequence),
              fee: { amount: [{ denom: "uqor", amount: "100000" }], gas: "800000" },
            });
            if (r.code) throw new Error(`funding refused: code ${r.code}`);
            return { tx: r.transactionHash, amount: "1 QOR" };
          } finally {
            tm.disconnect();
          }
        })));
      }
      case "broadcast": {
        // a native tx the browser signed; only key registration and window opening pass
        if (typeof body.tx !== "string" || body.tx.length > 40_000) throw new Refusal(400, "Expected one signed transaction.", "bad-tx");
        await rateLimit("write", clientIp(req));
        const bytes = Uint8Array.from(Buffer.from(body.tx, "base64"));
        let types: string[];
        try {
          types = TxBody.decode(TxRaw.decode(bytes).bodyBytes).messages.map((m) => m.typeUrl);
        } catch {
          throw new Refusal(400, "That is not a signed Diana transaction.", "bad-tx");
        }
        if (!types.length || types.some((t) => !ALLOWED.has(t))) throw new Refusal(400, "Only key registration and window opening are relayed here.", "not-allowed");
        const tm = await StargateClient.connect(RPC).catch(() => { throw new TransportError("Diana RPC unreachable"); });
        try {
          const r = await tm.broadcastTx(bytes, 30_000, 1_000);
          if (r.code) throw new Refusal(409, `Diana refused the transaction (code ${r.code}): ${(r.rawLog ?? "").slice(0, 200)}`, "chain-refused");
          return NextResponse.json({ tx: r.transactionHash, height: r.height });
        } finally {
          tm.disconnect();
        }
      }
      case "relay": {
        // the holder's ML-DSA-87 signature, made in their browser; the dealer account pays to send it
        const { action, id, expiry, signature } = body;
        if (!["offer", "freeze", "recover"].includes(action)) throw new Refusal(400, "Unknown action.", "bad-action");
        if (!isId(id)) throw new Refusal(400, "That is not a passport id.", "bad-id");
        if (!/^\d{1,12}$/.test(String(expiry ?? ""))) throw new Refusal(400, "Bad expiry.", "bad-expiry");
        if (typeof signature !== "string" || !/^0x[0-9a-f]{9254}$/i.test(signature)) throw new Refusal(400, "Expected a 4,627-byte ML-DSA-87 signature.", "bad-signature");
        const p = await readPassport(id);
        if (p.status === 0) throw new Refusal(404, "No passport with that id on this contract.", "unknown");
        await rateLimit("write", clientIp(req));
        const dealer = await dealerAccount();
        return NextResponse.json(await idempotent(idem, () => withSignerLock(dealer.evm, async () => {
          if (action === "offer") {
            const tx = await send(dealer, "makeOffer", [id, dealer.evm, BigInt(expiry), signature]);
            const receipt = await pub.getTransactionReceipt({ hash: tx.hash });
            const ev = parseEventLogs({ abi: HALTE_ABI, logs: receipt.logs, eventName: "OfferMade" })[0] as any;
            return { offerId: ev.args.offerId.toString(), dealer: dealer.evm, tx };
          }
          const tx = await send(dealer, action, [id, BigInt(expiry), signature]);
          const after = await readPassport(id);
          return { status: STATUS[after.status], epoch: after.epoch, tx };
        })));
      }
      default:
        return NextResponse.json({ error: "unknown step" }, { status: 404 });
    }
  } catch (e) {
    if (e instanceof Refusal) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    if (e instanceof ContractRefusal) return NextResponse.json({ error: e.message, reason: e.reason, code: "contract-refused" }, { status: 409 });
    if (e instanceof TransportError) return NextResponse.json({ error: e.message, code: "transport" }, { status: 502 });
    console.error("own", step, e);
    return NextResponse.json({ error: (e as Error).message.split("\n")[0].slice(0, 240), code: "error" }, { status: 500 });
  }
}
