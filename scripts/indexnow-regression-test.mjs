import assert from 'node:assert/strict';
import { buildIndexNowPayload } from './submit-indexnow.mjs';
import { buildIndexNowDelta, mergeIndexNowBatchUrls, sitemapUrls } from './seo-discovery-utils.mjs';

const event = {
  file_slug: 'event-regression-example',
  city_url: './cities/riyadh.html',
  category_url: './categories/technology-training.html',
  audience_urls: ['./for/tech.html']
};
const urls = buildIndexNowDelta({ changedEvents: [event] });

assert.ok(urls.includes('https://eventme.live/events/event-regression-example.html'));
assert.ok(urls.includes('https://eventme.live/en/events/event-regression-example.html'));
assert.ok(urls.includes('https://eventme.live/cities/riyadh.html'));
assert.ok(urls.includes('https://eventme.live/en/categories/technology-training.html'));
assert.equal(urls.length, new Set(urls).size, 'IndexNow delta URLs must be unique');

const firstBuildUrl = 'https://eventme.live/events/event-first-build.html';
const secondBuildUrl = 'https://eventme.live/events/event-second-build.html';
assert.deepEqual(
  mergeIndexNowBatchUrls({
    currentUrls: [secondBuildUrl, secondBuildUrl],
    previousDelta: { batch_id: 'run-1', urls: [firstBuildUrl] },
    batchId: 'run-1'
  }),
  [firstBuildUrl, secondBuildUrl],
  'multiple builds in one workflow run must preserve the complete notification batch'
);
assert.deepEqual(
  mergeIndexNowBatchUrls({
    currentUrls: [secondBuildUrl],
    previousDelta: { batch_id: 'run-1', urls: [firstBuildUrl] },
    batchId: 'run-2'
  }),
  [secondBuildUrl],
  'a new workflow run must not resubmit the previous run batch'
);

const key = '71eb239829c202c38e7cadf9512c76bb';
const payload = buildIndexNowPayload([...urls, 'https://example.com/not-owned'], key);
assert.equal(payload.host, 'eventme.live');
assert.equal(payload.keyLocation, `https://eventme.live/${key}.txt`);
assert.ok(payload.urlList.every((url) => url.startsWith('https://eventme.live/')));
assert.ok(payload.urlList.length < 10_000);

const sitemap = '<urlset><url><loc>https://eventme.live/</loc></url><url><loc>https://eventme.live/en/</loc></url><url><loc>https://example.com/</loc></url></urlset>';
assert.deepEqual(sitemapUrls(sitemap), ['https://eventme.live/', 'https://eventme.live/en/']);

console.log(`indexnow-regression-test: ok urls=${payload.urlList.length}`);
