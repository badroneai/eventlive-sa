// Canonical list of npm scripts in the shared publish-quality battery
// (governance fix 2026-08-02, see GATES-GOVERNANCE.md #5). This is the
// single source of truth: both the orchestrator that actually runs the
// battery (scripts/run-publish-quality-gates.mjs) and anything that needs
// to know "is script X reachable from a workflow that invokes
// ci:publish-quality-gates" (scripts/workflow-gate-resolver.mjs, used by
// scripts/security-review-audit.mjs and
// scripts/publish-gate-drift-regression-test.mjs) import this array instead
// of each keeping their own copy that can silently drift from the real one.
export const PUBLISH_QUALITY_GATES = [
  'test:sitemap',
  'test:seo-content',
  'audit:static', 'test:static',
  'audit:product-journeys', 'test:product-journeys',
  'audit:ui-states', 'test:ui-states',
  'audit:content-localization', 'test:content-localization',
  'audit:compliance-source-rights', 'test:compliance-source-rights',
  'audit:documentation', 'test:documentation',
  'audit:secret-env', 'test:secret-env',
  'audit:dependencies',
  'audit:web-quality', 'test:web-quality',
  'audit:lighthouse', 'test:lighthouse',
  'audit:browser-matrix', 'test:browser-matrix',
  'audit:axe', 'test:axe',
  'audit:security-review', 'test:security-review',
  'audit:ops-readiness', 'test:ops-readiness',
  'audit:release-deploy-rollback', 'test:release-deploy-rollback',
  'readiness:standard', 'test:readiness-standard',
  'owner:command-center', 'test:owner-command-center',
  'test:analytics'
];

// Browser engines the battery above cannot run without. Running the shared
// battery in a workflow that installs fewer engines than this does not skip
// the affected checks — it FAILS them, and the failure cascades: the first
// sync run after the governance fix (30754356956, 2026-08-02) had installed
// only chromium, so audit:browser-matrix died on a missing webkit binary,
// test:browser-matrix failed on its report, and audit:ops-readiness failed
// on top of that because it reads the browser-matrix report as a reliability
// input — one missing engine, four red checks, none of them a real defect.
// scripts/publish-gate-drift-regression-test.mjs asserts every workflow that
// runs the battery installs all of these, so a new publish path cannot
// reintroduce that false alarm.
export const PUBLISH_QUALITY_GATE_BROWSER_ENGINES = ['chromium', 'webkit'];
