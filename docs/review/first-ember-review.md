# Ember's review (Muse Ember, 25 Nov 2026), verbatim summary

**Score: 7/10 today, 7.5–8/10 with three fixes. ~75/100 on the rubric.**

| Criterion | Weight | Ember | Reason |
|---|---|---|---|
| Works as described | 25 | 18 | Journey green 5/5, check-live 11/11. But the default demo has Halte's server holding the keys; `/own` fixes it but is the second path, untested on a real phone, ~540 KB. |
| QoreChain usage | 25 | 22 | pqcVerify + pqcKeyStatus in-contract, ML-DSA-87 with PoP, hybrid window scoped to one contract, every claim has a Diana tx. Deduction: the project page ticks kits not really used (QoreSeal, RDK…). |
| PQ correctness | 20 | 16 | Epoch-kill, expiry, replay protection, fail-closed decoding, 21 tests. But QCAI 85/100 and its "missing access control" High repeated; a skimming judge sees an uncovered High. |
| Originality | 15 | 9 | 36+ entries in the track; half are "stolen classical key moves nothing" vaults/escrows. Watch-passport skin is fresh, mechanic is the common pattern; epoch twist clever, not category-defining. |
| Clarity / UX / docs | 15 | 10 | README + JUDGES.md excellent. But the build.qorechain.io project page is stale ("Verified so far (22 Nov)… Next: web app, tests, audit"). No film on the page. |

**Chances (Post-Quantum dApp, $1500/$750/$500):** 1st ~10%; any top 3 ~25–30% if film ships and page is rewritten; as-is ~10–15%. Only ~8–12 entries likely pass every gate.

**Ember's three fixes:** 1) rewrite the project page today; 2) ship the ≤3-min voiced film; 3) make `/own` the judge path or test it on a real phone.
**Also flagged:** the 3-passports/10-min limit can lock out a button-mashing judge; dual-mode custody may cost clarity.
