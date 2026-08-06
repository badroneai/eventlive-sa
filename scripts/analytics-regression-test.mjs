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
  const umamiTagCount = (html.match(/umami-ten-orpin\.vercel\.app\/script\.js/g) || []).length;
  assert(umamiTagCount === 1, `${page} must carry exactly ONE Umami script tag, found ${umamiTagCount} — incremental rebuilds must replace the tag, not stack copies (13 stacked Plausible tags shipped this way)`);
  assert(/data-website-id="f68b920a-155f-4134-a7b1-88bbede979df"/.test(html), `${page} missing Umami website id`);
  assert(!/plausible\.io\/js/.test(html), `${page} still carries a legacy Plausible script tag`);
  assert(/id="eventlive-analytics-runtime"/.test(html), `${page} missing EventLive analytics runtime`);
  assert(/window\.eventLiveTrack/.test(html), `${page} missing tracker function`);
}

const ownerPages = ['sources.html', 'methodology.html', 'trust.html', 'source-health.html', 'owner-status.html'];
for (const page of ownerPages) {
  const html = read(page);
  assert(!/umami-ten-orpin\.vercel\.app\/script\.js/.test(html), `${page} should not load public analytics`);
  assert(!/data-website-id=/.test(html), `${page} should not carry an analytics website id`);
  assert(!/id="eventlive-analytics-runtime"/.test(html), `${page} should not include public analytics runtime`);
}

const index = read('index.html');
for (const eventName of ['page_view', 'event_opened', 'calendar_downloaded', 'directions_clicked', 'search_used', 'saved_event']) {
  assert(index.includes(eventName), `runtime missing ${eventName}`);
}

console.log(`ANALYTICS_TEST_OK public=${publicPages.length} owner_excluded=${ownerPages.length}`);
