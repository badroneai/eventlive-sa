import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();

const docs = [
  { file: 'docs/VISITOR_GUIDE.md', markers: ['Visitor Guide', '/events.html', '/today-events.html'] },
  { file: 'docs/ORGANIZER_GUIDE.md', markers: ['Organizer Guide', '/organizer-intake.html', 'Discovery-only'] },
  { file: 'docs/OWNER_OPERATIONS_GUIDE.md', markers: ['Owner Operations Guide', 'npm run pipeline', 'NOT_READY'] },
  { file: 'docs/INCIDENT_RUNBOOK.md', markers: ['Incident Runbook', 'Severity', 'Rollback'] },
  { file: 'docs/DELIVERY_READINESS_PLAYBOOK.md', markers: ['23-Gate Status', 'Release verdict'] },
  { file: 'docs/EVENTLIVE_TERMINOLOGY_GLOSSARY.md', markers: ['Terminology Glossary', 'EventLive', 'eventme.live'] }
];

const findings = [];
const checks = docs.map((doc) => {
  const exists = fs.existsSync(path.join(root, doc.file));
  const text = exists ? fs.readFileSync(path.join(root, doc.file), 'utf8') : '';
  const missingMarkers = doc.markers.filter((marker) => !text.includes(marker));
  if (!exists) findings.push({ file: doc.file, issue: 'missing document' });
  for (const marker of missingMarkers) findings.push({ file: doc.file, issue: `missing marker ${marker}` });
  return {
    file: doc.file,
    exists,
    missing_markers: missingMarkers,
    status: exists && missingMarkers.length === 0 ? 'PASS' : 'FAIL'
  };
});

const status = findings.length === 0 ? 'PASS' : 'FAIL';
const report = {
  schema: 'eventlive.documentation-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    documents_checked: checks.length,
    findings: findings.length
  },
  documents: checks,
  findings
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'documentation-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'documentation-audit.md'),
  [
    '# EventLive Documentation Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Documents checked: ${checks.length}`,
    `- Findings: ${findings.length}`,
    '',
    '## Findings',
    '',
    findings.length ? findings.map((item) => `- ${item.file}: ${item.issue}`).join('\n') : '- None',
    ''
  ].join('\n'),
  'utf8'
);

if (status !== 'PASS') {
  console.error(`DOCUMENTATION_AUDIT_FAIL findings=${findings.length}`);
  process.exit(1);
}

console.log(`DOCUMENTATION_AUDIT_OK docs=${checks.length}`);
