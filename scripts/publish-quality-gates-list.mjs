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
