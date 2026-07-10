import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const port = Number(process.env.EVENTLIVE_MOBILE_TEST_PORT || 4193);
const widths = [360, 390, 430];
const tabletWidth = 820;
const representativeEvent = JSON.parse(fs.readFileSync(path.join(distDir, 'events.json'), 'utf8'))
  .events?.find((event) => event.status !== 'ended') || JSON.parse(fs.readFileSync(path.join(distDir, 'events.json'), 'utf8')).events?.[0];

assert.ok(representativeEvent?.detail_url, 'events.json must expose a representative event detail page');

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

async function inspect(page, route, width) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`http://127.0.0.1:${port}/${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(450);
  return page.evaluate(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector)?.getBoundingClientRect();
      return value ? { top: Math.round(value.top), bottom: Math.round(value.bottom), width: Math.round(value.width), height: Math.round(value.height) } : null;
    };
    const touchTargets = [...document.querySelectorAll('button,summary,.cta,.cta-now,.btn-sm,.actions a,.actions button,.toolbar input,.toolbar select,.mobile-site-menu a')]
      .map((element) => {
        const value = element.getBoundingClientRect();
        return { text: String(element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 40), width: value.width, height: value.height };
      })
      .filter((target) => target.width > 0 && target.height > 0);
    return {
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      hero: rect('.hero'),
      toolbar: rect('.toolbar'),
      firstCatalogCard: rect('#eventGrid .event-card'),
      primaryFacet: rect('.facet-primary'),
      firstFacetCard: rect('.facet-page .card'),
      subscription: rect('.facet-page .facet-focus:last-of-type'),
      quickActions: rect('.event-quick-actions'),
      mobileMenu: rect('.mobile-site-menu > summary'),
      homeHeader: (() => {
        const header = document.querySelector('.site-head');
        const cta = document.querySelector('.site-head .cta-now');
        const tagline = document.querySelector('.site-head .brand small');
        const menu = document.querySelector('.site-head .burger > summary');
        const headerRect = header?.getBoundingClientRect();
        const ctaRect = cta?.getBoundingClientRect();
        const menuRect = menu?.getBoundingClientRect();
        return header ? {
          height: headerRect?.height || 0,
          ctaText: String(cta?.textContent || '').trim(),
          ctaWidth: ctaRect?.width || 0,
          ctaHeight: ctaRect?.height || 0,
          taglineDisplay: tagline ? getComputedStyle(tagline).display : null,
          menuWidth: menuRect?.width || 0,
          menuHeight: menuRect?.height || 0
        } : null;
      })(),
      homeFirstSection: rect('main .h-section'),
      homeShelf: (() => {
        const shelf = document.querySelector('.card-row');
        const cards = [...document.querySelectorAll('.card-row .card')];
        const first = cards[0]?.getBoundingClientRect();
        const second = cards[1]?.getBoundingClientRect();
        return shelf ? {
          cardCount: cards.length,
          clientWidth: shelf.clientWidth,
          scrollWidth: shelf.scrollWidth,
          overflowX: getComputedStyle(shelf).overflowX,
          scrollSnapType: getComputedStyle(shelf).scrollSnapType,
          ariaLabel: shelf.getAttribute('aria-label'),
          tabIndex: shelf.tabIndex,
          firstCardWidth: first?.width || 0,
          nextCardVisibleWidth: second ? Math.max(0, Math.min(innerWidth, second.right) - Math.max(0, second.left)) : 0
        } : null;
      })(),
      smallTouchTargets: touchTargets.filter((target) => target.height < 44)
    };
  });
}

const server = startServer();
await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch();
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true });

    const home = await inspect(page, 'index.html', width);
    assert.ok(home.scrollWidth <= width + 1, `home must not overflow horizontally at ${width}px`);
    assert.ok(home.homeHeader?.height <= 64, `home header must stay compact at ${width}px`);
    assert.equal(home.homeHeader?.ctaText, 'الآن', `home header action must describe its destination at ${width}px`);
    assert.ok(home.homeHeader?.ctaWidth <= 90, `home header action must not dominate the brand at ${width}px`);
    assert.ok(home.homeHeader?.ctaHeight >= 44, `home header action must remain touch friendly at ${width}px`);
    assert.equal(home.homeHeader?.taglineDisplay, 'none', `home header tagline must not crowd mobile navigation at ${width}px`);
    assert.ok(home.homeHeader?.menuWidth >= 44 && home.homeHeader?.menuHeight >= 44, `home menu must expose a clear touch target at ${width}px`);
    assert.ok(home.homeFirstSection?.top <= 740, `home must reveal event discovery within the first mobile viewport at ${width}px`);
    assert.ok(home.homeShelf?.cardCount > 1, `home must expose a useful event shelf at ${width}px`);
    assert.equal(home.homeShelf?.overflowX, 'auto', `home shelf must use native horizontal scrolling at ${width}px`);
    assert.ok(String(home.homeShelf?.scrollSnapType).includes('x'), `home shelf must snap horizontally at ${width}px`);
    assert.equal(home.homeShelf?.ariaLabel, 'فعاليات تبدأ قريبًا', `home shelf needs an accessible name at ${width}px`);
    assert.equal(home.homeShelf?.tabIndex, 0, `home shelf must be keyboard focusable at ${width}px`);
    assert.ok(home.homeShelf?.firstCardWidth >= width * 0.74 && home.homeShelf?.firstCardWidth <= width * 0.86, `home card width must prioritize reading while preserving a next-card cue at ${width}px`);
    assert.ok(home.homeShelf?.nextCardVisibleWidth >= 20 && home.homeShelf?.nextCardVisibleWidth <= 90, `home must reveal part of the next card at ${width}px`);
    assert.equal(home.smallTouchTargets.length, 0, `home has undersized touch targets at ${width}px: ${JSON.stringify(home.smallTouchTargets)}`);

    const catalog = await inspect(page, 'events.html', width);
    assert.ok(catalog.scrollWidth <= width + 1, `events catalog must not overflow horizontally at ${width}px`);
    assert.ok(catalog.firstCatalogCard?.top <= 760, `first catalog card must appear within the first mobile viewport at ${width}px`);
    assert.ok(catalog.toolbar?.height <= 90, `collapsed mobile catalog toolbar must stay compact at ${width}px`);
    assert.equal(catalog.smallTouchTargets.length, 0, `catalog has undersized touch targets at ${width}px: ${JSON.stringify(catalog.smallTouchTargets)}`);

    const today = await inspect(page, 'today-events.html', width);
    assert.ok(today.scrollWidth <= width + 1, `today page must not overflow horizontally at ${width}px`);
    assert.ok(today.primaryFacet?.top <= 430, `today page must lead with the nearest event at ${width}px`);
    assert.ok(today.firstFacetCard?.top < today.subscription?.top, `subscription controls must follow event results at ${width}px`);
    assert.equal(today.smallTouchTargets.length, 0, `today page has undersized touch targets at ${width}px: ${JSON.stringify(today.smallTouchTargets)}`);

    const detailRoute = String(representativeEvent.detail_url).replace(/^\.\//, '');
    const detail = await inspect(page, detailRoute, width);
    assert.ok(detail.scrollWidth <= width + 1, `event detail must not overflow horizontally at ${width}px`);
    assert.ok(detail.hero?.height <= 650, `event detail hero must remain compact at ${width}px`);
    assert.ok(detail.quickActions?.bottom <= 700, `event detail quick actions must be immediately reachable at ${width}px`);
    assert.ok(detail.mobileMenu?.height >= 44, `event detail must expose a usable mobile menu at ${width}px`);
    assert.equal(detail.smallTouchTargets.length, 0, `event detail has undersized touch targets at ${width}px: ${JSON.stringify(detail.smallTouchTargets)}`);

    await page.close();
    console.log(`MOBILE_VIEWPORT_PASS width=${width}`);
  }
  const tabletPage = await browser.newPage({ viewport: { width: tabletWidth, height: 1180 }, isMobile: true, deviceScaleFactor: 2 });
  const tabletCatalog = await inspect(tabletPage, 'events.html', tabletWidth);
  assert.ok(tabletCatalog.scrollWidth <= tabletWidth + 1, 'events catalog must not overflow horizontally at 820px');
  assert.equal(tabletCatalog.smallTouchTargets.length, 0, `tablet catalog has undersized touch targets: ${JSON.stringify(tabletCatalog.smallTouchTargets)}`);
  await tabletPage.close();
  console.log(`MOBILE_VIEWPORT_PASS width=${tabletWidth}`);
  console.log('MOBILE_BROWSING_OK');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
