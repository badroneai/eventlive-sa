#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { PUBLISH_QUALITY_GATES } from './publish-quality-gates-list.mjs';

// Shared publish-quality battery (governance fix 2026-08-02, see
// GATES-GOVERNANCE.md). deploy.yml ("EventLive MVP Pipeline") and
// source-sync.yml both invoke this exact list via
// `npm run ci:publish-quality-gates` so the two GitHub Pages publish paths
// cannot silently drift apart the way they did 2026-07-28 through
// 2026-08-02: deploy.yml failed on every run for five days at
// audit:lighthouse while source-sync.yml kept publishing every few hours
// through a narrower, hand-duplicated check list that never ran
// audit:axe/test:axe or audit:lighthouse at all — a critical accessibility
// violation shipped and stayed live because nothing that actually published
// ever looked at it.
//
// deploy.yml runs this list BLOCKING (a failure here fails the job, same as
// before). source-sync.yml runs it LOUD-BUT-NON-BLOCKING (continue-on-error
// on the step, with a follow-up step that turns a failed outcome into an
// `::error::` annotation and a $GITHUB_STEP_SUMMARY section) — this project
// already survived one 8-day sync outage, and freezing publishing over a
// quality regression is a worse failure than shipping a known one loudly.
//
// Deliberately NOT a `&&`-chained npm script. A plain `a && b && c` list
// stops at the first failure, so a single early red check silently prevents
// every later check in the list from ever running in that invocation —
// which is exactly what happened to deploy.yml's own inline step list:
// audit:lighthouse (red since 2026-07-28) sits before audit:axe/test:axe in
// the old step order, so those never even executed for five days, and the
// axe report committed on main went stale (dated 2026-07-10) while it kept
// silently reporting PASS. This runner executes every entry unconditionally
// via a real subprocess per check, reports all of them, and only then
// decides pass/fail for the whole battery — so a red lighthouse check can
// never again hide the status of everything listed after it.
//
// Pairing rule (see GATES-GOVERNANCE.md): every `test:*` entry that reads a
// committed report (test:static, test:axe, test:lighthouse, ...) is placed
// immediately after the `audit:*` entry that regenerates that report, in
// the same process. A `test:*` gate that only reads a possibly-stale
// committed artifact instead of a report regenerated in the same run is
// theatre, not a gate — this ordering, plus the "no early exit" behavior
// above, is what keeps every pair honest on every invocation.

const GATES = PUBLISH_QUALITY_GATES;

const results = [];
for (const name of GATES) {
  process.stdout.write(`\n--- ci:publish-quality-gates > npm run ${name} ---\n`);
  const start = Date.now();
  const outcome = spawnSync('npm', ['run', name], {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  const durationMs = Date.now() - start;
  const ok = !outcome.error && outcome.status === 0;
  results.push({ name, ok, durationMs, status: outcome.status, signal: outcome.signal });
}

const failed = results.filter((r) => !r.ok);
const passed = results.filter((r) => r.ok);

console.log('\n=== ci:publish-quality-gates summary ===');
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  (${r.durationMs}ms)`);
}
console.log(`\nci:publish-quality-gates: ${passed.length}/${results.length} passed`);
if (failed.length) {
  console.log(`ci:publish-quality-gates FAILED checks: ${failed.map((r) => r.name).join(', ')}`);
}

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const lines = [
    '## Publish Quality Gates Battery (ci:publish-quality-gates)',
    `- Result: ${failed.length === 0 ? `all ${results.length} checks passed` : `${failed.length}/${results.length} checks FAILED`}`,
    ...(failed.length ? [`- Failed: ${failed.map((r) => r.name).join(', ')}`] : []),
    ''
  ];
  fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

process.exit(failed.length === 0 ? 0 : 1);
