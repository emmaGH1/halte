# Ember, round 2 (25 Nov 2026)

## 1. Concessions

- **Astra's 59 min 44 s beats my film beat.** At recovery (block 10,611,679, 23 Nov 11:27 UTC) offer #2 still had 59m44s on its signed expiry — alone it rules out "it just expired". It belongs in the film, on the counter, atop JUDGES.md; uncommitted changes already do this and need checking and committing.
- **Claude is right that my mid-journey passport fails** (D1). Withdrawn.
- **Both are right the High is answered in AUDIT.md and only needs surfacing** — now atop JUDGES.md.
- **My 75 was low by ~2**: replay verified 3/3 on `/api/replay`, counter answers `StaleOffer` today. I move to **~77**.

## 2. Disputes

### D1 · First click — Astra first, Claude's live run second, mine dropped

Claude's objection is correct, verified: `web/lib/guard.ts` (`requireHolder`, session cookie or `#k` key) and `web/app/api/[action]/route.ts` make offer/freeze/recover holder-bound. The first judge to press *Report missing* changes a shared passport for everyone; others get 403 `not-your-session`.

Strongest objection to his auto-run: it does not exist (nowhere in `web/app`) and costs one mint per run, so a judge behind a shared/NAT IP is rate-limited before seeing anything. Astra's path is live and free: `/api/check/...?offer=2` answers `offer-dead`/`StaleOffer` today (block 10,728,803), since the contract checks epoch before expiry (`Halte.sol:101–102`). **Hero: counter/replay first, "Watch it happen live" second, mint third.**

### D2 · Rate limit — Claude's direction, narrower than he states

Verified in `web/lib/guard.ts`: `mint` = 3/IP/600 s, `write` = 20. `/own` funding calls `rateLimit("mint")` — the *same* bucket as hosted minting — so auto-run + `/own` + a hand mint = 3, and the next action fails. His fix is right because it leaves the hosted cap alone: funding gets its own bucket (2/10 min), the 429 routes to counter + replay. My "friendly message" was too weak. No per-IP fix survives a shared NAT IP either — another reason D1's zero-mint click must lead.

### D3 · Score and odds — ~77; the framing matters more

I sign Astra's framing over any 10%/12% headline: odds hinge on whether a cold judge can *explain* the refusal. The verified gap is packaging — the page still says "Verified so far (22 Nov)", lists AUDIT.md as next, has no film link, and the hero leads with a blank mint form.

### Beating Rosca in 60 seconds

Rosca's page (fetched today) leads with a Demo link: bots play a full round, money moves, thief attacks shown. Our first screen shows "Issue a demo passport" and a form. To beat it, the first viewport must show, without minting: **Can accept → Reported missing → Offer #2 is dead, with "still had 59 min 44 s left" beside the dead verdict** — retellable in one sentence; a mint form is not.

## 3. Final ranked list (freeze: 30 Nov 10:40 UTC)

| # | change | hours |
|---|---|---:|
| 1 | Rewrite the project page from shipped state (app, 21 tests, QCAI 85/100 ×3, 11/11, demo link); untick "Test tokens fUSD/fETH/fBTC" if declared — neither we nor Rosca uses it, yet it shows "Verified". Human pastes. | 1.5 |
| 2 | Film, 75–95 s, voiced and captioned, on counter + replay + 59m44s; link from page, README, hero. No film = no gate. | 6 |
| 3 | Hero first click = counter/replay (verified live); "Watch it happen live" second only if it ships green; mint third. | 2 |
| 4 | Verify and commit the working-tree changes (JUDGES.md High answer + 59m44s; counter "Not an expiry"); re-run `check-live.mjs`; one cold read of JUDGES.md. | 1 |
| 5 | `/own` funding on its own bucket (2/10 min); 429 routes to counter + replay. No contract change. | 2 |
| 6 | Physical-phone test of `/own` and printed counter card, logged out; record device + receipts. Drop `/own` from the film if it fails. | 1.5 |

**Skip:** contract change or redeploy (voids stage-3 audit and bytecode match), new features, chasing Rosca's pot, posts without the human.

**Day by day:** 25 Nov — page draft, hero swap, verify/commit. 26 Nov — film, `/own` bucket. 27 Nov — film polish, human phone test. 28 Nov — cold and logged-out pass, SUBMISSION.md ready. 29 Nov — buffer. 30 Nov 10:40 UTC — freeze.
