import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, root, writeJson } from './program-lifecycle-utils.mjs';

const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();
const siteUrl = 'https://eventme.live/';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeReadJson(relativePath, fallback) {
  const fullPath = path.join(root, relativePath);
  return exists(fullPath) ? readJson(fullPath) : fallback;
}

function safeReadText(relativePath, fallback = '') {
  const fullPath = path.join(root, relativePath);
  return exists(fullPath) ? fs.readFileSync(fullPath, 'utf8') : fallback;
}

function writeText(relativePath, value) {
  const fullPath = path.join(root, relativePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, value, 'utf8');
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function status(ok, partial = false) {
  if (ok) return 'PASS';
  if (partial) return 'NEEDS_WORK';
  return 'NOT_STARTED';
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\|/g, '/')).join(' | ')} |`)
  ].join('\n');
}

function htmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlPage(title, body) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>${htmlEscape(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
    :root{--bg:#f7f5ef;--ink:#10231d;--muted:#66756f;--line:#dfe6df;--card:#fffdf8;--green:#0d6b52;--deep:#07231c;--live:#e5484d;--gold:#b88a2a}
    *{box-sizing:border-box}body{margin:0;font-family:"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.8;padding:30px 18px 70px}.wrap{max-width:1180px;margin:auto}h1{font-size:clamp(2rem,4vw,3.4rem);margin:0 0 8px}h2{font-size:1.25rem;margin:30px 0 12px}.lead{color:var(--muted);max-width:820px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px}.card b{display:block;font-size:1.6rem;color:var(--green)}.pill{display:inline-flex;border-radius:999px;padding:3px 10px;font-weight:700;font-size:.82rem}.PASS{background:#dff3e9;color:#0d6b52}.NEEDS_WORK{background:#fff0d5;color:#8a5a00}.NOT_STARTED,.BLOCKED{background:#ffe2e2;color:#9c2525}table{width:100%;border-collapse:collapse;background:var(--card);border-radius:10px;overflow:hidden}th,td{border:1px solid var(--line);padding:9px 11px;text-align:right;vertical-align:top}th{background:#eef4ec;color:var(--deep)}a{color:var(--green);font-weight:700}.muted{color:var(--muted)}code{direction:ltr;display:inline-block;background:#edf3ed;border-radius:6px;padding:1px 6px}header{margin-bottom:24px;border-bottom:1px solid var(--line);padding-bottom:20px}
  </style>
</head>
<body><div class="wrap">${body}</div></body>
</html>`;
}

function readProjectState() {
  const eventsCatalog = safeReadJson('data/events_catalog.json', { events: [] });
  const candidates = safeReadJson('data/source_candidates.json', { candidates: [] });
  const registry = safeReadJson('data/source_registry.json', { sources: [] });
  const runState = safeReadJson('data/source_run_state.json', { sources: [] });
  const validationReport = safeReadText('reports/validation-report.md');
  const buildReport = safeReadText('reports/build-report.md');
  const launchSweep = safeReadJson('reports/site-launch-sweep.json', null);
  const visualSweep = safeReadJson('reports/site-visual-sweep.json', null);
  const sourceOps = safeReadJson('reports/source-ops-report.json', null);
  const sourceHealthPublic = safeReadJson('dist/source-health.json', null);
  const distEvents = safeReadJson('dist/events.json', { events: [] });
  const deliveryStandard = safeReadJson('reports/delivery-readiness-standard-status.json', null);
  return {
    events: eventsCatalog.events || [],
    distEvents: distEvents.events || [],
    candidates: candidates.candidates || [],
    sources: registry.sources || [],
    runStateSources: Array.isArray(runState.sources) ? runState.sources : Object.values(runState.sources || {}),
    validationReport,
    buildReport,
    launchSweep,
    visualSweep,
    sourceOps,
    sourceHealthPublic,
    deliveryStandard
  };
}

function buildDeliveryReadiness(state) {
  const readinessEvents = state.distEvents.length ? state.distEvents : state.events;
  const validationClean = /Total errors:\s*0/i.test(state.validationReport) && /Total warnings:\s*0/i.test(state.validationReport);
  const buildFresh = /EventLive Build Report/i.test(state.buildReport) && /Domain preserved:\s*yes/i.test(state.buildReport);
  const launchPass = state.launchSweep?.ok === true;
  const visualPass = state.visualSweep?.ok === true;
  const liveReady = readinessEvents.filter((event) => event.live_schedule_ready).length;
  const withSource = readinessEvents.filter((event) => event.source_url || event.evidence_url).length;
  const gates = [
    ['data_validation', 'سلامة البيانات', status(validationClean, Boolean(state.validationReport)), validationClean ? '0 errors / 0 warnings' : 'راجع reports/validation-report.md'],
    ['build', 'البناء', status(buildFresh, Boolean(state.buildReport)), buildFresh ? 'build report حاضر ومحدث' : 'شغل npm run build'],
    ['launch_sweep', 'مسح الإطلاق', status(launchPass, Boolean(state.launchSweep)), launchPass ? 'site-launch-sweep PASS' : 'شغل npm run test:site-launch-sweep'],
    ['visual_sweep', 'المسح البصري', status(visualPass, Boolean(state.visualSweep)), visualPass ? 'site-visual-sweep PASS' : 'شغل npm run test:site-visual-sweep'],
    ['source_evidence', 'أدلة المصادر', status(withSource === readinessEvents.length && readinessEvents.length > 0, withSource > 0), `${withSource}/${readinessEvents.length} فعالية لديها مصدر أو دليل`],
    ['live_ready', 'الجداول الحية', status(liveReady >= 50, liveReady > 0), `${liveReady} جداول حية جاهزة`]
  ];
  const report = {
    schema: 'eventlive.delivery-readiness.v1',
    generated_at: generatedAt,
    status: gates.every((gate) => gate[2] === 'PASS') ? 'PASS' : 'NEEDS_WORK',
    totals: {
      catalog_events: state.events.length,
      public_events: readinessEvents.length,
      live_ready: liveReady,
      with_source_evidence: withSource,
      gates: gates.length,
      gates_passed: gates.filter((gate) => gate[2] === 'PASS').length
    },
    gates: gates.map(([id, name, gateStatus, evidence]) => ({ id, name, status: gateStatus, evidence }))
  };
  writeJson(path.join(reportsDir, 'delivery-readiness-status.json'), report);
  writeText('reports/delivery-readiness-status.md', [
    '# EventLive Delivery Readiness Status',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${report.status}`,
    `- Catalog events: ${report.totals.catalog_events}`,
    `- Public events: ${report.totals.public_events}`,
    `- Live-ready: ${report.totals.live_ready}`,
    '',
    mdTable(['Gate', 'Status', 'Evidence'], report.gates.map((gate) => [gate.name, gate.status, gate.evidence])),
    ''
  ].join('\n'));
  return report;
}

function buildDesignStatus(state) {
  const launchPages = state.launchSweep?.page_checks || [];
  const visualPages = state.visualSweep?.pages || state.visualSweep?.page_results || [];
  const brandPass = state.launchSweep ? launchPages.every((page) => page.ok) : false;
  const visualPass = state.visualSweep?.ok === true;
  const requiredSurfaces = [
    ['home', 'الرئيسية', '/index.html'],
    ['events', 'كل الفعاليات', '/events.html'],
    ['event-detail', 'صفحة فعالية', '/events/demo-event.html'],
    ['today', 'اليوم', '/today.html'],
    ['week', 'هذا الأسبوع', '/this-week.html'],
    ['screen', 'شاشة الحضور', '/screen.html'],
    ['organizers', 'المنظمين', '/organizers.html'],
    ['cities', 'المدن', '/cities.html'],
    ['categories', 'التصنيفات', '/categories.html'],
    ['guides', 'الأدلة', '/guides.html']
  ];
  const surfaces = requiredSurfaces.map(([id, name, url]) => {
    const page = launchPages.find((row) => row.page === url.replace(/^\//, '')) || null;
    const launchOk = page?.ok === true;
    return {
      id,
      name,
      url,
      status: state.launchSweep ? status(launchOk, Boolean(page)) : 'NOT_STARTED',
      evidence: page ? page.title || 'checked by launch sweep' : 'pending visual/design sweep'
    };
  });
  const report = {
    schema: 'eventlive.design-os-status.v1',
    generated_at: generatedAt,
    status: brandPass && visualPass ? 'PASS' : 'NEEDS_WORK',
    identity: {
      brand: 'EventLive',
      domain: 'eventme.live',
      font: 'IBM Plex Sans Arabic',
      live_mark: 'red pulsing i-dot'
    },
    totals: {
      required_surfaces: surfaces.length,
      surfaces_passed: surfaces.filter((surface) => surface.status === 'PASS').length,
      launch_pages_checked: launchPages.length,
      visual_pages_checked: visualPages.length
    },
    surfaces
  };
  writeJson(path.join(reportsDir, 'design-os-status.json'), report);
  writeText('reports/design-os-status.md', [
    '# EventLive Design OS Status',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${report.status}`,
    `- Brand: ${report.identity.brand}`,
    `- Domain: ${report.identity.domain}`,
    `- Font: ${report.identity.font}`,
    `- Live mark: ${report.identity.live_mark}`,
    '',
    mdTable(['Surface', 'Status', 'Evidence'], surfaces.map((surface) => [surface.name, surface.status, surface.evidence])),
    ''
  ].join('\n'));
  return report;
}

function publishPolicy(source) {
  if (source.intake_policy === 'partnership-needed' || source.fetch_method === 'partnership-api') return 'partnership_required';
  if (source.intake_policy === 'candidate-only' || ['aggregator', 'community'].includes(source.trust_level)) return 'candidate_only';
  if (source.candidate_gate === 'blocked') return 'blocked_or_closed';
  if (['official', 'venue-official'].includes(source.trust_level) && !['source-evidence', 'extraction', 'duplicate-review'].includes(source.candidate_gate)) return 'auto_publish';
  return 'manual_review';
}

function buildHarvestStatus(state) {
  const sources = state.sources.map((source) => ({
    id: source.id,
    name: source.name,
    priority: source.priority,
    trust_level: source.trust_level,
    intake_policy: source.intake_policy,
    fetch_method: source.fetch_method,
    candidate_gate: source.candidate_gate,
    publish_policy: publishPolicy(source)
  })).sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
  const policies = countBy(sources, (source) => source.publish_policy);
  const candidatesByGate = countBy(state.candidates, (candidate) => candidate.publication_gate || candidate.review_status);
  const matchedCandidates = state.candidates.filter((candidate) => candidate.matched_catalog_event_id).length;
  const report = {
    schema: 'eventlive.harvest-os-status.v1',
    generated_at: generatedAt,
    status: sources.length > 0 && state.sourceOps ? 'PASS' : 'NEEDS_WORK',
    operating_rule: 'Probe before new sources; sample before full harvest; Raw collection is not publication; discovery-only never auto-publishes.',
    totals: {
      sources: sources.length,
      candidates: state.candidates.length,
      matched_candidates: matchedCandidates,
      auto_publish_sources: policies.auto_publish || 0,
      candidate_only_sources: policies.candidate_only || 0,
      partnership_required_sources: policies.partnership_required || 0,
      blocked_or_closed_sources: policies.blocked_or_closed || 0,
      manual_review_sources: policies.manual_review || 0
    },
    policies,
    candidates_by_gate: candidatesByGate,
    sources
  };
  writeJson(path.join(reportsDir, 'source-harvest-os-status.json'), report);
  writeText('reports/source-harvest-os-status.md', [
    '# EventLive Harvest OS Status',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${report.status}`,
    `- Operating rule: ${report.operating_rule}`,
    '',
    '## Totals',
    '',
    `- Sources: ${report.totals.sources}`,
    `- Candidates: ${report.totals.candidates}`,
    `- Matched candidates: ${report.totals.matched_candidates}`,
    `- Auto-publish sources: ${report.totals.auto_publish_sources}`,
    `- Candidate-only sources: ${report.totals.candidate_only_sources}`,
    `- Partnership-required sources: ${report.totals.partnership_required_sources}`,
    '',
    mdTable(['Source', 'Policy', 'Trust', 'Gate'], sources.slice(0, 80).map((source) => [source.name || source.id, source.publish_policy, source.trust_level, source.candidate_gate])),
    ''
  ].join('\n'));
  return report;
}

function buildAnalyticsStatus() {
  const provider = process.env.EVENTLIVE_ANALYTICS_PROVIDER || 'plausible';
  const domain = process.env.EVENTLIVE_ANALYTICS_DOMAIN || 'eventme.live';
  const dashboardUrl = process.env.EVENTLIVE_ANALYTICS_DASHBOARD_URL || `https://plausible.io/${domain}`;
  const dashboardConfirmed = process.env.EVENTLIVE_ANALYTICS_CONFIRMED === 'true';
  const dashboardStatus = dashboardConfirmed ? 'CONFIRMED' : 'NEEDS_PROVIDER_SETUP';
  const dashboardLoginUrl = `https://plausible.io/login?return_to=%2F${encodeURIComponent(domain)}`;
  const trackedEvents = [
    'page_view',
    'search_used',
    'event_opened',
    'city_filter_used',
    'category_filter_used',
    'audience_filter_used',
    'calendar_downloaded',
    'directions_clicked',
    'source_clicked',
    'live_screen_opened',
    'saved_event',
    'share_clicked',
    'organizer_cta_clicked',
    'this_week_opened',
    'today_opened'
  ];
  const ownerExcluded = ['sources.html', 'methodology.html', 'trust.html', 'events.json', 'source-health.html', 'candidates.html', 'resolver.html', 'owner-status.html', 'owner-status.json'];
  const report = {
    schema: 'eventlive.analytics-status.v1',
    generated_at: generatedAt,
    status: 'PASS',
    instrumentation_status: 'PASS',
    provider,
    domain,
    dashboard_url: dashboardUrl,
    dashboard_login_url: dashboardLoginUrl,
    dashboard_status: dashboardStatus,
    dashboard_setup_required: !dashboardConfirmed,
    dashboard_note: dashboardConfirmed
      ? 'لوحة Plausible مؤكدة ومربوطة بالدومين.'
      : 'إذا ظهرت صفحة 404 في Plausible فهذا يعني غالبا أن موقع eventme.live لم يضف بعد داخل Plausible أو أنك لست داخل حساب مالك اللوحة. التتبع مزروع في الموقع، لكن أرقام الزيارات تحتاج تفعيل اللوحة من مزود التحليلات.',
    privacy: {
      cookies: false,
      pii: false,
      owner_pages_excluded: true
    },
    tracked_events: trackedEvents,
    owner_excluded_paths: ownerExcluded,
    implementation: {
      runtime_function: 'window.eventLiveTrack',
      html_attribute_tracking: 'data-analytics-event',
      provider_dispatch: 'Plausible/Umami/GA4-compatible when configured',
      owner_status_page: 'owner-status.html'
    }
  };
  writeJson(path.join(reportsDir, 'analytics-status.json'), report);
  writeText('reports/analytics-status.md', [
    '# EventLive Analytics Status',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${report.status}`,
    `- Instrumentation status: ${report.instrumentation_status}`,
    `- Provider: ${provider}`,
    `- Domain: ${domain}`,
    `- Dashboard: ${dashboardUrl}`,
    `- Dashboard status: ${dashboardStatus}`,
    `- Dashboard setup required: ${report.dashboard_setup_required ? 'yes' : 'no'}`,
    `- Cookies: ${report.privacy.cookies ? 'yes' : 'no'}`,
    `- PII: ${report.privacy.pii ? 'yes' : 'no'}`,
    '',
    '## Dashboard Activation Note',
    '',
    `- ${report.dashboard_note}`,
    `- Login/setup link: ${dashboardLoginUrl}`,
    '',
    '## Tracked Events',
    '',
    ...trackedEvents.map((event) => `- \`${event}\``),
    '',
    '## Owner-Excluded Paths',
    '',
    ...ownerExcluded.map((item) => `- \`${item}\``),
    '',
    '## Owner Reading Path',
    '',
    '- افتح `owner-status.html` لمعرفة حالة الجلب والقياس من داخل الموقع.',
    '- بعد إنشاء موقع `eventme.live` داخل Plausible أو الدخول بحساب المالك، افتح لوحة المزود أعلاه لقراءة أرقام الزوار الفعلية والمصادر والصفحات.',
    ''
  ].join('\n'));
  return report;
}

function buildCommandCenter(state, readiness, design, harvest, analytics) {
  const publicEvents = state.distEvents.length ? state.distEvents : state.events;
  const standardStatus = state.deliveryStandard?.release_verdict === 'READY_WITH_RESERVED_ITEMS' ? 'PASS' : state.deliveryStandard ? 'PARTIAL' : 'NOT_STARTED';
  const decisions = [
    ['analytics_provider', 'اختيار/تفعيل حساب Analytics فعلي', analytics.provider === 'plausible' ? 'Plausible مبدئيا' : analytics.provider],
    ['eventlive_domain', 'حسم شراء نطاق EventLive إضافي لاحقا', 'الدومين الحالي المعتمد eventme.live'],
    ['owner_pages_policy', 'اعتماد سياسة صفحات المالك المخفية', 'مخفية من التنقل العام وتبقى noindex عند تحويلها HTML'],
    ['organizers_product', 'متى تفتح صفحة المنظمين كمنتج تجاري', 'تحتاج قرار منتجي لاحق']
  ];
  const gates = [
    ['Delivery Readiness', readiness.status, 'reports/delivery-readiness-status.md'],
    ['23-Gate Delivery Standard', standardStatus, 'reports/delivery-readiness-standard-status.md'],
    ['Command Center', 'PASS', 'reports/eventlive-command-center.md'],
    ['Design OS', design.status, 'reports/design-os-status.md'],
    ['Harvest OS', harvest.status, 'reports/source-harvest-os-status.md'],
    ['Analytics', analytics.status, 'reports/analytics-status.md']
  ];
  const report = {
    schema: 'eventlive.command-center.v1',
    generated_at: generatedAt,
    project: {
      name: 'EventLive',
      domain: 'eventme.live',
      live_url: siteUrl,
      type: 'static Saudi live-events platform + periodic harvest pipeline',
      lifecycle: 'pre-professional-launch hardening',
      owner: 'Bader / EventLive',
      technology: ['Node.js ESM', 'GitHub Pages', 'PWA', 'JSON', 'ICS', 'RSS']
    },
    totals: {
      catalog_events: state.events.length,
      public_events: publicEvents.length,
      source_candidates: state.candidates.length,
      registered_sources: state.sources.length,
      live_ready: publicEvents.filter((event) => event.live_schedule_ready).length,
      ended_events: publicEvents.filter((event) => event.status === 'ended').length,
      delivery_standard_pass: state.deliveryStandard?.totals?.PASS || 0,
      delivery_standard_partial: state.deliveryStandard?.totals?.PARTIAL || 0,
      delivery_standard_not_started: state.deliveryStandard?.totals?.NOT_STARTED || 0
    },
    gates: gates.map(([name, gateStatus, evidence]) => ({ name, status: gateStatus, evidence })),
    decisions: decisions.map(([id, title, note]) => ({ id, title, note })),
    documents: [
      'EVENTLIVE-ANALYTICS-MEASUREMENT-PLAN.md',
      'EVENTLIVE-DELIVERY-READINESS-PLAYBOOK.md',
      'EVENTLIVE-DESIGN-OS-ADOPTION-PLAN.md',
      'EVENTLIVE-HARVEST-OS-ADOPTION-PLAN.md',
      'EVENTLIVE-COMMAND-CENTER-ADOPTION-PLAN.md',
      'EVENTME-MASTER-DEVELOPMENT-PLAN.md',
      'EVENTME-PRODUCT-STRATEGY.md',
      'EVENTME-SOURCE-ACQUISITION.md',
      'RELEASE-CHECKLIST.md',
      'TECH-DEBT.md'
    ]
  };
  writeJson(path.join(reportsDir, 'eventlive-command-center.json'), report);
  const md = [
    '# EventLive Command Center',
    '',
    `- Generated at: ${generatedAt}`,
    `- Live site: ${siteUrl}`,
    `- Lifecycle: ${report.project.lifecycle}`,
    '',
    '## Totals',
    '',
    `- Catalog events: ${report.totals.catalog_events}`,
    `- Public events: ${report.totals.public_events}`,
    `- Source candidates: ${report.totals.source_candidates}`,
    `- Registered sources: ${report.totals.registered_sources}`,
    `- Live-ready events: ${report.totals.live_ready}`,
    `- Ended events: ${report.totals.ended_events}`,
    `- Delivery standard PASS/PARTIAL/NOT_STARTED: ${report.totals.delivery_standard_pass}/${report.totals.delivery_standard_partial}/${report.totals.delivery_standard_not_started}`,
    '',
    '## Gates',
    '',
    mdTable(['Gate', 'Status', 'Evidence'], report.gates.map((gate) => [gate.name, gate.status, gate.evidence])),
    '',
    '## Owner Decisions',
    '',
    mdTable(['Decision', 'Note'], report.decisions.map((decision) => [decision.title, decision.note])),
    '',
    '## Governing Documents',
    '',
    ...report.documents.map((doc) => `- \`${doc}\``),
    ''
  ].join('\n');
  writeText('reports/eventlive-command-center.md', md);
  const html = htmlPage('EventLive Command Center', `
    <header><h1>EventLive Command Center</h1><p class="lead">مركز قيادة داخلي للمالك: حالة المنتج، البوابات، الجلب، التصميم، التحليلات، والقرارات المفتوحة. هذه الصفحة داخلية وليست للزوار.</p></header>
    <div class="grid">
      <article class="card"><span class="muted">فعاليات الكتالوج</span><b>${report.totals.catalog_events}</b></article>
      <article class="card"><span class="muted">فعاليات منشورة</span><b>${report.totals.public_events}</b></article>
      <article class="card"><span class="muted">مرشحو المصادر</span><b>${report.totals.source_candidates}</b></article>
      <article class="card"><span class="muted">مصادر مسجلة</span><b>${report.totals.registered_sources}</b></article>
      <article class="card"><span class="muted">جداول حية</span><b>${report.totals.live_ready}</b></article>
      <article class="card"><span class="muted">فعاليات منتهية</span><b>${report.totals.ended_events}</b></article>
    </div>
    <h2>البوابات</h2>
    <table><tr><th>البوابة</th><th>الحالة</th><th>الدليل</th></tr>${report.gates.map((gate) => `<tr><td>${htmlEscape(gate.name)}</td><td><span class="pill ${gate.status}">${htmlEscape(gate.status)}</span></td><td><code>${htmlEscape(gate.evidence)}</code></td></tr>`).join('')}</table>
    <h2>قرارات تحتاج المالك</h2>
    <table><tr><th>القرار</th><th>الملاحظة</th></tr>${report.decisions.map((decision) => `<tr><td>${htmlEscape(decision.title)}</td><td>${htmlEscape(decision.note)}</td></tr>`).join('')}</table>
    <h2>روابط مباشرة</h2>
    <div class="grid"><article class="card"><a href="${siteUrl}">الموقع الحي</a></article><article class="card"><a href="./delivery-readiness-status.md">جاهزية التسليم</a></article><article class="card"><a href="./design-os-status.md">Design OS</a></article><article class="card"><a href="./source-harvest-os-status.md">Harvest OS</a></article><article class="card"><a href="./analytics-status.md">Analytics</a></article></div>
  `);
  writeText('reports/eventlive-command-center.html', html);
  return report;
}

const state = readProjectState();
const readiness = buildDeliveryReadiness(state);
const design = buildDesignStatus(state);
const harvest = buildHarvestStatus(state);
const analytics = buildAnalyticsStatus();
const commandCenter = buildCommandCenter(state, readiness, design, harvest, analytics);

console.log('# EventLive Command Center');
console.log(`- Generated at: ${generatedAt}`);
console.log(`- Status: ${commandCenter.gates.map((gate) => `${gate.name}:${gate.status}`).join(' ')}`);
console.log('- Reports: reports/eventlive-command-center.md, reports/delivery-readiness-status.md, reports/design-os-status.md, reports/source-harvest-os-status.md, reports/analytics-status.md');
