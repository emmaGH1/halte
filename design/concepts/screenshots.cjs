const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
process.env.INSTABOX_HEADLESS = '1';
(async () => {
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try {
    for(const dir of fs.readdirSync(__dirname).filter(name => /^[1-4]-/.test(name))) {
      const folder = path.join(__dirname,dir);
      const shots = path.join(folder,'shots');
      fs.mkdirSync(shots,{recursive:true});
      const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
      await page.goto(pathToFileURL(path.join(folder,'index.html')).href);
      let index = 0;
      async function capture(action) {
        if(action) await page.locator('button[data-a="'+action+'"]:visible').last().click();
        if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error(dir+' horizontal overflow');
        await page.screenshot({path:path.join(shots,'phone-'+(++index)+'.png')});
      }
      await capture();
      await capture('learn');
      for(let i=0;i<4;i++) await capture('next');
      await capture('advance');
      await capture('advance');
      await capture('close');
      await page.locator('.register').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(shots,'phone-17.png')});
      await page.locator('[data-a="guide"]').click();
      await capture('advance');
      await capture('owner');
      await capture('advance');
      await capture('advance');
      await capture('owner');
      await capture('advance');
      await capture('advance');
      await page.getByText('59 min 44 s',{exact:true}).waitFor();
      await page.close();
      const desk = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
      await desk.goto(pathToFileURL(path.join(folder,'index.html')).href);
      await desk.screenshot({path:path.join(shots,'desk.png')});
      await desk.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
