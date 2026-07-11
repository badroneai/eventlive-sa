import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const registryPath = path.join(root, 'data', 'source_registry.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const runStatePath = path.join(root, 'data', 'source_run_state.json');
const collectionReportPath = path.join(root, 'reports', 'source-collection-report.json');
const reviewReportPath = path.join(root, 'reports', 'source-review-report.json');
const promotionReportPath = path.join(root, 'reports', 'source-promotion-report.json');
const reportJsonPath = path.join(root, 'reports', 'source-ops-report.json');
const reportMdPath = path.join(root, 'reports', 'source-ops-report.md');
const reportHtmlPath = path.join(root, 'reports', 'source-ops-report.html');
const publicHealthPath = path.join(root, 'dist', 'source-health.json');
const generatedAt = new Date().toISOString();

function safeReadJson(filePath, fallback) {
  return exists(filePath) ? readJson(filePath) : fallback;
}

function rowsBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || 'غير محدد';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function normalizeMatchValue(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function candidateMatchKey(row) {
  return [normalizeMatchValue(row.title), normalizeMatchValue(row.city), String(row.starts_at || '').slice(0, 10)].join('|');
}

function tokenizeTitle(value = '') {
  return normalizeMatchValue(value)
    .replace(/[^a-z0-9\u0600-\u06ff\s]+/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .filter((token) => !['and', 'the', 'for', 'with', '2026', 'saudi', 'riyadh', 'jeddah'].includes(token));
}

function tokenSimilarity(a = '', b = '') {
  const left = new Set(tokenizeTitle(a));
  const right = new Set(tokenizeTitle(b));
  if (!left.size || !right.size) return 0;
  const shared = [...left].filter((token) => right.has(token)).length;
  return Math.round((shared / Math.max(left.size, right.size)) * 100);
}

function sharedTitleTokenCount(a = '', b = '') {
  const left = new Set(tokenizeTitle(a));
  const right = new Set(tokenizeTitle(b));
  return [...left].filter((token) => right.has(token)).length;
}

function dateWindowOverlap(left, right) {
  const leftStart = new Date(left.starts_at).getTime();
  const leftEnd = new Date(left.ends_at || left.starts_at).getTime();
  const rightStart = new Date(right.starts_at).getTime();
  const rightEnd = new Date(right.ends_at || right.starts_at).getTime();
  if ([leftStart, leftEnd, rightStart, rightEnd].some(Number.isNaN)) return false;
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function buildOfficialEvidenceRows(candidates, catalogEvents) {
  const catalogRows = catalogEvents.map((event) => ({
    id: event.id,
    title: event.title,
    city: event.city,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    source_label: event.source_label || 'Catalog',
    evidence_kind: 'catalog'
  }));
  const candidateRows = candidates
    .filter((candidate) => candidate.confidence === 'official')
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      city: candidate.city,
      starts_at: candidate.starts_at,
      ends_at: candidate.ends_at,
      source_label: candidate.source_label,
      evidence_kind: 'candidate'
    }));
  return [...catalogRows, ...candidateRows];
}

function bestOfficialMatch(discovery, officialRows) {
  let best = null;
  for (const row of officialRows) {
    if (row.id === discovery.id) continue;
    const titleScore = tokenSimilarity(discovery.title, row.title);
    if (sharedTitleTokenCount(discovery.title, row.title) < 2) continue;
    if (titleScore < 35) continue;
    let score = titleScore;
    if (normalizeMatchValue(discovery.city) === normalizeMatchValue(row.city)) score += 15;
    if (dateWindowOverlap(discovery, row)) score += 25;
    if (score < 55) continue;
    if (!best || score > best.score) {
      best = {
        id: row.id,
        title: row.title,
        source_label: row.source_label,
        evidence_kind: row.evidence_kind,
        score
      };
    }
  }
  return best;
}

function daysSince(isoValue) {
  const parsed = new Date(isoValue).getTime();
  if (Number.isNaN(parsed)) return null;
  return Math.floor((Date.now() - parsed) / 86400000);
}

function daysUntil(isoValue) {
  const parsed = new Date(isoValue).getTime();
  if (Number.isNaN(parsed)) return null;
  return Math.ceil((parsed - Date.now()) / 86400000);
}

function isPastCandidate(candidate) {
  const end = new Date(candidate.ends_at || candidate.starts_at).getTime();
  return !Number.isNaN(end) && end < Date.now();
}

function freshnessLabel(isoValue) {
  const days = daysSince(isoValue);
  if (days === null) return 'unknown';
  if (days <= 1) return 'fresh';
  if (days <= 7) return 'recent';
  return 'stale';
}

function sourceHealth(source, collectionBySource, candidates) {
  const collection = collectionBySource.get(source.id);
  const ownedCandidates = candidates.filter((candidate) => candidate.source_label === source.name);
  const streaks = {
    error_streak: Number(collection?.error_streak || 0),
    zero_yield_streak: Number(collection?.zero_yield_streak || 0),
    last_attempted_at: collection?.last_attempted_at || null
  };
  if (!collection) {
    return {
      id: source.id,
      name: source.name,
      priority: source.priority,
      status: 'not-collected',
      ...streaks,
      extracted: 0,
      candidates: ownedCandidates.length,
      next_action: source.fetch_method === 'partnership-api'
        ? 'افتح مسار شراكة أو تغذية رسمية قبل الأتمتة.'
        : 'أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة.'
    };
  }
  if (collection.status !== 'ok') {
    return {
      id: source.id,
      name: source.name,
      priority: source.priority,
      status: 'collection-error',
      ...streaks,
      extracted: collection.extracted || 0,
      candidates: ownedCandidates.length,
      next_action: collection.note || 'راجع خطأ الجلب قبل توسيع المصدر.'
    };
  }
  if (!collection.extracted) {
    return {
      id: source.id,
      name: source.name,
      priority: source.priority,
      status: 'zero-yield',
      ...streaks,
      extracted: 0,
      candidates: ownedCandidates.length,
      next_action: collection.note || 'حسن extractor أو ابحث عن endpoint/تفاصيل أكثر اكتمالاً.'
    };
  }
  return {
    id: source.id,
    name: source.name,
    priority: source.priority,
    status: 'healthy',
    ...streaks,
    extracted: collection.extracted,
    candidates: ownedCandidates.length,
    next_action: 'استمر بالمراجعة والتكرار قبل النشر.'
  };
}

function runStateCollectionRows(runState) {
  const rows = Object.values(runState?.sources || {});
  return rows
    .filter((source) => source?.id && source.last_attempted_at)
    .map((source) => {
      const failed = source.last_collection_status && source.last_collection_status !== 'ok';
      const zeroYield = Number(source.last_extracted || 0) === 0;
      return {
        id: source.id,
        status: failed ? source.last_collection_status : 'ok',
        extracted: Number(source.last_extracted || 0),
        error_streak: Number(source.error_streak || 0),
        zero_yield_streak: Number(source.zero_yield_streak || 0),
        last_attempted_at: source.last_attempted_at,
        note: failed
          ? source.next_action || source.last_collection_status
          : zeroYield
            ? source.last_zero_yield_reason || source.next_action
            : ''
      };
    });
}

function publicHealthStatus(status) {
  if (status === 'healthy') return 'productive';
  if (status === 'collection-error') return 'collector-error';
  if (status === 'zero-yield') return 'zero-yield';
  return status;
}

function writePublicSourceHealth(report, promotionReport, collectionReport) {
  const sources = report.sources.health.map((source) => ({
    ...source,
    status: publicHealthStatus(source.status),
    last_collection_status: source.status === 'collection-error' ? 'error' : source.status === 'not-collected' ? '' : 'ok',
    last_extracted: source.extracted,
    known_candidates: source.candidates
  }));
  const totals = {
    sources: report.sources.total,
    active_collectors: report.sources.attempted,
    collection_coverage_pct: report.sources.collection_coverage_pct,
    productive: sources.filter((source) => source.status === 'productive').length,
    open_idle: sources.filter((source) => source.status === 'zero-yield').length,
    collector_errors: sources.filter((source) => source.status === 'collector-error').length,
    probe_blocked: 0,
    extractor_backlog: sources.filter((source) => source.status === 'not-collected').length,
    candidates_discovered: collectionReport.candidates_discovered || 0,
    candidates_collected_before_dedupe: collectionReport.candidates_written || 0,
    candidates_written: report.queue.total
  };
  const health = {
    generated_at: generatedAt,
    platform: 'EventLive',
    canonical_domain: 'eventme.live',
    intent: 'eventlive-source-health',
    reports: {
      collection: report.files.collection_report,
      ops: rel(reportJsonPath),
      auto_publish: report.files.promotion_report
    },
    totals,
    publication: promotionReport ? {
      published_at: promotionReport.published_at || promotionReport.generated_at || promotionReport.promoted_at || null,
      dry_run: Boolean(promotionReport.dry_run),
      candidates_seen: promotionReport.candidates_seen || report.queue.total,
      published_new: promotionReport.published_new || 0,
      linked_existing: promotionReport.linked_existing || 0,
      blocked_remaining: promotionReport.blocked_remaining || 0,
      reconciled: promotionReport.reconciled || 0,
      report: report.files.promotion_report
    } : null,
    sources
  };
  writeJson(publicHealthPath, health);
}

function candidateAction(candidate, duplicateRisk, isPast) {
  if (candidate.review_status === 'approved-for-catalog' && candidate.matched_catalog_event_id) return 'منشور ومربوط بالكتالوج.';
  if (isPast) return 'انتهت الفعالية؛ احتفظ بها كأثر مصدر أو أرشفها من طابور العمل.';
  if (candidate.review_status === 'approved-for-catalog') return 'جاهز للترقية إلى الكتالوج.';
  if (duplicateRisk) return 'راجع التكرار مع الكتالوج قبل أي اعتماد.';
  if (candidate.publication_gate === 'source-evidence' || candidate.confidence === 'unverified') return 'دليل اكتشاف فقط؛ لا ينشر آلياً حتى يثبت من مصدر رسمي.';
  if (candidate.publication_gate === 'extraction' || candidate.review_status === 'extraction-needed') return 'استخرج الحقول الناقصة من صفحة المصدر.';
  if (candidate.review_status === 'evidence-captured' || candidate.publication_gate === 'duplicate-review') return 'دليل تجميعي؛ ابن مطابقة مصدر رسمي قبل أي نشر آلي.';
  if (candidate.review_status === 'ready-for-review') return 'اتخذ قرار اعتماد أو رفض.';
  return 'حدد بوابة المراجعة التالية.';
}

function buildCandidateQueue(candidates, catalogEvents) {
  const catalogByMatch = new Map(catalogEvents.map((event) => [candidateMatchKey(event), event]));
  return candidates.map((candidate) => {
    const matched = candidate.matched_catalog_event_id
      ? catalogEvents.find((event) => event.id === candidate.matched_catalog_event_id)
      : catalogByMatch.get(candidateMatchKey(candidate));
    const duplicateRisk = Boolean(matched && matched.id !== candidate.matched_catalog_event_id);
    const daysToStart = daysUntil(candidate.starts_at);
    const past = isPastCandidate(candidate);
    let rank = 5;
    if (candidate.review_status === 'approved-for-catalog' && candidate.matched_catalog_event_id) rank = 9;
    else if (past) rank = 8;
    else if (duplicateRisk) rank = 0;
    else if (candidate.review_status === 'approved-for-catalog' && !candidate.matched_catalog_event_id) rank = 1;
    else if (candidate.review_status === 'ready-for-review') rank = 2;
    else if (candidate.publication_gate === 'extraction' || candidate.review_status === 'extraction-needed') rank = 3;
    else if (candidate.publication_gate === 'source-evidence' || candidate.confidence === 'unverified') rank = 7;
    else if (candidate.review_status === 'evidence-captured' || candidate.publication_gate === 'duplicate-review') rank = 6;
    else if ((daysToStart ?? 99) <= 14) rank = 4;
    return {
      id: candidate.id,
      title: candidate.title,
      source_label: candidate.source_label,
      city: candidate.city,
      starts_at: candidate.starts_at,
      ends_at: candidate.ends_at,
      review_status: candidate.review_status,
      publication_gate: candidate.publication_gate,
      confidence: candidate.confidence,
      discovery_quality: candidate.discovery_quality || '',
      discovery_score: Number(candidate.discovery_score || 0),
      discovery_notes: candidate.discovery_notes || '',
      duplicate_risk: duplicateRisk,
      matched_catalog_event_id: matched?.id || candidate.matched_catalog_event_id || '',
      days_to_start: daysToStart,
      is_past: past,
      is_actionable: rank < 6,
      action: candidateAction(candidate, duplicateRisk, past),
      rank
    };
  }).sort((a, b) => a.rank - b.rank || (a.days_to_start ?? 999) - (b.days_to_start ?? 999));
}

function pct(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(report) {
  const queueRows = report.queue.focus.map((item) => `
    <tr>
      <td>${htmlEscape(item.title)}</td>
      <td>${htmlEscape(item.source_label)}</td>
      <td>${htmlEscape(item.review_status)} / ${htmlEscape(item.publication_gate)}</td>
      <td>${htmlEscape(item.action)}</td>
    </tr>`).join('');
  const discoveryRows = report.queue.discovery_focus.map((item) => `
    <tr>
      <td>${htmlEscape(item.title)}</td>
      <td>${htmlEscape(item.source_label)}</td>
      <td>${htmlEscape(item.city)}</td>
      <td>${htmlEscape(item.discovery_quality || '-')} / ${htmlEscape(item.discovery_score)}</td>
      <td>${htmlEscape(item.discovery_notes || '-')}</td>
      <td>${htmlEscape(item.official_match ? `${item.official_match.title} (${item.official_match.source_label}, ${item.official_match.score})` : '-')}</td>
    </tr>`).join('');
  const sourceRows = report.sources.health.map((source) => `
    <tr>
      <td>${htmlEscape(source.priority)}</td>
      <td>${htmlEscape(source.name)}</td>
      <td>${htmlEscape(source.status)}</td>
      <td>${htmlEscape(source.extracted)}</td>
      <td>${htmlEscape(source.candidates)}</td>
      <td>${htmlEscape(source.next_action)}</td>
    </tr>`).join('');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EventLive Source Ops Report</title>
  <style>
    :root { color-scheme: light; --ink:#17201d; --muted:#63706b; --line:#dde8e2; --bg:#f8fbf8; --card:#fff; --accent:#00877f; }
    body { margin:0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
    main { width:min(1120px, calc(100% - 32px)); margin:0 auto; padding:32px 0; display:grid; gap:18px; }
    h1, h2 { margin:0; line-height:1.35; }
    p { color:var(--muted); line-height:1.8; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; }
    .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; }
    .label { color:var(--muted); font-size:13px; }
    .value { font-size:30px; font-weight:800; margin-top:6px; }
    table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
    th, td { padding:12px; border-bottom:1px solid var(--line); text-align:right; vertical-align:top; }
    th { color:var(--muted); font-size:13px; }
    tr:last-child td { border-bottom:0; }
    a { color:var(--accent); }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>EventLive Source Ops Report</h1>
      <p>تقرير تشغيل موحد لمصادر الفعاليات، المرشحين، صحة الجلب، وبوابة النشر. تم التوليد: ${htmlEscape(report.generated_at)}</p>
    </header>
    <section class="grid">
      <div class="card"><div class="label">مصادر السجل</div><div class="value">${report.sources.total}</div></div>
      <div class="card"><div class="label">مصادر مجمعة</div><div class="value">${report.sources.attempted}</div></div>
      <div class="card"><div class="label">مرشحون</div><div class="value">${report.queue.total}</div></div>
      <div class="card"><div class="label">يحتاج فعل الآن</div><div class="value">${report.queue.actionable}</div></div>
      <div class="card"><div class="label">منشور ومرتبط</div><div class="value">${report.queue.published_from_candidates}</div></div>
      <div class="card"><div class="label">نسبة تغطية الجلب</div><div class="value">${report.sources.collection_coverage_pct}%</div></div>
    </section>
    <section>
      <h2>الأولوية الآن</h2>
      <p>${htmlEscape(report.recommendation)}</p>
    </section>
    <section>
      <h2>طابور المرشحين</h2>
      <table><thead><tr><th>الفعالية</th><th>المصدر</th><th>الحالة</th><th>الإجراء التالي</th></tr></thead><tbody>${queueRows}</tbody></table>
    </section>
    <section>
      <h2>أقوى مرشحي الاكتشاف</h2>
      <table><thead><tr><th>الفعالية</th><th>المصدر</th><th>المدينة</th><th>الجودة / الدرجة</th><th>الإشارات</th><th>أقرب دليل رسمي</th></tr></thead><tbody>${discoveryRows}</tbody></table>
    </section>
    <section>
      <h2>صحة المصادر</h2>
      <table><thead><tr><th>الأولوية</th><th>المصدر</th><th>الحالة</th><th>مستخرج</th><th>مرشحون</th><th>الإجراء التالي</th></tr></thead><tbody>${sourceRows}</tbody></table>
    </section>
  </main>
</body>
</html>`;
}

function recommendationFor(report) {
  if (report.queue.duplicate_risk) return 'ابدأ بمراجعة التكرارات المحتملة قبل اعتماد أي مرشح جديد.';
  if (report.queue.approved_for_catalog) return 'رق المرشحين المعتمدين غير المنشورين إلى الكتالوج، ثم شغل validate و build.';
  if (report.queue.ready_for_review) return 'اتخذ قرارات مراجعة للمرشحين الجاهزين قبل إضافة مصادر جديدة.';
  if (report.queue.stale_unpublished) return 'نظف المرشحين المنتهين غير المنشورين أو حولهم إلى أرشيف أدلة حتى لا يلوثوا طابور العمل.';
  if (report.queue.discovery_focus.length) return 'استخدم أقوى مرشحي الاكتشاف لبناء مطابقة آلية مع مصادر رسمية؛ لا تنشر مصدر اكتشاف منفرداً.';
  if (report.sources.zero_yield) return 'حسن مصادر zero-yield حتى لا تضيع دورات الجمع على HTML غير مكتمل.';
  if (report.sources.unattempted_high_priority) return 'أضف جامعاً للمصادر الرسمية عالية الأولوية غير المجمعة.';
  return 'واصل الجمع المحافظ ثم راقب جودة الطابور والتغطية.';
}

function writeMarkdown(report) {
  const lines = [
    '# EventLive Source Ops Report',
    '',
    `- generated_at: ${report.generated_at}`,
    `- registry: ${report.files.registry}`,
    `- candidates: ${report.files.candidates}`,
    `- catalog: ${report.files.catalog}`,
    `- run_state: ${report.files.run_state}`,
    `- collection_basis: ${report.collection.basis}`,
    `- collection_freshness: ${report.collection.freshness}`,
    '',
    '## Executive Summary',
    '',
    `- Sources in registry: ${report.sources.total}`,
    `- Sources attempted in latest collection: ${report.sources.attempted}`,
    `- Collection coverage: ${report.sources.collection_coverage_pct}%`,
    `- Healthy sources: ${report.sources.healthy}`,
    `- Zero-yield sources: ${report.sources.zero_yield}`,
    `- High-priority unattempted sources: ${report.sources.unattempted_high_priority}`,
    `- Candidates: ${report.queue.total}`,
    `- Actionable candidates: ${report.queue.actionable}`,
    `- Ready for review: ${report.queue.ready_for_review}`,
    `- Ready for catalog promotion: ${report.queue.approved_for_catalog}`,
    `- Linked to catalog from candidates: ${report.queue.published_from_candidates}`,
    `- Stale unpublished candidates: ${report.queue.stale_unpublished}`,
    `- Duplicate risk: ${report.queue.duplicate_risk}`,
    `- Recommendation: ${report.recommendation}`,
    '',
    '## Candidate Funnel',
    '',
    ...Object.entries(report.queue.by_review_status).map(([key, value]) => `- review_status.${key}: ${value}`),
    ...Object.entries(report.queue.by_publication_gate).map(([key, value]) => `- publication_gate.${key}: ${value}`),
    ...Object.entries(report.queue.by_discovery_quality).map(([key, value]) => `- discovery_quality.${key}: ${value}`),
    '',
    '## Focus Queue',
    '',
    '| Candidate | Source | Status | Next action |',
    '|---|---|---|---|',
    ...report.queue.focus.map((item) => `| ${item.title} | ${item.source_label} | ${item.review_status}/${item.publication_gate} | ${item.action} |`),
    '',
    '## Discovery Leads',
    '',
    '| Candidate | Source | City | Quality | Score | Signals | Official match |',
    '|---|---|---|---|---:|---|---|',
    ...report.queue.discovery_focus.map((item) => `| ${item.title} | ${item.source_label} | ${item.city} | ${item.discovery_quality || '-'} | ${item.discovery_score || 0} | ${item.discovery_notes || '-'} | ${item.official_match ? `${item.official_match.title} (${item.official_match.source_label}, ${item.official_match.score})` : '-' } |`),
    '',
    '## Source Health',
    '',
    '| Priority | Source | Status | Extracted | Candidates | Next action |',
    '|---:|---|---|---:|---:|---|',
    ...report.sources.health.map((source) => `| ${source.priority} | ${source.name} | ${source.status} | ${source.extracted} | ${source.candidates} | ${source.next_action} |`)
  ];
  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const registry = safeReadJson(registryPath, { sources: [] });
  const candidatesEnvelope = safeReadJson(candidatesPath, { candidates: [] });
  const catalogEnvelope = safeReadJson(catalogPath, { events: [] });
  const collectionReport = safeReadJson(collectionReportPath, { sources: [], collected_at: null, sources_attempted: 0 });
  const runState = safeReadJson(runStatePath, { sources: {}, generated_at: null });
  const reviewReport = safeReadJson(reviewReportPath, null);
  const promotionReport = safeReadJson(promotionReportPath, null);
  const sources = Array.isArray(registry.sources) ? registry.sources : [];
  const candidates = Array.isArray(candidatesEnvelope.candidates) ? candidatesEnvelope.candidates : [];
  const catalogEvents = Array.isArray(catalogEnvelope.events) ? catalogEnvelope.events : [];
  const collectionRows = Array.isArray(collectionReport.sources) ? collectionReport.sources : [];
  const runStateRows = runStateCollectionRows(runState);
  const sourceRows = runStateRows.length > collectionRows.length ? runStateRows : collectionRows;
  const collectionBySource = new Map(sourceRows.map((source) => [source.id, source]));
  const collectionBasis = runStateRows.length > collectionRows.length ? 'source_run_state' : 'source_collection_report';
  const health = sources.map((source) => sourceHealth(source, collectionBySource, candidates))
    .sort((a, b) => a.priority - b.priority);
  const queue = buildCandidateQueue(candidates, catalogEvents);
  const actionableQueue = queue.filter((candidate) => candidate.is_actionable);
  const officialEvidenceRows = buildOfficialEvidenceRows(candidates, catalogEvents);
  const discoveryQueue = queue
    .filter((candidate) => !candidate.is_actionable && !candidate.is_past && !candidate.matched_catalog_event_id)
    .map((candidate) => ({
      ...candidate,
      official_match: bestOfficialMatch(candidate, officialEvidenceRows)
    }))
    .sort((a, b) => {
      const matchScoreDiff = (b.official_match?.score || 0) - (a.official_match?.score || 0);
      if (matchScoreDiff) return matchScoreDiff;
      return b.discovery_score - a.discovery_score || (a.days_to_start ?? 999) - (b.days_to_start ?? 999);
    });
  const report = {
    generated_at: generatedAt,
    files: {
      registry: exists(registryPath) ? rel(registryPath) : null,
      candidates: exists(candidatesPath) ? rel(candidatesPath) : null,
      catalog: exists(catalogPath) ? rel(catalogPath) : null,
      run_state: exists(runStatePath) ? rel(runStatePath) : null,
      collection_report: exists(collectionReportPath) ? rel(collectionReportPath) : null,
      review_report: exists(reviewReportPath) ? rel(reviewReportPath) : null,
      promotion_report: exists(promotionReportPath) ? rel(promotionReportPath) : null
    },
    collection: {
      basis: collectionBasis,
      collected_at: collectionBasis === 'source_run_state'
        ? runState.generated_at || collectionReport.collected_at || null
        : collectionReport.collected_at || null,
      freshness: freshnessLabel(collectionBasis === 'source_run_state'
        ? runState.generated_at || collectionReport.collected_at
        : collectionReport.collected_at),
      discovered: collectionReport.candidates_discovered || 0,
      written: collectionReport.candidates_written || 0
    },
    sources: {
      total: sources.length,
      attempted: collectionBySource.size,
      collection_coverage_pct: pct(collectionBySource.size, sources.length),
      healthy: health.filter((source) => source.status === 'healthy').length,
      zero_yield: health.filter((source) => source.status === 'zero-yield').length,
      errors: health.filter((source) => source.status === 'collection-error').length,
      not_collected: health.filter((source) => source.status === 'not-collected').length,
      unattempted_high_priority: health.filter((source) => source.status === 'not-collected' && source.priority <= 7).length,
      health
    },
    queue: {
      total: candidates.length,
      ready_for_review: candidates.filter((candidate) => candidate.review_status === 'ready-for-review').length,
      approved_for_catalog: candidates.filter((candidate) => candidate.review_status === 'approved-for-catalog' && !candidate.matched_catalog_event_id).length,
      published_from_candidates: candidates.filter((candidate) => candidate.review_status === 'approved-for-catalog' && candidate.matched_catalog_event_id).length,
      actionable: actionableQueue.length,
      stale_unpublished: candidates.filter((candidate) => isPastCandidate(candidate) && !candidate.matched_catalog_event_id).length,
      duplicate_risk: queue.filter((candidate) => candidate.duplicate_risk).length,
      needs_extraction: candidates.filter((candidate) => candidate.review_status === 'extraction-needed' || candidate.publication_gate === 'extraction').length,
      needs_evidence: candidates.filter((candidate) => candidate.publication_gate === 'source-evidence' || candidate.confidence === 'unverified').length,
      by_review_status: rowsBy(candidates, (candidate) => candidate.review_status),
      by_publication_gate: rowsBy(candidates, (candidate) => candidate.publication_gate),
      by_confidence: rowsBy(candidates, (candidate) => candidate.confidence),
      by_discovery_quality: rowsBy(candidates.filter((candidate) => candidate.discovery_quality), (candidate) => candidate.discovery_quality),
      by_source: rowsBy(candidates, (candidate) => candidate.source_label),
      focus: actionableQueue.slice(0, 10),
      discovery_focus: discoveryQueue.slice(0, 10),
      archive_sample: queue.filter((candidate) => !candidate.is_actionable).slice(0, 10)
    },
    latest_review: reviewReport ? {
      reviewed_at: reviewReport.reviewed_at,
      dry_run: reviewReport.dry_run,
      candidate_id: reviewReport.candidate_id,
      action: reviewReport.action,
      status: reviewReport.status
    } : null,
    latest_promotion: promotionReport ? {
      promoted_at: promotionReport.promoted_at,
      dry_run: promotionReport.dry_run,
      promoted: Array.isArray(promotionReport.promoted) ? promotionReport.promoted.length : 0,
      skipped: Array.isArray(promotionReport.skipped) ? promotionReport.skipped.length : 0
    } : null
  };
  report.recommendation = recommendationFor(report);

  writeJson(reportJsonPath, report);
  writePublicSourceHealth(report, promotionReport, collectionReport);
  writeMarkdown(report);
  fs.writeFileSync(reportHtmlPath, renderHtml(report), 'utf8');

  console.log('# EventLive Source Ops');
  console.log(`- Sources: ${report.sources.total}`);
  console.log(`- Collection coverage: ${report.sources.collection_coverage_pct}%`);
  console.log(`- Candidates: ${report.queue.total}`);
  console.log(`- Ready for catalog promotion: ${report.queue.approved_for_catalog}`);
  console.log(`- Linked to catalog: ${report.queue.published_from_candidates}`);
  console.log(`- Recommendation: ${report.recommendation}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main();
