from pathlib import Path
beats=[
(0,12,'Stolen watches can be resold before a dealer knows. After Q-Day, even an ordinary wallet key could be forged.'),
(12,23,'Halte gives a watch a passport on QoreChain. Its owner can stop a sale with a quantum-safe signature.'),
(23,35,'Let’s take the guided tour. A real passport is issued on the Diana testnet. No wallet is needed for this hosted demo.'),
(35,47,'The owner signs an offer to a named dealer. The dealer checks it before paying: this sale would go through.'),
(47,59,'Now the watch goes missing. The owner signs a report, and QoreChain verifies it. The passport freezes.'),
(59,71,'The same dealer checks the same offer again. This time the contract refuses: PassportFrozen.'),
(71,83,'The owner recovers the watch. But the old offer still cannot be used: StaleOffer. A report kills older deals.'),
(83,96,'What if a thief has the classical wallet key? Halte refuses the attempted sale with BadPqcSignature.'),
(96,108,'That matters after Q-Day: a forged wallet key must not let someone pretend a stolen watch was found.'),
(108,121,'Every offer, report and recovery requires ML-DSA-87. QoreChain’s pqcVerify checks the owner’s signature on chain.'),
(121,133,'The contract is live on Diana. The repository includes the QCAI audit and 21 contract tests.'),
(133,145,'Dealers, marketplaces and insurers can check before paying. One live API call returns a verdict from the chain.'),
(145,157,'The counter page gives a buyer the same answer without a wallet. This is testnet: the passport cannot identify the physical watch.'),
(157,168,'Halte. Stolen watches, unsellable. Try the demo and inspect the code.')]
def stamp(t):return f'{t//3600:02}:{t%3600//60:02}:{t%60:02},000'
Path('film/captions.srt').write_text('\n\n'.join(f'{i}\n{stamp(a)} --> {stamp(b)}\n{s}' for i,(a,b,s) in enumerate(beats,1))+'\n')
shots=['Title / desktop hero','Desktop hero','Phone: guided tour and passport','Phone: offer and dealer check','Phone: report missing','Phone: refused check','Phone: recovery and stale check','Phone: thief attempt','Desktop: Built for after Q-Day','Phone: register and proof','Desktop: explorer / proof','Desktop: Run it live','Desktop: counter page','End card']
Path('film/SCRIPT.md').write_text('# Halte — draft narration and shot list\n\nRead at approximately 140 words per minute; allow the on-chain results to breathe. Captions carry the message in the silent draft. The hosted demo holds the demo keys; the app also offers a browser-held key mode.\n\n'+'\n\n'.join(f'**{a//60:02}:{a%60:02}–{b//60:02}:{b%60:02} · {shot}**\n\n{s}' for (a,b,s),shot in zip(beats,shots))+'\n\nOn-chain contract: `0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4`. Proof: QoreChain Diana, `pqcVerify`, QCAI audit and 21 Hardhat tests. Read-only dealer checks are simulations, not transactions.\n')
