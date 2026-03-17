import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const STATE_PATH = process.env.LIVE_OPS_STATE_PATH || 'ops/live-ops-state.json';
const ALERTS_JSON_PATH = 'reports/alerts-status.json';
const ALERTS_MD_PATH = 'reports/alerts-status.md';
const INCIDENT_DIR = '04-Incidents';
const INCIDENT_COUNTER = 'ops/incident-counter.json';
const STALE_CRIT_MIN = Number(process.env.ALERT_STALE_CRIT_MIN || 20);

const readJson = async (path) => JSON.parse(await fs.readFile(path, 'utf8'));
const now = new Date();

const state = await readJson(STATE_PATH);
const reasons = [];
let level = 'OK';

const generatedAt = new Date(state.generated_at).getTime();
const ageMin = Math.max(0, Math.floor((Date.now() - generatedAt) / 60000));

if (state.service_status?.gateway === 'down' || state.service_status?.telegram === 'down') {
  level = 'CRIT';
  reasons.push('Core relay service is down (gateway/telegram).');
}

if (ageMin >= STALE_CRIT_MIN) {
  level = 'CRIT';
  reasons.push(`State is stale (${ageMin}m >= ${STALE_CRIT_MIN}m).`);
}

const requireN8n = state.policy?.require_n8n === true;
const requireTrustedProxies = state.policy?.require_trusted_proxies === true;

if (level !== 'CRIT' && requireN8n && state.service_status?.n8n !== 'up') {
  level = 'WARN';
  reasons.push('n8n is required by policy but not active.');
}

if (level !== 'CRIT' && Array.isArray(state.blockers) && state.blockers.length > 0) {
  level = 'WARN';
  reasons.push(`Blockers detected: ${state.blockers.join('; ')}`);
}

if (level !== 'CRIT' && requireTrustedProxies && state.trusted_proxies_enabled !== true) {
  level = 'WARN';
  reasons.push('trusted_proxies_enabled=false while required by policy');
}

if (reasons.length === 0) reasons.push('All operational checks are healthy.');

const alerts = {
  evaluated_at: now.toISOString(),
  status: level,
  reasons,
  active_alerts: level === 'OK' ? 0 : reasons.length,
  source_state: STATE_PATH
};

await fs.mkdir('reports', { recursive: true });
await fs.writeFile(ALERTS_JSON_PATH, JSON.stringify(alerts, null, 2), 'utf8');

const md = [
  '# Alerts Status',
  '',
  `Evaluated at: ${alerts.evaluated_at}`,
  `Status: **${alerts.status}**`,
  `Active alerts: **${alerts.active_alerts}**`,
  '',
  '## Reasons',
  ...alerts.reasons.map((r) => `- ${r}`),
  '',
  `Source state: \`${STATE_PATH}\``
].join('\n');
await fs.writeFile(ALERTS_MD_PATH, `${md}\n`, 'utf8');

// Patch state alert count
state.alerts_active_count = alerts.active_alerts;
await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48) || 'critical-alert';

if (alerts.status === 'CRIT') {
  await fs.mkdir('ops', { recursive: true });
  const counter = existsSync(INCIDENT_COUNTER)
    ? await readJson(INCIDENT_COUNTER)
    : { next: 1 };
  const idNum = String(counter.next).padStart(3, '0');
  const headline = alerts.reasons[0] || 'Critical alert';
  const file = `${INCIDENT_DIR}/INC-${idNum}-${slug(headline)}.md`;
  const body = [
    `# INC-${idNum} — ${headline}`,
    '',
    `Opened at: ${now.toISOString()}`,
    '',
    '## Symptoms',
    ...alerts.reasons.map((r) => `- ${r}`),
    '',
    '## Suspected Cause',
    '- To be validated by on-call.',
    '',
    '## Impact',
    '- Operational reporting may be degraded or delayed.',
    '',
    '## Proposed Corrective Action',
    '- Restore failing service (gateway/telegram) or refresh stale state path.',
    '- Re-run scheduler tick and validate alerts clear.',
    '',
    '## Verification Steps',
    '- Confirm `ops/live-ops-state.json` updated in last 5 minutes.',
    '- Confirm `reports/alerts-status.json` returns status OK/WARN (not CRIT).',
    '- Confirm Telegram summary tick delivered to 03-Reports.',
    '',
    '## Evidence Links',
    '- `ops/live-ops-state.json`',
    '- `reports/alerts-status.json`',
    '- `reports/alerts-status.md`'
  ].join('\n');

  await fs.mkdir(INCIDENT_DIR, { recursive: true });
  await fs.writeFile(file, `${body}\n`, 'utf8');
  counter.next += 1;
  await fs.writeFile(INCIDENT_COUNTER, JSON.stringify(counter, null, 2), 'utf8');
  console.log(`INCIDENT_CREATED ${file}`);
}

console.log(`ALERT_RULES_EVAL_OK ${alerts.status}`);
