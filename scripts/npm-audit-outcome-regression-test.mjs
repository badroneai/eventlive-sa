// `npm audit` exits non-zero for two unrelated reasons — it found advisories, or
// it could not complete — and the wrapper used to print the same sentence for
// both. CI produced the proof on 2026-09-04:
//
//   NPM_AUDIT_PRODUCTION_FAIL critical=0 high=0 moderate=0 low=0
//   ::error:: production dependencies carry 0 vulnerable package(s)
//
// Zero findings at every severity, a claim that zero packages are vulnerable, and
// a red run. That is the audit saying it could not run, in the words of a finding
// — the cannot-evaluate / evaluated-and-bad confusion AGENTS.md already bans.
//
// Tested through the pure decision function rather than the script, so the check
// costs no registry round-trip and cannot itself go flaky. The flakiness is real:
// the same audit alternated between evaluating and failing to evaluate on this
// machine within a minute.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { decideAuditOutcome } from './npm-audit-outcome.mjs';

const clean = { metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 } }, vulnerabilities: {} };
const withAdvisory = {
  metadata: { vulnerabilities: { critical: 0, high: 1, moderate: 0, low: 0 } },
  vulnerabilities: { undici: { name: 'undici', severity: 'high', via: [{ title: 'Something' }] } }
};

// A clean tree that npm audited successfully.
assert.equal(decideAuditOutcome({ exitCode: 0, report: clean }).status, 'ok');

// Real advisories are a real failure, whatever the exit code says.
assert.equal(decideAuditOutcome({ exitCode: 1, report: withAdvisory }).status, 'vulnerable');
assert.equal(decideAuditOutcome({ exitCode: 0, report: withAdvisory }).status, 'vulnerable');

// The case that produced this test: npm failed, and there is nothing to report.
// It must NOT be reported as a vulnerability, and must not be reported as clean.
const blip = decideAuditOutcome({ exitCode: 1, report: clean });
assert.equal(blip.status, 'not-evaluated');
assert.equal(blip.vulnerable.length, 0);

// No report at all — npm produced nothing parseable.
assert.equal(decideAuditOutcome({ exitCode: 1, report: null }).status, 'not-evaluated');

// Severity "info" is not a vulnerability.
assert.equal(
  decideAuditOutcome({ exitCode: 0, report: { ...clean, vulnerabilities: { x: { severity: 'info' } } } }).status,
  'ok'
);

// ---------- the wrapper must speak in the right words ----------
const wrapper = fs.readFileSync(path.join(process.cwd(), 'scripts', 'npm-audit-production.mjs'), 'utf8');
assert.match(wrapper, /NPM_AUDIT_PRODUCTION_NOT_EVALUATED/, 'the wrapper needs a distinct marker for an audit that could not run');
assert.match(wrapper, /decideAuditOutcome/, 'the wrapper must use the shared decision, not its own inline copy');

// A "could not evaluate" branch that still says "carry N vulnerable package(s)"
// would put the misleading sentence back. The claim must live only in the branch
// that actually counted something.
const notEvaluatedBranch = wrapper.slice(wrapper.indexOf("outcome.status === 'not-evaluated'"), wrapper.indexOf('NPM_AUDIT_PRODUCTION_FAIL ${counted}'));
assert.doesNotMatch(notEvaluatedBranch, /vulnerable package\(s\)/, 'the not-evaluated branch must not claim a vulnerability count');
assert.match(notEvaluatedBranch, /npm audit\', \[|spawnSync/, 'a transient blip deserves one retry before the run is stopped');

console.log('NPM_AUDIT_OUTCOME_OK ok=1 vulnerable=2 not_evaluated=2 wrapper_wording=checked');
