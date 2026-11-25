# Submission text for build.qorechain.io/p/halte

Paste-ready. The human edits the platform page; nothing here is published by an agent. Replace `<FILM>` once the film is up.

## Tagline

Stolen means unsellable.

## Description

Halte is a transfer passport for fine watches on QoreChain. The owner signs a sale offer to one named dealer with ML-DSA-87. If the watch goes missing, the owner signs a report and every open offer on its passport dies on chain. The offer stays dead even after the watch is found, because a report moves the passport to a new epoch.

The dealer at the counter can check this without a wallet: scan the passport card's QR and the contract answers for that dealer and that offer, at one block.

**Try it (no wallet, works on a phone):**
- ▶ Film (90 s): <FILM>
- Check offer #2 at the counter: https://halte-roan.vercel.app/check/0xbed648483ebb7c1bb1ccb005a5f858540739d25789bc21ea1547803dac915fcd?offer=2
  - Same dealer, same offer, three moments on Diana: would accept → refused, `PassportFrozen` → still refused after recovery, `StaleOffer`.
  - At recovery the offer still had 59 min 44 s before expiry, so the refusal is the epoch rule, not a timeout.
- Issue your own passport: https://halte-roan.vercel.app
- Or hold your own key: https://halte-roan.vercel.app/own (generated in your browser; Halte never sees it)
- Every claim, with its code, test and command: https://github.com/emmaGH1/halte/blob/main/JUDGES.md
- Re-check it from the chain yourself: `node scripts/check-live.mjs` (12 checks, Node 20+, nothing to install)

## How it's made

- **Contract:** `Halte.sol` (Solidity 0.8.28, Hardhat 3, scaffolded with `create-qorechain-dapp`), live on Diana at `0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4` (source commit `d374a16`).
- **What needs the holder's ML-DSA-87 signature:** every offer, report and recovery. The contract verifies it with the `pqcVerify` precompile against the key in `pqcKeyStatus`, and requires ML-DSA-87, 2,592 bytes and proof of possession.
- **What the signatures are bound to:** separate domains, chain id, contract, passport, nonce and expiry.
- **The epoch rule:** a report, a recovery and a transfer each move the passport's epoch, which kills every older offer.
- **QoreChain features used:**
  - every runtime write goes through an EVM window opened by a hybrid-signed (secp256k1 + ML-DSA-87) native transaction, scoped to the Halte contract only (`pqc_hybrid_verify status=verified`);
  - keys are registered with proof of possession;
  - the "hold your own key" mode does all of this from the browser with `@qorechain/sdk`.
- **Audit:** QCAI in three stages (75 → 85 → 85 on the release source), every finding answered in `docs/AUDIT.md`.
  - The repeated High ("no access control on freeze/recover") is by design: the holder's PQ signature *is* the access control, and anyone may relay it.
  - `check-live.mjs` verifies that Diana's deployed bytecode matches a fresh build of the audited source.
- **Tests:** 21 Hardhat tests (wrong keys, replay, expiry, ordering races, key rotation, malformed precompiles).
- **Journey:** the full judge journey is checked against the live site after every deploy (`evidence/status/`).
- **Web:** Next.js on Vercel, with `@qorechain/sdk`, `@qorechain/evm` and viem. Upstash Redis provides the signer lock, idempotency and rate limits.
- **Scope, honestly:**
  - testnet only;
  - in the hosted demo, Halte holds the demo owner's and dealer's keys so anyone can try it in a minute (disclosed beside the controls);
  - a passport proves what the chain says about it, not that the watch on the counter is the one it was issued for.

## Checkboxes for the human to review

- **"Test tokens fUSD, fETH, fBTC (Verified)":** Halte doesn't use them. If this is a declared tick, untick it. If the platform auto-detected it, leave it and don't mention it.
- **Keep:** create-qorechain-dapp · QoreChain SDK · EVM window (scoped) · hybrid ML-DSA-87 txs · PQC key registration with PoP · Solidity PQC key status · Solidity PQC signature check.
- **Special awards:** Regional (MEA, Nigeria) and AI-Native (with `AI_USAGE.md`).
