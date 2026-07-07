import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const distDir = path.join(root, 'dist');

const requiredPages = [
  'index.html',
  'this-month.html',
  'cities/riyadh.html',
  'categories/technology-training.html',
  'events/demo-event.html'
];

function readDist(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} must exist; run npm run build first`);
  return fs.readFileSync(fullPath, 'utf8');
}

function assertRuntimeScript(relativePath, html) {
  assert.match(html, /Date\.now\(\)/, `${relativePath} must compute event timing from browser time`);
  assert.match(html, /setInterval\(updateLiveRuntime,\s*60000\)/, `${relativePath} must refresh live timing periodically`);
}

function assertLiveTimeElements(relativePath, html) {
  const markup = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  const liveTimeElements = [...markup.matchAll(/<[^>]+data-live-time[^>]*>/g)].map((match) => match[0]);
  assert.ok(liveTimeElements.length > 0, `${relativePath} must expose live time elements`);
  for (const element of liveTimeElements) {
    assert.match(element, /data-start="[^"]+"/, `${relativePath} live time element must carry data-start`);
    assert.match(element, /data-end="[^"]+"/, `${relativePath} live time element must carry data-end`);
    assert.match(element, /data-kind="[^"]+"/, `${relativePath} live time element must carry data-kind`);
  }
}

const home = readDist('index.html');
assertRuntimeScript('index.html', home);
const staticHomeRelativeTimes = [...home.matchAll(/<div class="card-when"(?![^>]*data-live-time)[^>]*>\s*(?:يبدأ بعد|ينتهي بعد|انتهت منذ)[\s\S]*?<\/div>/g)];
assert.deepEqual(staticHomeRelativeTimes, [], 'home cards must not keep build-time relative timing without data-live-time');
assertLiveTimeElements('index.html', home);

for (const page of requiredPages.slice(1)) {
  const html = readDist(page);
  assertRuntimeScript(page, html);
  assertLiveTimeElements(page, html);
  assert.match(html, /data-runtime-status/, `${page} must update runtime status from browser time`);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const realNow = Date.now.bind(Date);
    window.__eventliveFakeNow = Date.parse('2026-07-05T12:00:00+03:00');
    Date.now = () => window.__eventliveFakeNow || realNow();
  });
  await page.goto(pathToFileURL(path.join(distDir, 'index.html')).href);
  await page.waitForFunction(() => window.EventLiveRuntimeClock && document.querySelector('.card-when[data-live-time]')?.textContent?.trim());
  const before = await page.locator('.card-when[data-live-time]').first().textContent();
  await page.evaluate(() => {
    window.__eventliveFakeNow += 2 * 60 * 60 * 1000;
    window.EventLiveRuntimeClock.update();
  });
  const after = await page.locator('.card-when[data-live-time]').first().textContent();
  assert.notEqual(after, before, 'home live card timing must change when browser time advances');
} finally {
  await browser.close();
}

console.log('live-runtime-clock-regression-test: ok');
