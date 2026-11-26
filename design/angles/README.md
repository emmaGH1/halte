# Four ways into Halte

Each title opens a standalone phone-first replay. Start with **Issue watch passport**. At each step, the button names the action you take next. Tap a block number to inspect its transaction hash or read-only result. All four work offline.

## 1 · [Cut the Line](1-cut-the-line/index.html)

**Pitch.** Follow a stolen watch through the eyes of the people checking its route to resale.

**First ten seconds.** Three destinations sit beyond a single visible break. An owner can protect the next buyer even when the owner has no idea which counter the watch will reach. A thief with a forged wallet key still cannot reconnect the sale.

**Wow.** Check offer #2, sign the theft report, then ask again. Every route breaks at the passport. The dealer who could buy moments ago sees “Do not buy.”

**Visual language.** Cobalt transit diagram, pale blue ground, colored routes, white interruption, wayfinding typography.

**Risk.** The route diagram can suggest active notifications. Dealer, marketplace and insurer are possible readers of one shared record. The demo records the dealer’s check. [Phone captures](1-cut-the-line/shots/)

## 2 · [Before You Pay](2-before-you-pay/index.html)

**Pitch.** Take the dealer’s place in a conversation at the counter. Ask the passport whether money should change hands.

**First ten seconds.** “Should I pay?” gives the judge a decision they already understand. A quantum thief posing as the owner makes a familiar claim with financial consequences.

**Wow.** An impostor says “I found it.” Diana refuses. Later the real owner says essentially the same thing and the registered signature clears the passport. Even then, the dealer’s original deal is over.

**Visual language.** Rose and oxblood, italic dialogue, indented speakers, dark reply bubbles, a quiet evidence line.

**Risk.** The dialogue is illustrative. A filmed demo should hold on the block and contract result long enough for a judge to connect the words to the on-chain check. [Phone captures](2-before-you-pay/shots/)

## 3 · [Key Trial](3-key-trial/index.html)

**Pitch.** Give the judge the thief’s advantage up front. They have the wallet key. Can they make the passport obey?

**First ten seconds.** Two differently cut keys make the distinction tangible. Quantum forgery threatens the wallet key. The owner’s separate ML-DSA-87 key still controls the watch’s sale, theft report and recovery.

**Wow.** Try a false recovery, then try selling as the holder. Both fail. Switch back to the owner and the recovery succeeds, even though the dealer relays the transaction.

**Visual language.** Violet specimen plate, paired key silhouettes, near-black ground, acid-green controls.

**Risk.** The keys are a metaphor. A fast viewer might infer that Halte experimentally broke a wallet key. The test assumes the thief already has that key. [Phone captures](3-key-trial/shots/)

## 4 · [Borrowed Time](4-borrowed-time/index.html)

**Pitch.** Reconstruct the sale like an investigator. Start with the most surprising evidence and work backward to its cause.

**First ten seconds.** The screen reads **59:44**. That is how much time offer #2 still had when the watch came back. A theft report can kill an offer long before its expiry.

**Wow.** Recover the watch and try the offer again. The remaining time is ample. The offer belongs to an earlier passport epoch, so Diana returns StaleOffer.

**Visual language.** Amber timing strip, oversized tabular digits, moving block marker, editorial serif.

**Risk.** A clock can suggest a countdown to Q-Day. The opening caption identifies the number as remaining offer time. [Phone captures](4-borrowed-time/shots/)

## Ranked recommendation

1. **Before You Pay** for the public first screen and narrated demo. It turns “works as described” (25%) into one dealer’s repeatable decision and earns clarity (15%) with language a first-time buyer understands. The real and forged recovery claims make the signature requirement legible. Keep the receipt in frame for QoreChain usage (25%).
2. **Key Trial** for a technical jury. It gives post-quantum correctness (20%) the strongest role, alongside the registered key, on-chain verifier and relayed receipt. It requires a little more attention before the buyer’s stake becomes personal.
3. **Borrowed Time** for originality (15%). The recorded 59:44 gives a judge a concrete way to distinguish revocation from expiry. That makes the final refusal especially persuasive on functionality, while PQ verification enters later in the reconstruction.
4. **Cut the Line** for the fastest visual explanation. It makes the scope of a report clear at a glance. The chain receipt and single-dealer comparison carry more evidentiary weight than the three illustrative destinations.

## Replay and capture notes

The passport, offer, transactions and three dealer checks come from [the Diana replay](../../web/lib/replay.json). The forged report and unsigned sale revisit the active passport at block 10,611,671 using [the release record](../../evidence/release/0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4.json). False recovery illustrates the [hosted check](../../web/app/api/%5Baction%5D/route.ts) and carries its own provenance label. Buttons replay results locally. The production journey and independent verification instructions are in [JUDGES.md](../../JUDGES.md).

Every shots folder contains phone-1.png through phone-8.png, captured at 390 × 844 CSS pixels and 2× density. In order they show the landing, signed offer, permitted check, verified theft report, frozen refusal, false recovery, genuine recovery and stale refusal.
