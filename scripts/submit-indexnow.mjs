import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sitemapUrls } from './seo-discovery-utils.mjs';

const root = process.cwd();
const endpoint = process.env.EVENTLIVE_INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
const siteUrl = 'https://eventme.live';
const host = 'eventme.live';

function argumentValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

export function readIndexNowKey(filePath = path.join(root, 'data', 'indexnow-key.txt')) {
  const key = fs.readFileSync(filePath, 'utf8').trim();
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) throw new Error('IndexNow key must be 8-128 letters, numbers, or dashes.');
  return key;
}

export function buildIndexNowPayload(urls = [], key = '') {
  const urlList = [...new Set(urls)]
    .filter((url) => String(url).startsWith(`${siteUrl}/`))
    .slice(0, 10_000);
  return {
    host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList
  };
}

async function postWithRetry(payload, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000)
      });
      if ([200, 202].includes(response.status)) return { status: response.status, attempt };
      const body = (await response.text()).slice(0, 400);
      lastError = new Error(`IndexNow returned ${response.status}: ${body}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
  }
  throw lastError || new Error('IndexNow submission failed.');
}

export async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const submitAll = process.argv.includes('--all');
  const deltaPath = argumentValue('--delta', path.join(root, '.eventlive-cache', 'indexnow-delta.json'));
  const sitemapPath = argumentValue('--sitemap', path.join(root, 'dist', 'sitemap.xml'));
  const keyPath = argumentValue('--key', path.join(root, 'data', 'indexnow-key.txt'));
  const key = readIndexNowKey(keyPath);

  let urls = [];
  if (submitAll) {
    urls = sitemapUrls(fs.readFileSync(sitemapPath, 'utf8'));
  } else if (fs.existsSync(deltaPath)) {
    const delta = JSON.parse(fs.readFileSync(deltaPath, 'utf8'));
    urls = Array.isArray(delta.urls) ? delta.urls : [];
  }

  const payload = buildIndexNowPayload(urls, key);
  if (!payload.urlList.length) {
    console.log('INDEXNOW_SKIP no changed public URLs');
    return { submitted: 0, status: 'skipped' };
  }
  if (dryRun) {
    console.log(JSON.stringify({ endpoint, ...payload }, null, 2));
    return { submitted: payload.urlList.length, status: 'dry-run' };
  }

  const result = await postWithRetry(payload);
  console.log(`INDEXNOW_OK status=${result.status} urls=${payload.urlList.length} attempt=${result.attempt}`);
  return { submitted: payload.urlList.length, status: result.status };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`INDEXNOW_FAILED ${error.message}`);
    process.exitCode = 1;
  });
}
