#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'research/datasaudi-package-03c-full-closure/05-semantic-audit');
const RESPONSE_DIR = path.join(OUTPUT, 'responses');
const PAGE_SIZE = 500;

const captures = [
  {
    cube: 'sama_higher_education',
    drilldowns: ['Year', 'Academic Status', 'Student Status', 'Sex'],
    measures: ['Students'],
    purpose: 'Prevent aggregation across omitted Student Status and Sex dimensions.',
  },
  {
    cube: 'gstat_disabilities_distribution_age_15_by_work_status_gender',
    drilldowns: ['Year', 'Work Status Name', 'Sex'],
    measures: ['Percentage'],
    purpose: 'Prevent aggregation of percentages across the omitted Sex dimension.',
  },
  {
    cube: 'tourism_occupancy_rate_monthly',
    drilldowns: ['Month', 'Nation', 'Province', 'Accommodation Type'],
    measures: ['Occupancy Rate'],
    purpose: 'Prevent unweighted averaging across Accommodation Type and preserve the published aggregate member.',
  },
  {
    cube: 'gastat_rate_gender_nationality_region',
    drilldowns: ['Quarter', 'Nation', 'Province', 'Sex', 'Nationality'],
    measures: ['Unemployment Rate'],
    purpose: 'Prevent averaging unemployment rates across omitted Sex and Nationality dimensions.',
  },
];

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

async function capture(config) {
  const pages = [];
  const rows = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let annotations = null;
  let columns = null;

  while (offset < total) {
    const params = new URLSearchParams({
      cube: config.cube,
      drilldowns: config.drilldowns.join(','),
      measures: config.measures.join(','),
      locale: 'en',
      limit: `${PAGE_SIZE},${offset}`,
    });
    const requestUrl = `https://api.datasaudi.sa/tesseract/data.jsonrecords?${params.toString()}`;
    const response = await fetch(requestUrl, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`${config.cube}: HTTP ${response.status} for ${requestUrl}`);
    const payload = await response.json();
    if (!Array.isArray(payload.data)) throw new Error(`${config.cube}: response has no data array`);
    annotations ??= payload.annotations ?? null;
    columns ??= payload.columns ?? null;
    total = Number(payload.page?.total ?? payload.data.length);
    pages.push({ request_url: requestUrl, offset, rows: payload.data.length, total });
    rows.push(...payload.data);
    if (payload.data.length === 0) break;
    offset += payload.data.length;
  }

  if (rows.length !== total) throw new Error(`${config.cube}: captured ${rows.length}/${total} rows`);
  const combined = {
    annotations,
    page: { limit: rows.length, offset: 0, total },
    columns,
    data: rows,
  };
  const body = `${JSON.stringify(combined, null, 2)}\n`;
  const digest = sha256(body);
  fs.mkdirSync(RESPONSE_DIR, { recursive: true });
  const absolutePath = path.join(RESPONSE_DIR, `${digest}.json`);
  fs.writeFileSync(absolutePath, body);
  return {
    schema_version: '1.0',
    evidence_id: `SEMANTIC-${digest.slice(0, 24)}`,
    cube: config.cube,
    purpose: config.purpose,
    drilldowns: config.drilldowns,
    measures: config.measures,
    rows: rows.length,
    total,
    complete: rows.length === total,
    pages,
    response_path: path.relative(ROOT, absolutePath),
    response_sha256: digest,
    columns: rows.length ? Object.keys(rows[0]) : [],
  };
}

const entries = [];
for (const config of captures) entries.push(await capture(config));

const manifest = {
  schema_version: '1.0',
  artifact_id: 'P03C-SEMANTIC-DIMENSION-EVIDENCE',
  scope: 'Time-bounded public DataSaudi API capture for semantic-dimension validation.',
  retrieval_policy: 'Paginated to the response-reported total; no omitted non-time dimensions for the four targeted cubes.',
  entries,
};
fs.mkdirSync(OUTPUT, { recursive: true });
fs.writeFileSync(path.join(OUTPUT, 'semantic-evidence-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({ status: 'PASS', entries: entries.map(({ cube, rows, response_sha256 }) => ({ cube, rows, response_sha256 })) }, null, 2));
