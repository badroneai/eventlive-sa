import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';
import { chromium } from 'playwright';
import { representativeEventPath } from './audit-page-utils.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();

const pages = [
  '/index.html',
  '/events.html',
  '/screen.html',
  representativeEventPath()
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
    server.listen(0, '127.0.0.1', () => resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` }));
  });
}

function lighthouseChromePath() {
  const browserPath = chromium.executablePath();
  const match = browserPath.match(/^(.*[\\/])chromium-(\d+)[\\/]/);
  if (!match) return browserPath;
  const shellRoot = path.join(match[1], `chromium_headless_shell-${match[2]}`);
  for (const directory of ['chrome-headless-shell-mac-arm64', 'chrome-headless-shell-mac-x64', 'chrome-mac']) {
    const candidate = path.join(shellRoot, directory, directory === 'chrome-mac' ? 'headless_shell' : 'chrome-headless-shell');
    if (fs.existsSync(candidate)) return candidate;
  }
  return browserPath;
}

const { server, baseUrl } = await startServer();
const chromePath = lighthouseChromePath();
const chrome = await launchChrome({
  chromePath,
  chromeFlags: [
    ...(chromePath.includes('headless-shell') || chromePath.endsWith('headless_shell') ? [] : ['--headless=new']),
    '--no-sandbox',
    '--disable-gpu',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows'
  ]
});
const results = [];

async function runLighthouseWithRetry(pagePath, attempts = 2) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await lighthouse(`${baseUrl}${pagePath}`, {
        port: chrome.port,
        output: 'json',
        onlyCategories: ['performance', 'accessibility'],
        throttlingMethod: 'provided',
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 2,
          disabled: false
        }
      });
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
      console.warn(`LIGHTHOUSE_RETRY page=${pagePath} attempt=${attempt + 1} reason=${error.code || error.message}`);
    }
  }
  throw lastError;
}

try {
  for (const pagePath of pages) {
    const runnerResult = await runLighthouseWithRetry(pagePath);
    const lhr = runnerResult.lhr;
    const performanceScore = lhr.categories.performance?.score;
    const accessibilityScore = lhr.categories.accessibility?.score;
    results.push({
      page: pagePath,
      performance: performanceScore == null ? null : Math.round(performanceScore * 100),
      accessibility: accessibilityScore == null ? null : Math.round(accessibilityScore * 100),
      runtime_error: lhr.runtimeError || null,
      run_warnings: lhr.runWarnings || [],
      audits: {
        'first-contentful-paint': lhr.audits['first-contentful-paint']?.displayValue || '',
        'largest-contentful-paint': lhr.audits['largest-contentful-paint']?.displayValue || '',
        'speed-index': lhr.audits['speed-index']?.displayValue || '',
        interactive: lhr.audits.interactive?.displayValue || '',
        'total-blocking-time': lhr.audits['total-blocking-time']?.displayValue || '',
        'cumulative-layout-shift': lhr.audits['cumulative-layout-shift']?.displayValue || ''
      }
    });
  }
} finally {
  await chrome.kill();
  server.close();
}

const completeResults = results.filter((item) => item.performance != null && item.accessibility != null);
const minPerformance = completeResults.length ? Math.min(...completeResults.map((item) => item.performance)) : null;
const minAccessibility = completeResults.length ? Math.min(...completeResults.map((item) => item.accessibility)) : null;
const status = completeResults.length === results.length && minPerformance >= 90 && minAccessibility >= 95 ? 'PASS' : 'FAIL';
const report = {
  schema: 'eventlive.lighthouse-performance-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    pages: pages.length,
    chrome_path: chromePath,
    min_performance: minPerformance,
    min_accessibility: minAccessibility,
    performance_threshold: 90,
    accessibility_threshold: 95
  },
  pages: results
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'lighthouse-performance-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'lighthouse-performance-audit.md'),
  [
    '# EventLive Lighthouse Performance Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Minimum performance: ${minPerformance}`,
    `- Minimum accessibility: ${minAccessibility}`,
    '',
    '| Page | Performance | Accessibility | LCP | TBT | CLS |',
    '| --- | ---: | ---: | --- | --- | --- |',
    ...results.map((item) => `| ${item.page} | ${item.performance} | ${item.accessibility} | ${item.audits['largest-contentful-paint']} | ${item.audits['total-blocking-time']} | ${item.audits['cumulative-layout-shift']} |`),
    ''
  ].join('\n'),
  'utf8'
);

if (status !== 'PASS') {
  console.error(`LIGHTHOUSE_PERFORMANCE_FAIL min_perf=${minPerformance} min_a11y=${minAccessibility}`);
  process.exit(1);
}

console.log(`LIGHTHOUSE_PERFORMANCE_OK pages=${pages.length} min_perf=${minPerformance} min_a11y=${minAccessibility}`);
