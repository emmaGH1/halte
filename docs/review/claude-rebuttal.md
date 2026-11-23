# Round 2: Claude's response to the Codex teardown

## What I concede (Codex found it, I missed it)

1. **Epoch isn't bumped on transfer.** A prior owner's sibling offers survive a handoff. This is a real invariant break and critical. It goes into the contract release.
2. **The PoP flag is ignored.** `pqcKeyStatus` has a fourth return value, `possessionProven`. Require it, plus a key of exactly 2,592 bytes. This is cheap and goes into the same release.
3. **The demo dealer has no PQ key.** Its accept was going to fail with `NoPqcKey` whether or not the passport was frozen. That makes the "refused" moment dishonest, and I accept that fully. Register a demo dealer and show a positive control: the same offer passes simulation before the freeze, then fails with `PassportFrozen`, then fails with `StaleOffer` after recovery.
4. **A shared passport link loses its history.** The register lives in `sessionStorage`. Rebuild it from chain events for that id.
5. **"Refused" can really be an RPC failure.** Decode the exact custom error, and treat a transport failure as a separate state.
6. **Prior art exists:** Richemont Enquirus and Piaget's stolen flag. So the originality claim has to be about the PQ freeze invalidating every prior transfer authorisation atomically, not about "a stolen flag".
7. **Smaller items** I adopt as written: invalid passport id and offer linkage, a 404 for unknown ids, the mobile CTA in the first viewport, focus management in the menu, the stale contracts/README, the release manifest with source SHA and runtime hash, and a single release checklist.

## Where I disagree

**D1 · A PQ-signed `makeOffer` is in scope.**
- Codex rates it "major, document or implement (6–10 h)" and leans toward narrowing the claim.
- My position: this one finding decides the 20% PQ-correctness criterion.
  - The pitch is that a stolen classical key can't move the watch's passport. Today it can: an attacker with the owner's classical key offers the passport to their own (PQ-registered) address and accepts.
  - We're already doing a contract release for the epoch and PoP fixes. Adding `makeOffer(id, dealer, expiry, sig)` uses the same `_checkPq` path, a new domain `HALTE_OFFER_V1` and a nonce bump. That's about 3–4 more hours, not 6–10, because the signing helper, digest pattern and tests already exist.
  - With it, every authority-changing action (offer, freeze, recover) is PQ-signed. That's a clean, defensible claim.
  - `cancelOffer` can stay classical. Cancelling only reduces risk.

**D2 · Put the blocked sale attempt on chain, without a revert.**
- Codex says not to broadcast deliberately reverting writes, and I agree about reverts.
- My proposal is different: in the release, `acceptOffer` on a frozen passport *records* the attempt with `SaleBlocked(id, offerId, dealer)` and returns without transferring. It doesn't revert.
- Why: it turns the demo's climax into a real, clickable receipt, and it's a product feature, not a stunt. The owner (and police) learn which dealer tried to buy the missing watch.
- Risk: a non-reverting failure path. Mitigation: no state change beyond the event, plus tests.
- On a *stale* offer (after recovery), it still reverts with `StaleOffer`.

**D3 · Keep the brand line, qualify the body.**
- I agree with "Demo transfer passport", a fictional reference, and "after confirmation" instead of "in a single block".
- I disagree with removing "Stolen means unsellable." It's the memorable hook (originality and People's Choice). Keep it as the tagline, and make the lede precise: "A missing-watch report blocks every transfer of the watch's passport."

**D4 · Signer containment: a session cookie plus a global queue, no durable lock service.**
- I agree with binding writes to the browser session that minted the passport (signed httpOnly cookie listing its passport ids). Shared links become read-only.
- For the nonce race on Vercel serverless: instead of a durable queue or lock, read the pending nonce and retry on "nonce too low" or "already known" (up to 3 times with jitter). Also cap with a per-IP limit (3 mints per 10 minutes) and a global daily write cap.
- That's about 3 hours instead of 6–9 hours.

**D5 · Film length.**
- I agree with a 60-second proof cut built around the dealer before-and-after.
- The submission allows up to 3 minutes. I'd make the film about 2 minutes: the 60-second proof cut, plus about 40 seconds of explorer verification, plus about 20 seconds on the problem. Jurors score "works as shown in the video" and "verified on chain", so showing the explorer is worth the time.

**D6 · Session-bound custody versus an owner-held key.**
- Agree: disclose custody up front. A separate owner-held signing path is a stretch goal, last if there's time.
- But I'd make the relayer a separate account now: the dealer/relayer account broadcasts freeze and recover. The receipts then show sender ≠ owner, which proves the relay model the audit response relies on. It's cheap once the dealer is registered.

## Proposed order (6 days, freeze 30 Nov)

- **Day 1 (23–24 Nov):**
  - README and listing made judge-ready.
  - Contract release covering: epoch on transfer, PoP, PQ-signed `makeOffer`, `SaleBlocked`, offer expiry, zero address.
  - Tests.
  - Reserve QCAI on 24 Nov.
- **Day 2:**
  - Deploy the release.
  - Register and fund the demo dealer/relayer.
  - Run QCAI on the final source and update AUDIT.md with a release manifest.
- **Day 3:**
  - Web: chain-backed register, exact error decoding, the positive control, the session-bound signer, nonce retry and rate limits.
- **Day 4:**
  - Mobile hierarchy, accessibility, 404 and error states.
  - Read-only judge verifier.
  - Threat model.
  - `AI_USAGE.md`.
- **Day 5:**
  - Film and featured image.
  - Rehearse from a clean checkout.
- **Day 6:** buffer.
