import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildExecutionClosure } from "../../scripts/datasaudi-package-05/build-execution-closure.mjs";
import { buildPackageManifest } from "../../scripts/datasaudi-package-05/build-manifest.mjs";
import { executionRecordErrors, validatePackage } from "../../scripts/datasaudi-package-05/validate-package.mjs";

const ROOT = process.cwd();
const PACKAGE_ROOT = path.join(ROOT, "research/datasaudi-package-05-execution-closure");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, relative), "utf8"));
const readJsonl = relative => fs.readFileSync(path.join(PACKAGE_ROOT, relative), "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);

test("P05 freezes the previously under-specified denominator as a governed 24×8×2×6 universe", () => {
  const summary = readJson("SUMMARY.json");
  assert.equal(summary.denominator_reconstruction.historical_formula_explicitly_persisted, false);
  assert.equal(summary.denominator_reconstruction.governance_status, "ASSUMPTION_FROZEN_OWNER_AUTHORIZED");
  assert.deepEqual(summary.denominator_reconstruction.factors, {
    domains: 24,
    families: 8,
    languages: 2,
    paraphrase_variants: 6
  });
  assert.equal(Object.values(summary.denominator_reconstruction.factors).reduce((product, value) => product * value, 1), 2304);
});

test("the normalized answer universe has 192 semantic cores, 384 localized answers and 2,304 complete executions", () => {
  const summary = readJson("SUMMARY.json");
  const canonical = readJsonl("02-execution-universe/canonical-answers.jsonl");
  const executions = readJsonl("02-execution-universe/execution-answer-ledger.jsonl");
  assert.equal(summary.status, "REFERENCE_EXECUTION_UNIVERSE_COMPLETE_2304_OF_2304");
  assert.equal(summary.coverage.primary_semantic_questions, 192);
  assert.equal(canonical.length, 384);
  assert.equal(executions.length, 2304);
  assert.equal(new Set(canonical.map(item => item.canonical_answer_id)).size, 384);
  assert.equal(new Set(executions.map(item => item.execution_id)).size, 2304);
  assert.equal(new Set(executions.map(item => item.prompt_sha256)).size, 2304);
  assert.ok(executions.every(item => item.answer_text.length >= 120 && sha256(item.answer_text) === item.answer_sha256));
});

test("all six paraphrases share one evidence answer without claiming six live responses", () => {
  const executions = readJsonl("02-execution-universe/execution-answer-ledger.jsonl");
  const invariance = readJsonl("03-verification/paraphrase-invariance.jsonl");
  const grouped = Map.groupBy(executions, item => item.canonical_answer_id);
  assert.equal(grouped.size, 384);
  for (const rows of grouped.values()) {
    assert.equal(rows.length, 6);
    assert.equal(new Set(rows.map(item => item.prompt_sha256)).size, 6);
    assert.equal(new Set(rows.map(item => item.answer_sha256)).size, 1);
    assert.ok(rows.every(item => item.live_insaights_status === "NOT_EXECUTED_AS_P05"));
  }
  assert.equal(invariance.length, 384);
  assert.ok(invariance.every(item => item.verdict === "PASS"));
});

test("all paraphrase variants preserve the complete variant-1 task without adding a new output contract", () => {
  const executions = readJsonl("02-execution-universe/execution-answer-ledger.jsonl");
  const grouped = Map.groupBy(executions, item => item.canonical_answer_id);
  for (const rows of grouped.values()) {
    const base = rows.find(item => item.paraphrase_variant === 1);
    assert.ok(base);
    assert.ok(rows.every(item => item.prompt.includes(base.prompt)), base.canonical_answer_id);
  }
});

test("Arabic and English answers carry an explicit frozen-snapshot freshness boundary", () => {
  const canonical = readJsonl("02-execution-universe/canonical-answers.jsonl");
  assert.equal(canonical.filter(item => item.language === "ar").length, 192);
  assert.equal(canonical.filter(item => item.language === "en").length, 192);
  assert.ok(canonical.filter(item => item.language === "ar").every(item => item.answer_text.includes("حدّ الحداثة")));
  assert.ok(canonical.filter(item => item.language === "en").every(item => item.answer_text.includes("Freshness boundary")));
  assert.ok(canonical.every(item => item.source_snapshot_as_of_utc && item.evidence_paths.length > 0));
});

test("the corrected live numerator is 31 mapped cells, while 79 remains an all-scope message count", () => {
  const summary = readJson("SUMMARY.json");
  assert.equal(summary.coverage.live_insaights_main_universe_observed_cells, 31);
  assert.equal(summary.coverage.live_insaights_main_universe_percent, 1.35);
  assert.deepEqual(summary.coverage.historical_live_messages_breakdown, {
    main_universe_cells: 31,
    legacy_supplemental: 18,
    p04_capability_messages: 30
  });
  assert.equal(Object.values(summary.coverage.historical_live_messages_breakdown).reduce((sum, value) => sum + value, 0), 79);
  assert.equal(summary.coverage.historical_live_messages_all_scopes, 79);
});

test("the original 267 records reconcile as 212 main-universe mappings plus 55 supplemental closures", () => {
  const crosswalk = readJsonl("04-legacy-crosswalk/original-corpus-crosswalk.jsonl");
  assert.equal(crosswalk.length, 267);
  assert.equal(crosswalk.filter(item => item.disposition === "MAPPED_INTO_P05_MAIN_UNIVERSE").length, 212);
  assert.equal(crosswalk.filter(item => item.disposition === "SUPPLEMENTAL_P03C_CLOSED_OUTSIDE_MAIN_UNIVERSE").length, 55);
});

test("public alternatives prove useful analytical paths without consuming chat quota", () => {
  const surfaces = readJson("01-surface-alternatives/summary.json");
  assert.equal(surfaces.chat_messages_consumed, 0);
  assert.equal(surfaces.authentication_used, false);
  assert.equal(surfaces.observations.length, 19);
  assert.equal(surfaces.capabilities.server_ranking.verified_usable, true);
  assert.equal(surfaces.capabilities.server_growth.verified_usable, true);
  assert.equal(surfaces.capabilities.filters_include_alias_sort.verified_usable, true);
  assert.equal(surfaces.capabilities.multiquery_common_grain.verified_usable, true);
  for (const format of ["jsonrecords", "jsonarrays", "csv", "csvbom", "tsv", "tsvbom"]) {
    assert.equal(surfaces.capabilities.response_formats[format].usable_nonempty, true);
  }
  for (const format of ["xlsx", "parquet"]) {
    assert.equal(surfaces.capabilities.response_formats[format].status, 200);
    assert.equal(surfaces.capabilities.response_formats[format].bytes, 0);
    assert.equal(surfaces.capabilities.response_formats[format].usable_nonempty, false);
  }
});

test("all captured public-surface receipts are byte- and hash-verifiable", () => {
  const surfaces = readJson("01-surface-alternatives/summary.json");
  for (const observation of surfaces.observations) {
    const bytes = fs.readFileSync(path.join(ROOT, observation.response.evidence_path));
    assert.equal(bytes.length, observation.response.bytes, observation.id);
    assert.equal(sha256(bytes), observation.response.sha256, observation.id);
  }
});

test("the expanded official surface universe is captured without chat and proves the larger lawful discovery paths", () => {
  const surfaces = readJson("05-official-surface-universe/summary.json");
  assert.equal(surfaces.mode, "PUBLIC_OFFICIAL_SURFACE_UNIVERSE_NO_CHAT_NO_AUTH");
  assert.equal(surfaces.chat_messages_consumed, 0);
  assert.equal(surfaces.authentication_used, false);
  assert.equal(surfaces.receipts.length, 14);
  assert.deepEqual(surfaces.catalog, {
    cubes: 277,
    dimensions: 722,
    hierarchies: 753,
    levels: 992,
    unique_cube_level_pairs: 992,
    bilingual_member_base_requests: 1984
  });
  assert.equal(surfaces.datasets_registry.unique_cube_ids, 251);
  assert.equal(surfaces.datasets_registry.api_only_cube_count, 26);
  assert.equal(surfaces.sitemap_reports.urls, 503);
  assert.equal(surfaces.embedded_profile_lists.report_targets, 219);
  assert.equal(surfaces.explicit_grain_join.verdict, "VERIFIED_SAFE_AT_EXPLICIT_OUTPUT_GRAIN");
  assert.equal(surfaces.explicit_grain_join.rows, 163);
  assert.equal(surfaces.explicit_grain_join.unique_keys, 163);
  assert.equal(surfaces.economic_calendar.july_2026_total, 12);
  for (const receipt of surfaces.receipts) {
    const bytes = fs.readFileSync(path.join(ROOT, receipt.response.evidence_path));
    assert.equal(bytes.length, receipt.response.bytes, receipt.id);
    assert.equal(sha256(bytes), receipt.response.sha256, receipt.id);
  }
});

test("the sealed upstream inputs match the governed byte lengths and SHA-256 hashes", () => {
  const lock = readJson("00-governance/INPUT_LOCK.json");
  assert.equal(lock.lock_mode, "SEALED_INPUT_SHA256");
  assert.equal(lock.inputs.length, 7);
  for (const input of lock.inputs) {
    const bytes = fs.readFileSync(path.join(ROOT, input.path));
    assert.equal(bytes.length, input.size_bytes, input.path);
    assert.equal(sha256(bytes), input.sha256, input.path);
  }
});

test("mutation checks reject the failure classes found in Package04", () => {
  const canonical = readJsonl("02-execution-universe/canonical-answers.jsonl");
  const executions = readJsonl("02-execution-universe/execution-answer-ledger.jsonl");
  const original = executions.find(item => item.execution_id === "P05-GDP-DIRECT-EN-V1");
  const reference = canonical.find(item => item.canonical_answer_id === original.canonical_answer_id);

  const querySubstitution = { ...original, prompt: `${original.prompt} silently substituted` };
  assert.ok(executionRecordErrors(querySubstitution, reference).includes("PROMPT_HASH_MISMATCH"), "P04-005 query substitution");

  const fabricatedResponse = { ...original, answer_text: `${original.answer_text}\nFabricated HTTP 400.` };
  assert.ok(executionRecordErrors(fabricatedResponse, reference).includes("ANSWER_HASH_MISMATCH"), "P04-007 fabricated response");

  const cubeSwap = { ...original, semantic_id: "OIL-DIRECT-01" };
  assert.ok(executionRecordErrors(cubeSwap, reference).includes("SEMANTIC_ID_MISMATCH"), "P04-015 cube swap");

  const fabricatedKeys = { ...original, proof_source_answer_sha256: "0".repeat(64) };
  assert.ok(executionRecordErrors(fabricatedKeys, reference).includes("PROOF_HASH_MISMATCH"), "P04-019 fabricated keys/proof");

  const wrongCalculation = { ...original, answer_text: `${original.answer_text}\nResult = 24.402`, answer_sha256: sha256(`${original.answer_text}\nResult = 24.402`) };
  assert.ok(executionRecordErrors(wrongCalculation, reference).includes("CANONICAL_ANSWER_HASH_MISMATCH"), "P04-022 wrong calculation");

  const inventedMeasure = { ...original, answer_text: original.answer_text.replace("GDP", "water_consumption_m3"), answer_sha256: sha256(original.answer_text.replace("GDP", "water_consumption_m3")) };
  assert.ok(executionRecordErrors(inventedMeasure, reference).includes("CANONICAL_ANSWER_HASH_MISMATCH"), "P04-026 invented measure");

  const droppedFilter = { ...original, proof_source_question_id: "GDP-DIRECT-WITHOUT-FILTER" };
  assert.ok(executionRecordErrors(droppedFilter, reference).includes("PROOF_SOURCE_MISMATCH"), "P04-027 dropped filter provenance");

  const falseLiveClaim = { ...original, live_insaights_status: "VERIFIED_PASS" };
  assert.ok(executionRecordErrors(falseLiveClaim, reference).includes("LIVE_STATUS_OVERCLAIM"), "P04-029/030 false parity/live claim");
});

test("generated English answers render every structured calculation result and proof-specific limitation", () => {
  const canonical = readJsonl("02-execution-universe/canonical-answers.jsonl");
  const upstream = fs.readFileSync(path.join(ROOT, "research/datasaudi-package-03c-full-closure/03-answer-ledger/full-answer-ledger.jsonl"), "utf8").trim().split(/\r?\n/).map(JSON.parse);
  const upstreamByQuestion = new Map(upstream.map(item => [item.question_id, item]));
  const generated = canonical.filter(item => item.proof_source.derivation === "DETERMINISTIC_EN_RENDER_FROM_VERIFIED_STRUCTURED_PROOF");
  assert.equal(generated.length, 172);
  for (const answer of generated) {
    assert.doesNotMatch(answer.answer_text, /\b(?:undefined|NaN)\b|not stated|unknown to unknown|none stated/, answer.canonical_answer_id);
    const proof = upstreamByQuestion.get(answer.proof_source.question_id);
    assert.ok(proof, answer.proof_source.question_id);
    for (const calculation of proof.calculations || []) {
      const result = calculation.rounded_growth_percent
        ?? calculation.rounded_percentage_point_change
        ?? calculation.rounded_result_percent
        ?? calculation.output?.rounded_value
        ?? calculation.output?.value
        ?? calculation.output_value
        ?? calculation.result
        ?? calculation.value;
      assert.notEqual(result, null, calculation.calculation_id);
      assert.notEqual(result, undefined, calculation.calculation_id);
      assert.ok(answer.answer_text.includes(`result=${result}`), `${answer.canonical_answer_id}:${calculation.calculation_id}`);
    }
    for (const limitation of proof.limitations || []) {
      const detail = typeof limitation === "string"
        ? limitation
        : limitation.detail_en || limitation.detail || limitation.detail_ar || limitation.reason_en || limitation.reason || limitation.reason_ar;
      if (detail) assert.ok(answer.answer_text.includes(detail), `${answer.canonical_answer_id}:${detail}`);
    }
  }
});

test("the generated package is byte-for-byte reproducible from sealed source inputs", async () => {
  const currentSummary = readJson("SUMMARY.json");
  const currentCanonical = readJsonl("02-execution-universe/canonical-answers.jsonl");
  const currentExecutions = readJsonl("02-execution-universe/execution-answer-ledger.jsonl");
  const rebuilt = await buildExecutionClosure({ root: ROOT, write: false });
  assert.deepEqual(rebuilt.summary, currentSummary);
  assert.deepEqual(rebuilt.canonicalAnswers, currentCanonical);
  assert.deepEqual(rebuilt.executions, currentExecutions);
});

test("package validator closes all integrity gates", async () => {
  const report = await validatePackage({ root: ROOT });
  assert.equal(report.verdict, "PASS");
  assert.equal(report.checks_total, 27);
  assert.equal(report.checks_passed, 27);
  assert.deepEqual(report.failures, []);
  assert.equal(report.metrics.execution_answers, 2304);
  assert.equal(report.metrics.live_main_cells, 31);
  assert.equal(report.metrics.surface_chat_messages, 0);
});

test("package manifest is deterministic, content-addressed and excludes itself", async () => {
  const first = await buildPackageManifest({ root: ROOT, write: false });
  const second = await buildPackageManifest({ root: ROOT, write: false });
  assert.deepEqual(second, first);
  assert.equal(first.build_mode, "DETERMINISTIC_CONTENT_ADDRESSED");
  assert.equal(first.validation.verdict, "PASS");
  assert.equal(first.validation.checks_passed, 27);
  assert.equal(first.truth_accounting.reference_execution_cells, 2304);
  assert.equal(first.truth_accounting.reference_execution_denominator, 2304);
  assert.equal(first.truth_accounting.live_main_universe_cells, 31);
  assert.equal(first.truth_accounting.initial_surface_probes_without_chat, 19);
  assert.equal(first.truth_accounting.expanded_surface_receipts_without_chat, 14);
  assert.equal(first.truth_accounting.official_surface_receipts_total, 33);
  assert.equal(first.truth_accounting.official_report_targets, 219);
  assert.equal(first.truth_accounting.explicit_grain_join_rows, 163);
  assert.equal(first.artifacts.some(item => item.path.endsWith("/PACKAGE_MANIFEST.json")), false);
  assert.match(first.tree_sha256, /^[a-f0-9]{64}$/);
});
