import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1.5 });
await p.goto("file://" + process.argv[2]); await p.waitForTimeout(1500); await p.evaluate(() => document.fonts.ready);
for (const id of (process.argv[4]||"logos,lockups,study,heroA,heroB").split(",")) await p.locator("#"+id).screenshot({ path: process.argv[3] + "/" + id + ".png" });
await b.close();
