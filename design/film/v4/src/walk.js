/* ---------- walkthrough ---------- */
const SEGS = /*SEGS*/[];
const CURSOR = /*CURSOR*/{};
const ALLW = /*ALLWORDS*/[];
const TW = i => ALLW[i].start + OFF;
const ARROW_SVG = '<svg class="ar" viewBox="0 0 32 32"><path d="M5 3 L5 25.5 L10.6 20.2 L14.4 28.6 L18 27 L14.3 18.8 L22 18.8 Z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
const HAND_SVG = '<svg class="hd" viewBox="0 0 32 32"><path d="M11.2 15.5 V5.2 c0-1.3 1-2.3 2.2-2.3 s2.2 1 2.2 2.3 v8.1 c0-1.2 1-2.1 2.1-2.1 s2.1.9 2.1 2.1 v1 c0-1.1.9-2 2-2 s2 .9 2 2 v1.3 c0-1 .9-1.8 1.9-1.8 s1.9.8 1.9 1.8 v6.6 c0 4.3-3.1 7.9-7.6 7.9 h-2.6 c-2.6 0-4.4-1.2-5.8-3.3 L6.2 19.6 c-.6-.9-.4-2.1.5-2.7 .9-.6 2.1-.4 2.8.5 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.6 13.3 V18 M19.8 14.4 V18 M23.8 15.7 V18.4" stroke="#111" stroke-width="1.3" stroke-linecap="round"/></svg>';
const MV = CURSOR.moves, DN = CURSOR.downs.map(d => d[0]);
function cursorAt(m) { // linear interpolation over the logged pointer path
  if (m <= MV[0][0]) return [MV[0][1], MV[0][2]];
  let lo = 0, hi = MV.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (MV[mid][0] <= m) lo = mid; else hi = mid; }
  const a = MV[lo], b = MV[hi]; if (m >= b[0]) return [b[1], b[2]];
  const k = (m - a[0]) / Math.max(1e-6, b[0] - a[0]); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
const ease = x => (x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
function zoomAt(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const a = keys[i - 1], b = keys[i], k = ease((t - a[0]) / Math.max(1e-6, b[0] - a[0]));
    return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
  }
  return keys[keys.length - 1].slice(1);
}
SEGS.forEach(sg => {
  const W = document.getElementById(sg.id + "W"), K = document.getElementById(sg.id + "K");
  K.innerHTML = ARROW_SVG + HAND_SVG;
  const ar = K.querySelector(".ar"), hd = K.querySelector(".hd");
  const P = { t: sg.fs };
  const draw = () => {
    const t = P.t, [s, cx, cy] = zoomAt(sg.keys, t);
    let x = 960 - cx * s, y = 540 - cy * s;
    x = Math.min(0, Math.max(1920 - 1920 * s, x)); y = Math.min(0, Math.max(1080 - 1080 * s, y));
    W.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    const m = sg.ms + (t - sg.fs), [px, py] = cursorAt(m);
    const hand = DN.some(d => m > d - .45 && m < d + .3);
    const press = DN.some(d => m >= d && m < d + .12);
    ar.style.opacity = hand ? 0 : 1; hd.style.opacity = hand ? 1 : 0;
    const tipx = hand ? 27 : 10, tipy = hand ? 6 : 6;
    K.style.transform = `translate(${px * s + x - tipx}px, ${py * s + y - tipy}px) scale(${press ? .86 : 1})`;
  };
  tl.fromTo(P, { t: sg.fs }, { t: sg.fe, duration: sg.fe - sg.fs, ease: "none", onUpdate: draw, immediateRender: false }, sg.fs);
});

/* ---------- Q-Day ---------- */
document.getElementById("qKey").innerHTML = spriteSVG("key", 14);
tl.set("#qKey", { x: 848, y: 90 }, 0);
tl.fromTo("#qBig", { opacity: 0, scale: 1.2, filter: "blur(16px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: .35, ease: "expo.out" }, 69.9);
tl.fromTo("#qSub", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .3, ease: "expo.out" }, TW(181) - .1);
tl.fromTo("#qKey", { opacity: 0, y: 40 }, { opacity: 1, y: 90, duration: .35, ease: "back.out(1.6)" }, 70.1);
(function shatter() {
  const g = SPRITES.key, host = document.getElementById("qPx"); let h = "", n = 0; const cells = [];
  g.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch !== ".") { h += `<div class="px" id="qp${n}" style="left:${848 + xx * 14}px;top:${90 + yy * 14}px;background:${PAL[ch]}"></div>`; cells.push([n, xx, yy]); n++; } }));
  host.innerHTML = h;
  tl.set("#qPx .px", { opacity: 0 }, 0);
  const tc = TW(183) + .05;
  tl.set("#qKey", { opacity: 0 }, tc);
  cells.forEach(([i, xx, yy]) => {
    const a = Math.atan2(yy - 8, xx - 8) + (hash(i, 3) - .5), r = 260 + hash(i, 7) * 520;
    tl.fromTo("#qp" + i, { opacity: 1, x: 0, y: 0, rotation: 0 }, { opacity: 0, x: Math.cos(a) * r, y: Math.sin(a) * r + 160, rotation: (hash(i, 5) - .5) * 300, duration: 1.1 + hash(i, 2) * .5, ease: "expo.out" }, tc);
  });
  tl.to("#qPx .px", { background: "#FF4526", duration: .15 }, tc + .15);
})();

/* ---------- proof ---------- */
tl.fromTo("#proofW", { scale: 1.7, x: 960 - 780 * 1.7, y: 540 - 300 * 1.7 }, { scale: 1.9, x: 960 - 760 * 1.9, y: 540 - 290 * 1.9, duration: 6.3, ease: "power1.inOut" }, 98.0);
tl.fromTo("#sP img", { opacity: 0 }, { opacity: 1, duration: .25 }, 98.0);

/* ---------- end card ---------- */
(function mark2() { const s = document.getElementById("endMark"); let h = "";
  for (let y = 5; y < 150; y += 10) for (let x = 5; x < 150; x += 10) { const d = Math.hypot(x - 75, y - 75); if (d > 72) continue;
    const on = Math.abs(d - 64) < 6 || (Math.abs(x - 75) < 4 && y < 75 && y > 20) || (Math.abs(y - 75) < 4 && x > 75 && x < 112);
    h += `<circle class="em" cx="${x}" cy="${y}" r="${on ? 4 : 2}" fill="${on ? "#F3F1EC" : "rgba(243,241,236,.16)"}"/>`; }
  s.innerHTML = h; })();
tl.fromTo("#endMark .em", { opacity: 0, scale: 0, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: .25, ease: "back.out(2)", stagger: { each: .0012, from: "center" } }, TW(260) - .15);
tl.fromTo("#endLogo b", { opacity: 0, x: -30, filter: "blur(8px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: .4, ease: "expo.out" }, TW(260));
tl.fromTo("#endT", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .45, ease: "expo.out" }, TW(261) - .05);
tl.fromTo("#endU", { opacity: 0 }, { opacity: 1, duration: .5 }, TW(263) + .5);
tl.fromTo("#endM", { opacity: 0 }, { opacity: 1, duration: .5 }, TW(263) + 1.0);

/* ---------- captions for the walkthrough ---------- */
(function caps() {
  const KEY2 = { 87: "k", 93: "k", 105: "g", 131: "k", 147: "k", 171: "k", 177: "k", 183: "k", 196: "k", 204: "k", 235: "k", 240: "k", 247: "k" };
  const SHOW2 = {}; ALLW.forEach((w, i) => { if (/^Halt[.]?$/.test(w.text)) SHOW2[i] = w.text.replace("Halt", "Halte"); });
  const host = document.getElementById("caps2"); const groups = []; let cur = [];
  for (let i = 75; i < 260; i++) { cur.push(i); const t = ALLW[i].text, nx = ALLW[i + 1];
    if (/[.?!]$/.test(t) || (/,$/.test(t) && cur.length >= 3) || cur.length >= 7 || !nx || nx.start - ALLW[i].end > .3) { groups.push(cur); cur = []; } }
  if (cur.length) groups.push(cur);
  host.innerHTML = groups.map((g, n) => `<div class="cg2" id="cq${n}"><i>` + g.map(i => `<span class="${KEY2[i] || ""}">${SHOW2[i] || ALLW[i].text}</span>`).join(" ") + `</i></div>`).join("");
  groups.forEach((g, n) => {
    const last = g[g.length - 1];
    const s = TW(g[0]) - .08, e = Math.min(TW(last) + (ALLW[last].end - ALLW[last].start) + .25, groups[n + 1] ? TW(groups[n + 1][0]) - .1 : 104.2);
    tl.fromTo("#cq" + n, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .12, ease: "power2.out" }, s);
    tl.to("#cq" + n, { opacity: 0, duration: .08 }, e - .08);
    tl.set("#cq" + n, { opacity: 0 }, e);
  });
})();

/* lift captions to the top while the result rows sit at the bottom of the page */
tl.set("#caps2", { y: 0 }, 0);
[[TW(196) + .1, 80.0], [TW(208) + .9, 85.5]].forEach(([a, b]) => { tl.set("#caps2", { y: -890 }, a); tl.set("#caps2", { y: 0 }, b); });
