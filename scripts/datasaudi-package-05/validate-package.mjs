import { createHash } from "node:crypto";
import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildExecutionClosure } from "./build-execution-closure.mjs";

const PACKAGE_ID = "datasaudi-package-05-execution-closure";
const PACKAGE_RELATIVE = `research/${PACKAGE_ID}`;
const SCRIPT_RELATIVE = "scripts/datasaudi-package-05";
const ALLOWED_TERMINAL = new Set([
  "CLOSED_VERIFIED_REPORTED",
  "CLOSED_VERIFIED_CALCULATED",
  "CLOSED_VALID_NEGATIVE",
  "CLOSED_DOCUMENTED_NOT_COMPUTABLE",
  "CLOSED_EVIDENCE_BOUND_INFERENCE"
]);
const TEXT_EXTENSIONS = new Set([".json", ".jsonl", ".md", ".mjs", ".txt", ".html", ".csv", ".tsv"]);
const sha256 = value => createHash("sha256").update(value).digest("hex");

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

async function exists(file) {
  try {
    await access(file);
    return true;
  }
  catch {
    return false;
  }
}

async function walk(directory) {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function stableHash(value) {
  return sha256(JSON.stringify(value));
}

export function executionRecordErrors(record, canonical) {
  const errors = [];
  if (!record || !canonical) return ["MISSING_RECORD_OR_CANONICAL"];
  if (sha256(record.prompt || "") !== record.prompt_sha256) errors.push("PROMPT_HASH_MISMATCH");
  if (sha256(record.answer_text || "") !== record.answer_sha256) errors.push("ANSWER_HASH_MISMATCH");
  if (record.canonical_answer_id !== canonical.canonical_answer_id) errors.push("CANONICAL_ID_MISMATCH");
  if (record.semantic_id !== canonical.semantic_id) errors.push("SEMANTIC_ID_MISMATCH");
  if (record.answer_sha256 !== canonical.answer_sha256) errors.push("CANONICAL_ANSWER_HASH_MISMATCH");
  if (record.terminal_state !== canonical.terminal_state || !ALLOWED_TERMINAL.has(record.terminal_state)) errors.push("TERMINAL_STATE_MISMATCH");
  if (record.proof_source_question_id !== canonical.proof_source.question_id) errors.push("PROOF_SOURCE_MISMATCH");
  if (record.proof_source_answer_sha256 !== canonical.proof_source.original_answer_sha256) errors.push("PROOF_HASH_MISMATCH");
  if (record.source_snapshot_as_of_utc !== canonical.source_snapshot_as_of_utc) errors.push("SNAPSHOT_BOUNDARY_MISMATCH");
  if (record.live_insaights_status !== "NOT_EXECUTED_AS_P05") errors.push("LIVE_STATUS_OVERCLAIM");
  return errors;
}

export async function validatePackage({ root = process.cwd() } = {}) {
  const packageRoot = path.join(root, PACKAGE_RELATIVE);
  const checks = [];
  const check = (id, pass, detail) => {
    checks.push({ id, pass: Boolean(pass), detail });
  };

  const [summary, canonical, executions, invariance, crosswalk, surfaces, surfaceMatrix, officialSurfaces, officialMatrix, inputLock, upstreamManifest, upstreamLedger, expected] = await Promise.all([
    readJson(path.join(packageRoot, "SUMMARY.json")),
    readJsonl(path.join(packageRoot, "02-execution-universe/canonical-answers.jsonl")),
    readJsonl(path.join(packageRoot, "02-execution-universe/execution-answer-ledger.jsonl")),
    readJsonl(path.join(packageRoot, "03-verification/paraphrase-invariance.jsonl")),
    readJsonl(path.join(packageRoot, "04-legacy-crosswalk/original-corpus-crosswalk.jsonl")),
    readJson(path.join(packageRoot, "01-surface-alternatives/summary.json")),
    readJson(path.join(packageRoot, "01-surface-alternatives/surface-matrix.json")),
    readJson(path.join(packageRoot, "05-official-surface-universe/summary.json")),
    readJson(path.join(packageRoot, "05-official-surface-universe/surface-universe-matrix.json")),
    readJson(path.join(packageRoot, "00-governance/INPUT_LOCK.json")),
    readJson(path.join(root, "research/datasaudi-package-03c-full-closure/PACKAGE_MANIFEST.json")),
    readJsonl(path.join(root, "research/datasaudi-package-03c-full-closure/03-answer-ledger/full-answer-ledger.jsonl")),
    buildExecutionClosure({ root, write: false })
  ]);

  check("P05-V001.denominator-reconstruction", summary.denominator_reconstruction.computed_executions === 2304
    && summary.denominator_reconstruction.p05_frozen_formula === "24 domains × 8 families × 2 languages × 6 paraphrase variants"
    && summary.denominator_reconstruction.governance_status === "ASSUMPTION_FROZEN_OWNER_AUTHORIZED"
    && summary.denominator_reconstruction.historical_formula_explicitly_persisted === false, summary.denominator_reconstruction);

  check("P05-V002.core-localized-execution-counts", summary.coverage.primary_semantic_questions === 192
    && canonical.length === 384
    && executions.length === 2304
    && summary.coverage.execution_answers === 2304
    && summary.coverage.reference_execution_percent === 100, summary.coverage);

  check("P05-V003.unique-identifiers", new Set(canonical.map(item => item.canonical_answer_id)).size === 384
    && new Set(executions.map(item => item.execution_id)).size === 2304
    && new Set(executions.map(item => item.prompt_sha256)).size === 2304, {
    canonical_ids: new Set(canonical.map(item => item.canonical_answer_id)).size,
    execution_ids: new Set(executions.map(item => item.execution_id)).size,
    prompt_hashes: new Set(executions.map(item => item.prompt_sha256)).size
  });

  check("P05-V004.axis-balance", JSON.stringify(summary.composition.by_language) === JSON.stringify({ ar: 1152, en: 1152 })
    && Object.values(summary.composition.by_family).length === 8
    && Object.values(summary.composition.by_family).every(value => value === 288)
    && Object.values(summary.composition.by_domain).length === 24
    && Object.values(summary.composition.by_domain).every(value => value === 96), summary.composition);

  const groups = new Map();
  for (const execution of executions) {
    const key = execution.canonical_answer_id;
    groups.set(key, [...(groups.get(key) || []), execution]);
  }
  check("P05-V005.six-paraphrases-per-localized-answer", groups.size === 384
    && [...groups.values()].every(rows => rows.length === 6
      && new Set(rows.map(item => item.paraphrase_variant)).size === 6
      && new Set(rows.map(item => item.answer_sha256)).size === 1), {
    groups: groups.size,
    invalid_groups: [...groups].filter(([, rows]) => rows.length !== 6 || new Set(rows.map(item => item.answer_sha256)).size !== 1).map(([key]) => key)
  });

  check("P05-V006.invariance-ledger", invariance.length === 384
    && invariance.every(item => item.verdict === "PASS" && item.executions === 6 && item.unique_prompt_hashes === 6 && item.unique_answer_hashes === 1)
    && summary.paraphrase_invariance.pass === 384
    && summary.paraphrase_invariance.fail === 0, summary.paraphrase_invariance);

  const canonicalById = new Map(canonical.map(item => [item.canonical_answer_id, item]));
  const executionErrors = executions.flatMap(item => executionRecordErrors(item, canonicalById.get(item.canonical_answer_id)).map(error => ({ execution_id: item.execution_id, error })));
  check("P05-V007.execution-integrity", executionErrors.length === 0, { errors: executionErrors.slice(0, 20), total: executionErrors.length });

  check("P05-V008.answer-contract", canonical.every(item => item.answer_text.length >= 120
    && sha256(item.answer_text) === item.answer_sha256
    && ALLOWED_TERMINAL.has(item.terminal_state)
    && !/\b(?:undefined|NaN)\b|not stated|unknown to unknown|none stated/.test(item.answer_text)
    && item.answer_text.includes(item.language === "ar" ? "حدّ الحداثة" : "Freshness boundary")
    && item.live_insaights.status === "NOT_EXECUTED_AS_P05"), {
    invalid: canonical.filter(item => item.answer_text.length < 120
      || sha256(item.answer_text) !== item.answer_sha256
      || !ALLOWED_TERMINAL.has(item.terminal_state)
      || /\b(?:undefined|NaN)\b|not stated|unknown to unknown|none stated/.test(item.answer_text)).map(item => item.canonical_answer_id)
  });

  check("P05-V009.deterministic-rebuild", stableHash(summary) === stableHash(expected.summary)
    && stableHash(canonical) === stableHash(expected.canonicalAnswers)
    && stableHash(executions) === stableHash(expected.executions)
    && stableHash(invariance) === stableHash(expected.invariance)
    && stableHash(crosswalk) === stableHash(expected.originalCrosswalk), {
    summary: [stableHash(summary), stableHash(expected.summary)],
    canonical: [stableHash(canonical), stableHash(expected.canonicalAnswers)],
    executions: [stableHash(executions), stableHash(expected.executions)]
  });

  const evidencePathSet = new Set(canonical.flatMap(item => item.evidence_paths));
  const missingEvidencePaths = [];
  const evidenceHashMismatches = [];
  const upstreamByPath = new Map((upstreamManifest.files || []).map(item => [item.path, item]));
  let hashNamedEvidence = 0;
  let manifestBoundEvidence = 0;
  for (const relative of evidencePathSet) {
    const absolute = path.join(root, relative);
    if (!await exists(absolute)) {
      missingEvidencePaths.push(relative);
      continue;
    }
    const bytes = await readFile(absolute);
    const hashName = path.basename(relative).match(/^([a-f0-9]{64})\.[a-z0-9]+$/i)?.[1]?.toLowerCase();
    const manifestEntry = upstreamByPath.get(relative);
    if (hashName) {
      hashNamedEvidence += 1;
      if (sha256(bytes) !== hashName) evidenceHashMismatches.push({ path: relative, source: "CONTENT_HASH_FILENAME", expected_sha256: hashName, actual_sha256: sha256(bytes) });
    }
    else if (manifestEntry) {
      manifestBoundEvidence += 1;
      if (bytes.length !== manifestEntry.size_bytes || sha256(bytes) !== manifestEntry.sha256) {
        evidenceHashMismatches.push({ path: relative, source: "P03C_PACKAGE_MANIFEST", expected_bytes: manifestEntry.size_bytes, actual_bytes: bytes.length, expected_sha256: manifestEntry.sha256, actual_sha256: sha256(bytes) });
      }
    }
    else {
      evidenceHashMismatches.push({ path: relative, source: "NO_HASH_CONTRACT" });
    }
  }
  check("P05-V010.evidence-content-integrity", evidencePathSet.size >= 100
    && missingEvidencePaths.length === 0
    && evidenceHashMismatches.length === 0
    && hashNamedEvidence + manifestBoundEvidence === evidencePathSet.size, {
    unique: evidencePathSet.size,
    hash_named: hashNamedEvidence,
    manifest_bound: manifestBoundEvidence,
    missing: missingEvidencePaths,
    mismatches: evidenceHashMismatches.slice(0, 20)
  });

  check("P05-V011.proof-accounting", summary.proof_accounting.semantic_core_claims_total === 4034
    && summary.proof_accounting.semantic_core_claims_verified === 4003
    && summary.proof_accounting.semantic_core_claims_bounded === 31
    && summary.proof_accounting.p03c_atomic_claims_unresolved === 0, summary.proof_accounting);

  check("P05-V012.legacy-crosswalk", crosswalk.length === 267
    && crosswalk.filter(item => item.disposition === "MAPPED_INTO_P05_MAIN_UNIVERSE").length === 212
    && crosswalk.filter(item => item.disposition === "SUPPLEMENTAL_P03C_CLOSED_OUTSIDE_MAIN_UNIVERSE").length === 55
    && crosswalk.every(item => ALLOWED_TERMINAL.has(item.p03c_terminal_state)), summary.legacy_corpus_crosswalk);

  const liveBreakdown = summary.coverage.historical_live_messages_breakdown;
  check("P05-V013.live-denominator-correction", summary.coverage.live_insaights_main_universe_observed_cells === 31
    && summary.coverage.live_insaights_main_universe_percent === 1.35
    && liveBreakdown.main_universe_cells === 31
    && liveBreakdown.legacy_supplemental === 18
    && liveBreakdown.p04_capability_messages === 30
    && Object.values(liveBreakdown).reduce((sum, value) => sum + value, 0) === 79
    && summary.coverage.historical_live_messages_all_scopes === 79, summary.coverage);

  check("P05-V014.language-prompts", executions.filter(item => item.language === "en").every(item => !/[\u0600-\u06ff]/.test(item.prompt))
    && executions.filter(item => item.language === "ar").every(item => /[\u0600-\u06ff]/.test(item.prompt)), {
    english_with_arabic: executions.filter(item => item.language === "en" && /[\u0600-\u06ff]/.test(item.prompt)).map(item => item.execution_id).slice(0, 20),
    arabic_without_arabic: executions.filter(item => item.language === "ar" && !/[\u0600-\u06ff]/.test(item.prompt)).map(item => item.execution_id).slice(0, 20)
  });

  check("P05-V015.surface-probe-boundary", surfaces.mode === "PUBLIC_OFFICIAL_SURFACE_PROBES_NO_CHAT_MESSAGES"
    && surfaces.chat_messages_consumed === 0
    && surfaces.authentication_used === false
    && surfaces.observations.length === 19
    && surfaceMatrix.rows.length === 10, {
    mode: surfaces.mode,
    chat_messages_consumed: surfaces.chat_messages_consumed,
    authentication_used: surfaces.authentication_used,
    observations: surfaces.observations.length,
    matrix_rows: surfaceMatrix.rows.length
  });

  const evidenceMismatches = [];
  for (const observation of surfaces.observations) {
    const bytes = await readFile(path.join(root, observation.response.evidence_path));
    if (bytes.length !== observation.response.bytes || sha256(bytes) !== observation.response.sha256) {
      evidenceMismatches.push({ id: observation.id, expected_bytes: observation.response.bytes, actual_bytes: bytes.length, expected_sha256: observation.response.sha256, actual_sha256: sha256(bytes) });
    }
  }
  check("P05-V016.surface-evidence-content-addressed", evidenceMismatches.length === 0, { mismatches: evidenceMismatches });

  const capabilities = surfaces.capabilities;
  check("P05-V017.api-analytical-capabilities", capabilities.openapi.status === 200
    && capabilities.openapi.declared_paths >= 10
    && ["ranking", "sort", "time", "top", "growth", "exclude", "include", "filters", "alias", "limit"].every(item => capabilities.openapi.data_features.includes(item))
    && capabilities.server_ranking.verified_usable === true
    && capabilities.server_growth.verified_usable === true
    && capabilities.filters_include_alias_sort.verified_usable === true, capabilities);

  check("P05-V018.multiquery-safety", capabilities.multiquery_common_grain.status === 200
    && capabilities.multiquery_common_grain.verified_usable === true
    && capabilities.multiquery_common_grain.columns.join("|") === "Year|GDP|Number of Building Permits"
    && /grain/i.test(capabilities.multiquery_common_grain.safety_boundary)
    && /member.?key/i.test(capabilities.multiquery_common_grain.safety_boundary)
    && /partial.?period/i.test(capabilities.multiquery_common_grain.safety_boundary), capabilities.multiquery_common_grain);

  const formats = capabilities.response_formats;
  check("P05-V019.export-format-truth", ["jsonrecords", "jsonarrays", "csv", "csvbom", "tsv", "tsvbom"].every(item => formats[item].status === 200 && formats[item].usable_nonempty === true)
    && ["xlsx", "parquet"].every(item => formats[item].status === 200 && formats[item].bytes === 0 && formats[item].usable_nonempty === false), formats);

  check("P05-V020.web-surfaces-reachable", Object.values(capabilities.web_surfaces).every(status => status === 200), capabilities.web_surfaces);

  const scannedFiles = [];
  for (const directory of [packageRoot, path.join(root, SCRIPT_RELATIVE), path.join(root, "tests/datasaudi-package-05")]) {
    for (const file of await walk(directory)) if (TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) scannedFiles.push(file);
  }
  const secretPatterns = [
    /\bBearer\s+(?!\[REDACTED\])(?:eyJ|[A-Za-z0-9_-]{24})[A-Za-z0-9._~-]*/i,
    /["'](?:access_token|auth_token|bearer_token|token|api_key|client_secret|private_key|password)["']\s*[:=]\s*["'](?!\[REDACTED\]|NOT_PERSISTED|false|null)[A-Za-z0-9._~+\/-]{20,}["']/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:sk|gh[pousr])_[A-Za-z0-9_-]{20,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /[?&](?:access_token|auth_token|api_key|client_secret|token)=[A-Za-z0-9._~+\/-]{20,}/i
  ];
  const secretHits = [];
  for (const file of scannedFiles) {
    const text = await readFile(file, "utf8");
    if (secretPatterns.some(pattern => pattern.test(text))) secretHits.push(path.relative(root, file));
  }
  check("P05-V021.no-persisted-secrets", secretHits.length === 0, { scanned_files: scannedFiles.length, hits: secretHits });

  check("P05-V022.boundary-language", summary.boundaries.some(item => item.includes("2304/2304") && item.includes("not live INSAIGHTS"))
    && summary.boundaries.some(item => item.includes("31/2304") && item.includes("79"))
    && summary.boundaries.some(item => item.includes("Six paraphrases"))
    && surfaces.boundaries.some(item => item.includes("No identity rotation")), { summary: summary.boundaries, surfaces: surfaces.boundaries });

  const inputLockMismatches = [];
  for (const input of inputLock.inputs || []) {
    const absolute = path.join(root, input.path);
    if (!await exists(absolute)) {
      inputLockMismatches.push({ path: input.path, error: "MISSING" });
      continue;
    }
    const bytes = await readFile(absolute);
    if (bytes.length !== input.size_bytes || sha256(bytes) !== input.sha256) {
      inputLockMismatches.push({
        path: input.path,
        expected_bytes: input.size_bytes,
        actual_bytes: bytes.length,
        expected_sha256: input.sha256,
        actual_sha256: sha256(bytes)
      });
    }
  }
  check("P05-V023.sealed-input-lock", inputLock.lock_mode === "SEALED_INPUT_SHA256"
    && inputLock.inputs?.length === 7
    && inputLockMismatches.length === 0, {
    lock_mode: inputLock.lock_mode,
    inputs: inputLock.inputs?.length || 0,
    mismatches: inputLockMismatches
  });

  check("P05-V024.official-surface-universe", officialSurfaces.mode === "PUBLIC_OFFICIAL_SURFACE_UNIVERSE_NO_CHAT_NO_AUTH"
    && officialSurfaces.chat_messages_consumed === 0
    && officialSurfaces.authentication_used === false
    && officialSurfaces.receipts.length === 14
    && officialSurfaces.catalog.cubes === 277
    && officialSurfaces.catalog.dimensions === 722
    && officialSurfaces.catalog.hierarchies === 753
    && officialSurfaces.catalog.unique_cube_level_pairs === 992
    && officialSurfaces.catalog.bilingual_member_base_requests === 1984
    && officialSurfaces.datasets_registry.unique_cube_ids === 251
    && officialSurfaces.datasets_registry.api_only_cube_count === 26
    && officialSurfaces.sitemap_reports.urls === 503
    && officialSurfaces.embedded_profile_lists.report_targets === 219
    && officialSurfaces.explicit_grain_join.verdict === "VERIFIED_SAFE_AT_EXPLICIT_OUTPUT_GRAIN"
    && officialSurfaces.explicit_grain_join.rows === 163
    && officialSurfaces.explicit_grain_join.unique_keys === 163
    && officialSurfaces.economic_calendar.july_2026_total === 12
    && officialMatrix.rows.length === 8, {
    mode: officialSurfaces.mode,
    receipts: officialSurfaces.receipts.length,
    catalog: officialSurfaces.catalog,
    datasets_registry: officialSurfaces.datasets_registry,
    sitemap_reports: officialSurfaces.sitemap_reports,
    embedded_profile_lists: officialSurfaces.embedded_profile_lists,
    explicit_grain_join: officialSurfaces.explicit_grain_join,
    economic_calendar: officialSurfaces.economic_calendar,
    matrix_rows: officialMatrix.rows.length
  });

  const officialEvidenceMismatches = [];
  for (const receipt of officialSurfaces.receipts) {
    const bytes = await readFile(path.join(root, receipt.response.evidence_path));
    if (bytes.length !== receipt.response.bytes || sha256(bytes) !== receipt.response.sha256) {
      officialEvidenceMismatches.push({ id: receipt.id, expected_bytes: receipt.response.bytes, actual_bytes: bytes.length, expected_sha256: receipt.response.sha256, actual_sha256: sha256(bytes) });
    }
  }
  check("P05-V025.official-surface-evidence-content-addressed", officialEvidenceMismatches.length === 0, { mismatches: officialEvidenceMismatches });

  const paraphraseContractErrors = [];
  for (const [canonicalId, rows] of groups) {
    const base = rows.find(item => item.paraphrase_variant === 1);
    if (!base) {
      paraphraseContractErrors.push({ canonical_answer_id: canonicalId, error: "MISSING_VARIANT_1" });
      continue;
    }
    for (const row of rows) {
      if (!row.prompt.includes(base.prompt)) paraphraseContractErrors.push({ execution_id: row.execution_id, error: "BASE_TASK_NOT_PRESERVED_VERBATIM" });
    }
  }
  check("P05-V026.paraphrase-prompt-contract", paraphraseContractErrors.length === 0, { errors: paraphraseContractErrors.slice(0, 20), total: paraphraseContractErrors.length });

  const upstreamByQuestion = new Map(upstreamLedger.map(item => [item.question_id, item]));
  const generatedAnswerErrors = [];
  for (const answer of canonical.filter(item => item.proof_source.derivation === "DETERMINISTIC_EN_RENDER_FROM_VERIFIED_STRUCTURED_PROOF")) {
    if (/\b(?:undefined|NaN)\b|not stated|unknown to unknown|none stated/.test(answer.answer_text)) {
      generatedAnswerErrors.push({ canonical_answer_id: answer.canonical_answer_id, error: "INVALID_RENDER_LITERAL" });
    }
    const proof = upstreamByQuestion.get(answer.proof_source.question_id);
    for (const calculation of proof?.calculations || []) {
      const result = calculation.rounded_growth_percent
        ?? calculation.rounded_percentage_point_change
        ?? calculation.rounded_result_percent
        ?? calculation.output?.rounded_value
        ?? calculation.output?.value
        ?? calculation.output_value
        ?? calculation.result
        ?? calculation.value;
      if (result == null || !answer.answer_text.includes(`result=${result}`)) {
        generatedAnswerErrors.push({ canonical_answer_id: answer.canonical_answer_id, calculation_id: calculation.calculation_id, error: "STRUCTURED_CALCULATION_RESULT_NOT_RENDERED", result });
      }
    }
    for (const limitation of proof?.limitations || []) {
      const detail = typeof limitation === "string"
        ? limitation
        : limitation.detail_en || limitation.detail || limitation.detail_ar || limitation.reason_en || limitation.reason || limitation.reason_ar;
      if (detail && !answer.answer_text.includes(detail)) generatedAnswerErrors.push({ canonical_answer_id: answer.canonical_answer_id, error: "PROOF_SPECIFIC_LIMITATION_NOT_RENDERED", detail });
    }
  }
  check("P05-V027.generated-english-proof-completeness", generatedAnswerErrors.length === 0, { errors: generatedAnswerErrors.slice(0, 20), total: generatedAnswerErrors.length });

  const failures = checks.filter(item => !item.pass);
  return {
    schema_version: "1.0",
    package_id: PACKAGE_ID,
    validation_mode: "DETERMINISTIC_REBUILD_PROVENANCE_SURFACE_AND_BOUNDARY_INTEGRITY",
    verdict: failures.length ? "FAIL" : "PASS",
    checks_total: checks.length,
    checks_passed: checks.length - failures.length,
    failures,
    metrics: {
      semantic_cores: 192,
      localized_answers: canonical.length,
      execution_answers: executions.length,
      reference_execution_percent: summary.coverage.reference_execution_percent,
      live_main_cells: summary.coverage.live_insaights_main_universe_observed_cells,
      live_main_percent: summary.coverage.live_insaights_main_universe_percent,
      historical_live_all_scopes: summary.coverage.historical_live_messages_all_scopes,
      api_dossiers: summary.coverage.public_api_cube_dossiers,
      invariance_pass: invariance.filter(item => item.verdict === "PASS").length,
      legacy_mapped: summary.legacy_corpus_crosswalk.mapped_main,
      supplemental_closed: summary.legacy_corpus_crosswalk.supplemental_closed,
      surface_probes: surfaces.observations.length,
      surface_chat_messages: surfaces.chat_messages_consumed,
      evidence_paths: evidencePathSet.size,
      surface_evidence_files: surfaces.observations.length,
      official_surface_receipts: officialSurfaces.receipts.length,
      official_report_targets: officialSurfaces.embedded_profile_lists.report_targets,
      explicit_grain_join_rows: officialSurfaces.explicit_grain_join.rows
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
  console.log(JSON.stringify({ verdict: report.verdict, checks: `${report.checks_passed}/${report.checks_total}`, failures: report.failures.map(item => item.id), metrics: report.metrics }));
  if (report.verdict !== "PASS") process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await cli();
