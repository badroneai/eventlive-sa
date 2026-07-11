import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const reportJsonPath = path.join(root, process.env.EVENTLIVE_SOURCE_DIAGNOSTICS_REPORT_JSON || 'reports/source-diagnostics-cadence-report.json');
const reportMdPath = path.join(root, process.env.EVENTLIVE_SOURCE_DIAGNOSTICS_REPORT_MD || 'reports/source-diagnostics-cadence-report.md');
const generatedAt = new Date().toISOString();
const intervalHours = Math.max(6, Number(process.env.EVENTLIVE_SOURCE_DIAGNOSTICS_INTERVAL_HOURS || 24));
const force = ['1', 'true', 'yes', 'on'].includes(String(process.env.EVENTLIVE_FORCE_SOURCE_DIAGNOSTICS || '').toLowerCase());
const strict = ['1', 'true', 'yes', 'on'].includes(String(process.env.EVENTLIVE_SOURCE_DIAGNOSTICS_STRICT || '').toLowerCase());

function timestamp(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function run(command) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['run', command.script], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    timeout: command.timeout_ms
  });
  return {
    id: command.id,
    script: command.script,
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    duration_ms: Date.now() - started,
    status: result.error?.code === 'ETIMEDOUT' ? 'timeout' : result.status === 0 ? 'ok' : 'failed',
    exit_code: result.status,
    error: result.error?.message || '',
    stdout_tail: String(result.stdout || '').split('\n').filter(Boolean).slice(-10),
    stderr_tail: String(result.stderr || '').split('\n').filter(Boolean).slice(-10)
  };
}

const previous = exists(reportJsonPath) ? readJson(reportJsonPath) : {};
const lastExecutedAt = timestamp(previous.last_executed_at);
const nextDueTime = lastExecutedAt + intervalHours * 60 * 60 * 1000;
const due = force || !lastExecutedAt || Date.now() >= nextDueTime;
const commands = [
  { id: 'source-probe', script: 'sources:probe', timeout_ms: 180_000 },
  { id: 'source-radars', script: 'sources:radars', timeout_ms: 240_000 },
  { id: 'source-yield', script: 'sources:yield', timeout_ms: 900_000 }
];
const runs = due ? commands.map(run) : [];
const failed = runs.filter((item) => item.status !== 'ok');
const effectiveLastExecutedAt = due ? generatedAt : previous.last_executed_at || null;
const report = {
  schema: 'eventlive.source-diagnostics-cadence.v1',
  generated_at: generatedAt,
  interval_hours: intervalHours,
  forced: force,
  due,
  status: !due ? 'skipped-fresh' : failed.length ? 'degraded' : 'ok',
  last_executed_at: effectiveLastExecutedAt,
  next_due_at: effectiveLastExecutedAt
    ? new Date(timestamp(effectiveLastExecutedAt) + intervalHours * 60 * 60 * 1000).toISOString()
    : generatedAt,
  totals: { commands: runs.length, ok: runs.length - failed.length, failed: failed.length },
  runs
};

ensureDir(path.dirname(reportJsonPath));
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# EventLive Cadenced Source Diagnostics', '',
  `- generated_at: ${report.generated_at}`,
  `- status: ${report.status}`,
  `- interval_hours: ${report.interval_hours}`,
  `- last_executed_at: ${report.last_executed_at || '-'}`,
  `- next_due_at: ${report.next_due_at}`,
  `- commands_run: ${report.totals.commands}`,
  `- failures: ${report.totals.failed}`, '',
  '| Diagnostic | Status | Duration |',
  '|---|---|---:|',
  ...runs.map((item) => `| ${item.id} | ${item.status} | ${Math.round(item.duration_ms / 1000)}s |`), ''
].join('\n'), 'utf8');

console.log('# EventLive Cadenced Source Diagnostics');
console.log(`- Status: ${report.status}`);
console.log(`- Commands run: ${report.totals.commands}`);
console.log(`- Next due: ${report.next_due_at}`);
console.log(`- Report: ${rel(reportMdPath)}`);

if (strict && failed.length) process.exit(1);
