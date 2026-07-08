import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();

const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'reports', 'output', '.codebase-memory']);
const scriptFiles = [];
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
      scriptFiles.push(path.relative(root, fullPath));
    }
  }
}

function normalizeScriptCommand(command) {
  return command
    .split(/\s+&&\s+|\s+\|\|\s+|;\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractNodeScriptReferences(command) {
  const refs = [];
  for (const part of normalizeScriptCommand(command)) {
    const match = part.match(/(?:^|\s)node\s+([^\s]+\.mjs)(?:\s|$)/);
    if (match) refs.push(match[1]);
  }
  return refs;
}

walk(path.join(root, 'scripts'));

const syntaxChecks = scriptFiles.map((relativePath) => {
  const result = spawnSync(process.execPath, ['--check', relativePath], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
  return {
    file: relativePath,
    ok: result.status === 0,
    stderr: (result.stderr || '').trim()
  };
});

const packageScriptRefs = [];
for (const [name, command] of Object.entries(packageJson.scripts || {})) {
  for (const ref of extractNodeScriptReferences(command)) {
    packageScriptRefs.push({
      npm_script: name,
      reference: ref,
      exists: fs.existsSync(path.join(root, ref))
    });
  }
}

const riskyPatterns = [
  {
    id: 'destructive-rm-rf',
    pattern: /\brm\s+-rf\b/,
    severity: 'high',
    description: 'Destructive rm -rf command should not appear in automation scripts.'
  },
  {
    id: 'hardcoded-localhost-production-link',
    pattern: /https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i,
    severity: 'medium',
    description: 'Localhost URLs should not leak into production-facing source files.'
  },
  {
    id: 'eval-constructor',
    pattern: /\beval\s*\(|new\s+Function\s*\(/,
    severity: 'medium',
    description: 'Dynamic code execution needs explicit review.'
  }
];

const scannedFiles = [
  ...scriptFiles,
  '.github/workflows/deploy.yml',
  'package.json',
  'scripts/README.md'
].filter((relativePath) => fs.existsSync(path.join(root, relativePath)));

const riskFindings = [];
for (const relativePath of scannedFiles) {
  if (relativePath === 'scripts/static-analysis-audit.mjs') continue;
  const text = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of riskyPatterns) {
      if (rule.pattern.test(line)) {
        riskFindings.push({
          rule: rule.id,
          severity: rule.severity,
          file: relativePath,
          line: index + 1,
          description: rule.description
        });
      }
    }
  });
}

const missingPackageRefs = packageScriptRefs.filter((item) => !item.exists);
const syntaxFailures = syntaxChecks.filter((item) => !item.ok);
const highRiskFindings = riskFindings.filter((item) => item.severity === 'high');
const status = syntaxFailures.length === 0 && missingPackageRefs.length === 0 && highRiskFindings.length === 0 ? 'PASS' : 'FAIL';

const report = {
  schema: 'eventlive.static-analysis-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    script_files_checked: syntaxChecks.length,
    syntax_failures: syntaxFailures.length,
    package_script_references: packageScriptRefs.length,
    missing_package_script_references: missingPackageRefs.length,
    risky_findings: riskFindings.length,
    high_risk_findings: highRiskFindings.length
  },
  syntax_checks: syntaxChecks,
  package_script_references: packageScriptRefs,
  risky_findings: riskFindings
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'static-analysis-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const rows = [
  ['Script files checked', report.summary.script_files_checked],
  ['Syntax failures', report.summary.syntax_failures],
  ['Package script refs', report.summary.package_script_references],
  ['Missing script refs', report.summary.missing_package_script_references],
  ['Risk findings', report.summary.risky_findings],
  ['High risk findings', report.summary.high_risk_findings]
];

const md = [
  '# EventLive Static Analysis Audit',
  '',
  `- Generated at: ${generatedAt}`,
  `- Status: ${status}`,
  '',
  '| Metric | Value |',
  '| --- | ---: |',
  ...rows.map(([label, value]) => `| ${label} | ${value} |`),
  '',
  '## Blocking Findings',
  '',
  syntaxFailures.length || missingPackageRefs.length || highRiskFindings.length
    ? [
        ...syntaxFailures.map((item) => `- Syntax: ${item.file} ${item.stderr}`),
        ...missingPackageRefs.map((item) => `- Missing script: ${item.npm_script} -> ${item.reference}`),
        ...highRiskFindings.map((item) => `- ${item.rule}: ${item.file}:${item.line}`)
      ].join('\n')
    : '- None',
  ''
].join('\n');

fs.writeFileSync(path.join(reportsDir, 'static-analysis-audit.md'), md, 'utf8');

if (status !== 'PASS') {
  console.error(`STATIC_ANALYSIS_FAIL syntax=${syntaxFailures.length} missing_refs=${missingPackageRefs.length} high_risk=${highRiskFindings.length}`);
  process.exit(1);
}

console.log(`STATIC_ANALYSIS_OK files=${syntaxChecks.length} missing_refs=0 high_risk=0`);
