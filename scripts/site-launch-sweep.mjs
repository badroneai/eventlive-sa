import fs from 'node:fs';
import path from 'node:path';
import { OWNER_ONLY_PAGES } from './owner-only-pages.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const reportJsonPath = path.join(reportsDir, 'site-launch-sweep.json');
const reportMdPath = path.join(reportsDir, 'site-launch-sweep.md');

const launchPages = [
  'activation.html',
  'audiences.html',
  'candidates.html',
  'categories.html',
  'cities.html',
  'event.html',
  'events.html',
  'guide-ended-events-value.html',
  'guide-event-sources-methodology.html',
  'guide-live-events-saudi.html',
  'guide-online-tech-courses-saudi.html',
  'guide-organizers-live-schedule.html',
  'guide-riyadh-events-live.html',
  'guide-saudi-events-data.html',
  'guide-summer-events-saudi.html',
  'guides.html',
  'index.html',
  'my-events.html',
  'methodology.html',
  'organizer-intake.html',
  'organizers.html',
  'print.html',
  'readiness.html',
  'regions.html',
  'resolver.html',
  'screen.html',
  'share.html',
  'signage.html',
  'sources.html',
  'source-health.html',
  'source-coverage-gaps.html',
  'this-month.html',
  'this-week.html',
  'today-events.html',
  'today.html',
  'trust.html',
  'updates.html'
  // weekend.html is deliberately absent: it is now a redirect stub
  // (LEGACY_TOP_LEVEL_REDIRECTS in scripts/legacy-redirect-pages.mjs) that
  // forwards to saudi-events-weekend.html, the same treatment legacy category
  // redirect stubs already get — they are excluded from the sitemap and from
  // this "launched page" quality list, not evaluated as first-class content.
];
// WO-4: single source of truth — scripts/owner-only-pages.mjs. Pages in
// this set are exempt from the sitemap-presence check below (they must NOT
// be in the sitemap); the page-quality checks in checkPage() still apply.

const forbiddenDistPaths = [
  'archive-browser.html',
  'diff.html',
  'diffs',
  'delivery-package',
  'current-delivery-manifest.json',
  'current-delivery-manifest.md',
  'current-live-site.json',
  'current-release-bundle.json',
  'handoff-notes.md',
  'share-kit.json',
  'share-kit.md',
  'qr-placeholder.txt'
];

const forbiddenPublicMarkers = [
  /example\.test/i,
  /eventlive-sa\//i,
  /latest approved release/i,
  /Handoff Notes/i,
  /QR placeholder/i
];

function readDist(relativePath) {
  return fs.readFileSync(path.join(distDir, relativePath), 'utf8');
}

function has(pattern, value) {
  return pattern.test(value);
}

function titleOf(html) {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || '';
}

function checkPage(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    return {
      page: relativePath,
      ok: false,
      title: '',
      errors: ['missing page']
    };
  }

  const html = readDist(relativePath);
  const errors = [];
  if (!has(/<html[^>]+lang="ar(?:-SA)?"[^>]+dir="rtl"|<html[^>]+dir="rtl"[^>]+lang="ar(?:-SA)?"/i, html)) errors.push('missing Arabic RTL html attributes');
  if (!has(/<link rel="canonical" href="https:\/\/eventme\.live\//i, html)) errors.push('missing eventme.live canonical');
  if (!has(/<meta name="description" content="[^"]{40,}"/i, html)) errors.push('missing useful meta description');
  if (!has(/<meta property="og:site_name" content="EventLive"/i, html)) errors.push('missing EventLive OpenGraph site name');
  if (!has(/<link rel="manifest" href=/i, html)) errors.push('missing PWA manifest link');
  if (has(/\bEventMe\b/, html) || has(/Event Life|eventlife|eventlive\.sa/i, html)) errors.push('legacy brand/domain text visible');
  if (has(/Users\/baderalsalman|\/Users\//i, html)) errors.push('local filesystem path leaked');

  return {
    page: relativePath,
    ok: errors.length === 0,
    title: titleOf(html),
    json_ld_blocks: (html.match(/application\/ld\+json/g) || []).length,
    errors
  };
}

const pageChecks = launchPages.map(checkPage);
const forbidden = forbiddenDistPaths
  .filter((relativePath) => fs.existsSync(path.join(distDir, relativePath)))
  .map((relativePath) => ({ path: relativePath, error: 'forbidden stale public artifact exists' }));

function walkPublicTextFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkPublicTextFiles(fullPath));
    } else if (/\.(html|json|xml|txt|md|js|css|webmanifest|svg)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const forbiddenPublicContent = walkPublicTextFiles(distDir)
  .flatMap((filePath) => {
    const text = fs.readFileSync(filePath, 'utf8');
    return forbiddenPublicMarkers
      .filter((pattern) => pattern.test(text))
      .map((pattern) => ({
        path: path.relative(distDir, filePath).replace(/\\/g, '/'),
        error: `forbidden public marker: ${pattern.source}`
      }));
  });

const requiredFiles = ['sitemap.xml', 'robots.txt', 'manifest.webmanifest', 'sw.js', 'events.json', 'cities.json', 'categories.json', 'audiences.json', 'methodology.json', 'organizer-intake.json', 'this-month.json', 'source-coverage-gaps.json', 'regions.json'];
const missingRequiredFiles = requiredFiles.filter((relativePath) => !fs.existsSync(path.join(distDir, relativePath)));
const sitemap = fs.existsSync(path.join(distDir, 'sitemap.xml')) ? readDist('sitemap.xml') : '';
const sitemapMissing = launchPages
  .filter((relativePath) => !OWNER_ONLY_PAGES.has(relativePath))
  .filter((relativePath) => !sitemap.includes(`https://eventme.live/${relativePath === 'index.html' ? '' : relativePath}`));
const sitemapLeaked = launchPages
  .filter((relativePath) => OWNER_ONLY_PAGES.has(relativePath))
  .filter((relativePath) => sitemap.includes(`https://eventme.live/${relativePath === 'index.html' ? '' : relativePath}`));

const failedPages = pageChecks.filter((check) => !check.ok);
const ok = failedPages.length === 0 && forbidden.length === 0 && forbiddenPublicContent.length === 0 && missingRequiredFiles.length === 0 && sitemapMissing.length === 0 && sitemapLeaked.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  intent: 'eventlive-launch-sweep',
  ok,
  totals: {
    pages_checked: pageChecks.length,
    pages_failed: failedPages.length,
    forbidden_artifacts: forbidden.length,
    forbidden_public_content: forbiddenPublicContent.length,
    missing_required_files: missingRequiredFiles.length,
    sitemap_missing: sitemapMissing.length,
    sitemap_leaked: sitemapLeaked.length
  },
  page_checks: pageChecks,
  forbidden,
  forbidden_public_content: forbiddenPublicContent,
  missing_required_files: missingRequiredFiles,
  sitemap_missing: sitemapMissing,
  sitemap_leaked: sitemapLeaked
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(reportMdPath, [
  '# EventLive Launch Sweep',
  '',
  `- Generated at: ${report.generated_at}`,
  `- Status: ${ok ? 'PASS' : 'FAIL'}`,
  `- Pages checked: ${report.totals.pages_checked}`,
  `- Pages failed: ${report.totals.pages_failed}`,
  `- Forbidden stale artifacts: ${report.totals.forbidden_artifacts}`,
  `- Forbidden public content markers: ${report.totals.forbidden_public_content}`,
  `- Missing required files: ${report.totals.missing_required_files}`,
  `- Sitemap missing pages: ${report.totals.sitemap_missing}`,
  `- Sitemap leaked owner-only pages: ${report.totals.sitemap_leaked}`,
  '',
  '| Page | Status | JSON-LD | Title |',
  '|---|---:|---:|---|',
  ...pageChecks.map((check) => `| ${check.page} | ${check.ok ? 'PASS' : `FAIL: ${check.errors.join('; ')}`} | ${check.json_ld_blocks || 0} | ${check.title.replace(/\|/g, '/')} |`),
  '',
  forbidden.length ? '## Forbidden Artifacts' : '',
  ...forbidden.map((item) => `- ${item.path}: ${item.error}`),
  forbiddenPublicContent.length ? '## Forbidden Public Content' : '',
  ...forbiddenPublicContent.map((item) => `- ${item.path}: ${item.error}`),
  missingRequiredFiles.length ? '## Missing Required Files' : '',
  ...missingRequiredFiles.map((item) => `- ${item}`),
  sitemapMissing.length ? '## Sitemap Missing' : '',
  ...sitemapMissing.map((item) => `- ${item}`),
  sitemapLeaked.length ? '## Sitemap Leaked Owner-Only Pages' : '',
  ...sitemapLeaked.map((item) => `- ${item}`),
  ''
].filter(Boolean).join('\n'), 'utf8');

if (!ok) {
  console.error(`SITE_LAUNCH_SWEEP_FAIL pages_failed=${failedPages.length} forbidden=${forbidden.length} forbidden_public_content=${forbiddenPublicContent.length} missing_required=${missingRequiredFiles.length} sitemap_missing=${sitemapMissing.length} sitemap_leaked=${sitemapLeaked.length}`);
  process.exit(1);
}

console.log(`SITE_LAUNCH_SWEEP_OK pages=${pageChecks.length} forbidden=0 missing_required=0 sitemap_missing=0`);
