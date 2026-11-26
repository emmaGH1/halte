import { chromium } from "playwright";
const URL = "https://halte-roan.vercel.app";
const out = process.argv[2];
const b = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
await ctx.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.style.cssText = "position:fixed;z-index:99999;left:0;top:0;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.9);border:2px solid #07070A;box-shadow:0 0 0 6px rgba(255,69,38,.25);pointer-events:none;transform:translate(-50%,-50%);transition:transform .1s";
    document.body.appendChild(c);
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; });
    addEventListener("mousedown", () => (c.style.transform = "translate(-50%,-50%) scale(.7)"));
    addEventListener("mouseup", () => (c.style.transform = "translate(-50%,-50%)"));
  });
});
const p = await ctx.newPage();
const wait = (ms) => p.waitForTimeout(ms);
let mx = 720, my = 450;
async function go(loc) {
  await loc.scrollIntoViewIfNeeded(); await wait(500);
  const bb = await loc.boundingBox();
  const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
  await p.mouse.move(x, y, { steps: 30 }); mx = x; my = y; await wait(700);
  await p.mouse.down(); await p.mouse.up();
}
async function scrollBy(px, ms = 2500) { const n = 50; for (let i = 0; i < n; i++) { await p.mouse.wheel(0, px / n); await wait(ms / n); } }

await p.goto(URL, { waitUntil: "networkidle" });
await p.mouse.move(mx, my); await wait(6000);
await scrollBy(900, 3000); await wait(2500);
await go(p.locator("[data-demo=plug-run]")); await p.waitForSelector("[data-demo=plug-verdict]", { timeout: 60000 }); await wait(4000);
await scrollBy(1000, 3000); await wait(2500);
await scrollBy(900, 3000); await wait(3000);
await p.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await wait(2500);
await go(p.locator("[data-demo=tour]").first());
await p.waitForSelector("[data-demo=tour-card]", { timeout: 120000 }); await wait(4000);

const target = { 1: "offer", 2: "dealer-accept", 3: "report-missing", 4: "dealer-accept", 5: "recover", 6: "dealer-accept" };
for (let s = 1; s <= 6; s++) {
  await p.waitForSelector(`[data-demo=tour-card][data-step="${s}"]`, { timeout: 120000 });
  await wait(3500); // read the card
  await go(p.locator(`[data-demo=${target[s]}]`).first());
  await p.waitForSelector(`[data-demo=tour-card][data-step="${s + 1}"]`, { timeout: 120000 });
  await wait(2500);
}
await wait(5000);
const brk = p.locator("[data-demo=tour-card] a[href='#break']");
if (await brk.count()) { await go(brk); await wait(2500); }
for (const k of ["thief-sell", "wrong-key-freeze"]) {
  const el = p.locator(`[data-demo=${k}]`);
  if (await el.count() && await el.isEnabled()) {
    await go(el);
    await p.waitForFunction(() => ![...document.querySelectorAll("button")].some((x) => x.textContent?.includes("…")), null, { timeout: 90000 }).catch(() => {});
    await wait(4500);
  }
}
const tx = p.locator("[data-demo=tx-link]").last();
await tx.scrollIntoViewIfNeeded(); await wait(4000);
await go(p.locator("[data-demo=counter-link]").first());
await p.waitForLoadState("networkidle"); await wait(7000);
await ctx.close(); await b.close();
