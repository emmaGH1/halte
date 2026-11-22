# brief: Build Before Q-Day — The QoreChain Developer Fest

> sources and full quotes: `docs/research/qorechain.md` (gpt research, 22 nov 2026)

## facts

- event page: https://build.qorechain.io/ · rules: https://build.qorechain.io/rules · prizes: https://build.qorechain.io/prizes · faq/rubric: https://build.qorechain.io/faq
- window: 4 nov 2026 (UTC, hour unpublished) → **2 dec 2026 23:59 UTC = 3 dec 00:59 WAT**
- time left at triage (22 nov ~16:30 WAT): **~10.3 days of a 28-day window** (clock already ~63% gone) · plan size: **one journey, no lanes, voiced film**
- after deadline: checks 3–5 dec · jury + people's choice 6–15 dec · live demo + winners 16 dec · payouts 17–22 dec
- last workshop: **27 nov 16:30 UTC (17:30 WAT)**: protocol + submission clinic
- judges: no named jury. Workshops are hosted by Phil, with Liviu Epure (QoreChain founder)
- paid prize slots: 61 in total, $20k in stablecoin. One project enters one category and can also win special awards

## disqualifiers (each needs evidence before submitting)

- [ ] every teammate is 18+ and registered with GitHub, X and a QoreX testnet address · evidence:
- [ ] original work, commits from 4 nov 2026 onward; reused kits and templates credited in the readme · evidence:
- [ ] built on QoreChain **testnet (Diana)**; real `qor1…` addresses listed on the form · evidence:
- [ ] public GitHub repo, not used by another project, with a readme and an MIT or Apache-2.0 license file · evidence:
- [ ] demo video **≤ 3 min** showing the working project (no host rule published; YouTube is used) · evidence:
- [ ] featured image (auto-generated if none is uploaded; 16:9, ≥1200×675) · evidence:
- [ ] project saved complete before the cutoff. **There is no submit button: the project goes read-only at the deadline** · evidence:
- [ ] category requirements met (see the prize map) · evidence:
- [ ] for the AI-native award: tick the box on the form and add `AI_USAGE.md` · evidence:

## judging (word for word from the event)

| criterion | weight | what a judge must see |
|---|---:|---|
| "Works as described" | 25% | the journey runs, as the video shows |
| "QoreChain tech usage, verified in the repo and on chain" | 25% | sdk in the repo's dependencies + transactions from the listed addresses |
| "Post-quantum correctness and security" | 20% | ML-DSA key registered, scoped window, `pqcVerify` / `pqc_hybrid_verify` events |
| "Originality" | 15% | |
| "Clarity, UX and documentation" | 15% | readme, ux |

tie-breaks: none published for general scoring (the drill used the threat model). Finalists may get a change request and have 48h to reply.
special awards we can go for: Regional (Middle East & Africa, $200; Nigeria counts as MEA) · Top-Quality (up to 7 × $250, needs a score ≥70 and no other prize) · Best AI-Native Build ($500) · People's Choice ($500/$300/$200, a QoreX mainnet vote). Q-Day Survivor is closed (drill was 18 nov). Quantum Campus only if the whole team is enrolled students.

### prize map (categories, pick one)

| category | prizes | team | must show |
|---|---|---|---|
| Quantum Pass | 10×$150 by score + 20×$50 raffle | 1–2 | create-qorechain-dapp, connect QoreX, deploy, one hybrid-signed tx |
| Post-Quantum dApp | $1500 / $750 / $500 | 1–3 | EVM dApp guarding sensitive actions: scoped window, `pqcVerify`, **two-stage QCAI audit PDFs + docs/AUDIT.md**, Foundry/Hardhat tests |
| **Post-Quantum AI Agents** | $1500 / $750 | 1–4 | autonomous agent with on-chain spending and access enforcement: scoped EVM window (tx count, value, duration, target bounds), smart-account spending rules, authenticated messaging, real on-chain agent activity |
| Encrypted Apps | $1500 / $750 | 1–4 | ML-KEM-1024 (QoreSeal), registered recipient keys, ML-DSA key binding, encryption and decryption on the client |
| Cross-VM | TBA | 1–4 | an EVM contract that atomically calls an approved Native contract on Diana |
| Protocol Builders | $3000 / $1500 | 2–4 | rollup/sidechain, ML-DSA batches, watchtower, threat model |

## what the sponsor wants more of

QoreChain wants apps that prove on Diana that its post-quantum signatures, encryption or enforced permissions protect a real operation. (inferred: QoreChain use + PQ correctness make up 45% of the score, and every track asks for on-chain proof.)

## the bar

No past edition. Current gallery: Leashed (agent controls, a direct rival in the AI Agents track), Darwin (PQC baskets), Unyoke (permission revocation, solo, Nigeria/MEA), Agama (sealed credit docs), Cista (encrypted payroll), QoreRollup. To win, an entry needs: verified integrations on its project page, real tx hashes with `pqc_hybrid_verify status=verified`, a ≤3-min video, and a readme that maps each track requirement to evidence.

## hour-1 gate

- done (by gpt, read-only): EVM RPC `eth_chainId` = `0x2648` (9800), block 10,560,878; consensus `/status` ok; fUSD `decimals()` = 6. **The chain is reachable.**
- blocked: the faucet needs a dashboard sign-in; registration needs GitHub + X + QoreX, **which only the human can do**. Still untested: funding, ML-DSA key registration, opening the window, deploying.
- next gate (the human, ~20 min): register on build.qorechain.io → install QoreX (Chrome) on a throwaway testnet account → sign in to the dashboard faucet → paste the `qor1…` address. Then the agent runs `create-qorechain-dapp@0.14.0 --template hardhat`, `window register`, `window open`, `deploy:testnet`.

- **22 nov update:** human registered + funded. Testnet address `qor1zt0xa44z97g2t9t3m0q9gqghut63zkckuz5r6w` holds 99.82 QOR, 1,000 fUSD, 0.5 fETH and 0.02 fBTC (read live from the REST balances route). Still to do: register the ML-DSA key, open a window, deploy.

## the organizer (for idea fit)

QoreChain Association is a Swiss foundation in Rolle, Vaud (CHE-484.963.998, registered 19 nov 2025). Its 8-member council is Swiss, UK, French and Romanian; founder Liviu Epure. Development began in 2017 as a digital asset security platform, then pivoted to post-quantum and AI-native in 2023–24. Its pitch targets enterprises and institutions: "long-horizon, security-sensitive workloads", plus "regulatory credibility for institutional adoption". The site comes in FR/DE/TR/RO/ES/AR/IT/KO/JA, and there's a Türkiye regional award. Source: https://www.qorechain.io/

## triage score

fit **5/6** (slots 2 · sponsor reachable: partly, 1 · lane edge 1 · rewards a working product 1)
biggest risk: the PQ key + scoped window + authenticator flow is untested, and it needs the human's sign-ins first
clashes: the upcoming calendar is empty
human's decision: **enter** (22 nov 2026)
