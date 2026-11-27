// Records a real walkthrough of the live Halte site at 2x for the film.
// Frames come from Chrome's screencast (sharp, 3840x2160); every mouse move and click is logged
// so HyperFrames can draw a macOS cursor exactly where the real pointer was.
// Usage: node capture-live.mjs <outDir>
import { chromium } from "/data/home/.t3/projects/qorechain-hackathon/node_modules/playwright/index.mjs";
import fs from "node:fs";

const URL = "https://halte-roan.vercel.app";
const out = process.argv[2];
fs.mkdirSync(`${out}/frames`, { recursive: true });
const frames = [], events = [], marks = [];
const now = () => Date.now() / 1000;
const T0 = now();
const mark = (name) => { marks.push({ name, t: now() - T0 }); console.log(name, (now() - T0).toFixed(1)); };

const b = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
let n = 0;
cdp.on("Page.screencastFrame", async ({ data, sessionId, metadata }) => {
  const f = String(n++).padStart(6, "0") + ".jpg";
  fs.writeFileSync(`${out}/frames/${f}`, Buffer.from(data, "base64"));
  frames.push({ f, t: metadata.timestamp - T0 });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 3840, maxHeight: 2160, everyNthFrame: 1 });

const wait = (ms) => p.waitForTimeout(ms);
let mx = 1500, my = 900;
const ease = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
async function moveTo(x, y, ms = 900) {
  const sx = mx, sy = my, steps = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) { const k = ease(i / steps); mx = sx + (x - sx) * k; my = sy + (y - sy) * k;
    await p.mouse.move(mx, my); events.push({ type: "move", t: now() - T0, x: mx, y: my }); await wait(ms / steps); }
}
async function click(loc, label) {
  await loc.scrollIntoViewIfNeeded(); await wait(450);
  const bb = await loc.boundingBox();
  await moveTo(bb.x + bb.width / 2, bb.y + bb.height / 2, 850); await wait(380);
  events.push({ type: "down", t: now() - T0, x: mx, y: my, label }); await p.mouse.down(); await wait(90);
  await p.mouse.up(); events.push({ type: "up", t: now() - T0, x: mx, y: my, label });
}
async function smoothScroll(toY, ms = 1400) {
  await p.evaluate(([y, d]) => new Promise((res) => { const s = scrollY, t0 = performance.now();
    const f = (t) => { const k = Math.min(1, (t - t0) / d), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, s + (y - s) * e); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); }), [toY, ms]);
}
const scrollToSel = async (sel, offset = 200) => { const y = await p.evaluate(([s, o]) => document.querySelector(s).getBoundingClientRect().top + scrollY - o, [sel, offset]); await smoothScroll(y); };

try {
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.mouse.move(mx, my); events.push({ type: "move", t: now() - T0, x: mx, y: my });
  mark("home"); await wait(6000);

  // the live API check on the home page
  await scrollToSel("#check", 80); mark("check-section"); await wait(1500);
  await click(p.locator("[data-demo=plug-run]"), "run-it-live");
  await p.waitForSelector("[data-demo=plug-verdict]", { timeout: 60000 }); mark("plug-verdict"); await wait(4000);

  // the guided tour: issues a real passport on Diana
  await smoothScroll(0, 1200); await wait(800);
  await click(p.locator("[data-demo=tour]").first(), "tour"); mark("tour-start");
  await p.waitForSelector("[data-demo=tour-card]", { timeout: 150000 }); mark("passport-ready"); await wait(3500);
  const target = { 1: "offer", 2: "dealer-accept", 3: "report-missing", 4: "dealer-accept", 5: "recover", 6: "dealer-accept" };
  for (let s = 1; s <= 6; s++) {
    await p.waitForSelector(`[data-demo=tour-card][data-step="${s}"]`, { timeout: 150000 }); await wait(2800);
    await click(p.locator(`[data-demo=${target[s]}]`).first(), target[s] + "-" + s); mark("click-" + target[s] + "-" + s);
    await p.waitForSelector(`[data-demo=tour-card][data-step="${s + 1}"]`, { timeout: 150000 }); mark("result-" + s); await wait(2600);
  }
  await wait(3500);
  const brk = p.locator("[data-demo=tour-card] a[href='#break']");
  if (await brk.count()) { await click(brk, "break"); await wait(2200); }
  for (const k of ["thief-sell", "wrong-key-freeze"]) {
    const el = p.locator(`[data-demo=${k}]`);
    if ((await el.count()) && (await el.isEnabled())) {
      await click(el, k); mark("click-" + k);
      await p.waitForFunction(() => ![...document.querySelectorAll("button")].some((x) => x.textContent?.includes("…")), null, { timeout: 90000 }).catch(() => {});
      mark("result-" + k); await wait(4000);
    }
  }
  // the dealer's counter page
  const counter = p.locator("[data-demo=counter-link]").first();
  const href = await counter.getAttribute("href");
  await click(counter, "counter"); await p.waitForLoadState("networkidle"); mark("counter"); await wait(6000);
  // the real theft report in the explorer
  await p.goBack({ waitUntil: "networkidle" }); await wait(1500);
  const txs = await p.locator("[data-demo=tx-link]").evaluateAll((as) => as.map((a) => ({ href: a.href, text: a.closest("li,div")?.textContent?.slice(0, 80) })));
  fs.writeFileSync(`${out}/tx-links.json`, JSON.stringify({ counter: href, txs }, null, 1));
  const freeze = txs.find((x) => /missing|frozen|freeze/i.test(x.text || "")) || txs[1] || txs[0];
  if (freeze) { await p.goto(freeze.href, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {}); mark("explorer"); await wait(7000); }
} catch (e) { console.error("ERR", e.message); mark("error"); }
await cdp.send("Page.stopScreencast").catch(() => {});
await wait(500);
fs.writeFileSync(`${out}/frames.json`, JSON.stringify(frames));
fs.writeFileSync(`${out}/events.json`, JSON.stringify(events));
fs.writeFileSync(`${out}/marks.json`, JSON.stringify(marks, null, 1));
await ctx.close(); await b.close();
console.log("frames", frames.length);
