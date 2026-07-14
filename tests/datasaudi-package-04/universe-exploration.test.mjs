import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildPackageManifest } from "../../scripts/datasaudi-package-04/build-manifest.mjs";
import { validatePackage } from "../../scripts/datasaudi-package-04/validate-package.mjs";

const ROOT = process.cwd();
const PACKAGE_ROOT = path.join(ROOT, "research/datasaudi-package-04-universe-exploration");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, relative), "utf8"));
const readJsonl = relative => fs.readFileSync(path.join(PACKAGE_ROOT, relative), "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);

test("coverage truth keeps knowledge, live, campaign and catalog denominators separate", () => {
  const baseline = readJson("00-governance/coverage-baseline.json");
  const denominators = baseline.denominators;
  assert.equal(denominators.frozen_question_corpus.knowledge_answers_closed, 267);
  assert.equal(denominators.methodological_campaign_universe.target_executions, 2304);
  assert.equal(denominators.live_insaights_observation.observed_responses, 49);
  assert.equal(denominators.catalog_metadata.metadata_captured_cubes, 277);
  assert.equal(baseline.catalog_depth_tiers.T3_detailed_direct_rank_series_evidence.covered_cubes, 34);
  assert.equal(baseline.knowledge_answer_composition.atomic_claims.unresolved, 0);
  assert.equal(baseline.knowledge_answer_composition.atomic_claims.incorrect, 0);
  assert.ok(baseline.invariants.includes("KNOWLEDGE_267_OF_267_NEVER_IMPLIES_LIVE_267_OF_267"));
});

test("P04 campaign is a 30-probe non-duplicate active-learning batch", () => {
  const prompts = readJsonl("02-live-campaign/prompts.jsonl");
  const prior = fs.readFileSync(path.join(ROOT, "research/datasaudi-insaights/04-question-corpus/questions.jsonl"), "utf8")
    .trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(prompts.length, 30);
  assert.equal(new Set(prompts.map(item => item.id)).size, 30);
  assert.equal(new Set(prompts.map(item => item.prompt)).size, 30);
  assert.deepEqual(prompts.map(item => item.id), Array.from({ length: 30 }, (_, index) => `P04-${String(index + 1).padStart(3, "0")}`));
  assert.ok(prompts.every(item => item.information_gain.score === 5));
  const priorPrompts = new Set(prior.map(item => item.prompt));
  assert.equal(prompts.filter(item => priorPrompts.has(item.prompt)).length, 0);
});

test("same-user live window preserved exactly thirty user messages and thirty answers", () => {
  const sessions = readJson("06-capability-surfaces/summary.json");
  assert.equal(sessions.auth_token_persisted, false);
  assert.equal(sessions.sessions_endpoint.status, 200);
  assert.equal(sessions.totals.matched_sessions, 6);
  assert.equal(sessions.totals.messages, 60);
  assert.equal(sessions.totals.user_messages, 30);
  assert.equal(sessions.totals.assistant_messages, 30);
  assert.equal(sessions.totals.visualizations, 0);
  assert.equal(sessions.histories.length, 6);
  assert.ok(sessions.histories.every(item => item.ok && item.messages >= 2));
  for (const history of sessions.histories) {
    const bytes = fs.readFileSync(path.join(ROOT, history.response_path));
    assert.equal(sha256(bytes), history.response_sha256);
  }
});

test("live execution used one fingerprint and captured 29 exact P04 prompts plus one partial manual probe", () => {
  const window2 = readJsonl("03-live-observations/runs/p04-live-20260715-window2/transcripts.jsonl");
  const window3 = readJsonl("03-live-observations/runs/p04-live-20260715-window3/transcripts.jsonl");
  const window4 = readJsonl("03-live-observations/runs/p04-live-20260715-window4/transcripts.jsonl");
  const manual = readJson("03-live-observations/manual-ui-probe/probe.json");
  const transcripts = [...window2, ...window3, ...window4];
  assert.equal(transcripts.length, 29);
  assert.equal(new Set(transcripts.map(item => item.question_id)).size, 29);
  assert.ok(!transcripts.some(item => item.question_id === "P04-003"));
  assert.equal(manual.campaign_substitution.coverage_status, "PARTIAL_SUBSTITUTE_2_OF_5_API_BACKFILL_REQUIRED");
  assert.equal(manual.message_counted_in_window, 1);
  const fingerprints = new Set([...transcripts.map(item => item.stable_user_fingerprint_sha256), manual.stable_user_fingerprint_sha256]);
  assert.equal(fingerprints.size, 1);
  assert.equal(transcripts.length + manual.message_counted_in_window, 30);
  assert.equal(window4.length, 27);
  assert.ok(window4.every(item => item.terminal.type === "answer_end"));
});

test("all 277 cubes have current API dossiers, time contracts and successful sample probes", () => {
  const summary = readJson("05-universe-dossier/summary.json");
  const dossiers = readJsonl("05-universe-dossier/cube-dossiers.jsonl");
  const dimensions = readJsonl("05-universe-dossier/dimensions.jsonl");
  const levels = readJsonl("05-universe-dossier/levels.jsonl");
  const measures = readJsonl("05-universe-dossier/measures.jsonl");
  assert.equal(summary.counts.cubes, 277);
  assert.equal(summary.counts.primary_cubes, 267);
  assert.equal(summary.counts.auxiliary_cubes, 10);
  assert.equal(summary.counts.hidden_in_ui_cubes, 26);
  assert.equal(dossiers.length, 277);
  assert.equal(new Set(dossiers.map(item => item.cube_id)).size, 277);
  assert.equal(dimensions.length, 722);
  assert.equal(levels.length, 992);
  assert.equal(measures.length, 479);
  assert.equal(levels.filter(item => item.excludes_members).length, 231);
  assert.equal(summary.counts.time_member_probes, 270);
  assert.equal(summary.counts.time_member_probe_ok, 270);
  assert.deepEqual(summary.counts.data_statuses, { DATA_RETURNED: 277 });
  assert.ok(dossiers.every(item => item.data_probe.status === "DATA_RETURNED"));
  assert.equal(summary.semantic_coverage.prior_candidate_cubes, 34);
  assert.equal(summary.semantic_coverage.p03c_selected_cubes, 71);
  assert.equal(summary.semantic_coverage.api_dossiers, 277);
  assert.equal(summary.semantic_coverage.api_dossier_percent, 100);
});

test("compatibility output never upgrades shared names into a proven join", () => {
  const candidates = readJsonl("05-universe-dossier/compatibility-candidates.jsonl");
  assert.equal(candidates.length, 7851);
  assert.ok(candidates.every(item => item.shared_level_count >= 2));
  assert.ok(candidates.every(item => item.safe_join_proven === false));
  assert.ok(candidates.every(item => item.verdict === "CANDIDATE_ONLY_REQUIRES_MEMBER_KEY_AND_GRAIN_REVIEW"));
});

test("PDF service returned a visually reviewed non-empty PDF", () => {
  const summary = readJson("06-capability-surfaces/summary.json");
  const pdf = summary.pdf_direct_probe;
  const bytes = fs.readFileSync(path.join(ROOT, pdf.path));
  assert.equal(pdf.status, 200);
  assert.equal(pdf.ok, true);
  assert.equal(pdf.content_type, "application/pdf");
  assert.ok(bytes.length > 50_000);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "%PDF");
  assert.equal(sha256(bytes), pdf.sha256);
  assert.ok(fs.existsSync(path.join(PACKAGE_ROOT, "06-capability-surfaces/PDF-VERIFICATION.md")));
});

test("durable research artifacts contain no persisted bearer token", () => {
  const roots = [PACKAGE_ROOT, path.join(ROOT, "scripts/datasaudi-package-04")];
  const files = roots.flatMap(root => fs.readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(entry.parentPath, entry.name)))
    .filter(file => !file.endsWith(".png") && !file.endsWith(".pdf") && !file.endsWith(".bin"));
  const tokenPattern = /"token"\s*:\s*"(?!\[REDACTED\])[^"\n]+"/;
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(tokenPattern.test(text), false, `persisted token in ${file}`);
  }
});

test("package validator reconciles live, API, adjudication and denominator truth", async () => {
  const report = await validatePackage({ root: ROOT });
  assert.equal(report.verdict, "PASS");
  assert.equal(report.checks_total, 18);
  assert.equal(report.checks_passed, report.checks_total);
  assert.deepEqual(report.failures, []);
  assert.equal(report.metrics.prompts, 30);
  assert.equal(report.metrics.exact_live_prompts, 29);
  assert.equal(report.metrics.manual_window_messages, 1);
  assert.equal(report.metrics.server_user_messages, 30);
  assert.equal(report.metrics.server_assistant_messages, 30);
  assert.equal(report.metrics.api_dossiers, 277);
  assert.equal(report.metrics.api_time_probes, 270);
  assert.equal(report.metrics.hidden_cubes, 26);
  assert.equal(report.metrics.compatibility_candidates, 7851);
  assert.equal(report.metrics.proven_safe_joins, 0);
  assert.equal(report.metrics.adjudication_records, 31);
  assert.equal(report.metrics.adjudicated_exact_observations, 29);
  assert.equal(report.metrics.blocked_exact_prompts, 1);
  assert.equal(report.metrics.manual_substitutes, 1);
  assert.deepEqual(report.metrics.adjudication_verdict_counts, {
    VERIFIED_PASS: 1,
    USEFUL_PARTIAL: 8,
    UNSAFE_PARTIAL: 8,
    FAIL: 13,
    BLOCKED_PLATFORM: 1
  });
  assert.deepEqual(report.metrics.denominators, {
    knowledge_corpus: { numerator: 267, denominator: 2304, percent: 11.59 },
    live_observations: { numerator: 79, denominator: 2304, percent: 3.43 },
    public_api_cube_dossiers: { numerator: 277, denominator: 277, percent: 100 }
  });
});

test("package manifest is deterministic, content-addressed and self-excluding", async () => {
  const first = await buildPackageManifest({ root: ROOT, write: false });
  const second = await buildPackageManifest({ root: ROOT, write: false });
  assert.deepEqual(second, first);
  assert.equal(first.build_mode, "DETERMINISTIC_CONTENT_ADDRESSED");
  assert.equal(first.validation.verdict, "PASS");
  assert.equal(first.validation.checks_passed, first.validation.checks_total);
  assert.ok(first.artifact_count > 500);
  assert.equal(first.artifact_count, first.artifacts.length);
  assert.equal(first.size_bytes, first.artifacts.reduce((sum, item) => sum + item.size_bytes, 0));
  assert.equal(first.artifacts.some(item => item.path.endsWith("/PACKAGE_MANIFEST.json")), false);
  assert.equal(new Set(first.artifacts.map(item => item.path)).size, first.artifacts.length);
  assert.match(first.tree_sha256, /^[a-f0-9]{64}$/);
  assert.match(first.validation.fingerprint_sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(first.truth_accounting.denominators.live_observations, {
    numerator: 79,
    denominator: 2304,
    percent: 3.43
  });
});
