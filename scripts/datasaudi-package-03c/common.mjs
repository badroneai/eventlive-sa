import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = process.cwd();
export const OUTPUT_DIR = path.join(ROOT, 'research/datasaudi-package-03c-full-closure');

export const PATHS = Object.freeze({
  corpus: 'research/datasaudi-insaights/04-question-corpus/questions.jsonl',
  catalog: 'research/datasaudi-insaights/03-raw-evidence-snapshots/snapshots/run-20260713T004840Z/cubes-show-all-true.json',
  goldSpecs: 'research/datasaudi-package-03/02-source-oracle-and-evidence-vault/gold-case-specs.jsonl',
  oracleEvidence: 'research/datasaudi-package-03/02-source-oracle-and-evidence-vault/oracle-evidence.jsonl',
  oracleManifest: 'research/datasaudi-package-03/02-source-oracle-and-evidence-vault/oracle-manifest.json',
  laterSpecs: 'research/datasaudi-package-03b-closure-router/later-wave-oracle-specs.jsonl',
  closureRouter: 'research/datasaudi-package-03b-closure-router/closure-router.json',
  transcripts: 'research/datasaudi-decision-intelligence/02-transcript-and-source-vault/transcripts.jsonl',
  liveAttempts: 'research/datasaudi-package-03a-question-closure/03-adjudication/attempt-ledger.jsonl',
  productDecisionJobs: 'research/datasaudi-package-03/01-portfolio-prefilter-and-decision-jobs/product-decision-jobs.json',
  rightsMatrix: 'research/datasaudi-package-03/09-rights-publication-clearance/rights-source-output-mode-matrix.json',
  catalogExpansionEvidence: 'research/datasaudi-package-03c-full-closure/02-catalog-discovery/catalog-expansion-evidence.json',
  p0ReferenceAnswers: 'research/datasaudi-package-03c-full-closure/p0-plan/reference-answers.jsonl',
  p0Verification: 'research/datasaudi-package-03c-full-closure/p0-plan/verification.json',
  detailEvidenceManifest: 'research/datasaudi-package-03c-full-closure/02-catalog-discovery/detail-evidence/detail-evidence-manifest.json',
  detailEvidenceValidation: 'research/datasaudi-package-03c-full-closure/02-catalog-discovery/detail-evidence/validation.json',
  closureBaseline: 'research/datasaudi-package-03c-full-closure/00-governance/closure-baseline.json',
  tailoredOverrides: 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers/tailored-answer-overrides.jsonl',
  tailoredValidation: 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers/validation.json',
  tailoredManifest: 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers/manifest.json',
  tailoredEvidenceRouteLock: 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers/evidence-route-lock.json',
  domainCreditOverrides: 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers/domain-credit-overrides.jsonl',
  domainCreditValidation: 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers/domain-credit-validation.json',
  domainCreditManifest: 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers/domain-credit-manifest.json',
  semanticEvidenceManifest: 'research/datasaudi-package-03c-full-closure/05-semantic-audit/semantic-evidence-manifest.json',
  catalogBoundarySearchEvidence: 'research/datasaudi-package-03c-full-closure/05-semantic-audit/catalog-boundary-search-evidence.json',
  systemBoundaryEvidence: 'research/datasaudi-package-03c-full-closure/05-semantic-audit/system-boundary-evidence.json',
});

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const fileSha256 = (relativePath) => sha256(fs.readFileSync(path.join(ROOT, relativePath)));
export const stableId = (prefix, value) => `${prefix}-${sha256(JSON.stringify(value)).slice(0, 24)}`;

export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

export function readJsonl(relativePath) {
  const text = fs.readFileSync(path.join(ROOT, relativePath), 'utf8').trim();
  return text ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : [];
}

export function writeJson(relativePath, value) {
  const target = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeJsonl(relativePath, values) {
  const target = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, values.map((value) => JSON.stringify(value)).join('\n') + '\n');
}

export function writeText(relativePath, value) {
  const target = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value.endsWith('\n') ? value : `${value}\n`);
}

export function fileRef(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const stat = fs.statSync(absolutePath);
  return {
    path: relativePath,
    sha256: sha256(fs.readFileSync(absolutePath)),
    size_bytes: stat.size,
  };
}

export function countBy(values, keyFn) {
  const result = {};
  for (const value of values) {
    const key = keyFn(value);
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export function periodKey(row, periodField, index = 0) {
  const id = row?.[`${periodField} ID`];
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  if (typeof id === 'string' && /^-?\d+(?:\.\d+)?$/.test(id)) return Number(id);
  const period = String(row?.[periodField] ?? '');
  const digits = period.match(/\d+/g)?.join('') ?? '';
  return digits ? Number(digits) : index;
}

export function sortedSeries(rows, periodField, measureField) {
  return rows
    .map((row, index) => ({ row, index, key: periodKey(row, periodField, index) }))
    .filter(({ row }) => row?.[periodField] !== undefined && typeof row?.[measureField] === 'number' && Number.isFinite(row[measureField]))
    .sort((a, b) => a.key - b.key || a.index - b.index);
}

export function round(value, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function isTotalLabel(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return [
    'all', 'total', 'grand total', 'overall', 'all activities', 'all sectors', 'saudi arabia', 'المملكة العربية السعودية',
    'gross domestic product',
    'الجميع', 'الكل', 'الإجمالي', 'الاجمالي', 'إجمالي', 'المجموع', 'المجموع الكلي', 'الرقم القياسي العام', 'جميع الأنشطة', 'جميع القطاعات',
  ].includes(normalized);
}

export function isUnspecifiedLabel(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return [
    'unspecified', 'not specified', 'not defined', 'unknown', 'not stated', 'n/a', 'na',
    'غير محدد', 'غير مصنف', 'غير مبين', 'غير معروف', 'غير متاح',
  ].includes(normalized);
}

export function normalizeUnit(measure = {}, cube = '') {
  const name = String(measure.name ?? '');
  const caption = String(measure.caption ?? '');
  const raw = String(measure.unit ?? '');
  const text = `${name} ${caption} ${raw}`.normalize('NFKC').toLowerCase();
  const cubeId = String(cube).toLowerCase();

  if (cubeId === 'gastat_digital_economy_establishment_usage_by_economic_activity' && name === 'Percentage') {
    return 'كسر عشري (0–1؛ يعادل النسبة بعد ×100)';
  }
  if (cubeId === 'tourism_occupancy_rate_monthly' || cubeId === 'tourism_satisfaction_index') {
    return 'معدل عشري (0–1؛ حسب تعريف المصدر)';
  }
  if (['tadawul_indicators', 'tadawul_indicators_quarterly', 'tadawul_indicators_yearly'].includes(cubeId) && name === 'Value') {
    return 'متعددة حسب Indicator (نقطة/مضاعف/ريال)';
  }

  if (/million\s*(?:sar|⃁)|(?:sar|⃁).*million|million riyal/.test(text)) return 'مليون ريال';
  if (/^(?:exports?|imports?|trade volume|trade balance)\b/.test(name.trim().toLowerCase())) return 'مليون ريال';
  if (/thousand\s*(?:sar|⃁)|(?:sar|⃁).*thousand|thousand riyal/.test(text)) return 'ألف ريال';
  if (/sar billions?|billion\s*(?:sar|⃁)|(?:sar|⃁).*billion/.test(text)) return 'مليار ريال';
  if (/eps\s*\(sar\)|expenditure\s*\(⃁\)|funding\s*\(⃁\)/.test(text)) return 'ريال';
  if (/thousand cubic meters?|thousand\s*m[³3]|ألف متر مكعب/.test(text)) return 'ألف متر مكعب';
  if (/megawatts?|\bmw\b/.test(text)) return 'ميغاواط (كما سماها المصدر)';
  if (/number of transactions.*thousand|transactions.*\(thousand\)/.test(text)) return 'ألف عملية';
  if (/index points?|consumer price index/.test(text) || (name.toLowerCase() === 'inflation' && /\bunit\b/.test(raw.toLowerCase()))) return 'نقطة مؤشر';
  if (/p\/e ratio/.test(text)) return 'مضاعف (مرة)';
  if (/percentage|percent|inflation rate/.test(text)) return 'نسبة مئوية (أساس 100)';
  if (/occupancy rate/.test(text)) return 'معدل عشري (0–1؛ حسب تعريف المصدر)';
  if (raw.trim().toLowerCase() === 'rate') return 'معدل (حسب تعريف المصدر)';
  if (/population|students?|resources?|number of|\bopd\b|\bphc\b|employees?|researchers?|terminals?|transactions?|encounters?|outpatients?|physicians?|beds?|hospitals?|pharmacists?|personnel|performers?/.test(text)) return 'عدد';
  if (raw.trim().toLowerCase() === 'unit int') return 'عدد';
  if (raw.trim() && !['unit', 'unit int', 'rate'].includes(raw.trim().toLowerCase())) return raw.trim();
  return 'الوحدة غير موثقة بدقة';
}

export function isRankingExcludedLabel(value) {
  return isTotalLabel(value) || isUnspecifiedLabel(value);
}

export function frequencyAr(scale) {
  return ({ day: 'يومي', week: 'أسبوعي', month: 'شهري', quarter: 'ربع سنوي', year: 'سنوي' })[scale] ?? `غير محدد (${scale ?? 'بلا قيمة'})`;
}

export function sourceObservationMap() {
  const map = new Map();
  for (const transcript of readJsonl(PATHS.transcripts)) {
    const status = ({
      answered: 'ANSWER_TEXT_OBSERVED',
      unavailable: 'UNAVAILABLE_ANSWER_OBSERVED',
      'platform-blocked': 'PLATFORM_BLOCKED',
    })[transcript.status] ?? 'UNKNOWN_OBSERVED_STATE';
    map.set(transcript.question_id, {
      status,
      channel: 'INSAIGHTS',
      source: PATHS.transcripts,
      observed_at_utc: transcript.completed_at_utc ?? transcript.sent_at_utc ?? null,
      answer_id: transcript.answer_id ?? null,
    });
  }
  for (const attempt of readJsonl(PATHS.liveAttempts)) {
    const status = attempt.status === 'answered' ? 'ANSWER_TEXT_OBSERVED'
      : attempt.status === 'quota-blocked' ? 'QUOTA_BLOCKED'
        : 'UNKNOWN_OBSERVED_STATE';
    map.set(attempt.question_id, {
      status,
      channel: 'INSAIGHTS',
      source: PATHS.liveAttempts,
      observed_at_utc: attempt.captured_at_utc ?? null,
      answer_id: attempt.attempt_id ?? null,
    });
  }
  return map;
}

export function normalizeSpec(spec) {
  return {
    schema_version: spec.schema_version,
    spec_id: spec.spec_id ?? spec.case_id,
    question_id: spec.question_id,
    canonical_id: spec.canonical_id,
    domain: spec.domain,
    domain_label_ar: spec.domain_label_ar ?? null,
    family: spec.family,
    language: spec.language,
    priority: spec.priority ?? 'P0',
    prompt: spec.prompt,
    expected_behavior: spec.expected_behavior ?? [],
    candidate_cubes: spec.candidate_cubes ?? spec.source_cubes ?? [],
    oracle_readiness: spec.oracle_readiness,
    oracle_evidence_ids: spec.oracle_evidence_ids ?? (spec.oracle_evidence_refs ?? []).map((ref) => ref.evidence_id),
    assertion_contract: spec.assertion_contract,
  };
}
