import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { buildIndexNowPayload, main as submitIndexNow } from './submit-indexnow.mjs';
import { buildIndexNowDelta, mergeIndexNowBatchUrls, sitemapUrls } from './seo-discovery-utils.mjs';

const event = {
  file_slug: 'event-regression-example',
  city_url: './cities/riyadh.html',
  category_url: './categories/technology-innovation.html',
  audience_urls: ['./for/tech.html']
};
const urls = buildIndexNowDelta({ changedEvents: [event] });

assert.ok(urls.includes('https://eventme.live/events/event-regression-example.html'));
assert.ok(urls.includes('https://eventme.live/en/events/event-regression-example.html'));
assert.ok(urls.includes('https://eventme.live/cities/riyadh.html'));
assert.ok(urls.includes('https://eventme.live/en/categories/technology-innovation.html'));
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

const key = randomBytes(16).toString('hex');
const payload = buildIndexNowPayload([...urls, 'https://example.com/not-owned'], key);
assert.equal(payload.host, 'eventme.live');
assert.equal(payload.keyLocation, `https://eventme.live/${key}.txt`);
assert.ok(payload.urlList.every((url) => url.startsWith('https://eventme.live/')));
assert.ok(payload.urlList.length < 10_000);

const sitemap = '<urlset><url><loc>https://eventme.live/</loc></url><url><loc>https://eventme.live/en/</loc></url><url><loc>https://example.com/</loc></url></urlset>';
assert.deepEqual(sitemapUrls(sitemap), ['https://eventme.live/', 'https://eventme.live/en/']);

const root = process.cwd();
const productionKey = fs.readFileSync(path.join(root, 'data', 'indexnow-key.txt'), 'utf8').trim();
const builtKeyPath = path.join(root, 'dist', `${productionKey}.txt`);
assert.equal(fs.existsSync(builtKeyPath), true, 'build must publish the IndexNow key file in dist');
assert.equal(fs.readFileSync(builtKeyPath, 'utf8').trim(), productionKey, 'built IndexNow key file must match the configured key');

const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventme-indexnow-receipt-'));
try {
  const keyPath = path.join(fixtureDir, 'indexnow-key.txt');
  const deltaPath = path.join(fixtureDir, 'delta.json');
  const successReceiptPath = path.join(fixtureDir, 'success-receipt.json');
  const failureReceiptPath = path.join(fixtureDir, 'failure-receipt.json');
  fs.writeFileSync(keyPath, `${key}\n`, 'utf8');
  fs.writeFileSync(deltaPath, `${JSON.stringify({ urls: [firstBuildUrl] })}\n`, 'utf8');

  let submittedPayload = null;
  const success = await submitIndexNow({
    args: ['--delta', deltaPath, '--key', keyPath, '--receipt', successReceiptPath],
    fetchImpl: async (_url, options) => {
      submittedPayload = JSON.parse(options.body);
      return new Response('', { status: 202 });
    },
    sleep: async () => {},
    now: () => '2026-07-19T08:00:00.000Z',
    logger: { log() {} }
  });
  assert.deepEqual(success, { submitted: 1, status: 202, attempt: 1 });
  assert.equal(submittedPayload.key, key, 'the runtime request must still carry the configured key');
  const successReceipt = JSON.parse(fs.readFileSync(successReceiptPath, 'utf8'));
  assert.deepEqual(successReceipt, {
    schema: 'eventlive.indexnow-receipt.v1',
    recorded_at: '2026-07-19T08:00:00.000Z',
    mode: 'delta',
    outcome: 'submitted',
    response_code: 202,
    url_count: 1,
    attempt: 1
  });
  const serializedSuccessReceipt = JSON.stringify(successReceipt);
  for (const forbidden of [key, firstBuildUrl, 'api.indexnow.org', 'keyLocation']) {
    assert.equal(serializedSuccessReceipt.includes(forbidden), false, `receipt must not expose ${forbidden}`);
  }

  await assert.rejects(
    submitIndexNow({
      args: ['--delta', deltaPath, '--key', keyPath, '--receipt', failureReceiptPath],
      fetchImpl: async () => new Response('upstream diagnostic body', { status: 400 }),
      sleep: async () => {},
      now: () => '2026-07-19T08:01:00.000Z',
      logger: { log() {} }
    }),
    /IndexNow returned 400/
  );
  const failureReceipt = JSON.parse(fs.readFileSync(failureReceiptPath, 'utf8'));
  assert.deepEqual(failureReceipt, {
    schema: 'eventlive.indexnow-receipt.v1',
    recorded_at: '2026-07-19T08:01:00.000Z',
    mode: 'delta',
    outcome: 'failed',
    response_code: 400,
    url_count: 1,
    attempt: 1,
    error_type: 'http'
  });
  const serializedFailureReceipt = JSON.stringify(failureReceipt);
  for (const forbidden of [key, firstBuildUrl, 'upstream diagnostic body', 'api.indexnow.org']) {
    assert.equal(serializedFailureReceipt.includes(forbidden), false, `failure receipt must not expose ${forbidden}`);
  }
} finally {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
}

console.log(`indexnow-regression-test: ok urls=${payload.urlList.length} receipt=202 key_file=ok`);
