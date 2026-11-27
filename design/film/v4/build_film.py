"""Builds index.html for the full Halte film v4: the intro, then the real walkthrough timed to the narration."""
import json, pathlib, re

HERE = pathlib.Path(__file__).parent
W = json.load(open(HERE / "assets/audio/words.json"))
BEATS = json.load(open(HERE / "assets/audio/beats.json"))["beatTimes"]
CUR = json.load(open(HERE / "assets/audio/cursor.json"))
OFF = 1.365
END = 109.0
T = lambda i: round(W[i]["start"] + OFF, 3)
B = lambda n: BEATS[n]
ctx = {"T": T, "B": B, "END": END, "OFF": OFF, "W_END": W[-1]["end"] + OFF}

DEAL = (1.6, 1320, 430)          # framing on the dealer verdict and its buttons
CERT = (1.4, 640, 500)
STAT = (1.85, 600, 460)          # the passport status chip
k = lambda t, z: (round(t, 3),) + z

# (id, film start, film end, media start, zoom keys [(t, scale, cx, cy)])
SEGS = [
    ("w1", B(70), T(95) - .25, 53.5, [k(B(70), (1.0, 960, 540)), k(B(70) + 1.2, (1.0, 960, 540)), k(T(82), CERT), k(T(92) - .2, CERT), k(T(93) + .1, (2.0, 520, 545)), k(T(95), (2.05, 520, 545))]),
    ("w2", T(95) - .25, 44.0, None, [k(T(95) - .25, (1.0, 960, 540)), k(T(95) + .5, DEAL), k(44.0, (1.65, 1320, 430))]),
    ("w3", 44.0, 54.0, None, [k(44.0, DEAL), k(T(125), DEAL), k(T(131) - .3, STAT), k(54.0, (1.9, 600, 460))]),
    ("w4", 54.0, 57.9, None, [k(54.0, DEAL), k(57.9, (1.66, 1320, 430))]),
    ("w5", 57.9, 60.6, None, [k(57.9, DEAL), k(60.6, DEAL)]),
    ("w5b", 60.6, 66.6, 115.3, [k(60.6, STAT), k(T(163) - .2, STAT), k(T(165), DEAL), k(66.6, DEAL)]),
    ("w6", 66.6, 69.85, None, [k(66.6, DEAL), k(69.85, (1.7, 1320, 410))]),
    ("w8", 72.9, 80.0, None, [k(72.9, (1.0, 960, 540)), k(73.6, (1.6, 1250, 300)), k(T(196) - .4, (1.6, 1250, 300)), k(T(196) + .15, (1.5, 700, 880)), k(80.0, (1.55, 700, 880))]),
    ("w9", 80.0, 85.5, None, [k(80.0, (1.5, 1300, 330)), k(T(208) + .3, (1.5, 1300, 330)), k(T(208) + 1.0, (1.5, 700, 950)), k(85.5, (1.55, 700, 950))]),
    ("w10", 85.5, 88.9, 160.8, [k(85.5, (1.3, 800, 420)), k(88.9, (1.45, 800, 380))]),
    ("w11", 88.9, 92.6, 9.6, [k(88.9, (1.0, 960, 540)), k(89.6, (1.5, 1300, 560)), k(92.6, (1.5, 1300, 560))]),
    ("w11b", 92.6, 93.6, None, [k(92.6, (1.5, 1300, 560)), k(93.6, (1.5, 1300, 560))]),
    ("w11c", 93.6, 98.0, 24.85, [k(93.6, (1.5, 1300, 560)), k(T(238), (1.5, 1300, 560)), k(T(239) + .2, (1.75, 1150, 780)), k(98.0, (1.8, 1150, 780))]),
]
# clicks to land on spoken words: media click time -> film time
ALIGN = {"w2": (77.79, T(100) + .05), "w3": (88.89, T(116)), "w4": (99.82, T(143)), "w5": (107.59, T(155) - .3),
         "w6": (126.22, T(175)), "w8": (142.73, T(190)), "w9": (149.68, T(208)), "w11b": (21.79, T(234))}
segs = []
for sid, fs, fe, ms, keys in SEGS:
    if ms is None:
        mc, fc = ALIGN[sid]; ms = mc - (fc - fs)
    segs.append({"id": sid, "fs": round(fs, 3), "fe": round(fe, 3), "ms": round(ms, 3), "keys": keys})

clicks = []
for s in segs:
    for d in CUR["downs"]:
        ft = s["fs"] + d[0] - s["ms"]
        if s["fs"] <= ft < s["fe"]: clicks.append(round(ft, 3))

walk_html = []
for n, s in enumerate(segs):
    dur = round(s["fe"] - s["fs"] + .04, 3)
    walk_html.append(f'<div class="vw" id="{s["id"]}W"><video id="{s["id"]}" class="clip" src="assets/video/live.mp4" muted playsinline data-start="{s["fs"]}" data-media-start="{s["ms"]}" data-duration="{dur}" data-track-index="{30 + n}"></video></div>')
    walk_html.append(f'<div id="{s["id"]}C" class="clip curL" data-start="{s["fs"]}" data-duration="{dur}" data-track-index="{50 + n}"><div class="mcur" id="{s["id"]}K"></div></div>')
for n, t in enumerate(clicks):
    walk_html.append(f'<audio id="ck{n}" class="clip" src="assets/sfx/tap.mp3" data-start="{round(t + .02, 3)}" data-duration="0.5" data-track-index="{70 + n}" data-volume="0.55"></audio>')

html = (HERE / "src/intro.html").read_text()
walk_css = (HERE / "src/walk.css").read_text()
walk_body = (HERE / "src/walk.html").read_text()
walk_js = (HERE / "src/walk.js").read_text()
# drop the intro's own hand-off clip and its 31 s ending; the walkthrough takes over at B(70)
html = re.sub(r'<div id="liveW".*?</div>\n', "", html, flags=re.S)
html = html.replace('tl.fromTo("#liveW", { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: "expo.out" }, {{B(70)}});', "")
html = html.replace("</style>", walk_css + "\n</style>")
html = html.replace("  <audio id=\"music0\"", walk_body + "\n" + "\n".join(walk_html) + "\n  <audio id=\"music0\"")
html = html.replace("window.__timelines[\"main\"] = tl;", walk_js + "\nwindow.__timelines[\"main\"] = tl;")
html = html.replace('data-duration="{{END-T(74)-0.4}}" data-track-index="23" data-volume="0.65" data-fade-out="1.5"', 'data-duration="{{B(70)+0.5-T(74)-0.4}}" data-track-index="23" data-volume="0.62" data-fade-out="0.4"')
html = html.replace('data-duration="{{T(74)-OFF+0.9}}" data-track-index="21" data-volume="1" data-fade-out="0.2"', 'data-duration="{{W_END-OFF+0.6}}" data-track-index="21" data-volume="1"')
html = html.replace('<audio id="vo"', '<audio id="music3" class="clip" src="assets/audio/harlem-heat.mp3" data-start="{{B(70)+0.5}}" data-media-start="{{B(70)+0.5}}" data-duration="{{104.3-B(70)-0.5}}" data-track-index="24" data-volume="0.2" data-fade-in="0.4"></audio>\n  <audio id="music4" class="clip" src="assets/audio/harlem-heat.mp3" data-start="104.3" data-media-start="104.3" data-duration="{{END-104.4}}" data-track-index="25" data-volume="0.6" data-fade-in="0.3" data-fade-out="2.0"></audio>\n  <audio id="vo"')
html = re.sub(r"\{\{([^}]+)\}\}", lambda m: str(round(eval(m.group(1), ctx), 3)), html)
html = (html.replace("/*WORDS*/[]", json.dumps(W[:80])).replace("/*ALLWORDS*/[]", json.dumps(W)).replace("/*SPRITES*/", (HERE / "src/sprites.js").read_text())
        .replace("/*SEGS*/[]", json.dumps(segs)).replace("/*CURSOR*/{}", json.dumps(CUR)))
(HERE / "index.html").write_text(html)
print("ok", len(segs), "segments", len(clicks), "clicks")
