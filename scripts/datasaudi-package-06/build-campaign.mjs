import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PACKAGE_ROOT = path.join(ROOT, "research/datasaudi-package-06-live-observation");
const GOVERNANCE_ROOT = path.join(PACKAGE_ROOT, "00-governance");
const CAMPAIGN_ROOT = path.join(PACKAGE_ROOT, "01-campaign");
const P05_LEDGER = path.join(ROOT, "research/datasaudi-package-05-execution-closure/02-execution-universe/execution-answer-ledger.jsonl");
const P05_MANIFEST = path.join(ROOT, "research/datasaudi-package-05-execution-closure/PACKAGE_MANIFEST.json");
const P04_MANIFEST = path.join(ROOT, "research/datasaudi-package-04-universe-exploration/PACKAGE_MANIFEST.json");
const P04_PROMPTS = path.join(ROOT, "research/datasaudi-package-04-universe-exploration/02-live-campaign/prompts.jsonl");
const P04_VALIDATION = path.join(ROOT, "research/datasaudi-package-04-universe-exploration/VALIDATION.json");

const P05_SELECTION = [
  "P05-FIS-CROSS-AR-V1",
  "P05-ENR-CROSS-AR-V1",
  "P05-BNK-RANK-AR-V1",
  "P05-MKT-RANK-EN-V1",
  "P05-PAY-SERIES-AR-V1",
  "P05-DIG-SERIES-AR-V1",
  "P05-HLT-DIRECT-EN-V1",
  "P05-HUM-DIRECT-AR-V1",
  "P05-BUS-DERIVE-AR-V1",
  "P05-AGR-DERIVE-AR-V1",
  "P05-GDP-EXPLAIN-AR-V1",
  "P05-IND-EXPLAIN-AR-V1",
  "P05-EXT-AVAILABILITY-EN-V1",
  "P05-ENR-LIMIT-EN-V1",
  "P05-CPI-DIRECT-EN-V1",
  "P05-DIS-DERIVE-EN-V1",
  "P05-EDU-CROSS-AR-V1",
  "P05-LAB-CROSS-EN-V1",
  "P05-LOG-RANK-AR-V1",
  "P05-POP-CROSS-EN-V1",
  "P05-RE-DIRECT-AR-V1",
  "P05-RND-SERIES-EN-V1",
  "P05-SRV-EXPLAIN-AR-V1",
  "P05-TOU-DERIVE-EN-V1",
  "P05-TRD-CROSS-AR-V1",
  "P05-GDP-DIRECT-EN-V1",
  "P05-CPI-EXPLAIN-EN-V1",
  "P05-HLT-LIMIT-EN-V1",
  "P05-CPI-DERIVE-AR-V1"
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJsonl(filePath) {
  return (await readFile(filePath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
}

async function fileLock(filePath) {
  const bytes = await readFile(filePath);
  return {
    path: path.relative(ROOT, filePath),
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

await Promise.all([
  mkdir(GOVERNANCE_ROOT, { recursive: true }),
  mkdir(CAMPAIGN_ROOT, { recursive: true }),
  mkdir(path.join(PACKAGE_ROOT, "02-runs"), { recursive: true }),
  mkdir(path.join(PACKAGE_ROOT, "03-observation-ledger"), { recursive: true }),
  mkdir(path.join(PACKAGE_ROOT, "04-adjudication"), { recursive: true })
]);

const [p05Rows, p04Prompts, p04Validation] = await Promise.all([
  readJsonl(P05_LEDGER),
  readJsonl(P04_PROMPTS),
  JSON.parse(await readFile(P04_VALIDATION, "utf8"))
]);
const p05ById = new Map(p05Rows.map(row => [row.execution_id, row]));
const p04Exact = p04Prompts.find(row => row.id === "P04-003");
if (!p04Exact) throw new Error("P04-003 missing from frozen P04 corpus");
if (P05_SELECTION.length !== 29 || new Set(P05_SELECTION).size !== 29) {
  throw new Error("P05 selection must contain 29 unique execution ids");
}

const selected = [{
  schema_version: "1.0",
  campaign_order: 1,
  mapping: "SUPPLEMENTAL_P04_EXACT",
  campaign_question_id: "P06-001",
  legacy_id: p04Exact.id,
  execution_id: null,
  language: p04Exact.language,
  domain: "cross-domain-hidden-cubes",
  family: "capability",
  prompt: p04Exact.prompt,
  prompt_sha256: sha256(p04Exact.prompt),
  oracle_terminal_state: "SUPPLEMENTAL_LIVE_GAP",
  oracle_answer_sha256: null,
  evidence_paths: [path.relative(ROOT, P04_PROMPTS)]
}];

for (const [index, executionId] of P05_SELECTION.entries()) {
  const row = p05ById.get(executionId);
  if (!row) throw new Error(`Missing P05 execution: ${executionId}`);
  if (sha256(row.prompt) !== row.prompt_sha256) throw new Error(`Prompt hash mismatch: ${executionId}`);
  selected.push({
    schema_version: "1.0",
    campaign_order: index + 2,
    mapping: "P05_EXECUTION_EXACT",
    campaign_question_id: `P06-${String(index + 2).padStart(3, "0")}`,
    legacy_id: null,
    execution_id: row.execution_id,
    semantic_id: row.semantic_id,
    language: row.language,
    domain: row.domain,
    family: row.family,
    prompt: row.prompt,
    prompt_sha256: row.prompt_sha256,
    oracle_terminal_state: row.terminal_state,
    oracle_answer_sha256: row.answer_sha256,
    evidence_paths: row.evidence_paths
  });
}

if (selected.length !== 30) throw new Error("Campaign must contain exactly 30 questions");
if (new Set(selected.map(row => row.prompt_sha256)).size !== 30) throw new Error("Campaign prompts must be unique");
if (new Set(selected.filter(row => row.execution_id).map(row => row.execution_id)).size !== 29) {
  throw new Error("Mapped executions must be unique");
}

await writeFile(
  path.join(CAMPAIGN_ROOT, "selected-executions.jsonl"),
  `${selected.map(row => JSON.stringify(row)).join("\n")}\n`,
  "utf8"
);

const fingerprint = p04Validation.metrics?.same_user_fingerprint_sha256;
if (!fingerprint) throw new Error("P04 stable user fingerprint missing");

await writeJson(path.join(GOVERNANCE_ROOT, "AUTHORITY.json"), {
  schema_version: "1.0",
  package_id: "DataSaudi-Package06-Live-Observation",
  authority: "User explicitly instructed Codex to continue until the requested DataSaudi exploration task is complete.",
  authority_date: "2026-07-15",
  allowed_actions: [
    "Use the same previously observed DataSaudi pseudonymous user identity",
    "Send at most 30 high-information prompts in the legitimate window",
    "Capture and independently adjudicate official responses",
    "Stop immediately on a quota signal"
  ],
  forbidden_actions: [
    "Rotate or fabricate user identities",
    "Bypass or evade a quota",
    "Persist auth tokens",
    "Count supplemental prompts as P05 execution coverage",
    "Modify sealed Package04 or Package05 evidence"
  ]
});

await writeJson(path.join(GOVERNANCE_ROOT, "RESET-EVIDENCE.json"), {
  schema_version: "1.0",
  preflight_state: "UNKNOWN_NO_FREE_PREFLIGHT",
  rationale: "The official client exposes no remaining-message or reset endpoint. A useful same-identity question is the only lawful probe.",
  first_probe: "P06-001",
  first_probe_source: "P04-003 exact frozen prompt",
  proceed_rule: "Proceed only if the first probe reaches answer_end without a quota error.",
  stop_rule: "Stop immediately on Daily message limit of 30 messages exceeded or any equivalent explicit quota signal.",
  quota_remaining: "UNKNOWN",
  reset_at: "UNKNOWN"
});

await writeJson(path.join(GOVERNANCE_ROOT, "CAMPAIGN-CONTRACT.json"), {
  schema_version: "1.0",
  campaign_id: "P06-LIVE-WINDOW-01",
  selected_questions: selected.length,
  mapped_p05_executions: 29,
  supplemental_exact_prompts: 1,
  p05_baseline_live_cells: 31,
  p05_denominator: 2304,
  maximum_possible_new_mapped_cells: 29,
  maximum_possible_cumulative_live_cells: 60,
  identity_policy: "SAME_STABLE_PSEUDONYMOUS_USER_ONLY",
  expected_user_fingerprint_sha256: fingerprint,
  session_policy: "A fresh session id may be used per self-contained prompt; the user identity never changes.",
  quota_policy: "Maximum 30 outbound queries; stop on first explicit quota signal; no retries.",
  counting_policy: {
    live_message: "Every outbound query accepted for transport",
    observed_answer: "A response reaching answer_end with non-empty content",
    mapped_live_cell: "A unique P05 execution_id with exact prompt_sha256 and observed terminal response",
    correct_answer: "Determined only by independent adjudication",
    supplemental: "Never included in the 2,304 numerator"
  }
});

await writeJson(path.join(GOVERNANCE_ROOT, "INPUT_LOCK.json"), {
  schema_version: "1.0",
  generated_at_utc: new Date().toISOString(),
  expected_user_fingerprint_sha256: fingerprint,
  inputs: await Promise.all([P05_LEDGER, P05_MANIFEST, P04_MANIFEST, P04_PROMPTS, P04_VALIDATION].map(fileLock)),
  selected_execution_ids_sha256: sha256(`${P05_SELECTION.join("\n")}\n`),
  selected_prompts_sha256: sha256(`${selected.map(row => row.prompt_sha256).join("\n")}\n`)
});

await writeJson(path.join(CAMPAIGN_ROOT, "selection-summary.json"), {
  schema_version: "1.0",
  selected: selected.length,
  mapped_p05: selected.filter(row => row.execution_id).length,
  supplemental: selected.filter(row => !row.execution_id).length,
  languages: Object.fromEntries(Object.entries(Object.groupBy(selected, row => row.language)).map(([key, rows]) => [key, rows.length])),
  domains: [...new Set(selected.filter(row => row.execution_id).map(row => row.domain))].sort(),
  families: [...new Set(selected.filter(row => row.execution_id).map(row => row.family))].sort(),
  ordered_ids: selected.map(row => row.execution_id || row.legacy_id)
});

console.log(JSON.stringify({ selected: selected.length, mapped_p05: 29, supplemental: 1, fingerprint }));
