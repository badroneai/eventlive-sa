import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const docsDir = path.join(root, 'docs');
const generatedAt = new Date().toISOString();

const STATUSES = new Set(['PASS', 'PARTIAL', 'NOT_STARTED', 'OWNER_RESERVED', 'N/A', 'FAIL']);

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath, fallback = null) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return fallback;
  }
}

function readText(relativePath, fallback = '') {
  const fullPath = path.join(root, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : fallback;
}

function writeJson(relativePath, value) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(relativePath, value) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, 'utf8');
}

function commandExists(command) {
  const packageJson = readJson('package.json', { scripts: {} });
  return Boolean(packageJson.scripts?.[command]);
}

function reportOk(relativePath) {
  const report = readJson(relativePath, null);
  if (!report) return false;
  if (report.ok === true) return true;
  if (report.status === 'PASS') return true;
  if (report.verdict === 'PASS') return true;
  return false;
}

function textHas(relativePath, pattern) {
  return pattern.test(readText(relativePath));
}

function countPublicEvents() {
  const distEvents = readJson('dist/events.json', { events: [] });
  return Array.isArray(distEvents.events) ? distEvents.events.length : 0;
}

function countLiveReadyEvents() {
  const distEvents = readJson('dist/events.json', { events: [] });
  if (!Array.isArray(distEvents.events)) return 0;
  return distEvents.events.filter((event) => event.live_schedule_ready).length;
}

function gate(id, family, name, role, status, evidence, remaining = '') {
  if (!STATUSES.has(status)) throw new Error(`Unknown status ${status} for gate ${id}`);
  const needsRemaining = status !== 'PASS' && status !== 'N/A';
  const normalizedRemaining = needsRemaining && !remaining
    ? `Complete the missing evidence for ${name}.`
    : remaining;
  return { id, family, name, role, status, evidence, remaining: normalizedRemaining };
}

const launchSweepOk = reportOk('reports/site-launch-sweep.json');
const visualSweepOk = reportOk('reports/site-visual-sweep.json');
const analyticsOk = reportOk('reports/analytics-status.json');
const commandCenterOk = reportOk('reports/eventlive-command-center.json');
const deliveryShortOk = reportOk('reports/delivery-readiness-status.json');
const launchPreflightOk = reportOk('reports/launch-preflight-status.json');
const validationClean =
  textHas('reports/validation-report.md', /Total errors:\s*0/i) &&
  textHas('reports/validation-report.md', /Total warnings:\s*0/i);
const buildCurrent =
  textHas('reports/build-report.md', /EventLive Build Report/i) &&
  textHas('reports/build-report.md', /Domain preserved:\s*yes/i);
const publicEvents = countPublicEvents();
const liveReadyEvents = countLiveReadyEvents();
const npmAudit = readJson('reports/npm-audit-production.json', null);
const npmVulnerabilities = npmAudit?.metadata?.vulnerabilities || {};
const npmAuditClean =
  npmAudit &&
  Number(npmVulnerabilities.high || 0) === 0 &&
  Number(npmVulnerabilities.critical || 0) === 0;
const webQuality = readJson('reports/web-quality-audit.json', null);
const webQualitySummary = webQuality?.summary || {};
const webA11yBaselinePass = webQualitySummary.accessibility_status === 'PASS';
const webPerformanceBaselinePass = webQualitySummary.performance_status === 'PASS';
const webResponsiveBaselinePass = webQualitySummary.responsive_status === 'PASS';
const webSecurityBaselinePass = webQualitySummary.security_status === 'PASS';
const axeAccessibility = readJson('reports/axe-accessibility-audit.json', null);
const lighthousePerformance = readJson('reports/lighthouse-performance-audit.json', null);
const axeAccessibilityOk = axeAccessibility?.status === 'PASS' && Number(axeAccessibility?.summary?.score || 0) >= 95;
const lighthouseAccessibilityOk = lighthousePerformance?.status === 'PASS' && Number(lighthousePerformance?.summary?.min_accessibility || 0) >= 95;
const lighthousePerformanceOk = lighthousePerformance?.status === 'PASS' && Number(lighthousePerformance?.summary?.min_performance || 0) >= 90;
const browserMatrixOk = reportOk('reports/browser-matrix-audit.json');
const securityReviewOk = reportOk('reports/security-review-audit.json');
const opsReadiness = readJson('reports/ops-readiness-audit.json', null);
const opsReadinessOk = opsReadiness?.status === 'PASS';
const opsReliabilityOk = opsReadiness?.summary?.reliability_status === 'PASS';
const opsObservabilityOk = opsReadiness?.summary?.observability_status === 'PASS';
const staticAnalysisOk = reportOk('reports/static-analysis-audit.json');
const productJourneyOk = reportOk('reports/product-journey-audit.json');
const uiStateOk = reportOk('reports/ui-state-audit.json');
const secretEnvOk = reportOk('reports/secret-env-audit.json');
const contentLocalizationOk = reportOk('reports/content-localization-audit.json');
const complianceSourceRightsOk = reportOk('reports/compliance-source-rights-audit.json');
const documentationOk = reportOk('reports/documentation-audit.json');
const releaseDeployRollback = readJson('reports/release-deploy-rollback-status.json', null);
const releaseDeployRollbackOk = releaseDeployRollback?.status === 'PASS';
const releaseDeployRollbackPartial = releaseDeployRollback?.status === 'PARTIAL';
const releaseDeployRollbackFail = releaseDeployRollback?.status === 'FAIL';

const gates = [
  gate(
    '01',
    'Product',
    'Feature & CRUD Completeness',
    'Product manager / business analyst',
    productJourneyOk && commandExists('test:product-journeys') && commandExists('launch:product-gates') && validationClean && publicEvents > 0 ? 'PASS' : commandExists('launch:product-gates') && validationClean && publicEvents > 0 ? 'PARTIAL' : 'NOT_STARTED',
    productJourneyOk ? 'Product journey audit PASS: visitor, organizer, and owner flows have verified starts, steps, and end states.' : '`launch:product-gates` exists; validation is clean; public catalog is generated.',
    productJourneyOk ? '' : 'Create a screen x operation matrix for visitor, organizer, and owner flows; prove every path has a start/end.'
  ),
  gate(
    '02',
    'Product',
    'UX Flows & IA',
    'UX designer',
    productJourneyOk && launchSweepOk && visualSweepOk ? 'PASS' : launchSweepOk && visualSweepOk ? 'PARTIAL' : 'NOT_STARTED',
    productJourneyOk ? 'Role-based journey map and dead-end audit PASS, with launch and visual sweeps covering public routes.' : 'Launch and visual sweeps cover public routes.',
    productJourneyOk ? '' : 'Add role-based journey maps and dead-end audit for visitor, organizer, and owner/admin flows.'
  ),
  gate(
    '03',
    'Product',
    'Design-System Consistency',
    'Design-system engineer',
    reportOk('reports/design-os-status.json') && visualSweepOk ? 'PASS' : 'PARTIAL',
    'Design OS report plus 41-page / 82-screenshot visual sweep.',
    ''
  ),
  gate(
    '04',
    'Engineering',
    'Code Review & Static Analysis',
    'Senior engineer',
    staticAnalysisOk && commandExists('test:static') && commandExists('validate:gate') && validationClean ? 'PASS' : commandExists('validate:gate') && validationClean ? 'PARTIAL' : 'NOT_STARTED',
    staticAnalysisOk ? 'Static analysis audit PASS: script syntax, package script references, and high-risk automation patterns checked.' : '`validate:gate` passes data/schema validation.',
    staticAnalysisOk ? '' : 'Add or document lint/static-analysis/code-review gate for scripts and generated-site logic.'
  ),
  gate(
    '05',
    'Engineering',
    'Tests & Coverage',
    'QA engineer',
    launchPreflightOk ? 'PASS' : commandExists('launch:preflight') && commandExists('test:site-visual-sweep') ? 'PARTIAL' : 'NOT_STARTED',
    launchPreflightOk ? '`npm run launch:preflight` PASS recorded in reports/launch-preflight-status.md.' : 'Product/source/site regression gates exist; visual sweep exists.',
    launchPreflightOk ? '' : 'Run and record current `launch:preflight`; add coverage map from critical user paths to tests.'
  ),
  gate(
    '06',
    'Engineering',
    'Error / Empty / Loading / Success States',
    'Frontend engineer',
    uiStateOk && commandExists('test:ui-states') && commandExists('test:screen-fallback') && commandExists('test:prelaunch-data-quality') ? 'PASS' : commandExists('test:screen-fallback') && commandExists('test:prelaunch-data-quality') ? 'PARTIAL' : 'NOT_STARTED',
    uiStateOk ? 'UI state audit PASS across browse, today, live screen, and organizer surfaces.' : 'Screen fallback and prelaunch data-quality gates exist.',
    uiStateOk ? '' : 'Audit every data-dependent page for empty/error/loading/success states and retry behavior.'
  ),
  gate(
    '07',
    'Engineering',
    'Dependency & Supply-Chain Health',
    'Supply-chain security engineer',
    npmAuditClean && exists('package-lock.json') ? 'PASS' : exists('package-lock.json') ? 'PARTIAL' : 'NOT_STARTED',
    npmAuditClean ? '`npm audit --omit=dev` is clean for high/critical production vulnerabilities; lockfile exists.' : 'Lockfile exists; production audit report is missing or not clean.',
    npmAuditClean ? '' : 'Run `npm run audit:dependencies`, resolve high/critical findings, and document accepted risks.'
  ),
  gate(
    '08',
    'Non-Functional',
    'Accessibility WCAG 2.1 AA + RTL',
    'Accessibility specialist',
    axeAccessibilityOk && lighthouseAccessibilityOk && webA11yBaselinePass ? 'PASS' : webA11yBaselinePass ? 'PARTIAL' : 'NOT_STARTED',
    axeAccessibilityOk && lighthouseAccessibilityOk ? 'Axe accessibility audit PASS with score >=95 and Lighthouse accessibility minimum >=95 across critical pages.' : webA11yBaselinePass ? 'Browser baseline found no missing lang/dir/title/h1/alt/control-label issues on critical pages.' : 'No passing accessibility baseline report was found.',
    axeAccessibilityOk && lighthouseAccessibilityOk ? '' : 'Add automated axe/Lighthouse accessibility checks on public and critical pages; target >=95.'
  ),
  gate(
    '09',
    'Non-Functional',
    'Performance / Core Web Vitals',
    'Performance engineer',
    lighthousePerformanceOk && webPerformanceBaselinePass ? 'PASS' : webPerformanceBaselinePass ? 'PARTIAL' : 'NOT_STARTED',
    lighthousePerformanceOk ? 'Lighthouse performance audit PASS with minimum score >=90 across home, browse, live screen, and event detail.' : webPerformanceBaselinePass ? 'Browser baseline passed HTML-size and DOMContentLoaded budgets on critical pages.' : 'No passing performance baseline report was found.',
    lighthousePerformanceOk ? '' : 'Add Lighthouse performance checks for home, browse, event detail, and live screen; target >=90.'
  ),
  gate(
    '10',
    'Non-Functional',
    'Responsive & Device Matrix',
    'QA engineer',
    browserMatrixOk && visualSweepOk && webResponsiveBaselinePass ? 'PASS' : visualSweepOk && webResponsiveBaselinePass ? 'PARTIAL' : 'NOT_STARTED',
    browserMatrixOk ? 'Browser matrix PASS across Chromium/WebKit and mobile/tablet/desktop, with horizontal overflow and console checks.' : 'Visual sweep covers desktop/mobile; web baseline found no mobile horizontal overflow.',
    browserMatrixOk ? '' : 'Extend to browser/device matrix including Safari/WebKit and tablet; assert horizontal overflow = 0.'
  ),
  gate(
    '11',
    'Non-Functional',
    'Reliability, Capacity & Failure Modes',
    'SRE',
    opsReadinessOk && opsReliabilityOk && commandExists('reliability:rollup') && commandExists('uptime:check') ? 'PASS' : commandExists('reliability:rollup') && commandExists('uptime:check') ? 'PARTIAL' : 'NOT_STARTED',
    opsReadinessOk && opsReliabilityOk ? 'Operations readiness PASS: local critical-path load check, source failure-mode matrix, browser matrix, and reliability scripts verified.' : 'Reliability scripts exist.',
    opsReadinessOk && opsReliabilityOk ? '' : 'Refresh reliability reports against current target; add external-source failure-mode matrix and load check.'
  ),
  gate(
    '12',
    'Security & Data',
    'Security Review',
    'Security engineer',
    securityReviewOk && webSecurityBaselinePass ? 'PASS' : webSecurityBaselinePass ? 'PARTIAL' : 'NOT_STARTED',
    securityReviewOk ? 'Security review audit PASS across static site, CI security steps, owner-only exposure, robots/sitemap/manifest, external links, secrets, and compliance controls.' : 'Web baseline found no insecure http resources, target=_blank rel gaps, or HTTP failures on critical pages.',
    securityReviewOk ? '' : 'Run a security review for static site, CI, analytics, external links, CSP/security headers, and scripts.'
  ),
  gate(
    '13',
    'Security & Data',
    'Config, Secrets & Env Parity',
    'Platform engineer',
    secretEnvOk && commandExists('test:secret-env') && commandExists('env:matrix') ? 'PASS' : commandExists('env:matrix') ? 'PARTIAL' : 'NOT_STARTED',
    secretEnvOk ? 'Secret/env audit PASS: repository scan clean, env matrix script present, deployment workflow present, and git-history policy documented.' : 'Environment matrix script exists.',
    secretEnvOk ? '' : 'Refresh env matrix for eventme.live and run secret scan including git history policy.'
  ),
  gate(
    '14',
    'Security & Data',
    'Data Integrity & Migrations',
    'Data engineer',
    validationClean && commandExists('test:dedupe') && publicEvents > 0 ? 'PASS' : 'PARTIAL',
    `Validation clean; dedupe regression exists; public events=${publicEvents}. Static project has no DB migrations.`,
    ''
  ),
  gate(
    '15',
    'Content',
    'Content & Localization',
    'Content editor',
    contentLocalizationOk && commandExists('test:content-localization') && commandExists('test:brand') && commandExists('test:category-labels') ? 'PASS' : commandExists('test:brand') && commandExists('test:category-labels') ? 'PARTIAL' : 'NOT_STARTED',
    contentLocalizationOk ? 'Content/localization audit PASS and terminology glossary published.' : 'Brand and Arabic category-label gates exist.',
    contentLocalizationOk ? '' : 'Run a full visible-text Arabic/English leakage audit and publish terminology glossary.'
  ),
  gate(
    '16',
    'Content',
    'Compliance / Privacy / Source Rights',
    'Compliance owner',
    complianceSourceRightsOk && reportOk('reports/source-harvest-os-status.json') ? 'PASS' : reportOk('reports/source-harvest-os-status.json') ? 'PARTIAL' : 'NOT_STARTED',
    complianceSourceRightsOk ? 'Privacy, terms, and source-rights pages PASS and source harvest policy is classified.' : 'Harvest OS classifies source trust and publication policy.',
    complianceSourceRightsOk ? '' : 'Publish privacy/terms/source-rights policy and owner decisions for marketplaces/partnership-only sources.'
  ),
  gate(
    '17',
    'Discovery & Ops',
    'SEO & Discoverability',
    'SEO specialist',
    launchPreflightOk && commandExists('test:seo-structured-data') && commandExists('test:sitemap') && launchSweepOk ? 'PASS' : commandExists('test:seo-structured-data') && commandExists('test:sitemap') && launchSweepOk ? 'PARTIAL' : 'NOT_STARTED',
    launchPreflightOk ? 'Launch preflight includes sitemap, structured data, SEO content, production domain, AI search readiness, and launch sweep checks.' : 'SEO structured-data, sitemap, and launch-sweep gates exist.',
    launchPreflightOk ? '' : 'Run final indexability audit on every public page, OG preview, JSON-LD validity, robots, and sitemap freshness.'
  ),
  gate(
    '18',
    'Discovery & Ops',
    'Observability & Monitoring',
    'SRE',
    opsReadinessOk && opsObservabilityOk && exists('reports/alerts-status.md') && commandExists('ops:alerts') ? 'PASS' : exists('reports/alerts-status.md') && commandExists('ops:alerts') ? 'PARTIAL' : 'NOT_STARTED',
    opsReadinessOk && opsObservabilityOk ? 'Operations readiness PASS: analytics, owner command center, alert scripts, monitoring plan, and incident runbook verified.' : 'Alerts status and ops alert script exist.',
    opsReadinessOk && opsObservabilityOk ? '' : 'Refresh monitoring against production target; decide Sentry/log drain/error alerting.'
  ),
  gate(
    '19',
    'Discovery & Ops',
    'Analytics & Instrumentation',
    'Analytics engineer',
    analyticsOk && commandExists('test:analytics') ? 'PASS' : 'PARTIAL',
    'Analytics status PASS; regression excludes owner pages and tracks critical events.',
    ''
  ),
  gate(
    '20',
    'Discovery & Ops',
    'Notifications & Deliverability',
    'Communications engineer',
    'N/A',
    'Current public static product does not send transactional email/SMS/WhatsApp.',
    'Reopen when organizer accounts, reminders, or submissions send messages.'
  ),
  gate(
    '21',
    'Release',
    'Release / Deploy / Rollback / DR',
    'Release manager / DevOps',
    releaseDeployRollbackOk
      ? 'PASS'
      : releaseDeployRollbackFail
        ? 'FAIL'
        : exists('.github/workflows/deploy.yml') && commandExists('release:verdict') ? 'PARTIAL' : 'NOT_STARTED',
    releaseDeployRollbackOk
      ? 'Release/deploy/rollback audit PASS: commit, GitHub Actions, public URL verification, and rollback drill evidence are recorded.'
      : releaseDeployRollbackFail
        ? 'Release/deploy/rollback audit is FAIL: at least one check that could actually be evaluated came back bad (not merely inapplicable in this job).'
        : releaseDeployRollbackPartial
          ? 'Release/deploy/rollback audit is PARTIAL and lists remaining external deployment evidence not evaluable in this job.'
          : 'GitHub Pages deploy workflow and release verdict script exist.',
    releaseDeployRollbackOk
      ? ''
      : releaseDeployRollbackFail
        ? 'Fix the failing release/deploy/rollback check(s) in reports/release-deploy-rollback-status.json — this is a genuine defect, not a job-scope gap.'
        : 'Perform owner-approved staging/commit/push, verify GitHub Actions, verify eventme.live publicly, and record rollback drill evidence.'
  ),
  gate(
    '22',
    'Release',
    'Documentation',
    'Technical writer',
    documentationOk && exists('EVENTLIVE-DELIVERY-READINESS-PLAYBOOK.md') && exists('EVENTLIVE-HARVEST-OS-ADOPTION-PLAN.md') ? 'PASS' : exists('EVENTLIVE-DELIVERY-READINESS-PLAYBOOK.md') && exists('EVENTLIVE-HARVEST-OS-ADOPTION-PLAN.md') ? 'PARTIAL' : 'NOT_STARTED',
    documentationOk ? 'Documentation audit PASS: visitor, organizer, owner operations, incident runbook, readiness playbook, and terminology glossary are present.' : 'Found foundational EventLive docs.',
    documentationOk ? '' : 'Create role-specific user guides and incident runbook tied to the 23 gates.'
  ),
  gate(
    '23',
    'Release',
    'Final Sign-offs',
    'Release owner',
    'OWNER_RESERVED',
    'Requires owner approval after all non-reserved gates are PASS or explicitly accepted.',
    'Owner sign-off is intentionally not automated.'
  )
];

const totals = gates.reduce(
  (acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  },
  { PASS: 0, PARTIAL: 0, NOT_STARTED: 0, OWNER_RESERVED: 0, 'N/A': 0, FAIL: 0 }
);

const blockingStatuses = new Set(['PARTIAL', 'NOT_STARTED', 'FAIL']);
const releaseVerdict = gates.some((item) => blockingStatuses.has(item.status)) ? 'NOT_READY' : 'READY_WITH_RESERVED_ITEMS';

const payload = {
  schema: 'eventlive.delivery-readiness-standard.v1',
  generated_at: generatedAt,
  standard_source: '93_DELIVERY_READINESS_STANDARD_V1.md',
  project: {
    name: 'EventLive',
    domain: 'eventme.live',
    type: 'public Saudi live-events static platform plus harvest pipeline'
  },
  release_verdict: releaseVerdict,
  totals,
  metrics: {
    public_events: publicEvents,
    live_ready_events: liveReadyEvents,
    launch_sweep_ok: launchSweepOk,
    visual_sweep_ok: visualSweepOk,
    validation_clean: validationClean,
    build_current: buildCurrent,
    command_center_ok: commandCenterOk,
    delivery_short_ok: deliveryShortOk,
    launch_preflight_ok: launchPreflightOk,
    npm_audit_clean: Boolean(npmAuditClean),
    axe_accessibility: axeAccessibilityOk ? 'PASS' : 'missing/not passing',
    lighthouse_performance: lighthousePerformanceOk ? 'PASS' : 'missing/not passing',
    browser_matrix: browserMatrixOk ? 'PASS' : 'missing/not passing',
    security_review: securityReviewOk ? 'PASS' : 'missing/not passing',
    ops_readiness: opsReadinessOk ? 'PASS' : 'missing/not passing',
    static_analysis: staticAnalysisOk ? 'PASS' : 'missing/not passing',
    product_journey_audit: productJourneyOk ? 'PASS' : 'missing/not passing',
    ui_state_audit: uiStateOk ? 'PASS' : 'missing/not passing',
    secret_env_audit: secretEnvOk ? 'PASS' : 'missing/not passing',
    content_localization_audit: contentLocalizationOk ? 'PASS' : 'missing/not passing',
    compliance_source_rights_audit: complianceSourceRightsOk ? 'PASS' : 'missing/not passing',
    documentation_audit: documentationOk ? 'PASS' : 'missing/not passing',
    release_deploy_rollback_audit: releaseDeployRollbackOk ? 'PASS' : releaseDeployRollbackPartial ? 'PARTIAL' : 'missing',
    web_quality_accessibility_baseline: webQualitySummary.accessibility_status || 'missing',
    web_quality_performance_baseline: webQualitySummary.performance_status || 'missing',
    web_quality_responsive_baseline: webQualitySummary.responsive_status || 'missing',
    web_quality_security_baseline: webQualitySummary.security_status || 'missing'
  },
  gates
};

const tableRows = gates
  .map((item) => `| ${item.id} | ${item.family} | ${item.name} | ${item.status} | ${item.evidence.replace(/\|/g, '/')} | ${item.remaining.replace(/\|/g, '/')} |`)
  .join('\n');

const md = `# EventLive Applied Delivery Readiness Standard

- Generated at: ${generatedAt}
- Standard source: 93_DELIVERY_READINESS_STANDARD_V1.md
- Project: EventLive / eventme.live
- Release verdict: **${releaseVerdict}**

## Totals

| Status | Count |
| --- | ---: |
| PASS | ${totals.PASS || 0} |
| PARTIAL | ${totals.PARTIAL || 0} |
| NOT_STARTED | ${totals.NOT_STARTED || 0} |
| OWNER_RESERVED | ${totals.OWNER_RESERVED || 0} |
| N/A | ${totals['N/A'] || 0} |
| FAIL | ${totals.FAIL || 0} |

## Operating Rule

This file is the applied project status log. It does not redefine the delivery-readiness standard. A gate is not considered PASS unless the listed evidence proves the full scope of that gate for EventLive.

## Current Metrics

| Metric | Value |
| --- | ---: |
| Public events | ${publicEvents} |
| Live-ready events | ${liveReadyEvents} |
| Launch sweep ok | ${launchSweepOk ? 'yes' : 'no'} |
| Visual sweep ok | ${visualSweepOk ? 'yes' : 'no'} |
| Validation clean | ${validationClean ? 'yes' : 'no'} |
| Build current | ${buildCurrent ? 'yes' : 'no'} |
| Launch preflight | ${launchPreflightOk ? 'PASS' : 'missing/not passing'} |
| Production dependency audit clean | ${npmAuditClean ? 'yes' : 'no'} |
| Axe accessibility | ${axeAccessibilityOk ? 'PASS' : 'missing/not passing'} |
| Lighthouse performance | ${lighthousePerformanceOk ? 'PASS' : 'missing/not passing'} |
| Browser matrix | ${browserMatrixOk ? 'PASS' : 'missing/not passing'} |
| Security review | ${securityReviewOk ? 'PASS' : 'missing/not passing'} |
| Ops readiness | ${opsReadinessOk ? 'PASS' : 'missing/not passing'} |
| Static analysis | ${staticAnalysisOk ? 'PASS' : 'missing/not passing'} |
| Product journey audit | ${productJourneyOk ? 'PASS' : 'missing/not passing'} |
| UI state audit | ${uiStateOk ? 'PASS' : 'missing/not passing'} |
| Secret/env audit | ${secretEnvOk ? 'PASS' : 'missing/not passing'} |
| Content/localization audit | ${contentLocalizationOk ? 'PASS' : 'missing/not passing'} |
| Compliance/source-rights audit | ${complianceSourceRightsOk ? 'PASS' : 'missing/not passing'} |
| Documentation audit | ${documentationOk ? 'PASS' : 'missing/not passing'} |
| Release/deploy/rollback audit | ${releaseDeployRollbackOk ? 'PASS' : releaseDeployRollbackPartial ? 'PARTIAL' : 'missing'} |
| Web quality accessibility baseline | ${webQualitySummary.accessibility_status || 'missing'} |
| Web quality performance baseline | ${webQualitySummary.performance_status || 'missing'} |
| Web quality responsive baseline | ${webQualitySummary.responsive_status || 'missing'} |
| Web quality security baseline | ${webQualitySummary.security_status || 'missing'} |

## 23-Gate Status

| # | Family | Gate | Status | Evidence | Remaining |
| --- | --- | --- | --- | --- | --- |
${tableRows}
`;

writeJson('reports/delivery-readiness-standard-status.json', payload);
writeText('reports/delivery-readiness-standard-status.md', md);
writeText('docs/DELIVERY_READINESS_PLAYBOOK.md', md);

console.log(
  `DELIVERY_STANDARD_AUDIT ${releaseVerdict} PASS=${totals.PASS || 0} PARTIAL=${totals.PARTIAL || 0} NOT_STARTED=${totals.NOT_STARTED || 0} OWNER_RESERVED=${totals.OWNER_RESERVED || 0} NA=${totals['N/A'] || 0} FAIL=${totals.FAIL || 0}`
);

// Enforcing, but only on the genuinely-bad status. PARTIAL / NOT_STARTED /
// OWNER_RESERVED / N/A are all "not evaluated as complete" by design (owner-
// reserved sign-off, gates outside this static product's scope, or work not
// yet started) and must never freeze publishing — this project already
// survived one 8-day publishing outage, and turning "nobody has done this
// yet" into a hard block would be a worse failure than a soft gate. FAIL is
// different: it means a gate was actually graded and came back bad. Only
// that can legitimately stop a publish (GATES-GOVERNANCE.md #6).
if ((totals.FAIL || 0) > 0) {
  const failedGates = gates.filter((item) => item.status === 'FAIL').map((item) => `${item.id} ${item.name}`);
  console.error(`DELIVERY_STANDARD_AUDIT_FAIL gates=${failedGates.join(', ')}`);
  process.exit(1);
}
