import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const root = process.cwd();
const workspaceDir = path.join(root, 'workspaces', '_image-cache-failure-regression');
const eventsFile = path.join(workspaceDir, 'events.json');
const manifestFile = path.join(workspaceDir, 'manifest.json');
const imageDir = path.join(workspaceDir, 'event-images');
const reportJsonFile = path.join(workspaceDir, 'event-image-cache-report.json');
const reportMdFile = path.join(workspaceDir, 'event-image-cache-report.md');

fs.rmSync(workspaceDir, { recursive: true, force: true });
fs.mkdirSync(workspaceDir, { recursive: true });

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end('<html><body>not an image</body></html>');
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  const { port } = server.address();
  const imageUrl = `http://127.0.0.1:${port}/assets/event-image.jpg`;
  fs.writeFileSync(eventsFile, `${JSON.stringify({
    events: [{
      id: 'image-cache-failure-test',
      title: 'Image cache failure test',
      image_url: imageUrl,
      original_image_url: imageUrl
    }]
  }, null, 2)}\n`);

  const env = {
    ...process.env,
    EVENTLIVE_EVENTS_DIST_FILE: path.relative(root, eventsFile),
    EVENTLIVE_IMAGE_CACHE_MANIFEST_FILE: path.relative(root, manifestFile),
    EVENTLIVE_IMAGE_CACHE_DIR: path.relative(root, imageDir),
    EVENTLIVE_IMAGE_CACHE_REPORT_JSON_FILE: path.relative(root, reportJsonFile),
    EVENTLIVE_IMAGE_CACHE_REPORT_MD_FILE: path.relative(root, reportMdFile),
    EVENTLIVE_IMAGE_CACHE_LIMIT: '1',
    EVENTLIVE_IMAGE_CACHE_CONCURRENCY: '1',
    EVENTLIVE_IMAGE_CACHE_FAILURE_RETRY_HOURS: '24',
    EVENTLIVE_IMAGE_CACHE_TIMEOUT_MS: '5000'
  };

  await execFileAsync(process.execPath, ['scripts/cache-event-images.mjs'], {
    cwd: root,
    env,
    maxBuffer: 1024 * 1024
  });

  const firstManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const failure = firstManifest.failures?.[imageUrl];
  assert.equal(firstManifest.totals.failed, 1, 'first run must report one failed image');
  assert.equal(firstManifest.totals.remembered_failures, 1, 'first run must remember the failed image');
  assert.equal(failure?.failure_kind, 'source-returned-html', 'HTML responses must be classified');
  assert.match(failure.retry_after || '', /^\d{4}-\d{2}-\d{2}T/, 'failure must carry retry_after');
  assert.equal(failure.attempts, 1, 'first failed fetch must record one attempt');
  const firstReport = JSON.parse(fs.readFileSync(reportJsonFile, 'utf8'));
  assert.equal(firstReport.requires_rebuild, true, 'a newly recorded image failure must refresh operational output');

  await execFileAsync(process.execPath, ['scripts/cache-event-images.mjs'], {
    cwd: root,
    env,
    maxBuffer: 1024 * 1024
  });

  const secondManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const secondFailure = secondManifest.failures?.[imageUrl];
  assert.equal(secondManifest.totals.failed, 1, 'second run still reports the skipped target as failed');
  assert.equal(secondManifest.totals.skipped_recent_failures, 1, 'second run must skip recent non-image failures');
  assert.equal(secondFailure.attempts, 1, 'skipped failures must not increment attempts before retry_after');
  const secondReport = JSON.parse(fs.readFileSync(reportJsonFile, 'utf8'));
  assert.equal(secondReport.requires_rebuild, false, 'a remembered skipped failure must not trigger a redundant public rebuild');
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(workspaceDir, { recursive: true, force: true });
}

console.log('event-image-cache-failure-regression-test: ok');
