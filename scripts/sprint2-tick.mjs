import fs from 'node:fs/promises';
import { execSync, spawnSync } from 'node:child_process';

const run = (script) => {
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env } });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    throw new Error(`${script} failed with code ${r.status}`);
  }
};

const now = new Date();
const nowIso = now.toISOString();

try {
  run('scripts/live-ops-state.mjs');
  run('scripts/alert-rules-eval.mjs');

  const state = JSON.parse(await fs.readFile('ops/live-ops-state.json', 'utf8'));
  const alerts = JSON.parse(await fs.readFile('reports/alerts-status.json', 'utf8'));

  const summaryLine = `TICK ${nowIso} | status: ${alerts.status} | last_commit: ${state.last_report_commit} | alerts: ${alerts.active_alerts}`;

  await fs.mkdir('ops', { recursive: true });
  await fs.appendFile('ops/scheduler-ticks.log', `${summaryLine}\n`, 'utf8');
  await fs.writeFile(
    '03-Reports/live-ops-state.md',
    [
      '# Live Ops State (Sprint-2)',
      '',
      `1) generated_at: ${state.generated_at}`,
      `2) active_cycle_id: ${state.active_cycle_id}`,
      `3) service.gateway: ${state.service_status.gateway}`,
      `4) service.telegram: ${state.service_status.telegram}`,
      `5) service.n8n: ${state.service_status.n8n}`,
      `6) last_ok_at: ${state.last_ok_at || 'n/a'}`,
      `7) last_fail_at: ${state.last_fail_at || 'n/a'}`,
      `8) last_report_commit: ${state.last_report_commit}`,
      `9) alerts_active_count: ${state.alerts_active_count}`,
      `10) blockers: ${state.blockers.length ? state.blockers.join('; ') : 'none'}`,
      '',
      `Tick summary: ${summaryLine}`
    ].join('\n') + '\n',
    'utf8'
  );

  console.log(summaryLine);

  // Optional: emit OpenClaw system event if available
  try {
    execSync(`openclaw system event --text \"${summaryLine}\" --mode now`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch {
    // no-op if CLI route unavailable
  }

  if (alerts.status === 'CRIT') {
    const reason = alerts.reasons?.[0] || 'critical state';
    const critLine = `CRIT ALERT: ${reason}`;
    await fs.appendFile('ops/scheduler-ticks.log', `${critLine}\n`, 'utf8');
    console.error(critLine);
    process.exit(2);
  }
} catch (error) {
  const failLine = `TICK_FAIL ${nowIso} | ${error?.message || 'unknown error'}`;
  await fs.mkdir('ops', { recursive: true });
  await fs.appendFile('ops/scheduler-ticks.log', `${failLine}\n`, 'utf8');
  console.error(failLine);
  process.exit(1);
}
