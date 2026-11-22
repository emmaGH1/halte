<img src="assets/icon.svg" width="64" height="64" alt="">

# Halte

**Stolen means unsellable.**

Halte gives a watch a digital passport on QoreChain. The moment the owner reports it missing, the passport freezes and every open dealer offer dies with it. Only the owner's post-quantum key (ML-DSA-87), checked inside the contract by QoreChain's `pqcVerify` precompile, can freeze it or lift the freeze. A stolen classical key can't.

> Work in progress for [Build Before Q-Day](https://build.qorechain.io), the QoreChain Developer Fest (Post-Quantum dApp track). The live demo link goes here when it's up.

## What works today (Diana testnet, 22 Nov 2026)

| step | evidence |
|---|---|
| owner's ML-DSA-87 key registered | tx `EA55741ED2D6082644C00EFEFF4119EB80AB1F84179E1D0A99B56BE7489F169D` |
| Halte contract deployed | `0xe9b1dd118035ec08e490f68b9ca3d5c89ae5a654` |
| freeze signed with ML-DSA-87, verified in-contract | tx `0x64ac6fc30972f03a514c7cb3dc813755d2f8d6262bb71c57fbec468113a66836` |
| wrong-key freeze, dealer accept after freeze | both revert (simulated) · [`evidence/spike/onchain.json`](evidence/spike/onchain.json) |

## Layout

- `contracts/`: the Solidity contract (`contracts/Halte.sol`), scaffolded with `create-qorechain-dapp` (Hardhat 3)
- `checks/journey.mjs` + `scripts/status.mjs`: the judge's journey, checked against the live app and the chain
- `docs/`: brief, plan and research

## Licence

Apache-2.0. Built on the official QoreChain kit (`create-qorechain-dapp`, `@qorechain/sdk`, `@qorechain/evm`).
