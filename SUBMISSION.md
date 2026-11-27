# Submission text for build.qorechain.io/p/halte

Paste-ready. The human edits the platform page; nothing here is published by an agent. Replace `<FILM>` once the film is up.

**YouTube upload:** title `Halte: Stolen watches, unsellable (QoreChain Build Before Q-Day)`. Put this in the description: `Music: Harlem Heat by Dagored (freetouse.com).` The track's page on freetouse.com states the credit wording; check it before uploading.

## Tagline

Stolen watches, unsellable.

## Description

Today a dealer can search a stolen-items register before buying a watch. The register only holds what someone reported in time, it can be out of date, and it differs by country. A seller's word and paperwork can be faked. Halte is the stolen-watch check that replaces that guesswork.

Every watch gets a passport on QoreChain, tied to its owner's ML-DSA-87 key (NIST FIPS 204). Before anyone buys, a dealer, marketplace, insurer or private buyer checks the passport with one HTTPS call or one contract read. If the watch is stolen, the owner signs one report from their phone, QoreChain verifies it on chain with the `pqcVerify` precompile, and every check says "do not buy" from the next block. Offers made before the report stay dead even after the watch is recovered (`StaleOffer`), so a sale arranged around a theft can never complete.

It is built for after Q-Day. A thief holding an ordinary wallet key (ECDSA) can't report, unfreeze or sell. Only the owner's post-quantum key can.

**Try it (no wallet, works on a phone):**
- ▶ Film (1:49): <FILM>
- Run the live check and see the verdicts: https://halte-roan.vercel.app (the "One question before you pay" section, then "Take the guided tour")
- Check offer #2 at the dealer's counter: https://halte-roan.vercel.app/check/0xbed648483ebb7c1bb1ccb005a5f858540739d25789bc21ea1547803dac915fcd?offer=2
  - Same dealer, same offer, three moments on Diana: would accept → refused, `PassportFrozen` → still refused after recovery, `StaleOffer`.
  - At recovery the offer still had 59 min 44 s before expiry, so the refusal is the epoch rule, not a timeout.
- Hold your own key instead of the hosted demo: https://halte-roan.vercel.app/own (generated in your browser; Halte never sees it)
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
- **Proof links:** every "view tx" opens a Halte page that resolves the transaction on Diana through its indexed event, showing the EVM hash, the Cosmos hash and the block. QoreChain's public explorer does not resolve these testnet transactions by hash.
- **Web:** Next.js on Vercel, with `@qorechain/sdk`, `@qorechain/evm` and viem. Upstash Redis provides the signer lock, idempotency and rate limits.
- **Scope, honestly:**
  - testnet only;
  - in the hosted demo, Halte holds the demo owner's and dealer's keys so anyone can try it in a minute (disclosed beside the controls);
  - a passport proves what the chain says about it, not that the watch on the counter is the one it was issued for.

## Checkboxes for the human to review

- **"Test tokens fUSD, fETH, fBTC (Verified)":** Halte doesn't use them. If this is a declared tick, untick it. If the platform auto-detected it, leave it and don't mention it.
- **Keep:** create-qorechain-dapp · QoreChain SDK · EVM window (scoped) · hybrid ML-DSA-87 txs · PQC key registration with PoP · Solidity PQC key status · Solidity PQC signature check.
- **Special awards:** Regional (MEA, Nigeria) and AI-Native (with `AI_USAGE.md`).
