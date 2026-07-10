import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import axe from 'axe-core';
import { chromium } from 'playwright';
import { representativeEventPath } from './audit-page-utils.mjs';

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
    await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axe.source });
    const result = await page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      });
    });
    results.push({
      page: pagePath,
      violations: result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failure_summary: node.failureSummary
        }))
      })),
      passes: result.passes.length,
      incomplete: result.incomplete.length
    });
    await page.close();
  }
} finally {
  await context.close();
  await browser.close();
  server.close();
}

const totalViolations = results.reduce((sum, item) => sum + item.violations.length, 0);
const seriousViolations = results.reduce((sum, item) => sum + item.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)).length, 0);
const score = totalViolations === 0 ? 100 : Math.max(0, 100 - totalViolations * 5 - seriousViolations * 10);
const status = totalViolations === 0 && score >= 95 ? 'PASS' : 'FAIL';

const report = {
  schema: 'eventlive.axe-accessibility-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    pages: pages.length,
    score,
    violations: totalViolations,
    serious_violations: seriousViolations,
    threshold: 95
  },
  pages: results
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'axe-accessibility-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'axe-accessibility-audit.md'),
  [
    '# EventLive Axe Accessibility Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Score: ${score}`,
    `- Violations: ${totalViolations}`,
    `- Serious/Critical: ${seriousViolations}`,
    '',
    '## Findings',
    '',
    totalViolations
      ? results.flatMap((item) => item.violations.map((violation) => `- ${item.page}: ${violation.id} (${violation.impact}) nodes=${violation.nodes.length} targets=${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).join('\n')
      : '- None',
    ''
  ].join('\n'),
  'utf8'
);

if (status !== 'PASS') {
  console.error(`AXE_ACCESSIBILITY_FAIL violations=${totalViolations} score=${score}`);
  process.exit(1);
}

console.log(`AXE_ACCESSIBILITY_OK pages=${pages.length} score=${score}`);
