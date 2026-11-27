# Halte | Demo film

### 1. Before a dealer buys

**VO** Today, watch dealers can check a stolen-items register before they buy. A stolen watch can come back clean. The owner may already have reported the theft in another country. Even the right register can be out of date, and until the owner reports the theft, there’s nothing to find. That leaves the dealer weighing the seller’s word against paperwork someone can fake.

**Screen** Hold on a watch and its paperwork, then show how a theft report and a dealer lookup can land in different national registers.

### 2. The passport

**VO** So we built Halte. The watchmaker or the owner issues a passport for the watch on QoreChain. It’s tied to the owner’s post-quantum key.

**Screen** Open the watch passport and hold on the owner’s ML-DSA-87 key.

### 3. The dealer check

**VO** We start with the dealer’s check. This watch comes back sellable. The chain says the offer can go through.

**Screen** Hold the dealer view on “Sellable” with the offer visible.

### 4. Report and recheck

**VO** The owner reports the theft from their phone with one signature. QoreChain verifies it on chain and freezes the passport in the next block. We run the same dealer check again. Do not buy.

**Screen** Follow the signed report to its receipt, label the verification call `pqcVerify`, then let the refused result land before the last line.

### 5. Recovery

**VO** Once the watch is back, the owner unfreezes it. The dealer can buy it again, but the offer from before the report stays dead. We try to accept it. Refused.

**Screen** Keep the recovered passport visible as the original offer returns `StaleOffer`.

### 6. The cracked wallet key

**VO** Quantum computers are expected to crack today’s wallet keys. We try a sale with the compromised key. QoreChain refuses it. Selling the watch requires the owner’s post-quantum signature. So does reporting a theft or lifting the freeze.

**Screen** Hold the cracked ECDSA key attempt beside `BadPqcSignature` and the passport’s ML-DSA-87 key.

### 7. Integration

**VO** Private buyers can check the passport directly. For dealers and marketplaces, or an insurer checking a watch, it takes one HTTPS call or one contract read.

**Screen** Show the HTTPS check beside the equivalent `statusOf` read.

### 8. Proof

**VO** Halte is live on QoreChain’s Diana testnet. Anyone can open the transactions, right down to the signed theft report. Halte. Stolen watches, unsellable.

**Screen** Open the report in the Diana explorer, then hold the Halte end card.

**Main VO** · 255 words · about 1:45 at 150 words per minute, including brief holds. Orta reads in a warm, clear American voice.

### Alternative opening

Replace the first two sentences of beat 1.

**VO** Before money changes hands, a dealer wants to know whether the watch is stolen. An empty search result only tells the dealer what’s in that register today.
