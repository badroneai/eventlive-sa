#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "research/datasaudi-package-03c-full-closure/p0-plan",
);
const readJson = async (name) =>
  JSON.parse(await readFile(path.join(OUT, name), "utf8"));
const readJsonl = async (name) =>
  (await readFile(path.join(OUT, name), "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const verifyFileHash = async (relativePath, expected) => {
  try {
    const body = await readFile(path.join(ROOT, relativePath));
    return sha256(body) === expected;
  } catch {
    return false;
  }
};

const [answers, sourceMap, boundary, summary, replayManifest] = await Promise.all([
  readJsonl("reference-answers.jsonl"),
  readJsonl("question-source-contract-map.jsonl"),
  readJson("catalog-boundary-audit.json"),
  readJson("summary.json"),
  readJsonl("live-replay-manifest.jsonl"),
]);

const checks = [];
const check = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });
const answerIds = answers.map((row) => row.question_id);
const mapIds = sourceMap.map((row) => row.question_id);
const unique = (values) => new Set(values).size === values.length;

check("denominator.answers", answers.length === 87, answers.length);
check("denominator.source-map", sourceMap.length === 87, sourceMap.length);
check("denominator.unique-answer-ids", unique(answerIds), new Set(answerIds).size);
check("denominator.unique-map-ids", unique(mapIds), new Set(mapIds).size);
check(
  "denominator.same-ids",
  [...answerIds].sort().join("\n") === [...mapIds].sort().join("\n"),
  "answer and map IDs reconcile",
);
check(
  "buckets.38-partial",
  answers.filter((row) => row.baseline_bucket === "PARTIAL_BEFORE_P03C").length === 38,
  answers.filter((row) => row.baseline_bucket === "PARTIAL_BEFORE_P03C").length,
);
check(
  "buckets.49-no-live",
  answers.filter(
    (row) => row.baseline_bucket === "P0_WITHOUT_LIVE_ANSWER_BEFORE_P03C",
  ).length === 49,
  answers.filter(
    (row) => row.baseline_bucket === "P0_WITHOUT_LIVE_ANSWER_BEFORE_P03C",
  ).length,
);
check(
  "answers.all-reference-closed",
  answers.every((row) => row.independent_answer_status === "CLOSED_REFERENCE_ANSWER"),
  answers.filter((row) => row.independent_answer_status === "CLOSED_REFERENCE_ANSWER")
    .length,
);
check(
  "answers.nonempty",
  answers.every((row) => row.reference_answer?.length >= 80),
  Math.min(...answers.map((row) => row.reference_answer?.length || 0)),
);
check(
  "answers.hashes",
  answers.every((row) => sha256(row.reference_answer) === row.answer_sha256),
  "all answer hashes reproduce",
);
check(
  "answers.assertion-contracts",
  answers.every(
    (row) =>
      Array.isArray(row.assertion_contract?.must) &&
      Array.isArray(row.assertion_contract?.must_not),
  ),
  "all records retain preregistered must/must-not rules",
);
check(
  "answers.live-independent-separated",
  answers.every(
    (row) =>
      row.insaights_observation_status &&
      row.independent_answer_status &&
      row.insaights_observation_status !== row.independent_answer_status,
  ),
  "all 87 separate live observation from independent closure",
);
check(
  "quota.h19-not-counted",
  answers.find((row) => row.question_id === "H-19-AR")?.insaights_observation_status ===
    "QUOTA_FRAME_ONLY_NO_SUBSTANTIVE_ANSWER",
  answers.find((row) => row.question_id === "H-19-AR")?.insaights_observation_status,
);
check(
  "quota.no-live-answer-created",
  summary.counts.insaights_substantive_answers_created === 0,
  summary.counts.insaights_substantive_answers_created,
);
check(
  "catalog.denominator",
  boundary.catalog.cubes === 277,
  boundary.catalog.cubes,
);
check(
  "catalog.boundary-method",
  boundary.method.includes("frozen public catalog schema"),
  boundary.method,
);
check(
  "sources.catalog-present",
  answers.every((row) =>
    row.cube_contracts.every((cube) => cube.catalog_status === "PRESENT"),
  ),
  answers
    .flatMap((row) => row.cube_contracts)
    .filter((cube) => cube.catalog_status !== "PRESENT")
    .map((cube) => cube.cube_id),
);
check(
  "sources.hash-or-query",
  answers.every((row) =>
    row.evidence.every(
      (evidence) => evidence.response_sha256 || evidence.request_url || !row.selected_cube_ids.length,
    ),
  ),
  "every selected cube has a replay hash or an explicit official query contract",
);
const taxonomyReplays = replayManifest.filter(
  (row) => row.replay_scope === "taxonomy-fallback-cube",
);
check("replays.taxonomy-38", taxonomyReplays.length === 38, taxonomyReplays.length);
check(
  "replays.taxonomy-all-200-complete",
  taxonomyReplays.every(
    (row) => row.status === "REPLAYED" && row.http_status === 200 && row.complete === true,
  ),
  taxonomyReplays
    .filter(
      (row) =>
        row.status !== "REPLAYED" || row.http_status !== 200 || row.complete !== true,
    )
    .map((row) => row.cube_id),
);
check(
  "replays.taxonomy-hashes",
  taxonomyReplays.every((row) => /^[a-f0-9]{64}$/.test(row.response_sha256 || "")),
  "all 38 taxonomy fallback replays have SHA-256 evidence",
);
const replayHashResults = await Promise.all(
  replayManifest
    .filter((row) => row.status === "REPLAYED")
    .map(async (row) => ({
      key: row.cube_id || row.question_id,
      pass: await verifyFileHash(row.response_path, row.response_sha256),
    })),
);
check(
  "replays.files-reproduce-hashes",
  replayHashResults.every((row) => row.pass),
  replayHashResults.filter((row) => !row.pass).map((row) => row.key),
);
const cachedEvidence = [
  ...new Map(
    answers
      .flatMap((row) => row.evidence)
      .filter((row) => row.mode === "CACHED_OFFICIAL_API_REPLAY")
      .map((row) => [row.response_path, row]),
  ).values(),
];
const cachedHashResults = await Promise.all(
  cachedEvidence.map(async (row) => ({
    cube_id: row.cube_id,
    pass: await verifyFileHash(row.response_path, row.response_sha256),
  })),
);
check(
  "replays.cached-oracle-files-reproduce-hashes",
  cachedHashResults.every((row) => row.pass),
  cachedHashResults.filter((row) => !row.pass).map((row) => row.cube_id),
);
check(
  "h-contracts.covered",
  [
    "H-03-AR",
    "H-04-AR",
    "H-05-AR",
    "H-06-AR",
    "H-07-AR",
    "H-08-AR",
    "H-16-AR",
    "H-17-AR",
    "H-18-AR",
    "H-19-AR",
    "H-20-AR",
    "H-21-AR",
    "H-22-AR",
    "H-23-AR",
    "H-24-AR",
    "H-25-AR",
    "H-26-AR",
    "H-27-AR",
    "H-28-AR",
    "H-29-AR",
    "H-30-AR",
  ].every((id) => answerIds.includes(id)),
  "21 repair/no-live red-team reference answers present",
);
const h03 = answers.find((row) => row.question_id === "H-03-AR");
check(
  "h03.false-premise-rejected-with-full-rank",
  h03?.reference_answer.includes("8,591,748") &&
    h03?.reference_answer.includes("339,174") &&
    h03?.supplemental_evidence?.some(
      (row) => row.status === "REPLAYED" && row.http_status === 200 && row.total === 13,
    ),
  h03?.supplemental_evidence,
);
check(
  "h21.period-not-today",
  answers.find((row) => row.question_id === "H-21-AR")?.reference_answer.includes(
    "2025-Q4",
  ) &&
    !answers
      .find((row) => row.question_id === "H-21-AR")
      ?.reference_answer.includes("2026-07-13"),
  "latest observation is distinct from retrieval date",
);
check(
  "h22.conversion",
  answers.find((row) => row.question_id === "H-22-AR")?.reference_answer.includes(
    "1300 مليار",
  ),
  "1.3 trillion = 1300 billion",
);
check(
  "h23.percentage-points",
  answers.find((row) => row.question_id === "H-23-AR")?.reference_answer.includes(
    "نقطتان مئويتان",
  ) &&
    answers.find((row) => row.question_id === "H-23-AR")?.reference_answer.includes(
      "20%",
    ),
  "percentage points and relative growth are separated",
);

const failures = checks.filter((row) => !row.pass);
const report = {
  schema_version: "1.0",
  generated_at_utc: new Date().toISOString(),
  verdict: failures.length ? "FAIL" : "PASS",
  checks_total: checks.length,
  checks_passed: checks.length - failures.length,
  failures,
  checks,
};
await writeFile(path.join(OUT, "verification.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
