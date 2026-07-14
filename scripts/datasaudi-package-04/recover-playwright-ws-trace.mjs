import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  return Object.fromEntries(argv.filter(item => item.startsWith("--")).map(item => {
    const [key, ...value] = item.slice(2).split("=");
    return [key, value.join("=") || true];
  }));
}

function unzipText(tracePath, entry) {
  return execFileSync("unzip", ["-p", tracePath, entry], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

const args = parseArgs(process.argv.slice(2));
if (!args.trace || !args["question-id"] || !args.corpus) {
  throw new Error("--trace, --question-id and --corpus are required");
}

const tracePath = path.resolve(String(args.trace));
const corpusPath = path.resolve(String(args.corpus));
const outputRoot = path.resolve(String(args.output || path.dirname(tracePath)));
const questionId = String(args["question-id"]);
const corpusText = await readFile(corpusPath, "utf8");
const question = corpusText.split("\n").filter(Boolean).map(line => JSON.parse(line)).find(item => item.id === questionId);
if (!question) throw new Error(`Question not found: ${questionId}`);

const network = unzipText(tracePath, "trace.network").split("\n").filter(Boolean).map(line => JSON.parse(line));
const websocket = network.find(item => item.type === "resource-snapshot"
  && item.snapshot?._resourceType === "websocket"
  && item.snapshot?.request?.url?.includes("/api/ws/chat"));
const resourceName = websocket?.snapshot?.response?.content?._sha1;
if (!resourceName) throw new Error("WebSocket resource not found in trace");

const rawFrames = unzipText(tracePath, `resources/${resourceName}`).split("\n").filter(Boolean).map(line => JSON.parse(line));
const sanitized = [];
let activeQuestion = null;
let answer = "";
let queryAt = null;
let completedAt = null;
let sessionId = null;
let userFingerprint = null;
const citations = [];

for (const [index, frame] of rawFrames.entries()) {
  let payload;
  try { payload = JSON.parse(frame.data); }
  catch { payload = { type: "unparseable", raw_text: String(frame.data || "").slice(0, 20_000) }; }
  if (payload?.type === "auth" && "token" in payload) payload.token = "[REDACTED]";
  if (payload?.type === "auth_success" && payload.user_id) {
    userFingerprint = sha256(payload.user_id);
    delete payload.user_id;
    payload.user_fingerprint_sha256 = userFingerprint;
  }
  if (frame.type === "send" && payload?.query) {
    activeQuestion = questionId;
    queryAt = new Date(frame.time).toISOString();
    sessionId = payload.session_id || null;
    if (payload.user_id) {
      userFingerprint = sha256(payload.user_id);
      delete payload.user_id;
      payload.user_fingerprint_sha256 = userFingerprint;
    }
  }
  if (activeQuestion && payload?.type === "content") answer += String(payload.text || "");
  if (activeQuestion && payload?.type === "link" && payload.url) citations.push({ text: payload.text || "", url: payload.url });
  if (activeQuestion && payload?.type === "answer_end") completedAt = new Date(frame.time).toISOString();
  sanitized.push({
    schema_version: "1.0",
    sequence: index + 1,
    at_utc: new Date(frame.time).toISOString(),
    direction: frame.type === "send" ? "out" : "in",
    question_id: activeQuestion,
    payload
  });
}

if (!queryAt) throw new Error("No query frame found");
const status = /لا أستطيع إعطاء إجابة|cannot answer/i.test(answer)
  ? "OBSERVED_REFUSAL"
  : answer.trim() ? "OBSERVED_ANSWER" : "PLATFORM_ERROR";
const framesText = sanitized.map(item => JSON.stringify(item)).join("\n") + "\n";
const framesPath = path.join(outputRoot, "websocket-frames-recovered.jsonl");
await writeFile(framesPath, framesText);

const transcript = {
  schema_version: "1.0",
  recovery_mode: "PLAYWRIGHT_TRACE_WEBSOCKET_RESOURCE",
  question_id: questionId,
  target_capability: question.target_capability,
  language: question.language,
  prompt: question.prompt,
  prompt_sha256: sha256(question.prompt),
  status,
  sent_at_utc: queryAt,
  completed_at_utc: completedAt,
  latency_total_ms: completedAt ? Date.parse(completedAt) - Date.parse(queryAt) : null,
  session_id: sessionId,
  stable_user_fingerprint_sha256: userFingerprint,
  raw_answer: answer,
  raw_answer_sha256: sha256(answer),
  citations
};
await writeFile(path.join(outputRoot, "transcripts.jsonl"), `${JSON.stringify(transcript)}\n`);
const recovery = {
  schema_version: "1.0",
  recovered_at_utc: new Date().toISOString(),
  source_trace_sha256: sha256(await readFile(tracePath)),
  source_resource: resourceName,
  sanitized_frames_path: path.relative(process.cwd(), framesPath),
  sanitized_frames_sha256: sha256(framesText),
  auth_token_retained: false,
  transcript_status: status,
  answer_chars: answer.length
};
await writeFile(path.join(outputRoot, "recovery.json"), `${JSON.stringify(recovery, null, 2)}\n`);
console.log(JSON.stringify(recovery));
