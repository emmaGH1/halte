// Halte line art: the calibre drawing, the held-time mark, the seal and guilloché.
// Pure string builders (deterministic, no DOM), shared by server and client components.

export const RED = "#C8281C";
const f = (n: number) => n.toFixed(1);
const P = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)];
const rad = (d: number) => ((d - 90) * Math.PI) / 180; // 0° = 12 o'clock

function gear(cx: number, cy: number, r: number, teeth: number, depth = 4) {
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const rr = i % 2 ? r : r + depth;
    const [x1, y1] = P(rr, (i * Math.PI) / teeth);
    const [x2, y2] = P(rr, ((i + 1) * Math.PI) / teeth);
    d += `${i ? "L" : "M"}${f(cx + x1)} ${f(cy + y1)}L${f(cx + x2)} ${f(cy + y2)}`;
  }
  return d + "Z";
}
function spiral(cx: number, cy: number, r0: number, r1: number, turns: number) {
  let d = "";
  const n = turns * 48;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * turns * 2 * Math.PI, r = r0 + (r1 - r0) * t;
    d += `${i ? "L" : "M"}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  }
  return d;
}
const screw = (cx: number, cy: number, r: number, rot: number) => {
  const [x, y] = P(r * 0.85, (rot * Math.PI) / 180);
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" class="l1"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.62)}" class="l0"/><line x1="${f(cx - x)}" y1="${f(cy - y)}" x2="${f(cx + x)}" y2="${f(cy + y)}" class="l2"/>`;
};
const jewel = (cx: number, cy: number) =>
  `<circle cx="${f(cx)}" cy="${f(cy)}" r="6" class="l1"/><circle cx="${f(cx)}" cy="${f(cy)}" r="2.6" class="jw"/>`;

export type Geometry = { cx: number; cy: number; R: number };

/**
 * The calibre drawing. Classes: .l0–.l3 line weights (ink), .ft faint construction, .acc accent.
 * Animated groups: .balance (oscillates), .escape (ticks), .lever (swings in on stop), .flash.
 */
export function movement({ cx, cy, R }: Geometry, uid = "m") {
  const o: string[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, c = "l1") =>
    o.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${c}"/>`);
  // construction
  o.push(`<line x1="${cx - R - 60}" y1="${cy}" x2="${cx + R + 60}" y2="${cy}" class="ft dash"/>`);
  o.push(`<line x1="${cx}" y1="${cy - R - 60}" x2="${cx}" y2="${cy + R + 60}" class="ft dash"/>`);
  [R * 1.08, R * 0.55].forEach((r) => o.push(`<circle cx="${cx}" cy="${cy}" r="${f(r)}" class="ft dot"/>`));
  // case, crown, lugs
  o.push(`<circle cx="${cx}" cy="${cy}" r="${R}" class="l3"/><circle cx="${cx}" cy="${cy}" r="${R - 10}" class="l0"/><circle cx="${cx}" cy="${cy}" r="${R - 26}" class="l2"/>`);
  o.push(`<rect x="${cx + R}" y="${cy - 14}" width="16" height="28" class="l2"/><rect x="${cx + R + 22}" y="${cy - 20}" width="22" height="40" rx="3" class="l2"/>`);
  for (let i = 0; i < 7; i++) line(cx + R + 25 + i * 3, cy - 20, cx + R + 25 + i * 3, cy + 20, "l0");
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = cx + sx * R * 0.52, y = cy + sy * R * 0.86;
    o.push(`<path d="M${f(x - sx * 24)} ${f(y)} L${f(x + sx * 6)} ${f(y + sy * R * 0.22)} L${f(x + sx * 40)} ${f(y + sy * R * 0.22)} L${f(x + sx * 34)} ${f(y - sy * 8)}" class="l2"/>`);
  }
  // bridges with Côtes de Genève hatching
  const b1 = `M${f(cx - R * 0.78)} ${f(cy - R * 0.2)} C ${f(cx - R * 0.7)} ${f(cy - R * 0.75)}, ${f(cx - R * 0.05)} ${f(cy - R * 0.82)}, ${f(cx + R * 0.32)} ${f(cy - R * 0.55)} L ${f(cx + R * 0.05)} ${f(cy - R * 0.05)} C ${f(cx - R * 0.2)} ${f(cy + R * 0.12)}, ${f(cx - R * 0.55)} ${f(cy + R * 0.1)}, ${f(cx - R * 0.78)} ${f(cy - R * 0.2)} Z`;
  const b2 = `M${f(cx + R * 0.12)} ${f(cy + R * 0.08)} L ${f(cx + R * 0.62)} ${f(cy - R * 0.18)} C ${f(cx + R * 0.78)} ${f(cy + R * 0.05)}, ${f(cx + R * 0.7)} ${f(cy + R * 0.45)}, ${f(cx + R * 0.45)} ${f(cy + R * 0.5)} L ${f(cx + R * 0.1)} ${f(cy + R * 0.35)} Z`;
  o.push(`<defs><clipPath id="${uid}b1"><path d="${b1}"/></clipPath><clipPath id="${uid}b2"><path d="${b2}"/></clipPath></defs>`);
  let h1 = "", h2 = "";
  for (let i = -30; i < 30; i++) h1 += `M${f(cx - R + i * 9)} ${cy - R}L${f(cx - R + i * 9 + R * 0.9)} ${cy + R}`;
  for (let i = -40; i < 40; i++) h2 += `M${f(cx - R + i * 7)} ${cy + R}L${f(cx - R + i * 7 + R * 0.7)} ${cy - R}`;
  o.push(`<path d="${h1}" class="ft" clip-path="url(#${uid}b1)"/><path d="${h2}" class="ft" clip-path="url(#${uid}b2)"/>`);
  o.push(`<path d="${b1}" class="l2"/><path d="${b2}" class="l2"/>`);
  // barrel
  const bx = cx - R * 0.42, by = cy - R * 0.36, br = R * 0.26;
  o.push(`<path d="${gear(bx, by, br, 72, 3.2)}" class="l1"/><circle cx="${f(bx)}" cy="${f(by)}" r="${f(br * 0.78)}" class="l0"/>`);
  o.push(`<path d="${spiral(bx, by, br * 0.16, br * 0.72, 6)}" class="ft"/><path d="${gear(bx, by, br * 0.3, 18, 4)}" class="l1"/>`);
  o.push(screw(bx, by, 8, 30));
  // going train
  const wheels: [number, number, number, number][] = [[cx, cy, R * 0.2, 60], [cx + R * 0.3, cy - R * 0.12, R * 0.13, 48], [cx + R * 0.18, cy + R * 0.22, R * 0.11, 42]];
  wheels.forEach(([x, y, r, n], i) => {
    o.push(`<g class="train t${i}" style="transform-origin:${f(x)}px ${f(y)}px"><path d="${gear(x, y, r, n, 2.6)}" class="l1"/>`);
    for (let k = 0; k < 5; k++) { const [a, b] = P(r * 0.82, (k * 2 * Math.PI) / 5 + i); line(x, y, x + a, y + b, "l0"); }
    o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.82)}" class="l0"/></g>${jewel(x, y)}`);
  });
  // escape wheel + pallet fork
  const ex = cx + R * 0.06, ey = cy + R * 0.46;
  let ed = "";
  for (let i = 0; i < 20; i++) {
    const a = (i * 2 * Math.PI) / 20;
    const [x1, y1] = P(R * 0.075, a), [x2, y2] = P(R * 0.11, a + 0.12), [x3, y3] = P(R * 0.075, a + 0.3);
    ed += `M${f(ex + x1)} ${f(ey + y1)} L${f(ex + x2)} ${f(ey + y2)} L${f(ex + x3)} ${f(ey + y3)}`;
  }
  o.push(`<g class="escape" style="transform-origin:${f(ex)}px ${f(ey)}px"><path d="${ed}" class="l1"/></g>${jewel(ex, ey)}`);
  o.push(`<path d="M${f(ex + R * 0.06)} ${f(ey - R * 0.1)} L${f(ex + R * 0.2)} ${f(ey + R * 0.02)} L${f(ex + R * 0.06)} ${f(ey + R * 0.14)} M${f(ex + R * 0.2)} ${f(ey + R * 0.02)} L${f(ex + R * 0.36)} ${f(ey + R * 0.08)}" class="l2"/>`);
  // balance wheel + hairspring (animated group)
  const lx = cx - R * 0.36, ly = cy + R * 0.42, lr = R * 0.22;
  o.push(`<g class="balance" style="transform-origin:${f(lx)}px ${f(ly)}px">`);
  o.push(`<circle cx="${f(lx)}" cy="${f(ly)}" r="${f(lr)}" class="l3"/><circle cx="${f(lx)}" cy="${f(ly)}" r="${f(lr - 5)}" class="l0"/>`);
  for (let k = 0; k < 3; k++) { const [a, b] = P(lr - 4, (k * 2 * Math.PI) / 3 + 0.4); line(lx, ly, lx + a, ly + b, "l2"); }
  for (let k = 0; k < 12; k++) { const [a, b] = P(lr + 2, (k * Math.PI) / 6); o.push(`<circle cx="${f(lx + a)}" cy="${f(ly + b)}" r="2.4" class="l0"/>`); }
  o.push(`<path d="${spiral(lx, ly, lr * 0.12, lr * 0.62, 7)}" class="l0"/></g>${jewel(lx, ly)}`);
  o.push(`<path d="M${f(lx - lr * 0.3)} ${f(ly - lr * 0.2)} L${f(lx - lr * 1.6)} ${f(ly + lr * 0.9)} L${f(lx - lr * 1.2)} ${f(ly + lr * 1.25)} L${f(lx + lr * 0.1)} ${f(ly + lr * 0.15)} Z" class="l2"/>`);
  o.push(screw(lx - lr * 1.32, ly + lr * 0.98, 7, -20));
  for (const [x, y, r] of [[cx - R * 0.62, cy - R * 0.5, 10], [cx + R * 0.12, cy - R * 0.6, 60], [cx - R * 0.12, cy - R * 0.02, -30], [cx + R * 0.55, cy + R * 0.3, 80], [cx + R * 0.52, cy - R * 0.08, 15]]) o.push(screw(x, y, 8, r));
  // the stop lever
  const tipX = lx + lr * 0.72, tipY = ly - lr * 0.72, pivX = cx + R * 0.38, pivY = cy + R * 0.7;
  o.push(`<g class="lever" style="transform-origin:${f(pivX)}px ${f(pivY)}px">`);
  o.push(`<path d="M${f(cx + R * 0.86)} ${f(cy + R * 0.08)} L${f(cx + R * 0.64)} ${f(cy + R * 0.5)} L${f(pivX)} ${f(pivY)} L${f(tipX + 10)} ${f(tipY + 16)} L${f(tipX)} ${f(tipY)}" class="acc lv"/>`);
  o.push(`<circle cx="${f(tipX)}" cy="${f(tipY)}" r="4.5" class="accf"/></g>`);
  o.push(`<circle cx="${f(pivX)}" cy="${f(pivY)}" r="6" class="acc pv"/>`);
  o.push(`<g class="flash">${[[-1, -0.4], [-0.2, -1], [0.6, -0.9]].map(([a, b]) => `<line x1="${f(tipX + a * 10)}" y1="${f(tipY + b * 10)}" x2="${f(tipX + a * 20)}" y2="${f(tipY + b * 20)}" class="acc"/>`).join("")}</g>`);
  return { svg: o.join(""), tip: [tipX, tipY] as [number, number], pivot: [pivX, pivY] as [number, number] };
}

/** Mark 06 "held time": a dial whose red wedge is the time the watch has been held. */
export function heldMark({ stop = 84, ticks = 12, wedge = true }: { stop?: number; ticks?: number; wedge?: boolean } = {}) {
  const pt = (r: number, d: number) => P(r, rad(d)).map((n) => n.toFixed(2));
  const [sx, sy] = pt(80, stop);
  let t = "";
  for (let i = 0; i < ticks; i++) {
    const d = (i * 360) / ticks, major = ticks === 60 ? i % 5 === 0 : true;
    const [x1, y1] = pt(84, d), [x2, y2] = pt(major ? 95 : 91, d);
    t += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="${major ? (ticks === 60 ? 3.4 : 6) : 1.7}"/>`;
  }
  return `${wedge ? `<path class="wedge" d="M0 0 L0 -80 A80 80 0 ${stop > 180 ? 1 : 0} 1 ${sx} ${sy} Z"/>` : ""}${t}`;
}

/** Guilloché band: interfering sine waves. */
export function guillocheBand(w: number, h: number, lines = 22) {
  let out = "";
  for (let k = 0; k < lines; k++) {
    let d = "";
    for (let x = 0; x <= w; x += 4) {
      const y = h / 2 + Math.sin(x / 22 + k * 0.29) * (h * 0.4) * Math.cos(x / 97 + k * 0.05) + Math.sin(x / 9 + k) * 2;
      d += `${x ? "L" : "M"}${x} ${y.toFixed(1)}`;
    }
    out += `<path d="${d}"/>`;
  }
  return out;
}

/** Guilloché rosette centred on (0,0). */
export function rosette(r: number, amp: number, lobes: number, lines = 24) {
  let out = "";
  for (let k = 0; k < lines; k++) {
    let d = "";
    for (let t = 0; t <= 360; t += 2) {
      const a = (t * Math.PI) / 180, rr = r + amp * Math.sin(lobes * a + k * 0.35);
      d += `${t ? "L" : "M"}${(rr * Math.cos(a + k * 0.02)).toFixed(1)} ${(rr * Math.sin(a + k * 0.02)).toFixed(1)}`;
    }
    out += `<path d="${d}Z"/>`;
  }
  return out;
}
