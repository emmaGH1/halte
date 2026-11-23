# Round 1 (10x): Claude's position

Written before reading Astra's proposal, 23 Nov 2026.

## Why we wouldn't win today

The security story is "only the owner's quantum-safe key can sell the watch or lift the report". But the owner's key lives on our server, the same server that relays everything. A sharp judge will say: "So the server can do anything the owner can. What did post-quantum buy you?" That lands on PQ correctness (20%) and undercuts originality and "works as described" too.

The demo also only ever shows the seller's side. The person a stolen-watch registry exists for is the buyer at a dealer's counter, and they never appear.

## Top changes, ranked by score per hour

### 1. Your key, in your browser (self-custody owner)

- **What changes:**
  - The browser generates the owner's mnemonic (`generateMnemonic`, `deriveUnifiedAccount`, all pure JS in `@qorechain/sdk`). It keeps the mnemonic locally and offers the `QRC1-…` recovery code to save.
  - The server only funds the new account with a capped amount (MsgSend from the treasury, rate-limited) and relays signed bytes.
- **What the browser signs locally:**
  - the hybrid `MsgRegisterPQCKeyV2` (with proof of possession);
  - the scoped window;
  - the EVM `mint`;
  - every ML-DSA-87 offer, report and recovery digest.
- **What stays on the server:** only the dealer's desk, which is a different party.
- **Claim it unlocks:** "the server never sees the owner's key". `check-live.mjs` can prove it: the holder of each new passport is an address the server never derived.
- **Score impact:** PQ correctness +8, works +3, originality +2.
- **Time:** about 10–14 h.
- **Risks:**
  - browser access to the QoreChain REST/RPC (CORS). Fallback: the browser signs and our API only broadcasts the bytes;
  - bundle size;
  - about 4 transactions (about 30 s) to onboard. Show them as a visible progress list ("funding · registering your ML-DSA-87 key · opening your window · issuing"). That list is itself a tour of QoreChain's PQ stack.

### 2. The dealer's counter: "Check a watch before you buy"

- **Passport id:** derived from the watch, `keccak256("HALTE_WATCH_V1" ‖ brand ‖ serial)`, computed in the browser. No contract change: `mint(bytes32)` already takes any id.
- **Lookup:** a public `/check` page where a dealer types the brand and serial, or scans the QR printed on the certificate. It answers in one glance:
  - **REPORTED MISSING · do not buy** (red, with the freeze tx and its block), or
  - **Clear · held by 0x…** (with the passport's history).
- **Score impact:** originality +4, UX +3, works +2. It's also the strongest film beat: the same watch, before and after the report, from the buyer's side.
- **Time:** about 4–6 h.
- **Disclosure:** a serial is hashed, not encrypted. Someone who already knows a serial can look it up, which is the point.

### 3. The film (required, and it's the "works as shown" evidence)

- 90 s, voiced, captioned.
- Built from the real app and the real explorer.
- Story: issue → offer → the dealer could buy → stolen → report → the dealer's counter says DO NOT BUY → a thief with the classical key tries → refused → found → recovered → the old offer stays dead.
- **Time:** about 6 h. Without it, 25% of the score is only half-provable.

### 4. Make QoreChain's PQ layer visible where the payoff happens

- For every transaction in the register, show which scoped window admitted it: its hybrid-signed opening tx and `pqc_hybrid_verify = verified`.
- On the certificate, show the holder's key status read live from `pqcKeyStatus`: registered, ML-DSA-87, PoP.
- One "under the hood" drawer per passport, readable without code.
- **Score impact:** QoreChain usage +3, clarity +2.
- **Time:** about 3 h.

### 5. Final-source QCAI run and a release manifest

- Run QCAI on `d374a16`.
- Record source SHA → runtime bytecode hash → address → block in `docs/AUDIT.md`, plus a `check-live.mjs` check that the on-chain runtime hash matches.
- **Score impact:** PQ/security +2, QoreChain usage +1.
- **Time:** about 2 h plus the human's run.

## Not doing

- **Abstract-account spending rules and authenticators.** They're real QoreChain features, but bolting them on is checkbox usage: they don't change a watch's fate, and a judge sees through it.
- **ML-KEM (QoreSeal) for "private ownership records".** That's a different track's requirement, and encrypting a serial adds nothing the hash doesn't.
- **A real (non-simulated) failed accept on chain.** Already argued in round 1: a deliberately failed transaction confuses the explorer, and the positive control is stronger.
- **Multi-watch dashboards, accounts, an email login.** These add scope with no score.

## Film storyboard (about 90 s)

1. **0–8 s:** the line "Stolen means unsellable" over the live landing page.
2. **8–20 s:** issue a passport for a named watch. The onboarding list ticks through "your ML-DSA-87 key, generated in this browser · registered on QoreChain · window opened".
3. **20–32 s:** the owner signs an offer. The dealer checks it: would succeed.
4. **32–45 s:** "Tuesday. The watch is gone." Report missing. Explorer: the freeze tx, a 4,627-byte signature, `pqcVerify`.
5. **45–58 s:** the dealer's counter. Scan the QR: **REPORTED MISSING · do not buy**. The same offer: refused, `PassportFrozen`.
6. **58–70 s:** Q-Day. The thief holds the owner's classical key and tries to sell: `BadPqcSignature`.
7. **70–84 s:** found. The owner recovers it. The old offer: `StaleOffer`.
8. **84–90 s:** "Every rule checked by QoreChain. Re-check it yourself: `node scripts/check-live.mjs`."

## Claims to fix now

- The README says "only the owner's quantum-safe key can lift the report". True of the contract, but the demo owner's key is server-held. Until #1 lands, the sentence needs "(in the demo, held by the Halte server)" next to it, not only in Scope.
