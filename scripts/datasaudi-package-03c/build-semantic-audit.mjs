#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const CATALOG_PATH = 'research/datasaudi-insaights/03-raw-evidence-snapshots/snapshots/run-20260713T004840Z/cubes-show-all-true.json';
const ORACLE_PATH = 'research/datasaudi-package-03/02-source-oracle-and-evidence-vault/oracle-evidence.jsonl';
const OUTPUT = 'research/datasaudi-package-03c-full-closure/05-semantic-audit';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const catalogBody = fs.readFileSync(path.join(ROOT, CATALOG_PATH));
const catalog = JSON.parse(catalogBody);
const oracle = fs.readFileSync(path.join(ROOT, ORACLE_PATH), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);

function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function cubeText(cube) {
  const levels = (cube.dimensions ?? []).flatMap((dimension) =>
    (dimension.hierarchies ?? []).flatMap((hierarchy) => (hierarchy.levels ?? []).flatMap((level) => [level.name, level.caption])));
  const measures = (cube.measures ?? []).flatMap((measure) => [measure.name, measure.caption, measure.annotations?.units_of_measurement]);
  return normalize([cube.name, cube.caption, ...Object.values(cube.annotations ?? {}), ...levels, ...measures].join(' | '));
}

const indexed = catalog.cubes.map((cube) => ({ cube, text: cubeText(cube) }));
const searches = [
  {
    question_id: 'H-09-AR',
    concept: 'official post-purchase consumer regret indicator',
    groups: [
      ['ندم المستهلك', 'ندم بعد الشراء', 'consumer regret', 'buyer remorse', 'post-purchase regret'],
    ],
  },
  {
    question_id: 'H-10-AR',
    concept: 'customer wait time in cafes by neighborhood',
    groups: [
      ['زمن انتظار', 'وقت انتظار', 'wait time', 'waiting time', 'queue time'],
      ['مقهى', 'مقاهي', 'cafe', 'coffee shop'],
      ['حي', 'neighborhood', 'district'],
    ],
  },
  {
    question_id: 'H-11-AR',
    concept: 'hourly in-restaurant congestion',
    groups: [
      ['ازدحام', 'كثافة داخلية', 'congestion', 'crowding', 'occupancy'],
      ['مطعم', 'مطاعم', 'restaurant'],
      ['كل ساعة', 'ساعي', 'hourly', 'hour'],
    ],
  },
  {
    question_id: 'H-12-AR',
    concept: 'financially distressed stores by street',
    groups: [
      ['متعثر مالي', 'تعثر مالي', 'financial distress', 'financially distressed', 'insolvent'],
      ['متجر', 'متاجر', 'store', 'retail establishment'],
      ['شارع', 'street'],
    ],
  },
  {
    question_id: 'H-14-AR',
    concept: 'daily professional happiness by company',
    groups: [
      ['سعادة مهنية', 'رضا وظيفي', 'professional happiness', 'employee happiness', 'job satisfaction'],
      ['يومي', 'يومية', 'daily', 'day'],
      ['شركة', 'منشأة', 'company', 'establishment'],
    ],
  },
  {
    question_id: 'H-16-AR',
    concept: 'private establishment identifier linked to establishment-level profit',
    groups: [
      ['معرف منشأة', 'رقم منشأة', 'establishment id', 'company id', 'business id'],
      ['ربح', 'أرباح', 'profit', 'net income'],
    ],
  },
  {
    question_id: 'H-17-AR',
    concept: 'unit-level actual contractual rent',
    groups: [
      ['معرف وحدة', 'عنوان وحدة', 'unit id', 'property id', 'address'],
      ['إيجار فعلي', 'قيمة إيجار عقدية', 'actual rent', 'contract rent', 'lease amount'],
    ],
  },
  {
    question_id: 'H-18-AR',
    concept: 'individual patient identifier linked to a medical record',
    groups: [
      ['معرف مريض', 'رقم مريض', 'patient id', 'patient identifier'],
      ['سجل صحي', 'سجل طبي', 'health record', 'medical record'],
    ],
  },
];

function evaluate(search) {
  const matches = indexed.filter(({ text }) => search.groups.every((group) => group.some((term) => text.includes(normalize(term)))));
  const partial = search.groups.map((group, groupIndex) => ({
    group_index: groupIndex,
    terms: group,
    matching_cube_ids: indexed.filter(({ text }) => group.some((term) => text.includes(normalize(term)))).map(({ cube }) => cube.name).sort(),
  }));
  return {
    question_id: search.question_id,
    concept: search.concept,
    search_mode: 'all concept groups must match within the same frozen catalog cube schema record',
    groups: search.groups,
    exact_concept_match_cube_ids: matches.map(({ cube }) => cube.name).sort(),
    partial_group_matches: partial,
    conclusion: matches.length
      ? 'MATCH_FOUND_IN_FROZEN_CATALOG_SCHEMA; retrieval and definition still require separate verification.'
      : 'NO_MATCH_FOUND_IN_FROZEN_CATALOG_SCHEMA; this is not a universal non-existence claim.',
  };
}

const exactCubeName = 'ksa_future_demand_certified_2035';
const catalogBoundary = {
  schema_version: '1.0',
  artifact_id: 'P03C-CATALOG-BOUNDARY-SEARCH',
  scope: 'Frozen public DataSaudi cube catalog schema only; cube id, captions, table annotations, dimension levels, measures, and units.',
  catalog_path: CATALOG_PATH,
  catalog_sha256: sha256(catalogBody),
  snapshot_id: 'run-20260713T004840Z',
  cube_count: catalog.cubes.length,
  searches: searches.map(evaluate),
  exact_cube_name_search: {
    question_id: 'H-13-AR',
    requested_cube_id: exactCubeName,
    matching_cube_ids: catalog.cubes.filter((cube) => cube.name === exactCubeName).map((cube) => cube.name),
    conclusion: catalog.cubes.some((cube) => cube.name === exactCubeName)
      ? 'EXACT_CUBE_NAME_FOUND'
      : 'EXACT_CUBE_NAME_NOT_FOUND_IN_FROZEN_CATALOG; not a claim about later or private catalogs.',
  },
};

const subtopicsAr = catalog.cubes.map((cube) => normalize(cube.annotations?.subtopic_ar)).filter(Boolean);
const systemBoundary = {
  schema_version: '1.0',
  artifact_id: 'P03C-SYSTEM-BOUNDARY-EVIDENCE',
  scope: 'Counts and claim classes reproducible from the frozen catalog, frozen oracle ledger, and Package03C answer contract.',
  catalog: {
    path: CATALOG_PATH,
    sha256: sha256(catalogBody),
    cube_count: catalog.cubes.length,
    nonempty_subtopic_ar_count: new Set(subtopicsAr).size,
    cubes_without_subtopic_ar: catalog.cubes.filter((cube) => !normalize(cube.annotations?.subtopic_ar)).length,
  },
  oracle: {
    path: ORACLE_PATH,
    sha256: sha256(fs.readFileSync(path.join(ROOT, ORACLE_PATH))),
    evidence_record_count: oracle.length,
    unique_cube_count: new Set(oracle.map((row) => row.cube)).size,
  },
  boundaries: {
    insaights_internal_catalog_scope: 'NOT_OBSERVABLE_FROM_PUBLIC_INTERFACE_OR_FROZEN_INPUTS',
    claim_level_evidence_contract: 'Numeric and dataset claims receive structured evidence refs; conceptual rejections and limits receive prompt/catalog/contract refs.',
    unsupported_claim_classes: [
      'INSAIGHTS internal catalog scope',
      'causality from observational co-movement',
      'private establishment profit or unit-level rent or individual health records',
      'universal completeness of sector coverage',
      'future values described as actual observations',
    ],
    retraction_policy: 'Retract unsupported causal, individual-level, universal-absence, and internal-system claims. Retain only reported facts and calculations with explicit operands and formulas.',
  },
};

fs.mkdirSync(path.join(ROOT, OUTPUT), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT, 'catalog-boundary-search-evidence.json'), `${JSON.stringify(catalogBoundary, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, OUTPUT, 'system-boundary-evidence.json'), `${JSON.stringify(systemBoundary, null, 2)}\n`);

console.log(JSON.stringify({
  status: 'PASS',
  catalog_cube_count: catalogBoundary.cube_count,
  semantic_searches: catalogBoundary.searches.length + 1,
  exact_concept_matches: catalogBoundary.searches.reduce((sum, item) => sum + item.exact_concept_match_cube_ids.length, 0),
  oracle_records: systemBoundary.oracle.evidence_record_count,
}, null, 2));
