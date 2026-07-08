import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();

const journeys = [
  {
    role: 'visitor',
    name: 'اكتشاف فعالية قادمة',
    start: 'index.html',
    steps: ['index.html', 'events.html', 'today-events.html'],
    end: 'event-detail-or-calendar',
    requiredMarkers: ['ابحث', 'كل الفعاليات', 'التقويم']
  },
  {
    role: 'visitor',
    name: 'وضع الحضور وقت الفعالية',
    start: 'index.html',
    steps: ['today-events.html', 'screen.html'],
    end: 'live-attendance-screen',
    requiredMarkers: ['وضع الحضور', 'الجدول الحي', 'آخر تحديث']
  },
  {
    role: 'organizer',
    name: 'فهم قيمة المنصة للمنظم',
    start: 'organizers.html',
    steps: ['organizers.html', 'organizer-intake.html'],
    end: 'organizer-contact-or-intake',
    requiredMarkers: ['للمنظمين', 'إضافة فعالية', 'hello@eventme.live']
  },
  {
    role: 'owner',
    name: 'تشغيل ومراقبة المنصة',
    start: 'readiness.html',
    steps: ['readiness.html', 'activation.html'],
    end: 'owner-readiness-decision',
    requiredMarkers: ['جاهزية التشغيل', 'تفعيل', 'readiness.json']
  }
];

function pageText(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pageHtml(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

const findings = [];
const journeyResults = journeys.map((journey) => {
  const missingSteps = journey.steps.filter((step) => !fs.existsSync(path.join(distDir, step)));
  const combined = journey.steps.map((step) => `${pageText(step)} ${pageHtml(step)}`).join(' ');
  const missingMarkers = journey.requiredMarkers.filter((marker) => !combined.includes(marker));
  const hasStart = fs.existsSync(path.join(distDir, journey.start));
  const hasEnd = Boolean(journey.end);

  if (!hasStart) findings.push({ role: journey.role, journey: journey.name, issue: `missing start ${journey.start}` });
  for (const step of missingSteps) findings.push({ role: journey.role, journey: journey.name, issue: `missing step ${step}` });
  for (const marker of missingMarkers) findings.push({ role: journey.role, journey: journey.name, issue: `missing marker ${marker}` });
  if (!hasEnd) findings.push({ role: journey.role, journey: journey.name, issue: 'missing end state' });

  return {
    ...journey,
    has_start: hasStart,
    has_end: hasEnd,
    missing_steps: missingSteps,
    missing_markers: missingMarkers,
    status: hasStart && hasEnd && missingSteps.length === 0 && missingMarkers.length === 0 ? 'PASS' : 'FAIL'
  };
});

const publicPages = ['index.html', 'events.html', 'today-events.html', 'screen.html', 'organizers.html', 'organizer-intake.html', 'readiness.html'];
const deadEndChecks = publicPages.map((page) => {
  const html = pageHtml(page);
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1])
    .filter((href) => !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:'));
  const internalLinks = links.filter((href) => !/^https?:\/\//i.test(href));
  const ok = internalLinks.length > 0;
  if (!ok) findings.push({ role: 'all', journey: page, issue: 'dead-end page with no internal links' });
  return { page, internal_links: internalLinks.length, status: ok ? 'PASS' : 'FAIL' };
});

const status = findings.length === 0 ? 'PASS' : 'FAIL';
const report = {
  schema: 'eventlive.product-journey-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    journeys_checked: journeyResults.length,
    public_pages_dead_end_checked: deadEndChecks.length,
    findings: findings.length
  },
  journeys: journeyResults,
  dead_end_checks: deadEndChecks,
  findings
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'product-journey-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'product-journey-audit.md'),
  [
    '# EventLive Product Journey Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Journeys checked: ${report.summary.journeys_checked}`,
    `- Dead-end pages checked: ${report.summary.public_pages_dead_end_checked}`,
    `- Findings: ${report.summary.findings}`,
    '',
    '## Journeys',
    '',
    '| Role | Journey | Status | Start | End |',
    '| --- | --- | --- | --- | --- |',
    ...journeyResults.map((item) => `| ${item.role} | ${item.name} | ${item.status} | ${item.start} | ${item.end} |`),
    '',
    '## Findings',
    '',
    findings.length ? findings.map((item) => `- ${item.role}/${item.journey}: ${item.issue}`).join('\n') : '- None',
    ''
  ].join('\n'),
  'utf8'
);

if (status !== 'PASS') {
  console.error(`PRODUCT_JOURNEY_AUDIT_FAIL findings=${findings.length}`);
  process.exit(1);
}

console.log(`PRODUCT_JOURNEY_AUDIT_OK journeys=${journeyResults.length} pages=${deadEndChecks.length}`);
