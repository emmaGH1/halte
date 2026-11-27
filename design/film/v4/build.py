"""Builds index.html for the Halte film v4 intro. Times come from the narration words and the beat grid."""
import json, pathlib, re

HERE = pathlib.Path(__file__).parent
W = json.load(open(HERE / "assets/audio/words.json"))
BEATS = json.load(open(HERE / "assets/audio/beats.json"))["beatTimes"]
OFF = 1.365            # the voice's first word lands on beat 3
END = 31.0
T = lambda i: round(W[i]["start"] + OFF, 3)
B = lambda n: BEATS[n]
ctx = {"T": T, "B": B, "END": END, "OFF": OFF}

html = (HERE / "src/intro.html").read_text()
html = re.sub(r"\{\{([^}]+)\}\}", lambda m: str(round(eval(m.group(1), ctx), 3)), html)
html = html.replace("/*WORDS*/[]", json.dumps(W[:80])).replace("/*SPRITES*/", (HERE / "src/sprites.js").read_text())
(HERE / "index.html").write_text(html)
print("ok")
