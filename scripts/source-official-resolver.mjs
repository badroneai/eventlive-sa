import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const opsReportPath = path.join(root, 'reports', 'source-ops-report.json');
const registryPath = path.join(root, 'data', 'source_registry.json');
const reportJsonPath = path.join(root, 'reports', 'source-official-resolver-report.json');
const reportMdPath = path.join(root, 'reports', 'source-official-resolver-report.md');
const reportHtmlPath = path.join(root, 'reports', 'source-official-resolver-report.html');
const generatedAt = new Date().toISOString();
const maxLeads = Math.max(1, Number(process.env.EVENTLIVE_RESOLVER_LIMIT || 12));

function normalize(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function queryUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function sourceDomain(source) {
  try {
    return new URL(source.url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function keywordsForLead(lead) {
  const text = normalize(`${lead.title} ${lead.city} ${lead.discovery_notes || ''}`);
  const keywords = [];
  if (/esport|world cup|championship|tournament/.test(text)) keywords.push('sports', 'esports', 'tickets');
  if (/expo|exhibition|construct|wood|summit|conference|congress|large-event-topic|hrse/.test(text)) keywords.push('exhibitions', 'conferences', 'venue');
  if (/tech|ai|data|fintech|startup/.test(text)) keywords.push('technology', 'business', 'training');
  if (/family office|investment|investor|vc|founder/.test(text)) keywords.push('investment', 'business', 'forums');
  if (/social|language|mixer|community/.test(text)) keywords.push('community', 'experiences');
  return [...new Set(keywords)];
}

function sourceScoreForLead(source, lead, keywords) {
  let score = 0;
  const sourceText = normalize([
    source.id,
    source.name,
    source.owner,
    source.source_type,
    source.coverage,
    ...(source.categories || []),
    ...(source.cities || [])
  ].join(' '));
  for (const keyword of keywords) {
    if (sourceText.includes(keyword)) score += 10;
  }
  if (source.trust_level === 'official' || source.trust_level === 'venue-official') score += 20;
  if (source.trust_level === 'official-marketplace') score += 12;
  if (source.source_type === 'industry-directory' || source.trust_level === 'aggregator') score -= 30;
  if (source.source_type === 'community-platform') score -= 35;
  if (source.intake_policy === 'partnership-needed') score -= 10;
  if ((source.cities || []).some((city) => normalize(city) === normalize(lead.city))) score += 8;
  if (keywords.includes('community') && !/webook|hala yalla|riyadh city|enjoy|ticket|experience/.test(sourceText)) score -= 24;
  if (normalize(lead.title).includes('world cup') && /sport|webook|visit saudi|mos|riyadh season|qiddiya/.test(sourceText)) score += 18;
  if (/expo|exhibition|construct|wood|summit|hrse/i.test(lead.title) && /rfecc|ricec|jeddah chamber|venue|exhibition|conference/.test(sourceText)) score += 18;
  if (/family office|investment/i.test(lead.title) && /invest|rfecc|ricec|business|conference|forum/.test(sourceText)) score += 16;
  return score;
}

function targetSourcesForLead(lead, registry) {
  const keywords = keywordsForLead(lead);
  return (registry.sources || [])
    .filter((source) => !['aggregator', 'community'].includes(source.trust_level))
    .map((source) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      domain: sourceDomain(source),
      trust_level: source.trust_level,
      source_type: source.source_type,
      score: sourceScoreForLead(source, lead, keywords)
    }))
    .filter((source) => source.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 5);
}

function resolverPriority(lead, officialTargets) {
  let score = Number(lead.discovery_score || 0);
  const leadText = normalize(`${lead.title} ${lead.discovery_notes || ''}`);
  const days = Number(lead.days_to_start || 999);
  if (days <= 14) score += 25;
  else if (days <= 45) score += 12;
  if (lead.discovery_quality === 'strong-lead') score += 15;
  if (officialTargets.length) score += Math.min(20, officialTargets[0].score);
  if (lead.source_label === 'Eventbrite Saudi Arabia') score -= 8;
  if (/social|language exchange|mixer|make new friends|community/.test(leadText)) score -= 35;
  if (/expo|summit|conference|world cup|championship|construct|fintech|hrse/.test(leadText)) score += 10;
  return Math.max(0, score);
}

function buildSearches(lead, targets) {
  const title = `"${lead.title}"`;
  const city = lead.city && lead.city !== 'Saudi Arabia' ? `"${lead.city}"` : 'Saudi Arabia';
  const baseQueries = [
    `${title} ${city} official`,
    `${title} ${city} organizer`,
    `${title} ${city} tickets`
  ];
  const domainQueries = targets
    .map((target) => target.domain ? `site:${target.domain} ${title} ${city}` : '')
    .filter(Boolean);
  return [...new Set([...domainQueries, ...baseQueries])]
    .slice(0, 8)
    .map((query) => ({ query, url: queryUrl(query) }));
}

function taskForLead(lead, registry) {
  const targets = targetSourcesForLead(lead, registry);
  const priority = resolverPriority(lead, targets);
  const searches = buildSearches(lead, targets);
  return {
    lead_id: lead.id,
    title: lead.title,
    city: lead.city,
    starts_at: lead.starts_at,
    source_label: lead.source_label,
    discovery_quality: lead.discovery_quality || '',
    discovery_score: Number(lead.discovery_score || 0),
    discovery_notes: lead.discovery_notes || '',
    resolver_priority: priority,
    target_sources: targets,
    searches,
    next_action: targets.length
      ? 'ابحث في المصادر الرسمية المستهدفة واربط lead بمصدر رسمي قبل أي نشر.'
      : 'أنشئ مصدر رسمي جديد أو أبقه كإشارة اكتشاف غير قابلة للنشر.'
  };
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(report) {
  const lines = [
    '# EventLive Official Resolver Report',
    '',
    `- generated_at: ${report.generated_at}`,
    `- source_ops_report: ${report.source_ops_report}`,
    `- leads_seen: ${report.totals.leads_seen}`,
    `- resolver_tasks: ${report.totals.tasks}`,
    `- high_priority: ${report.totals.high_priority}`,
    '',
    '## Resolver Tasks',
    '',
    '| Priority | Lead | Source | City | Quality | Target sources | Next action |',
    '|---:|---|---|---|---|---|---|',
    ...report.tasks.map((task) => `| ${task.resolver_priority} | ${task.title} | ${task.source_label} | ${task.city} | ${task.discovery_quality}/${task.discovery_score} | ${task.target_sources.map((source) => source.id).join(', ') || '-'} | ${task.next_action} |`),
    '',
    '## Search Pack',
    '',
    ...report.tasks.flatMap((task) => [
      `### ${task.title}`,
      '',
      ...task.searches.map((search) => `- [${search.query}](${search.url})`),
      ''
    ])
  ];
  return `${lines.join('\n')}\n`;
}

function renderHtml(report) {
  const rows = report.tasks.map((task) => `
    <tr>
      <td>${htmlEscape(task.resolver_priority)}</td>
      <td>${htmlEscape(task.title)}</td>
      <td>${htmlEscape(task.source_label)}</td>
      <td>${htmlEscape(task.city)}</td>
      <td>${htmlEscape(`${task.discovery_quality}/${task.discovery_score}`)}</td>
      <td>${htmlEscape(task.target_sources.map((source) => source.id).join(', ') || '-')}</td>
      <td>${task.searches.slice(0, 3).map((search) => `<a href="${htmlEscape(search.url)}">${htmlEscape(search.query)}</a>`).join('<br>')}</td>
    </tr>`).join('');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EventLive Official Resolver</title>
  <style>
    body { margin:0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f7faf8; color:#17201d; }
    main { width:min(1180px, calc(100% - 32px)); margin:0 auto; padding:32px 0; }
    table { width:100%; border-collapse:collapse; background:#fff; border:1px solid #dde8e2; }
    th, td { padding:12px; border-bottom:1px solid #dde8e2; text-align:right; vertical-align:top; }
    th { color:#63706b; }
    a { color:#007c73; }
  </style>
</head>
<body>
  <main>
    <h1>EventLive Official Resolver</h1>
    <p>طبقة تشغيلية لتحويل مرشحي الاكتشاف إلى مطابقة رسمية قبل النشر الآلي. تم التوليد: ${htmlEscape(report.generated_at)}</p>
    <table>
      <thead><tr><th>الأولوية</th><th>المرشح</th><th>المصدر</th><th>المدينة</th><th>الجودة</th><th>مصادر مستهدفة</th><th>روابط بحث</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>`;
}

function main() {
  if (!exists(opsReportPath)) throw new Error(`Source ops report not found: ${rel(opsReportPath)}`);
  if (!exists(registryPath)) throw new Error(`Source registry not found: ${rel(registryPath)}`);
  const opsReport = readJson(opsReportPath);
  const registry = readJson(registryPath);
  const leads = (opsReport.queue?.discovery_focus || [])
    .filter((lead) => lead.discovery_quality === 'strong-lead' || Number(lead.discovery_score || 0) >= 55)
    .slice(0, maxLeads);
  const tasks = leads
    .map((lead) => taskForLead(lead, registry))
    .sort((a, b) => b.resolver_priority - a.resolver_priority || a.title.localeCompare(b.title));
  const report = {
    generated_at: generatedAt,
    source_ops_report: rel(opsReportPath),
    source_registry: rel(registryPath),
    totals: {
      leads_seen: opsReport.queue?.discovery_focus?.length || 0,
      tasks: tasks.length,
      high_priority: tasks.filter((task) => task.resolver_priority >= 115).length
    },
    tasks
  };
  ensureDir(path.dirname(reportJsonPath));
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, renderMarkdown(report), 'utf8');
  fs.writeFileSync(reportHtmlPath, renderHtml(report), 'utf8');
  console.log('# EventLive Official Resolver');
  console.log(`- Leads seen: ${report.totals.leads_seen}`);
  console.log(`- Resolver tasks: ${report.totals.tasks}`);
  console.log(`- High priority: ${report.totals.high_priority}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main();
