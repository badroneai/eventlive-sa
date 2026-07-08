import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();

const allowedGeneratedDirs = new Set(['node_modules', '.git', 'dist', 'reports', 'output', '.codebase-memory']);
const secretPatterns = [
  { id: 'aws-access-key', pattern: /AKIA[0-9A-Z]{16}/ },
  { id: 'github-token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
  { id: 'google-api-key', pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { id: 'slack-token', pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
  { id: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: 'generic-assignment-secret', pattern: /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*['"][^'"]{12,}['"]/i }
];

const envFilesAllowed = new Set(['.env.example', '.env.sample']);
const files = [];

function shouldScan(relativePath) {
  if (relativePath.includes(`${path.sep}node_modules${path.sep}`)) return false;
  if (relativePath.includes(`${path.sep}dist${path.sep}`)) return false;
  if (relativePath.includes(`${path.sep}reports${path.sep}`)) return false;
  if (relativePath.endsWith('.png') || relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg') || relativePath.endsWith('.webp')) return false;
  return true;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (allowedGeneratedDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && shouldScan(relativePath)) {
      files.push(relativePath);
    }
  }
}

walk(root);

const findings = [];
const externalPublicTokens = [];
function isRawThirdPartySnapshot(relativePath) {
  return relativePath.startsWith(`data${path.sep}raw${path.sep}`) || relativePath.startsWith('data/raw/');
}

function isPublicClientTokenFinding(relativePath, ruleId) {
  return isRawThirdPartySnapshot(relativePath) && ['google-api-key', 'generic-assignment-secret'].includes(ruleId);
}

for (const relativePath of files) {
  const basename = path.basename(relativePath);
  if (basename.startsWith('.env') && !envFilesAllowed.has(basename)) {
    findings.push({
      rule: 'env-file-present',
      file: relativePath,
      line: 1,
      evidence: 'Environment file should not be committed.'
    });
    continue;
  }

  let text = '';
  try {
    text = fs.readFileSync(path.join(root, relativePath), 'utf8');
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/example|placeholder|YOUR_|REPLACE_ME/i.test(line)) return;
    for (const rule of secretPatterns) {
      if (rule.pattern.test(line)) {
        const finding = {
          rule: rule.id,
          file: relativePath,
          line: index + 1,
          evidence: line.trim().slice(0, 120)
        };
        if (isPublicClientTokenFinding(relativePath, rule.id)) {
          externalPublicTokens.push({
            ...finding,
            classification: 'third-party-public-client-token-in-raw-source-snapshot'
          });
        } else {
          findings.push(finding);
        }
      }
    }
  });
}

const gitTracked = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
const gitTrackedCount = gitTracked.status === 0 ? gitTracked.stdout.trim().split(/\r?\n/).filter(Boolean).length : 0;
const envMatrixExists = fs.existsSync(path.join(root, 'scripts/environment-matrix-check.mjs'));
const deployWorkflowExists = fs.existsSync(path.join(root, '.github/workflows/deploy.yml'));
const status = findings.length === 0 && envMatrixExists && deployWorkflowExists ? 'PASS' : 'FAIL';

const report = {
  schema: 'eventlive.secret-env-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    files_scanned: files.length,
    git_tracked_files_seen: gitTrackedCount,
    findings: findings.length,
    external_public_tokens_in_raw_snapshots: externalPublicTokens.length,
    environment_matrix_script: envMatrixExists ? 'present' : 'missing',
    deploy_workflow: deployWorkflowExists ? 'present' : 'missing'
  },
  git_history_policy: {
    status: 'DOCUMENTED',
    note: 'Current scan covers repository files outside generated/build folders. Full git-history secret scanning remains a release-runbook action before first public production cutover.'
  },
  findings,
  external_public_tokens: externalPublicTokens
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'secret-env-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const md = [
  '# EventLive Secret & Environment Audit',
  '',
  `- Generated at: ${generatedAt}`,
  `- Status: ${status}`,
  `- Files scanned: ${report.summary.files_scanned}`,
  `- Findings: ${report.summary.findings}`,
  `- External public tokens in raw snapshots: ${report.summary.external_public_tokens_in_raw_snapshots}`,
  `- Environment matrix script: ${report.summary.environment_matrix_script}`,
  `- Deploy workflow: ${report.summary.deploy_workflow}`,
  '',
  '## Git History Policy',
  '',
  report.git_history_policy.note,
  '',
  '## Findings',
  '',
  findings.length ? findings.map((item) => `- ${item.rule}: ${item.file}:${item.line}`).join('\n') : '- None',
  ''
].join('\n');

fs.writeFileSync(path.join(reportsDir, 'secret-env-audit.md'), md, 'utf8');

if (status !== 'PASS') {
  console.error(`SECRET_ENV_AUDIT_FAIL findings=${findings.length}`);
  process.exit(1);
}

console.log(`SECRET_ENV_AUDIT_OK files=${files.length} findings=0`);
