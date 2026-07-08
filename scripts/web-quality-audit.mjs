import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();

const pages = [
  '/index.html',
  '/events.html',
  '/today-events.html',
  '/screen.html',
  '/organizers.html',
  '/events/demo-event.html'
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const normalized = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
    const fullPath = path.join(distDir, normalized);
    if (!fullPath.startsWith(distDir) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentType(fullPath) });
    fs.createReadStream(fullPath).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function sizeOfPage(pagePath) {
  const filePath = path.join(distDir, pagePath.replace(/^\//, ''));
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
}

function summarizeChecks(results) {
  const totals = {
    pages: results.length,
    console_errors: results.reduce((sum, item) => sum + item.console_errors.length, 0),
    accessibility_violations: results.reduce((sum, item) => sum + item.accessibility.violations.length, 0),
    responsive_violations: results.reduce((sum, item) => sum + item.responsive.violations.length, 0),
    performance_violations: results.reduce((sum, item) => sum + item.performance.violations.length, 0),
    security_violations: results.reduce((sum, item) => sum + item.security.violations.length, 0)
  };
  return {
    ...totals,
    accessibility_status: totals.accessibility_violations === 0 ? 'PASS' : 'PARTIAL',
    responsive_status: totals.responsive_violations === 0 ? 'PASS' : 'PARTIAL',
    performance_status: totals.performance_violations === 0 ? 'PASS' : 'PARTIAL',
    security_status: totals.security_violations === 0 ? 'PASS' : 'PARTIAL'
  };
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\|/g, '/')).join(' | ')} |`)
  ].join('\n');
}

const { server, baseUrl } = await startServer();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  deviceScaleFactor: 2
});

const results = [];

try {
  for (const pagePath of pages) {
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    const response = await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });
    const metrics = await page.evaluate(() => {
      const html = document.documentElement;
      const title = document.title.trim();
      const h1Count = document.querySelectorAll('h1').length;
      const imagesMissingAlt = [...document.querySelectorAll('img')].filter((image) => !image.hasAttribute('alt')).length;
      const unnamedButtons = [...document.querySelectorAll('button,a[role="button"]')].filter((button) => {
        const name = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''} ${button.getAttribute('title') || ''}`.trim();
        return !name;
      }).length;
      const unlabeledInputs = [...document.querySelectorAll('input,select,textarea')].filter((input) => {
        if (input.type === 'hidden') return false;
        if (input.getAttribute('aria-label') || input.getAttribute('aria-labelledby') || input.getAttribute('placeholder')) return false;
        if (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) return false;
        return !input.closest('label');
      }).length;
      const focusableWithoutText = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((node) => {
        if (node.matches('input,select,textarea')) return false;
        const name = `${node.getAttribute('aria-label') || ''} ${node.textContent || ''} ${node.getAttribute('title') || ''}`.trim();
        return !name;
      }).length;
      const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth + 2;
      const httpLinks = [...document.querySelectorAll('a[href],script[src],img[src],link[href]')]
        .map((node) => node.getAttribute('href') || node.getAttribute('src') || '')
        .filter((value) => /^http:\/\//i.test(value));
      const targetBlankMissingRel = [...document.querySelectorAll('a[target="_blank"]')].filter((anchor) => {
        const rel = anchor.getAttribute('rel') || '';
        return !/\bnoopener\b/i.test(rel) || !/\bnoreferrer\b/i.test(rel);
      }).length;
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        lang: html.lang,
        dir: html.dir,
        title,
        h1Count,
        imagesMissingAlt,
        unnamedButtons,
        unlabeledInputs,
        focusableWithoutText,
        horizontalOverflow,
        httpLinks,
        targetBlankMissingRel,
        domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd || 0),
        loadMs: Math.round(nav?.loadEventEnd || 0)
      };
    });
    const pageSize = sizeOfPage(pagePath);
    const accessibilityViolations = [];
    if (metrics.lang !== 'ar') accessibilityViolations.push(`expected html lang=ar, got ${metrics.lang || 'missing'}`);
    if (metrics.dir !== 'rtl') accessibilityViolations.push(`expected html dir=rtl, got ${metrics.dir || 'missing'}`);
    if (!metrics.title) accessibilityViolations.push('missing document title');
    if (metrics.h1Count < 1) accessibilityViolations.push('missing h1');
    if (metrics.imagesMissingAlt > 0) accessibilityViolations.push(`${metrics.imagesMissingAlt} images missing alt`);
    if (metrics.unnamedButtons > 0) accessibilityViolations.push(`${metrics.unnamedButtons} buttons without accessible names`);
    if (metrics.unlabeledInputs > 0) accessibilityViolations.push(`${metrics.unlabeledInputs} form controls without labels`);
    if (metrics.focusableWithoutText > 0) accessibilityViolations.push(`${metrics.focusableWithoutText} focusable controls without text/name`);

    const responsiveViolations = [];
    if (metrics.horizontalOverflow) responsiveViolations.push('horizontal overflow on 390px mobile viewport');

    const performanceViolations = [];
    if (pageSize > 500_000) performanceViolations.push(`html size ${pageSize} exceeds 500KB budget`);
    if (metrics.domContentLoadedMs > 2500) performanceViolations.push(`DOMContentLoaded ${metrics.domContentLoadedMs}ms exceeds 2500ms budget`);

    const securityViolations = [];
    if (!response || !response.ok()) securityViolations.push(`HTTP status ${response?.status() || 'missing'}`);
    if (metrics.httpLinks.length > 0) securityViolations.push(`${metrics.httpLinks.length} insecure http:// resource links`);
    if (metrics.targetBlankMissingRel > 0) securityViolations.push(`${metrics.targetBlankMissingRel} target=_blank links missing noopener/noreferrer`);

    results.push({
      page: pagePath,
      http_status: response?.status() || 0,
      console_errors: consoleErrors,
      metrics: { ...metrics, pageSize },
      accessibility: { violations: accessibilityViolations },
      responsive: { violations: responsiveViolations },
      performance: { violations: performanceViolations },
      security: { violations: securityViolations }
    });
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

const summary = summarizeChecks(results);
const report = {
  schema: 'eventlive.web-quality-audit.v1',
  generated_at: generatedAt,
  scope: 'mobile browser baseline for accessibility, responsive behavior, performance budgets, and static security hygiene',
  summary,
  pages: results
};

ensureDir(reportsDir);
fs.writeFileSync(path.join(reportsDir, 'web-quality-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'web-quality-audit.md'),
  [
    '# EventLive Web Quality Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Pages: ${summary.pages}`,
    `- Accessibility baseline: ${summary.accessibility_status} (${summary.accessibility_violations} findings)`,
    `- Responsive baseline: ${summary.responsive_status} (${summary.responsive_violations} findings)`,
    `- Performance baseline: ${summary.performance_status} (${summary.performance_violations} findings)`,
    `- Security baseline: ${summary.security_status} (${summary.security_violations} findings)`,
    '',
    mdTable(
      ['Page', 'A11y', 'Responsive', 'Performance', 'Security', 'Console errors'],
      results.map((item) => [
        item.page,
        item.accessibility.violations.length,
        item.responsive.violations.length,
        item.performance.violations.length,
        item.security.violations.length,
        item.console_errors.length
      ])
    ),
    ''
  ].join('\n'),
  'utf8'
);

console.log(
  `WEB_QUALITY_AUDIT_OK pages=${summary.pages} a11y=${summary.accessibility_violations} responsive=${summary.responsive_violations} perf=${summary.performance_violations} security=${summary.security_violations}`
);
