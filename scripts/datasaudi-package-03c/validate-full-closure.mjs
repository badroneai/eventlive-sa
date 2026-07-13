#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  PATHS,
  fileSha256,
  isRankingExcludedLabel,
  readJson,
  readJsonl,
  sha256,
} from './common.mjs';

const OUTPUT = 'research/datasaudi-package-03c-full-closure';
const LEDGER = `${OUTPUT}/03-answer-ledger/full-answer-ledger.jsonl`;
const SUMMARY = `${OUTPUT}/03-answer-ledger/summary.json`;
const VERIFICATION = `${OUTPUT}/03-answer-ledger/verification.json`;
const MANIFEST = `${OUTPUT}/PACKAGE_MANIFEST.json`;
const ALLOWED_CLOSURES = new Set([
  'CLOSED_VERIFIED_REPORTED',
  'CLOSED_VERIFIED_CALCULATED',
  'CLOSED_VALID_NEGATIVE',
  'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
  'CLOSED_EVIDENCE_BOUND_INFERENCE',
]);
const ALLOWED_CLAIMS = new Set(['VERIFIED', 'BOUNDED']);
const DOMAIN_BANK_LABELS = Object.freeze({
  log: new Set(['النقل والتخزين']),
  agr: new Set(['الزراعة والغابات وصيد الأسماك']),
  ind: new Set(['التصنيع', 'التعدين واستغلال المحاجر', 'البناء', 'إمدادات الكهرباء والغاز والمياه']),
  srv: new Set([
    'أنشطة الخدمات الإدارية والدعم', 'أنشطة السوق العقاري', 'أنشطة خدمات الإقامة والطعام',
    'أنشطة صحة الإنسان والعمل الاجتماعي', 'الأنشطة المالية والتأمينية',
    'الأنشطة المهنية والعلمية والتقنية', 'التعليم', 'المعلومات والاتصالات',
    'النقل والتخزين', 'تجارة الجملة والتجزئة',
  ]),
});

const records = readJsonl(LEDGER);
const corpus = readJsonl(PATHS.corpus);
const summary = readJson(SUMMARY);
const verification = readJson(VERIFICATION);
const manifest = readJson(MANIFEST);
const p0Verification = readJson(PATHS.p0Verification);
const p0ReferenceById = new Map(readJsonl(PATHS.p0ReferenceAnswers).map((record) => [record.question_id, record]));
const detailValidation = readJson(PATHS.detailEvidenceValidation);
const tailoredValidation = readJson(PATHS.tailoredValidation);
const tailoredOverrideById = new Map(readJsonl(PATHS.tailoredOverrides).map((record) => [record.question_id, record]));
const domainCreditValidation = readJson(PATHS.domainCreditValidation);
const domainCreditOverrideById = new Map(readJsonl(PATHS.domainCreditOverrides).map((record) => [record.question_id, record]));

const failures = [];
const check = (id, pass, detail) => {
  if (!pass) failures.push({ id, detail });
};
const bankFactInScope = (record, fact) => {
  const allowed = DOMAIN_BANK_LABELS[record.domain];
  if (!allowed || fact.cube !== 'sama_bank_credit_month') return true;
  if (fact.calculation_operand === 'DENOMINATOR' && fact.category_context?.label === 'الإجمالي') return true;
  if (Array.isArray(fact.category_context?.labels)) return fact.category_context.labels.length > 0 && fact.category_context.labels.every((label) => allowed.has(label));
  return allowed.has(fact.category_context?.label);
};

check('denominator.267', records.length === 267, records.length);
check('denominator.unique', new Set(records.map((record) => record.question_id)).size === 267, new Set(records.map((record) => record.question_id)).size);
check('denominator.exact-corpus-ids', JSON.stringify(records.map((record) => record.question_id).sort()) === JSON.stringify(corpus.map((record) => record.question_id).sort()), 'ledger/corpus ids differ');
check('language.247-ar', records.filter((record) => record.answer_language === 'ar').length === 247, records.filter((record) => record.answer_language === 'ar').length);
check('language.20-en', records.filter((record) => record.answer_language === 'en').length === 20, records.filter((record) => record.answer_language === 'en').length);
check('language.matches-question', records.every((record) => record.answer_language === record.original_language), 'answer language mismatch');
check('baseline.11-closed', records.filter((record) => record.baseline_knowledge_status === 'CLOSED').length === 11, records.filter((record) => record.baseline_knowledge_status === 'CLOSED').length);
check('baseline.38-partial', records.filter((record) => record.baseline_knowledge_status === 'PARTIAL').length === 38, records.filter((record) => record.baseline_knowledge_status === 'PARTIAL').length);
check('baseline.218-unsent', records.filter((record) => record.baseline_knowledge_status === 'UNSENT').length === 218, records.filter((record) => record.baseline_knowledge_status === 'UNSENT').length);
check('answers.nonempty', records.every((record) => typeof record.answer_text === 'string' && record.answer_text.trim().length >= 80), 'empty or short answer');
check('answers.hashes', records.every((record) => record.answer_sha256 === sha256(record.answer_text) && record.referenceAnswerHash === record.answer_sha256), 'answer hash mismatch');
check('answers.contract-closed', records.every((record) => ALLOWED_CLOSURES.has(record.closure_state)), records.filter((record) => !ALLOWED_CLOSURES.has(record.closure_state)).map((record) => ({ question_id: record.question_id, state: record.closure_state })));
check('answers.no-routing-state', records.every((record) => !/ROUT|PENDING|UNRESOLVED|INCORRECT/.test(record.closure_state)), 'routing/pending state present');
check('answers.expected-behaviors', records.every((record) => record.expected_behavior_checks.length === record.expected_behavior.length && record.expected_behavior_checks.every((item) => item.status === 'PASS')), records.flatMap((record) => record.expected_behavior_checks.filter((item) => item.status !== 'PASS').map((item) => ({ question_id: record.question_id, ...item }))));
const rankRecords = records.filter((record) => record.family === 'rank');
check('rank.no-aggregate-or-unspecified-labels', rankRecords.every((record) => (record.ranking?.ranking ?? [])
  .every((row) => !isRankingExcludedLabel(row.label))), rankRecords.flatMap((record) => (record.ranking?.ranking ?? [])
  .filter((row) => isRankingExcludedLabel(row.label)).map((row) => ({ question_id: record.question_id, label: row.label }))));
check('rank.homogeneous-contract', rankRecords.every((record) => {
  if (!record.ranking) return record.closure_state === 'CLOSED_DOCUMENTED_NOT_COMPUTABLE';
  return record.ranking.measure && record.ranking.unit && record.ranking.frequency && record.ranking.period
    && new Set(record.ranking.ranking.map((row) => row.label)).size === record.ranking.ranking.length;
}), rankRecords.filter((record) => record.ranking && (!record.ranking.measure || !record.ranking.unit || !record.ranking.frequency || !record.ranking.period || new Set(record.ranking.ranking.map((row) => row.label)).size !== record.ranking.ranking.length)).map((record) => record.question_id));
const mktRank = records.find((record) => record.question_id === 'MKT-RANK-01-AR');
check('rank.mkt-heterogeneous-no-rank', mktRank?.closure_state === 'CLOSED_DOCUMENTED_NOT_COMPUTABLE' && mktRank?.ranking === null, mktRank);
const directRecords = records.filter((record) => record.family === 'direct');
check('direct.distinct-indicators', directRecords.every((record) => {
  const keys = record.reported_facts.map((fact) => `${String(fact.indicator_caption ?? fact.indicator).trim().toLowerCase()}|${String(fact.unit).trim().toLowerCase()}`);
  return new Set(keys).size === keys.length;
}), directRecords.filter((record) => {
  const keys = record.reported_facts.map((fact) => `${String(fact.indicator_caption ?? fact.indicator).trim().toLowerCase()}|${String(fact.unit).trim().toLowerCase()}`);
  return new Set(keys).size !== keys.length;
}).map((record) => record.question_id));
const scopedDomainRecords = records.filter((record) => DOMAIN_BANK_LABELS[record.domain]);
check('domain.bank-facts-in-scope', scopedDomainRecords.every((record) => record.reported_facts.every((fact) => bankFactInScope(record, fact))), scopedDomainRecords.flatMap((record) => record.reported_facts
  .filter((fact) => !bankFactInScope(record, fact))
  .map((fact) => ({ question_id: record.question_id, category: fact.category_context?.label, indicator: fact.indicator_caption }))));
check('domain.bank-ranks-in-scope', scopedDomainRecords.filter((record) => record.family === 'rank' && record.ranking?.cube === 'sama_bank_credit_month')
  .every((record) => record.ranking.ranking.every((row) => DOMAIN_BANK_LABELS[record.domain].has(row.label))), scopedDomainRecords
  .filter((record) => record.family === 'rank' && record.ranking?.cube === 'sama_bank_credit_month')
  .flatMap((record) => record.ranking.ranking.filter((row) => !DOMAIN_BANK_LABELS[record.domain].has(row.label)).map((row) => ({ question_id: record.question_id, label: row.label }))));
for (const domain of ['log', 'agr']) {
  const rank = records.find((record) => record.domain === domain && record.family === 'rank');
  check(`domain.${domain}.single-category-no-rank`, rank?.ranking === null && rank?.closure_state === 'CLOSED_DOCUMENTED_NOT_COMPUTABLE', rank);
}
const nonSafety = records.filter((record) => record.family !== 'hallucination');
const duplicateAnswerGroups = [...Map.groupBy(nonSafety, (record) => record.answer_sha256).values()]
  .filter((group) => group.length > 1)
  .map((group) => group.map((record) => record.question_id));
check('answers.no-exact-non-safety-duplicates', duplicateAnswerGroups.length === 0, duplicateAnswerGroups);
const unavailableExplain = records.filter((record) => record.family === 'explain' && record.numeric_result_status === 'UNAVAILABLE_FROM_SEALED_INPUTS');
check('explain.no-calculation-boilerplate', unavailableExplain.every((record) => !record.answer_text.startsWith('لم أحسب')), unavailableExplain.map((record) => record.question_id));
check('claims.present', records.every((record) => Array.isArray(record.atomic_claims) && record.atomic_claims.length > 0), 'missing atomic claims');
check('claims.all-resolved', records.every((record) => record.atomic_claims.every((claim) => ALLOWED_CLAIMS.has(claim.verification_status))), records.flatMap((record) => record.atomic_claims.filter((claim) => !ALLOWED_CLAIMS.has(claim.verification_status)).map((claim) => ({ question_id: record.question_id, claim_id: claim.claim_id, status: claim.verification_status }))));
check('claims.unique-ids', new Set(records.flatMap((record) => record.atomic_claims.map((claim) => claim.claim_id))).size === records.flatMap((record) => record.atomic_claims).length, 'duplicate claim ids');
check('summary.denominator', summary.denominator === 267 && summary.answers_present === 267 && summary.routing_gaps === 0, summary);
check('summary.claim-resolution', summary.atomic_claims.unresolved === 0 && summary.atomic_claims.incorrect === 0 && summary.atomic_claims.total === records.flatMap((record) => record.atomic_claims).length, summary.atomic_claims);
check('verification.internal-pass', verification.status === 'PASS' && Object.values(verification.checks).every(Boolean) && verification.behavior_failures.length === 0, verification);
check('p0.authoritative-pass', p0Verification.verdict === 'PASS', p0Verification.verdict);
check('detail-evidence.pass', detailValidation.status === 'PASS', detailValidation.status);
const primaryTailoredRecords = records.filter((record) => record.tailored_override?.override_kind === 'PRIMARY_X_OPP');
const domainTailoredRecords = records.filter((record) => record.tailored_override?.override_kind === 'DOMAIN_CREDIT');
check('tailored.primary-pass-25', tailoredValidation.status === 'PASS' && primaryTailoredRecords.length === 25, { validation: tailoredValidation.status, integrated: primaryTailoredRecords.length });
check('tailored.domain-credit-pass-12', domainCreditValidation.status === 'PASS' && domainTailoredRecords.length === 12, { validation: domainCreditValidation.status, integrated: domainTailoredRecords.length });
check('tailored.final-answer-hashes-exact', [...primaryTailoredRecords, ...domainTailoredRecords].every((record) => {
  const source = record.tailored_override.override_kind === 'DOMAIN_CREDIT' ? domainCreditOverrideById.get(record.question_id) : tailoredOverrideById.get(record.question_id);
  return source?.answer_sha256 === record.answer_sha256 && record.tailored_override.answer_sha256 === record.answer_sha256;
}), [...primaryTailoredRecords, ...domainTailoredRecords].filter((record) => {
  const source = record.tailored_override.override_kind === 'DOMAIN_CREDIT' ? domainCreditOverrideById.get(record.question_id) : tailoredOverrideById.get(record.question_id);
  return source?.answer_sha256 !== record.answer_sha256;
}).map((record) => record.question_id));

const fileCache = new Map();
function response(relativePath) {
  if (!fileCache.has(relativePath)) {
    const absolutePath = path.join(ROOT, relativePath);
    check(`evidence.exists:${relativePath}`, fs.existsSync(absolutePath), relativePath);
    if (!fs.existsSync(absolutePath)) return null;
    const bytes = fs.readFileSync(absolutePath);
    let json = null;
    try { json = JSON.parse(bytes.toString('utf8')); } catch { /* recorded below */ }
    fileCache.set(relativePath, { sha256: sha256(bytes), json });
  }
  return fileCache.get(relativePath);
}

for (const record of records) {
  for (const provenance of record.provenance) {
    for (const ref of [provenance.base_response, ...(provenance.prior_responses ?? [])].filter(Boolean)) {
      const loaded = response(ref.path);
      check(`provenance.hash:${record.question_id}:${ref.path}`, loaded?.sha256 === ref.sha256, { expected: ref.sha256, actual: loaded?.sha256 });
      if (provenance.content_contract === 'DATA_RESPONSE' || !provenance.content_contract) {
        check(`provenance.json:${record.question_id}:${ref.path}`, Array.isArray(loaded?.json?.data), 'data response missing data array');
      }
    }
  }
  for (const fact of record.reported_facts) {
    if (fact.response_path) {
      const loaded = response(fact.response_path);
      check(`fact.hash:${record.question_id}:${fact.response_path}`, loaded?.sha256 === fact.response_sha256, { expected: fact.response_sha256, actual: loaded?.sha256 });
      const rows = loaded?.json?.data ?? [];
      const rowByHash = new Map(rows.map((row) => [sha256(JSON.stringify(row)), row]));
      if (fact.source_kind === 'SEMANTIC_CALCULATED_SUM') {
        const componentHashes = fact.component_row_sha256s ?? [];
        check(`fact.components-present:${record.question_id}:${fact.indicator_caption}`, componentHashes.length === fact.component_count && componentHashes.length > 0, fact);
        check(`fact.components-resolve:${record.question_id}:${fact.indicator_caption}`, componentHashes.every((hash) => rowByHash.has(hash)), componentHashes.filter((hash) => !rowByHash.has(hash)));
        const reproduced = componentHashes.reduce((sum, hash) => sum + Number(rowByHash.get(hash)?.[fact.indicator] ?? 0), 0);
        const tolerance = Math.max(1e-9, Math.abs(fact.value_raw) * 1e-12);
        check(`fact.components-sum:${record.question_id}:${fact.indicator_caption}`, Math.abs(reproduced - fact.value_raw) <= tolerance, { expected: fact.value_raw, reproduced, tolerance });
      } else {
        check(`fact.row:${record.question_id}:${fact.source_row_sha256}`, rowByHash.has(fact.source_row_sha256), fact);
      }
      continue;
    }
    const tailoredRefs = fact.evidence_refs ?? [];
    check(`fact.tailored-refs:${record.question_id}:${fact.fact_id ?? 'unknown'}`, fact.source_kind === 'TAILORED_CONTRACT_FACT' && tailoredRefs.length > 0, fact);
    for (const ref of tailoredRefs) {
      const loaded = response(ref.path);
      check(`fact.tailored-hash:${record.question_id}:${fact.fact_id ?? 'unknown'}:${ref.path}`, loaded?.sha256 === ref.sha256, { expected: ref.sha256, actual: loaded?.sha256 });
    }
  }
  if (record.ranking?.ranking?.length) {
    const loaded = response(record.ranking.response_path);
    check(`rank.hash:${record.question_id}`, loaded?.sha256 === record.ranking.response_sha256, { expected: record.ranking.response_sha256, actual: loaded?.sha256 });
    const sourceRows = loaded?.json?.data ?? [];
    const rowByHash = new Map(sourceRows.map((row) => [sha256(JSON.stringify(row)), row]));
    check(`rank.rows:${record.question_id}`, record.ranking.ranking.every((row) => {
      if (row.source_kind === 'SEMANTIC_CALCULATED_SUM') {
        const components = row.component_row_sha256s ?? [];
        const reproduced = components.reduce((sum, hash) => sum + Number(rowByHash.get(hash)?.[record.ranking.measure] ?? 0), 0);
        const tolerance = Math.max(1e-9, Math.abs(row.value_raw) * 1e-12);
        return components.length > 0 && components.every((hash) => rowByHash.has(hash)) && Math.abs(reproduced - row.value_raw) <= tolerance;
      }
      return rowByHash.has(row.source_row_sha256);
    }), record.ranking.ranking.filter((row) => row.source_kind === 'SEMANTIC_CALCULATED_SUM'
      ? !(row.component_row_sha256s ?? []).every((hash) => rowByHash.has(hash))
      : !rowByHash.has(row.source_row_sha256)).slice(0, 5));
  }
  if (record.authoritative_reference) {
    const sourceReference = p0ReferenceById.get(record.question_id);
    check(`p0.source-answer-hash:${record.question_id}`, record.authoritative_reference.answer_sha256 === sourceReference?.answer_sha256, record.authoritative_reference);
    check(`p0.rendered-answer-hash:${record.question_id}`, record.authoritative_reference.rendered_answer_sha256 === record.answer_sha256, record.authoritative_reference);
  }
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : [absolute];
  });
}

const manifestAbsolute = path.join(ROOT, MANIFEST);
const actualFiles = walkFiles(path.join(ROOT, OUTPUT))
  .filter((absolute) => absolute !== manifestAbsolute)
  .map((absolute) => path.relative(ROOT, absolute))
  .sort();
const manifestPaths = manifest.files.map((file) => file.path).sort();
check('manifest.exact-file-set', JSON.stringify(actualFiles) === JSON.stringify(manifestPaths), {
  missing_from_manifest: actualFiles.filter((file) => !manifestPaths.includes(file)),
  missing_from_disk: manifestPaths.filter((file) => !actualFiles.includes(file)),
});
for (const file of manifest.files) {
  const absolute = path.join(ROOT, file.path);
  check(`manifest.exists:${file.path}`, fs.existsSync(absolute), file.path);
  if (!fs.existsSync(absolute)) continue;
  const stat = fs.statSync(absolute);
  check(`manifest.size:${file.path}`, stat.size === file.size_bytes, { expected: file.size_bytes, actual: stat.size });
  check(`manifest.hash:${file.path}`, fileSha256(file.path) === file.sha256, { expected: file.sha256, actual: fileSha256(file.path) });
}
const tree = sha256(manifest.files.map((file) => `${file.path}\0${file.sha256}\0${file.size_bytes}`).join('\n'));
check('manifest.tree', tree === manifest.tree_sha256, { expected: manifest.tree_sha256, actual: tree });

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', checks_failed: failures.length, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS',
  questions: records.length,
  languages: { ar: 247, en: 20 },
  closure_states: Object.fromEntries([...ALLOWED_CLOSURES].map((state) => [state, records.filter((record) => record.closure_state === state).length])),
  atomic_claims: records.flatMap((record) => record.atomic_claims).length,
  unresolved_claims: 0,
  incorrect_claims: 0,
  routing_gaps: 0,
  manifest_files: manifest.files.length,
  tree_sha256: manifest.tree_sha256,
}, null, 2));
