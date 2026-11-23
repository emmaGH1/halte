import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";

/**
 * Public-write containment for the judge demo. The server holds the demo signers, so every write is
 * gated here: one in-flight transaction per signer (a Redis lock, since serverless instances don't
 * share memory), idempotency keys so a double click can't send twice, per-IP and daily caps, and
 * writes bound to the browser session that issued the passport. No Redis, no writes: the site goes
 * read-only rather than risk two instances racing one signer's nonce.
 */

export class Refusal extends Error {
  constructor(public status: number, message: string, public code: string) {
    super(message);
  }
}

let client: Redis | null | undefined;
function redis(): Redis {
  if (client === undefined) {
    const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
    client = url && token ? new Redis({ url, token, retry: { retries: 1 } }) : null;
  }
  if (!client) throw new Refusal(503, "Writes are paused: the demo's signing lock is not configured. Reading still works.", "read-only");
  return client;
}

async function guarded<T>(fn: (r: Redis) => Promise<T>): Promise<T> {
  const r = redis();
  try {
    return await fn(r);
  } catch (e) {
    if (e instanceof Refusal) throw e;
    throw new Refusal(503, "Writes are paused: the demo's signing lock is unreachable. Reading still works.", "read-only");
  }
}

const sleep = (ms: number) => new Promise((x) => setTimeout(x, ms));

/** One transaction at a time per signer address, across every serverless instance. */
export async function withSignerLock<T>(signer: string, fn: () => Promise<T>): Promise<T> {
  const key = `halte:lock:${signer.toLowerCase()}`;
  const token = randomUUID();
  const deadline = Date.now() + 40_000;
  for (;;) {
    const got = await guarded((r) => r.set(key, token, { nx: true, px: 90_000 }));
    if (got === "OK") break;
    if (Date.now() > deadline) throw new Refusal(429, "The demo signer is busy with another visitor's transaction. Try again in a moment.", "busy");
    await sleep(700 + Math.random() * 600);
  }
  try {
    return await fn();
  } finally {
    // release only our own lock
    await redis()
      .eval(`if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`, [key], [token])
      .catch(() => {});
  }
}

const LIMITS = {
  mint: { perIp: Number(process.env.HALTE_MINTS_PER_IP ?? 3), windowSec: 600 },
  write: { perIp: 20, windowSec: 600 },
  daily: 400,
};

export async function rateLimit(kind: "mint" | "write", ip: string) {
  const l = LIMITS[kind];
  const bucket = Math.floor(Date.now() / 1000 / l.windowSec);
  const ipKey = `halte:rl:${kind}:${createHash("sha256").update(ip).digest("hex").slice(0, 16)}:${bucket}`;
  const dayKey = `halte:cap:${new Date().toISOString().slice(0, 10)}`;
  const [n, day] = await guarded(async (r) => {
    const p = r.pipeline();
    p.incr(ipKey); p.expire(ipKey, l.windowSec);
    p.incr(dayKey); p.expire(dayKey, 86_400 * 2);
    const out = (await p.exec()) as number[];
    return [out[0], out[2]];
  });
  if (n > l.perIp) throw new Refusal(429, kind === "mint" ? "Three demo passports per visitor every ten minutes. The recorded run is linked below." : "Too many demo writes from this visitor. Try again in a few minutes.", "rate-limited");
  if (day > LIMITS.daily) throw new Refusal(429, "Today's demo budget on Diana is spent. The recorded run and every past transaction stay verifiable.", "daily-cap");
}

/** Idempotency: the same key returns the first result instead of sending a second transaction. */
export async function idempotent<T>(key: string | null, fn: () => Promise<T>): Promise<T> {
  if (!key || !/^[A-Za-z0-9-]{8,64}$/.test(key)) return fn();
  const k = `halte:idem:${key}`;
  const claimed = await guarded((r) => r.set(k, JSON.stringify({ pending: true }), { nx: true, ex: 600 }));
  if (claimed !== "OK") {
    const prev = await guarded((r) => r.get<{ pending?: boolean; result?: T }>(k));
    if (prev?.result) return prev.result;
    throw new Refusal(409, "That action is already being sent.", "in-flight");
  }
  try {
    const result = await fn();
    await redis().set(k, JSON.stringify({ result }), { ex: 600 }).catch(() => {});
    return result;
  } catch (e) {
    await redis().del(k).catch(() => {});
    throw e;
  }
}

// ---- session binding: only the browser that issued a passport may write to it ----

export const SESSION_COOKIE = "halte_s";
const secret = () => {
  const s = process.env.HALTE_SESSION_SECRET?.trim() || process.env.QORE_MNEMONIC?.trim();
  if (!s) throw new Error("no session secret");
  return createHash("sha256").update(`halte-session-v1|${s}`).digest();
};
const mac = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function readSession(cookieHeader: string | null): string[] {
  const raw = cookieHeader?.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!raw) return [];
  const [body, sig] = raw.split(".");
  if (!body || !sig) return [];
  const want = Buffer.from(mac(body)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return [];
  try {
    const ids = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function sessionCookie(ids: string[]) {
  const body = Buffer.from(JSON.stringify(ids.slice(-8))).toString("base64url");
  return `${SESSION_COOKIE}=${body}.${mac(body)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

/** The holder's capability for one passport, carried in the URL fragment (#k=…) so it never reaches a server log. */
export const holderKey = (id: string) => mac(`holder|${id.toLowerCase()}`).slice(0, 32);

export function isHolder(req: Request, id: string) {
  const k = req.headers.get("x-halte-key") ?? "";
  const want = Buffer.from(holderKey(id)), got = Buffer.from(k);
  return readSession(req.headers.get("cookie")).includes(id.toLowerCase()) || (got.length === want.length && timingSafeEqual(got, want));
}

export function requireHolder(req: Request, id: string) {
  if (!isHolder(req, id))
    throw new Refusal(403, "This passport was issued in another browser, so it is read-only here. Issue your own to try the report.", "not-your-session");
}

export const clientIp = (req: Request) =>
  req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
