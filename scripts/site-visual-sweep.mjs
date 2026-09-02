import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { representativeEventId, representativeEventPath } from './audit-page-utils.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const outputDir = path.join(root, 'output', 'playwright', 'visual-sweep');
const reportJsonPath = path.join(reportsDir, 'site-visual-sweep.json');
const reportMdPath = path.join(reportsDir, 'site-visual-sweep.md');
const port = Number(process.env.EVENTLIVE_VISUAL_SWEEP_PORT || 4187);
const navigationTimeoutMs = Number(process.env.EVENTLIVE_VISUAL_SWEEP_NAV_TIMEOUT_MS || 12000);
const pageTimeoutMs = Number(process.env.EVENTLIVE_VISUAL_SWEEP_PAGE_TIMEOUT_MS || 18000);
const maxScrollSteps = Number(process.env.EVENTLIVE_VISUAL_SWEEP_MAX_SCROLL_STEPS || 8);
const maxImagesToWaitFor = Number(process.env.EVENTLIVE_VISUAL_SWEEP_MAX_IMAGES || 80);
const representativeId = representativeEventId();
const representativePath = representativeEventPath();

const pages = [
  { id: 'home', path: '/index.html', required: ['EventLive', 'فعاليات'] },
  { id: 'events', path: '/events.html', required: ['كل الفعاليات'] },
  { id: 'event-shell', path: '/event.html', required: ['البرنامج الرسمي'] },
  { id: 'today', path: '/today.html', required: ['وضع الحضور'] },
  { id: 'today-events', path: '/today-events.html', required: ['فعاليات اليوم'] },
  { id: 'my-events', path: '/my-events.html', required: ['فعالياتي'] },
  { id: 'updates', path: '/updates.html', required: ['التحديثات'] },
  { id: 'screen', path: '/screen.html', required: ['شاشة الحضور'] },
  { id: 'activation', path: '/activation.html', required: ['التفعيل'] },
  { id: 'print', path: `/print.html?event=${encodeURIComponent(representativeId)}`, required: ['نسخة طباعة الفعالية'] },
  { id: 'share', path: `/share.html?event=${encodeURIComponent(representativeId)}`, required: ['مشاركة الفعالية'] },
  { id: 'signage', path: `/signage.html?event=${encodeURIComponent(representativeId)}`, required: ['لافتة QR للفعالية'] },
  { id: 'this-week', path: '/this-week.html', required: ['هذا الأسبوع'] },
  { id: 'this-month', path: '/this-month.html', required: ['فعاليات هذا الشهر'] },
  // weekend.html is now a redirect stub (LEGACY_TOP_LEVEL_REDIRECTS in
  // scripts/legacy-redirect-pages.mjs) that forwards to
  // saudi-events-weekend.html — check the live page directly rather than a
  // meta-refresh stub with no visible content of its own.
  { id: 'weekend', path: '/saudi-events-weekend.html', required: ['الويكند'] },
  { id: 'cities', path: '/cities.html', required: ['فعاليات مدن السعودية'] },
  { id: 'categories', path: '/categories.html', required: ['تصنيفات فعاليات السعودية'] },
  { id: 'audiences', path: '/audiences.html', required: ['فعاليات حسب الجمهور'] },
  { id: 'organizers', path: '/organizers.html', required: ['للمنظمين'] },
  { id: 'organizer-intake', path: '/organizer-intake.html', required: ['إضافة فعالية أو جدول حي'] },
  { id: 'methodology', path: '/methodology.html', required: ['منهجية جمع ونشر الفعاليات'] },
  { id: 'guides', path: '/guides.html', required: ['دليل'] },
  { id: 'live-guide', path: '/guide-live-events-saudi.html', required: ['الفعاليات'] },
  { id: 'data-guide', path: '/guide-saudi-events-data.html', required: ['البيانات'] },
  { id: 'summer-guide', path: '/guide-summer-events-saudi.html', required: ['الصيف'] },
  { id: 'organizer-guide', path: '/guide-organizers-live-schedule.html', required: ['المنظمين'] },
  { id: 'ended-guide', path: '/guide-ended-events-value.html', required: ['المنتهية'] },
  { id: 'sources-guide', path: '/guide-event-sources-methodology.html', required: ['المصادر'] },
  { id: 'online-tech-guide', path: '/guide-online-tech-courses-saudi.html', required: ['الدورات'] },
  { id: 'riyadh-guide', path: '/guide-riyadh-events-live.html', required: ['الرياض'] },
  { id: 'sources', path: '/sources.html', required: ['مصادر'] },
  { id: 'source-health', path: '/source-health.html', required: ['صحة المصادر'] },
  { id: 'source-coverage-gaps', path: '/source-coverage-gaps.html', required: ['فجوات تغطية المصادر'] },
  { id: 'candidates', path: '/candidates.html', required: ['المرشحين'] },
  { id: 'resolver', path: '/resolver.html', required: ['المطابقة الرسمية'] },
  { id: 'regions', path: '/regions.html', required: ['تغطية مناطق المملكة'] },
  { id: 'readiness', path: '/readiness.html', required: ['جاهزية'] },
  { id: 'trust', path: '/trust.html', required: ['الثقة'] },
  { id: 'riyadh-city', path: '/cities/riyadh.html', required: ['الرياض'] },
  // City-profiles destination layer (EVENTME-CITY-PROFILES-BRIEF.md) — Buraydah
  // is one of the two fixture cities in data/city_places.json, so its city
  // page exercises the new "أبرز المعالم في" places section every sweep run.
  { id: 'buraydah-city', path: '/cities/buraydah.html', required: ['بريدة', 'أبرز المعالم في'] },
  { id: 'technology-category', path: '/categories/technology-innovation.html', required: ['التقنية والابتكار'] },
  { id: 'representative-event', path: representativePath, required: ['EventLive'] }
];

const viewports = [
  { id: 'desktop', width: 1366, height: 900 },
  { id: 'mobile', width: 390, height: 844 }
];

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.ics': 'text/calendar; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8'
  }[extension] || 'application/octet-stream';
}

function safeResolve(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://localhost:${port}`).pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const fullPath = path.normalize(path.join(distDir, relativePath));
  if (!fullPath.startsWith(distDir)) return null;
  return fullPath;
}

async function startServer() {
  const server = http.createServer((request, response) => {
    const fullPath = safeResolve(request.url || '/');
    if (!fullPath || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'content-type': contentType(fullPath),
      'cache-control': 'no-store'
    });
    fs.createReadStream(fullPath).pipe(response);
  });
  server.listen(port, '127.0.0.1');
  await once(server, 'listening');
  return server;
}

function screenshotName(pageId, viewportId) {
  return `${pageId}-${viewportId}.png`;
}

async function inspectPage(browser, pageConfig, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.id === 'mobile'
  });
  const url = `http://127.0.0.1:${port}${pageConfig.path}`;
  const screenshotPath = path.join(outputDir, screenshotName(pageConfig.id, viewport.id));
  const errors = [];
  page.setDefaultTimeout(pageTimeoutMs);
  page.setDefaultNavigationTimeout(navigationTimeoutMs);

  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs });
  if (!response || response.status() >= 400) errors.push(`http status ${response?.status() || 'unknown'}`);
  await page.waitForTimeout(600);

  await page.evaluate(async ({ maxScrollSteps, maxImagesToWaitFor }) => {
    await new Promise((resolve) => {
      let y = 0;
      let steps = 0;
      const step = Math.max(320, window.innerHeight * 0.85);
      const timer = window.setInterval(() => {
        steps += 1;
        y += step;
        window.scrollTo(0, y);
        if (steps >= maxScrollSteps || y >= document.documentElement.scrollHeight - window.innerHeight) {
          window.clearInterval(timer);
          window.setTimeout(() => {
            window.scrollTo(0, 0);
            resolve();
          }, 350);
        }
      }, 70);
    });
    const images = [...document.images]
      .filter((image) => image.loading !== 'lazy' || image.getBoundingClientRect().top < window.innerHeight * 2.5)
      .slice(0, maxImagesToWaitFor);
    await Promise.all(images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
        window.setTimeout(done, 900);
      });
    }));
  }, { maxScrollSteps, maxImagesToWaitFor });

  const metrics = await page.evaluate((requiredTexts) => {
    const bodyText = document.body.innerText || '';
    const images = [...document.images].map((image) => ({
      src: image.currentSrc || image.src,
      alt: image.alt || '',
      complete: image.complete,
      width: image.naturalWidth,
      height: image.naturalHeight,
      visible: Boolean(image.offsetWidth || image.offsetHeight || image.getClientRects().length)
    }));
    const visibleImages = images.filter((image) => image.visible);
    const brokenImages = visibleImages.filter((image) => image.complete && (image.width === 0 || image.height === 0));
    const pendingImages = visibleImages.filter((image) => !image.complete);
    const headings = [...document.querySelectorAll('h1,h2')].slice(0, 8).map((heading) => heading.textContent.trim()).filter(Boolean);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const doc = document.documentElement;
    const overflowingNodes = [...document.body.querySelectorAll('*')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > viewportWidth + 2 || rect.right > viewportWidth + 2 || rect.left < -2;
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: String(element.className || '').slice(0, 80),
        text: String(element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        width: Math.round(element.getBoundingClientRect().width)
      }));

    return {
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      bodyTextLength: bodyText.trim().length,
      requiredFound: requiredTexts.every((text) => bodyText.includes(text) || document.title.includes(text)),
      legacyBrandVisible: /Event Life|eventlife|eventlive\.sa/i.test(bodyText + document.title),
      localPathVisible: /Users\/baderalsalman|\/Users\//i.test(document.documentElement.innerHTML),
      hasCanonical: Boolean(document.querySelector('link[rel="canonical"][href^="https://eventme.live/"]')),
      hasDescription: Boolean(document.querySelector('meta[name="description"][content]')?.getAttribute('content')?.length >= 40),
      hasManifest: Boolean(document.querySelector('link[rel="manifest"]')),
      jsonLdBlocks: document.querySelectorAll('script[type="application/ld+json"]').length,
      visibleImages: visibleImages.length,
      brokenImages,
      pendingImages: pendingImages.length,
      headings,
      horizontalOverflow: doc.scrollWidth > viewportWidth + 2,
      overflowBy: Math.max(0, doc.scrollWidth - viewportWidth),
      overflowingNodes,
      viewport: { width: viewportWidth, height: viewportHeight, scrollWidth: doc.scrollWidth, scrollHeight: doc.scrollHeight }
    };
  }, pageConfig.required);

  if (!metrics.requiredFound) errors.push(`required text missing: ${pageConfig.required.join(', ')}`);
  if (metrics.bodyTextLength < 250) errors.push('page appears too sparse');
  if (metrics.horizontalOverflow) errors.push(`horizontal overflow ${metrics.overflowBy}px`);
  if (metrics.brokenImages.length) errors.push(`broken visible images ${metrics.brokenImages.length}`);
  if (metrics.legacyBrandVisible) errors.push('legacy brand/domain visible');
  if (metrics.localPathVisible) errors.push('local filesystem path leaked');
  if (!metrics.hasCanonical) errors.push('missing eventme.live canonical');
  if (!metrics.hasDescription) errors.push('missing useful meta description');
  if (!metrics.hasManifest) errors.push('missing PWA manifest');

  const shouldCaptureFullPage = metrics.viewport.scrollHeight <= 5200 && metrics.visibleImages <= 80;
  await page.screenshot({ path: screenshotPath, fullPage: shouldCaptureFullPage, scale: 'css' });
  await page.close();

  return {
    page: pageConfig.id,
    path: pageConfig.path,
    viewport: viewport.id,
    ok: errors.length === 0,
    errors,
    screenshot: path.relative(root, screenshotPath),
    screenshot_mode: shouldCaptureFullPage ? 'full-page' : 'viewport',
    metrics
  };
}

const server = await startServer();
let browser;
try {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  browser = await chromium.launch();

  const checks = [];
  for (const pageConfig of pages) {
    for (const viewport of viewports) {
      const check = await inspectPage(browser, pageConfig, viewport);
      checks.push(check);
      console.log(`VISUAL_CHECK ${check.ok ? 'PASS' : 'FAIL'} ${check.path} ${check.viewport} screenshot=${check.screenshot_mode}`);
    }
  }

  const failed = checks.filter((check) => !check.ok);
  const report = {
    generated_at: new Date().toISOString(),
    intent: 'eventlive-site-visual-sweep',
    base_url: `http://127.0.0.1:${port}`,
    ok: failed.length === 0,
    totals: {
      pages: pages.length,
      viewports: viewports.length,
      checks: checks.length,
      failed: failed.length,
      screenshots: checks.length
    },
    checks
  };

  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(reportMdPath, [
    '# EventLive Site Visual Sweep',
    '',
    `- Generated at: ${report.generated_at}`,
    `- Status: ${report.ok ? 'PASS' : 'FAIL'}`,
    `- Pages: ${report.totals.pages}`,
    `- Viewports: ${report.totals.viewports}`,
    `- Checks: ${report.totals.checks}`,
    `- Failed: ${report.totals.failed}`,
    `- Screenshots: ${report.totals.screenshots}`,
    '',
    '| Page | Viewport | Status | Images | JSON-LD | Screenshot |',
    '|---|---|---:|---:|---:|---|',
    ...checks.map((check) => `| ${check.path} | ${check.viewport} | ${check.ok ? 'PASS' : `FAIL: ${check.errors.join('; ')}`} | ${check.metrics.visibleImages} | ${check.metrics.jsonLdBlocks} | ${check.screenshot} (${check.screenshot_mode}) |`),
    '',
    failed.length ? '## Failures' : '',
    ...failed.map((check) => `- ${check.path} (${check.viewport}): ${check.errors.join('; ')}`),
    ''
  ].filter(Boolean).join('\n'), 'utf8');

  if (!report.ok) {
    console.error(`SITE_VISUAL_SWEEP_FAIL checks=${checks.length} failed=${failed.length}`);
    process.exitCode = 1;
  } else {
    console.log(`SITE_VISUAL_SWEEP_OK pages=${pages.length} viewports=${viewports.length} screenshots=${checks.length}`);
  }
} finally {
  if (browser) await browser.close();
  server.close();
  await once(server, 'close');
}
