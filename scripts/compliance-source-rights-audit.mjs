import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();

const requiredPages = [
  {
    file: 'privacy.html',
    markers: ['سياسة الخصوصية', 'التحليلات', 'eventme.live']
  },
  {
    file: 'terms.html',
    markers: ['شروط الاستخدام', 'دقة المعلومات', 'المصدر الرسمي']
  },
  {
    file: 'source-rights.html',
    markers: ['حقوق وسياسة المصادر', 'مصادر اكتشافية', 'لا نتجاوز حماية']
  }
];

const findings = [];
const pages = requiredPages.map((page) => {
  const fullPath = path.join(distDir, page.file);
  const exists = fs.existsSync(fullPath);
  const html = exists ? fs.readFileSync(fullPath, 'utf8') : '';
  const missingMarkers = page.markers.filter((marker) => !html.includes(marker));
  const hasCanonical = new RegExp(`<link[^>]+rel=["']canonical["'][^>]+${page.file}`, 'i').test(html)
    || new RegExp(`<link[^>]+${page.file}[^>]+rel=["']canonical["']`, 'i').test(html);
  const hasJsonLd = /application\/ld\+json/.test(html);

  if (!exists) findings.push({ page: page.file, issue: 'missing page' });
  for (const marker of missingMarkers) findings.push({ page: page.file, issue: `missing marker ${marker}` });
  if (exists && !hasCanonical) findings.push({ page: page.file, issue: 'missing canonical' });
  if (exists && !hasJsonLd) findings.push({ page: page.file, issue: 'missing json-ld' });

  return {
    file: page.file,
    exists,
    missing_markers: missingMarkers,
    canonical: hasCanonical,
    json_ld: hasJsonLd,
    status: exists && missingMarkers.length === 0 && hasCanonical && hasJsonLd ? 'PASS' : 'FAIL'
  };
});

const sitemapPath = path.join(distDir, 'sitemap.xml');
const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';
for (const page of requiredPages) {
  if (!sitemap.includes(`/${page.file}`)) findings.push({ page: page.file, issue: 'missing from sitemap' });
}

const home = fs.existsSync(path.join(distDir, 'index.html')) ? fs.readFileSync(path.join(distDir, 'index.html'), 'utf8') : '';
for (const page of requiredPages) {
  if (!home.includes(page.file)) findings.push({ page: page.file, issue: 'missing from public footer/home shell' });
}

const status = findings.length === 0 ? 'PASS' : 'FAIL';
const report = {
  schema: 'eventlive.compliance-source-rights-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    pages_checked: pages.length,
    findings: findings.length
  },
  pages,
  findings
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'compliance-source-rights-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'compliance-source-rights-audit.md'),
  [
    '# EventLive Compliance & Source Rights Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Pages checked: ${pages.length}`,
    `- Findings: ${findings.length}`,
    '',
    '## Findings',
    '',
    findings.length ? findings.map((item) => `- ${item.page}: ${item.issue}`).join('\n') : '- None',
    ''
  ].join('\n'),
  'utf8'
);

if (status !== 'PASS') {
  console.error(`COMPLIANCE_SOURCE_RIGHTS_FAIL findings=${findings.length}`);
  process.exit(1);
}

console.log(`COMPLIANCE_SOURCE_RIGHTS_OK pages=${pages.length}`);
