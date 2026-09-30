import assert from 'node:assert/strict';
import { sourceErrorMessage } from './source-error-utils.mjs';
import { loadSourceExtraction } from './collect-source-candidates.mjs';

function fetchFailure(code) {
  return new TypeError('fetch failed', {
    cause: Object.assign(new Error('Do not publish credentials or request options from nested messages'), { code })
  });
}

assert.equal(sourceErrorMessage(null), '');
assert.equal(sourceErrorMessage(new Error('HTTP 403')), 'HTTP 403');
for (const code of ['ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']) {
  const error = fetchFailure(code);
  assert.equal(sourceErrorMessage(error), `fetch failed [${code}]`);
  await assert.rejects(
    loadSourceExtraction(
      { id: 'diagnostic-fixture', url: 'https://example.invalid/api/events' },
      () => { throw new Error('extractor must not run after a failed fetch'); },
      { fetchPrimary: async () => { throw error; } }
    ),
    { message: `fetch failed [${code}]` },
    'the loader must preserve transport cause codes when combining failures'
  );
}

await assert.rejects(
  loadSourceExtraction(
    { id: 'diagnostic-fixture', url: 'https://example.invalid/api/events' },
    () => [],
    {
      fetchPrimary: async () => { throw fetchFailure('ECONNREFUSED'); },
      fallbackExtractor: async () => { throw fetchFailure('UND_ERR_CONNECT_TIMEOUT'); }
    }
  ),
  { message: 'fetch failed [ECONNREFUSED]; fetch failed [UND_ERR_CONNECT_TIMEOUT]' },
  'primary and fallback transport errors must remain distinguishable'
);

const aggregate = new TypeError('fetch failed', {
  cause: new AggregateError([fetchFailure('ENETUNREACH').cause, fetchFailure('ETIMEDOUT').cause, fetchFailure('ETIMEDOUT').cause])
});
assert.equal(sourceErrorMessage(aggregate), 'fetch failed [ENETUNREACH, ETIMEDOUT]');
aggregate.cause.cause = aggregate;
assert.equal(sourceErrorMessage(aggregate), 'fetch failed [ENETUNREACH, ETIMEDOUT]', 'cyclic causes must terminate');
assert.equal(sourceErrorMessage(new Error('request https://name:secret@proxy.invalid/path?token=secret failed\nCall log:\nstack data')), 'request [URL redacted] failed');
assert.equal(sourceErrorMessage(fetchFailure('secret=value')), 'fetch failed', 'free-form cause data is not a safe machine code');
assert.equal(sourceErrorMessage(new Error('x'.repeat(400))).length, 240, 'diagnostic messages must stay concise');

console.log('TEST_OK source error diagnostics preserve cause codes without nested error data');
