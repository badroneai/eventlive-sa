import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const LEDGER = path.join(ROOT, 'research/datasaudi-package-03c-full-closure/03-answer-ledger/full-answer-ledger.jsonl');
const SUMMARY = path.join(ROOT, 'research/datasaudi-package-03c-full-closure/summary.json');
const ACCEPTED_CLOSURE_STATES = new Set([
  'CLOSED_VERIFIED_REPORTED',
  'CLOSED_VERIFIED_CALCULATED',
  'CLOSED_VALID_NEGATIVE',
  'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
  'CLOSED_EVIDENCE_BOUND_INFERENCE',
]);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readLedger = () => fs.readFileSync(LEDGER, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const byId = (records, questionId) => {
  const record = records.find((item) => item.question_id === questionId);
  assert.ok(record, `${questionId}: ledger record missing`);
  return record;
};
const normalizedIndicator = (fact) => String(fact.indicator_caption ?? fact.indicator ?? '').trim().toLowerCase();
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

function tokens(text) {
  return new Set(String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

function jaccard(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 1;
}

test('closure contract uses only the five accepted states and reproducible answer hashes', () => {
  const records = readLedger();
  assert.equal(records.length, 267);
  assert.equal(new Set(records.map((record) => record.question_id)).size, 267);
  for (const record of records) {
    assert.ok(ACCEPTED_CLOSURE_STATES.has(record.closure_state), `${record.question_id}: unexpected closure state ${record.closure_state}`);
    assert.equal(record.answer_sha256, sha256(record.answer_text), `${record.question_id}: answer hash mismatch`);
    assert.equal(record.referenceAnswerHash, record.answer_sha256, `${record.question_id}: reference hash mismatch`);
    assert.ok(record.answer_text.trim().length >= 80, `${record.question_id}: answer is too short to satisfy the contract`);
  }
  const summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8'));
  assert.match(summary.interpretation.independent_answer_layer, /original language/i);
  assert.doesNotMatch(summary.interpretation.independent_answer_layer, /every frozen question has a deterministic Arabic answer/i);
});

test('reported direct answers contain three genuinely distinct indicators or state a verified limitation', () => {
  const direct = readLedger().filter((record) => record.family === 'direct');
  assert.equal(direct.length, 24);
  for (const record of direct) {
    const distinct = new Set(record.reported_facts.map((fact) => `${normalizedIndicator(fact)}|${String(fact.unit ?? '').toLowerCase()}`));
    if (record.numeric_result_status === 'PROVIDED_AS_REQUESTED') {
      assert.ok(record.reported_facts.length >= 3, `${record.question_id}: fewer than three facts marked complete`);
      assert.ok(distinct.size >= 3, `${record.question_id}: repeated measure/frequency was counted as three indicators`);
    } else {
      assert.equal(record.closure_state, 'CLOSED_DOCUMENTED_NOT_COMPUTABLE', `${record.question_id}: incomplete direct answer lacks limitation closure`);
      assert.match(record.answer_text, /(?:الفجوة|لم أملأ|متاح|غير متاح|fewer|available)/i, `${record.question_id}: limitation is not explained`);
    }
  }
});

test('series and derived calculations never mix indicators, units, frequencies, or duplicate periods', () => {
  const records = readLedger();
  for (const record of records.filter((item) => item.family === 'series')) {
    const facts = record.reported_facts;
    if (record.numeric_result_status === 'PROVIDED_AS_REQUESTED') assert.equal(facts.length, 12, `${record.question_id}: complete series must contain 12 periods`);
    else assert.equal(record.closure_state, 'CLOSED_DOCUMENTED_NOT_COMPUTABLE', `${record.question_id}: short series lacks limitation closure`);
    assert.equal(new Set(facts.map((fact) => fact.period)).size, facts.length, `${record.question_id}: duplicate periods`);
    assert.ok(new Set(facts.map((fact) => fact.cube)).size <= 1, `${record.question_id}: mixed cubes in one series`);
    assert.ok(new Set(facts.map(normalizedIndicator)).size <= 1, `${record.question_id}: mixed indicators in one series`);
    assert.ok(new Set(facts.map((fact) => fact.unit)).size <= 1, `${record.question_id}: mixed units in one series`);
    assert.ok(new Set(facts.map((fact) => fact.frequency)).size <= 1, `${record.question_id}: mixed frequencies in one series`);
  }

  for (const record of records.filter((item) => ['derive', 'explain'].includes(item.family) && item.numeric_result_status === 'PROVIDED_AS_REQUESTED')) {
    const facts = record.reported_facts;
    assert.equal(facts.length, 2, `${record.question_id}: calculation must use exactly two comparable facts`);
    assert.equal(new Set(facts.map((fact) => fact.cube)).size, 1, `${record.question_id}: calculation mixes cubes`);
    assert.equal(new Set(facts.map(normalizedIndicator)).size, 1, `${record.question_id}: calculation mixes indicators`);
    assert.equal(new Set(facts.map((fact) => fact.unit)).size, 1, `${record.question_id}: calculation mixes units`);
    assert.equal(new Set(facts.map((fact) => fact.frequency)).size, 1, `${record.question_id}: calculation mixes frequencies`);
    const calculation = record.calculations[0];
    assert.ok(calculation, `${record.question_id}: missing calculation object`);
    if (calculation.formula === '((current - previous) / previous) * 100') {
      const expected = ((calculation.current_value - calculation.previous_value) / calculation.previous_value) * 100;
      assert.ok(Math.abs(expected - calculation.raw_growth_percent) < 1e-9, `${record.question_id}: growth does not reproduce`);
      assert.ok(Math.abs((calculation.rounded_growth_percent - calculation.raw_growth_percent) - calculation.rounding_difference) < 1e-12, `${record.question_id}: rounding difference does not reproduce`);
    }
  }
});

test('rankings are finite, sequential, unique, and do not rank heterogeneous Tadawul indicators', () => {
  const ranks = readLedger().filter((record) => record.family === 'rank');
  assert.equal(ranks.length, 24);
  const mkt = ranks.find((record) => record.question_id === 'MKT-RANK-01-AR');
  assert.equal(mkt?.closure_state, 'CLOSED_DOCUMENTED_NOT_COMPUTABLE', 'MKT rank must be NO_RANK while Value mixes Index, P/E, EPS, and sector indices');
  assert.equal(mkt?.ranking, null, 'MKT heterogeneous values must not be emitted as one ranking');

  const domainPatterns = {
    log: /نقل|تخزين/i,
    agr: /زراع|غابات|صيد/i,
    ind: /تصنيع|تعدين|محاجر|بناء|كهرباء|غاز|مياه/i,
  };
  for (const record of ranks) {
    if (record.ranking === null) {
      assert.equal(record.closure_state, 'CLOSED_DOCUMENTED_NOT_COMPUTABLE', `${record.question_id}: NO_RANK lacks limitation closure`);
      continue;
    }
    const rows = record.ranking.ranking;
    assert.ok(rows.length >= 2, `${record.question_id}: a ranking needs at least two comparable rows`);
    assert.ok(rows.every((row) => row.label === row.label.trim()), `${record.question_id}: emitted rank label contains edge whitespace`);
    assert.deepEqual(rows.map((row) => row.rank), rows.map((_, index) => index + 1), `${record.question_id}: non-sequential ranks`);
    assert.equal(new Set(rows.map((row) => row.label)).size, rows.length, `${record.question_id}: duplicate labels`);
    assert.ok(rows.every((row) => finite(row.value_raw)), `${record.question_id}: non-finite rank value`);
    for (let index = 1; index < rows.length; index += 1) assert.ok(rows[index - 1].value_raw >= rows[index].value_raw, `${record.question_id}: ranking is not descending`);
    if (record.ranking.cube === 'sama_bank_credit_month' && domainPatterns[record.domain]) {
      assert.ok(rows.every((row) => domainPatterns[record.domain].test(row.label)), `${record.question_id}: bank-credit ranking leaks categories outside its requested domain`);
    }
  }
});

test('rankings exclude aggregates and unspecified buckets under explicit category allowlists', () => {
  const records = readLedger();
  const provinces = new Set([
    'Al-Baha', 'Al-Jouf', 'Al-Madinah Al-Monawarah', 'Al-Qaseem', 'Al-Riyadh',
    'Aseer', 'Eastern Region', 'Hail', 'Jazan', 'Makkah Al-Mokarramah',
    'Najran', 'Northern Borders', 'Tabouk',
  ]);
  const cases = [
    { id: 'CPI-RANK-01-AR', expected: 13, forbidden: ['الرقم القياسي العام'] },
    { id: 'GDP-RANK-01-AR', expected: 11, forbidden: ['Gross Domestic Product'] },
    { id: 'EXT-RANK-01-AR', expected: 18, forbidden: ['المجموع'] },
    { id: 'LAB-RANK-01-AR', expected: 13, forbidden: ['Grand Total'], allowlist: provinces },
    { id: 'RE-RANK-01-AR', expected: 13, forbidden: ['Grand Total'], allowlist: provinces },
    { id: 'TOU-RANK-01-AR', expected: 13, forbidden: ['Grand Total'], allowlist: provinces },
    { id: 'HLT-RANK-01-AR', expected: 13, forbidden: ['Grand Total', 'Unspecified'], allowlist: provinces },
  ];
  for (const contract of cases) {
    const record = records.find((item) => item.question_id === contract.id);
    assert.ok(record?.ranking, `${contract.id}: ranking missing`);
    const labels = record.ranking.ranking.map((row) => row.label);
    assert.equal(labels.length, contract.expected, `${contract.id}: eligible category population changed`);
    assert.ok(contract.forbidden.every((label) => !labels.includes(label)), `${contract.id}: aggregate/unspecified label leaked into ranking`);
    assert.ok(contract.forbidden.every((label) => record.ranking.category_policy?.excluded_labels?.includes(label)), `${contract.id}: exclusion decision is not audited`);
    assert.match(record.ranking.category_policy?.mode ?? '', /ALLOWLIST.*DENY/, `${contract.id}: explicit allowlist policy missing`);
    if (contract.allowlist) assert.ok(labels.every((label) => contract.allowlist.has(label)), `${contract.id}: non-province label escaped the allowlist`);
    assert.ok(labels.every((label) => record.ranking.category_policy.allowlist.includes(label)), `${contract.id}: emitted label is absent from sealed allowlist`);
  }
  const cpi = byId(records, 'CPI-RANK-01-AR');
  assert.ok(cpi.ranking.ranking.some((row) => row.label.trim() === 'النقل'), 'CPI rank must retain the transport division after whitespace normalization');

  const trade = byId(records, 'TRD-RANK-01-AR');
  assert.equal(trade.ranking.ranking.length, 196);
  assert.ok(!trade.ranking.ranking.some((row) => row.label === 'Not Defined'));
  assert.ok(trade.ranking.category_policy.excluded_labels.includes('Not Defined'));
  assert.equal(trade.ranking.unit, 'مليون ريال');

  const tourism = byId(records, 'TOU-RANK-01-AR');
  assert.equal(tourism.ranking.fixed_filters['Accommodation Type'], 'Hotels');
  const labor = byId(records, 'LAB-RANK-01-AR');
  assert.deepEqual(labor.ranking.fixed_filters, { Nation: 'Saudi Arabia', Sex: 'Total', Nationality: 'Total' });
  const fiscal = byId(records, 'FIS-RANK-01-AR');
  assert.equal(fiscal.ranking.ranking.length, 2);
  assert.ok(fiscal.ranking.ranking.every((row) => /Oil Revenues|Non-Oil Revenues|عائدات النفط|الإيرادات غير النفطية/.test(row.label)));
  const population = byId(records, 'POP-RANK-01-AR');
  assert.match(population.ranking.category_field, /Governatorate/i);
  assert.match(population.ranking.geography, /جغرافي/);
  assert.doesNotMatch(population.ranking.geography, /غير جغرافية/);
});

test('high-risk direct values are pinned to their sealed semantic contracts', () => {
  const records = readLedger();
  const expected = new Map([
    ['CPI-DIRECT-01-AR', [105.27592142761459, 1.7540765641219647, 1.5893869701367302]],
    ['PAY-DIRECT-01-AR', [2470101, 1103895128, 63110274.13778001]],
    ['FIS-DIRECT-01-AR', [606544, 505282, 1219919]],
    ['EDU-DIRECT-01-AR', [1220686, 298949, 233666]],
    ['DIS-DIRECT-01-AR', [27.556114196777344, 19.586894989013672, 15.79318618774414]],
    ['TOU-DIRECT-01-AR', [0.5791451469156904, 0.5860391523892918, 0.6100000143051147]],
    ['LAB-DIRECT-01-AR', [3.054164122339742, 60.890600598, 65.12234461407398]],
    ['MKT-DIRECT-01-AR', [10799.92, 16, 1.53]],
    ['RND-DIRECT-01-AR', [29478896897, 56593, 41562]],
    ['EXT-DIRECT-01-AR', [119173.99450525589, 977363.116183, 23086.00154215412]],
    ['BNK-DIRECT-01-AR', [3393794.3550289082, 1456698.2134269061, 408361.4475916521]],
    ['DIG-DIRECT-01-AR', [16, 98.6, 0.6293184653588436]],
    ['ENR-DIRECT-01-AR', [298701592.347389, 142449918.738534, 3556976]],
    ['RE-DIRECT-01-AR', [103.29, 4387231, 7356]],
  ]);
  for (const [questionId, values] of expected) {
    const record = byId(records, questionId);
    assert.deepEqual(record.reported_facts.map((fact) => fact.value_raw), values, `${questionId}: semantic values drifted`);
    assert.equal(record.reported_facts.length, 3, `${questionId}: expected exactly three distinct facts`);
    assert.deepEqual(record.limitations, [], `${questionId}: complete answer still carries a limitation`);
  }
  assert.match(byId(records, 'CPI-DIRECT-01-AR').reported_facts[2].indicator_caption, /تعريف مكعب المناطق المختلف/);
  assert.equal(byId(records, 'RE-DIRECT-01-AR').reported_facts[2].indicator_caption, 'عدد تراخيص البناء');
  assert.deepEqual(byId(records, 'DIG-DIRECT-01-AR').reported_facts.slice(0, 2).map((fact) => fact.indicator_caption), [
    'حصة الاقتصاد الرقمي من الناتج المحلي',
    'معدل انتشار الإنترنت — الإجمالي الوطني',
  ]);
});

test('series endpoints, short-series limitations, and semantic units remain exact', () => {
  const records = readLedger();
  const seriesCases = [
    ['MKT-SERIES-01-AR', 12, '2026-06', 10799.92],
    ['TOU-SERIES-01-AR', 12, '2024-12', 0.5791451469156904],
    ['EXT-SERIES-01-AR', 12, '2026-Q1', 23086.00154215412],
    ['BUS-SERIES-01-AR', 12, '2026-04', 7356],
    ['HUM-SERIES-01-AR', 12, '2024-12', 2019451],
    ['POP-SERIES-01-AR', 12, 2022, 4.5],
  ];
  for (const [questionId, length, period, value] of seriesCases) {
    const record = byId(records, questionId);
    assert.equal(record.reported_facts.length, length);
    assert.equal(record.reported_facts.at(-1).period, period);
    assert.equal(record.reported_facts.at(-1).value_raw, value);
  }
  for (const [questionId, length] of [['DIG-SERIES-01-AR', 3], ['RND-SERIES-01-AR', 4], ['DIS-SERIES-01-AR', 1]]) {
    const record = byId(records, questionId);
    assert.equal(record.reported_facts.length, length);
    assert.equal(record.closure_state, 'CLOSED_DOCUMENTED_NOT_COMPUTABLE');
    assert.ok(record.limitations.some((item) => item.includes(String(length))), `${questionId}: explicit short-series limitation missing`);
  }
  assert.equal(byId(records, 'TOU-SERIES-01-AR').reported_facts[0].unit, 'معدل عشري (0–1؛ حسب تعريف المصدر)');
});

test('metadata reports finest retrieved frequency and cube-specific raw scales', () => {
  const records = readLedger();
  const metadata = (questionId, cube) => {
    const item = byId(records, questionId).dataset_metadata.find((entry) => entry.cube === cube);
    assert.ok(item, `${questionId}/${cube}: metadata missing`);
    return item;
  };
  assert.equal(metadata('GDP-AVAIL-01-AR', 'gastat_gdp').frequency, 'ربع سنوي');
  assert.equal(metadata('CPI-AVAIL-01-AR', 'gastat_inflation').frequency, 'شهري');
  assert.equal(metadata('LAB-AVAIL-01-AR', 'gastat_rate_gender_nationality_region').frequency, 'ربع سنوي');
  assert.equal(metadata('RE-AVAIL-01-AR', 'gastat_real_estate').frequency, 'ربع سنوي');
  assert.equal(metadata('TOU-AVAIL-01-AR', 'tourism_occupancy_rate_monthly').frequency, 'شهري');

  const unit = (questionId, cube, measureName) => metadata(questionId, cube).measures.find((measure) => measure.name === measureName)?.unit;
  assert.match(unit('TOU-AVAIL-01-AR', 'tourism_occupancy_rate_monthly', 'Occupancy Rate'), /0–1/);
  assert.match(unit('DIG-AVAIL-01-AR', 'gastat_digital_economy_establishment_usage_by_economic_activity', 'Percentage'), /0–1/);
  assert.equal(unit('TRD-AVAIL-01-AR', 'gastat_trade_balance', 'Trade Volume'), 'مليون ريال');
  assert.equal(unit('TRD-AVAIL-01-AR', 'trade_balance_by_country', 'Trade Balance'), 'مليون ريال');
  assert.equal(unit('PAY-AVAIL-01-AR', 'sama_pos_cities', 'Number of Transactions'), 'ألف عملية');
  assert.equal(unit('PAY-AVAIL-01-AR', 'sama_pos_transactions_mada', 'Number of Transactions'), 'عدد');
  assert.equal(unit('MKT-AVAIL-01-AR', 'tadawul_indicators', 'Value'), 'متعددة حسب Indicator (نقطة/مضاعف/ريال)');

  const forbidden = new Set(['Unit', 'Unit Int', 'Rate', 'الوحدة غير موثقة بدقة']);
  for (const record of records) {
    assert.ok(record.reported_facts.every((fact) => !forbidden.has(fact.unit)), `${record.question_id}: forbidden raw fact unit`);
    assert.ok(record.dataset_metadata.every((item) => item.measures.every((measure) => !forbidden.has(measure.unit))), `${record.question_id}: forbidden metadata unit`);
    if (record.ranking) assert.ok(!forbidden.has(record.ranking.unit), `${record.question_id}: forbidden ranking unit`);
  }
});

test('fresh availability and limit answers use retrieved detail while retaining P0 provenance', () => {
  const records = readLedger();
  for (const record of records.filter((item) => item.family === 'availability' && item.answer_language === 'ar')) {
    assert.doesNotMatch(record.answer_text, /إثات|ميتادات/, `${record.question_id}: stale Arabic availability wording`);
  }
  assert.equal(records.filter((record) => record.authoritative_reference?.verified).length, 87);
  for (const id of ['PAY-AVAIL-01-AR', 'PAY-LIMIT-01-AR']) {
    const record = byId(records, id);
    assert.equal(record.authoritative_reference.reference_used_as_provenance_only, true);
    assert.match(record.answer_text, /2026-05/);
    assert.match(record.answer_text, /2025-05/);
  }
  assert.match(byId(records, 'LAB-AVAIL-01-AR').answer_text, /2026-Q1/);
  assert.match(byId(records, 'LAB-AVAIL-01-AR').answer_text, /2023-Q3/);
  assert.match(byId(records, 'TOU-AVAIL-01-AR').answer_text, /2024-12/);
  assert.match(byId(records, 'TOU-AVAIL-01-AR').answer_text, /0–1/);

  const english = records.filter((record) => record.answer_language === 'en');
  assert.equal(english.length, 20);
  assert.ok(english.every((record) => !/[\u0600-\u06ff]/.test(record.answer_text)), `Arabic boilerplate leaked into: ${english.filter((record) => /[\u0600-\u06ff]/.test(record.answer_text)).map((record) => record.question_id).join(', ')}`);
  for (const record of english) {
    const consumerFacing = {
      answer_text: record.answer_text,
      dataset_metadata: record.dataset_metadata,
      reported_facts: record.reported_facts,
      calculations: record.calculations,
      inferences: record.inferences,
      limitations: record.limitations,
      ranking: record.ranking,
      compatibility_matrix: record.compatibility_matrix,
    };
    assert.doesNotMatch(JSON.stringify(consumerFacing), /[\u0600-\u06ff]/, `${record.question_id}: Arabic leaked into English consumer-facing fields`);
  }
  const payEnglish = byId(records, 'PAY-AVAIL-01-EN');
  assert.match(payEnglish.answer_text, /Frequency: monthly/);
  assert.match(payEnglish.answer_text, /2026-05/);
  assert.match(payEnglish.answer_text, /thousand transactions/);
});

test('stock-flow compatibility forbids false comparisons in every guarded domain', () => {
  const records = readLedger();
  for (const questionId of ['PAY-CROSS-01-AR', 'EXT-CROSS-01-AR', 'BUS-CROSS-01-AR', 'EDU-CROSS-01-AR']) {
    const record = byId(records, questionId);
    const stockFlow = record.compatibility_matrix.filter((pair) => new Set([pair.left.value_kind, pair.right.value_kind]).size === 2 && [pair.left.value_kind, pair.right.value_kind].includes('STOCK') && [pair.left.value_kind, pair.right.value_kind].includes('FLOW'));
    assert.ok(stockFlow.length > 0, `${questionId}: no STOCK/FLOW pair was audited`);
    assert.ok(stockFlow.every((pair) => pair.verdicts.definition === 'MISMATCH' && pair.comparison_allowed === false), `${questionId}: STOCK/FLOW comparison escaped the definition gate`);
  }

  const genericCross = records.filter((record) => record.family === 'cross' && !/^X-\d{2}-AR$/.test(record.question_id));
  assert.equal(genericCross.length, 24);
  for (const record of genericCross) {
    if (record.reported_facts.length >= 2) {
      assert.equal(record.compatibility_matrix.length, record.reported_facts.length * (record.reported_facts.length - 1) / 2, `${record.question_id}: incomplete pair matrix`);
      assert.ok(record.compatibility_matrix.every((pair) => pair.verdicts && typeof pair.comparison_allowed === 'boolean'));
    } else {
      assert.equal(record.closure_state, 'CLOSED_DOCUMENTED_NOT_COMPUTABLE');
    }
  }

  const market = byId(records, 'MKT-CROSS-01-AR');
  assert.ok(market.compatibility_matrix.every((pair) => pair.verdicts.geography === 'MATCH'), 'Tadawul Indicator is a definition axis, not a geography axis');
  assert.ok(market.compatibility_matrix.every((pair) => pair.verdicts.unit === 'MISMATCH' && pair.comparison_allowed === false));
  const cpi = byId(records, 'CPI-CROSS-01-AR');
  assert.ok(cpi.compatibility_matrix.every((pair) => pair.verdicts.geography === 'MATCH'), 'CPI headline Province label is an aggregate national row');
  assert.ok(cpi.compatibility_matrix.every((pair) => pair.verdicts.definition === 'PARTIAL'));
});

test('hallucination defenses bind every material number and reject unsafe aggregates', () => {
  const records = readLedger();
  const h02 = byId(records, 'H-02-AR');
  assert.deepEqual(h02.reported_facts.map((fact) => fact.value_raw), [105.27592142761459, 1.7540765641219647, 1.5893869701367302]);
  assert.ok(h02.material_claims.some((claim) => claim.type === 'PROMPT_REJECTED_VALUE' && claim.payload.rejected_value === -3.7));
  assert.ok(h02.atomic_claims.filter((claim) => claim.type === 'REPORTED_NUMERIC_VALUE').length >= 3);

  const h05 = byId(records, 'H-05-AR');
  assert.deepEqual(h05.reported_facts.map((fact) => fact.value_raw), [23086.00154215412, 977363.116183]);
  assert.ok(!records.flatMap((record) => record.reported_facts).some((fact) => fact.value_raw === 52598.663166551894), 'aggregated Inflows+Outflows value leaked into facts');
  const h08 = byId(records, 'H-08-AR');
  assert.equal(h08.reported_facts[0].value_raw, 0.5791451469156904);
  assert.match(h08.reported_facts[0].unit, /0–1/);

  for (const id of ['H-09-AR', 'H-10-AR', 'H-11-AR', 'H-12-AR', 'H-13-AR', 'H-14-AR']) {
    const record = byId(records, id);
    assert.ok(record.material_claims.some((claim) => claim.type === 'BOUNDED_CATALOG_SEARCH_RESULT'));
    assert.ok(record.material_claims.some((claim) => claim.type === 'CATALOG_COUNT' && claim.payload.cube_count === 277));
  }
  assert.ok(byId(records, 'H-16-AR').material_claims.some((claim) => claim.type === 'CATALOG_COUNT' && claim.payload.cube_count === 277));
  const h26 = byId(records, 'H-26-AR');
  assert.ok(h26.material_claims.some((claim) => claim.type === 'CATALOG_COUNT' && /277/.test(claim.statement)));
  assert.ok(h26.material_claims.some((claim) => claim.type === 'SUBTOPIC_COUNT' && /36/.test(claim.statement)));
  assert.ok(h26.material_claims.some((claim) => claim.type === 'MISSING_SUBTOPIC_COUNT' && /26/.test(claim.statement)));
  const h27 = byId(records, 'H-27-AR');
  assert.ok(h27.material_claims.some((claim) => claim.type === 'ORACLE_SCOPE_COUNT' && /65/.test(claim.statement)));
  assert.match(byId(records, 'H-28-AR').answer_text, /^لا أدعي أن كل جملة حرة تحمل cube/);
  assert.doesNotMatch(byId(records, 'H-30-AR').answer_text, /الحسابان الوحيدان/);
});

test('cross-domain and opportunity contracts are tailored rather than duplicated boilerplate', () => {
  const records = readLedger();
  const tailoredCross = records.filter((record) => /^X-\d{2}-AR$/.test(record.question_id));
  const opportunities = records.filter((record) => record.family === 'opportunity');
  assert.equal(tailoredCross.length, 10);
  assert.equal(opportunities.length, 15);
  assert.equal(new Set(tailoredCross.map((record) => record.answer_sha256)).size, 10, 'X answers must be individually tailored');
  assert.equal(new Set(opportunities.map((record) => record.answer_sha256)).size, 15, 'opportunity answers must be individually tailored');
  assert.ok(tailoredCross.every((record) => record.compatibility_matrix.length >= 2), 'every X answer needs an explicit compatibility matrix');
  assert.ok(tailoredCross.every((record) => Array.isArray(record.missing_inputs) && record.missing_inputs.length > 0), 'every X answer needs named missing inputs');
  for (let left = 0; left < opportunities.length; left += 1) {
    for (let right = left + 1; right < opportunities.length; right += 1) {
      assert.ok(jaccard(opportunities[left].answer_text, opportunities[right].answer_text) < 0.9, `${opportunities[left].question_id}/${opportunities[right].question_id}: opportunity answers are near-duplicates`);
    }
  }
});

test('non-safety answers are not exact duplicates across different questions', () => {
  const records = readLedger().filter((record) => record.family !== 'hallucination');
  const groups = Object.groupBy(records, (record) => record.answer_sha256);
  const duplicates = Object.values(groups).filter((group) => group.length > 1).map((group) => group.map((record) => record.question_id));
  assert.deepEqual(duplicates, [], `duplicate semantic answers remain: ${JSON.stringify(duplicates)}`);
});
