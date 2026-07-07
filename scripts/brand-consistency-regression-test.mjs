import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const manifestPath = path.join(distDir, 'manifest.webmanifest');
const llmsPath = path.join(distDir, 'llms.txt');

const scannedExtensions = new Set(['.html', '.json', '.txt', '.xml', '.webmanifest', '.ics']);
const skippedDirs = new Set(['assets']);
const forbidden = [
  { pattern: /\bEventMe\b/g, label: 'legacy EventMe brand' },
  { pattern: /\bEvent Life\b/gi, label: 'legacy Event Life spelling' },
  { pattern: /\beventlife\b/gi, label: 'legacy eventlife spelling' },
  { pattern: /\beventlive\.sa\b/gi, label: 'wrong public domain' }
];

assert.equal(fs.existsSync(distDir), true, 'dist directory must exist; run npm run build first');
assert.equal(fs.existsSync(manifestPath), true, 'manifest.webmanifest must exist');
assert.equal(fs.existsSync(llmsPath), true, 'llms.txt must exist');

function publicFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(distDir, fullPath);
    if (entry.isDirectory()) {
      if (skippedDirs.has(entry.name)) continue;
      files.push(...publicFiles(fullPath));
    } else if (scannedExtensions.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }
  return files;
}

const files = publicFiles(distDir);
const violations = [];

for (const relativePath of files) {
  const fullPath = path.join(distDir, relativePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  for (const rule of forbidden) {
    const matches = [...content.matchAll(rule.pattern)];
    for (const match of matches) {
      const line = content.slice(0, match.index).split('\n').length;
      violations.push(`${relativePath}:${line} ${rule.label}`);
    }
  }
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.match(manifest.name || '', /EventLive/, 'PWA manifest name must use EventLive');
assert.match(manifest.short_name || '', /EventLive/, 'PWA manifest short_name must use EventLive');
assert.doesNotMatch(manifest.name || '', /\bEventMe\b/, 'PWA manifest must not use EventMe');

const llms = fs.readFileSync(llmsPath, 'utf8');
assert.match(llms, /^# EventLive/m, 'llms.txt must identify the product as EventLive');
assert.match(llms, /Primary domain: https:\/\/eventme\.live\//, 'llms.txt must preserve the real public domain');

assert.deepEqual(violations, [], `legacy brand/domain text found:\n${violations.join('\n')}`);

console.log(`brand-consistency-regression-test: ok files=${files.length}`);
