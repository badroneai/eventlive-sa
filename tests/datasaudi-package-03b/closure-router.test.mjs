import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const base = "research/datasaudi-package-03b-closure-router";
const sha256 = value => createHash("sha256").update(value).digest("hex");
const json = async file => JSON.parse(await readFile(file, "utf8"));
const jsonl = async file => (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);

test("sealed Package 03 and 03A trees remain unchanged", async () => {
  const p03 = await json("research/datasaudi-package-03/PACKAGE_MANIFEST.json");
  const p03a = await json("research/datasaudi-package-03a-question-closure/PACKAGE_MANIFEST.json");
  const lock = await json(`${base}/INPUT-LOCK.json`);
  assert.equal(p03.tree_sha256, "e8cf1fe8c7aeea306a081effc78b398c8d5621557cc51e5720f83a1629593862");
  assert.equal(p03a.tree_sha256, "2a048ed1f7424d66ed849647c32fc7dfe9c05fc168fa226c02c7457a114b2bd4");
  assert.equal(lock.package_03.tree_sha256, p03.tree_sha256);
  assert.equal(lock.package_03a.tree_sha256, p03a.tree_sha256);
  for (const item of lock.inputs) {
    const bytes = await readFile(item.path);
    assert.equal(sha256(bytes), item.sha256);
    assert.equal((await stat(item.path)).size, item.size_bytes);
  }
});

test("the independent-review packet is a complete undecided join", async () => {
  const truth = await json("research/datasaudi-package-03/04-proposition-verifier-and-adjudication/truth-closure-summary.json");
  const [adjudications, propositions, results, packet] = await Promise.all([
    jsonl(truth.artifacts.adjudication.path), jsonl(truth.artifacts.propositions.path),
    jsonl(truth.artifacts.results.path), jsonl(`${base}/independent-review-packet.jsonl`)
  ]);
  const pending = adjudications.filter(item => item.disposition === "pending-independent-review");
  const propIds = new Set(propositions.map(item => item.proposition_id));
  const resultById = new Map(results.map(item => [item.proposition_id, item]));
  assert.equal(pending.length, 39);
  assert.equal(packet.length, 39);
  assert.equal(new Set(packet.map(item => item.question_id)).size, 13);
  assert.equal(packet.filter(item => item.proposition_type === "temporal_coverage").length, 29);
  assert.equal(packet.filter(item => item.proposition_type === "dataset_availability").length, 10);
  assert.equal(packet.filter(item => item.evidence_complete).length, 39);
  assert.equal(packet.filter(item => item.decision_recorded).length, 0);
  assert.deepEqual(new Set(packet.map(item => item.proposition_id)), new Set(pending.map(item => item.proposition_id)));
  for (const item of packet) {
    assert.ok(propIds.has(item.proposition_id));
    assert.deepEqual(item.evidence, resultById.get(item.proposition_id).evidence);
    assert.equal(item.status, "PENDING_INDEPENDENT_REVIEW");
  }
});

test("the later campaign preregisters the exact non-Gold denominator", async () => {
  const [corpus, gold, oracle, specs, campaign] = await Promise.all([
    jsonl("research/datasaudi-insaights/04-question-corpus/questions.jsonl"),
    jsonl("research/datasaudi-package-03/02-source-oracle-and-evidence-vault/gold-case-specs.jsonl"),
    jsonl("research/datasaudi-package-03/02-source-oracle-and-evidence-vault/oracle-evidence.jsonl"),
    jsonl(`${base}/later-wave-oracle-specs.jsonl`), json(`${base}/campaign-batches.json`)
  ]);
  const goldIds = new Set(gold.map(item => item.question_id));
  const nonGoldIds = new Set(corpus.filter(item => !goldIds.has(item.question_id)).map(item => item.question_id));
  const oracleCubes = new Set(oracle.filter(item => item.oracle_status === "replayed").map(item => item.cube));
  assert.equal(nonGoldIds.size, 169);
  assert.deepEqual(new Set(specs.map(item => item.question_id)), nonGoldIds);
  assert.equal(specs.filter(item => item.state === "PREREGISTERED_NOT_SENT").length, 169);
  assert.equal(specs.filter(item => item.oracle_readiness === "source-ready").length, 120);
  assert.equal(specs.filter(item => item.oracle_readiness === "contract-only").length, 49);
  assert.equal(specs.filter(item => item.oracle_readiness === "source-review-required").length, 0);
  assert.equal(specs.filter(item => item.candidate_cubes.every(cube => oracleCubes.has(cube))
    && item.candidate_cubes.length > 0).length, 120);
  assert.deepEqual(campaign.batch_counts, [30, 30, 30, 30, 30, 19]);
  assert.equal(campaign.batches.flatMap(item => item.question_ids).length, 169);
  assert.equal(new Set(campaign.batches.flatMap(item => item.question_ids)).size, 169);
});

test("the router exposes three lanes while authority remains closed", async () => {
  const [router, p0, guard, closeout, manifest] = await Promise.all([
    json(`${base}/closure-router.json`), json(`${base}/p0-resume-contract.json`),
    json(`${base}/execution-guard.json`), json(`${base}/CLOSEOUT.json`), json(`${base}/PACKAGE_MANIFEST.json`)
  ]);
  assert.equal(router.status, "READINESS_COMPLETE_EXECUTION_NOT_AUTHORIZED");
  assert.deepEqual(router.review.byType, { temporalCoverage: 29, datasetAvailability: 10 });
  assert.deepEqual(p0.windows.map(item => item.count), [30, 19, 10]);
  assert.equal(p0.windows[0].begins_with, "H-19-AR");
  assert.equal(router.campaign.questions, 169);
  assert.equal(router.campaign.batchesCount, 6);
  assert.equal(guard.execution_authorized, false);
  assert.equal(guard.network_allowed, false);
  assert.equal(guard.live_executor_in_package, false);
  assert.equal(router.authority.package03Decision, "NO_BUILD");
  assert.equal(router.authority.package04Authorized, false);
  assert.equal(closeout.package_04_authorized, false);
  const lines = [];
  for (const item of manifest.artifacts) {
    const bytes = await readFile(item.path);
    assert.equal(sha256(bytes), item.sha256);
    lines.push(`${item.sha256}  ${item.path}`);
  }
  assert.equal(sha256(lines.join("\n")), manifest.tree_sha256);
});
