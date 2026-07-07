import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return [fullPath];
  });
}

function extractJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

const htmlFiles = walkFiles(distDir)
  .filter((filePath) => filePath.endsWith('.html'))
  .sort((a, b) => a.localeCompare(b));
const ownerOnlyPages = new Set(['sources.html', 'methodology.html', 'trust.html']);

assert.ok(htmlFiles.length >= 100, 'site design coverage must inspect the generated static site, not just a few pages');

const failures = [];
for (const filePath of htmlFiles) {
  const relativePath = path.relative(distDir, filePath).replace(/\\/g, '/');
  const html = fs.readFileSync(filePath, 'utf8');
  const errors = [];

  if (!/<html[^>]+lang="ar"[^>]+dir="rtl"|<html[^>]+dir="rtl"[^>]+lang="ar"/i.test(html)) errors.push('missing Arabic RTL html attributes');
  if (!/<link rel="canonical" href="https:\/\/eventme\.live\//i.test(html)) errors.push('missing eventme.live canonical');
  if (!/<meta name="description" content="[^"]{40,}"/i.test(html)) errors.push('missing useful meta description');
  if (!/<meta property="og:site_name" content="EventLive"/i.test(html)) errors.push('missing EventLive OpenGraph site name');
  if (!/<link rel="manifest" href=/i.test(html)) errors.push('missing PWA manifest link');
  if (/\bEventMe\b/.test(html) || /Event Life|eventlife|eventlive\.sa/i.test(html)) errors.push('legacy brand/domain text visible');
  if (/Users\/baderalsalman|\/Users\//i.test(html)) errors.push('local filesystem path leaked');
  if (!/EventLive/.test(html)) errors.push('missing EventLive brand surface');
  if (!/IBM Plex Sans Arabic/.test(html)) errors.push('missing EventLive Arabic font');
  if (!ownerOnlyPages.has(relativePath) && /<a\b[^>]*href=(["'])(?:\.\.\/|\.\/)?(?:sources|methodology|trust)\.html\1/i.test(html)) {
    errors.push('public page links to owner-only sources/methodology pages');
  }
  if (!ownerOnlyPages.has(relativePath) && /<a\b[^>]*href=(["'])(?:\.\.\/|\.\/)?events\.json\1/i.test(html)) {
    errors.push('public page links to owner-only events.json');
  }

  let jsonLd = [];
  try {
    jsonLd = extractJsonLd(html);
  } catch (error) {
    errors.push(`invalid JSON-LD: ${error.message}`);
  }
  if (!jsonLd.length) errors.push('missing JSON-LD');
  if (jsonLd.length && !jsonLd.some((entry) => ['WebPage', 'CollectionPage', 'Event', 'ContactPage', 'Article'].includes(entry['@type']))) {
    errors.push('JSON-LD lacks a page/event level type');
  }

  if (errors.length) failures.push({ file: relativePath, errors });
}

assert.deepEqual(failures, [], `site design coverage failures:\n${JSON.stringify(failures.slice(0, 40), null, 2)}`);

console.log(`site-design-coverage-regression-test: ok html=${htmlFiles.length}`);
