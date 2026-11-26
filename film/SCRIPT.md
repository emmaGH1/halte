# Halte — draft narration and shot list

Read at approximately 140 words per minute; allow the on-chain results to breathe. Captions carry the message in the silent draft. The hosted demo holds the demo keys; the app also offers a browser-held key mode.

**00:00–00:12 · Title / desktop hero**

Stolen watches can be resold before a dealer knows. After Q-Day, even an ordinary wallet key could be forged.

**00:12–00:23 · Desktop hero**

Halte gives a watch a passport on QoreChain. Its owner can stop a sale with a quantum-safe signature.

**00:23–00:35 · Phone: guided tour and passport**

Let’s take the guided tour. A real passport is issued on the Diana testnet. No wallet is needed for this hosted demo.

**00:35–00:47 · Phone: offer and dealer check**

The owner signs an offer to a named dealer. The dealer checks it before paying: this sale would go through.

**00:47–00:59 · Phone: report missing**

Now the watch goes missing. The owner signs a report, and QoreChain verifies it. The passport freezes.

**00:59–01:11 · Phone: refused check**

The same dealer checks the same offer again. This time the contract refuses: PassportFrozen.

**01:11–01:23 · Phone: recovery and stale check**

The owner recovers the watch. But the old offer still cannot be used: StaleOffer. A report kills older deals.

**01:23–01:36 · Phone: thief attempt**

What if a thief has the classical wallet key? Halte refuses the attempted sale with BadPqcSignature.

**01:36–01:48 · Desktop: Built for after Q-Day**

That matters after Q-Day: a forged wallet key must not let someone pretend a stolen watch was found.

**01:48–02:01 · Phone: register and proof**

Every offer, report and recovery requires ML-DSA-87. QoreChain’s pqcVerify checks the owner’s signature on chain.

**02:01–02:13 · Desktop: explorer / proof**

The contract is live on Diana. The repository includes the QCAI audit and 21 contract tests.

**02:13–02:25 · Desktop: Run it live**

Dealers, marketplaces and insurers can check before paying. One live API call returns a verdict from the chain.

**02:25–02:37 · Desktop: counter page**

The counter page gives a buyer the same answer without a wallet. This is testnet: the passport cannot identify the physical watch.

**02:37–02:48 · End card**

Halte. Stolen watches, unsellable. Try the demo and inspect the code.

On-chain contract: `0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4`. Proof: QoreChain Diana, `pqcVerify`, QCAI audit and 21 Hardhat tests. Read-only dealer checks are simulations, not transactions.
