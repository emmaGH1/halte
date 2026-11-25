# Astra, round 2 · 25 November 2026

Ember was right to prioritize the stale organizer page and missing film. Claude was right that a judge should be able to perform a fresh write. Give that judge the existing hosted issuance path directly from the counter. The first screen should answer the dealer’s question: “The watch is active again. Can I honor offer #2?”

**D1 · Put the dealer counter first.** On live deploy `c77a90f`, the public check returned active passport, epoch 2, offer epoch 0 and `StaleOffer` at block 10728777 in 2.21 s. The replay returned all three expected outcomes in 1.49 s. Both timings are single observations. This answers Claude’s strongest objection: the judge can use the working buyer-facing product on current Diana state, then rerun the historical calls to establish why the offer died. At recovery it still had **59 min 44 s** before expiry. [Counter](https://halte-roan.vercel.app/check/0xbed648483ebb7c1bb1ccb005a5f858540739d25789bc21ea1547803dac915fcd?offer=2) · [Replay](https://halte-roan.vercel.app/api/replay)

Claude is half right about Ember’s shared passport. Hosted offer, report and recovery require the mint session **or** a transferable holder capability. The passport UI forwards the URL’s private fragment as a request header. A public card gives judges read access. Sharing the holder link would let another judge act, but everyone would inherit the first judge’s changes. Even untouched, the signed offer expires. [Guard](../../web/lib/guard.ts) · [Hosted UI](../../web/app/p/%5Bid%5D/page.tsx)

A minute is plausible in isolation. Hosted checks passed 5/5 at 12:26 UTC and a separate browser-held run reached stale in 36.9 s. Neither times Claude’s proposed hosted tour. At 11:31 the same deploy timed out waiting 90 s at mint; the record gives no cause. Four sequential writes contend for shared signers. One lock can wait 40 s. RPC catch-up polls for 12 s and can still return a height below the requested floor. Giving the tour equal billing risks showing a waiting judge an earlier verdict. [Timeout](../../evidence/status/2026-11-25T11-31-03-354Z.json) · [Browser timing](../../evidence/own/2026-11-25-production.json) · [Block polling](../../web/lib/history.ts)

**D2 · Keep the shared budget; link every refusal to the counter.** Defaults are three mints or fundings combined and 20 writes per IP per ten minutes, plus 400 counted requests daily. Claude’s three attempts fit a fresh bucket. Splitting protects phone funding on shared Wi-Fi, but adds treasury exposure and leaves signer contention and the daily cap intact. [Guard](../../web/lib/guard.ts)

**D3 · Retain 81/100 as my rubric judgment.** The 5/5 run supports functionality. Ember’s competitor comparison strengthens the clarity deduction. I withdraw my 12% and 20% estimates: 163 gallery entries across tracks give no distribution of eligible rivals’ scores. [Run](../../evidence/status/latest.json) · [Organizer checks](first-facts.md)

**Ranked work and calendar**

1. Film, 5–7 h. Nov 26 storyboard; Nov 27 finish a captioned 90-second dealer scan, report receipt and before-expiry replay.
2. Counter and replay first click, 3–4 h. Nov 25 pair current verdict with pinned checks and remaining lifetime.
3. Page and README, 2 h. Nov 25 draft shipped claims and explain the audit High with relayer receipt and wrong-key simulation. Nov 28 verify film links for human publication.
4. Physical-phone and cold-reader test, 3 h. Nov 28 ask a dealer to explain the refusal unaided; separately test optional owner signing.
5. Refusal links and fixes, 2–3 h. Nov 29 resolve observed friction. Nov 30 verify logged-out playback and links before 10:40 UTC.
