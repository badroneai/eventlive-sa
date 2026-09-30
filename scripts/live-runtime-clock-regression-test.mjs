import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { representativeEventPath } from './audit-page-utils.mjs';
import './runtime-time-precision-regression-test.mjs';
import './directory-time-precision-regression-test.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');

const requiredPages = [
  'index.html',
  'this-month.html',
  'cities/riyadh.html',
  'categories/technology-innovation.html',
  representativeEventPath().replace(/^\//, '')
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
    assert.match(element, /data-time-precision="[^"]+"/, `${relativePath} live time element must carry its source precision verdict`);
  }
}

const home = readDist('index.html');
assertRuntimeScript('index.html', home);
const staticHomeRelativeTimes = [...home.matchAll(/<div class="card-when"(?![^>]*data-live-time)[^>]*>\s*(?:يبدأ بعد|ينتهي بعد|انتهت منذ)[\s\S]*?<\/div>/g)];
assert.deepEqual(staticHomeRelativeTimes, [], 'home cards must not keep build-time relative timing without data-live-time');
assertLiveTimeElements('index.html', home);
// The first real card may legitimately be date-only and should NOT change when
// two hours pass. Test clock transitions with explicit source-precision fixtures
// instead of demanding a countdown from whichever external event leads today.
const browserTestNow = Date.parse('2026-10-01T08:00:00+03:00');

for (const page of requiredPages.slice(1)) {
  const html = readDist(page);
  assertRuntimeScript(page, html);
  assertLiveTimeElements(page, html);
  assert.match(html, /data-runtime-status/, `${page} must update runtime status from browser time`);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript((fakeNow) => {
    const realNow = Date.now.bind(Date);
    window.__eventliveFakeNow = fakeNow;
    Date.now = () => window.__eventliveFakeNow || realNow();
  }, browserTestNow);
  await page.goto(pathToFileURL(path.join(distDir, 'index.html')).href);
  await page.waitForFunction(() => window.EventLiveRuntimeClock && document.querySelector('.card-when[data-live-time]')?.textContent?.trim());
  await page.evaluate(() => {
    for (const precision of ['exact', 'unknown']) {
      const node = document.createElement('div');
      node.id = `runtime-fixture-${precision}`;
      node.setAttribute('data-live-time', '');
      Object.assign(node.dataset, { start: '2026-10-01T09:00:00+03:00', end: '2026-10-01T18:00:00+03:00', kind: 'moment', timePrecision: precision });
      document.body.append(node);
    }
    window.EventLiveRuntimeClock.update();
  });
  const before = await page.locator('#runtime-fixture-exact').textContent();
  const unknownBefore = await page.locator('#runtime-fixture-unknown').textContent();
  await page.evaluate(() => {
    window.__eventliveFakeNow += 2 * 60 * 60 * 1000;
    window.EventLiveRuntimeClock.update();
  });
  const after = await page.locator('#runtime-fixture-exact').textContent();
  assert.notEqual(after, before, 'home live card timing must change when browser time advances');
  assert.equal(await page.locator('#runtime-fixture-unknown').textContent(), unknownBefore, 'an unknown clock must not count down across fabricated hours');
} finally {
  await browser.close();
}

console.log('live-runtime-clock-regression-test: ok');
