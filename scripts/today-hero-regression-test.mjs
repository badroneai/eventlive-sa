// Regression test for the "الآن" attendance page hero (dist/today.html).
// dist/today.html is a committed shell — humans edit its inline <script>
// and <style> directly, CI never regenerates its chrome — so this guards
// the two hero defects fixed 2026-08-01:
//
//   1. Localized labels: today.json (scripts/generate-site.mjs's
//      compactActivationEvent) carries a localized city_label alongside
//      the raw city, but the shell used to join the raw city straight
//      into the Arabic hero meta line ("... | Dhahran Expo | Dhahran").
//      Assert the rendered hero meta never contains a bare-Latin city
//      token when today.json's focus row has a city_label.
//   2. Hero title contrast: .hero-card sits inside the dark .hero section
//      but is itself a near-opaque light card; .value (id=focusTitle) had
//      no explicit color and inherited the hero's light text color,
//      rendering near-white-on-near-white. Assert the focusTitle's
//      computed color/background pair clears WCAG AA (>=4.5:1) for
//      normal text.
//
// Follows the server + Playwright idiom in
// scripts/mobile-browsing-regression-test.mjs.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const port = Number(process.env.EVENTLIVE_TODAY_HERO_TEST_PORT || 4194);

const todayFeed = JSON.parse(fs.readFileSync(path.join(distDir, 'today.json'), 'utf8'));
const focusRow = todayFeed.focus || (todayFeed.queue || [])[0];
assert.ok(focusRow, 'today.json must expose a focus (or first queue) row for the hero test to check against');
assert.ok(focusRow.city_label, 'today.json focus row must carry a localized city_label for this regression to be meaningful');

function contentType(filePath) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
  }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url || '/', `http://127.0.0.1:${port}`).pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.normalize(path.join(distDir, relative));
    if (!filePath.startsWith(distDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentType(filePath), 'cache-control': 'no-store' });
    fs.createReadStream(filePath).pipe(response);
  });
  server.listen(port, '127.0.0.1');
  return server;
}

// Relative luminance + contrast ratio per WCAG 2.x, matching axe-core /
// Chrome DevTools' contrast math. Accepts "rgb(r, g, b)" / "rgba(r, g, b, a)".
function parseRgb(value) {
  const match = String(value || '').match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1].split(',').map((part) => Number(part.trim()));
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}

function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(rgbA, rgbB) {
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const [lighter, darker] = lA >= lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}

// Flatten a possibly-transparent foreground color onto a solid backdrop
// (straightforward alpha compositing; the elements under test here are
// either fully opaque or a single semi-transparent layer over a solid
// page background, which matches how they actually render).
function compositeOver(top, bottom) {
  const a = top.a ?? 1;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a)
  };
}

const server = startServer();
await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 800 }, isMobile: true });
  await page.goto(`http://127.0.0.1:${port}/today.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const el = document.getElementById('focusMeta');
    return el && el.textContent && el.textContent.trim() !== 'نراجع السجل المحلي والكتالوج العام.';
  }, { timeout: 10000 });

  const result = await page.evaluate(() => {
    const pick = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        text: el.textContent || '',
        color: style.color,
        backgroundColor: style.backgroundColor
      };
    };
    const card = document.querySelector('.hero-card');
    const cardStyle = card ? getComputedStyle(card) : null;
    const bodyStyle = getComputedStyle(document.body);
    return {
      focusTitle: pick('focusTitle'),
      focusMeta: pick('focusMeta'),
      focusLabel: pick('focusLabel'),
      heroCardBackground: cardStyle ? cardStyle.backgroundColor : null,
      bodyBackground: bodyStyle.backgroundColor
    };
  });

  await page.screenshot({ path: 'reports/pm-review/today-hero-ar-360-after.png', fullPage: false });

  // --- Defect 1: no bare-Latin city token when today.json has a city_label ---
  assert.ok(result.focusMeta.text.length > 0, 'focusMeta must render hero meta text');
  assert.ok(
    !result.focusMeta.text.includes(focusRow.city) || focusRow.city === focusRow.city_label,
    `hero meta must not contain the raw (Latin) city "${focusRow.city}" when a localized city_label "${focusRow.city_label}" is available. Got: "${result.focusMeta.text}"`
  );
  assert.ok(
    result.focusMeta.text.includes(focusRow.city_label),
    `hero meta must prefer the localized city_label "${focusRow.city_label}". Got: "${result.focusMeta.text}"`
  );

  // --- Defect 2: focusTitle contrast >= 4.5:1 (WCAG AA, normal text) ---
  const titleFg = parseRgb(result.focusTitle.color);
  assert.ok(titleFg, `focusTitle color must be a resolvable rgb() value, got "${result.focusTitle.color}"`);
  // Composite the card's own background (may itself be translucent) over
  // the page body background to get the actual painted backdrop, then
  // composite the (usually opaque) text color over that.
  const pageBg = parseRgb(result.bodyBackground) || { r: 255, g: 255, b: 255, a: 1 };
  const cardBg = parseRgb(result.heroCardBackground) || { r: 255, g: 255, b: 255, a: 1 };
  const paintedBackdrop = compositeOver(cardBg, pageBg);
  const paintedTitle = compositeOver(titleFg, paintedBackdrop);
  const ratio = contrastRatio(paintedTitle, paintedBackdrop);
  assert.ok(
    ratio >= 4.5,
    `focusTitle (#focusTitle / .value) must clear WCAG AA contrast (>=4.5:1) against the hero-card background, got ${ratio.toFixed(2)}:1 (color=${result.focusTitle.color}, hero-card background=${result.heroCardBackground})`
  );

  console.log(`TODAY_HERO_CITY_LABEL_OK meta="${result.focusMeta.text}"`);
  console.log(`TODAY_HERO_CONTRAST_OK ratio=${ratio.toFixed(2)}:1`);
  console.log('TODAY_HERO_OK');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
