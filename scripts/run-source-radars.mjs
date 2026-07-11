import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './program-lifecycle-utils.mjs';

const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();
const strict = String(process.env.EVENTLIVE_SOURCE_RADARS_STRICT || '').toLowerCase() === 'true';
const collectEndedEvents = ['1', 'true', 'yes', 'on']
  .includes(String(process.env.EVENTLIVE_SOURCE_COLLECT_ENDED_EVENTS || '').toLowerCase());
const includeDiscoveryRadars = ['1', 'true', 'yes', 'on']
  .includes(String(process.env.EVENTLIVE_INCLUDE_DISCOVERY_RADARS || '').toLowerCase());
const timeScope = collectEndedEvents ? 'current-upcoming-and-ended' : 'current-and-upcoming-only';
const jsonPath = path.join(reportsDir, 'source-radars-report.json');
const mdPath = path.join(reportsDir, 'source-radars-report.md');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(filePath) {
  return path.relative(root, filePath);
}

function runRadar(radar) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = spawnSync(radar.command, radar.args, {
    cwd: root,
    env: { ...process.env, ...radar.env },
    encoding: 'utf8',
    timeout: radar.timeout_ms
  });
  const endedAt = new Date().toISOString();
  const durationMs = Date.now() - started;
  const timedOut = result.error?.code === 'ETIMEDOUT';
  const status = timedOut ? 'timeout' : result.status === 0 ? 'ok' : 'failed';

  return {
    id: radar.id,
    name: radar.name,
    source_id: radar.source_id,
    policy: radar.policy,
    command: [radar.command, ...radar.args].join(' '),
    started_at: startedAt,
    ended_at: endedAt,
    duration_ms: durationMs,
    status,
    exit_code: result.status,
    signal: result.signal,
    timeout_ms: radar.timeout_ms,
    reports: radar.reports,
    stdout_tail: String(result.stdout || '').split('\n').filter(Boolean).slice(-12),
    stderr_tail: String(result.stderr || '').split('\n').filter(Boolean).slice(-12),
    error: result.error ? result.error.message : ''
  };
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\n/g, ' ').replace(/\|/g, '\\|')).join(' | ')} |`)
  ].join('\n');
}

function renderMarkdown(report) {
  const rows = report.radars.map((radar) => [
    radar.name,
    radar.status,
    `${Math.round(radar.duration_ms / 1000)}s`,
    radar.policy,
    radar.reports.join(', ')
  ]);
  return [
    '# EventLive Source Radars',
    '',
    `Generated at: ${report.generated_at}`,
    '',
    '## Policy',
    '',
    '- Radars are source-evidence and parser-lab jobs.',
    '- They must not auto-publish catalog events.',
    '- Scheduled failures are recorded as degraded evidence unless strict mode is enabled.',
    '',
    '## Totals',
    '',
    `- Radars: ${report.totals.radars}`,
    `- OK: ${report.totals.ok}`,
    `- Failed: ${report.totals.failed}`,
    `- Strict: ${report.strict}`,
    `- Time scope: ${report.time_scope}`,
    `- Discovery radars enabled: ${report.discovery_radars_enabled}`,
    `- Skipped by policy: ${report.skipped_radars.length}`,
    '',
    '## Runs',
    '',
    table(['Radar', 'Status', 'Duration', 'Policy', 'Reports'], rows),
    ''
  ].join('\n');
}

ensureDir(reportsDir);

const configuredRadars = [
  {
    id: 'platinumlist-platform',
    name: 'Platinumlist Saudi City Radar',
    source_id: 'platinumlist-saudi-city-network',
    policy: 'candidate-only; city coverage evidence; no auto-publish',
    discovery_only: true,
    command: process.execPath,
    args: ['scripts/platinumlist-platform-radar.mjs'],
    timeout_ms: Number(process.env.EVENTLIVE_PLATINUMLIST_PLATFORM_JOB_TIMEOUT_MS || 240000),
    env: {
      EVENTLIVE_PLATINUMLIST_PLATFORM_LIMIT: String(process.env.EVENTLIVE_PLATINUMLIST_PLATFORM_LIMIT || 32)
    },
    reports: [
      'reports/platinumlist-platform-radar.json',
      'reports/platinumlist-platform-radar.md'
    ]
  },
  {
    id: 'platinumlist-details',
    name: 'Platinumlist City Detail Radar',
    source_id: 'platinumlist-saudi-city-network',
    policy: 'candidate-only; secondary official verification required; no auto-publish',
    discovery_only: true,
    command: process.execPath,
    args: ['scripts/platinumlist-detail-radar.mjs'],
    timeout_ms: Number(process.env.EVENTLIVE_PLATINUMLIST_DETAIL_JOB_TIMEOUT_MS || 240000),
    env: {
      EVENTLIVE_PLATINUMLIST_DETAIL_LIMIT: String(process.env.EVENTLIVE_PLATINUMLIST_DETAIL_LIMIT || 24)
    },
    reports: [
      'reports/platinumlist-detail-radar.json',
      'reports/platinumlist-detail-radar.md'
    ]
  },
  {
    id: 'official-agendas',
    name: 'Official Multi-Session Agenda Radar',
    source_id: 'official-agenda-watchlist',
    policy: 'source-evidence; agenda readiness; no auto-publish',
    command: process.execPath,
    args: ['scripts/source-official-agenda-radar.mjs'],
    timeout_ms: Number(process.env.EVENTLIVE_SOURCE_RADAR_TIMEOUT_MS || 120000),
    env: {},
    reports: [
      'reports/source-official-agenda-radar.json',
      'reports/source-official-agenda-radar.md'
    ]
  },
  {
    id: 'strategic-platforms',
    name: 'Strategic Platform Source Radar',
    source_id: 'strategic-platform-watchlist',
    policy: 'source-evidence; API-surface mapping; no auto-publish',
    command: process.execPath,
    args: ['scripts/source-strategic-platform-radar.mjs'],
    timeout_ms: Number(process.env.EVENTLIVE_SOURCE_RADAR_TIMEOUT_MS || 120000),
    env: {
      EVENTLIVE_STRATEGIC_PLATFORM_RADAR_TIMEOUT_MS: String(process.env.EVENTLIVE_STRATEGIC_PLATFORM_RADAR_TIMEOUT_MS || 25000)
    },
    reports: [
      'reports/source-strategic-platform-radar.json',
      'reports/source-strategic-platform-radar.md'
    ]
  },
  {
    id: 'mygov-wayback',
    name: 'GOV.SA / NEC Wayback Radar',
    source_id: 'my-gov-sa-events',
    policy: 'source-evidence; no auto-publish',
    historical_only: true,
    command: process.execPath,
    args: ['scripts/mygov-wayback-radar.mjs'],
    timeout_ms: Number(process.env.EVENTLIVE_SOURCE_RADAR_TIMEOUT_MS || 90000),
    env: {
      EVENTLIVE_MYGOV_WAYBACK_LIMIT: String(process.env.EVENTLIVE_SOURCE_RADAR_MYGOV_LIMIT || process.env.EVENTLIVE_MYGOV_WAYBACK_LIMIT || 5),
      EVENTLIVE_MYGOV_WAYBACK_TIMEOUT_MS: String(process.env.EVENTLIVE_MYGOV_WAYBACK_TIMEOUT_MS || 60000)
    },
    reports: [
      'reports/mygov-wayback-radar.json',
      'reports/mygov-wayback-radar.md'
    ]
  }
];

const skippedRadars = configuredRadars.filter((radar) => (
  (!collectEndedEvents && radar.historical_only)
  || (!includeDiscoveryRadars && radar.discovery_only)
));
const radars = configuredRadars.filter((radar) => !skippedRadars.includes(radar));

const results = radars.map(runRadar);
const failed = results.filter((radar) => radar.status !== 'ok');
const report = {
  schema: 'eventlive.source-radars.v1',
  generated_at: generatedAt,
  strict,
  time_scope: timeScope,
  ended_collection_enabled: collectEndedEvents,
  discovery_radars_enabled: includeDiscoveryRadars,
  skipped_radars: skippedRadars.map((radar) => ({ id: radar.id, reason: radar.historical_only ? 'historical-disabled' : 'manual-discovery-only' })),
  policy: {
    allowed_use: 'scheduled evidence refresh, parser validation, official-source lead discovery',
    disallowed_use: 'direct catalog publication without current official confirmation'
  },
  totals: {
    radars: results.length,
    ok: results.length - failed.length,
    failed: failed.length
  },
  radars: results
};

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(mdPath, renderMarkdown(report), 'utf8');

console.log('# EventLive Source Radars');
console.log(`- Time scope: ${report.time_scope}`);
console.log(`- Discovery radars enabled: ${report.discovery_radars_enabled}`);
console.log(`- Skipped by policy: ${report.skipped_radars.length}`);
console.log(`- OK: ${report.totals.ok}`);
console.log(`- Failed: ${report.totals.failed}`);
console.log(`- Report: ${rel(mdPath)}`);

if (strict && failed.length) {
  process.exit(1);
}
