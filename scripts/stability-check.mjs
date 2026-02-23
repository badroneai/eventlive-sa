import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const url = process.env.EVENTLIVE_URL || 'https://badroneai.github.io/eventlive-sa/';
const marker = process.env.EVENTLIVE_MARKER || 'EventLive';
const start = Date.now();

https.get(url, (res) => {
  let body = '';
  res.on('data', (d) => (body += d.toString()));
  res.on('end', () => {
    const ms = Date.now() - start;
    const ok = res.statusCode === 200 && body.includes(marker);
    const status = ok ? 'OK' : 'FAIL';
    const note = !ok ? `status=${res.statusCode}, marker=${body.includes(marker)}` : ms > 3000 ? `slow=${ms}ms` : `healthy=${ms}ms`;

    const line = `- ${new Date().toISOString()} | ${status} | ${note}`;
    const reportDir = path.join(process.cwd(), '03-Reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const logFile = path.join(reportDir, 'stability-24h-log.md');
    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '# EventLive 24h Stability Log\n\n', 'utf8');
    }
    fs.appendFileSync(logFile, `${line}\n`, 'utf8');

    console.log(line);
    process.exit(ok ? 0 : 1);
  });
}).on('error', (err) => {
  const line = `- ${new Date().toISOString()} | FAIL | error=${err.message}`;
  const reportDir = path.join(process.cwd(), '03-Reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const logFile = path.join(reportDir, 'stability-24h-log.md');
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '# EventLive 24h Stability Log\n\n', 'utf8');
  }
  fs.appendFileSync(logFile, `${line}\n`, 'utf8');
  console.error(line);
  process.exit(1);
});
