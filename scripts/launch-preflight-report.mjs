import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
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

const launchSweep = readJson('reports/site-launch-sweep.json', {});
const visualSweep = readJson('reports/site-visual-sweep.json', {});
const validationReport = readText('reports/validation-report.md');
const buildReport = readText('reports/build-report.md');

const validationClean = /Total errors:\s*0/i.test(validationReport) && /Total warnings:\s*0/i.test(validationReport);
const buildOk = /EventLive Build Report/i.test(buildReport) && /Domain preserved:\s*yes/i.test(buildReport);
const status = buildOk && validationClean && launchSweep.ok === true && visualSweep.ok === true ? 'PASS' : 'PARTIAL';

const report = {
  schema: 'eventlive.launch-preflight.v1',
  generated_at: generatedAt,
  status,
  command: 'npm run launch:preflight',
  evidence: {
    build_ok: buildOk,
    validation_clean: validationClean,
    launch_sweep_ok: launchSweep.ok === true,
    launch_pages: launchSweep.pages || launchSweep.page_checks?.length || null,
    visual_sweep_ok: visualSweep.ok === true,
    visual_pages: visualSweep.pages?.length || visualSweep.page_results?.length || null,
    visual_screenshots: visualSweep.screenshots || null
  },
  scope: [
    'build',
    'validate',
    'launch:product-gates',
    'launch:source-gates',
    'launch:site-gates',
    'test:site-visual-sweep'
  ]
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'launch-preflight-status.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'launch-preflight-status.md'),
  [
    '# EventLive Launch Preflight Status',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Command: \`${report.command}\``,
    '',
    '## Evidence',
    '',
    `- Build ok: ${buildOk ? 'yes' : 'no'}`,
    `- Validation clean: ${validationClean ? 'yes' : 'no'}`,
    `- Launch sweep ok: ${launchSweep.ok === true ? 'yes' : 'no'}`,
    `- Visual sweep ok: ${visualSweep.ok === true ? 'yes' : 'no'}`,
    ''
  ].join('\n'),
  'utf8'
);

console.log(`LAUNCH_PREFLIGHT_STATUS ${status}`);
