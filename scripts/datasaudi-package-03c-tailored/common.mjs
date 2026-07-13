import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const ROOT = process.cwd();
export const OUTPUT_DIR = path.join(ROOT, 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers');
export const CORPUS_PATH = 'research/datasaudi-insaights/04-question-corpus/questions.jsonl';
export const DETAIL_MANIFEST_PATH = 'research/datasaudi-package-03c-full-closure/02-catalog-discovery/detail-evidence/detail-evidence-manifest.json';
export const OUTPUT_PATH = 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers/tailored-answer-overrides.jsonl';

export const ACCEPTED_CLOSURE_STATES = new Set([
  'CLOSED_VERIFIED_REPORTED',
  'CLOSED_VERIFIED_CALCULATED',
  'CLOSED_VALID_NEGATIVE',
  'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
  'CLOSED_EVIDENCE_BOUND_INFERENCE'
]);

export const TARGET_IDS = [
  ...Array.from({ length: 10 }, (_, index) => 'X-' + String(index + 1).padStart(2, '0') + '-AR'),
  ...Array.from({ length: 15 }, (_, index) => 'OPP-' + String(index + 1).padStart(2, '0') + '-AR')
];

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export async function fileSha256(relativePath) {
  return sha256(await readFile(path.join(ROOT, relativePath)));
}

export async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));
}

export async function readJsonl(relativePath) {
  const text = await readFile(path.join(ROOT, relativePath), 'utf8');
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

export async function pathExists(relativePath) {
  try {
    await stat(path.join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

export function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

export function canonicalRecordsSha256(records) {
  return sha256(records.map(stableJson).join('\n') + '\n');
}
