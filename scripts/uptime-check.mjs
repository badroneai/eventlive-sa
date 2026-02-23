import https from 'node:https';

const url = process.env.EVENTLIVE_URL || 'https://badroneai.github.io/eventlive-sa/';
const marker = process.env.EVENTLIVE_MARKER || 'EventLive';

https.get(url, (res) => {
  let body = '';
  res.on('data', (d) => (body += d.toString()));
  res.on('end', () => {
    const okStatus = res.statusCode === 200;
    const okMarker = body.includes(marker);
    if (okStatus && okMarker) {
      console.log(`UPTIME_OK ${url}`);
      process.exit(0);
    }
    console.error(`UPTIME_FAIL status=${res.statusCode} marker=${okMarker}`);
    process.exit(1);
  });
}).on('error', (err) => {
  console.error(`UPTIME_FAIL error=${err.message}`);
  process.exit(1);
});
