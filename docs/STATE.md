# state

> progress is not written here. It's measured: `node scripts/status.mjs` (latest board in `evidence/status/latest.json`).

## next action

- journey green on https://halte-roan.vercel.app (22 nov 20:08 WAT). Next: Foundry/Hardhat tests + QCAI stage 1 audit, then readme hero + film from a recorded run.

## verified constants (22 nov 2026, do not guess)

- Diana EVM RPC https://evm-testnet.qore.host · chain id 9800 · REST https://api-testnet.qore.host
- precompiles: pqcVerify 0x…0a01 (pubkey, sig, message) → bool · pqcKeyStatus 0x…0a02 (account) → (registered, algorithmId=1 ML-DSA-87, pubkey 2592 B)
- ML-DSA-87 signature from `pqcSign` = 4627 bytes
- deployer (owner, account 0): 0xB047D9D582ed279bb73791164D6527E477Cc33f9 / qor1kpran4vza5nehdehjyty6ef8u3mucvleeqw08f · PQC key registered (tx EA55741E…)
- dealer (account 1): 0xAa5D98cB68a67AA47c3F858B054919EbE6070414 · not funded or registered yet
- spike contract: Halte at 0xe9b1dd118035ec08e490f68b9ca3d5c89ae5a654

## spike results (hour 1)

- read-only: pqcVerify(good) = true, pqcVerify(tampered) = false · `evidence/spike/pqcverify.json`
- on chain: deploy → mint → offer → **freeze with ML-DSA-87 sig verified in-contract: success**; status 2 (frozen); wrong-key freeze simulate: reverted; dealer accept simulate: reverted · `evidence/spike/onchain.json`
- gas: every call bills 1,500,000 (half of the 3M limit); deploy 1.76M. Window: 600 blocks / 10 txs / 7.5 QOR.

## later (parked: moves no journey step yet)

- decode the custom error names in the revert evidence (BadPqcSignature vs PassportFrozen)
- Foundry/Hardhat tests with a mock precompile via hardhat_setCode (needed for the QCAI audit + PQ dApp requirement)
- QCAI stage 1 audit (one free run a day): start by 25 nov

## proposed plan changes (waiting for the human's yes)

- checks/journey.mjs `"https://halte.invalid"` → `"https://halte-roan.vercel.app"` · why: so plain `node scripts/status.mjs` checks the live app without LIVE_URL


## friction log

- 22 nov 20:05 · Vercel runtime + @cosmjs/crypto (pulled in by @qorechain/sdk) · saw ERR_REQUIRE_ESM on @noble/hashes/argon2.js when the SDK is a serverExternalPackage · fix: let Next bundle it · anyone deploying the SDK on Vercel hits this

- 22 nov 19:3x · create-qorechain-dapp 0.14.0 + pnpm 12 · expected install · saw ERR_PNPM_IGNORED_BUILDS (esbuild) · fix: pnpm-workspace.yaml allowBuilds esbuild · the scaffold aborts for anyone on pnpm 12
- 22 nov · @qorechain/sdk deriveUnifiedAccount is async (returns a Promise); easy to miss
- 22 nov · solc rejects the uppercase precompile address `0x…0A01` from the docs (checksum); use lowercase `0x…0a01`
- 22 nov · gasUsed reported as exactly half the gas limit on every call; fee sizing in the window must assume that

## limits and disclosures

- the demo owner and dealer keys are held by the server for the judge demo; this will be labelled in the app

## away mode

locked: —
