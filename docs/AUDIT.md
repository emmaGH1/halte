# QCAI audit: findings and responses

Two-stage audit as required by the Post-Quantum dApp track ([audit FAQ](https://build.qorechain.io/faq#audit)).

| stage | date (UTC) | setting | source audited | score | report |
|---|---|---|---|---|---|
| 1 | 22 Nov 2026, 19:43 | Ethereum (EVM/Solidity) | `contracts/contracts/Halte.sol` at commit `27dd594` | 75/100, medium, 4 findings | [`docs/audit/2026-11-22-qcai-stage1.pdf`](audit/2026-11-22-qcai-stage1.pdf) |
| 2 | 23 Nov 2026, 12:03 (dashboard time) | Ethereum (EVM/Solidity) | `contracts/contracts/Halte.sol` at commit `3df5f2a` (the source of the earlier Diana contract `0x1e2bacc…`, since replaced) | 85/100, medium, 4 findings | [`docs/audit/2026-11-23-qcai-stage2.pdf`](audit/2026-11-23-qcai-stage2.pdf) |
| 3 (release follow-up) | 24 Nov 2026, 23:16:57 | Ethereum (EVM/Solidity) | `contracts/contracts/Halte.sol` from `main`, identical to the release source at `d374a16` | 85/100, medium, 5 findings | [`docs/audit/2026-11-24-qcai-stage3.pdf`](audit/2026-11-24-qcai-stage3.pdf) |

QCAI reviews pasted source only. Quantum readiness is "not scored for this setting" (the FAQ says a setting aware of QoreChain's PQ precompiles is planned). The PQ path is covered by the tests and the live Diana runs below.

## Diana release and source verification

The stage 3 PDF displays 25 Nov at 00:16:57. Its creation metadata gives UTC+01:00, which puts the export on 24 Nov UTC. The builder supplied the PDF for the requested run on `main`. QCAI's export omits the submitted source and its hash, so the source attribution comes from that submission context.

| release evidence | value |
|---|---|
| Diana contract (chain 9800) | `0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4` |
| Deployment | 23 Nov 2026, block 10,611,612, [recorded deployment](../evidence/deploy/0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4.json) |
| Source commit | `d374a16f73c9fc473bd632db88a260c4054afaef` |
| Source SHA-256 | `84eb5b6c546a7b5506e9894c64f18423aa7117a1e7c93cf891285946751ccbfe` |
| Compiler | Solidity `0.8.28+commit.7893614a`, Hardhat `default`, Cancun EVM target, optimizer disabled |
| Runtime SHA-256 (decoded bytes) | `8fb03d1437ae156e5d16568f69969d53db38d00a22d28977fd5d87229dc960c6` |
| Stage 3 PDF SHA-256 | `4ba5b1bd566b2a4eece0cd727a32cd8b10cc07ca92dedaab4b0a09ae22fe38ab` |

The compiler input matched the release commit byte for byte, and the build artifact's runtime matched Diana at the deployment block and at the latest block checked. From the repository root, run `node scripts/check-live.mjs` to recheck both chain reads. With the contract dependencies installed, rebuild and compare the hashes above from the `contracts/` directory.

```sh
npx hardhat build --build-profile default
sha256sum contracts/Halte.sol
node --input-type=commonjs <<'JS'
const { createHash } = require("node:crypto");
const { deployedBytecode } = require("./artifacts/contracts/Halte.sol/Halte.json");
const runtime = Buffer.from(deployedBytecode.slice(2), "hex");
console.log(createHash("sha256").update(runtime).digest("hex"));
JS
```

The table below lists the changes since stage 2 and their tests in [`contracts/test/Halte.ts`](../contracts/test/Halte.ts).

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

Stage 2 ran on the source after the stage 1 changes. The score went from 75 to 85. Every stage 2 finding is either a repeat of a stage 1 finding or a reaction to the stage 1 fix itself. None called for a code change. The release table above identifies the contract that replaced it.

### H · Missing access control on `freeze()` and `recover()`: by design, unchanged

This is the stage 1 finding again. This time QCAI suggests gating the calls on "a minimum balance or other conditions". A balance check measures what an account holds, not whether its holder may act on a passport, and it would lock out a phone app or recovery service relaying the owner's signed report. The only authority is an ML-DSA-87 signature by the owner's registered key, checked by `pqcVerify` (see stage 1 H). The stage 1 NatSpec block and its four tests still apply.

### M · Potential overflow in offer ID management: false positive, unchanged

This is the stage 1 finding again. `++offerCount` is checked arithmetic in Solidity 0.8.28 on a `uint256`, so an overflow reverts and can't wrap. Capping it would add a limit nobody can reach.

### M · Unbounded storage deletion in `cancelOffer()` / `acceptOffer()`: no change, explained

These deletions came from the stage 1 L fix. Each call clears one fixed-size `Offer` record without iterating over other offers. Only the passport owner can cancel (`NotOwner`), and only the named dealer can accept (`NotDealer`). Each deletion runs as part of a transaction paid for by its caller.

- **Test:** `lets only the owner cancel an offer, and frees closed offers' storage`.

### L · Potential replay in `_checkPq()`: kept, already covered

Every signed digest binds a per-action domain (`HALTE_FREEZE_V1` / `HALTE_RECOVER_V1`), `block.chainid`, the contract address, the passport id, its nonce and an expiry. The nonce is bumped on every PQ-authorised action and on every transfer.

- **Test:** `cannot replay a freeze signature, or use a freeze signature to recover`.
- **On chain:** the live journey checks (`J3!`, `J4`) re-run a wrong-key freeze and a stale-offer accept on every status run.

## Stage 3 findings

### H · Missing access control on `freeze()` and `recover()`

The current holder authorizes both actions with an ML-DSA-87 signature verified against their registered key. Separate action domains, the chain ID, contract address, passport ID, lifecycle nonce and expiry bind that authorization. The caller pays to relay it. The release tests exercise a valid report from a separate relayer and reject freeze and recovery signatures from the wrong key. The recorded Diana receipt independently shows the dealer relaying the holder's signed report.

### M · Potential offer ID overflow

`makeOffer` increments the `uint256` counter with Solidity's checked arithmetic. Exhausting the counter would revert before the offer is written, preserving the uniqueness of previously issued IDs.

### M · Unchecked precompile return values

`_checkPq` requires a successful call and exactly 32 return bytes. It rejects noncanonical boolean values and only accepts a returned value of `1`. `_requirePqcKey` checks call success, static field bounds, the public-key offset and the length of the padded payload before decoding. It then requires registration, ML-DSA-87, proof of possession and a 2,592-byte key. The test “fails closed when a PQC precompile is missing or malformed” covers an empty verifier response, a noncanonical verifier result and a truncated registry response. These checks rely on Diana's precompiles for the actual cryptographic verdict.

### L · Unbounded offer storage

An accepted or cancelled offer is deleted. Expired offers and offers invalidated by an epoch change remain in storage until the current holder explicitly cancels them. This leaves residual storage growth. Each offer requires the holder's signature and a paid transaction, and contract operations address individual records directly without scanning the mapping. Cleanup is holder-driven in this release.

### Info · Clarify the nonce fields

The `Passport` field comments document both counters. `nonce` is bound to freeze and recovery authorizations and advances on freeze, recovery and transfer. `offerNonce` advances on successful offer creation and is bound to the signed offer alongside `epoch`. The separate counters let an offer land without voiding a pending report. An epoch change invalidates earlier offers and their unsubmitted authorizations. The replay, handoff and ordering tests exercise these rules.

## Tests

`cd contracts && npx hardhat test` → 21 passing on the release source ([`evidence/tests/halte-tests.txt`](../evidence/tests/halte-tests.txt)). The tests run on Hardhat's simulated network with a mock of the PQC precompiles (`contracts/mocks/MockQorePQC.sol`), because the simulator has no ML-DSA. The real precompiles are exercised on Diana by the recorded release run (`contracts/scripts/release-proof.ts`, [`evidence/release/`](../evidence/release/)), by the live journey checks (`checks/journey.mjs`) and by `scripts/check-live.mjs`.
