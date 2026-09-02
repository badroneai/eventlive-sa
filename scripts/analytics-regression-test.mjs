import fs from 'node:fs';
import path from 'node:path';
import { ANALYTICS, TRACKED_EVENTS } from './analytics-config.mjs';

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
const scriptTagPattern = new RegExp(ANALYTICS.scriptUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
for (const page of publicPages) {
  const html = read(page);
  const umamiTagCount = (html.match(scriptTagPattern) || []).length;
  assert(umamiTagCount === 1, `${page} must carry exactly ONE Umami script tag, found ${umamiTagCount} — incremental rebuilds must replace the tag, not stack copies (13 stacked Plausible tags shipped this way)`);
  assert(html.includes(`data-website-id="${ANALYTICS.websiteId}"`), `${page} missing ${ANALYTICS.provider} website id`);
  assert(/data-domains="eventme\.live"/.test(html), `${page} missing data-domains guard — without it CI browser gates register as phantom visitors`);
  assert(!/plausible\.io\/js/.test(html), `${page} still carries a legacy Plausible script tag`);
  assert(/id="eventlive-analytics-runtime"/.test(html), `${page} missing EventLive analytics runtime`);
  assert(/window\.eventLiveTrack/.test(html), `${page} missing tracker function`);
}

const ownerPages = ['sources.html', 'methodology.html', 'trust.html', 'source-health.html', 'owner-status.html'];
for (const page of ownerPages) {
  const html = read(page);
  assert(!scriptTagPattern.test(html), `${page} should not load public analytics`);
  assert(!/data-website-id=/.test(html), `${page} should not carry an analytics website id`);
  assert(!/id="eventlive-analytics-runtime"/.test(html), `${page} should not include public analytics runtime`);
}

// Every name the site DECLARES must be a name the site can actually EMIT.
// Three are fired by name; the rest are dispatched by the delegated click
// handler, which assigns the name from the link being clicked. Both shapes count
// — what must never happen is a name published on owner-status.html and in
// reports/analytics-status.md that no code path can produce, because that reads
// as measurement and is a wish list.
// Scan the whole built site, not just the homepage: attendance_mode_saved and
// attendance_mode_removed live on attendance.html, and a future event may live
// anywhere. "Some page can emit it" is the invariant; "index.html mentions it"
// was the old check, and a bare substring match would also have passed on a
// comment.
const builtPages = [];
(function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/^(assets|event-images|event-covers)$/.test(entry.name)) collect(full);
    } else if (entry.name.endsWith('.html')) {
      builtPages.push(fs.readFileSync(full, 'utf8'));
    }
  }
})(distDir);
const undeliverable = TRACKED_EVENTS.filter((eventName) => {
  const firedByName = new RegExp(`eventLiveTrack\\(\\s*['"]${eventName}['"]`);
  const dispatched = new RegExp(`name = ['"]${eventName}['"]`);
  return !builtPages.some((html) => firedByName.test(html) || dispatched.test(html));
});
assert(
  undeliverable.length === 0,
  `these events are declared but no code path emits them: ${undeliverable.join(', ')} — a declared-but-unfired event is a wish list, not a measurement`
);

// The owner page must name the provider the pages actually load. It once said
// "plausible" with a dashboard link that 404s, for eight weeks, while Umami was
// collecting normally — because owner-status.html rendered from a report frozen
// in git rather than from the config that writes the script tag
// (GATES-GOVERNANCE.md §7).
const ownerStatus = JSON.parse(read('owner-status.json')).analytics || {};
const scriptHost = new URL(ANALYTICS.scriptUrl).host;
assert(
  ownerStatus.provider === ANALYTICS.provider,
  `owner-status.json says provider "${ownerStatus.provider}" but the pages load ${ANALYTICS.provider}`
);
assert(
  new URL(ownerStatus.dashboard_url || 'https://invalid.invalid').host === scriptHost,
  `owner-status.json points the owner at ${ownerStatus.dashboard_url}, which is not the host actually collecting (${scriptHost})`
);
assert(
  (ownerStatus.tracked_events || []).length === TRACKED_EVENTS.length,
  `owner-status.json declares ${(ownerStatus.tracked_events || []).length} tracked events, config declares ${TRACKED_EVENTS.length}`
);

console.log(`ANALYTICS_TEST_OK pages_scanned=${builtPages.length} public=${publicPages.length} owner_excluded=${ownerPages.length} provider=${ANALYTICS.provider} events_deliverable=${TRACKED_EVENTS.length}`);
