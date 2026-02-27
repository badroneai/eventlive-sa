import fs from 'node:fs/promises';

const timeoutMs = Number(process.env.ENV_CHECK_TIMEOUT_MS || 15000);
const now = new Date();

const environments = [
  { id: '001', url: process.env.EVENTLIVE_ENV_001_URL || '', marker: process.env.EVENTLIVE_ENV_001_MARKER || 'EventLive' },
  { id: '002', url: process.env.EVENTLIVE_ENV_002_URL || '', marker: process.env.EVENTLIVE_ENV_002_MARKER || 'EventLive' },
  { id: '003', url: process.env.EVENTLIVE_ENV_003_URL || '', marker: process.env.EVENTLIVE_ENV_003_MARKER || 'EventLive' }
];

const checkUrl = async ({ id, url, marker }) => {
  if (!url) {
    return {
      id,
      url: '(not configured)',
      status: 'NOT_CONFIGURED',
      httpStatus: 'n/a',
      latencyMs: 'n/a',
      markerFound: false,
      note: 'Missing URL env variable'
    };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const html = await response.text();
    const latencyMs = Date.now() - started;
    const markerFound = html.includes(marker);

    const status = response.ok && markerFound ? 'OK' : 'FAIL';
    return {
      id,
      url,
      status,
      httpStatus: response.status,
      latencyMs,
      markerFound,
      note: status === 'OK' ? 'Healthy' : 'HTTP or marker validation failed'
    };
  } catch (error) {
    const latencyMs = Date.now() - started;
    return {
      id,
      url,
      status: 'FAIL',
      httpStatus: 'n/a',
      latencyMs,
      markerFound: false,
      note: `Fetch error: ${error?.name || 'UnknownError'}`
    };
  } finally {
    clearTimeout(timer);
  }
};

const results = await Promise.all(environments.map(checkUrl));

const summary = {
  checkedAt: now.toISOString(),
  timeoutMs,
  environments: results
};

await fs.mkdir('reports', { recursive: true });
await fs.writeFile('reports/environment-matrix-status.json', JSON.stringify(summary, null, 2), 'utf8');

const lines = [];
lines.push('# Environment Matrix Status');
lines.push('');
lines.push(`Checked at: ${now.toISOString()}`);
lines.push('');
lines.push('| Environment | URL | Status | HTTP | Latency (ms) | Marker | Note |');
lines.push('|---|---|---|---:|---:|---|---|');
for (const row of results) {
  lines.push(`| ${row.id} | ${row.url} | ${row.status} | ${row.httpStatus} | ${row.latencyMs} | ${row.markerFound ? 'found' : 'missing'} | ${row.note} |`);
}
await fs.writeFile('reports/environment-matrix-status.md', `${lines.join('\n')}\n`, 'utf8');

for (const row of results) {
  console.log(`[env ${row.id}] ${row.status} ${row.url} http=${row.httpStatus} latency=${row.latencyMs} marker=${row.markerFound}`);
}

const hasFailure = results.some((row) => row.status !== 'OK');
if (hasFailure) {
  console.error('ENV_MATRIX_FAIL One or more environments are not healthy/configured. See reports/environment-matrix-status.md');
  process.exit(1);
}

console.log('ENV_MATRIX_OK All environments are healthy.');
