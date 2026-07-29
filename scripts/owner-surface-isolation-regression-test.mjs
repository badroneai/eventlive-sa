// WO-4: operational pages (fetch health / coverage gaps / region coverage /
// readiness / activation / live-ops) must never leak into the public site.
//
// Root cause was three literal <a href> links to source-health.html,
// source-coverage-gaps.html and regions.html hard-coded in the shared
// "المزيد" header markup that every public dist/**.html page carries, while
// hideOwnerOnlyPublicLinks() (scripts/generate-site.mjs) only stripped
// sources.html/methodology.html/trust.html links. The fix bans the whole
// class via a single OWNER_ONLY_PAGES constant (scripts/owner-only-pages.mjs)
// consumed by every owner-only surface. This test sweeps the built dist/
// output and asserts the class stays banned:
//   1. no public dist/**.html page (excluding the owner pages themselves)
//      links to an owner-only page,
//   2. every owner-only page that exists in dist/ is noindex,
//   3. no owner-only page appears in dist/sitemap.xml.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OWNER_ONLY_PAGES, ownerOnlyLinkRegex } from './owner-only-pages.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');

assert.equal(fs.existsSync(distDir), true, 'dist directory must exist; run npm run build first');

function walkHtml(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkHtml(fullPath));
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

const htmlFiles = walkHtml(distDir);
assert.ok(htmlFiles.length > 0, 'expected at least one built HTML page under dist/');

const isOwnerOnlyFile = (filePath) => {
  const relativePath = path.relative(distDir, filePath).replace(/\\/g, '/');
  const pageName = path.basename(filePath);
  return OWNER_ONLY_PAGES.has(relativePath) || OWNER_ONLY_PAGES.has(pageName);
};

// 1. Zero owner-only links from any public page.
const leaks = [];
for (const filePath of htmlFiles) {
  if (isOwnerOnlyFile(filePath)) continue; // owner pages may link to each other (owner-status.html hub)
  const html = fs.readFileSync(filePath, 'utf8');
  const matches = html.match(ownerOnlyLinkRegex());
  if (matches) {
    leaks.push(`${path.relative(distDir, filePath)}: ${matches.join(' | ')}`);
  }
}
assert.deepEqual(leaks, [], `public pages must not link to owner-only pages:\n${leaks.join('\n')}`);

// 2. Every owner-only page that was actually built must be noindex.
const missingNoindex = [];
const builtOwnerPages = [];
for (const pageName of OWNER_ONLY_PAGES) {
  const filePath = path.join(distDir, pageName);
  if (!fs.existsSync(filePath)) continue; // e.g. live-ops.html is not part of the dist build
  builtOwnerPages.push(pageName);
  const html = fs.readFileSync(filePath, 'utf8');
  if (!/<meta\s+name="robots"\s+content="noindex/i.test(html)) {
    missingNoindex.push(pageName);
  }
}
assert.ok(builtOwnerPages.length > 0, 'expected at least one owner-only page to exist in dist/ to validate against');
assert.deepEqual(missingNoindex, [], `owner-only pages must be noindex:\n${missingNoindex.join('\n')}`);

// 3. No owner-only page in sitemap.xml.
const sitemapPath = path.join(distDir, 'sitemap.xml');
assert.equal(fs.existsSync(sitemapPath), true, 'dist/sitemap.xml must exist');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const sitemapLeaks = builtOwnerPages.filter((pageName) => sitemap.includes(`/${pageName}<`) || sitemap.includes(`/${pageName}"`));
assert.deepEqual(sitemapLeaks, [], `owner-only pages must be absent from sitemap.xml:\n${sitemapLeaks.join('\n')}`);

console.log(`OWNER_SURFACE_ISOLATION_OK pages_checked=${htmlFiles.length} owner_pages=${builtOwnerPages.length}`);
