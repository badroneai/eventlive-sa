import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PACKAGE_ROOT = path.join(ROOT, "research/datasaudi-package-06-live-observation");
const DEFAULT_CORPUS = path.join(PACKAGE_ROOT, "01-campaign/selected-executions.jsonl");
const DEFAULT_OUTPUT = path.join(PACKAGE_ROOT, "02-runs");
const PRIOR_FRAMES = path.join(ROOT, "research/datasaudi-package-04-universe-exploration/03-live-observations/runs/p04-live-20260715-window4/websocket-frames.jsonl");
const P04_VALIDATION = path.join(ROOT, "research/datasaudi-package-04-universe-exploration/VALIDATION.json");
const BASE_URL = "https://datasaudi.sa";
const SOCKET_URL = "wss://datasaudi.sa/api/ws/chat";

function parseArgs(argv) {
  const values = {};
  for (const item of argv) {
    if (!item.startsWith("--")) continue;
    const [key, ...rest] = item.slice(2).split("=");
    values[key] = rest.length ? rest.join("=") : true;
  }
  return values;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function defaultRunId() {
  return `p06-live-${nowIso().replaceAll(/[-:.]/g, "").replace("Z", "Z")}`;
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|authorization/i.test(key)) result[key] = "[REDACTED]";
    else if (key === "user_id") result.user_fingerprint_sha256 = sha256(String(item));
    else result[key] = sanitize(item);
  }
  return result;
}

function quotaSignal(value) {
  return /Daily message limit of 30 messages exceeded|30 messages exceeded|message limit exceeded|الحد اليومي|تجاوزت.*رسالة/i.test(String(value || ""));
}

function classifyAnswer(answer) {
  if (/لا أستطيع إعطاء إجابة|cannot answer/i.test(answer)) return "OBSERVED_REFUSAL";
  if (/تعذر استرجاع|غير متوفر|not available|unable to retrieve/i.test(answer)) return "OBSERVED_LIMITATION";
  return answer.trim() ? "OBSERVED_ANSWER" : "OBSERVED_EMPTY";
}

async function postJson(url, body, token = null) {
  const headers = { "content-type": "application/json", accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const bytes = Buffer.from(await response.arrayBuffer());
  let json = null;
  try { json = JSON.parse(bytes.toString("utf8")); } catch {}
  return { response, bytes, json };
}

async function deriveSameUser() {
  const [framesText, validationText] = await Promise.all([
    readFile(PRIOR_FRAMES, "utf8"),
    readFile(P04_VALIDATION, "utf8")
  ]);
  const frames = framesText.split("\n").filter(Boolean).map(line => JSON.parse(line));
  const userId = frames.find(row => row.payload?.type === "auth_success" && row.payload?.user_id)?.payload?.user_id;
  if (!userId) throw new Error("Prior same-user identity is unavailable");
  const fingerprint = sha256(userId);
  const expected = JSON.parse(validationText).metrics?.same_user_fingerprint_sha256;
  if (!expected || fingerprint !== expected) throw new Error("Same-user fingerprint lock failed");
  return { userId, fingerprint };
}

const args = parseArgs(process.argv.slice(2));
const corpusPath = path.resolve(String(args.corpus || DEFAULT_CORPUS));
const outputRoot = path.resolve(String(args.output || DEFAULT_OUTPUT));
const offset = Number.parseInt(String(args.offset || "0"), 10);
const limit = Number.parseInt(String(args.limit || "30"), 10);
const timeoutMs = Number.parseInt(String(args["timeout-ms"] || "180000"), 10);
if (!Number.isInteger(offset) || offset < 0) throw new Error("--offset must be a non-negative integer");
if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error("--limit must be 1..30");
if (!Number.isInteger(timeoutMs) || timeoutMs < 10_000) throw new Error("--timeout-ms must be at least 10000");

const corpusText = await readFile(corpusPath, "utf8");
const corpus = corpusText.split("\n").filter(Boolean).map(line => JSON.parse(line));
const selected = corpus.slice(offset, offset + limit);
if (!selected.length) throw new Error("No campaign questions selected");
if (offset + selected.length > 30) throw new Error("Campaign order cannot exceed the governed 30-question window");

const { userId, fingerprint } = await deriveSameUser();
const campaignRunId = String(args["run-id"] || defaultRunId());
const runRoot = path.join(outputRoot, campaignRunId);
const historyRoot = path.join(runRoot, "evidence/history");
await Promise.all([mkdir(runRoot, { recursive: true }), mkdir(historyRoot, { recursive: true })]);

const framesPath = path.join(runRoot, "websocket-frames.jsonl");
const eventsPath = path.join(runRoot, "events.jsonl");
const transcriptsPath = path.join(runRoot, "transcripts.jsonl");
let frameSequence = 0;
let activeQuestionId = null;
let pendingWrites = Promise.resolve();

function queueJsonl(filePath, value) {
  pendingWrites = pendingWrites.then(() => appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8"));
  return pendingWrites;
}

const runStart = {
  schema_version: "1.0",
  event_type: "run_started",
  run_id: campaignRunId,
  started_at_utc: nowIso(),
  corpus_path: path.relative(ROOT, corpusPath),
  corpus_sha256: sha256(corpusText),
  offset,
  selected_count: selected.length,
  selected_question_ids: selected.map(row => row.campaign_question_id),
  selected_execution_ids: selected.map(row => row.execution_id).filter(Boolean),
  stable_user_fingerprint_sha256: fingerprint,
  identity_policy: "same pseudonymous DataSaudi user recovered from sealed P04 transport evidence; no rotation",
  transport: SOCKET_URL,
  quota_policy: "stop on the first explicit quota signal; never retry a question",
  token_persisted: false,
  raw_user_id_persisted: false
};
await writeFile(path.join(runRoot, "run-start.json"), `${JSON.stringify(runStart, null, 2)}\n`, "utf8");
await queueJsonl(eventsPath, runStart);

const auth = await postJson(`${BASE_URL}/api/auth/token`, { user_id: userId });
if (!auth.response.ok || !auth.json?.token) throw new Error(`DataSaudi auth failed with HTTP ${auth.response.status}`);
const token = auth.json.token;

const inbox = [];
const inboxWaiters = [];
function deliver(frame) {
  const waiter = inboxWaiters.shift();
  if (waiter) waiter.resolve(frame);
  else inbox.push(frame);
}
function nextFrame(timeout) {
  if (inbox.length) return Promise.resolve(inbox.shift());
  return new Promise((resolve, reject) => {
    const waiter = { resolve: value => { clearTimeout(timer); resolve(value); } };
    const timer = setTimeout(() => {
      const index = inboxWaiters.indexOf(waiter);
      if (index >= 0) inboxWaiters.splice(index, 1);
      reject(new Error(`timeout_after_${timeout}ms`));
    }, timeout);
    inboxWaiters.push(waiter);
  });
}

const socket = new WebSocket(SOCKET_URL);
socket.addEventListener("message", event => {
  let payload;
  try { payload = JSON.parse(typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8")); }
  catch { payload = { type: "unparseable", raw_text: String(event.data).slice(0, 20_000) }; }
  queueJsonl(framesPath, {
    schema_version: "1.0",
    run_id: campaignRunId,
    sequence: ++frameSequence,
    at_utc: nowIso(),
    direction: "in",
    question_id: activeQuestionId,
    payload: sanitize(payload)
  });
  deliver(payload);
});
socket.addEventListener("error", () => deliver({ type: "socket_error", message: "websocket_error" }));
socket.addEventListener("close", event => deliver({ type: "socket_closed", code: event.code, reason: event.reason || "" }));

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("websocket_open_timeout")), 30_000);
  socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
  socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("websocket_open_error")); }, { once: true });
});

const authFrame = { type: "auth", token };
await queueJsonl(framesPath, {
  schema_version: "1.0",
  run_id: campaignRunId,
  sequence: ++frameSequence,
  at_utc: nowIso(),
  direction: "out",
  question_id: null,
  payload: sanitize(authFrame)
});
socket.send(JSON.stringify(authFrame));

let authenticated = false;
while (!authenticated) {
  const frame = await nextFrame(30_000);
  if (frame.type === "auth_success") {
    if (sha256(String(frame.user_id || "")) !== fingerprint) throw new Error("Server auth identity mismatch");
    authenticated = true;
  } else if (frame.type === "error" || frame.type === "socket_error" || frame.type === "socket_closed") {
    throw new Error(`WebSocket authentication failed: ${frame.message || frame.reason || frame.type}`);
  }
}

const results = [];
let stoppedOnQuota = false;
let stoppedOnPlatform = false;
let outboundQueries = 0;
for (const question of selected) {
  activeQuestionId = question.campaign_question_id;
  const startedAt = nowIso();
  const startedMs = Date.now();
  const sessionId = randomUUID();
  const outgoing = { query: question.prompt, session_id: sessionId, user_id: userId };
  await queueJsonl(eventsPath, {
    schema_version: "1.0",
    event_type: "question_started",
    run_id: campaignRunId,
    question_id: activeQuestionId,
    execution_id: question.execution_id,
    started_at_utc: startedAt,
    prompt_sha256: question.prompt_sha256
  });
  await queueJsonl(framesPath, {
    schema_version: "1.0",
    run_id: campaignRunId,
    sequence: ++frameSequence,
    at_utc: nowIso(),
    direction: "out",
    question_id: activeQuestionId,
    payload: sanitize(outgoing)
  });
  socket.send(JSON.stringify(outgoing));
  outboundQueries += 1;

  let answer = "";
  const citations = [];
  const visualizations = [];
  const phases = [];
  let terminal = null;
  try {
    while (!terminal) {
      const frame = await nextFrame(timeoutMs);
      if (frame.type === "phase") phases.push(String(frame.message || ""));
      if (frame.type === "content" && !String(frame.text || "").trimStart().startsWith("urls:")) answer += String(frame.text || "");
      if (frame.type === "link" && frame.url) citations.push({ text: frame.text || "", href: frame.url });
      if (frame.type === "interactive_visualization" || frame.type === "generating_chart") {
        visualizations.push(sanitize({ type: frame.type, url: frame.url || null, chart_type: frame.chart_type || null }));
      }
      if (frame.type === "error" || frame.error) terminal = { type: "error", message: frame.message || frame.error || "platform_error" };
      else if (frame.type === "answer_end") terminal = { type: "answer_end", message: "answer_end" };
      else if (frame.type === "socket_error" || frame.type === "socket_closed") terminal = { type: frame.type, message: frame.message || frame.reason || frame.type };
    }
  } catch (error) {
    terminal = { type: "timeout", message: error.message };
  }

  let status;
  if (quotaSignal(`${terminal.message}\n${answer}`)) status = "QUOTA_BLOCKED";
  else if (terminal.type === "timeout") status = "TIMEOUT";
  else if (terminal.type !== "answer_end") status = "PLATFORM_ERROR";
  else status = classifyAnswer(answer);

  const history = await postJson(`${BASE_URL}/api/chat-management/history`, { session_id: sessionId, user_id: userId }, token);
  const historySanitized = sanitize(history.json || { parse_error: true });
  const historyBytes = Buffer.from(`${JSON.stringify(historySanitized, null, 2)}\n`);
  const historyPath = path.join(historyRoot, `${activeQuestionId}.json`);
  await writeFile(historyPath, historyBytes);

  const transcript = {
    schema_version: "1.0",
    run_id: campaignRunId,
    question_id: activeQuestionId,
    mapping: question.mapping,
    execution_id: question.execution_id,
    legacy_id: question.legacy_id,
    prompt: question.prompt,
    prompt_sha256: question.prompt_sha256,
    language: question.language,
    domain: question.domain,
    family: question.family,
    status,
    sent_at_utc: startedAt,
    completed_at_utc: nowIso(),
    latency_total_ms: Date.now() - startedMs,
    session_id: sessionId,
    stable_user_fingerprint_sha256: fingerprint,
    raw_answer: answer,
    raw_answer_sha256: sha256(answer),
    citations,
    visualizations,
    phases,
    terminal,
    history: {
      http_status: history.response.status,
      ok: history.response.ok,
      path: path.relative(ROOT, historyPath),
      sha256: sha256(historyBytes)
    },
    oracle_terminal_state: question.oracle_terminal_state,
    oracle_answer_sha256: question.oracle_answer_sha256
  };
  await queueJsonl(transcriptsPath, transcript);
  await queueJsonl(eventsPath, {
    schema_version: "1.0",
    event_type: "question_completed",
    run_id: campaignRunId,
    question_id: activeQuestionId,
    execution_id: question.execution_id,
    completed_at_utc: transcript.completed_at_utc,
    status,
    latency_total_ms: transcript.latency_total_ms,
    raw_answer_sha256: transcript.raw_answer_sha256,
    citations_count: citations.length,
    visualizations_count: visualizations.length
  });
  results.push(transcript);
  console.log(JSON.stringify({ question_id: activeQuestionId, execution_id: question.execution_id, status, latency_ms: transcript.latency_total_ms, answer_chars: answer.length, citations: citations.length, visualizations: visualizations.length }));
  activeQuestionId = null;

  if (status === "QUOTA_BLOCKED") {
    stoppedOnQuota = true;
    break;
  }
  if (status === "TIMEOUT" || status === "PLATFORM_ERROR") {
    stoppedOnPlatform = true;
    break;
  }
}

socket.close(1000, "campaign_complete");
await pendingWrites;

const statusCounts = results.reduce((counts, row) => {
  counts[row.status] = (counts[row.status] || 0) + 1;
  return counts;
}, {});
const observedStatuses = new Set(["OBSERVED_ANSWER", "OBSERVED_LIMITATION", "OBSERVED_REFUSAL"]);
const mappedObserved = new Set(results.filter(row => row.execution_id && observedStatuses.has(row.status)).map(row => row.execution_id));
const runEnd = {
  schema_version: "1.0",
  event_type: "run_completed",
  run_id: campaignRunId,
  started_at_utc: runStart.started_at_utc,
  completed_at_utc: nowIso(),
  selected_count: selected.length,
  attempted_count: results.length,
  outbound_query_count: outboundQueries,
  status_counts: statusCounts,
  mapped_observed_execution_ids: [...mappedObserved],
  mapped_observed_unique_count: mappedObserved.size,
  supplemental_observed_count: results.filter(row => !row.execution_id && observedStatuses.has(row.status)).length,
  stopped_on_quota: stoppedOnQuota,
  stopped_on_platform: stoppedOnPlatform,
  remaining_unsent_count: selected.length - results.length,
  quota_remaining: "UNKNOWN",
  reset_at: "UNKNOWN",
  raw_user_id_persisted: false,
  auth_token_persisted: false,
  transcript_path: path.relative(ROOT, transcriptsPath),
  frames_path: path.relative(ROOT, framesPath)
};
await writeFile(path.join(runRoot, "run-end.json"), `${JSON.stringify(runEnd, null, 2)}\n`, "utf8");
await appendFile(eventsPath, `${JSON.stringify(runEnd)}\n`, "utf8");
console.log(JSON.stringify(runEnd));
