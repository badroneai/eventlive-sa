import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('dist');
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8']
]);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(root, relative);
    if (!filePath.startsWith(`${root}${path.sep}`)) throw new Error('invalid path');
    const body = await fs.readFile(filePath);
    response.writeHead(200, { 'content-type': mime.get(path.extname(filePath)) || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.getByRole('searchbox', { name: 'بحث الفعاليات' }).fill('الخبر');

  const homeCities = await page.locator('#searchResults .s-meta').allTextContents();
  assert.ok(homeCities.length > 0, 'Arabic Khobar search must return at least one exact-city result');
  assert.ok(homeCities.every((text) => text.trim().startsWith('الخبر')), 'Arabic Khobar suggestions must not contain other cities');

  await page.getByRole('searchbox', { name: 'بحث الفعاليات' }).press('Enter');
  await page.waitForURL(/events\.html\?q=/);
  await page.waitForFunction(() => document.querySelector('#eventSummary')?.textContent?.includes('نتيجة مطابقة'));

  const assertCatalogOnlyKhobar = async (label) => {
    const cards = page.locator('#eventGrid article');
    const count = await cards.count();
    assert.ok(count > 0, `${label} must return Khobar catalog rows`);
    for (let index = 0; index < count; index += 1) {
      assert.equal(await cards.nth(index).locator('a[href="./cities/khobar.html"]').count(), 1, `${label} must not return another canonical city`);
    }
  };

  await assertCatalogOnlyKhobar('Arabic Khobar search');
  await page.getByRole('searchbox', { name: 'بحث في الفعاليات' }).fill('Khobar');
  await assertCatalogOnlyKhobar('English Khobar search');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

console.log('TEST_OK Arabic and English city searches stay within canonical Khobar results');
