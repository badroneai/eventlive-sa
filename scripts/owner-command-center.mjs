import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, root, writeJson } from './program-lifecycle-utils.mjs';
import { representativeEventPath } from './audit-page-utils.mjs';

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
  const sourceCollection = safeReadJson('reports/source-collection-report.json', null);
  const sourceAutoPublish = safeReadJson('reports/source-auto-publish-report.json', null);
  const sourceSecondaryVerification = safeReadJson('reports/source-secondary-verification-report.json', null);
  const sourceHealthPublic = safeReadJson('dist/source-health.json', null);
  const regionsCoverage = safeReadJson('dist/regions.json', null);
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
    sourceCollection,
    sourceAutoPublish,
    sourceSecondaryVerification,
    sourceHealthPublic,
    regionsCoverage,
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
    ['live_ready', 'الأوقات الرسمية', status(liveReady >= 10, liveReady > 0), `${liveReady} فعالية بوقت أو جلسة رسمية`]
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
    ['event-detail', 'صفحة فعالية', representativeEventPath()],
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
  const collectionRows = state.sourceCollection?.sources || [];
  // A collector error is not automatically a problem with the platform: 30
  // collections are attempted per run against 88 third-party sites, several of
  // them government portals, and any of them can be briefly unreachable. What
  // matters is whether a source is UNLUCKY or DEAD. data/source_run_state.json
  // already tracks error_streak per source, so we can tell the difference
  // instead of guessing.
  //
  // Why this exists (2026-08-05): the verdict used to be PASS only when
  // collector_errors was exactly zero. That is both too strict and too blind —
  // too strict because one transient timeout flipped the whole Harvest OS to
  // NEEDS_WORK, and too blind because it said the identical thing whether a
  // source had failed once or, as was actually the case, four sources had
  // failed 17 runs in a row (moc-cultural-calendar, mos-events,
  // moc-cultural-subportals, qassim-chamber-events). A verdict that reads the
  // same for "unlucky minute" and "dead for four days" tells the owner nothing.
  const CHRONIC_ERROR_STREAK = 3;
  const runStateSources = state.runStateSources || [];
  const runStateById = new Map(runStateSources.map((source) => [source.id, source]));

  // Chronic rot is read from the RUN STATE, not from this run's attempts.
  // Collections rotate — roughly 21-30 of 88 sources are attempted per run — so
  // a source that is dead is simply absent from most runs' error rows. Deriving
  // the verdict from attempts alone (as the first version of this fix did, on
  // 2026-08-05) meant the status flipped to PASS on every run that happened not
  // to knock on the dead source's door: four collectors sat at a 17-run failure
  // streak while the verdict read PASS. That is the very failure this work
  // exists to end — a gate reporting green because it did not look.
  // error_streak persists across runs, so it still knows.
  const transientErrors = collectionRows
    .filter((source) => source.status === 'error')
    .map((source) => ({ ...source, error_streak: Number(runStateById.get(source.id)?.error_streak || 0) }))
    .filter((source) => source.error_streak < CHRONIC_ERROR_STREAK);
  const chronicErrors = runStateSources
    .filter((source) => Number(source.error_streak || 0) >= CHRONIC_ERROR_STREAK)
    // Sources we have deliberately stopped harvesting are not rot to chase.
    .filter((source) => !['blocked_or_closed', 'partnership_required'].includes(source.intake_policy))
    .map((source) => ({
      id: source.id,
      note: source.last_zero_yield_reason || 'collector error',
      error_streak: Number(source.error_streak || 0),
      attempted_this_run: Boolean(source.attempted_this_run)
    }));
  const collectorErrors = [...chronicErrors, ...transientErrors];
  const productiveSources = collectionRows.filter((source) => Number(source.extracted || 0) > 0);
  const publishTotals = state.sourceAutoPublish?.totals || {};
  const verificationTotals = state.sourceSecondaryVerification?.totals || {};
  const blockedReasons = countBy(state.sourceAutoPublish?.blocked || [], (candidate) => candidate.reason || 'unknown');
  const funnel = {
    discovered_this_run: Number(state.sourceCollection?.candidates_discovered || 0),
    candidate_queue: Number(state.sourceCollection?.candidates_written || state.candidates.length),
    evaluated_for_publish: Number(publishTotals.candidates_seen || 0),
    linked_existing: Number(publishTotals.linked_existing || 0),
    published_new: Number(publishTotals.published || 0),
    blocked: Number(publishTotals.blocked || 0),
    secondary_promoted: Number(verificationTotals.promoted || 0),
    secondary_still_blocked: Number(verificationTotals.still_blocked || 0)
  };
  const report = {
    schema: 'eventlive.harvest-os-status.v1',
    generated_at: generatedAt,
    // PASS tolerates bad luck and never tolerates rot: any source that has
    // failed CHRONIC_ERROR_STREAK runs in a row is a real defect the owner must
    // see, while isolated transient errors below a fifth of this run's attempts
    // are the normal weather of scraping other people's websites.
    status: sources.length > 0
      && state.sourceOps
      && chronicErrors.length === 0
      && transientErrors.length <= Math.max(1, Math.floor(collectionRows.length * 0.2))
      ? 'PASS'
      : 'NEEDS_WORK',
    operating_rule: 'Probe before new sources; sample before full harvest; Raw collection is not publication; discovery-only never auto-publishes.',
    totals: {
      sources: sources.length,
      candidates: state.candidates.length,
      matched_candidates: matchedCandidates,
      auto_publish_sources: policies.auto_publish || 0,
      candidate_only_sources: policies.candidate_only || 0,
      partnership_required_sources: policies.partnership_required || 0,
      blocked_or_closed_sources: policies.blocked_or_closed || 0,
      manual_review_sources: policies.manual_review || 0,
      collection_attempted: collectionRows.length,
      productive_sources: productiveSources.length,
      collector_errors: collectorErrors.length,
      chronic_collector_errors: chronicErrors.length,
      transient_collector_errors: transientErrors.length
    },
    policies,
    candidates_by_gate: candidatesByGate,
    funnel,
    blocked_reasons: blockedReasons,
    collector_error_sources: collectorErrors
      .slice()
      .sort((a, b) => b.error_streak - a.error_streak)
      .map((source) => ({
        id: source.id,
        note: String(source.note || 'collector error').replaceAll('\n', ' ').slice(0, 200),
        error_streak: source.error_streak,
        kind: source.error_streak >= CHRONIC_ERROR_STREAK ? 'chronic' : 'transient',
        attempted_this_run: source.attempted_this_run !== undefined ? Boolean(source.attempted_this_run) : true
      })),
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
    `- Productive sources / attempted: ${report.totals.productive_sources}/${report.totals.collection_attempted}`,
    `- Collector errors: ${report.totals.collector_errors} (chronic ${report.totals.chronic_collector_errors}, transient ${report.totals.transient_collector_errors})`,
    '',
    '## Publication Funnel',
    '',
    mdTable(['Stage', 'Count'], Object.entries(report.funnel).map(([stage, value]) => [stage, value])),
    '',
    '## Blocked Reasons',
    '',
    mdTable(['Reason', 'Count'], Object.entries(report.blocked_reasons).sort((a, b) => b[1] - a[1])),
    '',
    '## Collector Errors',
    '',
    mdTable(['Source', 'Kind', 'Failed runs in a row', 'Attempted this run', 'Reason'], report.collector_error_sources.map((source) => [source.id, source.kind, String(source.error_streak), source.attempted_this_run ? 'yes' : 'no', source.note])),
    '',
    mdTable(['Source', 'Policy', 'Trust', 'Gate'], sources.slice(0, 80).map((source) => [source.name || source.id, source.publish_policy, source.trust_level, source.candidate_gate])),
    ''
  ].join('\n'));
  return report;
}

function buildAnalyticsStatus() {
  const provider = process.env.EVENTLIVE_ANALYTICS_PROVIDER || 'umami';
  const domain = process.env.EVENTLIVE_ANALYTICS_DOMAIN || 'eventme.live';
  const dashboardUrl = process.env.EVENTLIVE_ANALYTICS_DASHBOARD_URL || 'https://umami-ten-orpin.vercel.app';
  const dashboardConfirmed = process.env.EVENTLIVE_ANALYTICS_CONFIRMED === 'true';
  const dashboardStatus = dashboardConfirmed ? 'CONFIRMED' : 'NEEDS_PROVIDER_SETUP';
  const dashboardLoginUrl = 'https://umami-ten-orpin.vercel.app/login';
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
  const nationalCoverage = state.regionsCoverage?.national_coverage || {};
  const decisions = [
    ['analytics_provider', 'اختيار/تفعيل حساب Analytics فعلي', analytics.provider === 'umami' ? 'Umami ذاتي الاستضافة (قرار 2026-08-06)' : analytics.provider],
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
    ['Analytics', analytics.status, 'reports/analytics-status.md'],
    ['National Coverage', nationalCoverage.verdict || 'NOT_STARTED', 'dist/regions.json']
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
      delivery_standard_not_started: state.deliveryStandard?.totals?.NOT_STARTED || 0,
      published_last_sync: harvest.funnel?.published_new || 0,
      linked_existing_last_sync: harvest.funnel?.linked_existing || 0,
      blocked_last_sync: harvest.funnel?.blocked || 0,
      collector_errors: harvest.totals?.collector_errors || 0,
      national_coverage_score: nationalCoverage.score || 0,
      active_regions: nationalCoverage.active_regions || 0,
      zero_active_regions: nationalCoverage.zero_active_regions || 0,
      active_target_cities: nationalCoverage.active_target_cities || 0,
      target_cities: nationalCoverage.target_cities || 0,
      riyadh_active_share: nationalCoverage.riyadh_active_share || 0
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
    `- Last sync published / linked / blocked: ${report.totals.published_last_sync}/${report.totals.linked_existing_last_sync}/${report.totals.blocked_last_sync}`,
    `- Collector errors: ${report.totals.collector_errors}`,
    `- National coverage score: ${report.totals.national_coverage_score}/100`,
    `- Active regions / zero-active regions: ${report.totals.active_regions}/${report.totals.zero_active_regions}`,
    `- Active target cities: ${report.totals.active_target_cities}/${report.totals.target_cities}`,
    `- Riyadh share of active events: ${Math.round(report.totals.riyadh_active_share * 100)}%`,
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
      <article class="card"><span class="muted">نُشرت آخر دورة</span><b>${report.totals.published_last_sync}</b></article>
      <article class="card"><span class="muted">رُبطت بموجود</span><b>${report.totals.linked_existing_last_sync}</b></article>
      <article class="card"><span class="muted">محجوبة للتحقق</span><b>${report.totals.blocked_last_sync}</b></article>
      <article class="card"><span class="muted">أخطاء الجوامع</span><b>${report.totals.collector_errors}</b></article>
      <article class="card"><span class="muted">درجة التغطية الوطنية</span><b>${report.totals.national_coverage_score}/100</b></article>
      <article class="card"><span class="muted">المناطق النشطة</span><b>${report.totals.active_regions}/13</b></article>
      <article class="card"><span class="muted">المدن المستهدفة النشطة</span><b>${report.totals.active_target_cities}/${report.totals.target_cities}</b></article>
      <article class="card"><span class="muted">حصة الرياض من القادم</span><b>${Math.round(report.totals.riyadh_active_share * 100)}%</b></article>
    </div>
    <h2>قمع الجلب والنشر</h2>
    <table><tr><th>المرحلة</th><th>العدد</th></tr>${Object.entries(harvest.funnel || {}).map(([stage, value]) => `<tr><td><code>${htmlEscape(stage)}</code></td><td>${value}</td></tr>`).join('')}</table>
    <h2>لماذا لم تُنشر المرشحات؟</h2>
    <table><tr><th>السبب</th><th>العدد</th></tr>${Object.entries(harvest.blocked_reasons || {}).sort((a, b) => b[1] - a[1]).map(([reason, value]) => `<tr><td>${htmlEscape(reason)}</td><td>${value}</td></tr>`).join('')}</table>
    <h2>مصادر تحتاج إصلاحًا</h2>
    <table><tr><th>المصدر</th><th>العلة</th></tr>${(harvest.collector_error_sources || []).map((source) => `<tr><td><code>${htmlEscape(source.id)}</code></td><td>${htmlEscape(source.note)}</td></tr>`).join('')}</table>
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

// This is a build step, not a verdict script: it must fail if it fails to
// build, not silently succeed with partial or empty output
// (GATES-GOVERNANCE.md #6). Every write above (writeJson/writeText -> fs.
// writeFileSync) already throws on any real I/O or JSON-parse failure, and
// an uncaught exception here already exits the process non-zero by default
// — verified empirically (EACCES on an existing report file crashes with
// exit code 1, no try/catch anywhere in this file swallows it). This block
// adds the one thing that implicit behavior does NOT cover: confirming the
// build actually produced real, non-empty output, so a future logic bug
// that writes a technically-valid-but-empty/wrong report does not slip
// through as a silent "success". Uses node:assert so a regression here is
// both loud (throws) and grep-detectable as an enforcing script.
const requiredOutputs = [
  'reports/eventlive-command-center.json',
  'reports/eventlive-command-center.md',
  'reports/delivery-readiness-status.json',
  'reports/design-os-status.json',
  'reports/source-harvest-os-status.json',
  'reports/analytics-status.json'
];
for (const relativePath of requiredOutputs) {
  const fullPath = path.join(root, relativePath);
  assert.ok(exists(fullPath), `owner:command-center did not write ${relativePath} — build failed`);
  assert.ok(fs.statSync(fullPath).size > 0, `owner:command-center wrote an empty ${relativePath} — build failed`);
}
assert.ok(Array.isArray(commandCenter.gates) && commandCenter.gates.length > 0, 'owner:command-center produced a command center report with no gates — build failed');

console.log('# EventLive Command Center');
console.log(`- Generated at: ${generatedAt}`);
console.log(`- Status: ${commandCenter.gates.map((gate) => `${gate.name}:${gate.status}`).join(' ')}`);
console.log('- Reports: reports/eventlive-command-center.md, reports/delivery-readiness-status.md, reports/design-os-status.md, reports/source-harvest-os-status.md, reports/analytics-status.md');
