import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PUBLISH_QUALITY_GATES } from './publish-quality-gates-list.mjs';
import { workflowRunsScript } from './workflow-gate-resolver.mjs';

// Publish-gate drift guard (governance fix 2026-08-02, see
// GATES-GOVERNANCE.md).
//
// Root defect this guards against: deploy.yml and source-sync.yml each used
// to inline their own hardcoded list of npm scripts as the "quality gate"
// for a GitHub Pages publish. The lists silently drifted apart — deploy.yml
// ran ~40 audit/regression checks (including audit:axe and audit:lighthouse)
// that source-sync.yml never ran at all — so deploy.yml sat red for five
// days while source-sync.yml kept publishing every few hours through a
// narrower, ungated path and nothing said a word.
//
// This test fails, loudly and specifically, the next time either of these
// two facts stops being true:
//   1. Every workflow that deploys to GitHub Pages invokes the single
//      shared battery (`npm run ci:publish-quality-gates`) — so a third
//      publish path, or a workflow that quietly stops calling the battery,
//      goes red here instead of drifting silently.
//   2. The battery itself (scripts/run-publish-quality-gates.mjs) still
//      contains every check it is supposed to contain, in the right
//      audit-before-test order — so quietly deleting a gate line goes red
//      here instead of rotting silently.
// It also checks the loud-but-non-blocking wiring (Invariant C) and the
// production-pipeline health check (Invariant A) are structurally present,
// not just present by convention.

const root = process.cwd();
const workflowsDir = path.join(root, '.github', 'workflows');

function readWorkflow(name) {
  return fs.readFileSync(path.join(workflowsDir, name), 'utf8');
}

const deployWorkflow = readWorkflow('deploy.yml');
const syncWorkflow = readWorkflow('source-sync.yml');
const runnerScript = fs.readFileSync(path.join(root, 'scripts', 'run-publish-quality-gates.mjs'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// --- 1. Generic guard: any workflow that deploys to GitHub Pages must
// invoke the shared battery, or be explicitly named in this list with a
// reason. A new publish path that skips both goes red here.
//
// Uses scripts/workflow-gate-resolver.mjs — the same resolver
// scripts/security-review-audit.mjs uses — rather than its own grep, so
// "is gate X reachable from workflow Y" is answered in exactly one place.
// ('ci:publish-quality-gates' resolves to itself here since it IS the
// battery script, not a member of it — workflowRunsScript still checks for
// its own literal invocation first.) ---

const PRE_EXISTING_UNGATED_PUBLISH_PATHS = {
  // pages.yml is deliberately left out of the shared battery, not merely
  // undocumented: it is the dispatch-only manual break-glass path this
  // project would need if the *gated* path itself were broken (e.g.
  // deploy.yml's own workflow definition is broken, not just a check
  // inside it). Gating it identically to deploy.yml would remove that
  // escape hatch — see its own header comment and GATES-GOVERNANCE.md #5
  // for the same reasoning stated for humans.
  'pages.yml': 'dispatch-only manual break-glass fallback for when the gated path itself is broken — gating it would remove the one manual path this project would need in that scenario (see its own header comment and GATES-GOVERNANCE.md #5)'
};

const workflowFiles = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml'));
for (const file of workflowFiles) {
  const content = readWorkflow(file);
  const deploysToPages = /uses:\s*actions\/deploy-pages@/.test(content);
  if (!deploysToPages) continue;
  if (Object.prototype.hasOwnProperty.call(PRE_EXISTING_UNGATED_PUBLISH_PATHS, file)) continue;
  assert.ok(
    workflowRunsScript(content, 'ci:publish-quality-gates'),
    `${file} deploys to GitHub Pages (actions/deploy-pages) and must invoke the shared publish-quality battery (npm run ci:publish-quality-gates), or be added to PRE_EXISTING_UNGATED_PUBLISH_PATHS in this test with a reason`
  );
}

// --- 2. The npm script must exist and must run the orchestrator script,
// not a re-inlined `&&` list (which would reintroduce the exact
// short-circuit-hides-later-failures bug this fix closes), and the
// orchestrator must import the gate list from the single shared module
// rather than keeping its own copy (which is what let
// scripts/security-review-audit.mjs and this test drift into disagreement
// with the real battery before the governance-fix-correction on
// 2026-08-02). ---

assert.equal(
  packageJson.scripts['ci:publish-quality-gates'],
  'node scripts/run-publish-quality-gates.mjs',
  'ci:publish-quality-gates must run the dedicated orchestrator script (scripts/run-publish-quality-gates.mjs), not an inline && chain — a chain stops at the first failure and silently skips every later check, which is how audit:axe/test:axe went unexercised for five days behind a red audit:lighthouse'
);

assert.match(
  runnerScript,
  /from ['"]\.\/publish-quality-gates-list\.mjs['"]/,
  'run-publish-quality-gates.mjs must import PUBLISH_QUALITY_GATES from scripts/publish-quality-gates-list.mjs rather than declaring its own copy of the gate list — that is the single source of truth scripts/workflow-gate-resolver.mjs and this test also read'
);

// --- 3. Every check that must never be dropped from the battery, in the
// right audit-before-test order. Read from the same
// scripts/publish-quality-gates-list.mjs module the orchestrator and the
// resolver use — not a fourth hand-copied list — so this test cannot
// silently diverge from what actually runs. ---

const REQUIRED_PAIRS = [
  ['audit:static', 'test:static'],
  ['audit:product-journeys', 'test:product-journeys'],
  ['audit:ui-states', 'test:ui-states'],
  ['audit:content-localization', 'test:content-localization'],
  ['audit:compliance-source-rights', 'test:compliance-source-rights'],
  ['audit:documentation', 'test:documentation'],
  ['audit:secret-env', 'test:secret-env'],
  ['audit:web-quality', 'test:web-quality'],
  ['audit:lighthouse', 'test:lighthouse'],
  ['audit:browser-matrix', 'test:browser-matrix'],
  ['audit:axe', 'test:axe'],
  ['audit:security-review', 'test:security-review'],
  ['audit:ops-readiness', 'test:ops-readiness'],
  ['audit:release-deploy-rollback', 'test:release-deploy-rollback'],
  ['readiness:standard', 'test:readiness-standard'],
  ['owner:command-center', 'test:owner-command-center']
];

const REQUIRED_UNPAIRED = ['test:sitemap', 'test:seo-content', 'audit:dependencies', 'test:analytics'];

// Self-check: REQUIRED_PAIRS + REQUIRED_UNPAIRED above (which encode
// pairing semantics the flat list alone doesn't) must describe exactly the
// canonical PUBLISH_QUALITY_GATES set — no more, no less — or this test's
// own bookkeeping has drifted from the real battery.
{
  const describedHere = new Set([...REQUIRED_PAIRS.flat(), ...REQUIRED_UNPAIRED]);
  const canonical = new Set(PUBLISH_QUALITY_GATES);
  for (const name of canonical) {
    assert.ok(describedHere.has(name), `PUBLISH_QUALITY_GATES contains '${name}' but this test's REQUIRED_PAIRS/REQUIRED_UNPAIRED does not — update this test's bookkeeping to match scripts/publish-quality-gates-list.mjs`);
  }
  for (const name of describedHere) {
    assert.ok(canonical.has(name), `this test's REQUIRED_PAIRS/REQUIRED_UNPAIRED lists '${name}' but PUBLISH_QUALITY_GATES does not — either the canonical list lost it or this test is stale`);
  }
}

function gateIndex(name) {
  const index = PUBLISH_QUALITY_GATES.indexOf(name);
  assert.ok(index !== -1, `PUBLISH_QUALITY_GATES (scripts/publish-quality-gates-list.mjs) must still list '${name}' — a check appears to have been silently dropped from the shared publish-quality battery`);
  return index;
}

for (const name of REQUIRED_UNPAIRED) {
  gateIndex(name);
}

for (const [auditName, testName] of REQUIRED_PAIRS) {
  const auditIdx = gateIndex(auditName);
  const testIdx = gateIndex(testName);
  assert.ok(
    auditIdx < testIdx,
    `${auditName} must run before ${testName} in the shared battery — a test:* step that reads a report must never run ahead of the audit:* step that regenerates it, or it is just reading a possibly-stale committed artifact (see the 2026-07-10 stale axe report finding in GATES-GOVERNANCE.md)`
  );
}

// --- 4. deploy.yml calls the battery BLOCKING (it is the official gated
// pipeline; nothing here should weaken that). ---

{
  const idx = deployWorkflow.indexOf('npm run ci:publish-quality-gates');
  assert.ok(idx !== -1, 'deploy.yml must invoke the shared publish-quality battery');
  const stepStart = deployWorkflow.lastIndexOf('- name:', idx);
  const stepText = deployWorkflow.slice(stepStart, idx + 40);
  assert.doesNotMatch(
    stepText,
    /continue-on-error/,
    'deploy.yml is the official gated pipeline — its publish-quality battery step must stay blocking (no continue-on-error)'
  );
}

// --- 5. source-sync.yml calls the battery LOUD-BUT-NON-BLOCKING
// (Invariant C): continue-on-error on the step, plus a follow-up that turns
// a failed outcome into an ::error:: annotation and a $GITHUB_STEP_SUMMARY
// section — structurally, not just "someone remembered". ---

{
  const idx = syncWorkflow.indexOf('npm run ci:publish-quality-gates');
  assert.ok(idx !== -1, 'source-sync.yml must invoke the shared publish-quality battery — this is the gap that let a critical accessibility violation stay live for 5 days');
  const stepStart = syncWorkflow.lastIndexOf('- name:', idx);
  const stepText = syncWorkflow.slice(stepStart, idx + 400);
  assert.match(
    stepText,
    /continue-on-error:\s*true/,
    'source-sync.yml must run the publish-quality battery non-blocking (Invariant C: never freeze the content pipeline over a quality regression — this project already survived one 8-day sync outage)'
  );
  assert.match(
    syncWorkflow,
    /::error::PUBLISH_QUALITY_GATES_RED/,
    'source-sync.yml must turn a failed publish-quality battery into a loud ::error:: annotation, not a silent non-blocking pass-through'
  );
  assert.match(
    syncWorkflow,
    /PUBLISH QUALITY GATES FAILED[\s\S]*?GITHUB_STEP_SUMMARY|GITHUB_STEP_SUMMARY[\s\S]*?PUBLISH QUALITY GATES FAILED/,
    'source-sync.yml must write a clearly-marked $GITHUB_STEP_SUMMARY section when the publish-quality battery fails'
  );
}

// --- 6. Production-pipeline health visibility (Invariant A): source-sync.yml
// must check whether the official deploy.yml pipeline is red on main, and
// that check must never block the job. ---

assert.match(
  syncWorkflow,
  /production-pipeline-health-check\.mjs/,
  'source-sync.yml must run the production-pipeline health check — deploy.yml going red must never again be invisible to the workflow that actually publishes'
);
assert.ok(
  fs.existsSync(path.join(root, 'scripts', 'production-pipeline-health-check.mjs')),
  'scripts/production-pipeline-health-check.mjs must exist'
);

// --- 7. Pre-merge verification: some workflow must run the shared battery
// on pull_request, read-only, with no Pages/deploy steps. ---

{
  const prVerifyPath = path.join(workflowsDir, 'pr-verify.yml');
  assert.ok(fs.existsSync(prVerifyPath), '.github/workflows/pr-verify.yml must exist — nothing in this repo verified a change before merge until the 2026-08-02 governance fix');
  const prVerify = fs.readFileSync(prVerifyPath, 'utf8');
  assert.match(prVerify, /^on:\s*\n\s*pull_request:/m, 'pr-verify.yml must trigger on pull_request');
  assert.match(prVerify, /permissions:\s*\n\s*contents:\s*read\s*$/m, 'pr-verify.yml must be read-only (no pages/id-token permissions) — it verifies, it does not publish');
  assert.doesNotMatch(prVerify, /actions\/deploy-pages@/, 'pr-verify.yml must not deploy to Pages — it is verify-only');
  assert.match(prVerify, /npm run ci:publish-quality-gates/, 'pr-verify.yml must run the same shared publish-quality battery as deploy.yml/source-sync.yml');
}

// --- 8. Enforcing vs advisory gate classification (GATES-GOVERNANCE.md #6).
// Grep-level and deliberately narrow: a script "can fail" if it either
// calls process.exit(1)/sets process.exitCode = 1, or imports node:assert
// (the dominant *-regression-test.mjs idiom, where an assertion failure
// throws and Node exits non-zero without an explicit exit call — a plain
// `process.exit(1)` grep alone is fragile and mis-classifies these as
// advisory, which is exactly the trap this test avoids). This only catches
// an enforcing script silently losing ALL failure paths; it says nothing
// about whether a check enforces the substantive verdict vs. just report
// shape (see GATES-GOVERNANCE.md #6 for that nuance on the three known
// advisory pairs, which are deliberately excluded from this set). ---

{
  const ENFORCING_SCRIPT_FILES = [
    'scripts/static-analysis-audit.mjs', 'scripts/static-analysis-regression-test.mjs',
    'scripts/product-journey-audit.mjs', 'scripts/product-journey-regression-test.mjs',
    'scripts/ui-state-audit.mjs', 'scripts/ui-state-regression-test.mjs',
    'scripts/content-localization-audit.mjs', 'scripts/content-localization-regression-test.mjs',
    'scripts/compliance-source-rights-audit.mjs', 'scripts/compliance-source-rights-regression-test.mjs',
    'scripts/documentation-audit.mjs', 'scripts/documentation-regression-test.mjs',
    'scripts/secret-env-audit.mjs', 'scripts/secret-env-regression-test.mjs',
    'scripts/web-quality-audit-regression-test.mjs',
    'scripts/lighthouse-performance-audit.mjs', 'scripts/lighthouse-performance-regression-test.mjs',
    'scripts/browser-matrix-audit.mjs', 'scripts/browser-matrix-regression-test.mjs',
    'scripts/axe-accessibility-audit.mjs', 'scripts/axe-accessibility-regression-test.mjs',
    'scripts/security-review-audit.mjs', 'scripts/security-review-regression-test.mjs',
    'scripts/ops-readiness-audit.mjs', 'scripts/ops-readiness-regression-test.mjs',
    'scripts/analytics-regression-test.mjs',
    'scripts/sitemap-coverage-regression-test.mjs', 'scripts/seo-content-regression-test.mjs'
  ];
  const enforcementPattern = /process\.exit\(\s*1\s*\)|process\.exitCode\s*=\s*1|from\s+['"]node:assert/;
  for (const file of ENFORCING_SCRIPT_FILES) {
    const fullPath = path.join(root, file);
    assert.ok(fs.existsSync(fullPath), `${file} must exist (referenced by the publish-quality battery)`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.match(
      content,
      enforcementPattern,
      `${file} appears to have lost every failure path (no process.exit(1)/process.exitCode=1 and no node:assert import) — a check in the "enforcing" set silently became advisory-only, which is the exact defect class documented in GATES-GOVERNANCE.md #6`
    );
  }

  // The three known advisory-only pairs (GATES-GOVERNANCE.md #6): the
  // audit:* generator itself never exits non-zero. This is not asserted as
  // an invariant to preserve (an audit script gaining real enforcement is
  // an improvement, not a regression) — it is only recorded here as the
  // documented baseline so the list above and the doc do not silently
  // diverge from each other.
  const KNOWN_ADVISORY_AUDIT_FILES = [
    'scripts/release-deploy-rollback-audit.mjs',
    'scripts/delivery-readiness-standard-audit.mjs',
    'scripts/owner-command-center.mjs'
  ];
  for (const file of KNOWN_ADVISORY_AUDIT_FILES) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} (documented advisory gate) must exist`);
  }
  assert.match(
    deployWorkflow,
    /Advisory gates status/,
    'deploy.yml must surface the advisory gates (release-deploy-rollback, readiness:standard, owner:command-center) in $GITHUB_STEP_SUMMARY — GATES-GOVERNANCE.md #6 requires their output stay visible even though they cannot block'
  );
}

console.log('publish-gate-drift-regression-test: ok');
