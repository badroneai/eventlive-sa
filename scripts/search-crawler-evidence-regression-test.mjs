import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  SEARCH_CRAWLERS,
  collectCrawlerEvidence,
  detectsWafChallenge,
  robotsAllows,
  writeCrawlerEvidence
} from './search-crawler-production-evidence.mjs';

const site = 'https://eventme.live';
const eventUrl = `${site}/events/event-crawler-regression.html`;
const robots = `User-agent: *
Allow: /
Disallow: /events-catalog.json

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /
`;

for (const crawler of SEARCH_CRAWLERS) {
  assert.equal(robotsAllows(robots, crawler.name, '/'), true, `${crawler.name} must be allowed on the home page`);
  assert.equal(robotsAllows(robots, crawler.name, '/events/event-crawler-regression.html'), true, `${crawler.name} must be allowed on event pages`);
}
assert.equal(robotsAllows(robots, 'Bingbot', '/events-catalog.json'), false, 'wildcard private-feed restrictions must still apply to Bingbot');
assert.equal(detectsWafChallenge({ status: 403, body: '' }), true, 'HTTP 403 must be classified as a WAF/access challenge');
assert.equal(detectsWafChallenge({ status: 200, body: '<title>Just a moment...</title>' }), true, 'challenge HTML must be detected even with HTTP 200');
assert.equal(detectsWafChallenge({ status: 200, body: '<html><title>EventLive</title></html>' }), false, 'normal EventLive HTML must not be classified as a challenge');

const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventme-crawler-evidence-'));
try {
  const key = randomBytes(16).toString('hex');
  const keyPath = path.join(fixtureDir, 'indexnow-key.txt');
  const distDir = path.join(fixtureDir, 'dist');
  const reportJsonPath = path.join(fixtureDir, 'crawler-evidence.json');
  const reportMarkdownPath = path.join(fixtureDir, 'crawler-evidence.md');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(keyPath, `${key}\n`, 'utf8');
  fs.writeFileSync(path.join(distDir, `${key}.txt`), `${key}\n`, 'utf8');

  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    requests.push({ pathname: parsed.pathname, user_agent: options.headers?.['user-agent'] || '' });
    const headers = { 'content-type': 'text/html; charset=utf-8', server: 'fixture', 'x-cache': 'HIT' };
    if (parsed.pathname === '/robots.txt') return new Response(robots, { status: 200, headers: { ...headers, 'content-type': 'text/plain' } });
    if (parsed.pathname === '/sitemap.xml') return new Response(`<urlset><url><loc>${eventUrl}</loc></url></urlset>`, { status: 200, headers: { ...headers, 'content-type': 'application/xml' } });
    if (parsed.pathname === `/${key}.txt`) return new Response(`${key}\n`, { status: 200, headers: { ...headers, 'content-type': 'text/plain' } });
    if (parsed.pathname === '/') return new Response('<html><title>EventLive</title></html>', { status: 200, headers });
    if (parsed.pathname === '/events/event-crawler-regression.html') {
      return new Response('<html><title>Event</title><script type="application/ld+json">{"@type":"Event"}</script></html>', { status: 200, headers });
    }
    return new Response('not found', { status: 404 });
  };

  const evidence = await collectCrawlerEvidence({
    siteUrl: site,
    keyPath,
    distDir,
    fetchImpl,
    now: () => '2026-07-19T08:05:00.000Z'
  });
  assert.equal(evidence.acceptance.status, 'PASS');
  assert.deepEqual(evidence.acceptance.failures, []);
  assert.equal(evidence.crawlers.length, 3);
  assert.equal(evidence.crawlers.every((crawler) => crawler.root.http_status === 200 && crawler.event.http_status === 200), true);
  assert.equal(evidence.crawlers.every((crawler) => crawler.robots.root_allowed && crawler.robots.event_allowed), true);
  assert.equal(evidence.indexnow_key.production_http_status, 200);
  assert.equal(evidence.indexnow_key.content_matches_configured_key, true);

  const publicRequests = requests.filter((request) => ['/', '/events/event-crawler-regression.html'].includes(request.pathname));
  assert.equal(publicRequests.length, 6, 'the probe must request home and event pages with all three crawler agents');
  for (const crawler of SEARCH_CRAWLERS) {
    assert.equal(publicRequests.filter((request) => request.user_agent === crawler.user_agent).length, 2, `${crawler.name} must make two public probes`);
  }

  writeCrawlerEvidence(evidence, { jsonPath: reportJsonPath, markdownPath: reportMarkdownPath });
  const serializedReport = fs.readFileSync(reportJsonPath, 'utf8');
  assert.equal(serializedReport.includes(key), false, 'crawler evidence must not expose the IndexNow key');
  assert.match(fs.readFileSync(reportMarkdownPath, 'utf8'), /status: PASS/);
} finally {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
}

console.log('SEARCH_CRAWLER_EVIDENCE_TEST_OK crawlers=3 probes=6 robots_allowed=3 indexnow_key=200');
