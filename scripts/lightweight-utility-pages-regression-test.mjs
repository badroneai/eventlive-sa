import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const maxRawBytes = 500_000;
const pages = [
  'today.html',
  'print.html',
  'share.html',
  'signage.html',
  'en/today.html',
  'en/print.html',
  'en/share.html',
  'en/signage.html'
];
const todayPages = new Set(['today.html', 'en/today.html']);
const utilityPages = pages.filter((page) => !todayPages.has(page));

function readDist(relativePath) {
  const filePath = path.join(distDir, relativePath);
  assert.ok(fs.existsSync(filePath), `${relativePath} must exist; run npm run build first`);
  return fs.readFileSync(filePath);
}

function robotsDisallows() {
  return fs.readFileSync(path.join(distDir, 'robots.txt'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*Disallow:\s*(\S+)/i)?.[1] || '')
    .filter(Boolean);
}

function isRobotsBlocked(pathname, disallows) {
  return disallows.some((rule) => pathname.startsWith(rule));
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (/\.jpe?g$/i.test(filePath)) return 'image/jpeg';
  return 'application/octet-stream';
}

async function startStaticServer() {
  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const filePath = path.resolve(distDir, `.${pathname}`);
      if (filePath !== distDir && !filePath.startsWith(`${distDir}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, { 'content-type': contentType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(500).end(String(error.message || error));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object', 'static server must expose a loopback port');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

const disallows = robotsDisallows();
for (const pathname of ['/today.json', '/en/today.json', '/events/regression-fixture.json']) {
  assert.equal(isRobotsBlocked(pathname, disallows), false, `${pathname} must remain available to indexed utility pages`);
}

let totalBytes = 0;
let maxBytes = 0;
for (const relativePath of pages) {
  const buffer = readDist(relativePath);
  const html = buffer.toString('utf8');
  totalBytes += buffer.byteLength;
  maxBytes = Math.max(maxBytes, buffer.byteLength);
  assert.ok(buffer.byteLength < maxRawBytes, `${relativePath} raw size ${buffer.byteLength} must be below ${maxRawBytes} bytes`);
  assert.doesNotMatch(html, /window\.EVENTLIVE_EVENTS\s*=\s*\[/, `${relativePath} must not assign an inline event catalog`);
  assert.doesNotMatch(html, /\b(?:const|let|var)\s+events\s*=\s*\[\s*\{/, `${relativePath} must not contain an inline event-record array`);
  assert.doesNotMatch(html, /fetch\([^)]*(?:events-catalog|events)\.json/i, `${relativePath} must not fetch a blocked full-catalog feed`);
  assert.match(html, /Date\.now\(\)/, `${relativePath} must calculate status from the visitor clock`);
}

for (const relativePath of todayPages) {
  const html = readDist(relativePath).toString('utf8');
  assert.match(html, /fetch\([\s\S]{0,240}today\.json/, `${relativePath} must fetch today.json`);
  assert.match(html, /function safeRuntimeHref\(/, `${relativePath} must sanitize URLs fetched from today.json`);
  assert.match(html, /safeRuntimeHref\(event\.directions_url, ['"]#['"]\)/, `${relativePath} must sanitize fetched directions URLs`);
}
for (const relativePath of utilityPages) {
  const html = readDist(relativePath).toString('utf8');
  assert.match(html, /\/events\//, `${relativePath} must support the per-event JSON feed`);
  assert.match(html, /today\.json/, `${relativePath} must keep a public today.json fallback`);
}

const todayFeed = JSON.parse(readDist('today.json').toString('utf8'));
const target = todayFeed.queue.find((event) => {
  const start = Date.parse(event.starts_at);
  const end = Date.parse(event.ends_at || event.starts_at);
  return event.file_slug && Number.isFinite(start) && Number.isFinite(end) && end - start > 120_000;
});
assert.ok(target, 'today.json must expose a browser-test event with a usable time window');
const eventJsonPath = `events/${target.file_slug}.json`;
const eventJson = JSON.parse(readDist(eventJsonPath).toString('utf8'));
for (const field of ['file_slug', 'slug', 'directions_url', 'maps_url']) {
  assert.ok(Object.hasOwn(eventJson, field), `${eventJsonPath} must expose ${field} for utility-page rendering`);
}

const staticServer = await startStaticServer();
const browser = await chromium.launch({ headless: true });
const jsonResponses = [];
let browserPages = 0;
try {
  for (const relativePath of pages) {
    const page = await browser.newPage();
    page.on('response', (response) => {
      if (/\.json(?:$|\?)/i.test(response.url())) jsonResponses.push({ url: response.url(), status: response.status() });
    });
    const suffix = todayPages.has(relativePath) ? '' : `?event=${encodeURIComponent(target.file_slug)}`;
    await page.goto(`${staticServer.baseUrl}/${relativePath}${suffix}`, { waitUntil: 'domcontentloaded' });
    if (todayPages.has(relativePath)) {
      await page.locator('#catalogGrid .event-card').first().waitFor();
      const renderedTitle = (await page.locator('#focusTitle').textContent() || '').trim();
      assert.ok(todayFeed.queue.some((event) => event.title === renderedTitle), `${relativePath} must render an event from today.json`);
    } else {
      await page.locator('[data-event-title]').first().waitFor();
      await page.waitForFunction((title) => document.querySelector('[data-event-title]')?.textContent?.trim() === title, target.title);
    }
    browserPages += 1;
    await page.close();
  }

  const beforePage = await browser.newPage();
  await beforePage.addInitScript((fakeNow) => { Date.now = () => fakeNow; }, Date.parse(target.starts_at) - 60_000);
  await beforePage.goto(`${staticServer.baseUrl}/share.html?event=${encodeURIComponent(target.file_slug)}`, { waitUntil: 'domcontentloaded' });
  await beforePage.waitForFunction((title) => document.querySelector('[data-event-title]')?.textContent?.trim() === title, target.title);
  const beforeStatus = (await beforePage.locator('[data-event-status]').first().textContent() || '').trim();
  await beforePage.close();

  const duringPage = await browser.newPage();
  const start = Date.parse(target.starts_at);
  const end = Date.parse(target.ends_at || target.starts_at);
  await duringPage.addInitScript((fakeNow) => { Date.now = () => fakeNow; }, start + Math.min(60_000, Math.max(1, Math.floor((end - start) / 2))));
  await duringPage.goto(`${staticServer.baseUrl}/share.html?event=${encodeURIComponent(target.file_slug)}`, { waitUntil: 'domcontentloaded' });
  await duringPage.waitForFunction((title) => document.querySelector('[data-event-title]')?.textContent?.trim() === title, target.title);
  const duringStatus = (await duringPage.locator('[data-event-status]').first().textContent() || '').trim();
  await duringPage.close();
  assert.notEqual(duringStatus, beforeStatus, 'utility status must change when the visitor clock crosses the event start');
} finally {
  await browser.close();
  await staticServer.close();
}

assert.ok(jsonResponses.length >= pages.length, 'browser verification must observe JSON feed responses');
for (const response of jsonResponses) {
  const pathname = new URL(response.url).pathname;
  assert.ok(response.status >= 200 && response.status < 300, `${pathname} must load successfully`);
  assert.equal(isRobotsBlocked(pathname, disallows), false, `${pathname} must not be blocked by robots.txt`);
  assert.doesNotMatch(pathname, /\/(?:events|events-catalog)\.json$/, 'browser must not request a blocked full-catalog feed');
}

console.log(
  `LIGHTWEIGHT_UTILITY_PAGES_EVIDENCE pages=${pages.length}`
    + ` total_bytes=${totalBytes} max_bytes=${maxBytes}`
    + ` inline_catalogs=0 browser_pages=${browserPages}`
    + ` json_responses=${jsonResponses.length} client_clock=PASS`
);
console.log('LIGHTWEIGHT_UTILITY_PAGES_OK');
