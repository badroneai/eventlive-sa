import { createHash } from "node:crypto";
import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PACKAGE_RELATIVE = "research/datasaudi-package-04-universe-exploration";
const TEXT_EXTENSIONS = new Set([
  ".css", ".html", ".js", ".json", ".jsonl", ".jsx", ".md", ".mjs", ".ts", ".tsx", ".txt", ".yaml", ".yml"
]);

const sha256 = value => createHash("sha256").update(value).digest("hex");
const round = (value, places = 2) => Number(Number(value).toFixed(places));
const expectedQuestionIds = Array.from({ length: 30 }, (_, index) => `P04-${String(index + 1).padStart(3, "0")}`);

async function exists(file) {
  try {
    await access(file);
    return true;
  }
  catch {
    return false;
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readJsonl(file) {
  return (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    }
    catch (error) {
      throw new Error(`Invalid JSONL at ${file}:${index + 1}: ${error.message}`);
    }
  });
}

async function walk(directory) {
  const output = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(full));
    else if (entry.isFile()) output.push(full);
  }
  return output;
}

function scoreOf(record) {
  const value = record.score_breakdown?.total ?? record.total_score ?? record.score?.total ?? record.score_total ?? null;
  return value == null ? null : Number(value);
}

function verdictOf(record) {
  return record.verdict ?? record.score?.classification ?? record.classification ?? null;
}

function forcedFailReasons(record) {
  return [
    ...(record.forced_fail_reasons || []),
    ...(record.mandatory_fail_rules || []),
    ...(record.score?.classification_override ? [record.score.classification_override] : []),
    ...(record.forced_fail === true ? ["forced_fail"] : [])
  ];
}

function expectedVerdictForScore(record) {
  const score = scoreOf(record);
  if (score == null) return "BLOCKED_PLATFORM";
  if (forcedFailReasons(record).length) return "FAIL";
  if (score >= 90) return "VERIFIED_PASS";
  if (score >= 70) return "USEFUL_PARTIAL";
  if (score >= 40) return "UNSAFE_PARTIAL";
  return "FAIL";
}

export async function validatePackage({ root = process.cwd() } = {}) {
  const packageRoot = path.join(root, PACKAGE_RELATIVE);
  const scriptRoot = path.join(root, "scripts/datasaudi-package-04");
  const checks = [];
  const check = (id, pass, detail) => {
    const item = { id, pass: Boolean(pass), detail };
    checks.push(item);
    return item.pass;
  };

  const prompts = await readJsonl(path.join(packageRoot, "02-live-campaign/prompts.jsonl"));
  const promptById = new Map(prompts.map(item => [item.id, item]));
  check("P04-V001.prompts-30-unique", prompts.length === 30
    && new Set(prompts.map(item => item.id)).size === 30
    && new Set(prompts.map(item => item.prompt)).size === 30
    && prompts.map(item => item.id).join("|") === expectedQuestionIds.join("|"), {
    records: prompts.length,
    unique_ids: new Set(prompts.map(item => item.id)).size,
    unique_prompts: new Set(prompts.map(item => item.prompt)).size
  });
  check("P04-V002.prompt-hashes", prompts.every(item => sha256(item.prompt) === item.prompt_sha256 || item.prompt_sha256 == null), {
    prompts_with_declared_hash: prompts.filter(item => item.prompt_sha256 != null).length
  });

  const runRelatives = [
    "03-live-observations/runs/p04-live-20260715-window2/transcripts.jsonl",
    "03-live-observations/runs/p04-live-20260715-window3/transcripts.jsonl",
    "03-live-observations/runs/p04-live-20260715-window4/transcripts.jsonl"
  ];
  const transcripts = (await Promise.all(runRelatives.map(relative => readJsonl(path.join(packageRoot, relative))))).flat();
  const manualProbe = await readJson(path.join(packageRoot, "03-live-observations/manual-ui-probe/probe.json"));
  const observedIds = transcripts.map(item => item.question_id);
  const expectedObservedIds = expectedQuestionIds.filter(id => id !== "P04-003");
  check("P04-V003.live-29-exact-plus-manual", transcripts.length === 29
    && new Set(observedIds).size === 29
    && [...observedIds].sort().join("|") === [...expectedObservedIds].sort().join("|")
    && manualProbe.message_counted_in_window === 1, {
    exact_prompts: transcripts.length,
    manual_messages: manualProbe.message_counted_in_window,
    missing_exact: expectedQuestionIds.filter(id => !observedIds.includes(id))
  });
  check("P04-V004.live-prompts-byte-exact", transcripts.every(item => {
    const prompt = promptById.get(item.question_id);
    return prompt && item.prompt === prompt.prompt && item.prompt_sha256 === sha256(prompt.prompt);
  }), {
    compared: transcripts.length
  });
  const fingerprints = new Set([...transcripts.map(item => item.stable_user_fingerprint_sha256), manualProbe.stable_user_fingerprint_sha256]);
  check("P04-V005.same-user-window", fingerprints.size === 1
    && [...fingerprints][0] === "aff3153d2aef1684cae347348dc12ad051e3af0a30b67080741c605d4f11ea90"
    && transcripts.length + manualProbe.message_counted_in_window === 30, {
    fingerprints: [...fingerprints],
    messages: transcripts.length + manualProbe.message_counted_in_window
  });
  check("P04-V006.manual-substitute-bounded", manualProbe.campaign_substitution?.coverage_status === "PARTIAL_SUBSTITUTE_2_OF_5_API_BACKFILL_REQUIRED"
    && manualProbe.campaign_substitution?.overlapping_campaign_targets?.length === 2
    && manualProbe.campaign_substitution?.campaign_targets_not_sent_to_insaights?.length === 3, manualProbe.campaign_substitution);

  const sessionSummary = await readJson(path.join(packageRoot, "06-capability-surfaces/summary.json"));
  const historyActual = [];
  for (const history of sessionSummary.histories) {
    const file = path.join(root, history.response_path);
    const bytes = await readFile(file);
    const payload = JSON.parse(bytes.toString("utf8"));
    const messages = payload.chat_management || [];
    historyActual.push({
      session_id: history.session_id,
      messages: messages.length,
      user_messages: messages.filter(item => item.role === "human").length,
      assistant_messages: messages.filter(item => item.role === "ai").length,
      sha256: sha256(bytes),
      declared_sha256: history.response_sha256
    });
  }
  const historyTotals = historyActual.reduce((totals, item) => ({
    messages: totals.messages + item.messages,
    user_messages: totals.user_messages + item.user_messages,
    assistant_messages: totals.assistant_messages + item.assistant_messages
  }), { messages: 0, user_messages: 0, assistant_messages: 0 });
  check("P04-V007.session-history-accounting", sessionSummary.histories.length === 6
    && sessionSummary.totals.messages === 60
    && sessionSummary.totals.user_messages === 30
    && sessionSummary.totals.assistant_messages === 30
    && historyTotals.messages === 60
    && historyTotals.user_messages === 30
    && historyTotals.assistant_messages === 30
    && historyActual.every(item => item.sha256 === item.declared_sha256), {
    sessions: historyActual.length,
    declared: sessionSummary.totals,
    actual: historyTotals,
    hash_mismatches: historyActual.filter(item => item.sha256 !== item.declared_sha256).map(item => item.session_id)
  });
  check("P04-V008.session-surface-boundary", sessionSummary.auth_token_persisted === false
    && sessionSummary.totals.visualizations === 0, {
    auth_token_persisted: sessionSummary.auth_token_persisted,
    citations: sessionSummary.totals.citations,
    visualizations: sessionSummary.totals.visualizations
  });

  const dossierSummary = await readJson(path.join(packageRoot, "05-universe-dossier/summary.json"));
  const dossiers = await readJsonl(path.join(packageRoot, "05-universe-dossier/cube-dossiers.jsonl"));
  const candidates = await readJsonl(path.join(packageRoot, "05-universe-dossier/compatibility-candidates.jsonl"));
  const timeProbes = dossiers.filter(item => item.time?.has_time_dimension === true);
  check("P04-V009.api-dossier-277", dossiers.length === 277
    && new Set(dossiers.map(item => item.cube_id)).size === 277
    && dossiers.every(item => item.data_probe?.status === "DATA_RETURNED")
    && dossierSummary.counts.data_statuses?.DATA_RETURNED === 277, {
    dossiers: dossiers.length,
    unique_cubes: new Set(dossiers.map(item => item.cube_id)).size,
    statuses: dossierSummary.counts.data_statuses
  });
  check("P04-V010.time-and-hidden-accounting", timeProbes.length === 270
    && timeProbes.every(item => item.time.member_probe.status === "OK")
    && dossiers.filter(item => item.hide_in_ui === true).length === 26
    && dossierSummary.counts.time_member_probe_ok === 270
    && dossierSummary.counts.hidden_in_ui_cubes === 26, {
    time_probes: timeProbes.length,
    time_probe_ok: timeProbes.filter(item => item.time.member_probe.status === "OK").length,
    hidden: dossiers.filter(item => item.hide_in_ui === true).length
  });
  check("P04-V011.compatibility-candidates-not-joins", candidates.length === 7851
    && candidates.every(item => item.safe_join_proven === false)
    && candidates.every(item => item.verdict === "CANDIDATE_ONLY_REQUIRES_MEMBER_KEY_AND_GRAIN_REVIEW"), {
    candidates: candidates.length,
    proven_safe_joins: candidates.filter(item => item.safe_join_proven === true).length
  });

  const pdf = sessionSummary.pdf_direct_probe;
  const pdfBytes = await readFile(path.join(root, pdf.path));
  check("P04-V012.pdf-valid-and-reviewed", pdf.status === 200
    && pdf.ok === true
    && pdf.content_type === "application/pdf"
    && pdfBytes.length === pdf.bytes
    && pdfBytes.length > 50_000
    && pdfBytes.subarray(0, 4).toString("ascii") === "%PDF"
    && sha256(pdfBytes) === pdf.sha256
    && await exists(path.join(packageRoot, "06-capability-surfaces/PDF-VERIFICATION.md")), {
    status: pdf.status,
    bytes: pdfBytes.length,
    sha256: sha256(pdfBytes),
    reviewed: await exists(path.join(packageRoot, "06-capability-surfaces/PDF-VERIFICATION.md"))
  });

  const aggregatePath = path.join(packageRoot, "04-adjudication/adjudication-all.jsonl");
  const adjudicationSummaryPath = path.join(packageRoot, "04-adjudication/summary.json");
  const [aggregate, adjudicationSummary] = await Promise.all([readJsonl(aggregatePath), readJson(adjudicationSummaryPath)]);
  const sourceRelatives = [
    "04-adjudication/manual/adjudication.jsonl",
    "04-adjudication/shard-a/adjudication.jsonl",
    "04-adjudication/shard-b/adjudication.jsonl",
    "04-adjudication/shard-c/adjudication.jsonl"
  ];
  const sourceRecords = (await Promise.all(sourceRelatives.map(relative => readJsonl(path.join(packageRoot, relative))))).flat();
  const campaignRecords = aggregate.filter(item => expectedQuestionIds.includes(item.question_id));
  const manualSubstitutes = aggregate.filter(item => item.question_id === "P04-MANUAL-UI-001" && item.substitutes_for === "P04-003");
  const scoredCampaign = campaignRecords.filter(item => scoreOf(item) != null);
  check("P04-V013.adjudication-accounting", aggregate.length === 31
    && sourceRecords.length === 31
    && campaignRecords.length === 30
    && new Set(campaignRecords.map(item => item.question_id)).size === 30
    && scoredCampaign.length === 29
    && campaignRecords.find(item => item.question_id === "P04-003")?.verdict === "BLOCKED_PLATFORM"
    && scoreOf(campaignRecords.find(item => item.question_id === "P04-003")) == null
    && manualSubstitutes.length === 1, {
    aggregate_records: aggregate.length,
    source_records: sourceRecords.length,
    campaign_records: campaignRecords.length,
    scored_campaign_records: scoredCampaign.length,
    manual_substitutes: manualSubstitutes.length
  });
  const sourceByComposite = new Map(sourceRecords.map(item => [`${item.question_id}|${item.substitutes_for || ""}`, item]));
  const aggregateMismatches = aggregate.flatMap(item => {
    const source = sourceByComposite.get(`${item.question_id}|${item.substitutes_for || ""}`);
    if (!source) return [{ question_id: item.question_id, issue: "missing_source" }];
    const issues = [];
    if (scoreOf(item) !== scoreOf(source)) issues.push("score");
    if (verdictOf(item) !== verdictOf(source)) issues.push("verdict");
    return issues.length ? [{ question_id: item.question_id, issues }] : [];
  });
  const scoreVerdictMismatches = aggregate.filter(item => verdictOf(item) !== expectedVerdictForScore(item)).map(item => ({
    question_id: item.question_id,
    score: scoreOf(item),
    actual: verdictOf(item),
    expected: expectedVerdictForScore(item),
    forced_fail_reasons: forcedFailReasons(item)
  }));
  check("P04-V014.adjudication-score-verdict-integrity", aggregateMismatches.length === 0
    && scoreVerdictMismatches.length === 0
    && aggregate.every(item => scoreOf(item) == null || (Number.isFinite(scoreOf(item)) && scoreOf(item) >= 0 && scoreOf(item) <= 100)), {
    source_mismatches: aggregateMismatches,
    threshold_mismatches: scoreVerdictMismatches
  });
  const verdictCounts = Object.fromEntries(["VERIFIED_PASS", "USEFUL_PARTIAL", "UNSAFE_PARTIAL", "FAIL", "BLOCKED_PLATFORM"].map(verdict => [verdict, aggregate.filter(item => verdictOf(item) === verdict).length]));
  const scoredAll = aggregate.filter(item => scoreOf(item) != null);
  const scoreTotal = scoredAll.reduce((sum, item) => sum + scoreOf(item), 0);
  check("P04-V015.adjudication-summary-reconciles", adjudicationSummary.adjudication.records === aggregate.length
    && adjudicationSummary.adjudication.exact_campaign_records === campaignRecords.length
    && adjudicationSummary.adjudication.exact_prompts_observed_and_scored === scoredCampaign.length
    && adjudicationSummary.adjudication.manual_live_observations_scored === manualSubstitutes.length
    && JSON.stringify(adjudicationSummary.adjudication.verdict_counts) === JSON.stringify(verdictCounts)
    && adjudicationSummary.adjudication.score_statistics.scored_records === scoredAll.length
    && adjudicationSummary.adjudication.score_statistics.score_total === scoreTotal
    && adjudicationSummary.adjudication.score_statistics.average_score === round(scoreTotal / scoredAll.length), {
    computed: { verdict_counts: verdictCounts, scored_records: scoredAll.length, score_total: scoreTotal, average_score: round(scoreTotal / scoredAll.length) },
    declared: { verdict_counts: adjudicationSummary.adjudication.verdict_counts, score_statistics: adjudicationSummary.adjudication.score_statistics }
  });

  const coverage = adjudicationSummary.coverage_truth;
  const baseline = await readJson(path.join(packageRoot, "00-governance/coverage-baseline.json"));
  const liveObserved = baseline.denominators.live_insaights_observation.observed_responses + 30;
  check("P04-V016.denominators-remain-separate", baseline.denominators.frozen_question_corpus.knowledge_answers_closed === 267
    && baseline.denominators.methodological_campaign_universe.target_executions === 2304
    && coverage.methodological_campaign.represented_corpus === 267
    && coverage.methodological_campaign.target_executions === 2304
    && coverage.cumulative_live_insaights.observed_responses === liveObserved
    && coverage.cumulative_live_insaights.percent === round(liveObserved / 2304 * 100)
    && coverage.public_api_universe.cube_dossiers === 277
    && coverage.public_api_universe.percent === 100
    && coverage.current_window.messages_used === 30
    && coverage.current_window.exact_campaign_prompts_sent === 29
    && coverage.current_window.manual_probe_messages_sent === 1, {
    knowledge_corpus: `${coverage.methodological_campaign.represented_corpus}/${coverage.methodological_campaign.target_executions}`,
    live: `${coverage.cumulative_live_insaights.observed_responses}/${coverage.cumulative_live_insaights.target_executions}`,
    live_percent: coverage.cumulative_live_insaights.percent,
    api_dossiers: `${coverage.public_api_universe.cube_dossiers}/${coverage.public_api_universe.catalog_cubes}`
  });
  check("P04-V017.boundary-language-explicit", adjudicationSummary.hard_boundaries.some(item => item.includes("79/2304") && item.includes("3.43"))
    && adjudicationSummary.hard_boundaries.some(item => item.includes("267/2304") && item.includes("11.59"))
    && adjudicationSummary.hard_boundaries.some(item => item.includes("277/277") && item.includes("100"))
    && adjudicationSummary.hard_boundaries.some(item => item.includes("P04-003")), adjudicationSummary.hard_boundaries);

  const textFiles = [];
  for (const directory of [packageRoot, scriptRoot]) {
    for (const file of await walk(directory)) {
      if (TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) textFiles.push(file);
    }
  }
  const secretPatterns = [
    /\bBearer\s+(?!\[REDACTED\])(?:eyJ|[A-Za-z0-9_-]{24})[A-Za-z0-9._~-]*/i,
    /["'](?:access_token|auth_token|bearer_token|token)["']\s*:\s*["'](?!\[REDACTED\]|NOT_PERSISTED|false|null)[A-Za-z0-9._~-]{20,}["']/i
  ];
  const secretHits = [];
  for (const file of textFiles) {
    const text = await readFile(file, "utf8");
    if (secretPatterns.some(pattern => pattern.test(text))) secretHits.push(path.relative(root, file));
  }
  check("P04-V018.no-persisted-bearer-token", secretHits.length === 0 && sessionSummary.auth_token_persisted === false, {
    scanned_text_files: textFiles.length,
    hits: secretHits,
    declared_auth_token_persisted: sessionSummary.auth_token_persisted
  });

  const failures = checks.filter(item => !item.pass);
  return {
    schema_version: "1.0",
    package_id: "datasaudi-package-04-universe-exploration",
    validation_mode: "CONTENT_AND_ACCOUNTING_INTEGRITY",
    verdict: failures.length ? "FAIL" : "PASS",
    checks_total: checks.length,
    checks_passed: checks.length - failures.length,
    failures,
    metrics: {
      prompts: prompts.length,
      exact_live_prompts: transcripts.length,
      manual_window_messages: manualProbe.message_counted_in_window,
      same_user_fingerprint_sha256: [...fingerprints][0],
      server_user_messages: historyTotals.user_messages,
      server_assistant_messages: historyTotals.assistant_messages,
      api_dossiers: dossiers.length,
      api_time_probes: timeProbes.length,
      hidden_cubes: dossiers.filter(item => item.hide_in_ui === true).length,
      compatibility_candidates: candidates.length,
      proven_safe_joins: candidates.filter(item => item.safe_join_proven === true).length,
      adjudication_records: aggregate.length,
      adjudicated_exact_observations: scoredCampaign.length,
      blocked_exact_prompts: campaignRecords.length - scoredCampaign.length,
      manual_substitutes: manualSubstitutes.length,
      adjudication_verdict_counts: verdictCounts,
      denominators: {
        knowledge_corpus: { numerator: 267, denominator: 2304, percent: 11.59 },
        live_observations: { numerator: liveObserved, denominator: 2304, percent: round(liveObserved / 2304 * 100) },
        public_api_cube_dossiers: { numerator: 277, denominator: 277, percent: 100 }
      }
    },
    checks
  };
}

async function cli() {
  const report = await validatePackage();
  const writeIndex = process.argv.indexOf("--write");
  if (writeIndex !== -1) {
    const target = process.argv[writeIndex + 1];
    if (!target) throw new Error("--write requires a target path");
    await writeFile(path.resolve(target), `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify({
    verdict: report.verdict,
    checks: `${report.checks_passed}/${report.checks_total}`,
    failures: report.failures.map(item => item.id),
    metrics: report.metrics
  }));
  if (report.verdict !== "PASS") process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await cli();
