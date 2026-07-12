import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  fileFingerprint,
  fileHash,
  incrementalBuildDecision,
  riyadhDate,
  sha256
} from './incremental-build-utils.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const cacheDir = path.join(root, '.eventlive-cache');
const reportsDir = path.join(root, 'reports');
const distStatePath = path.join(distDir, '.eventlive-build-state.json');
const cacheStatePath = path.join(cacheDir, 'site-build-state.json');
const reportJsonPath = path.join(reportsDir, 'incremental-build-report.json');
const reportMdPath = path.join(reportsDir, 'incremental-build-report.md');
const forceFull = ['1', 'true', 'yes', 'on'].includes(String(process.env.EVENTLIVE_FORCE_FULL_BUILD || '').toLowerCase());
const fullIntervalHours = Math.max(6, Number(process.env.EVENTLIVE_FULL_BUILD_INTERVAL_HOURS || 24));
const startedAt = Date.now();

const templateInputs = [
  'package.json',
  'package-lock.json',
  'locales/en-SA-static.json',
  'scripts/run-smart-build.mjs',
  'scripts/incremental-build-utils.mjs',
  'scripts/generate-site.mjs',
  'scripts/generate-localized-site.mjs',
  'scripts/arabic-normalize.mjs',
  'scripts/audience-utils.mjs',
  'scripts/city-utils.mjs',
  'scripts/event-kind-utils.mjs',
  'scripts/event-structured-data-utils.mjs',
  'scripts/image-asset-utils.mjs',
  'scripts/seo-discovery-utils.mjs',
  'scripts/venue-location-utils.mjs'
];

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function currentCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function changedPathsSince(previousCommit, nextCommit) {
  if (!previousCommit || !nextCommit || previousCommit === nextCommit) return [];
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', previousCommit, nextCommit], { cwd: root, stdio: 'ignore' });
    return execFileSync('git', ['diff', '--name-only', `${previousCommit}..${nextCommit}`], { cwd: root, encoding: 'utf8' })
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return ['__history_unavailable__'];
  }
}

function htmlCount(directory) {
  if (!fs.existsSync(directory)) return 0;
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .length;
}

function requiredOutputsPresent() {
  return [
    'events.json',
    'events.html',
    'sitemap.xml',
    'locale-routes.json',
    'en/events.html'
  ].every((relativePath) => fs.existsSync(path.join(distDir, relativePath)));
}

function runGenerator(mode, { forceSeoRefresh = false } = {}) {
  const env = {
    ...process.env,
    EVENTLIVE_INCREMENTAL_BUILD: mode === 'incremental' ? 'true' : 'false',
    EVENTLIVE_FORCE_SEO_REFRESH: forceSeoRefresh ? 'true' : 'false',
    EVENTLIVE_SMART_BUILD_ACTIVE: 'true'
  };
  for (const script of ['scripts/generate-site.mjs', 'scripts/generate-localized-site.mjs']) {
    const result = spawnSync(process.execPath, [script], { cwd: root, env, stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`${script} exited with ${result.status ?? 'unknown status'}`);
  }
}

function sitemapPathToFile(urlValue) {
  const url = new URL(urlValue);
  let pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!pathname) pathname = 'index.html';
  return path.join(distDir, pathname.normalize('NFC'));
}

function validateOutputContract() {
  const failures = [];
  const sitemapPath = path.join(distDir, 'sitemap.xml');
  const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/eventme\.live\/[^<]*)<\/loc>/g)].map((match) => match[1]);
  if (!urls.length) failures.push('sitemap has no public URLs');
  for (const url of urls) {
    if (!url.endsWith('/') && !url.endsWith('.html')) continue;
    const filePath = sitemapPathToFile(url);
    if (!fs.existsSync(filePath)) failures.push(`missing ${path.relative(root, filePath)}`);
  }
  const events = readJson(path.join(distDir, 'events.json'), { events: [] }).events || [];
  const routes = readJson(path.join(distDir, 'locale-routes.json'), { routes: [] }).routes || [];
  if (htmlCount(path.join(distDir, 'events')) < events.length) failures.push('Arabic event detail count is below public event count');
  if (htmlCount(path.join(distDir, 'en', 'events')) < events.length) failures.push('English event detail count is below public event count');
  if (!routes.length) failures.push('localized route registry is empty');
  return { ok: failures.length === 0, failures, events: events.length, routes: routes.length };
}

function writeReport(report) {
  writeJson(reportJsonPath, report);
  const lines = [
    '# EventLive Incremental Build Report',
    '',
    `- built_at: ${report.built_at}`,
    `- requested_mode: ${report.requested_mode}`,
    `- completed_mode: ${report.completed_mode}`,
    `- fallback_full_build: ${report.fallback_full_build}`,
    `- duration_seconds: ${report.duration_seconds}`,
    `- events: ${report.events}`,
    `- localized_routes: ${report.localized_routes}`,
    `- reasons: ${report.reasons.join(', ')}`,
    `- cache_key: ${report.cache_key}`,
    `- output_contract: ${report.output_contract ? 'PASS' : 'FAIL'}`
  ];
  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');
}

fs.mkdirSync(cacheDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });
const templateFingerprint = fileFingerprint(root, templateInputs);
const previousState = readJson(distStatePath, readJson(cacheStatePath, null));
const commit = currentCommit();
const seoStatePath = path.join(root, 'data', 'seo_page_state.json');
const decision = incrementalBuildDecision({
  forceFull,
  state: previousState,
  templateFingerprint,
  seoStateHash: fileHash(seoStatePath),
  requiredOutputsPresent: requiredOutputsPresent(),
  eventArtifactCount: htmlCount(path.join(distDir, 'events')),
  englishEventArtifactCount: htmlCount(path.join(distDir, 'en', 'events')),
  changedPathsSinceState: changedPathsSince(previousState?.source_commit, commit),
  now: new Date(),
  fullIntervalHours
});

let completedMode = decision.mode;
let fallbackFullBuild = false;
let contract;
const forceSeoRefresh = decision.reasons.some((reason) => [
  'build-template-changed',
  'public-template-history-changed'
].includes(reason));
try {
  runGenerator(decision.mode, { forceSeoRefresh });
  contract = validateOutputContract();
  if (!contract.ok) throw new Error(contract.failures.slice(0, 5).join('; '));
} catch (error) {
  if (decision.mode !== 'incremental') throw error;
  console.warn(`INCREMENTAL_BUILD_FALLBACK ${error.message}`);
  fallbackFullBuild = true;
  completedMode = 'full';
  runGenerator('full', { forceSeoRefresh });
  contract = validateOutputContract();
  if (!contract.ok) throw new Error(`full build output contract failed: ${contract.failures.slice(0, 5).join('; ')}`);
}

const builtAt = new Date().toISOString();
const nextState = {
  schema: 'eventlive.incremental-build-state.v1',
  built_at: builtAt,
  last_full_build_at: completedMode === 'full' ? builtAt : previousState.last_full_build_at,
  completed_mode: completedMode,
  source_commit: commit,
  template_fingerprint: templateFingerprint,
  seo_state_hash: fileHash(seoStatePath),
  event_count: contract.events,
  route_count: contract.routes,
  full_interval_hours: fullIntervalHours
};
writeJson(distStatePath, nextState);
writeJson(cacheStatePath, nextState);
const cacheKey = `${riyadhDate(new Date())}-${sha256(`${templateFingerprint}|${nextState.seo_state_hash}`).slice(0, 20)}`;
fs.writeFileSync(path.join(cacheDir, 'site-cache-key.txt'), `${cacheKey}\n`, 'utf8');
const report = {
  built_at: builtAt,
  requested_mode: decision.mode,
  completed_mode: completedMode,
  fallback_full_build: fallbackFullBuild,
  duration_seconds: Math.round((Date.now() - startedAt) / 100) / 10,
  events: contract.events,
  localized_routes: contract.routes,
  reasons: decision.reasons,
  cache_key: cacheKey,
  output_contract: contract.ok
};
writeReport(report);
console.log(`# EventLive Smart Build\n- Requested: ${report.requested_mode}\n- Completed: ${report.completed_mode}\n- Duration: ${report.duration_seconds}s\n- Events: ${report.events}\n- Routes: ${report.localized_routes}\n- Output contract: PASS\n- Cache key: ${report.cache_key}`);
