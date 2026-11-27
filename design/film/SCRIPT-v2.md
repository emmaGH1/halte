# Halte film · script v2 (TourIQ-style)

About 300 words, read at about 160 wpm for about 1:50. A new cut every 1–2 s. The story comes first and the product arrives at 0:35. The opening line returns at the end.

| Time | Voice | Picture |
|---|---|---|
| 0:00 | A watch is built to outlast its owner. | Macro of a movement ticking, warm light |
| 0:04 | That's also what makes it worth stealing. | Night, a shop window, a gloved hand |
| 0:07 | A stolen watch can be back on sale within days. Online. At a pawn counter. Through a dealer who never asks. | Fast cuts; a price ticks up in split-flap digits over each shot |
| 0:14 | The dealer can check a register. It's out of date, or it's in another country, or the theft wasn't reported in time. | Dealer with a loupe; register pages blur past |
| 0:21 | So the watch sells, and the owner never sees it again. | Watch slid across a counter; cash |
| 0:25 | And a new problem is coming. Quantum computers will break the keys most systems use to prove who owns what. A thief with a forged key could lift a theft report and sell anyway. | Lattice dial, cold light; a key glyph cracks into dots |
| 0:35 | So we built Halte. | Logo: the dot dial resolves, the second hand ticks once |
| 0:37 | Every watch gets a passport on QoreChain, signed with a post-quantum key the owner keeps on their phone. | Passport card floats out of the real app, ML-DSA-87 |
| 0:45 | The owner offers it to a dealer. The dealer checks before paying. It's clear. | macOS cursor clicks, green verdict |
| 0:51 | Then the watch is stolen. One tap from the owner, and the passport freezes in the next block. | Report missing; red wave; the second hand stops; music drops out |
| 0:58 | Every dealer, marketplace and insurer that checks gets the same answer. Do not buy. | Verdict cards multiply across marketplace UIs |
| 1:04 | Even the deal that was already agreed is dead. | The same dealer click: Refused |
| 1:08 | When the watch comes home, the owner unfreezes it. The old deal stays dead, so a sale arranged around the theft can never go through. | Recover, then StaleOffer |
| 1:16 | And the thief? Give them the wallet key, even a forged one. Refused. Only the owner's ML-DSA key can move this watch, and QoreChain checks it on chain every time. | Thief attempts, BadPqcSignature, pqcVerify |
| 1:28 | For a dealer, it's one check before you pay. For a marketplace, one call in the listing flow. | API call, statusOf |
| 1:35 | Every step is a real transaction on QoreChain, open for anyone to verify. | Explorer, block number |
| 1:40 | A watch is built to outlast its owner. Now it can outlast a thief. | Back to the macro movement, ticking again |
| 1:46 | Halte. Stolen watches, unsellable. | End card, URL |
