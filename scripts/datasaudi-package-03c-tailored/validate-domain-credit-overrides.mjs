import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ACCEPTED_CLOSURE_STATES, CORPUS_PATH, OUTPUT_DIR, ROOT, fileSha256, readJsonl, sha256 } from './common.mjs';

const OUTPUT = 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers/domain-credit-overrides.jsonl';
const records = await readJsonl(OUTPUT);
const corpus = await readJsonl(CORPUS_PATH);
const corpusById = new Map(corpus.map((row) => [row.question_id, row]));
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const expectedMappings = {
  LOG: ['النقل والتخزين'],
  AGR: ['الزراعة والغابات وصيد الأسماك'],
  IND: ['التعدين واستغلال المحاجر', 'التصنيع', 'إمدادات الكهرباء والغاز والمياه', 'البناء'],
  SRV: ['تجارة الجملة والتجزئة', 'النقل والتخزين', 'أنشطة خدمات الإقامة والطعام', 'المعلومات والاتصالات', 'الأنشطة المالية والتأمينية', 'أنشطة السوق العقاري', 'الأنشطة المهنية والعلمية والتقنية', 'أنشطة الخدمات الإدارية والدعم', 'التعليم', 'أنشطة صحة الإنسان والعمل الاجتماعي']
};

assert(records.length === 12, 'Expected 12 records.');
assert(new Set(records.map((row) => row.question_id)).size === 12, 'Question ids are not unique.');
assert(new Set(records.map((row) => row.answer_sha256)).size === 12, 'Answer texts are not unique.');

for (const record of records) {
  const question = corpusById.get(record.question_id);
  assert(Boolean(question), record.question_id + ': missing corpus row');
  if (!question) continue;
  assert(record.exact_prompt === question.prompt, record.question_id + ': prompt mismatch');
  assert(record.exact_prompt_sha256 === sha256(question.prompt), record.question_id + ': prompt hash mismatch');
  assert(record.answer_sha256 === sha256(record.answer_text), record.question_id + ': answer hash mismatch');
  assert(ACCEPTED_CLOSURE_STATES.has(record.closure_state), record.question_id + ': non-terminal state');
  assert(record.contract_check?.domain_filter_applied === true && record.contract_check?.no_total_credit_as_domain_output === true, record.question_id + ': domain gate missing');
  assert(record.atomic_claims.every((claim) => ['VERIFIED', 'BOUNDED'].includes(claim.verification_status)), record.question_id + ': unresolved atomic claim');
  for (const evidence of record.evidence_refs) {
    assert(await fileSha256(evidence.path) === evidence.sha256, record.question_id + ': evidence hash mismatch');
    assert(evidence.complete === true && evidence.rows === evidence.total, record.question_id + ': incomplete source population');
  }

  const code = record.question_id.split('-')[0];
  const expected = expectedMappings[code];
  if (record.family === 'rank') {
    assert(JSON.stringify(record.ranking.population_policy) === JSON.stringify(expected), record.question_id + ': rank population is not domain-filtered');
    assert(record.ranking.rows.every((row) => expected.includes(row.category) && row.category !== 'الإجمالي'), record.question_id + ': rank contains out-of-domain or total row');
    if (expected.length === 1) assert(record.ranking.status === 'NO_RANK' && record.ranking.eligible_population_size === 1, record.question_id + ': single category must be NO_RANK');
    else assert(record.ranking.status === 'RANKED_COMPLETE_POPULATION' && record.ranking.rows.length === expected.length, record.question_id + ': rank population incomplete');
  }
  if (record.family === 'derive') {
    const calculation = record.calculations[0];
    assert(Boolean(calculation?.formula && calculation?.output), record.question_id + ': missing calculation contract');
    if (expected.length > 1) {
      assert(calculation.inputs.length === expected.length && calculation.inputs.every((item) => expected.includes(item.category)), record.question_id + ': derive numerator is not domain-filtered');
      assert(calculation.denominator.category === 'الإجمالي', record.question_id + ': total may be denominator only');
    }
  }
  if (record.family === 'explain') {
    assert(JSON.stringify(record.domain_mapping) === JSON.stringify(expected), record.question_id + ': explain mapping mismatch');
    assert(record.contribution_breakdown.every((row) => expected.includes(row.category) && row.category !== 'الإجمالي'), record.question_id + ': explain includes out-of-domain contribution');
  }
}

const validation = {
  schema_version: '1.0',
  generated_at_utc: new Date().toISOString(),
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  count: records.length,
  unique_question_ids: new Set(records.map((row) => row.question_id)).size,
  unique_answer_hashes: new Set(records.map((row) => row.answer_sha256)).size,
  no_rank_single_category: records.filter((row) => row.family === 'rank' && row.ranking.status === 'NO_RANK').map((row) => row.question_id),
  output_path: OUTPUT,
  output_sha256: await fileSha256(OUTPUT),
  errors
};
await writeFile(path.join(OUTPUT_DIR, 'domain-credit-validation.json'), JSON.stringify(validation, null, 2) + '\n');
if (errors.length) {
  process.stderr.write(JSON.stringify(validation, null, 2) + '\n');
  process.exit(1);
}
process.stdout.write(JSON.stringify(validation, null, 2) + '\n');
