import deployment from "./deployment.json";

// A 0x prefix identifies an EVM hash. Native Diana transactions use the Cosmos hash.
export function txUrl(hash: string, block?: string | bigint) {
  const blockQuery = block === undefined ? "" : `?block=${block}`;
  return `/tx/${hash}${blockQuery}`;
}

export const deployTxUrl = txUrl(deployment.deployTx, deployment.deployBlock);
