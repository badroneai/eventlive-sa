import fs from 'node:fs';

const reportPath = 'reports/content-localization-audit.json';
const glossaryPath = 'docs/EVENTLIVE_TERMINOLOGY_GLOSSARY.md';

if (!fs.existsSync(reportPath)) {
  console.error('CONTENT_LOCALIZATION_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const glossary = fs.existsSync(glossaryPath) ? fs.readFileSync(glossaryPath, 'utf8') : '';
const failures = [];

if (report.schema !== 'eventlive.content-localization-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (!report.summary || report.summary.pages_checked < 6) failures.push('too few pages checked');
if (report.summary.findings !== 0) failures.push('findings present');
if (!glossary.includes('EventLive') || !glossary.includes('eventme.live') || !glossary.includes('جدول حي')) failures.push('glossary incomplete');

if (failures.length) {
  console.error(`CONTENT_LOCALIZATION_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`CONTENT_LOCALIZATION_TEST_OK pages=${report.summary.pages_checked}`);
