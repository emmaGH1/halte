# plan: Halte

> the human's. agents never edit this file: they propose one exact change (old line, new line, why), the human says yes, then `node scripts/status.mjs --approve "<why>"`.
>
> **Halte** · *Stolen means unsellable.* Halte freezes a watch's digital passport the moment it's reported missing, and only the owner's quantum-safe key can lift it.

## north star

- **singularity:** when a watch owner reports their watch missing, they get a freeze on its digital passport that kills every open dealer offer at once, and QoreChain gets a post-quantum signature (ML-DSA-87, checked on chain by `pqcVerify`) standing between a thief and the resale of a long-lived asset.
- **the sponsor's job:** QoreChain Diana runs the passport contract. The `pqcVerify` precompile checks the owner's ML-DSA-87 signature on freeze and on recovery. The ML-DSA key registry plus a scoped EVM window guard every write. A classical-only key can't freeze, unfreeze or transfer.
- **main prize:** Post-Quantum dApp ($1500 / $750 / $500) · **extras:** Top-Quality (7 × $250), Regional MEA ($200), Best AI-Native Build ($500, `AI_USAGE.md`), People's Choice
- **not building:** physical authenticity, legal title, an Enquirus/brand registry link, marketplaces, NFTs/art, a mobile app, multi-brand onboarding, tokens

## the journey

each row has a check in `checks/journey.mjs`. `scripts/status.mjs` reads this table; keep the columns.

| id | step | done means (what a judge sees, on a phone, logged out) | sponsor |
|---|---|---|---|
| J1 | open Halte and mint a fresh demo passport | the public link opens the app (not a landing page); one tap makes a new passport with a random ID, its owner, status "active" and a Diana tx link, read back from the contract | |
| J2 | a dealer makes an offer, then the owner reports the watch missing | the open offer is listed; "report missing" sends an ML-DSA-87-signed freeze; the app shows status "frozen", the Diana tx hash, and that `pqcVerify` passed, read back from the contract for this passport ID | sponsor |
| J3 | the dealer tries to accept the open offer | the app shows "refused: passport frozen", with the reverted call or tx as evidence; the owner on chain is unchanged | |
| J3! | fail-closed: freeze signed with a wrong or classical-only key | the contract refuses; the app shows "refused", never "frozen"; status on chain stays "active" | |
| J4 | the owner recovers the passport with their PQ key | status goes back to "active" with a new Diana tx; the pre-freeze offer still fails (the epoch was bumped) | sponsor |

## winners-post lines

"A watch owner reported a passport missing on Diana while a dealer still held an open offer. **The dealer's transfer failed on chain, and only the owner's post-quantum key could lift the freeze.**"

## proof frame

one passport timeline at phone width: `offer issued → frozen (ML-DSA-87 ✓ pqcVerify) → dealer accept refused → recovered`, each row with a Diana tx link.

- the viewer's question: "if my watch is stolen and the thief has my old key, can they still sell it?"
- answers they might give: "yes, keys are keys" · "only if the dealer checks a registry"
- the shot that settles it, with no voice or captions: the dealer's "accept" button pressed, then the red "refused: passport frozen" row with its tx link, directly under the green PQ freeze row.

## clock

`status` reads `start` and `deadline` (ISO with offset, e.g. 2026-11-17T09:00+01:00).

| mark | date and time | must be true |
|---|---|---|
| start | 2026-11-22T19:30+01:00 | hardest gate and riskiest sponsor call tried |
| deadline | 2026-12-03T00:59+01:00 | |
| 10% | 2026-11-23T20:00+01:00 | idea picked, journey + checks approved |
| 25% | 2026-11-25T08:50+01:00 | the sponsor step passes in the deployed app |
| 50% | 2026-11-27T22:15+01:00 | the whole journey passes on a phone |
| 75% | 2026-11-30T11:40+01:00 | freeze: readme, film, judges file, QCAI stage 2 + docs/AUDIT.md |
| 90% | 2026-12-02T00:30+01:00 | project page complete (it locks at the deadline; there's no submit button) |

## riskiest assumption

the `pqcVerify` precompile verifies an ML-DSA-87 signature over our freeze message (chain, contract, passport ID, action, nonce, expiry) inside a Solidity call on Diana, and a wrong key is refused · hour-1 test: deploy a 20-line contract that calls `pqcVerify` with one good and one tampered signature through a scoped window · result: _not run yet_

## ideas dropped (and why)

- Alajo (daily thrift): judges are Swiss and European; a Nigerian collector story won't land
- Oga's Agent: the AI Agents track is crowded (27 entries, 2 prizes); Steward and Invoice Leash already prove it
- Restore Drill: a real bank problem, but it reads as "encrypt, decrypt elsewhere" in a 3-minute video
- Frontier Days: a strong local hook, but it becomes a tax calculator with legal risk
- Short Delivery: Quantum Pass prizes are small
