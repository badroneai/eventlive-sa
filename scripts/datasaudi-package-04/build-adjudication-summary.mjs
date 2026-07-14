import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PACKAGE_ROOT = path.join(
  ROOT,
  "research/datasaudi-package-04-universe-exploration",
);
const ADJUDICATION_ROOT = path.join(PACKAGE_ROOT, "04-adjudication");

const SHARDS = ["manual", "shard-a", "shard-b", "shard-c"];
const ALLOWED_VERDICTS = [
  "VERIFIED_PASS",
  "USEFUL_PARTIAL",
  "UNSAFE_PARTIAL",
  "FAIL",
  "BLOCKED_PLATFORM",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function percent(numerator, denominator, digits = 2) {
  return denominator ? round((numerator / denominator) * 100, digits) : 0;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizedVerdict(record) {
  return record.verdict ?? record.score?.classification ?? null;
}

function normalizedScore(record) {
  const score = record.total_score
    ?? record.score_breakdown?.total
    ?? record.score?.total
    ?? null;
  return Number.isFinite(score) ? score : null;
}

function normalizedForcedFailReasons(record) {
  return [
    ...(record.mandatory_fail_rules ?? []),
    ...(record.forced_fail_reasons ?? []),
    ...(record.score?.classification_override
      ? [record.score.classification_override]
      : []),
  ];
}

function normalizedFailureBasis(record) {
  if (record.failure_basis) return record.failure_basis;
  const reasons = normalizedForcedFailReasons(record);
  if (reasons.length) return reasons.join("; ");
  return null;
}

function recordOrder(left, right) {
  const exactPattern = /^P04-(\d{3})$/;
  const leftMatch = left.question_id.match(exactPattern);
  const rightMatch = right.question_id.match(exactPattern);
  if (leftMatch && rightMatch) return Number(leftMatch[1]) - Number(rightMatch[1]);
  if (leftMatch) return -1;
  if (rightMatch) return 1;
  return left.question_id.localeCompare(right.question_id, "en");
}

function summarizeRecords(records) {
  const verdictCounts = Object.fromEntries(ALLOWED_VERDICTS.map(verdict => [verdict, 0]));
  const shardCounts = {};
  const scores = [];

  for (const record of records) {
    const verdict = normalizedVerdict(record);
    assert(ALLOWED_VERDICTS.includes(verdict), `Unknown verdict for ${record.question_id}: ${verdict}`);
    verdictCounts[verdict] += 1;

    const shard = record.__aggregate.shard;
    shardCounts[shard] ??= {
      records: 0,
      scored_records: 0,
      verdict_counts: Object.fromEntries(ALLOWED_VERDICTS.map(item => [item, 0])),
      score_total: 0,
    };
    shardCounts[shard].records += 1;
    shardCounts[shard].verdict_counts[verdict] += 1;

    const score = normalizedScore(record);
    if (score !== null) {
      assert(score >= 0 && score <= 100, `Score out of range for ${record.question_id}: ${score}`);
      scores.push(score);
      shardCounts[shard].scored_records += 1;
      shardCounts[shard].score_total += score;
    }
  }

  for (const shard of Object.values(shardCounts)) {
    shard.average_score = shard.scored_records
      ? round(shard.score_total / shard.scored_records)
      : null;
    delete shard.score_total;
  }

  return {
    verdict_counts: verdictCounts,
    score_statistics: {
      scored_records: scores.length,
      unscored_records: records.length - scores.length,
      score_total: scores.reduce((sum, score) => sum + score, 0),
      average_score: round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      minimum_score: Math.min(...scores),
      maximum_score: Math.max(...scores),
    },
    by_shard: shardCounts,
  };
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

const sourceFiles = [];
const records = [];

for (const shard of SHARDS) {
  const relativePath = `research/datasaudi-package-04-universe-exploration/04-adjudication/${shard}/adjudication.jsonl`;
  const raw = await readFile(path.join(ROOT, relativePath), "utf8");
  const lines = raw.split("\n").filter(Boolean);
  sourceFiles.push({
    shard,
    path: relativePath,
    records: lines.length,
    bytes: Buffer.byteLength(raw),
    sha256: sha256(raw),
  });
  for (const line of lines) {
    const record = JSON.parse(line);
    assert(record.question_id, `Missing question_id in ${relativePath}`);
    records.push({
      ...record,
      __aggregate: {
        shard,
        source_path: relativePath,
      },
    });
  }
}

records.sort(recordOrder);

const ids = records.map(record => record.question_id);
assert(new Set(ids).size === ids.length, "Duplicate question_id in adjudication shards");
const expectedExactIds = Array.from({ length: 30 }, (_, index) =>
  `P04-${String(index + 1).padStart(3, "0")}`,
);
for (const id of expectedExactIds) assert(ids.includes(id), `Missing exact campaign record: ${id}`);
assert(ids.includes("P04-MANUAL-UI-001"), "Missing manual live observation record");
assert(records.length === 31, `Expected 31 adjudication records, found ${records.length}`);

const p04003 = records.find(record => record.question_id === "P04-003");
assert(normalizedVerdict(p04003) === "BLOCKED_PLATFORM", "P04-003 must remain BLOCKED_PLATFORM");
assert(
  p04003.observation?.status === "NOT_SENT_WINDOW_CAPACITY",
  "P04-003 must remain explicitly not sent",
);

const baseline = await readJson(
  "research/datasaudi-package-04-universe-exploration/00-governance/coverage-baseline.json",
);
const surface = await readJson(
  "research/datasaudi-package-04-universe-exploration/01-surface-recon/surface-metrics.json",
);
const dossier = await readJson(
  "research/datasaudi-package-04-universe-exploration/05-universe-dossier/summary.json",
);
const sessions = await readJson(
  "research/datasaudi-package-04-universe-exploration/06-capability-surfaces/summary.json",
);

const methodologicalTotal = baseline.denominators.methodological_campaign_universe.target_executions;
const frozenCorpus = baseline.denominators.frozen_question_corpus.total;
const priorLive = baseline.denominators.live_insaights_observation.observed_responses;
const todayMessages = sessions.totals.user_messages;
const cumulativeLive = priorLive + todayMessages;
const apiCubes = dossier.counts.cubes;
const apiDataProbes = dossier.counts.data_probes;
const apiReturned = dossier.counts.data_statuses.DATA_RETURNED;

assert(methodologicalTotal === 2304, `Unexpected methodological denominator: ${methodologicalTotal}`);
assert(frozenCorpus === 267, `Unexpected frozen corpus denominator: ${frozenCorpus}`);
assert(priorLive === 49, `Unexpected prior live count: ${priorLive}`);
assert(todayMessages === 30, `Expected 30 user messages in current window, found ${todayMessages}`);
assert(sessions.totals.assistant_messages === 30, "Current window must contain 30 assistant messages");
assert(apiCubes === 277 && apiDataProbes === 277 && apiReturned === 277, "API universe is not 277/277 DATA_RETURNED");

const aggregate = summarizeRecords(records);
assert(aggregate.score_statistics.scored_records === 30, "Exactly 30 observed answers must be scored");
assert(aggregate.verdict_counts.BLOCKED_PLATFORM === 1, "Exactly one exact prompt must remain platform-blocked/not sent");

const exactObservedRecords = records.filter(record =>
  /^P04-\d{3}$/.test(record.question_id)
  && record.question_id !== "P04-003",
);
const exactObservedScores = exactObservedRecords.map(normalizedScore);
assert(exactObservedRecords.length === 29, "Expected 29 exact prompt observations");
assert(exactObservedScores.every(Number.isFinite), "Every exact observed prompt must have a numeric score");

const criticalFailureRegister = records
  .filter(record => normalizedVerdict(record) === "FAIL")
  .map(record => ({
    question_id: record.question_id,
    score: normalizedScore(record),
    target_capability: record.target_capability ?? null,
    forced_fail: Boolean(
      record.forced_fail
      || record.mandatory_fail_rules?.length
      || record.forced_fail_reasons?.length
      || record.score?.classification_override,
    ),
    forced_fail_reasons: normalizedForcedFailReasons(record),
    failure_basis: normalizedFailureBasis(record),
    errors: record.errors ?? [],
    false_completeness_flags:
      record.false_completeness_flags
      ?? record.false_completeness
      ?? [],
  }));

const summary = {
  schema_version: "1.0",
  package_id: "datasaudi-package-04-universe-exploration",
  artifact_id: "P04-ADJUDICATION-SUMMARY",
  status: "PACKAGE_CLOSED_PLATFORM_UNIVERSE_NOT_EXHAUSTED",
  deterministic_build: {
    generated_from_input_artifacts: true,
    wall_clock_timestamp_used: false,
    source_files: sourceFiles,
  },
  adjudication: {
    records: records.length,
    exact_campaign_records: 30,
    exact_prompts_observed_and_scored: 29,
    exact_prompt_not_sent: ["P04-003"],
    manual_live_observations_scored: 1,
    ...aggregate,
    exact_observed_score_statistics: {
      scored_records: exactObservedScores.length,
      score_total: exactObservedScores.reduce((sum, score) => sum + score, 0),
      average_score: round(
        exactObservedScores.reduce((sum, score) => sum + score, 0)
          / exactObservedScores.length,
      ),
    },
    critical_failure_register: criticalFailureRegister,
  },
  coverage_truth: {
    methodological_campaign: {
      represented_corpus: frozenCorpus,
      target_executions: methodologicalTotal,
      percent: percent(frozenCorpus, methodologicalTotal),
      exact_percent: baseline.denominators.methodological_campaign_universe.frozen_corpus_representation_percent,
      interpretation: "Frozen knowledge corpus representation; not live platform coverage.",
    },
    cumulative_live_insaights: {
      prior_observations: priorLive,
      current_window_messages: todayMessages,
      observed_responses: cumulativeLive,
      target_executions: methodologicalTotal,
      percent: percent(cumulativeLive, methodologicalTotal),
      interpretation: "Live messages observed across prior evidence plus the current same-user window; correctness is adjudicated separately.",
    },
    current_window: {
      daily_limit_observed: surface.insaights.daily_message_limit_observed,
      messages_used: todayMessages,
      exact_campaign_prompts_sent: 29,
      manual_probe_messages_sent: 1,
      exact_campaign_prompt_not_sent: "P04-003",
      exact_prompt_gap_reason: p04003.observation.reason,
      same_user_fingerprint_sha256: sessions.user_fingerprint_sha256,
      sessions: sessions.totals.matched_sessions,
      assistant_messages: sessions.totals.assistant_messages,
      citations: sessions.totals.citations,
      visualizations: sessions.totals.visualizations,
      interpretation: "The known 30-message window is fully used without identity rotation. It is not 30 verified answers and does not exhaust INSAIGHTS.",
    },
    public_api_universe: {
      cube_dossiers: apiCubes,
      catalog_cubes: apiCubes,
      data_probes: apiDataProbes,
      data_returned: apiReturned,
      percent: percent(apiDataProbes, apiCubes),
      time_member_probes: dossier.counts.time_member_probes,
      time_member_probe_ok: dossier.counts.time_member_probe_ok,
      hidden_in_ui_cubes: dossier.counts.hidden_in_ui_cubes,
      dimensions: dossier.counts.dimensions,
      hierarchies: dossier.counts.hierarchies,
      levels: dossier.counts.levels,
      measures: dossier.counts.measures,
      compatibility_candidates: dossier.counts.compatibility_candidates,
      proven_safe_joins: 0,
      interpretation: "Complete dossier and one sample data probe per public catalog cube; not full-row, rights, join, or live-answer coverage.",
    },
  },
  capability_surfaces: {
    session_history: {
      matched_sessions: sessions.totals.matched_sessions,
      messages: sessions.totals.messages,
      user_messages: sessions.totals.user_messages,
      assistant_messages: sessions.totals.assistant_messages,
      citations: sessions.totals.citations,
      visualizations: sessions.totals.visualizations,
      auth_token_persisted: sessions.auth_token_persisted,
    },
    pdf: sessions.pdf_direct_probe,
    write_operations: {
      rename_test: sessions.rename_test,
      delete_test: sessions.delete_test,
    },
  },
  material_findings: [
    {
      question_id: "P04-005",
      finding: "The exact zero-row request was silently replaced with a different 17-row slice and labeled as the requested result.",
    },
    {
      question_id: "P04-007",
      finding: "The answer fabricated an HTTP 400/zero-row outcome for a query independently replayed with four rows.",
    },
    {
      question_id: "P04-015",
      finding: "Measures were attributed to the wrong GDP cube and an existing oil-price cube with Base Year 2005 was declared unavailable.",
    },
    {
      question_id: "P04-019",
      finding: "GDP and SAMA member keys were fabricated or wrong, invalidating the proposed compatibility matrix.",
    },
    {
      question_id: "P04-022",
      finding: "The 13-region sum and unweighted mean were materially miscalculated in the weighted-rate reconciliation.",
    },
    {
      question_id: "P04-026",
      finding: "The numerical calculation reproduced, but the answer invented a water measure/field name, triggering mandatory FAIL.",
    },
    {
      question_id: "P04-027",
      finding: "Field names were invented and the link presented as exact did not contain the month filter.",
    },
    {
      question_id: "P04-029/P04-030",
      finding: "Official Arabic/English API parity passed, while the INSAIGHTS answer contract failed because captions were treated as keys and links did not reproduce the slice.",
    },
  ],
  hard_boundaries: [
    "79/2304 live observations equals 3.43 percent; it is not at or above 10 percent.",
    "267/2304 equals 11.59 percent corpus representation; it is not live-platform exhaustion.",
    "277/277 equals 100 percent public API cube dossier coverage; it is not full-row or INSAIGHTS answer coverage.",
    "P04-003 was not sent; the manual probe overlaps only two of its five targets.",
    "An observed answer is not a verified answer; the adjudication verdict is the correctness control.",
    "Schema compatibility candidates are not proven joins; no safe join was established by the dossier.",
    "Public accessibility does not establish exact dataset licensing or commercial reuse rights.",
  ],
};

for (const finding of summary.material_findings) {
  if (!finding.question_id.includes("/")) {
    assert(ids.includes(finding.question_id), `Material finding references missing record: ${finding.question_id}`);
  }
}

const allJsonlPath = path.join(ADJUDICATION_ROOT, "adjudication-all.jsonl");
const summaryPath = path.join(ADJUDICATION_ROOT, "summary.json");
await writeFile(allJsonlPath, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(JSON.stringify({
  records: summary.adjudication.records,
  scored_records: summary.adjudication.score_statistics.scored_records,
  verdict_counts: summary.adjudication.verdict_counts,
  average_score: summary.adjudication.score_statistics.average_score,
  exact_observed_average_score: summary.adjudication.exact_observed_score_statistics.average_score,
  cumulative_live: `${cumulativeLive}/${methodologicalTotal} (${percent(cumulativeLive, methodologicalTotal)}%)`,
  corpus_representation: `${frozenCorpus}/${methodologicalTotal} (${percent(frozenCorpus, methodologicalTotal)}%)`,
  api_dossiers: `${apiDataProbes}/${apiCubes} (${percent(apiDataProbes, apiCubes)}%)`,
  current_window: `${todayMessages}/30 (29 exact + 1 manual; P04-003 exact not sent)`,
  outputs: [
    path.relative(ROOT, allJsonlPath),
    path.relative(ROOT, summaryPath),
  ],
}, null, 2));
