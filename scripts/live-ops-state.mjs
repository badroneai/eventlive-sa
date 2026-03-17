import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const STATE_PATH = 'ops/live-ops-state.json';
const PREV_PATH = 'ops/live-ops-state.prev.json';
const now = new Date();

const safeReadJson = async (path, fallback = null) => {
  try {
    const raw = await fs.readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const detectN8n = () => {
  try {
    const output = execSync(
      "powershell -NoProfile -Command \"$p=Get-Process n8n -ErrorAction SilentlyContinue; if($p){'up'} else {'down'}\"",
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    )
      .trim()
      .toLowerCase();
    return output === 'up' ? 'up' : 'down';
  } catch {
    return 'unknown';
  }
};

const getCommit = () => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

const previous = await safeReadJson(STATE_PATH, null);
if (previous && existsSync(STATE_PATH)) {
  await fs.mkdir('ops', { recursive: true });
  await fs.writeFile(PREV_PATH, JSON.stringify(previous, null, 2), 'utf8');
}

const gatewayStatus = (process.env.GATEWAY_STATUS || 'up').toLowerCase();
const telegramStatus = (process.env.TELEGRAM_STATUS || 'up').toLowerCase();
const n8nStatus = (process.env.N8N_STATUS || detectN8n()).toLowerCase();
const trustedProxiesEnabled = ['1', 'true', 'yes', 'on'].includes(
  (process.env.TRUSTED_PROXIES_ENABLED || 'false').toLowerCase()
);
const requireN8n = ['1', 'true', 'yes', 'on'].includes(
  (process.env.REQUIRE_N8N || 'false').toLowerCase()
);

const blockers = [];
if (gatewayStatus === 'down') blockers.push('Gateway is down');
if (telegramStatus === 'down') blockers.push('Telegram relay is down');
if (requireN8n && n8nStatus === 'down') blockers.push('n8n is not running');

const lastOkAt = blockers.length === 0 ? now.toISOString() : previous?.last_ok_at || null;
const lastFailAt = blockers.length > 0 ? now.toISOString() : previous?.last_fail_at || null;

const state = {
  generated_at: now.toISOString(),
  active_cycle_id: `cycle-${now.toISOString().replace(/[:.]/g, '-')}`,
  service_status: {
    gateway: gatewayStatus,
    telegram: telegramStatus,
    n8n: n8nStatus
  },
  last_ok_at: lastOkAt,
  last_fail_at: lastFailAt,
  last_report_commit: getCommit(),
  alerts_active_count: 0,
  blockers,
  trusted_proxies_enabled: trustedProxiesEnabled,
  policy: {
    require_n8n: requireN8n,
    require_trusted_proxies: ['1', 'true', 'yes', 'on'].includes((process.env.REQUIRE_TRUSTED_PROXIES || 'false').toLowerCase())
  }
};

await fs.mkdir('ops', { recursive: true });
await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

console.log(`LIVE_OPS_STATE_OK ${STATE_PATH}`);
