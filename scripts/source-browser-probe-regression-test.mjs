import assert from 'node:assert/strict';
import {
  classifyProbe,
  extractEndpointCandidates,
  isLikelyApiUrl,
  isRecentProbeResult,
  mergeRecentProbeResults,
  rankProbeSources,
  renderMarkdown,
  shouldCaptureNetwork
} from './source-browser-probe.mjs';

const cooldownReference = new Date('2026-07-11T12:00:00.000Z').getTime();
assert.equal(isRecentProbeResult({ status: 'ok', probed_at: '2026-07-10T23:00:00.000Z' }, cooldownReference), false, 'successful browser evidence must expire after 12 hours');
assert.equal(isRecentProbeResult({ status: 'error', probed_at: '2026-07-09T12:00:00.000Z' }, cooldownReference), true, 'failed browser probes must remain on cooldown for 72 hours');

const mergedProbeResults = mergeRecentProbeResults({
  generated_at: new Date().toISOString(),
  sources: [
    { id: 'kept-source', priority: 2, status: 'ok', probed_at: new Date().toISOString() },
    { id: 'reprobed-source', priority: 3, status: 'error', probed_at: new Date().toISOString() }
  ]
}, [
  { id: 'reprobed-source', priority: 3, status: 'ok' },
  { id: 'new-source', priority: 1, status: 'ok' }
]);
assert.deepEqual(
  mergedProbeResults.map((source) => `${source.id}:${source.status}`),
  ['new-source:ok', 'kept-source:ok', 'reprobed-source:ok'],
  'fresh probe results must retain untouched sources and replace reprobed sources'
);
assert.deepEqual(
  mergeRecentProbeResults({
    generated_at: new Date().toISOString(),
    sources: [{ id: 'stale', probed_at: '2020-01-01T00:00:00.000Z' }]
  }, [{ id: 'fresh', priority: 1 }]).map((source) => source.id),
  ['fresh'],
  'stale individual probe results must expire even when the envelope was rewritten recently'
);

const rankedSources = rankProbeSources([
  { id: 'zero-yield-high-priority', priority: 1 },
  { id: 'collector-error', priority: 50 },
  { id: 'extractor-backlog', priority: 3, ring: 'extractor-backlog' },
  { id: 'healthy', priority: 2 },
  { id: 'protected-error', priority: 4, intake_policy: 'partnership-needed' }
], new Map([
  ['zero-yield-high-priority', { status: 'ok', extracted: 0 }],
  ['collector-error', { status: 'error', extracted: 0 }],
  ['recovered-from-snapshot', { status: 'ok', extracted: 4, fetch_mode: 'last-known-good' }],
  ['protected-error', { status: 'error', extracted: 0 }]
]), 4);
assert.deepEqual(
  rankedSources.map((source) => source.id),
  ['collector-error', 'zero-yield-high-priority', 'extractor-backlog'],
  'collector errors must be probed before zero-yield and backlog sources without crossing protection policy'
);

const recoveryRank = rankProbeSources([
  { id: 'recovered-from-snapshot', priority: 7 },
  { id: 'healthy-direct', priority: 1 }
], new Map([
  ['recovered-from-snapshot', { status: 'ok', extracted: 4, fetch_mode: 'last-known-good' }],
  ['healthy-direct', { status: 'ok', extracted: 4, fetch_mode: 'direct' }]
]), 4);
assert.deepEqual(recoveryRank.map((source) => source.id), ['recovered-from-snapshot'], 'snapshot-recovered sources must be reprobed before their evidence expires');

const apiNetwork = [
  {
    method: 'POST',
    status: 200,
    url: 'https://example.gov.sa/s-core/api/OtherEvents/CulturalCalendar',
    content_type: 'application/json',
    resource_type: 'fetch',
    response_shape: 'json-object:Events'
  },
  {
    method: 'GET',
    status: 200,
    url: 'https://www.google-analytics.com/g/collect',
    content_type: 'text/plain',
    resource_type: 'fetch'
  }
];

assert.equal(isLikelyApiUrl('https://example.gov.sa/internal/content/events/list/202607'), true);
assert.equal(shouldCaptureNetwork('https://example.gov.sa/s-core/api/OtherEvents/CulturalCalendar', 'application/json', 'fetch'), true);
assert.equal(shouldCaptureNetwork('https://www.google-analytics.com/g/collect', 'text/plain', 'fetch'), false);

const endpoints = extractEndpointCandidates(apiNetwork);
assert.equal(endpoints.length, 1);
assert.equal(endpoints[0].method, 'POST');

assert.equal(classifyProbe({
  status: 200,
  html: '<html><body>Events</body></html>',
  pageText: 'Events',
  links: [],
  network: apiNetwork
}), 'browser-network-api');

assert.equal(classifyProbe({
  status: 200,
  html: '<script id="__NEXT_DATA__">{"props":{"pageProps":{}}}</script>',
  pageText: 'Calendar',
  links: [],
  network: []
}), 'browser-hydration-payload');

assert.equal(classifyProbe({
  status: 200,
  html: '<html><body><a href="/events/future">Future event</a></body></html>',
  pageText: 'Future event starts 2026-07-12',
  links: [{ href: 'https://example.gov.sa/events/future', text: 'Future event' }],
  network: []
}), 'rendered-html-candidates');

assert.equal(classifyProbe({
  status: 403,
  html: '<title>Just a moment...</title>',
  pageText: 'Checking your browser',
  links: [],
  network: []
}), 'blocked-or-protected');

assert.equal(classifyProbe({
  status: 200,
  html: '<html><body>Saudi queue by Queue-it</body></html>',
  pageText: 'General Queue Page KSA protectsaudi',
  links: [{ href: 'https://queue.platinumlist.net/?c=platinumlist&e=protectsaudi', text: 'Queue' }],
  network: []
}), 'blocked-or-protected');

assert.equal(classifyProbe({ policy_skipped: true }), 'policy-skipped-partnership');

const markdown = renderMarkdown({
  generated_at: '2026-07-05T00:00:00.000Z',
  totals: {
    probed: 1,
    browser_network_api: 1,
    browser_hydration_payload: 0,
    rendered_html_candidates: 0,
    blocked_or_protected: 0,
    policy_skipped: 0
  },
  sources: [
    {
      id: 'sample-chamber-events',
      priority: 10,
      status: 'ok',
      http_status: 200,
      classification: 'browser-network-api',
      network_endpoints: [{
        method: 'GET',
        status: 200,
        url: 'https://example.gov.sa/api/events/calendar/7/2026',
        response_shape: 'json-array:2',
        preview: '[{"title":"Future forum"}]'
      }],
      signals: {
        date_snippets: ['Future forum 12 July 2026 - Riyadh'],
        event_like_links: [{ text: 'Future forum', href: 'https://example.gov.sa/events/future-forum' }]
      },
      next_action: 'ثبت endpoint مرشحًا كجامع مباشر.'
    }
  ]
});

assert.match(markdown, /## Actionable Samples/);
assert.match(markdown, /Future forum 12 July 2026/);
assert.match(markdown, /https:\/\/example\.gov\.sa\/api\/events\/calendar\/7\/2026/);

console.log('TEST_OK source browser probe regression checks passed');
