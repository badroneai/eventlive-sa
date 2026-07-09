import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();
const domContentLoadedBudgetMs = 4500;

const pages = [
  '/index.html',
  '/events.html',
  '/today-events.html',
  '/screen.html',
  '/organizers.html',
  '/events/demo-event.html'
];

const viewports = [
  { id: 'mobile', width: 390, height: 844, isMobile: true },
  { id: 'tablet', width: 820, height: 1180, isMobile: true },
  { id: 'desktop', width: 1440, height: 900, isMobile: false }
];

const engines = [
  { id: 'chromium', launcher: chromium },
  { id: 'webkit', launcher: webkit }
];

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
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

const { server, baseUrl } = await startServer();
const results = [];
const findings = [];

try {
  for (const engine of engines) {
    let browser;
    try {
      browser = await engine.launcher.launch();
    } catch (error) {
      findings.push({ engine: engine.id, page: '*', viewport: '*', issue: `browser unavailable: ${error.message.split('\n')[0]}` });
      continue;
    }

    try {
      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.isMobile,
          deviceScaleFactor: viewport.isMobile ? 2 : 1
        });
        for (const pagePath of pages) {
          const page = await context.newPage();
          const consoleErrors = [];
          page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
          });
          const response = await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });
          const metrics = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            const nav = performance.getEntriesByType('navigation')[0];
            return {
              scrollWidth: document.documentElement.scrollWidth,
              clientWidth: document.documentElement.clientWidth,
              bodyHeight: document.body.scrollHeight,
              h1Text: h1?.textContent?.trim() || '',
              h1Visible: Boolean(h1 && h1.getBoundingClientRect().height > 0 && h1.getBoundingClientRect().width > 0),
              domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd || 0),
              loadMs: Math.round(nav?.loadEventEnd || 0)
            };
          });
          const overflowPx = metrics.scrollWidth - metrics.clientWidth;
          const violations = [];
          if (!response || !response.ok()) violations.push(`HTTP ${response?.status() || 'missing'}`);
          if (overflowPx > 2) violations.push(`horizontal overflow ${overflowPx}px`);
          if (!metrics.h1Visible) violations.push('h1 not visible');
          if (metrics.bodyHeight < 300) violations.push('page body too short');
          if (consoleErrors.length > 0) violations.push(`${consoleErrors.length} console errors`);
          if (metrics.domContentLoadedMs > domContentLoadedBudgetMs) violations.push(`DOMContentLoaded ${metrics.domContentLoadedMs}ms`);

          if (violations.length) {
            for (const issue of violations) findings.push({ engine: engine.id, page: pagePath, viewport: viewport.id, issue });
          }
          results.push({
            engine: engine.id,
            viewport: viewport.id,
            page: pagePath,
            http_status: response?.status() || 0,
            console_errors: consoleErrors.length,
            metrics,
            violations
          });
          await page.close();
        }
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}

const status = findings.length === 0 ? 'PASS' : 'FAIL';
const report = {
  schema: 'eventlive.browser-matrix-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    engines: engines.length,
    viewports: viewports.length,
    pages: pages.length,
    checks: results.length,
    findings: findings.length
  },
  results,
  findings
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'browser-matrix-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'browser-matrix-audit.md'),
  [
    '# EventLive Browser Matrix Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Engines: ${engines.map((engine) => engine.id).join(', ')}`,
    `- Viewports: ${viewports.map((viewport) => viewport.id).join(', ')}`,
    `- Checks: ${results.length}`,
    `- DOMContentLoaded budget: ${domContentLoadedBudgetMs}ms`,
    `- Findings: ${findings.length}`,
    '',
    '## Findings',
    '',
    findings.length ? findings.map((item) => `- ${item.engine}/${item.viewport}/${item.page}: ${item.issue}`).join('\n') : '- None',
    ''
  ].join('\n'),
  'utf8'
);

if (status !== 'PASS') {
  for (const finding of findings) {
    console.error(`BROWSER_MATRIX_FINDING engine=${finding.engine} viewport=${finding.viewport} page=${finding.page} issue=${finding.issue}`);
  }
  console.error(`BROWSER_MATRIX_FAIL findings=${findings.length}`);
  process.exit(1);
}

console.log(`BROWSER_MATRIX_OK checks=${results.length}`);
