# ideas (step 2 draft, 22 nov 2026)

These are agent-only so far: `problems.md` is empty. The 3 questions to the human are still open.

## where the slots are (gallery on 22 nov, `docs/research/gallery.md`)

| category | entries | paid slots | entries per slot |
|---|---:|---:|---:|
| Quantum Pass | 29 | 30 | ~1 (small prizes: $150 / $50) |
| Post-Quantum dApp | 36 | 3 | 12. **The two-stage QCAI audit gate will likely knock many out** |
| AI Agents | 27 | 2 | 13.5. About 15 of them are "bill-pay agent with on-chain limits" |
| Encrypted Apps | 24 | 2 | 12 |
| Cross-VM | 7 | TBA | can only call the 4 governance-approved Native contracts |
| Protocol Builders | 6 | 2 | needs a team of 2+ and a rollup |

Every category also feeds: Top-Quality (7 × $250, needs ≥70/100 and no other prize) · MEA regional ($200) · AI-Native ($500).

## eight one-liners

1. **sponsor's business:** when a market trader drops today's thrift money, they get a savings box only their phone's PQ key can open, and QoreChain gets daily hybrid-signed transactions from people who aren't crypto natives.
2. **real stakes:** when an alajo (daily thrift collector) collects, the trader gets a receipt and the collector can only take their commission on schedule. A stolen or classical key moves nothing.
3. **newest feature (v0.15 authenticators / smart-account rules):** when a trader sends a Telegram voice note saying "pay Chika 40k for rice", they get a paid supplier and a receipt, and QoreChain gets a linked-key agent acting under on-chain spending rules while the owner's ML-DSA key stays offline.
4. **sponsor's devs:** when a builder pastes their repo, they get a list of the judge's track requirements, each marked proven or missing against their on-chain txs. QoreChain gets better-qualified entries. (Close to existing tools: qorechain-pq-check, fenestella.)
5. **world the human knows (associations):** when members pay church or town-union dues, they get a public receipt, and the treasurer can only spend with 2 of 3 executives' PQ signatures. (Close to: conclave, bulkhead.)
6. **lane (remittance):** when a parent abroad sends school fees, they get money that can only land at the school's address, released by their PQ approval. (Close to: clainova, the escrow entries.)
7. **mining/geology:** when a lab issues a mineral assay, the buyer gets a certificate signed with ML-DSA and sealed with ML-KEM that can't be forged after Q-Day. (Close to: pqc-certificate, the-record.)
8. **fun mechanic:** a Telegram "ajo" group where each payout is a hybrid-signed tx, and anyone who tries to grab the pot early gets refused, with the refusal shown in the chat. (Close to: rosca.)

## top 3

### A · Alajo: daily thrift where the collector can't run · Post-Quantum dApp
- **line:** when a trader taps "drop ₦ today" (fUSD), they get a box only their phone's PQ key can withdraw from, the collector earns a commission only on the agreed day, and QoreChain gets daily PQ-guarded transactions from non-crypto people.
- **gate:** QCAI two-stage audit + `docs/AUDIT.md`, Foundry tests, a scoped window, `pqcVerify`. All doable; the audit is free once a day.
- **proof:** tx hashes with `pqc_hybrid_verify status=verified`; a refused withdrawal by the collector's classical key, shown on chain.
- **winners-post:** "Alajo puts West Africa's daily thrift on QoreChain: **the collector physically cannot take the savings**; only the trader's ML-DSA key can."
- **wedge vs rosca:** rosca is a rotating circle. Alajo is the one-collector, many-traders daily model, where the collector is the thief in the real stories.

### B · Oga's Agent: Telegram supplier payments · AI Agents
- **line:** when a trader says "pay Chika 40k for the rice" on Telegram, they get the supplier paid and a receipt, and QoreChain gets an autonomous agent spending under smart-account rules and a scoped window, with the ML-DSA key kept offline.
- **gate:** scoped window (tx/value/duration/target), smart-account spending rules, authenticated messaging, real agent activity. Needs the v0.15 authenticator path to work. **Riskiest.**
- **proof:** agent txs, plus refusals (unknown supplier, over the cap) in the evidence log.
- **wedge:** voice and pidgin on Telegram for a merchant paying suppliers, not a dev demo. It's still in the most crowded category.

### C · Hedge: a small Quantum Pass entry as a second project
- 29 entries for 30 slots. Multiple projects are allowed (one category each). Something small, like a Telegram receipt bot that does one hybrid-signed tx, gives a near-certain $50–150 place for about a day of work.
