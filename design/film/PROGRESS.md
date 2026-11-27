# Halte demo film: how we got there (2026-11-27)

Final cut: `design/film/v4/` (HyperFrames project; `build_film.py` builds `index.html`). 1:49, 1920×1080. Approved by the founder.

## What worked
- **Real app, not rebuilt UI.** A Playwright recorder (`v4/capture/capture-live.mjs`) drives the live site at 2x via the Chrome screencast and logs every mouse move and click. HyperFrames then draws a macOS cursor on that real path at constant size over a camera that pushes in, and lands each click on a spoken word.
- **Problem first, in a founder voice.** The final script (`SCRIPT-v5.md`) states how things work today (registers are late, out of date, per country; paperwork can be faked), then "So we built Halte", then the demo. Written by GPT (Astra) after four rejected drafts.
- **Intro in the style of a reference the founder supplied:** kinetic words on beat, pixel objects, light and dark scenes flipping on the music beat (`hyperframes beats`), a red pen circle, F·A·K·E letters.
- **Music the founder chose** (Dagored, Harlem Heat, freetouse.com), ducked under the voice and lifted at the logo and end card. Generated music (ElevenLabs Music) was rejected three times.
- **Voice:** Orta (ElevenLabs shared voice `hQ7mq3ma5HTMOsUI8WIP`), `eleven_multilingual_v2`. "Halte" is spelled "Halt" in the text so it's said as one syllable. Word timestamps from the API drive captions and cues.

## What the founder rejected, in order (don't repeat)
1. A film built without them. Never start or render the film before they approve a storyboard.
2. Rebuilt UI cards ("looks like AI slop"), generic air whooshes, generated music, a first-person-story or hypothetical script, an iPhone comparison, and a weak intro.
3. Their own cloned voice (accent), then a male narrator; they wanted a young female narrator.

## Product fixes the film exposed
- Passport page was a tiny mono log on desktop: redesigned (certificate left, big verdict right, timeline below).
- "view tx" links landed on "not found" on QoreChain's explorer (it defaults to mainnet and doesn't index our EVM hashes). Now `/tx/<hash>` on Halte resolves the transaction through Diana's indexed event.
- Both shipped with the journey check green (`evidence/status/`).

## Tooling notes
- HyperFrames CLI pinned 0.9.102. Use `npm_config_cache=/data/home/.cache/npm`.
- Renders need free disk. This VM's /data runs near full: render with `--workers 1`, and clear `/tmp/hyperframes-extract-cache-*` first. Three workers need ~2.7 GB of temp frames.
- Send phone-friendly video as a compressed 720p on a private Artifact page; a 55 MB file streams badly for the founder.
- `ffmpeg` has no `drawtext`; use ASS captions (`ass` filter) or HyperFrames.
- ElevenLabs Music rejects brand names in prompts ("Apple keynote") as copyrighted.

## Files
- Script: `SCRIPT-v5.md`. Audio and timing: `v4/assets/audio/` (voice and music files are not committed).
- Intro and walkthrough sources: `v4/src/`, build scripts `v4/build.py` (intro only) and `v4/build_film.py` (full film).
- Earlier attempts kept for reference: `v2/`, `v3/`, `motion-test/`.
