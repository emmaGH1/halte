# 10x agreement: Claude and Astra (Codex gpt-6.2-astra), 23 Nov 2026

The argument is in `10x-claude.md`, `10x-astra.md` and `10x-claude-round2.md`, with Astra's round 2 summarised below.

## How the disputes closed

- **D1 · custody:** a compromise. Browser-held owner keys become an optional path with a hard cap (≤ 8 h) and a phone gate: a fresh phone must complete issue → offer → report → recover with only public data and signatures leaving the device, or the path is dropped.
  - Astra verified that the SDK's key, signing and message-building functions are pure JS.
  - Diana's EVM RPC allows browser origins (`*`); its REST API doesn't (no CORS header, and broadcast preflight returns 501). So native reads and broadcast go through a same-origin adapter.
  - Recovery is the mnemonic (`deriveUnifiedAccount`), not a `QRC1` code.
  - The hosted demo stays the main path, disclosed beside its controls.
- **D2 · film:** Astra conceded. One cut on 25–26 Nov, after the counter and replay. On 24 Nov the narration is locked and fallback footage of the three block results is captured.
- **D3 · headline:** Astra conceded. The human's tagline stays. Loose wording goes: "nobody can buy it", "Sold by its owner".
- **Per-transaction window drawer:** Claude conceded. Show one verified hybrid window receipt where it explains a result, not one per transaction.
- **Runtime-bytecode check:** agreed in Astra's form. A fresh compile of `d374a16` is compared with `eth_getCode`, not with a hash copied from the chain.

## The plan

| # | priority | deliverable | hours |
|---:|---|---|---:|
| 1 | MUST | 90 s voiced, captioned film; linked from the README and the form | 6 |
| 2 | MUST | Replay `acceptOffer(2)` at blocks 10611671 / 10611677 / 10611679 on the site and in `check-live.mjs`; archival failures labelled | 3 |
| 3 | MUST | Dealer counter `/check/<id>?offer=<n>` for phones + a printable passport card with a clean QR; status and simulation pinned to one block | 5 |
| 4 | MUST | Honesty fixes: window scoped to exactly Halte, expiry vs stale shown apart, "key status unavailable", custody disclosed beside the controls, "Copy public link" | 3 |
| 5 | MUST | One verified hybrid window receipt, the confirmed freeze and the 4,627-byte wrong-key refusal, each shown where it explains a result | 1 |
| 6 | MUST | Release-source QCAI (human), corrected audit history, reproducible source → runtime bytecode comparison | 2 |
| 7 | MUST | Logged-out phone walkthrough and a cold judge pass from the README | 2 |
| 8 | SHOULD | Optional browser-held owner key, ≤ 8 h, phone gate, else dropped | ≤ 8 |
| 9 | WON'T | CLI signer, per-transaction drawer, serial registry, staged failed transactions, extra sponsor modules, a new contract | 0 |

## Order through the freeze

| date (UTC) | finish line |
|---|---|
| 23 Nov | honesty fixes, wording, replay (done the same evening) |
| 24 Nov | QCAI run (human) · narration locked · fallback footage · counter started |
| 25 Nov | counter done and scanned from a logged-out phone · dealer shots · custody trial |
| 26 Nov | film cut and linked · custody trial closed at its cap · runtime comparison and audit manifest |
| 27 Nov | fresh reviewer follows only the README: can they explain why the recovered passport is active while offer #2 still fails? |
| 28 Nov | fix walkthrough blockers · recheck QR, replay, captions, links |
| 29 Nov | rehearse the form, check the film logged out, record QCAI's actual status, buffer |
| 30 Nov 10:40 | freeze |
