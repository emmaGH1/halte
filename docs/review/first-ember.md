# Ember, round 1 position (25 Nov 2026)

**Verdict, reaffirmed: 7/10, ~75/100; 1st place ~10%, top 3 ~25–30% only if the film ships and the project page is rewritten.** Strongest competitor: **Rosca** (savings circle, majority + winner ML-DSA-87 payout, per-member scoped windows, live + demo modes, daily stolen-key attacks, proof page, Demo link). Halte beats it on nothing a judge sees in 60 seconds today, because Rosca's page is current and Halte's is not.

## 1. Every earlier claim, evidenced or withdrawn

| Earlier claim | Verdict | Evidence (checked today) |
|---|---|---|
| Page stale: "Verified so far (22 Nov)… Next: web app, tests, audit" | **Confirmed verbatim, still live** | `build.qorechain.io/p/halte` fetched 25 Nov: "Verified so far (22 Nov): in-contract pqcVerify freeze succeeded on Diana… Next: web app, tests, two-stage QCAI audit". Web app, 21 tests, 3 QCAI stages shipped since. |
| Page ticks kits not really used (QoreSeal, RDK…) | **Withdrawn** | Live page "Kits" footer, fetched today: only `create-qorechain-dapp` (Declared), QoreChain SDK (Verified), EVM window incl. scoped (Verified), Hybrid ML-DSA-87 (Verified), PQC key registration with PoP (Verified), Solidity PQC key status / signature check (Declared), test tokens (Verified). No QoreSeal, no RDK. My QoreChain-usage deduction (22/25) was wrong on this point; the true composition is closer to 24/25. |
| 36+ entries; half are "stolen classical key moves nothing" vaults | **Confirmed, count refined** | `docs/research/gallery.md` (22 Nov): "Post-Quantum dApp — 36 entries". Taglines promising a leaked/stolen key moves nothing (bulkhead, DeedLock, Haven Escrow, Heirloom, Jaydaad, Peal Tender, PQ Timelock, Q-Day Vault, Quantum Escrow/Vault, QVault, Rewind, Steal This Vault…): ~15/36 ≈ 40%, not half. Site now shows 163 projects total; 36 is a floor. |
| Journey 5/5, check-live 11/11 | **Confirmed, re-run today** | `evidence/status/latest.json` (25 Nov 12:26 UTC): 5/5, no problems. `node scripts/check-live.mjs` today: "11 of 11 passed" — bytecode match, 4,627-byte dealer-relayed freeze, `PassportFrozen → StaleOffer` replay. |
| `/own`: second path, untested on a real phone, ~540 KB | **Refined** | Server custody disclosed (README Scope) — correct. `/own` JS live today: 485 KB uncompressed, 7 chunks. Phone gate (10x agreement D1: fresh phone must complete issue→offer→report→recover on `/own` or drop it) has no recorded pass in the repo; README's "Android Chrome" doesn't name `/own`. Stands as "no recorded gate pass". |
| QCAI 85/100, "missing access control" High repeated all 3 stages | **Confirmed** | `docs/AUDIT.md`: stage 1 75/100, stages 2 and 3 85/100, each raising H "Missing access control on `freeze()`/`recover()`"; the by-design PQ-only answer is documented with 4 tests. A skimming judge still sees an uncovered-looking High. |
| No film on the page | **Confirmed, refined** | A silent 76 s desktop capture exists unlinked (`evidence/demo/halte-desktop-run.mp4`, 23 Nov); neither README nor the project page links any video. Required ≤3-min voiced film not shipped. |
| 21 tests, epoch-kill, fail-closed decoding | **Confirmed** | README Proof table; `docs/AUDIT.md` Tests; check-live output above. |

## 2. Ranked changes to reach FIRST place (5 days, no contract change)

Score gains are rubric points out of 100, against Rosca specifically.

1. **Rewrite the project page today (1 h, +8–10, risk ~0).** Replace the 22 Nov "Next:" text with shipped state: web app, 21 tests, QCAI 85/100 ×2, check-live 11/11, Demo link. *Notice:* first thing read; today it says the project is 3 days behind its own repo. Clarity 10→14.
2. **Ship the ≤3-min voiced, captioned film; link from page + README (6 h, +10, risk low).** Missing/voiceless film fails the gate; Rosca has a Demo link, Halte none. Film one beat: same dealer, same offer, `would succeed → PassportFrozen → StaleOffer`.
3. **Pass or demote `/own` (2–3 h, +6, risk medium).** Run the D1 phone gate fresh-phone, logged out; record it in README. If it fails, drop `/own` from the judge path — dual custody costs more clarity than it buys.
4. **Pre-empt the High finding at the top of JUDGES.md and the project page (1 h, +4, risk 0).** Three lines: "Why there is no `msg.sender` check: it would reintroduce the classical key Q-Day breaks; authority is the registered ML-DSA-87 key, verified by `pqcVerify`." A judge who reads AUDIT.md cold should never see an unanswered High.
5. **Primary button opens a mid-journey passport (2 h, +5, risk low).** Offer live, not yet reported, so the judge's first click is the interesting state, not a blank form. Rosca's demo mode does this with bots; Halte can with one real passport.

## 3. Explicitly skip

- Any contract change or redeploy (QCAI stage 3 audited `d374a16`; check-live verifies that bytecode).
- New features, per-transaction window drawers, CLI signer, extra kits/modules (10x WON'T list stands).
- Chasing Rosca's mechanic (real fUSD value, group pot) — Halte cannot out-scope it in 5 days and shouldn't try; it wins on the epoch-kill beat and the /check counter, which Rosca lacks.
- Anything public the human hasn't approved: no posts, no page edits beyond what the human pastes, no Comments on other projects.
- Fixing the 3-passports/10-min limit for judge button-mashing beyond a friendly error message — real, but lower value than items 1–3.
