import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REPO = process.cwd();
const SHARD = path.resolve(
  "research/datasaudi-package-04-universe-exploration/04-adjudication/shard-b",
);
const EVIDENCE = path.join(SHARD, "evidence");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonl = async (file) =>
  (await readFile(file, "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const adjudications = await jsonl(path.join(SHARD, "adjudication.jsonl"));
const requests = await jsonl(path.join(EVIDENCE, "requests.jsonl"));
const rowHashes = await jsonl(path.join(EVIDENCE, "row-hashes.jsonl"));
const transcripts = await jsonl(
  path.resolve(
    "research/datasaudi-package-04-universe-exploration/03-live-observations/runs/p04-live-20260715-window4/transcripts.jsonl",
  ),
);
const requestById = new Map(requests.map((record) => [record.request_id, record]));
const transcriptById = new Map(transcripts.map((record) => [record.question_id, record]));

assert(adjudications.length === 9, `Expected 9 adjudications, got ${adjudications.length}`);
assert(
  new Set(adjudications.map((record) => record.question_id)).size === 9,
  "Duplicate question_id in adjudication.jsonl",
);
assert(requests.length === 61, `Expected 61 replay requests, got ${requests.length}`);
assert(rowHashes.length === 586, `Expected 586 row hashes, got ${rowHashes.length}`);

for (const request of requests) {
  const bodyPath = path.resolve(request.body_path);
  const body = await readFile(bodyPath);
  assert(request.http_status === 200, `${request.request_id} HTTP ${request.http_status}`);
  assert(sha256(body) === request.body_sha256, `${request.request_id} body hash mismatch`);
  assert(body.byteLength === request.body_bytes, `${request.request_id} body byte mismatch`);
}

const parsedBodies = new Map();
for (const rowRecord of rowHashes) {
  const request = requestById.get(rowRecord.request_id);
  assert(request, `Unknown row request ${rowRecord.request_id}`);
  if (!parsedBodies.has(rowRecord.request_id)) {
    parsedBodies.set(
      rowRecord.request_id,
      JSON.parse(await readFile(path.resolve(request.body_path), "utf8")),
    );
  }
  const row = parsedBodies.get(rowRecord.request_id).data?.[rowRecord.row_index];
  assert(row, `${rowRecord.request_id} missing row ${rowRecord.row_index}`);
  assert(
    sha256(JSON.stringify(row)) === rowRecord.row_sha256,
    `${rowRecord.request_id} row ${rowRecord.row_index} hash mismatch`,
  );
}

for (const record of adjudications) {
  const transcript = transcriptById.get(record.question_id);
  assert(transcript, `Missing transcript ${record.question_id}`);
  assert(
    sha256(transcript.prompt) === record.observed_answer.prompt_sha256,
    `${record.question_id} prompt hash mismatch`,
  );
  assert(
    sha256(transcript.raw_answer) === record.observed_answer.raw_answer_sha256,
    `${record.question_id} answer hash mismatch`,
  );
  const html = await readFile(path.resolve(record.observed_answer.raw_answer_html_path));
  assert(
    sha256(html) === record.observed_answer.raw_answer_html_file_sha256,
    `${record.question_id} HTML hash mismatch`,
  );
  const screenshot = await readFile(path.resolve(record.observed_answer.screenshot.path));
  assert(
    sha256(screenshot) === record.observed_answer.screenshot.sha256,
    `${record.question_id} screenshot hash mismatch`,
  );

  const axes = Object.values(record.score_breakdown);
  assert(axes.length === 6, `${record.question_id} must have six scoring axes`);
  const points = axes.reduce((sum, axis) => sum + axis.points, 0);
  const max = axes.reduce((sum, axis) => sum + axis.max_points, 0);
  assert(max === 100, `${record.question_id} max score is ${max}`);
  assert(points === record.total_score, `${record.question_id} score sum mismatch`);
  if (record.verdict === "VERIFIED_PASS") assert(points >= 90, `${record.question_id} pass < 90`);
  if (record.verdict === "USEFUL_PARTIAL")
    assert(points >= 70 && points <= 89, `${record.question_id} useful score out of range`);
  if (record.verdict === "UNSAFE_PARTIAL")
    assert(points >= 40 && points <= 69, `${record.question_id} unsafe score out of range`);
  if (record.verdict === "FAIL")
    assert(points < 40 || record.forced_fail, `${record.question_id} FAIL without threshold/rule`);

  for (const replay of record.replay.requests) {
    const canonical = requestById.get(replay.request_id);
    assert(canonical, `${record.question_id} unknown replay ${replay.request_id}`);
    assert(canonical.body_sha256 === replay.body_sha256, `${record.question_id} replay hash mismatch`);
    assert(canonical.request_url === replay.request_url, `${record.question_id} replay URL mismatch`);
  }
  const derived = await readFile(path.resolve(record.replay.derived_verification_path));
  assert(
    sha256(derived) === record.replay.derived_verification_sha256,
    `${record.question_id} derived hash mismatch`,
  );
  const rowManifest = await readFile(path.resolve(record.replay.row_hash_manifest_path));
  assert(
    sha256(rowManifest) === record.replay.row_hash_manifest_sha256,
    `${record.question_id} row-manifest hash mismatch`,
  );
}

const summary = {
  schema_version: "1.0",
  validated_at_utc: new Date().toISOString(),
  status: "PASS",
  adjudication_records: adjudications.length,
  raw_api_responses: requests.length,
  raw_api_http_200: requests.filter((record) => record.http_status === 200).length,
  row_hashes: rowHashes.length,
  verdict_counts: adjudications.reduce((counts, record) => {
    counts[record.verdict] = (counts[record.verdict] || 0) + 1;
    return counts;
  }, {}),
};
await writeFile(
  path.join(EVIDENCE, "validation-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(summary)}\n`);
