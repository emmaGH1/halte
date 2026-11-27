import { notFound } from "next/navigation";
import { REST, RPC } from "@/lib/chain";
import { Wordmark } from "../../ui";

type TxResponse = {
  height: string;
  txhash: string;
  code: number;
  timestamp: string;
  gas_used: string;
};

const TXS = `${REST}/cosmos/tx/v1beta1/txs`;
const n = (value: string) => Number(value).toLocaleString("en-US");

async function readTx(hash: string, evm: boolean): Promise<TxResponse | null> {
  // Diana indexes the EVM hash as an event on its enclosing Cosmos transaction.
  const query = new URLSearchParams({ query: `ethereum_tx.ethereumTxHash='${hash}'`, limit: "1" });
  const res = await fetch(evm ? `${TXS}?${query}` : `${TXS}/${hash}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Diana transaction lookup failed: HTTP ${res.status}`);
  const body = await res.json() as { tx_response?: TxResponse; tx_responses?: TxResponse[] };
  return (evm ? body.tx_responses?.[0] : body.tx_response) ?? null;
}

export const metadata = { title: "Diana testnet transaction · Halte" };

export default async function TransactionPage({ params, searchParams }: {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ block?: string | string[] }>;
}) {
  const { hash: rawHash } = await params;
  if (!/^(0x)?[a-f0-9]{64}$/i.test(rawHash)) notFound();

  const evm = /^0x/i.test(rawHash);
  const hash = evm ? rawHash.toLowerCase() : rawHash.toUpperCase();
  const { block } = await searchParams;
  const blockHint = typeof block === "string" && /^[1-9][0-9]{0,18}$/.test(block) ? block : undefined;

  const result = await readTx(hash, evm).then(
    (tx) => ({ tx, unavailable: false }),
    () => ({ tx: null, unavailable: true }),
  );
  const { tx, unavailable } = result;
  const height = tx?.height ?? blockHint;

  return (
    <div className="paper"><main className="pp pp-head" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Wordmark />
      <h1>Diana testnet transaction</h1>
      {!tx && <p>{unavailable
        ? "Diana did not answer. Reload to try again."
        : "Diana has no indexed transaction for this hash yet."}
      </p>}
      <dl className="facts">
        {evm && <div><dt className="mono">EVM hash</dt><dd className="m">{hash}</dd></div>}
        {(tx || !evm) && <div><dt className="mono">Cosmos hash</dt><dd className="m">{tx?.txhash ?? hash}</dd></div>}
        {tx && (
          <>
            <div><dt className="mono">Cosmos result</dt><dd>{tx.code === 0 ? "Success" : `Failed (code ${tx.code})`}</dd></div>
            <div><dt className="mono">Time (UTC)</dt><dd><time dateTime={tx.timestamp}>{tx.timestamp}</time></dd></div>
            <div><dt className="mono">Gas used</dt><dd>{n(tx.gas_used)}</dd></div>
          </>
        )}
        {height && <div><dt className="mono">Block</dt><dd><a href={`${RPC}/block?height=${height}`}>{n(height)} on Diana ↗</a></dd></div>}
        {tx && <div><dt className="mono">Source</dt><dd><a href={`${TXS}/${tx.txhash}`}>Diana transaction JSON ↗</a></dd></div>}
      </dl>
    </main></div>
  );
}
