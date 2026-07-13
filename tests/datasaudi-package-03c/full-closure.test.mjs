import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const LEDGER = path.join(ROOT, 'research/datasaudi-package-03c-full-closure/03-answer-ledger/full-answer-ledger.jsonl');
const SUMMARY = path.join(ROOT, 'research/datasaudi-package-03c-full-closure/03-answer-ledger/summary.json');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const jsonl = (file) => fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);

test('builder and independent validator pass', () => {
  const build = spawnSync(process.execPath, ['scripts/datasaudi-package-03c/build-full-closure.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr || build.stdout);
  const validate = spawnSync(process.execPath, ['scripts/datasaudi-package-03c/validate-full-closure.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  assert.match(validate.stdout, /"status": "PASS"/);
});

test('ledger closes the exact 267-question denominator in original languages', () => {
  const records = jsonl(LEDGER);
  assert.equal(records.length, 267);
  assert.equal(new Set(records.map((record) => record.question_id)).size, 267);
  assert.equal(records.filter((record) => record.answer_language === 'ar').length, 247);
  assert.equal(records.filter((record) => record.answer_language === 'en').length, 20);
  assert.ok(records.every((record) => record.answer_language === record.original_language));
  assert.ok(records.every((record) => record.answer_sha256 === sha256(record.answer_text)));
  assert.ok(records.every((record) => record.closure_state.startsWith('CLOSED_')));
  assert.ok(records.every((record) => record.expected_behavior_checks.every((check) => check.status === 'PASS')));
});

test('all claims are resolved and INSAIGHTS observation is independent', () => {
  const records = jsonl(LEDGER);
  assert.ok(records.every((record) => record.insaights_observed_status.channel === 'INSAIGHTS'));
  assert.ok(records.every((record) => record.policy.insaights_not_required === true));
  assert.ok(records.every((record) => record.atomic_claims.length > 0));
  assert.ok(records.every((record) => record.atomic_claims.every((claim) => ['VERIFIED', 'BOUNDED'].includes(claim.verification_status))));
  const summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8'));
  assert.equal(summary.atomic_claims.unresolved, 0);
  assert.equal(summary.atomic_claims.incorrect, 0);
  assert.equal(summary.routing_gaps, 0);
});

test('authoritative P0 references and full H-03 population rank are preserved', () => {
  const records = jsonl(LEDGER);
  assert.equal(records.filter((record) => record.authoritative_reference?.verified).length, 87);
  const h03 = records.find((record) => record.question_id === 'H-03-AR');
  assert.equal(h03.ranking.ranking.length, 13);
  assert.match(h03.answer_text, /8,591,748/);
  assert.match(h03.answer_text, /339,174/);
  assert.equal(h03.closure_state, 'CLOSED_VALID_NEGATIVE');
});

test('rank and series contracts never invent missing detail', () => {
  const records = jsonl(LEDGER);
  const rank = records.filter((record) => record.family === 'rank');
  const series = records.filter((record) => record.family === 'series');
  assert.equal(rank.length, 24);
  assert.equal(series.length, 24);
  assert.ok(rank.every((record) => (record.ranking?.ranking?.length ?? 0) >= 2 || record.closure_state === 'CLOSED_DOCUMENTED_NOT_COMPUTABLE'));
  assert.ok(series.every((record) => record.reported_facts.length >= 12 || record.closure_state === 'CLOSED_DOCUMENTED_NOT_COMPUTABLE'));
  const mktRank = records.find((record) => record.question_id === 'MKT-RANK-01-AR');
  assert.equal(mktRank.ranking, null);
  assert.equal(mktRank.closure_state, 'CLOSED_DOCUMENTED_NOT_COMPUTABLE');
  const fisDirect = records.find((record) => record.question_id === 'FIS-DIRECT-01-AR');
  const semanticKeys = fisDirect.reported_facts.map((fact) => `${fact.indicator_caption}|${fact.unit}`);
  assert.equal(new Set(semanticKeys).size, semanticKeys.length);
  assert.equal(fisDirect.reported_facts.length, 3);
  assert.equal(fisDirect.closure_state, 'CLOSED_VERIFIED_REPORTED');
  assert.deepEqual(fisDirect.limitations, []);
});
