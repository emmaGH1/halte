# Judges: every claim, with its code, test and command

Live app: https://halte-roan.vercel.app · contract `0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4` on QoreChain Diana (chain 9800) · source commit `d374a16`

**Re-check everything live, from the chain, with nothing installed:** `node scripts/check-live.mjs` (Node 20+). It reads Diana's EVM JSON-RPC and Cosmos REST directly and never trusts the app.

**QCAI's High ("missing access control on `freeze()` and `recover()`") is by design.** The access control is the holder's ML-DSA-87 signature, checked on chain by `pqcVerify` against the key they registered with QoreChain. A `msg.sender` check would put back the classical key that Q-Day breaks. Anyone may relay a signed report; nobody can forge one. On Diana: the [confirmed report](https://explore.qore.network/tx/3F89617ECBFC169BC416AD098439F23C7824184C9E68819C5B29AE541D53AAC9) was sent by the dealer account with the holder's 4,627-byte signature, and a full-length report signed by any other key reverts with `BadPqcSignature` (try "Someone forges a missing report" on any passport). Full response: [docs/AUDIT.md](docs/AUDIT.md).

**The old offer didn't just expire.** At the recovery (block 10,611,679, 23 Nov 11:27:53 UTC) offer #2 still had **59 min 44 s** left on its signed expiry. The same dealer was refused anyway, with `StaleOffer`: the report moved the passport to a new epoch. `check-live.mjs` re-derives both numbers from Diana.

## Accounts

| role | EVM | QoreChain |
|---|---|---|
| demo owner (issues passports, signs offers, reports and recoveries; deployed the contract) | `0xB047D9D582ed279bb73791164D6527E477Cc33f9` | `qor1kpran4vza5nehdehjyty6ef8u3mucvleeqw08f` |
| demo dealer (accepts offers; relays the owner's signed messages) | `0xAa5D98cB68a67AA47c3F858B054919EbE6070414` | `qor14fwe3jmg5ea2glplsk9s2jgea0nqwpq55ucz83` |

Both keys are held by the Halte server for the demo (disclosed in the README's Scope).

## Track requirements (Post-Quantum dApp)

| requirement | where |
|---|---|
| EVM dApp guarding sensitive actions | `contracts/contracts/Halte.sol`: offer, freeze and recover all need the holder's ML-DSA-87 signature |
| `pqcVerify` | `Halte._checkPq` calls `0x…0a01` on every offer, freeze and recovery; live freeze tx [`0x3f8961…`](https://explore.qore.network/tx/3F89617ECBFC169BC416AD098439F23C7824184C9E68819C5B29AE541D53AAC9) |
| Scoped EVM window | window tx [`F44B0993…`](https://explore.qore.network/tx/F44B099360B5112ED61485A4ED76B6D776B7E55B90DB6E1CD850B497A4913B64): `pqc_hybrid_verify status=verified`, `allowed_targets` = the Halte contract only; opened in `web/lib/chain.ts` `ensureWindow` and `contracts/scripts/window.ts` |
| Two-stage QCAI audit and release follow-up | [All three PDFs and finding responses](docs/AUDIT.md). `node scripts/check-live.mjs` checks the release build's runtime hash against Diana. |
| Hardhat tests | `contracts/test/Halte.ts`, 21 passing: `evidence/tests/halte-tests.txt` · run `cd contracts && npx hardhat test` |

## Claims

| claim | code | test | live / command |
|---|---|---|---|
| A passport can only be issued to an account with a registered ML-DSA-87 key (2,592 bytes, proof of possession) | `Halte.mint`, `_requirePqcKey` | "mints only for an account with a registered, PoP-proven ML-DSA-87 key" | `check-live.mjs` reads `pqcKeyStatus` for both accounts |
| A stolen classical key can't list the watch | `Halte.makeOffer` → `_checkPq` | "needs the holder's PQ signature: a stolen classical key can't hand the passport away" | `check-live.mjs`: unsigned `makeOffer` from the holder → `BadPqcSignature` |
| A relayed offer can't be redirected or replayed | `offerDigest` binds chain, contract, passport, dealer, epoch, offer nonce, expiry | "binds the signed offer to its dealer, and refuses a replay", "binds the offer digest to …" | |
| A report freezes the passport and kills every open offer; the same dealer and offer are refused | `Halte.freeze` bumps `epoch`; `acceptOffer` checks status then epoch | "freezes on the holder's PQ signature, relayed by anyone, and blocks the same dealer and offer" | release run: would succeed → `PassportFrozen` (`evidence/release/…json`) |
| Only the owner's key can report or lift a report | `_checkPq` against the holder's registered key | "refuses a freeze signed by any key other than the holder's registered one" | live site: "Someone forges a missing report", "A thief tries to lift the report" → `BadPqcSignature` |
| An offer from before a report stays dead after recovery | epoch bump in `recover` | "recovers on the holder's PQ signature; offers from before the freeze stay dead" | `check-live.mjs`: the recorded offer → `StaleOffer` |
| A sale kills the previous holder's other offers | epoch bump in `acceptOffer` | "a handoff kills every other offer the previous holder issued" | accept tx [`0x99698c…`](https://explore.qore.network/tx/99698CF12CC93134DF41B282EA752CC9A9DB2FF77245E98097037203006BE218) |
| A missing or malformed precompile answer fails closed | bounds-checked decoding in `_requirePqcKey`, canonical bool check in `_checkPq` | "fails closed when a PQC precompile is missing or malformed" | |
| Races resolve safely in either order (offer/freeze/accept, key rotation) | separate `nonce` and `offerNonce` | the four "Ordering" tests | |
| Signed reports are relayed by someone other than the holder | `web/app/api/[action]/route.ts` (dealer account sends) | | `check-live.mjs`: the freeze tx is from the dealer, carrying a 4,627-byte signature |
| "Refused" on the page is the contract's exact error, never a network failure | `web/lib/chain.ts` `simulate` (decodes the custom error, else `TransportError`) | | each live-check row shows the error name and the block it ran against |
| The journey works on the live site, at phone width, logged out | `checks/journey.mjs` | | `node scripts/status.mjs` → `evidence/status/latest.json` |

## Where the build was argued over

Two AI models reviewed the build against each other before the release contract: `docs/review/` holds both teardowns, the rebuttal and the agreement, including what was conceded (the epoch bump on transfer, proof of possession, the dealer's missing key that made an early "refused" dishonest).
