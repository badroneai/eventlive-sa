import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

assert.equal(fs.existsSync(distDir), true, 'dist directory must exist; run npm run build first');

function walkHtml(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkHtml(fullPath));
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripExecutableBlocks(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

function localTargetPath(htmlFile, href) {
  const withoutHash = href.split('#')[0].split('?')[0];
  if (!withoutHash) return '';
  if (withoutHash.startsWith('/')) return path.join(distDir, withoutHash.replace(/^\//, ''));
  return path.normalize(path.join(path.dirname(htmlFile), withoutHash));
}

function localTargetExists(htmlFile, href) {
  if (!href || /^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(href)) return true;
  const target = localTargetPath(htmlFile, href);
  if (!target) return true;
  return fs.existsSync(target);
}

const htmlFiles = walkHtml(distDir);
const manifestFailures = [];
const localReferenceFailures = [];

for (const file of htmlFiles) {
  const html = stripExecutableBlocks(fs.readFileSync(file, 'utf8'));
  const relativeFile = path.relative(distDir, file);
  const manifestLinks = [...html.matchAll(/<link\s+rel="manifest"\s+href="([^"]+)"/gi)].map((match) => match[1]);
  assert.equal(manifestLinks.length, 1, `${relativeFile} must include exactly one PWA manifest link`);
  for (const href of manifestLinks) {
    if (!localTargetExists(file, href)) {
      manifestFailures.push(`${relativeFile} -> ${href}`);
    }
  }

  const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/gi)].map((match) => match[1]);
  for (const href of references) {
    if (!localTargetExists(file, href)) {
      localReferenceFailures.push(`${relativeFile} -> ${href}`);
    }
  }
}

assert.deepEqual(manifestFailures, [], `broken manifest links:\n${manifestFailures.join('\n')}`);
assert.deepEqual(localReferenceFailures, [], `broken local href/src links:\n${localReferenceFailures.join('\n')}`);

console.log(`public-asset-links-regression-test: ok html=${htmlFiles.length}`);
