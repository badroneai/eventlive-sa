import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ACCEPTED_CLOSURE_STATES,
  CORPUS_PATH,
  OUTPUT_DIR,
  OUTPUT_PATH,
  ROOT,
  TARGET_IDS,
  fileSha256,
  readJsonl,
  sha256
} from './common.mjs';

const errors = [];
const checks = [];
const pass = (name, evidence) => checks.push({ name, status: 'PASS', evidence });
const fail = (name, error) => {
  checks.push({ name, status: 'FAIL', error });
  errors.push(name + ': ' + error);
};
const assert = (condition, name, evidence, error) => condition ? pass(name, evidence) : fail(name, error);

const records = await readJsonl(OUTPUT_PATH);
const corpus = await readJsonl(CORPUS_PATH);
const corpusById = new Map(corpus.map((row) => [row.question_id, row]));
const recordById = new Map(records.map((row) => [row.question_id, row]));

assert(records.length === 25, 'denominator-25', records.length, 'Expected exactly 25 records.');
assert(recordById.size === 25, 'unique-question-ids', recordById.size, 'Duplicate question_id found.');
assert(TARGET_IDS.every((id) => recordById.has(id)) && [...recordById.keys()].every((id) => TARGET_IDS.includes(id)), 'exact-target-set', TARGET_IDS, 'Target set differs from X-01..10 + OPP-01..15.');
assert(new Set(records.map((row) => row.answer_sha256)).size === 25, 'unique-answer-texts-25', 25, 'At least two answer texts are identical.');

for (const record of records) {
  const prefix = record.question_id;
  const frozen = corpusById.get(record.question_id);
  assert(Boolean(frozen), prefix + ':corpus-row', record.question_id, 'Question missing from corpus.');
  if (!frozen) continue;
  assert(record.exact_prompt === frozen.prompt, prefix + ':exact-prompt', 'byte-equal prompt', 'Prompt text differs from frozen corpus.');
  assert(record.exact_prompt_sha256 === sha256(frozen.prompt), prefix + ':prompt-hash', record.exact_prompt_sha256, 'Prompt hash mismatch.');
  assert(record.answer_language === 'ar', prefix + ':answer-language', 'ar', 'Answer language must be ar.');
  assert(ACCEPTED_CLOSURE_STATES.has(record.closure_state), prefix + ':terminal-state', record.closure_state, 'Closure state is not accepted.');
  assert(typeof record.answer_text === 'string' && record.answer_text.length >= 500 && /[\u0600-\u06FF]/.test(record.answer_text), prefix + ':tailored-arabic-answer', record.answer_text.length, 'Answer is too short or lacks Arabic text.');
  assert(record.answer_sha256 === sha256(record.answer_text), prefix + ':answer-hash', record.answer_sha256, 'Answer hash mismatch.');
  assert(Array.isArray(record.reported_facts), prefix + ':reported-facts-array', record.reported_facts.length, 'reported_facts missing.');
  assert(Array.isArray(record.calculations), prefix + ':calculations-array', record.calculations.length, 'calculations missing.');
  assert(Array.isArray(record.inferences), prefix + ':inferences-array', record.inferences.length, 'inferences missing.');
  assert(Array.isArray(record.limitations) && record.limitations.length >= 1, prefix + ':limitations', record.limitations.length, 'At least one limitation is required.');
  assert(Array.isArray(record.atomic_claims) && record.atomic_claims.length >= 2, prefix + ':atomic-claims', record.atomic_claims.length, 'At least two atomic claims required.');
  assert(record.atomic_claims.every((claim) => ['VERIFIED', 'BOUNDED'].includes(claim.verification_status)), prefix + ':atomic-resolution', record.atomic_claims.map((claim) => claim.verification_status), 'Every atomic claim must be VERIFIED or BOUNDED.');
  assert(record.contract_check?.central_unresolved_claims === 0 && record.contract_check?.confirmed_incorrect_claims === 0, prefix + ':zero-unresolved-and-incorrect', record.contract_check, 'Unresolved or incorrect central claims remain.');
  assert(record.contract_check?.all_expected_behaviors_pass === true, prefix + ':contract-check', true, 'Contract check is not passing.');
  assert(record.expected_behavior_checks.every((item) => item.status === 'PASS'), prefix + ':expected-behaviors', record.expected_behavior_checks.map((item) => item.behavior), 'Expected behavior did not pass.');

  const evidenceIds = new Set(record.evidence_refs.map((ref) => ref.evidence_id));
  assert(evidenceIds.size === record.evidence_refs.length && evidenceIds.size >= 2, prefix + ':evidence-refs', evidenceIds.size, 'Evidence references missing or duplicated.');
  for (const evidence of record.evidence_refs) {
    let actualHash = null;
    try {
      actualHash = await fileSha256(evidence.path);
    } catch (error) {
      fail(prefix + ':evidence-exists:' + evidence.evidence_id, String(error));
      continue;
    }
    assert(actualHash === evidence.sha256, prefix + ':evidence-hash:' + evidence.evidence_id, actualHash, 'Evidence hash mismatch for ' + evidence.path);
  }

  const referenceContainers = [
    ...record.reported_facts,
    ...record.calculations,
    ...record.inferences,
    ...record.compatibility_matrix,
    ...record.atomic_claims,
    ...record.opportunity_contracts.flatMap((item) => [item.rights_gate, ...item.datasets])
  ];
  const allReferenced = referenceContainers.flatMap((item) => item?.evidence_ref_ids || []);
  assert(allReferenced.every((id) => evidenceIds.has(id)), prefix + ':all-citations-resolve', allReferenced.length, 'At least one evidence_ref_id is not present in record evidence_refs.');

  if (record.family === 'cross') {
    assert(record.compatibility_matrix.length >= 2, prefix + ':cross-matrix', record.compatibility_matrix.length, 'Cross answer needs at least two matrix rows.');
    assert(record.compatibility_matrix.every((row) => ['dataset', 'publisher', 'cube_id', 'indicator', 'definition', 'unit', 'period', 'frequency', 'geography', 'vintage', 'classification', 'compatibility_status', 'issues'].every((key) => row[key] !== undefined)), prefix + ':cross-matrix-fields', record.compatibility_matrix.length, 'Compatibility row missing a mandatory field.');
    assert(record.missing_inputs.length >= 1 && record.missing_inputs.every((item) => item.input && item.why_missing_or_incompatible && item.what_would_close), prefix + ':cross-missing-input-contract', record.missing_inputs.length, 'Missing input lacks what-would-close.');
    assert(record.opportunity_contracts.length === 0, prefix + ':cross-no-opportunity-contract', 0, 'Cross answer should not carry opportunity contracts.');
    assert(['compatibility_matrix', 'no_unsupported_causality', 'cite_all_datasets'].every((behavior) => record.expected_behavior_checks.some((item) => item.behavior === behavior && item.status === 'PASS')), prefix + ':cross-required-behaviors', true, 'Cross required behavior missing.');
  }

  if (record.family === 'opportunity') {
    assert(record.compatibility_matrix.length === 0, prefix + ':opp-no-cross-matrix', 0, 'Opportunity answer should not carry a cross matrix.');
    assert(record.opportunity_contracts.length >= 1, prefix + ':opportunity-contracts', record.opportunity_contracts.length, 'At least one opportunity contract required.');
    for (const item of record.opportunity_contracts) {
      const valid = item.contract_id && item.opportunity_name_ar && item.buyer?.role_ar && item.buyer?.evidence_status === 'HYPOTHESIZED_NOT_VALIDATED' && item.decision_ar && Array.isArray(item.datasets) && item.datasets.length >= 1 && item.data_gap_ar && item.cadence && Array.isArray(item.distribution) && item.distribution.length >= 1 && item.rights_gate?.status && item.rights_gate?.detail_ar && item.payment_hypothesis_status?.status;
      assert(Boolean(valid), prefix + ':opportunity-fields:' + item.contract_id, item.contract_id, 'Opportunity contract missing buyer/decision/dataset/gap/cadence/distribution/rights/payment field.');
      assert(item.payment_hypothesis_status.status === 'NOT_TESTED', prefix + ':payment-status:' + item.contract_id, item.payment_hypothesis_status.status, 'Payment status must remain NOT_TESTED under current evidence.');
    }
    assert(['name_buyer', 'name_decision', 'cite_dataset', 'state_data_gap', 'rights_gate'].every((behavior) => record.expected_behavior_checks.some((item) => item.behavior === behavior && item.status === 'PASS')), prefix + ':opp-required-behaviors', true, 'Opportunity required behavior missing.');
  }
}

const x03 = recordById.get('X-03-AR');
assert(x03.evidence_refs.some((ref) => ref.cube_id === 'gastat_housing_tenure') && !x03.evidence_refs.some((ref) => ref.cube_id === 'building_permits'), 'X-03:no-building-permit-substitution', 'housing_tenure only', 'X-03 substituted building permits for housing units.');
const x07 = recordById.get('X-07-AR');
assert(x07.evidence_refs.some((ref) => ref.cube_id === 'gastat_employment_population_ratio') && !x07.evidence_refs.some((ref) => ref.cube_id === 'gastat_digital_economy_establishment_usage_by_economic_activity'), 'X-07:no-establishment-usage-substitution', 'employment gap preserved', 'X-07 substituted establishment technology usage for ICT employment.');

const x05 = recordById.get('X-05-AR');
const posEvidence = x05.evidence_refs.find((ref) => ref.cube_id === 'sama_pos_sectors');
const inflationEvidence = x05.evidence_refs.find((ref) => ref.cube_id === 'gastat_inflation');
const pos = JSON.parse(await readFile(path.join(ROOT, posEvidence.path), 'utf8')).data;
const inflation = JSON.parse(await readFile(path.join(ROOT, inflationEvidence.path), 'utf8')).data;
const posRow = (month) => pos.find((row) => row.Month === month && row['Economic Sectors'] === 'أنشطة الإقامة والخدمات الغذائية');
const infRow = (month) => inflation.find((row) => row.Month === month && row['Main Division'] === 'الأغذية والمشروبات');
const computed = {
  sales: (posRow('2026-05').Sales / posRow('2025-05').Sales - 1) * 100,
  transactions: (posRow('2026-05')['Number of Transactions'] / posRow('2025-05')['Number of Transactions'] - 1) * 100,
  inflation: (infRow('2026-05').Inflation / infRow('2025-05').Inflation - 1) * 100
};
const outputByMetric = Object.fromEntries(x05.calculations.map((item) => [item.calculation_id, item.output.value]));
assert(Math.abs(computed.sales - outputByMetric['X05-K1']) < 1e-10, 'X-05:recompute-sales', computed.sales, 'Sales calculation mismatch.');
assert(Math.abs(computed.transactions - outputByMetric['X05-K2']) < 1e-10, 'X-05:recompute-transactions', computed.transactions, 'Transaction calculation mismatch.');
assert(Math.abs(computed.inflation - outputByMetric['X05-K3']) < 1e-10, 'X-05:recompute-inflation', computed.inflation, 'Inflation calculation mismatch.');

const opp01 = recordById.get('OPP-01-AR');
const opp15 = recordById.get('OPP-15-AR');
assert(opp15.ranking?.status === 'NO_RANK' && opp15.ranking?.requested_count === 10 && opp15.ranking?.eligible_comparable_count === 0, 'OPP-15:no-rank-contract', opp15.ranking, 'OPP-15 must be explicit NO_RANK.');
assert(opp01.answer_sha256 !== opp15.answer_sha256 && !opp15.answer_text.includes('الجواب التنفيذي: توجد ثلاثة قرارات دورية'), 'OPP-01-vs-OPP-15:distinct', [opp01.answer_sha256, opp15.answer_sha256], 'OPP-01 and OPP-15 are not question-specific.');

const validation = {
  schema_version: '1.0',
  generated_at_utc: new Date().toISOString(),
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  target: '25 tailored contract-only overrides',
  counts: {
    records: records.length,
    unique_question_ids: recordById.size,
    unique_answer_hashes: new Set(records.map((row) => row.answer_sha256)).size,
    cross: records.filter((row) => row.family === 'cross').length,
    opportunity: records.filter((row) => row.family === 'opportunity').length,
    accepted_terminal: records.filter((row) => ACCEPTED_CLOSURE_STATES.has(row.closure_state)).length,
    atomic_claims: records.reduce((sum, row) => sum + row.atomic_claims.length, 0),
    unresolved_atomic_claims: records.reduce((sum, row) => sum + row.atomic_claims.filter((claim) => !['VERIFIED', 'BOUNDED'].includes(claim.verification_status)).length, 0)
  },
  output_path: OUTPUT_PATH,
  output_sha256: await fileSha256(OUTPUT_PATH),
  checks,
  errors
};
await writeFile(path.join(OUTPUT_DIR, 'validation.json'), JSON.stringify(validation, null, 2) + '\n');

if (errors.length > 0) {
  process.stderr.write(JSON.stringify({ status: 'FAIL', error_count: errors.length, errors: errors.slice(0, 30) }, null, 2) + '\n');
  process.exit(1);
}

process.stdout.write(JSON.stringify({
  status: 'PASS',
  records: 25,
  unique_answers: 25,
  cross: 10,
  opportunity: 15,
  accepted_terminal: 25,
  atomic_claims: validation.counts.atomic_claims,
  unresolved_atomic_claims: 0,
  output_path: OUTPUT_PATH,
  output_sha256: validation.output_sha256
}, null, 2) + '\n');
