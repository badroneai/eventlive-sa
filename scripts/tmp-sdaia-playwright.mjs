import { chromium } from 'playwright';

const source = 'https://sdaia.gov.sa/en/Sectors/academy/bootcamps/Pages/default.aspx';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('requestfinished', async (req) => {
  const url = req.url();
  if (/SDAIAAssets\/assets\/js\/Pages\/MediaCenter\/academy\/bootcamps.js|bootcamp|bootcamps|DataSource|json|api/i.test(url)) {
    console.log('REQ', req.resourceType(), url);
  }
});
await page.goto(source, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);
const scripts = await page.$$eval('script', nodes => nodes.map(s => ({src: s.src || '', type: s.type || '', text: (s.innerText || '').slice(0, 240)})));
const inlineHits = scripts.filter(s => /bootcamp|bootcamps|DataSource|datasource|event/i.test(s.text || '') || /bootcamp|bootcamps|DataSource|datasource|event/i.test(s.src || ''));
console.log('SCRIPT_COUNT', scripts.length, 'HITS', inlineHits.length);
for (const item of inlineHits.slice(0, 30)) {
  console.log('S', item.type, item.src || '[inline]', item.text);
}
const bodyText = await page.evaluate(() => document.body.innerText);
console.log('BODY_LEN', bodyText.length);
console.log('BODY_SNIPPET', bodyText.slice(0, 2000));
await page.screenshot({ path: '/tmp/sdaia-bootcamps.png', fullPage: true });
await browser.close();
