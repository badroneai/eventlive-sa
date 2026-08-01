import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const outDir = path.join(root, 'reports', 'pm-review');
fs.mkdirSync(outDir, { recursive: true });
const port = 4599;

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' }[ext] || 'application/octet-stream';
}

function safeResolve(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://localhost:${port}`).pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const fullPath = path.normalize(path.join(distDir, relativePath));
  if (!fullPath.startsWith(distDir)) return null;
  return fullPath;
}

const server = http.createServer((request, response) => {
  const fullPath = safeResolve(request.url || '/');
  if (!fullPath || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'content-type': contentType(fullPath) });
  fs.createReadStream(fullPath).pipe(response);
});
server.listen(port, '127.0.0.1');
await once(server, 'listening');

const targets = [
  { name: 'buraydah-ar-mobile-360', path: '/cities/buraydah.html', width: 360, height: 800 },
  { name: 'buraydah-ar-desktop', path: '/cities/buraydah.html', width: 1366, height: 900 },
  { name: 'buraydah-en-mobile-360', path: '/en/cities/buraydah.html', width: 360, height: 800 },
  { name: 'buraydah-en-desktop', path: '/en/cities/buraydah.html', width: 1366, height: 900 }
];

const browser = await chromium.launch();
try {
  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: target.width, height: target.height } });
    await page.goto(`http://127.0.0.1:${port}${target.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#city-places', { timeout: 5000 });
    await page.locator('#city-places').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `${target.name}-full-page.png`), fullPage: true });
    await page.locator('#city-places').screenshot({ path: path.join(outDir, `${target.name}-places-section.png`) });
    await page.close();
    console.log(`captured ${target.name}`);
  }
} finally {
  await browser.close();
  server.close();
  await once(server, 'close');
}
