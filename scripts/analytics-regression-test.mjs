import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

function read(relativePath) {
  return fs.readFileSync(path.join(distDir, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`ANALYTICS_TEST_FAIL ${message}`);
    process.exit(1);
  }
}

const publicPages = ['index.html', 'events.html', 'today-events.html', 'screen.html', 'organizers.html'];
for (const page of publicPages) {
  const html = read(page);
  assert(/plausible\.io\/js\/script\.tagged-events\.js/.test(html), `${page} missing Plausible script`);
  assert(/id="eventlive-analytics-runtime"/.test(html), `${page} missing EventLive analytics runtime`);
  assert(/window\.eventLiveTrack/.test(html), `${page} missing tracker function`);
}

const ownerPages = ['sources.html', 'methodology.html', 'trust.html'];
for (const page of ownerPages) {
  const html = read(page);
  assert(!/plausible\.io\/js\/script\.tagged-events\.js/.test(html), `${page} should not load public analytics`);
  assert(!/id="eventlive-analytics-runtime"/.test(html), `${page} should not include public analytics runtime`);
}

const index = read('index.html');
for (const eventName of ['page_view', 'event_opened', 'calendar_downloaded', 'directions_clicked', 'search_used', 'saved_event']) {
  assert(index.includes(eventName), `runtime missing ${eventName}`);
}

console.log(`ANALYTICS_TEST_OK public=${publicPages.length} owner_excluded=${ownerPages.length}`);
