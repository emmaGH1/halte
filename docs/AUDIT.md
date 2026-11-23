# QCAI audit: findings and responses

Two-stage audit as required by the Post-Quantum dApp track ([audit FAQ](https://build.qorechain.io/faq#audit)).

| stage | date (UTC) | setting | source audited | score | report |
|---|---|---|---|---|---|
| 1 | 22 Nov 2026, 19:43 | Ethereum (EVM/Solidity) | `contracts/contracts/Halte.sol` at commit `27dd594` | 75/100, medium, 4 findings | [`docs/audit/2026-11-22-qcai-stage1.pdf`](audit/2026-11-22-qcai-stage1.pdf) |
| 2 | 23 Nov 2026, 12:03 (dashboard time) | Ethereum (EVM/Solidity) | `contracts/contracts/Halte.sol` at commit `3df5f2a` (the source of the earlier Diana contract `0x1e2bacc…`, since replaced) | 85/100, medium, 4 findings | [`docs/audit/2026-11-23-qcai-stage2.pdf`](audit/2026-11-23-qcai-stage2.pdf) |

QCAI reviews pasted source only. Quantum readiness is "not scored for this setting" (the FAQ says a setting aware of QoreChain's PQ precompiles is planned). The PQ path is covered by the tests and the live Diana runs below.

## Release (live): `0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4`, source `d374a16`, not yet audited by QCAI

Deployed 23 Nov 2026 at block 10,611,612 (deploy tx `0xb57871e8…`). A QCAI run on this exact source is pending; its report will be filed here as stage 3. Changes since the stage 2 source, each with its test in `contracts/test/Halte.ts`:

| change | why | test |
|---|---|---|
| `makeOffer` needs the holder's ML-DSA-87 signature over `offerDigest` (domain `HALTE_OFFER_V1`, binds dealer, epoch, offer nonce, expiry) | a stolen classical key could otherwise offer the passport to the thief's own registered address and accept | "needs the holder's PQ signature…", "binds the signed offer to its dealer, and refuses a replay", "binds the offer digest to…" |
| `acceptOffer` bumps the epoch and nonce on transfer | the previous holder's other offers survived a handoff (found in the Codex review) | "a handoff kills every other offer the previous holder issued" |
| offers carry an expiry | an offer could live forever | "offers expire: valid at the expiry second, refused one second later" |
| key admission requires ML-DSA-87, a 2,592-byte key and proof of possession; the registry answer is bounds-checked before decoding | the fourth `pqcKeyStatus` value was ignored; a malformed answer could panic instead of failing closed | "mints only for an account with a registered, PoP-proven ML-DSA-87 key", "fails closed when a PQC precompile is missing or malformed" |
| zero or self dealer refused (`InvalidDealer`) | stage 1 L, extended | "refuses an empty or self-addressed dealer" |
| separate `offerNonce` | issuing an offer must not void a pending freeze | the four "Ordering" tests |

## Stage 1 findings

### H · Missing access control on `freeze()` and `recover()`: by design, documented, no logic change

QCAI suggests checking `msg.sender == owner`. Halte deliberately doesn't. Authority over a passport comes from one thing only: an **ML-DSA-87 signature by the key the owner registered with QoreChain**. The contract:

1. reads that key from the `pqcKeyStatus` precompile (`0x…0a02`) for `p.owner`, and refuses if none is registered (`NoPqcKey`);
2. verifies the signature with the `pqcVerify` precompile (`0x…0a01`) over `keccak256(abi.encode(domain, chainid, this, id, nonce, expiry))`, refusing on a bad signature (`BadPqcSignature`) or a missing precompile (`PrecompileUnavailable`);
3. bumps the nonce, so a signature works once, and rejects expired ones (`Expired`).

A `msg.sender` check would only add the owner's **classical** secp256k1 key, the key Q-Day breaks. It would also stop a phone app or a recovery service from relaying the owner's signed "missing" report, which is the moment speed matters most.

- **Change:** an explicit NatSpec block above `freeze()` stating the access model.
- **Tests:** `freezes on the owner's PQ signature, relayed by anyone, and kills open offers` · `refuses a freeze signed by any key other than the owner's registered one` (including an empty signature from the owner's own classical account) · `after a sale, only the new owner's PQ key can freeze` · `cannot replay a freeze signature, or use a freeze signature to recover`.
- **On chain:** freeze verified by `pqcVerify` in Diana tx `0x64ac6fc30972f03a514c7cb3dc813755d2f8d6262bb71c57fbec468113a66836`; the live journey checks re-run a wrong-key freeze on every status run (`J3!`).

### M · Potential overflow in offer ID generation: false positive, no change

`offerId = ++offerCount` is checked arithmetic (Solidity 0.8.28, no `unchecked` block), so an overflow would revert rather than wrap. `offerCount` is a `uint256`; reaching 2²⁵⁶ offers is not physically possible.

### L · Unbounded storage growth in `offers`: fixed

There's no loop over `offers` anywhere, so growth can't cause a gas denial of service. Still, closed offers now free their storage:

- `acceptOffer` deletes the offer when it executes;
- new `cancelOffer(offerId)` lets the passport owner withdraw and delete an open offer (`OfferCancelled` event).

Offers made dead by a freeze (their epoch is old) are still never executable (`StaleOffer`), and the owner can delete them with `cancelOffer`.

- **Test:** `lets only the owner cancel an offer, and frees closed offers' storage`.

### Info · Replay protection via nonce: kept

The nonce is in every signed digest, along with the chain id, the contract address, an expiry and a per-action domain (`HALTE_FREEZE_V1` / `HALTE_RECOVER_V1`).

## Stage 2 findings

Stage 2 ran on the source after the stage 1 changes. The score went from 75 to 85. Every stage 2 finding is either a repeat of a stage 1 finding or a reaction to the stage 1 fix itself. None called for a code change. The release contract that replaced it is described under "Release" below.

### H · Missing access control on `freeze()` and `recover()`: by design, unchanged

This is the stage 1 finding again. This time QCAI suggests gating the calls on "a minimum balance or other conditions". A balance check measures what an account holds, not whether its holder may act on a passport, and it would lock out a phone app or recovery service relaying the owner's signed report. The only authority is an ML-DSA-87 signature by the owner's registered key, checked by `pqcVerify` (see stage 1 H). The stage 1 NatSpec block and its four tests still apply.

### M · Potential overflow in offer ID management: false positive, unchanged

This is the stage 1 finding again. `++offerCount` is checked arithmetic in Solidity 0.8.28 on a `uint256`, so an overflow reverts and can't wrap. Capping it would add a limit nobody can reach.

### M · Unbounded storage deletion in `cancelOffer()` / `acceptOffer()`: no change, explained

These deletions came from the stage 1 L fix. Each call clears exactly one `offers` slot: constant gas, no loop, and the gas refund goes to the caller. Only the passport owner can cancel (`NotOwner`), and only the named dealer can accept (`NotDealer`), so nobody else can delete another user's offers. Each deletion is a separate transaction that its caller pays for, so there is nothing for rate limiting to protect.

- **Test:** `lets only the owner cancel an offer, and frees closed offers' storage`.

### L · Potential replay in `_checkPq()`: kept, already covered

Every signed digest binds a per-action domain (`HALTE_FREEZE_V1` / `HALTE_RECOVER_V1`), `block.chainid`, the contract address, the passport id, its nonce and an expiry. The nonce is bumped on every PQ-authorised action and on every transfer.

- **Test:** `cannot replay a freeze signature, or use a freeze signature to recover`.
- **On chain:** the live journey checks (`J3!`, `J4`) re-run a wrong-key freeze and a stale-offer accept on every status run.

## Tests

`cd contracts && npx hardhat test` → 21 passing on the release source ([`evidence/tests/halte-tests.txt`](../evidence/tests/halte-tests.txt)). The tests run on Hardhat's simulated network with a mock of the PQC precompiles (`contracts/mocks/MockQorePQC.sol`), because the simulator has no ML-DSA. The real precompiles are exercised on Diana by the recorded release run (`contracts/scripts/release-proof.ts`, [`evidence/release/`](../evidence/release/)), by the live journey checks (`checks/journey.mjs`) and by `scripts/check-live.mjs`.
