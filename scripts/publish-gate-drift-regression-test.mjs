import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PUBLISH_QUALITY_GATES, PUBLISH_QUALITY_GATE_BROWSER_ENGINES } from './publish-quality-gates-list.mjs';
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

// --- 1b. A workflow may only run the shared battery if it installs every
// browser engine the battery needs. Discovered the hard way on the first
// sync run after the governance fix landed (30754356956): source-sync.yml
// installed chromium only, so audit:browser-matrix failed on a missing
// webkit binary and dragged test:browser-matrix and audit:ops-readiness
// (which reads the browser-matrix report) down with it — four red checks,
// zero real defects. A battery that reports false failures gets ignored,
// which is exactly how a real one goes unnoticed, so the engine list is
// part of the battery's contract, not an environment detail. ---

for (const file of workflowFiles) {
  const content = readWorkflow(file);
  if (!workflowRunsScript(content, 'ci:publish-quality-gates')) continue;
  const installLines = content
    .split('\n')
    .filter((line) => line.includes('playwright install'))
    .join('\n');
  for (const engine of PUBLISH_QUALITY_GATE_BROWSER_ENGINES) {
    assert.ok(
      new RegExp(`playwright install[^\\n]*\\b${engine}\\b`).test(installLines),
      `${file} runs the shared publish-quality battery but never installs the '${engine}' browser engine — the battery's browser checks (audit:browser-matrix, and audit:ops-readiness through it) fail on a missing binary rather than skipping, producing red runs that are not real defects. Install every engine in PUBLISH_QUALITY_GATE_BROWSER_ENGINES (scripts/publish-quality-gates-list.mjs) in this workflow, or remove the battery call from it`
    );
  }
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

// test:search-indexability is unpaired by design: it reads dist/ directly (the
// artifact the build just produced), not a committed report, so there is no
// audit:* step whose freshness it depends on.
const REQUIRED_UNPAIRED = ['test:sitemap', 'test:seo-content', 'test:search-indexability', 'audit:dependencies', 'test:analytics'];

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

// --- 6. A non-blocking battery must still end the RUN red, not just annotate
// it. PM correction 2026-08-02: continue-on-error plus an ::error:: (section
// 5 above) still lets GitHub record the job as SUCCESS — a green run with a
// buried annotation is exactly the silent-failure mode this whole fix
// exists to close ("nobody opens a run that looks green"). Generic across
// any current or future workflow, not hardcoded to source-sync.yml by name:
// any workflow that (a) deploys to Pages, (b) runs the shared battery, and
// (c) runs it non-blocking (continue-on-error: true on that step) MUST have
// a later step that exits 1 when that step's outcome was not success. A
// workflow that runs the battery BLOCKING (no continue-on-error, e.g.
// deploy.yml) already satisfies this by construction — the failing step
// itself fails the job — so it is exempt from this specific check. ---

for (const file of workflowFiles) {
  const content = readWorkflow(file);
  const deploysToPages = /uses:\s*actions\/deploy-pages@/.test(content);
  if (!deploysToPages) continue;
  if (!workflowRunsScript(content, 'ci:publish-quality-gates')) continue; // caught by section 1 already

  const idx = content.indexOf('npm run ci:publish-quality-gates');
  if (idx === -1) continue; // reached only via a battery-of-batteries not modeled today; nothing does this yet
  const stepStart = content.lastIndexOf('- name:', idx);
  const nextStepStart = content.indexOf('\n      - name:', idx);
  const stepText = content.slice(stepStart, nextStepStart === -1 ? content.length : nextStepStart);
  const isNonBlocking = /continue-on-error:\s*true/.test(stepText);
  if (!isNonBlocking) continue; // blocking battery step already fails the job/run by construction

  const idMatch = stepText.match(/id:\s*(\S+)/);
  assert.ok(idMatch, `${file}: the non-blocking publish-quality-gates battery step must have an 'id:' so a later step can check its outcome`);
  const stepId = idMatch[1];

  const afterBattery = content.slice(idx);
  // Two accepted shapes for the same invariant. Direct: the step compares
  // ${{ steps.<id>.outcome }} inline. Env-indirect (the shape #87 introduced,
  // which this matcher rejected in run 31082343130 and re-froze publishing):
  // the step assigns steps.<id>.outcome to an env var and the shell compares
  // that variable. Matching only the direct shape made this gate a matcher of
  // wording, not of the invariant — the exact gauge class this file exists to ban.
  const directFailPattern = new RegExp(`steps\\.${stepId}\\.outcome[^\\n]*!=[^\\n]*success[\\s\\S]{0,400}?exit 1`);
  const envAssignMatch = afterBattery.match(new RegExp(`(\\w+):\\s*\\$\\{\\{\\s*steps\\.${stepId}\\.outcome\\s*\\}\\}`));
  const envFailPattern = envAssignMatch
    ? new RegExp(`\\$\\{?${envAssignMatch[1]}\\}?"?[^\\n]*!=[^\\n]*success[\\s\\S]{0,600}?exit 1`)
    : null;
  const failsRunOnGateFailure =
    directFailPattern.test(afterBattery) || (envFailPattern !== null && envFailPattern.test(afterBattery));
  assert.ok(
    failsRunOnGateFailure,
    `${file}: runs the publish-quality battery non-blocking but has no later step that fails the RUN (exit 1) when steps.${stepId}.outcome != 'success' (checked both the inline \${{ }} comparison shape and the env-var indirection shape) — an ::error:: annotation on a green run is not enough (PM correction 2026-08-02): the run itself must land red in the Actions list, publish already having happened by then so Invariant C still holds`
  );
}

// --- 7. Production-pipeline health visibility (Invariant A): source-sync.yml
// must check whether the official deploy.yml pipeline is red on main, and
// that check must NEVER fail the run — deploy.yml being red is already
// visible in its own run; turning source-sync.yml red for a third-party
// pipeline's failure would create a permanent red loop and the alarm
// fatigue that killed visibility in the first place (GATES-GOVERNANCE.md
// #5: "what makes this run red is a quality regression in the site just
// published, not some other workflow being unhappy"). ---

assert.match(
  syncWorkflow,
  /production-pipeline-health-check\.mjs/,
  'source-sync.yml must run the production-pipeline health check — deploy.yml going red must never again be invisible to the workflow that actually publishes'
);
assert.ok(
  fs.existsSync(path.join(root, 'scripts', 'production-pipeline-health-check.mjs')),
  'scripts/production-pipeline-health-check.mjs must exist'
);
{
  const healthCheckScript = fs.readFileSync(path.join(root, 'scripts', 'production-pipeline-health-check.mjs'), 'utf8');
  assert.doesNotMatch(
    healthCheckScript,
    /process\.exit\(\s*1\s*\)/,
    'scripts/production-pipeline-health-check.mjs must never exit non-zero — it is deliberately loud-but-green (::error:: + summary + JSON evidence only), or a red deploy.yml would permanently redden every source-sync.yml run too'
  );
}

// --- 8. Pre-merge verification: some workflow must run the shared battery
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

// --- 9. Enforcing vs advisory gate classification (GATES-GOVERNANCE.md #6).
// Grep-level and deliberately narrow: a script "can fail" if it either
// calls process.exit(1)/sets process.exitCode = 1, or imports node:assert
// (the dominant *-regression-test.mjs idiom, where an assertion failure
// throws and Node exits non-zero without an explicit exit call — a plain
// `process.exit(1)` grep alone is fragile and mis-classifies these as
// advisory, which is exactly the trap this test avoids). This only catches
// an enforcing script silently losing ALL failure paths; it says nothing
// about whether a check enforces the substantive verdict vs. just report
// shape.
//
// Correction 2026-08-02 (this fix): release-deploy-rollback-audit.mjs,
// delivery-readiness-standard-audit.mjs, and owner-command-center.mjs used
// to be a documented exception here — none of the three ever called
// process.exit(1), so a reader of deploy.yml's step list could reasonably
// but wrongly assume each listed step could block a bad release. All three
// now have a real, grep-visible failure path (see each file's own header
// comment for what specifically triggers it — a genuine FAIL status for the
// first two, a build/write failure or empty required output for the
// third), so they moved into ENFORCING_SCRIPT_FILES below like every other
// audit/test pair. This is the assertion GATES-GOVERNANCE.md #6 asks for:
// "gates the repo declares enforcing must be capable of exiting non-zero" —
// if any of these six ever loses its process.exit(1)/node:assert path
// again, this test goes red instead of the gate quietly turning toothless a
// second time. What this grep-level check deliberately does NOT verify
// (documented in GATES-GOVERNANCE.md #6 instead, because encoding it here
// would be a flaky, semantics-aware guard rather than a cheap static one):
// that these three specifically still treat PARTIAL / NOT_APPLICABLE /
// OWNER_RESERVED / N/A as non-blocking and reserve process.exit(1) for a
// genuinely-evaluated-bad result — freezing on those non-blocking statuses
// would refreeze a pipeline this project already survived an 8-day outage
// on. ---

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
    'scripts/sitemap-coverage-regression-test.mjs', 'scripts/seo-content-regression-test.mjs',
    'scripts/release-deploy-rollback-audit.mjs', 'scripts/release-deploy-rollback-regression-test.mjs',
    'scripts/delivery-readiness-standard-audit.mjs', 'scripts/delivery-readiness-standard-regression-test.mjs',
    'scripts/owner-command-center.mjs', 'scripts/owner-command-center-regression-test.mjs'
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

  assert.match(
    deployWorkflow,
    /Advisory gates status/,
    'deploy.yml must surface these three gates (release-deploy-rollback, readiness:standard, owner:command-center) in $GITHUB_STEP_SUMMARY — GATES-GOVERNANCE.md #6 requires their non-blocking statuses (PARTIAL/NOT_APPLICABLE/OWNER_RESERVED/N/A) stay visible even though a genuine FAIL among them already blocked the run earlier in this same job'
  );
}

console.log('publish-gate-drift-regression-test: ok');
