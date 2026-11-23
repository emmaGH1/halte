# Round 1 (10x): Astra's position

Codex `gpt-6.2-astra`, 23 Nov 2026. Written independently of Claude's proposal and saved from its report, with links shortened to repo paths.

## 1. Why Halte would lose today

**The contract has a first-place demonstration buried inside a claim the product cannot deliver.**

"Report a watch missing, and nobody can buy it" invites a judge to imagine a thief selling the watch for cash. Halte's actual achievement is sharper:
- A dealer holds a valid transfer offer.
- The holder reports the watch missing, and the dealer's exact offer stops working.
- The holder recovers the watch, and that offer **still** cannot move the passport.

I independently reproduced all three outcomes on Diana with identical calldata. Yet:
- a judge following the finished-run link sees an *active* passport;
- the server plays both people in the interactive demo;
- there is no film yet, although it is required.

So the judge has to discover the best part and supply the product story themselves.

## 2. Five changes, ranked by expected score gain per hour

These are marginal estimates in points out of 100, and they overlap. The film also clears an eligibility requirement, which matters more than its numerical estimate. I would keep the deployed Solidity for all five.

| Rank | Change | Estimated rubric gain | Hands-on time |
|---|---|---|---|
| 1 | Make the required film from the real release evidence | **+7** · clarity 4, works 2, originality 1 | 3 h |
| 2 | Close the audit-to-deployment gap | **+4** · PQ security 2, QoreChain usage 1, clarity 1 | 2 h plus QCAI turnaround |
| 3 | Give judges a one-click historical replay of offer #2 | **+5** · verified QoreChain usage 3, works 2 | 3 h |
| 4 | Give the dealer an independent, read-only counter check | **+7** · originality 3, works 2, UX 2 | 5 h |
| 5 | Prove one holder can sign outside Halte's server | **+5** · PQ security 3, works 1, verified QoreChain usage 1 | 8 h, capped |

### 1. Cut a 90-second film immediately

- **What:** a minimum viable cut from the deployed app and the historical calls below, using a watch, a printed passport card, two screens and one offer number.
- **Where it goes:** the top of the README and the project form. Replace the dealer shots when change 4 lands.
- **Risk:** a polished reconstruction that looks like a real rejected transaction. Label each dealer result "read-only contract check · block …", and the report and recovery "confirmed transaction".
- **How a judge verifies it:** independently replay the three numbered blocks and open the freeze receipt.
- **Timing:** a usable first cut by **24 November** buys more than spending the week planning a better one.

### 2. Tie QCAI to the shipped bytes

- Start the release-source QCAI run now with the same EVM/Solidity setting.
- Keep the two dated PDFs and append the release report.
- Map each old finding and each release change to its disposition and named test.
- Correct the audit document's identification of `3df5f2a` as live, and its stale 11-test count.
- Publish the release source commit `d374a16` and the compiler settings.
- Add a command that compares the compiled **deployed runtime bytecode** against `eth_getCode` at `0x900db566…`.
- Add the audit link to the form's "How it's made" field.

**Risk:** chasing a higher QCAI number and invalidating the release evidence with cosmetic contract edits. The organizer says its score does not automatically enter judging.

### 3. Put "Replay offer #2 on Diana" beside "Issue a demo passport"

This is the highest-confidence engineering change. `check-live.mjs` passed 9/9, but its `eth_call` always asks for `latest`. Extend it to accept a block tag, and add a public replay panel that sends the same `acceptOffer(2)` call from the same dealer at each recorded height. Direct RPC results:

| Diana block | Direct RPC result | What it tells the dealer |
|---|---|---|
| `10611671` | Success, return data `0x` | The contract would have allowed acceptance. |
| `10611677` | `0xdd656228` · `PassportFrozen` | The confirmed missing report blocks acceptance. |
| `10611679` | `0xef8d77e3` · `StaleOffer` | Recovery restored the passport; offer #2 remains dead. |

How to present it:
- Show the short offer ID, the block and the result first.
- Put the RPC details and a copyable command behind "Verify independently".
- Include the recorded **full-length wrong-key freeze** as the PQ negative control. The empty-signature example exits at the length check before calling `pqcVerify`.

**Risk:** historical state pruning. If the RPC stops serving a height, label it "historical state unavailable" and link the dated release evidence. Keep a separate live check at the latest block.

### 4. Build the dealer's side of the counter

**What to build:**
- Add "Check a passport" to the landing page.
- A dealer scans a printed QR with their phone camera or pastes the public passport link.
- Generate the QR from a clean `/check/<full-id>?offer=<id>` URL, never from the owner's address bar, which can contain the `#k=` capability.
- Show:
  - a fictional watch reference printed on the card;
  - the current passport status;
  - a separate answer to "Can this named dealer accept offer #2?";
  - a refresh button.

**How the endpoint works:**
- Reuse `simulate` in a read-only endpoint.
- Validate that the offer belongs to this passport, resolve the named dealer, and pin the passport, offer and simulation to one block.
- Handle no offer, expired offer, unknown passport and RPC failure distinctly.

**Why it matters:** the value is that someone standing across the counter can decide without a wallet, a holder credential or trust in a seller's screenshot.

**Risk:** implying the QR authenticates the watch. Label it "Demo passport card".

### 5. Prove independent holder custody for one passport

**Keep the hosted demo and add:**
- A reproducible local holder signer for a separate, funded Diana account generated on the holder's machine.
- Register its ML-DSA-87 key with proof of possession, open a Halte-only window, and mint from that account (`mint` assigns `msg.sender`).
- The local signer reads the contract's digest, displays the action, passport, dealer and expiry, then calls `pqcSign` on the raw 32 digest bytes.
- It exports only the public intent and signature. A narrowly scoped relayer submits it after simulation, under the existing lock and limits.
- Demonstrate a locally signed offer, freeze and recovery.

**What a judge can check, and what they can't:**
- They can check the holder's `pqcKeyStatus`, the mint sender, the distinct relay sender, and the confirmed `Frozen` event.
- **Custody itself cannot be proven from a receipt**, so make the local signer short enough to inspect and run without a Halte credential.

**Risks:**
- QoreX `signArbitrary` signs prefixed QoreSign messages, while the contract verifies a raw digest, so a drop-in wallet button would fail.
- Spending the week on wallet onboarding. Cap this work at one day.

## 3. Things to explicitly skip

- **The sponsor-module collection.** Authenticators, spending rules, KEM keys, cross-VM and AI risk scoring don't answer whether this dealer can accept this offer. Abstract-account `MsgExecuteEVM` even bypasses the EVM window. Hybrid signing is already in use: show its verified window-opening transaction and distinguish it from the holder's application signature.
- **NFC procurement, a public serial registry, and authenticity claims.**
  - A copied QR resolves the same valid passport.
  - Hashing a public serial does nothing to establish who enrolled the genuine watch.
  - Stolen-watch lookup already exists (prior-art research).
  - Spend the originality budget on revoking an executable offer.
- **`SaleBlocked` events, failed transactions for spectacle, marketplace payments, another deployment for presentation.**
- **Special awards on the engineering schedule.**
  - Tick AI-native with the existing `AI_USAGE.md`.
  - Reuse the film for People's Choice.
  - MEA only goes to projects with no other prize.
  - Freeze by **30 Nov 10:40 UTC**.

## 4. The 90-second film

| Time | Picture and voice |
|---|---|
| 0–7 s | A watch and its passport card cross a dealer's counter. The dealer scans it. "Yesterday this dealer had permission to accept this watch's passport. Should that permission come back if the missing watch is found?" |
| 7–19 s | The dealer's phone: **Offer #2 · can accept** (read-only check, block `10611671`). |
| 19–32 s | The holder reports the watch missing; the confirmed `Frozen` receipt. "The holder authorized the report with ML-DSA-87. A different account paid to send it." Label the hosted custody. |
| 32–44 s | The dealer's phone again: `PassportFrozen`, block `10611677`. Let it sit. |
| 44–56 s | The registered holder key; a correctly sized report signed by a different key refused; the Halte-only hybrid window receipt. "The window admits the transaction. The contract separately checks who authorized the report." |
| 56–70 s | Recovery. The dealer checks #2 once more: **`StaleOffer`**, block `10611679`. "The watch came back. Yesterday's permission didn't." Hold longest. |
| 70–80 s | The separate successful handoff, labeled "Second passport · authorized transfer". |
| 80–90 s | The public checker and "Replay offer #2 on Diana", with a short URL and a clean QR. Reserve "live" for a current RPC check. |

## 5. Claims a skeptical judge can challenge

| Current claim or behavior | Fix |
|---|---|
| "Stolen means unsellable", "nobody can buy it", "Certificate of provenance", "Sold by its owner" | Lead with "Report a watch missing. Its outstanding passport offers die." Use "Demo transfer passport" and "Passport transferred to new holder". The chain establishes neither physical authenticity, payment nor legal title. |
| "Only the owner's key" reads as personal custody; "only the browser that issued it" reads as device binding | "The contract requires a signature from the current holder's registered key. Halte holds the keys for the hosted demo." Label the private control link (`#k=`, plus the session cookie) and add an explicit **Copy public link**. |
| "Every EVM write" uses a window "limited to the Halte contract" | Scope the claim to hosted runtime operations and distinguish deployment. Fix `ensureWindow`: it reuses a window when `allowedTargets.includes(target)`, including a multi-target window. Require exactly one target, equal to Halte. |
| "The whole history" is rebuilt in any browser; "the dealer could buy it" | Shared links rebuild confirmed events; dealer simulations are session-local unless replayed. Label results "Contract would allow this named dealer to accept at block N". A read-only call doesn't check that the dealer has gas or a window. |
| "Dead: the epoch moved on" for any open, active, non-live offer; "Registered · PoP" when the key lookup fails | An offer can simply expire in the same epoch: derive the reason from the pinned contract call. Validate algorithm, registration, length and the possession flag; render "Key status unavailable" on RPC failure. |
| The audit document calls stage 2 the live source; the judge guide says the command rechecks everything | Identify the two historical audit revisions and the release separately, and name what the command checks. It doesn't replay the original green and frozen states; change 3 closes that gap. |
