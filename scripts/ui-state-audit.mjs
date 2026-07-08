import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();

const checks = [
  {
    page: 'events.html',
    states: [
      { id: 'search-input', pattern: /id="eventSearch"/ },
      { id: 'empty-results', pattern: /لا توجد فعاليات|empty|no-results/i },
      { id: 'filter-success-path', pattern: /event-card|data-event|catalog/i }
    ]
  },
  {
    page: 'today-events.html',
    states: [
      { id: 'live-status', pattern: /مباشر|اليوم|الآن/ },
      { id: 'calendar-success-path', pattern: /ics|التقويم|تفاصيل/ }
    ]
  },
  {
    page: 'screen.html',
    states: [
      { id: 'fallback-ready', pattern: /fallback|تعذر|القادم على EventLive|أقرب جدول حي جاهز/i },
      { id: 'live-clock', pattern: /آخر تحديث|الآن|current/i },
      { id: 'mobile-follow-up', pattern: /امسح للمتابعة|QR|qrcode/i }
    ]
  },
  {
    page: 'organizers.html',
    states: [
      { id: 'owner-contact', pattern: /hello@eventme\.live|تواصل|منظم/ },
      { id: 'success-path', pattern: /إضافة|نشر|مصدر|تنظيم/ }
    ]
  }
];

const pageResults = [];
const findings = [];

for (const page of checks) {
  const fullPath = path.join(distDir, page.page);
  if (!fs.existsSync(fullPath)) {
    findings.push({ page: page.page, state: 'page', issue: 'missing page' });
    continue;
  }

  const html = fs.readFileSync(fullPath, 'utf8');
  const states = page.states.map((state) => {
    const ok = state.pattern.test(html);
    if (!ok) findings.push({ page: page.page, state: state.id, issue: 'state marker missing' });
    return { id: state.id, ok };
  });
  pageResults.push({ page: page.page, states });
}

const status = findings.length === 0 ? 'PASS' : 'FAIL';
const report = {
  schema: 'eventlive.ui-state-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    pages_checked: pageResults.length,
    states_checked: pageResults.reduce((sum, page) => sum + page.states.length, 0),
    findings: findings.length
  },
  pages: pageResults,
  findings
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'ui-state-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'ui-state-audit.md'),
  [
    '# EventLive UI State Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Pages checked: ${report.summary.pages_checked}`,
    `- States checked: ${report.summary.states_checked}`,
    `- Findings: ${report.summary.findings}`,
    '',
    '## Findings',
    '',
    findings.length ? findings.map((item) => `- ${item.page}: ${item.state} ${item.issue}`).join('\n') : '- None',
    ''
  ].join('\n'),
  'utf8'
);

if (status !== 'PASS') {
  console.error(`UI_STATE_AUDIT_FAIL findings=${findings.length}`);
  process.exit(1);
}

console.log(`UI_STATE_AUDIT_OK pages=${pageResults.length} states=${report.summary.states_checked}`);
