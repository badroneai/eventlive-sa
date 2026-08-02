import fs from 'node:fs';
import path from 'node:path';
import { workflowRunsScript } from './workflow-gate-resolver.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();

function readJson(relativePath, fallback = null) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return fallback;
  }
}

function readText(relativePath, fallback = '') {
  const fullPath = path.join(root, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : fallback;
}

function htmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(fullPath);
    return entry.name.endsWith('.html') ? [path.relative(distDir, fullPath)] : [];
  });
}

const findings = [];
const webQuality = readJson('reports/web-quality-audit.json', {});
const secretEnv = readJson('reports/secret-env-audit.json', {});
const compliance = readJson('reports/compliance-source-rights-audit.json', {});
const staticAnalysis = readJson('reports/static-analysis-audit.json', {});
const workflow = readText('.github/workflows/deploy.yml');
const robots = readText('dist/robots.txt');
const sitemap = readText('dist/sitemap.xml');
const manifest = readJson('dist/manifest.webmanifest', {});
const publicHtmlFiles = htmlFiles(distDir);
const ownerOnlyHtml = ['sources.html', 'methodology.html', 'trust.html', 'source-health.html', 'owner-status.html', 'candidates.html', 'resolver.html'];
const ownerOnlyMachine = ['events.json', 'events-catalog.json', 'sources.json', 'methodology.json', 'trust.json', 'owner-status.json'];
const ownerOnly = [...ownerOnlyHtml, ...ownerOnlyMachine];

if (webQuality?.summary?.security_status !== 'PASS') findings.push({ area: 'web-quality', issue: 'security baseline not passing' });
if (secretEnv?.status !== 'PASS') findings.push({ area: 'secrets', issue: 'secret/env audit not passing' });
if (compliance?.status !== 'PASS') findings.push({ area: 'compliance', issue: 'compliance/source-rights audit not passing' });
if (staticAnalysis?.status !== 'PASS') findings.push({ area: 'static-analysis', issue: 'static analysis not passing' });

for (const script of ['audit:dependencies', 'audit:secret-env', 'audit:static', 'audit:web-quality']) {
  // Resolved through scripts/workflow-gate-resolver.mjs, not a direct
  // substring check: these scripts now run inside the shared
  // ci:publish-quality-gates battery (governance fix 2026-08-02, see
  // GATES-GOVERNANCE.md #5) rather than as individually named steps, so a
  // literal `workflow.includes(script)` would wrongly report them missing
  // even though they still run in CI exactly as before.
  if (!workflowRunsScript(workflow, script)) findings.push({ area: 'ci', issue: `workflow missing ${script}` });
}

for (const page of ownerOnlyMachine) {
  if (!robots.includes(`Disallow: /${page}`)) findings.push({ area: 'robots', issue: `robots missing disallow for ${page}` });
}

for (const page of ownerOnlyHtml) {
  const pagePath = path.join(distDir, page);
  if (!fs.existsSync(pagePath)) {
    findings.push({ area: 'owner-only', issue: `owner-only page missing: ${page}` });
    continue;
  }
  const html = fs.readFileSync(pagePath, 'utf8');
  if (!/<meta name="robots" content="noindex,nofollow"/i.test(html)) {
    findings.push({ area: 'owner-only', issue: `owner-only page missing readable noindex: ${page}` });
  }
}

for (const page of ownerOnly) {
  if (sitemap.includes(`/${page}`)) findings.push({ area: 'sitemap', issue: `owner-only page in sitemap: ${page}` });
}

const shortcutUrls = Array.isArray(manifest.shortcuts) ? manifest.shortcuts.map((item) => item.url || '') : [];
for (const page of ownerOnly) {
  if (shortcutUrls.some((url) => url.includes(page))) findings.push({ area: 'manifest', issue: `owner-only shortcut exposed: ${page}` });
}

let targetBlankIssues = 0;
let httpResourceIssues = 0;
for (const relativePath of publicHtmlFiles) {
  const html = fs.readFileSync(path.join(distDir, relativePath), 'utf8');
  const blankLinks = [...html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)];
  for (const [tag] of blankLinks) {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1] || '';
    if (!/\bnoopener\b/i.test(rel) || !/\bnoreferrer\b/i.test(rel)) targetBlankIssues += 1;
  }
  const httpResources = [
    ...html.matchAll(/\b(?:src)=["'](http:\/\/[^"']+)["']/gi),
    ...html.matchAll(/<link\b[^>]*\bhref=["'](http:\/\/[^"']+)["'][^>]*>/gi)
  ]
    .map((match) => match[1])
    .filter((url) => !url.includes('schema.org'));
  httpResourceIssues += httpResources.length;
}

if (targetBlankIssues > 0) findings.push({ area: 'links', issue: `${targetBlankIssues} target=_blank links missing rel protections` });
if (httpResourceIssues > 0) findings.push({ area: 'links', issue: `${httpResourceIssues} insecure http resources` });

const status = findings.length === 0 ? 'PASS' : 'FAIL';
const report = {
  schema: 'eventlive.security-review-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    public_html_files_scanned: publicHtmlFiles.length,
    findings: findings.length,
    target_blank_issues: targetBlankIssues,
    http_resource_issues: httpResourceIssues
  },
  controls: {
    web_quality_security: webQuality?.summary?.security_status || 'missing',
    secret_env_audit: secretEnv?.status || 'missing',
    static_analysis: staticAnalysis?.status || 'missing',
    compliance_source_rights: compliance?.status || 'missing',
    ci_security_steps: ['audit:dependencies', 'audit:secret-env', 'audit:static', 'audit:web-quality'].filter((script) => workflowRunsScript(workflow, script))
  },
  findings
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'security-review-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'security-review-audit.md'),
  [
    '# EventLive Security Review Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Public HTML files scanned: ${publicHtmlFiles.length}`,
    `- Findings: ${findings.length}`,
    '',
    '## Findings',
    '',
    findings.length ? findings.map((item) => `- ${item.area}: ${item.issue}`).join('\n') : '- None',
    ''
  ].join('\n'),
  'utf8'
);

if (status !== 'PASS') {
  console.error(`SECURITY_REVIEW_FAIL findings=${findings.length}`);
  process.exit(1);
}

console.log(`SECURITY_REVIEW_OK html=${publicHtmlFiles.length}`);
