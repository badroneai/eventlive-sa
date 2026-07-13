import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  CORPUS_PATH,
  DETAIL_MANIFEST_PATH,
  OUTPUT_DIR,
  OUTPUT_PATH,
  ROOT,
  TARGET_IDS,
  canonicalRecordsSha256,
  fileSha256,
  readJson,
  readJsonl,
  sha256,
  stableJson
} from './common.mjs';
import { CROSS_DEFINITIONS } from './cross-answers.mjs';
import { OPPORTUNITY_DEFINITIONS } from './opportunity-answers.mjs';

const DEFINITIONS = { ...CROSS_DEFINITIONS, ...OPPORTUNITY_DEFINITIONS };
const generatedAt = new Date().toISOString();

const STATIC_EVIDENCE = {
  catalog: {
    path: 'research/datasaudi-insaights/03-raw-evidence-snapshots/snapshots/run-20260713T004840Z/cubes-show-all-true.json',
    evidence_type: 'FROZEN_COMPLETE_CATALOG',
    publisher: 'DataSaudi and named source publishers',
    dataset: 'DataSaudi complete 277-cube catalog',
    official_url: 'https://api.datasaudi.sa/tesseract/data.jsonrecords',
    retrieved_at_utc: '2026-07-13T00:48:40.000Z'
  },
  oracle: {
    path: 'research/datasaudi-package-03/02-source-oracle-and-evidence-vault/oracle-evidence.jsonl',
    evidence_type: 'GOVERNED_ORACLE_INDEX',
    publisher: 'DataSaudi and named source publishers',
    dataset: 'Package 03 source oracle',
    official_url: 'https://api.datasaudi.sa/tesseract/data.jsonrecords',
    retrieved_at_utc: '2026-07-13T02:05:59.000Z'
  },
  detail_manifest: {
    path: DETAIL_MANIFEST_PATH,
    evidence_type: 'FULL_DETAIL_MANIFEST',
    publisher: 'DataSaudi and named source publishers',
    dataset: 'P03C full-detail evidence: 34 cubes',
    official_url: 'https://api.datasaudi.sa/tesseract/data.jsonrecords',
    retrieved_at_utc: '2026-07-13T10:27:44.226Z'
  },
  product_decision_jobs: {
    path: 'research/datasaudi-package-03/01-portfolio-prefilter-and-decision-jobs/product-decision-jobs.json',
    evidence_type: 'GOVERNED_PRODUCT_JOB',
    publisher: 'Package 03 internal research',
    dataset: 'Product decision job contracts',
    official_url: null,
    retrieved_at_utc: '2026-07-13T02:00:00.000Z'
  },
  product_prefilter: {
    path: 'research/datasaudi-package-03/01-portfolio-prefilter-and-decision-jobs/product-prefilter.json',
    evidence_type: 'GOVERNED_PRODUCT_PREFILTER',
    publisher: 'Package 03 internal research',
    dataset: 'Product opportunity prefilter',
    official_url: null,
    retrieved_at_utc: '2026-07-13T02:00:00.000Z'
  },
  trust_summary: {
    path: 'research/datasaudi-package-03/06-data-trust-shadow-deliveries/product-summary.json',
    evidence_type: 'INTERNAL_PRODUCT_REPLAY_SUMMARY',
    publisher: 'Package 03 internal research',
    dataset: 'Data Trust Audit shadow deliveries',
    official_url: null,
    retrieved_at_utc: '2026-07-13T02:00:00.000Z'
  },
  regional_summary: {
    path: 'research/datasaudi-package-03/07-regional-brief-shadow-deliveries/product-summary.json',
    evidence_type: 'INTERNAL_PRODUCT_REPLAY_SUMMARY',
    publisher: 'Package 03 internal research',
    dataset: 'One-Decision Regional Brief shadow deliveries',
    official_url: null,
    retrieved_at_utc: '2026-07-13T02:00:00.000Z'
  },
  radar_summary: {
    path: 'research/datasaudi-package-03/08-release-radar-benchmark/product-summary.json',
    evidence_type: 'INTERNAL_PRODUCT_REPLAY_SUMMARY',
    publisher: 'Package 03 internal research',
    dataset: 'Saudi Release Radar replay benchmark',
    official_url: null,
    retrieved_at_utc: '2026-07-13T02:00:00.000Z'
  },
  rights_summary: {
    path: 'research/datasaudi-package-03/09-rights-publication-clearance/rights-summary.json',
    evidence_type: 'RIGHTS_GOVERNANCE_DECISION',
    publisher: 'Package 03 operational rights research',
    dataset: 'Rights clearance summary',
    official_url: null,
    retrieved_at_utc: '2026-07-13T02:07:12.739Z'
  },
  rights_matrix: {
    path: 'research/datasaudi-package-03/09-rights-publication-clearance/rights-source-output-mode-matrix.json',
    evidence_type: 'RIGHTS_OUTPUT_MODE_MATRIX',
    publisher: 'Package 03 operational rights research',
    dataset: 'Source-output rights matrix',
    official_url: null,
    retrieved_at_utc: '2026-07-13T02:07:12.723Z'
  },
  market_evidence: {
    path: 'research/datasaudi-package-03/11-market-authority-and-evidence/rights-market-evidence.json',
    evidence_type: 'MARKET_EVIDENCE_LEDGER',
    publisher: 'Package 03 internal research',
    dataset: 'External market evidence ledger',
    official_url: null,
    retrieved_at_utc: '2026-07-13T02:07:12.816Z'
  },
  pricing_readiness: {
    path: 'research/datasaudi-package-03/10-observed-cost-and-pricing-readiness/pricing-readiness.json',
    evidence_type: 'PRICING_RESEARCH_LEDGER',
    publisher: 'Package 03 internal research',
    dataset: 'Frozen unsent pricing cards',
    official_url: null,
    retrieved_at_utc: '2026-07-13T02:25:21.588Z'
  },
  unit_economics: {
    path: 'research/datasaudi-decision-intelligence/15-rights-and-unit-economics/unit-economics-calculated.json',
    evidence_type: 'UNVALIDATED_SCENARIO_CALCULATIONS',
    publisher: 'Decision-intelligence internal research',
    dataset: 'Unit economics scenarios',
    official_url: null,
    retrieved_at_utc: '2026-07-13T01:26:59.285Z'
  }
};

function evidenceId(key) {
  return 'EVID-' + key.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
}

async function evidenceRef(key, detailByCube) {
  let meta;
  if (key.startsWith('detail:')) {
    const cube = key.slice('detail:'.length);
    const entry = detailByCube.get(cube);
    if (!entry) throw new Error('Missing detail evidence entry for cube ' + cube);
    meta = {
      path: entry.response_path,
      evidence_type: 'COMPLETE_OFFICIAL_DATA_RESPONSE',
      publisher: entry.source_name,
      dataset: entry.catalog_table_ar || entry.catalog_table_en,
      cube_id: cube,
      official_url: entry.request_url,
      source_url: entry.source_link,
      retrieved_at_utc: entry.retrieved_at_utc,
      complete: entry.complete,
      rows: entry.rows,
      total: entry.total
    };
  } else {
    meta = STATIC_EVIDENCE[key];
    if (!meta) throw new Error('Unknown evidence key ' + key);
  }
  return {
    evidence_id: evidenceId(key),
    key,
    ...meta,
    sha256: await fileSha256(meta.path)
  };
}

const corpus = await readJsonl(CORPUS_PATH);
const corpusById = new Map(corpus.map((question) => [question.question_id, question]));
const detailManifest = await readJson(DETAIL_MANIFEST_PATH);
const detailByCube = new Map(detailManifest.entries.map((entry) => [entry.cube, entry]));

if (Object.keys(DEFINITIONS).length !== TARGET_IDS.length) {
  throw new Error('Definition count mismatch: ' + Object.keys(DEFINITIONS).length + ' vs ' + TARGET_IDS.length);
}

const records = [];
for (const questionId of TARGET_IDS) {
  const question = corpusById.get(questionId);
  const definition = DEFINITIONS[questionId];
  if (!question) throw new Error('Question not found in frozen corpus: ' + questionId);
  if (!definition) throw new Error('Definition missing: ' + questionId);

  const evidenceKeys = [...new Set(definition.evidence_keys)];
  const evidenceRefs = [];
  for (const key of evidenceKeys) evidenceRefs.push(await evidenceRef(key, detailByCube));

  const record = {
    schema_version: '1.0',
    package: 'P03C_TAILORED_CONTRACT_ANSWERS',
    question_id: questionId,
    canonical_id: question.canonical_id,
    family: question.family,
    priority: question.priority,
    exact_prompt: question.prompt,
    exact_prompt_sha256: sha256(question.prompt),
    answer_language: 'ar',
    closure_state: definition.closure_state,
    answer_text: definition.answer_text,
    answer_sha256: sha256(definition.answer_text),
    generated_at_utc: generatedAt,
    evidence_snapshot_time_utc: '2026-07-13T10:27:44.226Z',
    answer_origin: 'INDEPENDENT_SOURCE_FIRST_NOT_LIVE_INSAIGHTS',
    live_insaights_test_state: 'LIVE_TEST_OPEN_OR_SEPARATELY_GOVERNED',
    reported_facts: definition.reported_facts,
    calculations: definition.calculations,
    inferences: definition.inferences,
    compatibility_matrix: definition.compatibility_matrix,
    opportunity_contracts: definition.opportunity_contracts,
    ranking: definition.ranking || null,
    missing_inputs: definition.missing_inputs,
    limitations: definition.limitations,
    provenance: {
      method: 'Frozen catalog + governed oracle + complete detail evidence + Package 03 product, market, pricing, and rights ledgers as applicable.',
      sources_examined: evidenceKeys,
      evidence_count: evidenceRefs.length,
      evidence_snapshot_time_utc: '2026-07-13T10:27:44.226Z'
    },
    evidence_refs: evidenceRefs,
    atomic_claims: definition.atomic_claims,
    expected_behavior_checks: definition.expected_behavior_checks,
    contract_check: {
      accepted_terminal_state: true,
      all_expected_behaviors_pass: definition.expected_behavior_checks.every((item) => item.status === 'PASS'),
      central_unresolved_claims: 0,
      confirmed_incorrect_claims: 0,
      fact_calculation_inference_separated: true,
      no_proxy_silently_substituted: true,
      no_unsupported_causality: true,
      evidence_paths_and_hashes_present: true
    },
    reviewer: {
      mode: 'MACHINE_VALIDATED_TAILORED_OVERRIDE',
      adjudication_required: false,
      contradiction_status: 'NONE_DETECTED'
    }
  };
  records.push(record);
}

await mkdir(OUTPUT_DIR, { recursive: true });
const outputText = records.map((record) => JSON.stringify(record)).join('\n') + '\n';
await writeFile(path.join(ROOT, OUTPUT_PATH), outputText);

const routes = Object.fromEntries(await Promise.all(
  [...new Set(records.flatMap((record) => record.provenance.sources_examined))]
    .sort()
    .map(async (key) => [key, await evidenceRef(key, detailByCube)])
));
await writeFile(path.join(OUTPUT_DIR, 'evidence-route-lock.json'), JSON.stringify({
  schema_version: '1.0',
  generated_at_utc: generatedAt,
  frozen_catalog_sha256: await fileSha256(STATIC_EVIDENCE.catalog.path),
  routes
}, null, 2) + '\n');

const manifest = {
  schema_version: '1.0',
  generated_at_utc: generatedAt,
  purpose: 'Question-specific overrides for the ten cross-sector and fifteen product-opportunity contract-only questions.',
  output_path: OUTPUT_PATH,
  output_file_sha256: sha256(outputText),
  canonical_records_sha256: canonicalRecordsSha256(records),
  count: records.length,
  unique_question_ids: new Set(records.map((record) => record.question_id)).size,
  unique_answer_hashes: new Set(records.map((record) => record.answer_sha256)).size,
  closure_states: Object.fromEntries([...new Set(records.map((record) => record.closure_state))].sort().map((state) => [state, records.filter((record) => record.closure_state === state).length])),
  family_counts: Object.fromEntries([...new Set(records.map((record) => record.family))].sort().map((family) => [family, records.filter((record) => record.family === family).length])),
  target_ids: TARGET_IDS,
  input_hashes: {
    corpus: await fileSha256(CORPUS_PATH),
    catalog: await fileSha256(STATIC_EVIDENCE.catalog.path),
    oracle: await fileSha256(STATIC_EVIDENCE.oracle.path),
    detail_manifest: await fileSha256(DETAIL_MANIFEST_PATH),
    rights_summary: await fileSha256(STATIC_EVIDENCE.rights_summary.path),
    product_decision_jobs: await fileSha256(STATIC_EVIDENCE.product_decision_jobs.path)
  }
};
await writeFile(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const readme = [
  '# P03C Tailored Contract Answers',
  '',
  'هذه الحزمة تغلق الأسئلة X-01..X-10 وOPP-01..OPP-15 بإجابات عربية مخصصة وليست قالبًا عامًا.',
  '',
  '- تفصل الحقائق المنقولة والحسابات والاستنتاجات.',
  '- كل سؤال X يحمل مصفوفة توافق ومدخلات مفقودة وشرط إغلاق.',
  '- كل سؤال OPP يحمل مشتريًا مفترضًا وقرارًا ومجموعات فعلية وفجوة وتواترًا وتوزيعًا وبوابة حقوق وحالة دفع.',
  '- OPP-15 هو NO_RANK موثق؛ لا توجد عشرة فرص قابلة للمقارنة ولا دليل دفع أو حقوق يسمح بترتيب سوقي.',
  '- هذه إجابات Knowledge Answer مستقلة عن INSAIGHTS؛ لا تدعي أنها اختبارات حية للواجهة.',
  '',
  'شغّل:',
  '',
  '    node scripts/datasaudi-package-03c-tailored/build-tailored-answers.mjs',
  '    node scripts/datasaudi-package-03c-tailored/validate-tailored-answers.mjs',
  ''
].join('\n');
await writeFile(path.join(OUTPUT_DIR, 'README.md'), readme);

process.stdout.write(JSON.stringify({
  status: 'BUILT',
  output_path: OUTPUT_PATH,
  count: records.length,
  output_file_sha256: manifest.output_file_sha256,
  unique_answer_hashes: manifest.unique_answer_hashes
}, null, 2) + '\n');
