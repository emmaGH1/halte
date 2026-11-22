# QCAI audit: findings and responses

Two-stage audit as required by the Post-Quantum dApp track ([audit FAQ](https://build.qorechain.io/faq#audit)).

| stage | date (UTC) | setting | source audited | score | report |
|---|---|---|---|---|---|
| 1 | 22 Nov 2026, 19:43 | Ethereum (EVM/Solidity) | `contracts/contracts/Halte.sol` at commit `27dd594` | 75/100, medium, 4 findings | [`docs/audit/2026-11-22-qcai-stage1.pdf`](audit/2026-11-22-qcai-stage1.pdf) |
| 2 | after the fixes below, same setting | Ethereum (EVM/Solidity) | | | _pending_ |

QCAI reviews pasted source only. Quantum readiness is "not scored for this setting" (the FAQ says a setting aware of QoreChain's PQ precompiles is planned). The PQ path is covered by the tests and the live Diana runs below.

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

## Tests

`cd contracts && pnpm build && npx hardhat test nodejs` → 11 passing ([`evidence/tests/halte-tests.txt`](../evidence/tests/halte-tests.txt)). The tests run on Hardhat's simulated network with a mock of the PQC precompiles (`contracts/mocks/MockQorePQC.sol`), because the simulator has no ML-DSA. The real precompiles are exercised on Diana by `contracts/scripts/spike-onchain.ts` and by the live journey checks (`checks/journey.mjs`).
