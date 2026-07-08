import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const docsDir = path.join(root, 'docs');
const generatedAt = new Date().toISOString();

const pages = [
  'index.html',
  'events.html',
  'today-events.html',
  'screen.html',
  'organizers.html',
  'cities.html',
  'categories.html',
  'audiences.html'
];

const forbiddenBrandPattern = /\bEventMe\b(?!\.live)/g;
const forbiddenOwnerLinks = [
  'sources.html',
  'methodology.html',
  'trust.html',
  'events.json'
];
const requiredArabicTerms = [
  'فعاليات',
  'جداول حية',
  'السعودية',
  'EventLive'
];

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const pageChecks = [];
const findings = [];

for (const page of pages) {
  const fullPath = path.join(distDir, page);
  if (!fs.existsSync(fullPath)) {
    findings.push({ page, rule: 'missing-page', evidence: page });
    continue;
  }

  const html = fs.readFileSync(fullPath, 'utf8');
  const visibleText = stripHtml(html);
  const brandMatches = [...visibleText.matchAll(forbiddenBrandPattern)].length;
  const ownerLinks = forbiddenOwnerLinks.filter((link) => html.includes(`href="${link}"`) || html.includes(`href='${link}'`));
  const hasRequiredTerms = requiredArabicTerms.every((term) => visibleText.includes(term));
  const htmlLangOk = /<html[^>]*lang="ar"[^>]*dir="rtl"/i.test(html);

  if (brandMatches > 0) findings.push({ page, rule: 'forbidden-eventme-brand', evidence: `${brandMatches} visible EventMe references` });
  if (ownerLinks.length > 0) findings.push({ page, rule: 'owner-link-visible', evidence: ownerLinks.join(', ') });
  if (!hasRequiredTerms && page === 'index.html') findings.push({ page, rule: 'missing-core-arabic-terms', evidence: requiredArabicTerms.join(', ') });
  if (!htmlLangOk) findings.push({ page, rule: 'html-lang-dir', evidence: 'expected lang=ar and dir=rtl' });

  pageChecks.push({
    page,
    html_lang_dir: htmlLangOk,
    visible_eventme_brand_refs: brandMatches,
    owner_links_visible: ownerLinks,
    visible_text_chars: visibleText.length
  });
}

const glossary = `# EventLive Terminology Glossary

This glossary protects the public language of EventLive so generated pages stay consistent.

| Concept | Public Arabic term | English/internal note |
| --- | --- | --- |
| Product name | EventLive | Use for all visible brand references. |
| Domain | eventme.live | Keep only as the website/domain. |
| Live schedule | جدول حي | Use for event-day usefulness and live agendas. |
| Event | فعالية | Generic public item. |
| Session | جلسة | Use inside a live schedule. |
| Organizer | منظم | Use for the entity that owns or publishes an event. |
| Trusted source | مصدر موثوق | Use for official or approved source evidence. |
| Owner-only page | صفحة مالك | Do not expose in public navigation. |

## Rules

- Do not use EventMe as a visible brand name. The only allowed visible use is the domain eventme.live.
- Public navigation must hide source, methodology, trust, and raw JSON owner pages.
- Arabic is the primary interface language; English event titles remain acceptable when the official source publishes them in English.
`;

fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, 'EVENTLIVE_TERMINOLOGY_GLOSSARY.md'), glossary, 'utf8');

const status = findings.length === 0 ? 'PASS' : 'FAIL';
const report = {
  schema: 'eventlive.content-localization-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    pages_checked: pageChecks.length,
    findings: findings.length,
    glossary: 'docs/EVENTLIVE_TERMINOLOGY_GLOSSARY.md'
  },
  checks: pageChecks,
  findings
};

fs.writeFileSync(path.join(reportsDir, 'content-localization-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'content-localization-audit.md'),
  [
    '# EventLive Content & Localization Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Pages checked: ${pageChecks.length}`,
    `- Findings: ${findings.length}`,
    `- Glossary: docs/EVENTLIVE_TERMINOLOGY_GLOSSARY.md`,
    '',
    '## Findings',
    '',
    findings.length ? findings.map((item) => `- ${item.page}: ${item.rule} (${item.evidence})`).join('\n') : '- None',
    ''
  ].join('\n'),
  'utf8'
);

if (status !== 'PASS') {
  console.error(`CONTENT_LOCALIZATION_FAIL findings=${findings.length}`);
  process.exit(1);
}

console.log(`CONTENT_LOCALIZATION_OK pages=${pageChecks.length} findings=0`);
