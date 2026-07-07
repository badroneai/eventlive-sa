import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolvePublicBaseUrl } from './program-lifecycle-utils.mjs';

const root = process.cwd();
const productionUrl = 'https://eventme.live/';
const forbiddenPreviewPattern = /github\.io\/eventlive-sa|badroneai\.github\.io\/eventlive-sa/i;

const workflowFiles = [
  '.github/workflows/deploy.yml',
  '.github/workflows/pages.yml',
  '.github/workflows/source-sync.yml',
  '.github/workflows/uptime.yml',
  '.github/workflows/stability-6h.yml'
];

for (const relativePath of workflowFiles) {
  const fullPath = path.join(root, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} must exist`);
  const text = fs.readFileSync(fullPath, 'utf8');
  assert.doesNotMatch(text, forbiddenPreviewPattern, `${relativePath} must not monitor or publish against the legacy GitHub Pages preview path`);
}

for (const relativePath of ['.github/workflows/deploy.yml', '.github/workflows/source-sync.yml', '.github/workflows/uptime.yml', '.github/workflows/stability-6h.yml']) {
  const text = fs.readFileSync(path.join(root, relativePath), 'utf8');
  assert.match(text, /EVENTLIVE_PUBLIC_BASE_URL:\s*https:\/\/eventme\.live\//, `${relativePath} must point checks/builds at eventme.live`);
}

assert.equal(resolvePublicBaseUrl(), productionUrl, 'default public base URL must be eventme.live');

const lifecycleUtils = fs.readFileSync(path.join(root, 'scripts', 'program-lifecycle-utils.mjs'), 'utf8');
assert.doesNotMatch(lifecycleUtils, forbiddenPreviewPattern, 'program lifecycle utilities must not fall back to legacy GitHub Pages URLs');
assert.match(lifecycleUtils, /https:\/\/eventme\.live\//, 'program lifecycle fallback must keep eventme.live');

console.log('production-domain-regression-test: ok');
