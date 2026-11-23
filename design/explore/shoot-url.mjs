import { chromium } from "playwright";
const [,, url, out, w = "1440", h = "900", full = "0", wait = "4500"] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +w < 600 ? 2 : 1.25 });
await p.goto(url, { waitUntil: "networkidle" }); await p.waitForTimeout(+wait);
await p.screenshot({ path: out, fullPage: full === "1" });
await b.close();
