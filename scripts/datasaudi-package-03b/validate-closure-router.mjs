import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const base = "research/datasaudi-package-03b-closure-router";
const reports = "reports/datasaudi-package-03b-closure-router";
const expectedPackage03Tree = "e8cf1fe8c7aeea306a081effc78b398c8d5621557cc51e5720f83a1629593862";
const expectedPackage03ATree = "2a048ed1f7424d66ed849647c32fc7dfe9c05fc168fa226c02c7457a114b2bd4";
const sha256 = value => createHash("sha256").update(value).digest("hex");
const json = async file => JSON.parse(await readFile(file, "utf8"));
const jsonl = async file => (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const checkNames = [];
const check = (name, fn) => { fn(); checkNames.push(name); };

async function verifyManifest(file, expectedTree) {
  const manifestBytes = await readFile(file);
  const manifest = JSON.parse(manifestBytes);
  const lines = [];
  for (const item of manifest.artifacts) {
    const bytes = await readFile(item.path);
    assert.equal(sha256(bytes), item.sha256, `${item.path}: sha mismatch`);
    assert.equal((await stat(item.path)).size, item.size_bytes, `${item.path}: size mismatch`);
    lines.push(`${item.sha256}  ${item.path}`);
  }
  assert.equal(manifest.artifact_count, manifest.artifacts.length, `${file}: artifact denominator`);
  assert.equal(sha256(lines.join("\n")), manifest.tree_sha256, `${file}: tree mismatch`);
  if (expectedTree) assert.equal(manifest.tree_sha256, expectedTree, `${file}: sealed tree changed`);
  return { manifest, bytes: manifestBytes };
}

const package03 = await verifyManifest("research/datasaudi-package-03/PACKAGE_MANIFEST.json", expectedPackage03Tree);
const package03A = await verifyManifest("research/datasaudi-package-03a-question-closure/PACKAGE_MANIFEST.json", expectedPackage03ATree);
const generated = await verifyManifest(`${base}/PACKAGE_MANIFEST.json`);
check("sealed package trees", () => {
  assert.equal(generated.manifest.sealed_dependencies.package_03_tree_sha256, expectedPackage03Tree);
  assert.equal(generated.manifest.sealed_dependencies.package_03a_tree_sha256, expectedPackage03ATree);
});

const inputLock = await json(`${base}/INPUT-LOCK.json`);
for (const item of inputLock.inputs) {
  const bytes = await readFile(item.path);
  assert.equal(sha256(bytes), item.sha256, `${item.path}: locked sha changed`);
  assert.equal((await stat(item.path)).size, item.size_bytes, `${item.path}: locked size changed`);
}
check("input lock", () => {
  assert.equal(inputLock.package_03.tree_sha256, expectedPackage03Tree);
  assert.equal(inputLock.package_03a.tree_sha256, expectedPackage03ATree);
  assert.equal(inputLock.package_03.manifest_sha256, sha256(package03.bytes));
  assert.equal(inputLock.package_03a.manifest_sha256, sha256(package03A.bytes));
  assert.equal(inputLock.input_fingerprint,
    sha256(inputLock.inputs.map(item => `${item.sha256}  ${item.path}`).join("\n")));
});

const truth = await json("research/datasaudi-package-03/04-proposition-verifier-and-adjudication/truth-closure-summary.json");
const [corpus, gold, oracle, propositions, results, adjudications, reviews, specs] = await Promise.all([
  jsonl("research/datasaudi-insaights/04-question-corpus/questions.jsonl"),
  jsonl("research/datasaudi-package-03/02-source-oracle-and-evidence-vault/gold-case-specs.jsonl"),
  jsonl("research/datasaudi-package-03/02-source-oracle-and-evidence-vault/oracle-evidence.jsonl"),
  jsonl(truth.artifacts.propositions.path), jsonl(truth.artifacts.results.path),
  jsonl(truth.artifacts.adjudication.path), jsonl(`${base}/independent-review-packet.jsonl`),
  jsonl(`${base}/later-wave-oracle-specs.jsonl`)
]);
const questionById = new Map(corpus.map(item => [item.question_id, item]));
const propositionById = new Map(propositions.map(item => [item.proposition_id, item]));
const resultById = new Map(results.map(item => [item.proposition_id, item]));
const reviewByProposition = new Map(reviews.map(item => [item.proposition_id, item]));
const pending = adjudications.filter(item => item.disposition === "pending-independent-review");

check("review source denominator", () => {
  assert.equal(truth.adjudication.pending_independent_review, 39);
  assert.equal(pending.length, 39);
  assert.equal(new Set(pending.map(item => item.question_id)).size, 13);
});
for (const adjudication of pending) {
  const proposition = propositionById.get(adjudication.proposition_id);
  const result = resultById.get(adjudication.proposition_id);
  const review = reviewByProposition.get(adjudication.proposition_id);
  assert.ok(proposition && result && review, `${adjudication.proposition_id}: incomplete review join`);
  assert.ok(result.evidence, `${adjudication.proposition_id}: missing evidence`);
  assert.equal(review.status, "PENDING_INDEPENDENT_REVIEW");
  assert.equal(review.decision_recorded, false);
  assert.equal(review.question_id, proposition.question_id);
  assert.equal(review.statement_sha256, proposition.statement_sha256);
  assert.equal(review.machine_result, result.result);
  assert.equal(review.reason, result.reason);
  assert.deepEqual(review.evidence, result.evidence);
  assert.equal(review.evidence_complete, true);
  assert.equal(review.evidence_ref.path, truth.artifacts.results.path);
  assert.equal(review.evidence_ref.sha256, truth.artifacts.results.sha256);
  assert.equal(review.evidence_ref.payload_sha256, sha256(JSON.stringify(result.evidence)));
  assert.ok(questionById.has(review.question_id));
}
check("review packet", () => {
  assert.equal(reviews.length, 39);
  assert.equal(new Set(reviews.map(item => item.review_id)).size, 39);
  assert.equal(reviews.filter(item => item.proposition_type === "temporal_coverage").length, 29);
  assert.equal(reviews.filter(item => item.proposition_type === "dataset_availability").length, 10);
  assert.equal(reviews.filter(item => item.evidence_complete).length, 39);
  assert.equal(reviews.filter(item => item.decision_recorded).length, 0);
});

const goldIds = new Set(gold.map(item => item.question_id));
const laterSource = corpus.filter(item => !goldIds.has(item.question_id));
const specByQuestion = new Map(specs.map(item => [item.question_id, item]));
const oracleByCube = new Map(oracle.map(item => [item.cube, item]));
for (const question of laterSource) {
  const spec = specByQuestion.get(question.question_id);
  assert.ok(spec, `${question.question_id}: missing later-wave spec`);
  assert.equal(spec.state, "PREREGISTERED_NOT_SENT");
  assert.equal(spec.prompt, question.prompt);
  assert.equal(spec.prompt_sha256, sha256(question.prompt));
  assert.equal(spec.source_record_sha256, sha256(JSON.stringify(question)));
  assert.deepEqual(spec.candidate_cubes, question.candidate_cubes);
  const covered = question.candidate_cubes.every(cube => oracleByCube.get(cube)?.oracle_status === "replayed");
  const expectedReadiness = question.candidate_cubes.length === 0
    ? "contract-only" : covered ? "source-ready" : "source-review-required";
  assert.equal(spec.oracle_readiness, expectedReadiness);
  assert.equal(spec.oracle_evidence_refs.length, question.candidate_cubes.length);
  for (const ref of spec.oracle_evidence_refs) {
    const evidence = oracleByCube.get(ref.cube);
    assert.equal(ref.evidence_id, evidence.evidence_id);
    assert.equal(ref.response_sha256, evidence.response_sha256);
  }
  assert.equal(spec.assertion_contract.must.includes("unsupported_causality"), false);
  assert.ok(spec.assertion_contract.must_not.includes("unsupported_causality"));
  if (question.family === "cross") {
    assert.ok(spec.expected_behavior.includes("compatibility_matrix"));
    assert.ok(spec.expected_behavior.includes("cite_all_datasets"));
    assert.ok(spec.expected_behavior.includes("no_unsupported_causality"));
  }
}
check("later-wave specs", () => {
  assert.equal(laterSource.length, 169);
  assert.equal(specs.length, 169);
  assert.equal(new Set(specs.map(item => item.question_id)).size, 169);
  assert.equal(new Set(specs.map(item => item.spec_id)).size, 169);
  assert.equal(specs.filter(item => item.oracle_readiness === "source-ready").length, 120);
  assert.equal(specs.filter(item => item.oracle_readiness === "contract-only").length, 49);
  assert.equal(specs.filter(item => item.oracle_readiness === "source-review-required").length, 0);
  assert.equal(new Set(specs.flatMap(item => item.candidate_cubes)).size, 34);
});

const campaign = await json(`${base}/campaign-batches.json`);
check("campaign batches", () => {
  assert.equal(campaign.questions, 169);
  assert.equal(campaign.batches_count, 6);
  assert.deepEqual(campaign.batch_counts, [30, 30, 30, 30, 30, 19]);
  assert.equal(campaign.source_ready, 120);
  assert.equal(campaign.contract_only, 49);
  assert.equal(campaign.source_review_required, 0);
  assert.deepEqual(campaign.priority_counts, { P1: 154, P2: 15 });
  assert.deepEqual(campaign.family_counts, { cross: 34, derive: 24, direct: 24, explain: 24, opportunity: 15, rank: 24, series: 24 });
  assert.equal(new Set(campaign.batches.flatMap(item => item.question_ids)).size, 169);
});
for (const batch of campaign.batches) {
  const assigned = specs.filter(item => item.batch_id === batch.batch_id);
  assert.equal(assigned.length, batch.count);
  assert.deepEqual(assigned.map(item => item.question_id), batch.question_ids);
  assert.deepEqual(assigned.map(item => item.spec_id), batch.spec_ids);
  assert.equal(batch.state, "PREREGISTERED_NOT_SENT");
}

const [retryQueue, remainingQueue, variants, package03Closeout, p0, guard, router, closeout, validation] = await Promise.all([
  jsonl("research/datasaudi-package-03/05-quota-safe-live-retry/retry-queue.jsonl"),
  jsonl("research/datasaudi-package-03a-question-closure/03-adjudication/remaining-unsent-queue.jsonl"),
  jsonl("research/datasaudi-package-03a-question-closure/03-adjudication/next-variant-queue.jsonl"),
  json("research/datasaudi-package-03/12-stage-gate-manifest-and-closeout/package-03-closeout.json"),
  json(`${base}/p0-resume-contract.json`), json(`${base}/execution-guard.json`),
  json(`${base}/closure-router.json`), json(`${base}/CLOSEOUT.json`), json(`${base}/validation.json`)
]);
const expectedP0 = retryQueue.filter(item => item.queue_position >= 19);
check("P0 resume contract", () => {
  assert.equal(p0.status, "WAIT_RESET_EXECUTION_NOT_AUTHORIZED");
  assert.equal(p0.observed_reset_required, true);
  assert.equal(p0.frozen_v0_questions, 49);
  assert.deepEqual(p0.windows.map(item => item.count), [30, 19, 10]);
  assert.deepEqual(p0.windows[0].items.map(item => item.question_id), expectedP0.slice(0, 30).map(item => item.question_id));
  assert.deepEqual(p0.windows[1].items.map(item => item.question_id), expectedP0.slice(30).map(item => item.question_id));
  assert.deepEqual(remainingQueue.map(item => item.question_id), expectedP0.slice(1).map(item => item.question_id));
  assert.deepEqual(p0.windows[2].items, variants);
  assert.equal(p0.windows[0].begins_with, "H-19-AR");
  assert.equal(p0.windows[2].conditional_on_still_open, true);
});
check("execution guard", () => {
  assert.equal(guard.execution_authorized, false);
  assert.equal(guard.network_allowed, false);
  assert.equal(guard.send_allowed, false);
  assert.equal(guard.live_executor_in_package, false);
  assert.equal(guard.limits.max_messages_per_window, 30);
  assert.equal(guard.circuit_breaker.stop_on_first_explicit_quota_frame, true);
  assert.equal(guard.authority_boundary.package_03_decision, "NO_BUILD");
  assert.equal(guard.authority_boundary.package_04_authorized, false);
  assert.equal(package03Closeout.portfolio_decision, "NO_BUILD");
  assert.equal(package03Closeout.package_04_authorized, false);
});
check("closure router", () => {
  assert.equal(router.status, "READINESS_COMPLETE_EXECUTION_NOT_AUTHORIZED");
  assert.deepEqual(router.review.byType, { temporalCoverage: 29, datasetAvailability: 10 });
  assert.equal(router.review.claims, 39);
  assert.equal(router.review.questions, 13);
  assert.equal(router.review.evidenceComplete, 39);
  assert.deepEqual(router.waitReset.windows.map(item => item.count), [30, 19, 10]);
  assert.equal(router.campaign.questions, 169);
  assert.equal(router.campaign.batchesCount, 6);
  assert.equal(router.campaign.sourceReady, 120);
  assert.equal(router.campaign.contractOnly, 49);
  assert.equal(router.campaign.sourceReviewRequired, 0);
  assert.equal(router.authority.package03Decision, "NO_BUILD");
  assert.equal(router.authority.package04Authorized, false);
  assert.equal(router.authority.executionAuthorized, false);
});
check("closeout and validation", () => {
  assert.equal(validation.status, "PASS");
  assert.equal(closeout.status, "READINESS_COMPLETE_EXECUTION_NOT_AUTHORIZED");
  assert.equal(closeout.package_03_tree_sha256, expectedPackage03Tree);
  assert.equal(closeout.package_03a_tree_sha256, expectedPackage03ATree);
  assert.equal(closeout.package_03_decision_unchanged, "NO_BUILD");
  assert.equal(closeout.package_04_authorized, false);
  assert.equal(closeout.review_now.decisions_recorded, 0);
});

for (const [packageFile, reportFile] of [
  ["CLOSEOUT.json", "latest-closeout.json"],
  ["CLOSEOUT.md", "LATEST.md"],
  ["validation.json", "latest-validation.json"],
  ["VALIDATION.md", "latest-validation.md"],
  ["PACKAGE_MANIFEST.json", "latest-manifest.json"]
]) {
  assert.deepEqual(await readFile(`${base}/${packageFile}`), await readFile(`${reports}/${reportFile}`),
    `${reportFile}: report mirror diverged`);
}
checkNames.push("report mirrors");

console.log(JSON.stringify({
  ok: true,
  status: "PASS",
  checks: checkNames.length,
  review: { claims: reviews.length, questions: new Set(reviews.map(item => item.question_id)).size, evidence_complete: reviews.filter(item => item.evidence_complete).length },
  campaign: { questions: specs.length, source_ready: 120, contract_only: 49, source_review_required: 0, batches: campaign.batch_counts },
  p0_windows: p0.windows.map(item => ({ id: item.id, count: item.count })),
  package_tree_sha256: generated.manifest.tree_sha256
}, null, 2));
