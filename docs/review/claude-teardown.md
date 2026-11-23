# Teardown: Claude (Opus 5.5), 23 Nov 2026

This was written independently of the Codex teardown. The judging weights are: works 25 · QoreChain usage 25 · PQ correctness 20 · originality 15 · clarity/UX/docs 15.

## Critical

**C1 · Ownership can be stolen with the classical key, which contradicts the headline.** `contracts/contracts/Halte.sol:68`
- **Problem:** `makeOffer` authorises only with `msg.sender == p.owner`, which is secp256k1. Suppose a Q-Day attacker holds the owner's classical key. They call `makeOffer(id, attacker)`, register an ML-DSA key for `attacker`, and call `acceptOffer`. They now own the passport, and only *their* PQ key can freeze it. The README says "A stolen classical key can't". A PQ-literate juror will find this in five minutes, and it hits the 20% PQ-correctness weight directly.
- **Fix:**
  - `makeOffer(id, dealer, expiry, sig)` must carry the owner's ML-DSA-87 signature over `HALTE_OFFER_V1 · chainid · this · id · dealer · nonce · expiry`, checked with `pqcVerify`, and bump the nonce.
  - Add tests: the classical-only offer is refused, replay is refused, and the wrong dealer is refused.
  - Redeploy and repoint the app.
  - Run QCAI again on the final source (stage 2 re-run on 24 Nov, the free UTC day) so the audited source equals the deployed one.
- **Effort:** about 4–5 hours.

**C2 · The README is stale and wrong.** `README.md`
- **Problem:** it shows the old contract `0xe9b1…`, says "Work in progress … live demo link goes here", has no requirement-to-evidence map, no run instructions, no audit link and no video. The README is the first thing every juror opens (clarity 15%, and they verify "in the repo").
- **Fix:** rewrite it with:
  - the hero image and live URL;
  - a 60-second "try it" section;
  - a track requirement → evidence table (window tx with `pqc_hybrid_verify`, pqcVerify freeze tx, QCAI PDFs + AUDIT.md, tests);
  - the architecture, threat model and custody disclosure;
  - how to reproduce.
- **Effort:** about 3 hours.

**C3 · The demo can fail while judging runs (6–15 Dec).** `web/lib/chain.ts`
- **Problem:** one server key signs every write, with no serialisation. Two judges clicking at once race the EVM nonce, so one gets an error, and the error UX is weak. There's no rate limit either, so a bot can burn the window's 200-tx budget and the test QOR. If Diana is down, the site has nothing to show.
- **Fix:**
  - Fetch the pending nonce and retry on a nonce error.
  - Add a per-IP rate limit (for example, 3 passports per 10 minutes).
  - Show a clear "Diana is busy, retrying" state.
  - Add a "recorded run" fallback that links the evidence txs when the chain is unreachable.
  - Add an uptime check to `status.mjs`.
- **Effort:** about 3 hours.

## Major

**M1 · Refusals are only `eth_call` simulations.**
- **Problem:** the most dramatic moment ("dealer refused") leaves nothing on chain. A juror who verifies "on chain" sees freeze and recover txs, but no refusal.
- **Fix, and the hook:** when a frozen passport is offered or accepted, *record* the attempt instead of only reverting. `acceptOffer` on a frozen passport emits `SaleBlocked(id, dealer, offerId, block)` and returns without transferring. The certificate then shows "Sale attempt blocked · dealer 0x… · block N". The stolen watch's attempted sale becomes a lead for the owner and the police. That's a memorable, original feature, and a real tx a juror can click.
- **Caveat:** a non-reverting failure path needs careful tests. The dealer pays gas, and that's fine.
- **Effort:** about 3 hours, done together with C1 in one redeploy.

**M2 · "The server holds the owner's key" is a credibility gap.**
- **Problem:** it's disclosed, but a juror can say it isn't post-quantum custody at all.
- **Fix:** don't build wallet integration (no time, and it's unclear QoreX can sign ML-DSA for arbitrary messages). Instead:
  - explain it head-on in the README and on the page, under "custody in production": the owner's ML-DSA key lives in their QoreX wallet or a hardware enclave, and the server only relays;
  - show in the UI that the *relayer* is a different account from the owner (the contract already allows relaying);
  - make the demo's relayer the dealer/relayer account, so the owner account is visibly not the tx sender.
- **Effort:** about 1.5 hours.

**M3 · Film and featured image.**
- **Problem:** there's no final ≤3-minute video yet, and no 16:9 featured image.
- **Fix:** structure the film as:
  1. 20 s: the problem (stolen watches are resold through dealers within days);
  2. 60 s: the live journey;
  3. 40 s: verify on the explorer (window tx `pqc_hybrid_verify status=verified`, freeze tx calling pqcVerify, SaleBlocked event);
  4. 20 s: close.
- **Effort:** about 4 hours.

**M4 · Special awards left on the table.**
- `AI_USAGE.md` + the form tick for Best AI-Native ($500): 1 hour.
- Regional MEA ($200): just a form field.
- People's Choice needs a share-friendly OG image and a one-line pitch.
- **Effort:** about 1.5 hours.

**M5 · No threat model.**
- **Problem:** the only published tie-break signal was a threat model.
- **Fix:** add a one-page `docs/THREAT_MODEL.md` covering the classical key stolen, the PQ key stolen, a malicious relayer, a dealer colluding, a precompile outage, squatting on `mint`, and front-running a freeze.
- **Effort:** about 1.5 hours.

## Minor

- **`mint(id)` squatting:** anyone can claim any watch id first. Document that in production the id is a manufacturer-attested serial hash, and leave it unbuilt.
- **Offers have no expiry:** add `expiry` to `Offer` in the same redeploy (cheap).
- **No passport index:** there's no way to view the passports a judge created. Add a "Recent passports" list from events on the landing page (proves activity, and helps People's Choice).
- **Precompile references aren't links:** "0x…0a01" isn't clickable. Link it to the QoreChain precompile docs.
- **Mobile menu:** no focus trap, and focus doesn't return to the button on close.
- **Unknown passport id:** `/p/<id>` should give a proper not-found state.
- **Bot-like copy:** remove remaining phrasing such as "reached only through a scoped EVM window". Instead, link the window tx itself.

## Top 10 (ranked)

1. C1: a PQ-signed `makeOffer` (closes the hole that contradicts the pitch).
2. M1: on-chain `SaleBlocked` record (the memorable hook plus on-chain proof of refusal). Do C1, M1 and offer expiry in **one** redeploy.
3. Re-run QCAI on the final source (24 Nov free run) and update AUDIT.md.
4. C2: rewrite the README with a requirement → evidence map.
5. C3: demo reliability (nonce retry, rate limit, fallback, uptime).
6. M3: the final film (≤3 minutes) and the 16:9 featured image.
7. M2: the custody story and a separate relayer account.
8. M5: `THREAT_MODEL.md`.
9. M4: `AI_USAGE.md`, the regional award, and the OG image.
10. Recent passports list plus minor polish.

## Explicitly NOT doing

- Wallet-connect or QoreX signing.
- Switching tracks.
- Another visual redesign.
- Manufacturer attestation.
- A mainnet deploy.
- Any multi-chain work.
