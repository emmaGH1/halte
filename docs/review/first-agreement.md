# Agreement: Claude, Astra, Ember on first place (25 Nov 2026)

Two rounds. Files: `first-ember-review.md`, `first-{claude,astra,ember}.md`, `first-facts.md`, `first-{claude,astra,ember}-round2.md`.

## Where we landed

**Scores:** Ember 77 (up from 75), Claude ~79, Astra 81. **Odds: none quoted.** Astra and Ember withdrew their numerical estimates; 163 gallery entries give no distribution of eligible rivals. All three agree the odds hinge on one thing: **can a cold judge explain why the dealer was refused?** Strongest named rival: Rosca (current page, a demo link with bots playing a full round).

**The gap is packaging, not code.** The organizer page still reads "Verified so far (22 Nov)", has no film, and the hero opens on a mint button.

## How each dispute was settled

| dispute | outcome | why |
|---|---|---|
| Ember's QoreSeal/RDK claim | **withdrawn** by Ember | The live page doesn't list them. It does show "Test tokens fUSD/fETH/fBTC (Verified)", which Halte doesn't use. |
| Ember's shared mid-journey passport | **withdrawn** by Ember | Hosted writes are holder-bound (`requireHolder`), and the first judge to report it changes it for everyone. |
| First click | **Astra's counter + replay first** (Claude conceded) | It's live, needs zero mints, answers in about 2 s, and shows working buyer-facing software on current state, not just history. Minting stays one tap away. |
| Claude's one-tap auto-run tour | **deferred to buffer only** (Claude conceded) | It doesn't exist yet, costs a mint, and involves four sequential writes contending for shared signers. The one observed 90 s mint timeout was Claude's own test runs exhausting the issue limit, so it's not evidence of flakiness, but the tour is still unproven. |
| Rate limit | **`/own` funding gets its own bucket (2 per 10 min)**; the hosted cap is unchanged; every limit refusal links to the counter and replay (Claude + Ember; Astra dissented on treasury exposure) | At 1 QOR per funding, still under the 400/day cap, the exposure is small. |
| QCAI High | **answered at the top of JUDGES.md and on the page** | It is by design; the receipts show it (dealer-relayed signed report, wrong-key refusal). |
| `/own` | **optional; physical-phone test by the human; dropped from the film if it fails** | All three agree. |

## Plan to the freeze (30 Nov 10:40 UTC)

| # | change | hours | status |
|---|---|---:|---|
| 1 | Project page rewritten from shipped state, "Test tokens" unticked if declared | 1.5 | draft in `SUBMISSION.md`; **the human pastes it** |
| 2 | Film, 75–95 s, voiced and captioned (see below), linked from the page, README and hero | 6 | 26–27 Nov |
| 3 | Hero first click = "Check offer #2 at the counter" + replay; issue second | 2 | 25 Nov |
| 4 | High answer and the 59 min 44 s fact on JUDGES.md, the counter and check-live | 1 | **done** (check-live 12/12) |
| 5 | `/own` funding bucket; limit refusals route to counter + replay | 1.5 | 25 Nov |
| 6 | Physical-phone test of `/own` and a printed counter card, logged out (human), then a cold reader by a model that hasn't seen the repo | 3 | 27–28 Nov |

**Film storyboard (spine agreed by all three):**
- A dealer scans the card and asks: "Would you honor offer #2?"
- Can accept (block 10,611,671).
- The holder's ML-DSA-87 report, relayed by the dealer account (receipt).
- Refused, `PassportFrozen` (block 10,611,677).
- Recovered.
- Same dealer, same offer: refused, `StaleOffer` (block 10,611,679).
- **"It still had 59 min 44 s left."**
- Close on the counter URL and `check-live.mjs`.

**Skip:**
- contract changes or a redeploy;
- new sponsor modules or badges;
- chasing Rosca's mechanic;
- removing limits;
- anything public without the human's yes.
