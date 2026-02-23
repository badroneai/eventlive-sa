import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const url = process.env.EVENTLIVE_URL || 'https://badroneai.github.io/eventlive-sa/';
const marker = process.env.EVENTLIVE_MARKER || 'EventLive';
const latencyWarnMs = Number(process.env.LATENCY_WARN_MS || 1200);
const latencyFailMs = Number(process.env.LATENCY_FAIL_MS || 2500);

const reportDir = path.join(process.cwd(), '03-Reports');
const incidentsDir = path.join(process.cwd(), '04-Incidents');
fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(incidentsDir, { recursive: true });

const logFile = path.join(reportDir, 'stability-24h-log.md');
if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, '# EventLive 24h Stability Log\n\n', 'utf8');

function append(line) {
  fs.appendFileSync(logFile, `${line}\n`, 'utf8');
  console.log(line);
}

function openIncident(reason, severity = 'SEV-2') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const id = `INC-${stamp}`;
  const p = path.join(incidentsDir, `${id}.md`);
  const body = [
    `# ${id}`,
    `- Date/Time (UTC): ${new Date().toISOString()}`,
    `- Severity: ${severity}`,
    `- Source: stability-check.mjs`,
    `- Summary: ${reason}`,
    `- URL: ${url}`,
    '- Status: Open',
    '- Action: investigate latest workflow runs and rollback if needed.'
  ].join('\n');
  fs.writeFileSync(p, body, 'utf8');
  append(`- ${new Date().toISOString()} | INCIDENT_OPENED | ${path.basename(p)} | ${reason}`);
}

const start = Date.now();
https
  .get(url, (res) => {
    let body = '';
    res.on('data', (d) => (body += d.toString()));
    res.on('end', () => {
      const latency = Date.now() - start;
      const markerOk = body.includes(marker);
      const statusOk = res.statusCode === 200;

      let status = 'OK';
      let reason = `healthy=${latency}ms`;

      if (!statusOk || !markerOk) {
        status = 'FAIL';
        reason = `status=${res.statusCode}, marker=${markerOk}, latency=${latency}ms`;
      } else if (latency >= latencyFailMs) {
        status = 'FAIL';
        reason = `latency_fail=${latency}ms (>=${latencyFailMs})`;
      } else if (latency >= latencyWarnMs) {
        status = 'WARN';
        reason = `latency_warn=${latency}ms (>=${latencyWarnMs})`;
      }

      append(`- ${new Date().toISOString()} | ${status} | ${reason}`);

      if (status === 'FAIL') {
        openIncident(reason, 'SEV-2');
        process.exit(1);
      }
      process.exit(0);
    });
  })
  .on('error', (err) => {
    const reason = `network_error=${err.message}`;
    append(`- ${new Date().toISOString()} | FAIL | ${reason}`);
    openIncident(reason, 'SEV-2');
    process.exit(1);
  });
