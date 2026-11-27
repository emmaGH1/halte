"""Builds index.html for the Halte film v3: timings come from the narration's word timestamps."""
import json, pathlib

HERE = pathlib.Path(__file__).parent
W = json.load(open(HERE / "assets/audio/words.json"))
OFF = 0.8
END = 110.0
T = lambda i: round(W[i]["start"] + OFF, 3)

# sound cues: (file, film time, volume)
SFX = [
    ("tick", 0.4, .35), ("tick", 1.4, .3), ("tick", 2.4, .3),
    ("swoosh", T(14) - .25, .5), ("type", T(15), .35),
    ("swoosh2", T(27) - .3, .45),
    ("tap", T(44), .55), ("tap", T(54), .55),
    ("swoosh", T(58) - .3, .45), ("glitch", T(70) - .05, .5),
    ("reveal", T(71) - .2, .7),
    ("swoosh2", T(75) - .3, .45), ("tap2", T(87), .5), ("tap2", T(93), .5),
    ("swoosh", T(95) - .3, .45), ("tap", T(100) + .1, .7), ("ok", T(105) - .1, .6),
    ("swoosh2", T(114) - .3, .45), ("tap", T(122), .7), ("tap2", T(131) - .15, .45),
    ("swoosh", T(138) - .3, .4), ("tap", T(143) + .05, .7), ("no", T(145) - .1, .65),
    ("swoosh2", T(148) - .3, .45), ("tap2", T(155), .5), ("tap", T(175), .7), ("no", T(177) - .1, .6),
    ("swoosh", T(178) - .3, .45), ("glitch", T(185) + .1, .55), ("tap", T(190), .6), ("no", T(196) - .05, .6),
    ("tap2", T(198), .4), ("tap2", T(208), .4), ("tap2", T(212), .4),
    ("swoosh2", T(215) - .3, .45), ("type", T(234), .35), ("tap2", T(238), .45),
    ("swoosh", T(241) - .3, .45), ("ok", T(259) - .2, .45),
    ("reveal", T(260) - .3, .6),
]
# music: the generated track laid in pieces (start, media start, duration, fade in, fade out, volume)
FREEZE = T(131)          # "freezes"
BACK = T(145)            # "Do not buy"
MUSIC = [
    (0.0, 0.0, FREEZE + .15, 0, .35, .30),
    (BACK, 30.0, 84.6 - BACK, .8, 1.2, .26),
    (84.4, 86.0, END - 84.4, 1.0, 2.0, .42),
]

audio = []
audio.append(f'<audio id="vo" class="clip" src="assets/audio/vo.mp3" data-start="{OFF}" data-duration="{round(W[-1]["end"] + .6, 2)}" data-track-index="40" data-volume="1"></audio>')
for n, (s, ms, d, fi, fo, v) in enumerate(MUSIC):
    audio.append(f'<audio id="mu{n}" class="clip" src="assets/audio/music.mp3" data-start="{round(s,2)}" data-media-start="{ms}" data-duration="{round(d,2)}" data-track-index="{41+n}" data-volume="{v}" data-fade-in="{fi}" data-fade-out="{fo}"></audio>')
DUR = {"glitch": .62, "no": 1.04, "ok": 1.22, "reveal": 2.5, "swoosh2": .73, "swoosh": .83, "tap2": .52, "tap": .52, "tick": .62, "type": 1.22}
for n, (f, t, v) in enumerate(SFX):
    audio.append(f'<audio id="sx{n}" class="clip" src="assets/sfx/{f}.mp3" data-start="{round(t,2)}" data-duration="{DUR[f]}" data-track-index="{50+n}" data-volume="{v}"></audio>')

import re
html = (HERE / "src/template.html").read_text()
html = re.sub(r"\{\{([^}]+)\}\}", lambda m: str(round(eval(m.group(1), {"T": T, "END": END}), 3)), html)
html = html.replace("/*WORDS*/[]", json.dumps(W)).replace("<!--AUDIO-->", "\n  ".join(audio)).replace("@END@", str(END)).replace("@OFF@", str(OFF))
(HERE / "index.html").write_text(html)
print("ok", len(SFX), "sfx", "freeze", FREEZE, "back", BACK)
