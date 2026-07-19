import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sitemapUrls } from './seo-discovery-utils.mjs';

const root = process.cwd();
const defaultEndpoint = 'https://api.indexnow.org/indexnow';
const defaultReceiptPath = path.join(root, 'reports', 'indexnow-submission-receipt.json');
const siteUrl = 'https://eventme.live';
const host = 'eventme.live';

function argumentValue(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
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

function receiptFor({ recordedAt, mode, outcome, responseCode = null, urlCount = 0, attempt = 0, errorType = null }) {
  return {
    schema: 'eventlive.indexnow-receipt.v1',
    recorded_at: recordedAt,
    mode,
    outcome,
    response_code: Number.isInteger(responseCode) ? responseCode : null,
    url_count: Number(urlCount) || 0,
    attempt: Number(attempt) || 0,
    ...(errorType ? { error_type: errorType } : {})
  };
}

export function writeIndexNowReceipt(receiptPath, receipt) {
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

function errorType(error) {
  if (Number.isInteger(error?.responseCode)) return 'http';
  if (['AbortError', 'TimeoutError'].includes(error?.name)) return 'timeout';
  if (error instanceof TypeError) return 'network';
  return 'runtime';
}

async function postWithRetry(payload, attempts = 3, {
  endpoint = defaultEndpoint,
  fetchImpl = globalThis.fetch,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000)
      });
      if ([200, 202].includes(response.status)) return { status: response.status, attempt };
      const body = (await response.text()).slice(0, 400);
      lastError = new Error(`IndexNow returned ${response.status}: ${body}`);
      lastError.responseCode = response.status;
      lastError.attempt = attempt;
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      lastError.attempt = attempt;
    }
    if (attempt < attempts) await sleep(attempt * 2_000);
  }
  throw lastError || new Error('IndexNow submission failed.');
}

export async function main({
  args = process.argv.slice(2),
  endpoint = process.env.EVENTLIVE_INDEXNOW_ENDPOINT || defaultEndpoint,
  fetchImpl = globalThis.fetch,
  sleep,
  now = () => new Date().toISOString(),
  logger = console
} = {}) {
  const dryRun = args.includes('--dry-run');
  const submitAll = args.includes('--all');
  const mode = submitAll ? 'all' : 'delta';
  const deltaPath = argumentValue(args, '--delta', path.join(root, '.eventlive-cache', 'indexnow-delta.json'));
  const sitemapPath = argumentValue(args, '--sitemap', path.join(root, 'dist', 'sitemap.xml'));
  const keyPath = argumentValue(args, '--key', path.join(root, 'data', 'indexnow-key.txt'));
  const receiptPath = argumentValue(args, '--receipt', process.env.EVENTLIVE_INDEXNOW_RECEIPT || defaultReceiptPath);
  const recordedAt = now();
  let urlCount = 0;

  try {
    const key = readIndexNowKey(keyPath);
    let urls = [];
    if (submitAll) {
      urls = sitemapUrls(fs.readFileSync(sitemapPath, 'utf8'));
    } else if (fs.existsSync(deltaPath)) {
      const delta = JSON.parse(fs.readFileSync(deltaPath, 'utf8'));
      urls = Array.isArray(delta.urls) ? delta.urls : [];
    }

    const payload = buildIndexNowPayload(urls, key);
    urlCount = payload.urlList.length;
    if (!urlCount) {
      writeIndexNowReceipt(receiptPath, receiptFor({ recordedAt, mode, outcome: 'skipped' }));
      logger.log('INDEXNOW_SKIP no changed public URLs');
      return { submitted: 0, status: 'skipped' };
    }
    if (dryRun) {
      writeIndexNowReceipt(receiptPath, receiptFor({ recordedAt, mode, outcome: 'dry-run', urlCount }));
      logger.log(`INDEXNOW_DRY_RUN mode=${mode} urls=${urlCount}`);
      return { submitted: urlCount, status: 'dry-run' };
    }

    const result = await postWithRetry(payload, 3, { endpoint, fetchImpl, ...(sleep ? { sleep } : {}) });
    writeIndexNowReceipt(receiptPath, receiptFor({
      recordedAt,
      mode,
      outcome: 'submitted',
      responseCode: result.status,
      urlCount,
      attempt: result.attempt
    }));
    logger.log(`INDEXNOW_OK status=${result.status} urls=${urlCount} attempt=${result.attempt}`);
    return { submitted: urlCount, status: result.status, attempt: result.attempt };
  } catch (error) {
    writeIndexNowReceipt(receiptPath, receiptFor({
      recordedAt,
      mode,
      outcome: 'failed',
      responseCode: error?.responseCode,
      urlCount,
      attempt: error?.attempt,
      errorType: errorType(error)
    }));
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`INDEXNOW_FAILED ${error.message}`);
    process.exitCode = 1;
  });
}
