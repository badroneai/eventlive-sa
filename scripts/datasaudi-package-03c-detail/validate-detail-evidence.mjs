import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CATALOG_PATH,
  CORPUS_PATH,
  MANIFEST_PATH,
  ORACLE_PATH,
  OUTPUT_DIR,
  ROOT,
  TARGET_FAMILIES,
  VALIDATION_PATH,
  deriveScope,
  parseRequestContract,
  readJsonl,
  relativeToRoot,
  selectBestDetailLevel,
  selectFinestTimeLevel,
  selectMeasures,
  sha256,
} from "./common.mjs";

const [catalogBytes, corpusBytes, oracleBytes, manifestBytes] = await Promise.all([
  readFile(CATALOG_PATH),
  readFile(CORPUS_PATH),
  readFile(ORACLE_PATH),
  readFile(MANIFEST_PATH),
]);
const catalog = JSON.parse(catalogBytes.toString("utf8"));
const corpus = await readJsonl(CORPUS_PATH);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const cubeByName = new Map(catalog.cubes.map((cube) => [cube.name, cube]));
const scope = deriveScope(corpus);
const checks = [];

function check(name, callback) {
  callback();
  checks.push(name);
}

check("frozen source boundary", () => {
  assert.equal(catalog.cubes.length, 277);
  assert.equal(corpus.length, 267);
  assert.equal(manifest.source_files.catalog.sha256, sha256(catalogBytes));
  assert.equal(manifest.source_files.corpus.sha256, sha256(corpusBytes));
  assert.equal(manifest.source_files.oracle.sha256, sha256(oracleBytes));
  assert.equal(manifest.source_files.catalog.cubes, 277);
  assert.equal(manifest.source_files.corpus.questions, 267);
  assert.equal(manifest.source_files.oracle.rows, 65);
});

check("scope coverage", () => {
  assert.deepEqual(manifest.scope.families, TARGET_FAMILIES);
  assert.equal(scope.questions.length, 72);
  assert.equal(scope.candidateBackedQuestions.length, 60);
  assert.equal(scope.contractOnlyQuestions.length, 12);
  assert.equal(scope.cubes.length, 34);
  assert.equal(manifest.scope.questions, 72);
  assert.equal(manifest.scope.candidate_backed_questions, 60);
  assert.equal(manifest.scope.contract_only_questions, 12);
  assert.equal(manifest.scope.covered_questions, 60);
  assert.deepEqual(
    manifest.scope.contract_only_question_ids,
    scope.contractOnlyQuestions.map((question) => question.question_id).sort(),
  );
  assert.equal(manifest.scope.candidate_cubes, 34);
  assert.deepEqual(manifest.scope.cube_names, scope.cubes);
  assert.equal(manifest.entries.length, 34);
  assert.equal(manifest.complete, true);
});

let responseBytesTotal = 0;
let rowTotal = 0;
let pageTotal = 0;
for (const entry of manifest.entries) {
  const cube = cubeByName.get(entry.cube);
  assert.ok(cube, `${entry.cube}: absent from catalog`);
  const expectedTime = selectFinestTimeLevel(cube);
  const expectedDetail = selectBestDetailLevel(cube);
  const expectedMeasures = selectMeasures(cube);
  const expectedDrilldowns = [expectedTime.name, expectedDetail?.name].filter(Boolean);
  const expectedQuestionIds = scope.questionsByCube.get(entry.cube);
  assert.deepEqual(entry.finest_time_level, expectedTime, `${entry.cube}: finest time mismatch`);
  assert.deepEqual(entry.selected_detail_level, expectedDetail, `${entry.cube}: detail level mismatch`);
  assert.deepEqual(entry.selected_measures, expectedMeasures, `${entry.cube}: measures mismatch`);
  assert.deepEqual(entry.requested_drilldowns, expectedDrilldowns, `${entry.cube}: drilldowns mismatch`);
  assert.deepEqual(
    entry.requested_measures,
    expectedMeasures.map((measure) => measure.name),
    `${entry.cube}: requested measures mismatch`,
  );
  assert.deepEqual(entry.covered_question_ids, expectedQuestionIds, `${entry.cube}: question coverage mismatch`);
  assert.ok(entry.pages.length >= 1, `${entry.cube}: pages missing`);
  assert.equal(entry.complete, true, `${entry.cube}: incomplete flag`);
  assert.equal(entry.rows, entry.total, `${entry.cube}: row total mismatch`);
  assert.ok(entry.rows > 0, `${entry.cube}: empty evidence`);
  const responsePath = path.join(ROOT, entry.response_path);
  assert.ok(
    responsePath.startsWith(`${OUTPUT_DIR}${path.sep}`),
    `${entry.cube}: response escaped output directory`,
  );
  const responseBytes = await readFile(responsePath);
  const response = JSON.parse(responseBytes.toString("utf8"));
  assert.equal(sha256(responseBytes), entry.response_sha256, `${entry.cube}: response hash mismatch`);
  assert.equal(responseBytes.length, entry.response_size_bytes, `${entry.cube}: response size mismatch`);
  assert.equal(response.data.length, entry.rows, `${entry.cube}: response rows mismatch`);
  assert.equal(Number(response.page.total), entry.total, `${entry.cube}: response total mismatch`);
  for (const measure of expectedMeasures) {
    assert.ok(entry.columns.includes(measure.name), `${entry.cube}: column missing ${measure.name}`);
  }
  let coveredRows = 0;
  let expectedOffset = 0;
  for (const page of entry.pages) {
    const contract = parseRequestContract(page.request_url);
    assert.equal(contract.cube, entry.cube, `${entry.cube}: page cube mismatch`);
    assert.equal(page.offset, expectedOffset, `${entry.cube}: page offset gap`);
    assert.equal(page.total, entry.total, `${entry.cube}: page total mismatch`);
    assert.ok(
      expectedDrilldowns.every((name) => contract.drilldowns.includes(name)),
      `${entry.cube}: page drilldown coverage mismatch`,
    );
    assert.ok(
      expectedMeasures.every((measure) => contract.measures.includes(measure.name)),
      `${entry.cube}: page measure coverage mismatch`,
    );
    const pagePath = path.join(ROOT, page.response_path);
    const pageBytes = await readFile(pagePath);
    assert.equal(sha256(pageBytes), page.response_sha256, `${entry.cube}: page hash mismatch`);
    assert.equal(pageBytes.length, page.response_size_bytes, `${entry.cube}: page size mismatch`);
    const pageResponse = JSON.parse(pageBytes.toString("utf8"));
    assert.equal(pageResponse.data.length, page.rows, `${entry.cube}: page rows mismatch`);
    assert.equal(Number(pageResponse.page.total), entry.total, `${entry.cube}: page payload total mismatch`);
    coveredRows += page.rows;
    expectedOffset += page.rows;
  }
  assert.equal(coveredRows, entry.total, `${entry.cube}: incomplete page coverage`);
  responseBytesTotal += responseBytes.length;
  rowTotal += entry.rows;
  pageTotal += entry.pages.length;
}
checks.push("34 response hashes, schemas, and page ranges");

check("manifest integrity", () => {
  assert.equal(manifest.counts.entries, 34);
  assert.equal(manifest.counts.complete, 34);
  assert.equal(manifest.counts.total_rows, rowTotal);
  assert.equal(manifest.counts.pages, pageTotal);
  assert.equal(manifest.integrity.entries_sha256, sha256(JSON.stringify(manifest.entries)));
  assert.equal(
    manifest.integrity.response_set_sha256,
    sha256(manifest.entries.map((entry) => `${entry.cube}\t${entry.response_sha256}`).join("\n")),
  );
});

const coveredQuestions = new Set(manifest.entries.flatMap((entry) => entry.covered_question_ids));
check("all candidate-backed direct, rank, and series questions mapped", () => {
  assert.equal(coveredQuestions.size, 60);
  for (const question of scope.candidateBackedQuestions) {
    assert.ok(coveredQuestions.has(question.question_id), `question not covered: ${question.question_id}`);
  }
  for (const question of scope.contractOnlyQuestions) {
    assert.ok(!coveredQuestions.has(question.question_id), `contract-only question unexpectedly mapped: ${question.question_id}`);
  }
});

const validation = {
  schema_version: "1.0",
  status: "PASS",
  validated_at_utc: new Date().toISOString(),
  manifest_path: relativeToRoot(MANIFEST_PATH),
  manifest_sha256: sha256(manifestBytes),
  checks,
  counts: {
    catalog_cubes: catalog.cubes.length,
    scoped_questions: scope.questions.length,
    candidate_backed_questions: scope.candidateBackedQuestions.length,
    contract_only_questions: scope.contractOnlyQuestions.length,
    covered_questions: coveredQuestions.size,
    candidate_cubes: scope.cubes.length,
    complete_entries: manifest.entries.filter((entry) => entry.complete).length,
    pages: pageTotal,
    rows: rowTotal,
    response_bytes: responseBytesTotal,
  },
};
await writeFile(VALIDATION_PATH, `${JSON.stringify(validation, null, 2)}\n`);
console.log(JSON.stringify(validation));
