import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'reports/web-quality-audit.json');

function fail(message) {
  console.error(`WEB_QUALITY_AUDIT_TEST_FAIL ${message}`);
  process.exit(1);
}

if (!fs.existsSync(reportPath)) fail('missing reports/web-quality-audit.json');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
if (report.schema !== 'eventlive.web-quality-audit.v1') fail(`unexpected schema ${report.schema}`);
if (!Array.isArray(report.pages) || report.pages.length < 5) fail('expected at least 5 audited pages');

const summary = report.summary || {};
for (const key of ['accessibility_violations', 'responsive_violations', 'performance_violations', 'security_violations']) {
  if (!Number.isFinite(summary[key])) fail(`missing numeric summary ${key}`);
}
if (summary.accessibility_status !== 'PASS') fail(`accessibility baseline is ${summary.accessibility_status || 'missing'}`);
if (summary.security_status !== 'PASS') fail(`security baseline is ${summary.security_status || 'missing'}`);

const missingPageNames = report.pages.filter((page) => !page.page || !page.metrics).length;
if (missingPageNames > 0) fail('some page results are incomplete');
const invalidArabicTags = report.pages.filter((page) => !/^ar(?:-|$)/i.test(page.metrics.lang || '')).length;
if (invalidArabicTags > 0) fail(`${invalidArabicTags} pages do not use an Arabic BCP 47 language tag`);

console.log(`WEB_QUALITY_AUDIT_TEST_OK pages=${report.pages.length} a11y=${summary.accessibility_violations} responsive=${summary.responsive_violations} perf=${summary.performance_violations} security=${summary.security_violations}`);
