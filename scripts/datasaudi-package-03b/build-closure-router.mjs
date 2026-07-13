import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packageId = "datasaudi-package-03b-closure-router";
const packageRoot = path.join(root, "research", packageId);
const reportRoot = path.join(root, "reports", packageId);
const expectedPackage03Tree = "e8cf1fe8c7aeea306a081effc78b398c8d5621557cc51e5720f83a1629593862";
const expectedPackage03ATree = "2a048ed1f7424d66ed849647c32fc7dfe9c05fc168fa226c02c7457a114b2bd4";
const sha256 = value => createHash("sha256").update(value).digest("hex");
const relative = file => path.relative(root, file).split(path.sep).join("/");
const sourcePath = relativePath => path.join(root, relativePath);
const json = async relativePath => JSON.parse(await readFile(sourcePath(relativePath), "utf8"));
const jsonl = async relativePath => (await readFile(sourcePath(relativePath), "utf8"))
  .split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJson = async (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const writeJsonl = async (file, rows) => writeFile(file, `${rows.map(row => JSON.stringify(row)).join("\n")}\n`);
const countBy = (rows, selector) => Object.fromEntries([...new Set(rows.map(selector))]
  .sort().map(key => [key, rows.filter(row => selector(row) === key).length]));

async function walk(directory, excluded = new Set()) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full, excluded));
    else if (entry.isFile() && !excluded.has(entry.name)) files.push(full);
  }
  return files;
}

async function describe(relativePath) {
  const file = sourcePath(relativePath);
  const bytes = await readFile(file);
  return { path: relativePath, sha256: sha256(bytes), size_bytes: (await stat(file)).size };
}

async function verifySealedManifest(relativePath, expectedTree) {
  const manifestBytes = await readFile(sourcePath(relativePath));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.tree_sha256 !== expectedTree) {
    throw new Error(`${relativePath}: sealed tree changed (${manifest.tree_sha256})`);
  }
  const lines = [];
  for (const item of manifest.artifacts) {
    const bytes = await readFile(sourcePath(item.path));
    const size = (await stat(sourcePath(item.path))).size;
    const actual = sha256(bytes);
    if (actual !== item.sha256 || size !== item.size_bytes) {
      throw new Error(`${item.path}: sealed artifact does not match its manifest`);
    }
    lines.push(`${actual}  ${item.path}`);
  }
  if (manifest.artifact_count !== manifest.artifacts.length || sha256(lines.join("\n")) !== expectedTree) {
    throw new Error(`${relativePath}: sealed manifest denominator/tree invalid`);
  }
  return { manifest, bytes: manifestBytes };
}

const source = {
  corpus: "research/datasaudi-insaights/04-question-corpus/questions.jsonl",
  gold: "research/datasaudi-package-03/02-source-oracle-and-evidence-vault/gold-case-specs.jsonl",
  oracle: "research/datasaudi-package-03/02-source-oracle-and-evidence-vault/oracle-evidence.jsonl",
  oracleManifest: "research/datasaudi-package-03/02-source-oracle-and-evidence-vault/oracle-manifest.json",
  truth: "research/datasaudi-package-03/04-proposition-verifier-and-adjudication/truth-closure-summary.json",
  retryQueue: "research/datasaudi-package-03/05-quota-safe-live-retry/retry-queue.jsonl",
  remainingQueue: "research/datasaudi-package-03a-question-closure/03-adjudication/remaining-unsent-queue.jsonl",
  variantQueue: "research/datasaudi-package-03a-question-closure/03-adjudication/next-variant-queue.jsonl",
  executionSummary: "research/datasaudi-package-03a-question-closure/03-adjudication/execution-summary.json",
  package03ACloseout: "research/datasaudi-package-03a-question-closure/04-closeout/round-closeout.json",
  package03Closeout: "research/datasaudi-package-03/12-stage-gate-manifest-and-closeout/package-03-closeout.json",
  package03Manifest: "research/datasaudi-package-03/PACKAGE_MANIFEST.json",
  package03AManifest: "research/datasaudi-package-03a-question-closure/PACKAGE_MANIFEST.json"
};

const package03Seal = await verifySealedManifest(source.package03Manifest, expectedPackage03Tree);
const package03ASeal = await verifySealedManifest(source.package03AManifest, expectedPackage03ATree);
const truth = await json(source.truth);
const propositionsPath = truth.artifacts.propositions.path;
const resultsPath = truth.artifacts.results.path;
const adjudicationPath = truth.artifacts.adjudication.path;
const accountingPath = truth.artifacts.answer_accounting.path;
const lockedPaths = [...Object.values(source), propositionsPath, resultsPath, adjudicationPath, accountingPath];
const lockedInputs = [];
for (const item of [...new Set(lockedPaths)]) lockedInputs.push(await describe(item));
lockedInputs.sort((a, b) => a.path.localeCompare(b.path));

const generatedAt = new Date().toISOString();
const inputLock = {
  schema_version: "1.0",
  package_id: packageId,
  locked_at_utc: generatedAt,
  policy: "Read-only derivation from sealed Package 03/03A evidence. No live request and no adjudication mutation.",
  package_03: {
    root: "research/datasaudi-package-03",
    tree_sha256: expectedPackage03Tree,
    artifact_count: package03Seal.manifest.artifact_count,
    manifest_sha256: sha256(package03Seal.bytes)
  },
  package_03a: {
    root: "research/datasaudi-package-03a-question-closure",
    tree_sha256: expectedPackage03ATree,
    artifact_count: package03ASeal.manifest.artifact_count,
    manifest_sha256: sha256(package03ASeal.bytes)
  },
  inputs: lockedInputs,
  input_fingerprint: sha256(lockedInputs.map(item => `${item.sha256}  ${item.path}`).join("\n"))
};

const [corpus, goldSpecs, oracleEvidence, propositions, verificationResults, adjudications,
  retryQueue, remainingQueue, variants, executionSummary, package03ACloseout, package03Closeout] = await Promise.all([
  jsonl(source.corpus), jsonl(source.gold), jsonl(source.oracle), jsonl(propositionsPath),
  jsonl(resultsPath), jsonl(adjudicationPath), jsonl(source.retryQueue), jsonl(source.remainingQueue),
  jsonl(source.variantQueue), json(source.executionSummary), json(source.package03ACloseout), json(source.package03Closeout)
]);

if (corpus.length !== 267 || goldSpecs.length !== 98) throw new Error("Unexpected corpus/Gold denominator");
if (truth.run_id !== "truth-run-20260713T021707685Z-752501f6") throw new Error("Truth run is not the sealed latest run");
if (package03Closeout.portfolio_decision !== "NO_BUILD" || package03Closeout.package_04_authorized !== false) {
  throw new Error("Package 03 authority boundary changed");
}

const questionById = new Map(corpus.map(item => [item.question_id, item]));
const propositionById = new Map(propositions.map(item => [item.proposition_id, item]));
const resultById = new Map(verificationResults.map(item => [item.proposition_id, item]));
const pending = adjudications.filter(item => item.disposition === "pending-independent-review");
const reviewPacket = pending.map(adjudication => {
  const proposition = propositionById.get(adjudication.proposition_id);
  const result = resultById.get(adjudication.proposition_id);
  const question = questionById.get(adjudication.question_id);
  if (!proposition || !result || !question || !result.evidence) {
    throw new Error(`Incomplete review join for ${adjudication.proposition_id}`);
  }
  const temporal = proposition.proposition_type === "temporal_coverage";
  const availability = proposition.proposition_type === "dataset_availability";
  if (!temporal && !availability) throw new Error(`Unexpected pending type ${proposition.proposition_type}`);
  const claimed = temporal ? proposition.claimed_latest_period : proposition.value;
  const observed = temporal ? result.evidence.observed_max_period : result.evidence.exists;
  const evidencePayloadSha = sha256(JSON.stringify(result.evidence));
  return {
    schema_version: "1.0",
    review_id: `P03B-REVIEW-${sha256(adjudication.proposition_id).slice(0, 24)}`,
    status: "PENDING_INDEPENDENT_REVIEW",
    decision_recorded: false,
    proposition_id: proposition.proposition_id,
    adjudication_id: adjudication.adjudication_id,
    answer_id: proposition.answer_id,
    question_id: question.question_id,
    canonical_id: question.canonical_id,
    domain: question.domain,
    domain_label_ar: question.domain_label_ar,
    family: question.family,
    language: question.language,
    prompt: question.prompt,
    statement: proposition.statement,
    statement_sha256: proposition.statement_sha256,
    proposition_type: proposition.proposition_type,
    claimed,
    observed,
    source_cubes: [...new Set([
      ...(proposition.source_cubes || []),
      ...(result.source_cubes_considered || []),
      ...(result.evidence.cube ? [result.evidence.cube] : [])
    ])],
    machine_result: result.result,
    machine_disposition: result.disposition,
    reason: result.reason,
    evidence: result.evidence,
    evidence_complete: true,
    evidence_ref: {
      path: resultsPath,
      sha256: truth.artifacts.results.sha256,
      proposition_id: proposition.proposition_id,
      payload_sha256: evidencePayloadSha
    },
    adjudication_policy: adjudication.policy,
    safe_next_action: "Independent reviewer reproduces the cited proof and records a separate signed disposition; this package does not decide the claim."
  };
});

const reviewTypes = countBy(reviewPacket, item => item.proposition_type);
const reviewQuestionCount = new Set(reviewPacket.map(item => item.question_id)).size;
if (reviewPacket.length !== 39 || reviewQuestionCount !== 13
  || reviewTypes.temporal_coverage !== 29 || reviewTypes.dataset_availability !== 10
  || reviewPacket.some(item => !item.evidence_complete || item.decision_recorded)) {
  throw new Error("Independent-review denominator does not match the sealed truth run");
}

const evidenceByCube = new Map(oracleEvidence.map(item => [item.cube, item]));
const goldIds = new Set(goldSpecs.map(item => item.question_id));
const familyOrder = new Map(["direct", "series", "rank", "derive", "explain", "cross", "opportunity"]
  .map((family, index) => [family, index]));
const originalOrder = new Map(corpus.map((item, index) => [item.question_id, index]));
const laterQuestions = corpus.filter(item => !goldIds.has(item.question_id)).sort((a, b) =>
  familyOrder.get(a.family) - familyOrder.get(b.family)
  || originalOrder.get(a.question_id) - originalOrder.get(b.question_id));
if (laterQuestions.length !== 169) throw new Error("Later-wave denominator changed");

const batchSizes = [30, 30, 30, 30, 30, 19];
let offset = 0;
const batchAssignments = new Map();
for (let index = 0; index < batchSizes.length; index += 1) {
  for (const item of laterQuestions.slice(offset, offset + batchSizes[index])) {
    batchAssignments.set(item.question_id, `P03B-B${String(index + 1).padStart(2, "0")}`);
  }
  offset += batchSizes[index];
}

const laterSpecs = laterQuestions.map(question => {
  const cubeEvidence = question.candidate_cubes.map(cube => evidenceByCube.get(cube)).filter(Boolean);
  const readiness = question.candidate_cubes.length === 0
    ? "contract-only"
    : cubeEvidence.length === question.candidate_cubes.length && cubeEvidence.every(item => item.oracle_status === "replayed")
      ? "source-ready"
      : "source-review-required";
  const expectedBehavior = [...new Set([
    ...question.expected_behavior,
    ...(question.family === "cross" ? ["compatibility_matrix", "cite_all_datasets", "no_unsupported_causality"] : [])
  ])];
  const mustNot = ["invent_source", "invent_value", "unsupported_causality", "collapse_period_unit_geography"];
  const promptSha = sha256(question.prompt);
  return {
    schema_version: "1.0",
    spec_id: `P03B-SPEC-${sha256(`${question.question_id}|${promptSha}`).slice(0, 24)}`,
    state: "PREREGISTERED_NOT_SENT",
    batch_id: batchAssignments.get(question.question_id),
    question_id: question.question_id,
    canonical_id: question.canonical_id,
    domain: question.domain,
    domain_label_ar: question.domain_label_ar,
    family: question.family,
    language: question.language,
    priority: question.priority,
    prompt: question.prompt,
    prompt_sha256: promptSha,
    source_record_sha256: sha256(JSON.stringify(question)),
    expected_behavior: expectedBehavior,
    candidate_cubes: question.candidate_cubes,
    oracle_readiness: readiness,
    oracle_evidence_refs: cubeEvidence.map(item => ({
      cube: item.cube,
      evidence_id: item.evidence_id,
      oracle_status: item.oracle_status,
      response_path: item.response_path,
      response_sha256: item.response_sha256
    })),
    assertion_contract: { must: expectedBehavior, must_not: mustNot },
    truth_policy: "The contract and source references are frozen before any future answer. Not-sent is not an answer and cannot be scored."
  };
});

const readinessCounts = countBy(laterSpecs, item => item.oracle_readiness);
if (readinessCounts["source-ready"] !== 120 || readinessCounts["contract-only"] !== 49
  || (readinessCounts["source-review-required"] || 0) !== 0) {
  throw new Error("Later-wave readiness denominator changed");
}
if (new Set(laterSpecs.flatMap(item => item.candidate_cubes)).size !== 34) {
  throw new Error("Expected exactly 34 covered candidate cubes");
}

const batches = batchSizes.map((size, index) => {
  const batchId = `P03B-B${String(index + 1).padStart(2, "0")}`;
  const items = laterSpecs.filter(item => item.batch_id === batchId);
  if (items.length !== size) throw new Error(`${batchId}: invalid batch size`);
  return {
    batch_id: batchId,
    sequence: index + 1,
    capacity: 30,
    count: items.length,
    state: "PREREGISTERED_NOT_SENT",
    family_counts: countBy(items, item => item.family),
    readiness_counts: {
      source_ready: items.filter(item => item.oracle_readiness === "source-ready").length,
      contract_only: items.filter(item => item.oracle_readiness === "contract-only").length,
      source_review_required: items.filter(item => item.oracle_readiness === "source-review-required").length
    },
    spec_ids: items.map(item => item.spec_id),
    question_ids: items.map(item => item.question_id)
  };
});
const campaignBatches = {
  schema_version: "1.0",
  package_id: packageId,
  status: "PREREGISTERED_NOT_SENT",
  policy: "Batch membership is frozen. Execution requires a separate observed reset receipt and owner authorization.",
  questions: laterSpecs.length,
  batches_count: batches.length,
  batch_counts: batches.map(item => item.count),
  source_ready: readinessCounts["source-ready"],
  contract_only: readinessCounts["contract-only"],
  source_review_required: readinessCounts["source-review-required"] || 0,
  family_counts: countBy(laterSpecs, item => item.family),
  priority_counts: countBy(laterSpecs, item => item.priority),
  covered_candidate_cubes: [...new Set(laterSpecs.flatMap(item => item.candidate_cubes))].sort(),
  batches
};

const p0 = retryQueue.filter(item => item.queue_position >= 19);
const w2 = p0.slice(0, 30);
const w3 = p0.slice(30);
if (p0.length !== 49 || w2.length !== 30 || w3.length !== 19 || w2[0].question_id !== "H-19-AR"
  || remainingQueue.length !== 48 || variants.length !== 10 || executionSummary.still_without_live_answer !== 49) {
  throw new Error("P0 resume contract is not aligned with Package 03A closeout");
}
if (remainingQueue.map(item => item.question_id).join("|") !== p0.slice(1).map(item => item.question_id).join("|")) {
  throw new Error("Package 03A remaining queue diverges from the frozen P0 suffix");
}
const p0Resume = {
  schema_version: "1.0",
  package_id: packageId,
  status: "WAIT_RESET_EXECUTION_NOT_AUTHORIZED",
  observed_reset_required: true,
  frozen_v0_questions: 49,
  source_remaining_unsent_after_breaker: 48,
  windows: [
    { id: "W2", capacity: 30, count: 30, mode: "frozen-v0", begins_with: "H-19-AR", conditional_on_still_open: false, items: w2 },
    { id: "W3", capacity: 30, count: 19, mode: "frozen-v0", begins_with: w3[0].question_id, conditional_on_still_open: false, items: w3 },
    { id: "W4", capacity: 30, count: 10, mode: "preregistered-variant", begins_with: variants[0].question_id, conditional_on_still_open: true, items: variants }
  ],
  source_closeout_status: package03ACloseout.status,
  rule: "W2 and W3 preserve the frozen V0 order. W4 runs only for questions still open after V0 review."
};

const executionGuard = {
  schema_version: "1.0",
  package_id: packageId,
  status: "EXECUTION_NOT_AUTHORIZED",
  execution_authorized: false,
  network_allowed: false,
  send_allowed: false,
  live_executor_in_package: false,
  prerequisites: {
    observed_reset_receipt_required: true,
    separate_owner_authorization_required: true,
    fixed_identity_required: true,
    single_connection_required: true
  },
  limits: { max_messages_per_window: 30, parallel_connections: 1, identity_changes: 0 },
  circuit_breaker: {
    stop_on_first_explicit_quota_frame: true,
    stop_on_auth_or_identity_change: true,
    no_quota_evasion: true,
    no_automatic_retry_after_open: true
  },
  authority_boundary: {
    package_03_decision: "NO_BUILD",
    package_04_authorized: false,
    may_change_confirmed_adjudications: false,
    may_publish_or_send: false
  }
};

const router = {
  schema_version: "1.0",
  package_id: packageId,
  generated_at_utc: generatedAt,
  status: "READINESS_COMPLETE_EXECUTION_NOT_AUTHORIZED",
  review: {
    claims: 39,
    questions: 13,
    evidenceComplete: 39,
    byType: { temporalCoverage: 29, datasetAvailability: 10 },
    itemsReference: `research/${packageId}/independent-review-packet.jsonl`,
    action: "INDEPENDENT_REVIEW_ONLY"
  },
  waitReset: {
    questions: 49,
    observedResetRequired: true,
    windows: p0Resume.windows.map(item => ({ id: item.id, capacity: item.capacity, count: item.count })),
    contractReference: `research/${packageId}/p0-resume-contract.json`
  },
  campaign: {
    questions: 169,
    batchesCount: 6,
    sourceReady: 120,
    contractOnly: 49,
    sourceReviewRequired: 0,
    batches: batches.map(item => ({
      id: item.batch_id,
      sequence: item.sequence,
      capacity: item.capacity,
      count: item.count,
      familyCounts: item.family_counts,
      sourceReady: item.readiness_counts.source_ready,
      contractOnly: item.readiness_counts.contract_only,
      sourceReviewRequired: item.readiness_counts.source_review_required
    })),
    specsReference: `research/${packageId}/later-wave-oracle-specs.jsonl`
  },
  authority: {
    package03Decision: "NO_BUILD",
    package04Authorized: false,
    executionAuthorized: false,
    networkAllowed: false,
    changesSealedAdjudication: false
  }
};

const validation = {
  schema_version: "1.0",
  package_id: packageId,
  generated_at_utc: generatedAt,
  status: "PASS",
  checks: [
    { id: "sealed-package-03-tree", status: "PASS", observed: expectedPackage03Tree },
    { id: "sealed-package-03a-tree", status: "PASS", observed: expectedPackage03ATree },
    { id: "review-denominator", status: "PASS", observed: { claims: 39, questions: 13, temporal: 29, availability: 10, evidence: 39 } },
    { id: "later-wave-denominator", status: "PASS", observed: { questions: 169, source_ready: 120, contract_only: 49, source_review_required: 0 } },
    { id: "campaign-batches", status: "PASS", observed: batchSizes },
    { id: "p0-resume", status: "PASS", observed: { W2: 30, W3: 19, W4: 10, begins: "H-19-AR" } },
    { id: "execution-guard", status: "PASS", observed: { execution_authorized: false, network_allowed: false, package_04_authorized: false } }
  ],
  invariant: "39 review claims + 49 reset-gated P0 questions + 169 preregistered later-wave questions remain explicitly distinct; no item is represented as sent or adjudicated by Package 03B."
};

const closeout = {
  schema_version: "1.0",
  package_id: packageId,
  generated_at_utc: generatedAt,
  status: "READINESS_COMPLETE_EXECUTION_NOT_AUTHORIZED",
  package_03_unchanged: true,
  package_03_tree_sha256: expectedPackage03Tree,
  package_03a_unchanged: true,
  package_03a_tree_sha256: expectedPackage03ATree,
  package_03_decision_unchanged: "NO_BUILD",
  package_04_authorized: false,
  review_now: { claims: 39, questions: 13, evidence_complete: 39, decisions_recorded: 0 },
  wait_reset: { questions: 49, windows: { W2: 30, W3: 19, W4: 10 }, observed_reset_required: true },
  later_campaign: { questions: 169, batches: 6, source_ready: 120, contract_only: 49, source_review_required: 0 },
  claim: "Package 03B closes the preparation gap only. It performs no live send, no independent-review decision, no product build and no Package 04 action."
};

const readme = `# DataSaudi Package 03B — Closure Router & Campaign Readiness\n\n## Outcome\n\n**${closeout.status}**\n\nThis package converts the sealed Package 03/03A stopping point into three explicit, non-overlapping lanes without changing either sealed package:\n\n1. **Review now:** 39 machine-flagged claims across 13 questions, each joined to its proposition, verification result and evidence. Every item remains \`PENDING_INDEPENDENT_REVIEW\`; Package 03B records zero decisions.\n2. **Wait for reset:** 49 frozen P0 questions in W2/W3 plus 10 conditional variants in W4. The package includes a contract and guard, not a live executor.\n3. **Later governed campaign:** 169 never-tested questions preregistered in six batches of 30/30/30/30/30/19. Of these, 120 are source-ready and 49 are contract-only; none requires source review.\n\n## Authority boundary\n\n- Package 03 tree: \`${expectedPackage03Tree}\` (unchanged).\n- Package 03A tree: \`${expectedPackage03ATree}\` (unchanged).\n- Package 03 decision: \`NO_BUILD\` (unchanged).\n- Package 04: not authorized.\n- Live/network execution: not authorized and not implemented in this package.\n- Independent adjudication: not performed.\n\nRun \`node scripts/datasaudi-package-03b/validate-closure-router.mjs\` and \`node --test tests/datasaudi-package-03b/closure-router.test.mjs\` for independent verification.\n`;
const validationMd = `# Package 03B Validation\n\n**PASS**\n\n- Sealed Package 03 tree unchanged.\n- Sealed Package 03A tree unchanged.\n- Review packet: 39 claims / 13 questions / 39 complete evidence joins (29 temporal, 10 availability).\n- Later campaign: 169 specs (120 source-ready, 49 contract-only, 0 source-review-required).\n- Batches: 30 / 30 / 30 / 30 / 30 / 19.\n- Resume contract: W2=30, W3=19, W4=10; W2 starts at H-19-AR.\n- Execution, network sends and Package 04 remain unauthorized.\n`;
const closeoutMd = `# DataSaudi Package 03B Closeout\n\n## ${closeout.status}\n\nPackage 03B is complete as a readiness and routing layer. It makes the immediately actionable independent-review lane visible, freezes the reset-gated P0 continuation contract, and preregisters the 169-question later campaign. It does not claim that any of those actions were executed.\n\n| Lane | Exact denominator | State |\n|---|---:|---|\n| Independent review | 39 claims / 13 questions | Evidence joined; 0 decisions recorded |\n| Reset-gated P0 | 49 V0 questions + 10 conditional variants | W2/W3/W4 frozen; not authorized |\n| Later campaign | 169 questions / 6 batches | Preregistered; not sent |\n\nThe sealed Package 03 \`NO_BUILD\` decision is unchanged and Package 04 remains unauthorized.\n`;

await rm(packageRoot, { recursive: true, force: true });
await rm(reportRoot, { recursive: true, force: true });
await Promise.all([mkdir(packageRoot, { recursive: true }), mkdir(reportRoot, { recursive: true })]);
await Promise.all([
  writeFile(path.join(packageRoot, "README.md"), readme),
  writeJson(path.join(packageRoot, "INPUT-LOCK.json"), inputLock),
  writeJsonl(path.join(packageRoot, "independent-review-packet.jsonl"), reviewPacket),
  writeJsonl(path.join(packageRoot, "later-wave-oracle-specs.jsonl"), laterSpecs),
  writeJson(path.join(packageRoot, "campaign-batches.json"), campaignBatches),
  writeJson(path.join(packageRoot, "p0-resume-contract.json"), p0Resume),
  writeJson(path.join(packageRoot, "execution-guard.json"), executionGuard),
  writeJson(path.join(packageRoot, "closure-router.json"), router),
  writeJson(path.join(packageRoot, "validation.json"), validation),
  writeFile(path.join(packageRoot, "VALIDATION.md"), validationMd),
  writeJson(path.join(packageRoot, "CLOSEOUT.json"), closeout),
  writeFile(path.join(packageRoot, "CLOSEOUT.md"), closeoutMd)
]);

const artifacts = [];
for (const file of (await walk(packageRoot, new Set(["PACKAGE_MANIFEST.json"]))).sort()) {
  const bytes = await readFile(file);
  artifacts.push({ path: relative(file), sha256: sha256(bytes), size_bytes: (await stat(file)).size });
}
const manifest = {
  schema_version: "1.0",
  package_id: packageId,
  generated_at_utc: generatedAt,
  artifact_count: artifacts.length,
  size_bytes: artifacts.reduce((sum, item) => sum + item.size_bytes, 0),
  tree_sha256: sha256(artifacts.map(item => `${item.sha256}  ${item.path}`).join("\n")),
  source_input_fingerprint: inputLock.input_fingerprint,
  sealed_dependencies: {
    package_03_tree_sha256: expectedPackage03Tree,
    package_03a_tree_sha256: expectedPackage03ATree
  },
  artifacts
};
await writeJson(path.join(packageRoot, "PACKAGE_MANIFEST.json"), manifest);
await Promise.all([
  writeFile(path.join(reportRoot, "LATEST.md"), closeoutMd),
  writeJson(path.join(reportRoot, "latest-closeout.json"), closeout),
  writeJson(path.join(reportRoot, "latest-validation.json"), validation),
  writeFile(path.join(reportRoot, "latest-validation.md"), validationMd),
  writeJson(path.join(reportRoot, "latest-manifest.json"), manifest)
]);

console.log(JSON.stringify({
  ok: true,
  package_id: packageId,
  status: closeout.status,
  review: router.review,
  waitReset: { questions: router.waitReset.questions, windows: router.waitReset.windows },
  campaign: { questions: 169, batches: batchSizes, sourceReady: 120, contractOnly: 49, sourceReviewRequired: 0 },
  manifest: { artifacts: manifest.artifact_count, tree_sha256: manifest.tree_sha256 }
}, null, 2));
