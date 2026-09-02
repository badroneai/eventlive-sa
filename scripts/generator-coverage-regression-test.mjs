// Class ban, not a weekend.html ban.
//
// 2026-09-02 defect: dist/weekend.html and dist/en/weekend.html were
// committed static files that shipped linked from the site-wide "المزيد" nav
// menu (baked into ~300 other dist pages) and listed in dist/sitemap.xml, but
// no function in scripts/generate-site.mjs ever wrote them. The only trace of
// weekend.html in the generator was removeDeadEventLinks()'s `legacyPages`
// list, which strips dead <a href="events/...">` links from it — a
// maintenance pass, not a content generator. Every rebuild left the page's
// hero "مباشرة/جارية 8" count and its ~8 "برنامج جارٍ" cards frozen at
// whatever a hand-edit last set, permanently, since dist/ is never wiped
// between builds (scripts/generate-site.mjs only ever writes/patches
// specific files — see AGENTS.md law 5's "rebuild before trusting any
// dist-reading test", which exists precisely because dist/ persists
// build-over-build). Fixed by retiring weekend.html through the
// LEGACY_TOP_LEVEL_REDIRECTS mechanism (scripts/legacy-redirect-pages.mjs):
// it is now a meta-refresh + canonical stub to saudi-events-weekend.html,
// the live equivalent, rewritten fresh on every build.
//
// This gate bans the CLASS: any dist-root page that is either sitemapped or
// linked from another dist-root page, but whose file was NOT touched by this
// build and is not a recognized redirect stub, is a frozen artifact and must
// not ship — regardless of which filename it is.
//
// Freshness, not existence, is the invariant (AGENTS.md law 3: assert
// invariants, not wording) — a page can exist, look plausible, and still be
// dead weight from an old generator. "Written by this build" is measured by
// file mtime against the build's own recorded start time (built_at minus its
// own duration_seconds — the exact philosophy in AGENTS.md law 4: judge
// freshness by file mtime vs process start, never a report field alone),
// read from reports/incremental-build-report.json, which scripts/
// run-smart-build.mjs (`npm run build`) always writes.
//
// Scope: dist-root *.html files only (not dist/en/**, dist/events/**,
// dist/cities/**, etc.). Two reasons: (1) the defect class this gate bans is
// specifically the "static top-level page nobody re-templates" pattern
// weekend.html was; per-item detail pages (events/cities/categories) have
// their own dedicated coverage and are legitimately skipped by incremental
// builds. (2) dist/en/** can be restored from a GitHub Actions cache between
// incremental sync runs (see .github/workflows/source-sync.yml's "Restore
// incremental site cache" step) — an unchanged EN page legitimately keeps an
// old mtime there, which would make mtime-based freshness lie. The AR
// redirect-stub mechanism already ships its EN mirror language-blind (see
// published-url-ledger.mjs's isRedirectStubPath comment) and is covered by
// the existing i18n/en-surface gates; extending mtime-freshness to dist/en/**
// is a different invariant (content-hash, not mtime) and out of scope here.
//
// mtime freshness is reliable here specifically because generate-site.mjs's
// dist-root writers run unconditionally every build (full AND incremental —
// verified: two back-to-back incremental builds both bumped weekend.html's
// mtime) and re-derive their content from live catalog/build state every
// time, so a page a generator actually covers never goes stale even when its
// rendered bytes happen to repeat. That is a different thing from "was
// touched" — a page with NO writer at all just keeps whatever mtime a past
// hand-edit or long-ago build left it at, which is exactly the frozen-artifact
// signal this gate is built to catch.
//
// KNOWN_PRE_EXISTING_DEBT: while building this gate (2026-09-02) it also
// caught candidates.html, resolver.html and source-health.html — three
// OWNER_ONLY_PAGES last touched by commit b7322ac35 ("perf: ship a compact
// mobile event catalog"), the same era as weekend.html's last hand-edit, with
// zero writer in scripts/generate-site.mjs (confirmed: deleting them and
// rebuilding does not bring them back). This looks like the identical defect
// class on the owner-only surface, but fixing it requires the same
// per-page investigation weekend.html got (what should each page show now,
// is there a live equivalent to redirect to, or does a generator need to be
// written) — out of scope for the isolated weekend.html defect this gate was
// built for. Grandfathered here, explicitly, rather than silently widening
// the exemption to all owner-only pages (which would also hide a REAL future
// regression in e.g. readiness.html or owner-status.html, both of which ARE
// properly generator-covered today). Tracked for a dedicated follow-up.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isRedirectStubPath } from './published-url-ledger.mjs';

const KNOWN_PRE_EXISTING_DEBT = new Set(['candidates.html', 'resolver.html', 'source-health.html']);

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportPath = path.join(root, 'reports', 'incremental-build-report.json');

assert.ok(fs.existsSync(distDir), 'dist must exist; run npm run build first');
assert.ok(fs.existsSync(path.join(distDir, 'sitemap.xml')), 'dist/sitemap.xml must exist; run npm run build first');
assert.ok(
  fs.existsSync(reportPath),
  'reports/incremental-build-report.json must exist — it is written by `npm run build` (scripts/run-smart-build.mjs) ' +
    'and is this gate\'s freshness anchor; run npm run build first'
);

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const builtAtMs = Date.parse(report.built_at);
const durationMs = Number(report.duration_seconds || 0) * 1000;
assert.ok(Number.isFinite(builtAtMs), `reports/incremental-build-report.json built_at is not a valid timestamp: ${report.built_at}`);
// This build's own process start, computed the same way AGENTS.md law 4
// requires: mtime vs process start, not a self-reported field taken on
// faith. A small tolerance absorbs filesystem mtime granularity and clock
// skew between the build process and this gate's own fs.statSync calls.
const toleranceMs = 5000;
const buildStartMs = builtAtMs - durationMs - toleranceMs;
assert.ok(
  Number.isFinite(buildStartMs) && buildStartMs > 0,
  `could not derive a build-start timestamp from reports/incremental-build-report.json (built_at=${report.built_at}, duration_seconds=${report.duration_seconds})`
);

function isDistRootHtmlFile(name) {
  return /^[^/\\]+\.html$/i.test(name);
}

const rootHtmlFiles = fs.readdirSync(distDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && isDistRootHtmlFile(entry.name))
  .map((entry) => entry.name)
  .sort();

assert.ok(rootHtmlFiles.length >= 50, `expected dozens of dist-root HTML pages, found ${rootHtmlFiles.length} — is dist/ actually built?`);

// Every dist-root page filename this build's own pages point at via a
// same-directory relative link, e.g. href="./weekend.html". Deliberately
// generic — no page name is hardcoded — so a FUTURE frozen page (any
// filename) trips this the same way weekend.html did.
const linkedFiles = new Set();
const linkPattern = /href="\.\/([^\/"?#]+\.html)(?:[?#][^"]*)?"/gi;
for (const file of rootHtmlFiles) {
  const html = fs.readFileSync(path.join(distDir, file), 'utf8');
  for (const match of html.matchAll(linkPattern)) linkedFiles.add(match[1].normalize('NFC'));
}

// Every dist-root page filename submitted in the sitemap.
const sitemapFiles = new Set();
const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
for (const match of sitemap.matchAll(/<loc>https:\/\/eventme\.live\/([^<\/]*)<\/loc>/g)) {
  const relative = decodeURIComponent(match[1] || '').normalize('NFC');
  if (relative === '') { sitemapFiles.add('index.html'); continue; }
  if (isDistRootHtmlFile(relative)) sitemapFiles.add(relative);
}

const candidates = [...new Set([...linkedFiles, ...sitemapFiles])].sort();
assert.ok(candidates.length >= 20, `expected dozens of internally-referenced dist-root pages, found ${candidates.length}`);

const missing = [];
const frozen = [];
for (const file of candidates) {
  if (KNOWN_PRE_EXISTING_DEBT.has(file)) continue; // see header comment — tracked separately
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    missing.push(file);
    continue;
  }
  if (isRedirectStubPath(file)) continue; // recognized, deliberately-retired redirect stub
  const mtimeMs = fs.statSync(filePath).mtimeMs;
  if (mtimeMs < buildStartMs) {
    frozen.push({ file, mtime: new Date(mtimeMs).toISOString(), buildStart: new Date(buildStartMs).toISOString() });
  }
}

assert.deepEqual(
  missing,
  [],
  `dist-root page(s) linked or sitemapped but not present in dist/:\n${missing.join('\n')}`
);

assert.deepEqual(
  frozen,
  [],
  `dist-root page(s) linked or sitemapped but NOT written by this build (frozen artifact — no generator writes them; ` +
    `retire them through LEGACY_TOP_LEVEL_REDIRECTS in scripts/legacy-redirect-pages.mjs, per AGENTS.md law 10, or wire ` +
    `a generator to write them; if this is more pre-existing debt like KNOWN_PRE_EXISTING_DEBT above, add it there with ` +
    `the same investigation, don't just silence it):\n${frozen.map((entry) => `- ${entry.file} (mtime ${entry.mtime} < build start ${entry.buildStart})`).join('\n')}`
);

console.log(`generator-coverage-regression-test: ok candidates=${candidates.length} root_pages=${rootHtmlFiles.length}`);
