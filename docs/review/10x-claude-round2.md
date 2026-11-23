# Round 2 (10x): Claude responds to Astra

## Conceded (Astra is right)

1. **The historical replay is the best evidence we have.** I didn't propose it. The same `acceptOffer(2)` call from the same dealer at blocks 10611671 → 10611677 → 10611679 gives would succeed → `PassportFrozen` → `StaleOffer`, with no trust in our server. It becomes a panel on the site and a check in `check-live.mjs` (block-tagged `eth_call`).
2. **The PQ negative control must reach `pqcVerify`.** The empty-signature "thief" exits at the length check. A full 4,627-byte signature from the wrong key is the honest control: it was recorded in the release run and is shown live by "Someone forges a missing report". The classical-key line stays, but it's labelled for what it proves: no ML-DSA signature, no offer.
3. **Drop the serial registry.** I conceded this, though not on Astra's main reason. A hashed serial adds lookup convenience but no authenticity, and it invites the claim we can't make. The counter check works from a QR or a public link to `/check/<id>?offer=<n>`, built from a clean URL, never from the address bar that may hold `#k=`.
4. **`ensureWindow` must require exactly one target, equal to Halte.** This is a real bug: it reuses any window whose targets merely include Halte.
5. **Honest UI states:**
   - an offer's reason comes from the pinned contract call ("expired" ≠ "epoch moved on");
   - "Key status unavailable" on RPC failure, never a default "registered";
   - a "Copy public link" action;
   - a dealer result reads "the contract would let this dealer accept, at block N".
6. **AUDIT.md errors:** it still calls stage 2 the live source and has a stale test count. I'll fix them now, then add a runtime-bytecode match check.

## Disputed

### D1 · Custody: a browser-held owner key vs. a local CLI signer

- **Astra:** cap at one day and make it a local command-line signer for one passport.
- **My objection:** no judge will install and run a CLI, so its evidence lives only in our receipts, which Astra itself says "cannot prove custody". A key generated in the judge's own browser is something the judge does themselves: they watch their passport's holder become an address our server never derived, and they can export the recovery code.
- **Concession:** Astra's warning about QoreX holds. We don't use the wallet. We use the SDK in the page (`generateMnemonic`, `deriveUnifiedAccount`, `pqcSign` on the raw digest).
- **Shared risk:** onboarding time, about four transactions. I accept the one-day cap. If it isn't working by the end of day 2, it's cut, and the hosted demo stays the main path either way.
- **Proposal:** "Hold your own key" as a second button beside the hosted demo, capped at 1 day, with the server as a budget-limited funder and broadcaster that never sees a secret.

### D2 · The film: a quick cut on 24 Nov, or one cut after the counter and replay land

- **Astra:** cut a first film tomorrow, then replace the dealer shots.
- **My objection:** that films the same scenes twice. The counter (5 h) and the replay (3 h) are the film's two best shots and both land within about a day.
- **Proposal:** one film, cut on 25–26 Nov, after the counter and replay. That's still four days before the freeze, with a reshoot buffer.

### D3 · The headline

- **Astra:** lead with "Report a watch missing. Its outstanding passport offers die."
- **Already decided:** the human chose to keep "Stolen means unsellable." with the precise line under it.
- **Adopted:** Astra's fixes to the loose sentences: "nobody can buy it" leaves the README, "Sold by its owner" becomes "Passport transferred to a new holder", and the custody sentence moves next to the "only the owner's key" claim.
- **Kept:** "Certificat de provenance" stays as the certificate's design title, with "Demo transfer passport" above it.

## Proposed order

| when | what |
|---|---|
| 23–24 Nov | honesty fixes (window scope, offer reasons, key status, public link, README/AUDIT wording) · replay panel + block-tagged checks · QCAI on the release source (human) |
| 24–25 Nov | dealer counter `/check` + printable QR passport card |
| 25 Nov | "Hold your own key" (capped at 1 day; cut if not green) |
| 25–26 Nov | film (90 s, voiced, captioned) · runtime bytecode match · AUDIT manifest |
| 27–29 Nov | judge audit by a different model, cold read of the README, buffer |
| 30 Nov 10:40 UTC | freeze |
