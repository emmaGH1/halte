# Halte film draft

A silent, captioned draft for the QoreChain Build Before Q-Day Post-Quantum dApp track. The phone and desktop footage was recorded with Playwright against the live site on Diana, using Chromium headless and one demo mint. The live tour uses hosted demo keys; dealer checks are read-only simulations. The raw recordings and capture timing are in `raw/`. The transaction links are in `raw/tx-links.json`; the last link captured in the desktop pass is the recovery transaction, not the freeze. The known freeze transaction from the release run is linked in the project README.

The edit is assembled by `python3 film/render.py`, using `/data/home/.local/bin/ffmpeg`. It retains a silent stereo AAC track. `captions.srt` is the narration transcript; `captions.ass` supplies the burned-in styling. `SCRIPT.md` maps every line to a shot. All footage is from the live site, not a mockup. The time-stretched footage makes the transaction results readable; the captions are the intended voiceover.

To replace the silent track with a voiceover, record narration against `SCRIPT.md`, then run:

```sh
ffmpeg -i film/halte-draft.mp4 -i voiceover.wav -map 0:v -map 1:a -c:v copy -c:a aac -af apad -t 168 -movflags +faststart film/halte-voiced.mp4
```

The burned captions remain in the picture. Adjust the voice recording to the timecodes before replacing the track.

## Timeline

| Time | Picture and purpose |
|---|---|
| 00:00–00:12 | Title and problem |
| 00:12–00:23 | Desktop home, product |
| 00:23–00:35 | Guided tour and issuance |
| 00:35–00:47 | Offer and successful dealer check |
| 00:47–00:59 | Report missing |
| 00:59–01:11 | Frozen refusal |
| 01:11–01:23 | Recovery and stale offer |
| 01:23–01:36 | Classical-key thief attempt |
| 01:36–01:48 | Q-Day explanation |
| 01:48–02:01 | Signature verification |
| 02:01–02:13 | On-chain proof, audit and tests |
| 02:13–02:25 | Live API check |
| 02:25–02:37 | Dealer counter |
| 02:37–02:48 | End card |
