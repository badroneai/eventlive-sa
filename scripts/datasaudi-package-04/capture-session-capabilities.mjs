import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PACKAGE_ROOT = path.join(ROOT, "research/datasaudi-package-04-universe-exploration");
const OUTPUT_ROOT = path.join(PACKAGE_ROOT, "06-capability-surfaces");
const HISTORY_ROOT = path.join(OUTPUT_ROOT, "session-history");
const BASE_URL = "https://datasaudi.sa";

function parseArgs(argv) {
  return Object.fromEntries(argv.filter(item => item.startsWith("--")).map(item => {
    const [key, ...value] = item.slice(2).split("=");
    return [key, value.join("=") || true];
  }));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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

async function postJson(url, body, token = null) {
  const headers = { "content-type": "application/json", accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const bytes = Buffer.from(await response.arrayBuffer());
  let json = null;
  try { json = JSON.parse(bytes.toString("utf8")); } catch {}
  return { response, bytes, json };
}

const args = parseArgs(process.argv.slice(2));
if (!args["storage-state"]) throw new Error("--storage-state is required");
const storageStatePath = path.resolve(String(args["storage-state"]));
const storageState = JSON.parse(await readFile(storageStatePath, "utf8"));
const origin = storageState.origins?.find(item => item.origin === BASE_URL);
const userId = origin?.localStorage?.find(item => item.name === "chatbot-user-id")?.value;
if (!userId) throw new Error("chatbot-user-id not found");
await Promise.all([mkdir(OUTPUT_ROOT, { recursive: true }), mkdir(HISTORY_ROOT, { recursive: true })]);

const auth = await postJson(`${BASE_URL}/api/auth/token`, { user_id: userId });
if (!auth.response.ok || !auth.json?.token) throw new Error(`Auth failed: ${auth.response.status}`);
const token = auth.json.token;
const sessionsResult = await postJson(`${BASE_URL}/api/chat-management/sessions`, { user_id: userId }, token);
if (!sessionsResult.response.ok) throw new Error(`Sessions failed: ${sessionsResult.response.status}`);
const sessions = sessionsResult.json?.sessions || [];

const knownSessionIds = new Set();
const observationRuns = [
  "p04-live-20260715-window2",
  "p04-live-20260715-window3",
  "p04-live-20260715-window4"
];
for (const runId of observationRuns) {
  const transcriptPath = path.join(PACKAGE_ROOT, "03-live-observations/runs", runId, "transcripts.jsonl");
  try {
    const rows = (await readFile(transcriptPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
    for (const row of rows) if (row.session_id) knownSessionIds.add(row.session_id);
  } catch {}
}
const manualPromptPrefix = "نفّذ تدقيق جرد تقني للمكعبات العامة التالية";
const matched = sessions.filter(session => knownSessionIds.has(session.session_id)
  || String(session.first_message || "").startsWith(manualPromptPrefix));

const histories = [];
for (const session of matched) {
  const result = await postJson(`${BASE_URL}/api/chat-management/history`, { session_id: session.session_id, user_id: userId }, token);
  const sanitized = sanitize(result.json || { parse_error: true });
  const body = Buffer.from(`${JSON.stringify(sanitized, null, 2)}\n`);
  const filePath = path.join(HISTORY_ROOT, `${session.session_id}.json`);
  await writeFile(filePath, body);
  const messages = sanitized.chat_management || sanitized.data?.chat_management || [];
  histories.push({
    session_id: session.session_id,
    http_status: result.response.status,
    ok: result.response.ok,
    messages: messages.length,
    user_messages: messages.filter(message => message.role === "human").length,
    assistant_messages: messages.filter(message => message.role === "ai").length,
    citations: messages.reduce((sum, message) => sum + (message.citation?.length || 0), 0),
    visualizations: messages.filter(message => message.visualization).length,
    response_path: path.relative(ROOT, filePath),
    response_sha256: sha256(body)
  });
}

const sessionsSanitized = matched.map(session => sanitize(session));
await writeFile(path.join(OUTPUT_ROOT, "sessions.json"), `${JSON.stringify({
  schema_version: "1.0",
  captured_at_utc: new Date().toISOString(),
  user_fingerprint_sha256: sha256(userId),
  sessions_total_for_user: sessions.length,
  matched_research_sessions: sessionsSanitized.length,
  sessions: sessionsSanitized
}, null, 2)}\n`);

let pdfProbe = { status: "NOT_ATTEMPTED", reason: "No matched completed conversation" };
const pdfSession = matched.find(session => knownSessionIds.has(session.session_id));
const pdfHistory = histories.find(item => item.session_id === pdfSession?.session_id);
if (pdfSession && pdfHistory) {
  const rawHistory = JSON.parse(await readFile(path.join(HISTORY_ROOT, `${pdfSession.session_id}.json`), "utf8"));
  const messages = rawHistory.chat_management || rawHistory.data?.chat_management || [];
  const chatLog = messages
    .filter(message => !String(message.content || "").trimStart().startsWith("urls:"))
    .map(message => ({
      user: message.role === "human" ? "user" : "bot",
      message: message.content || "",
      rawMessage: message.content || "",
      language: message.language || null
    }));
  const result = await postJson(`${BASE_URL}/api/generate-pdf`, { chatLog, locale: "ar", images: {} });
  const pdfPath = path.join(OUTPUT_ROOT, "pdf-direct-probe.pdf");
  await writeFile(pdfPath, result.bytes);
  pdfProbe = {
    status: result.response.status,
    ok: result.response.ok,
    content_type: result.response.headers.get("content-type"),
    bytes: result.bytes.length,
    sha256: sha256(result.bytes),
    path: path.relative(ROOT, pdfPath),
    source_session_id: pdfSession.session_id,
    chat_messages_submitted: chatLog.length
  };
}

const summary = {
  schema_version: "1.0",
  captured_at_utc: new Date().toISOString(),
  mode: "LEGITIMATE_SAME_USER_SESSION_SURFACE_CAPTURE",
  auth_token_persisted: false,
  user_fingerprint_sha256: sha256(userId),
  sessions_endpoint: { status: sessionsResult.response.status, total: sessions.length, matched: matched.length },
  histories,
  totals: {
    matched_sessions: histories.length,
    messages: histories.reduce((sum, item) => sum + item.messages, 0),
    user_messages: histories.reduce((sum, item) => sum + item.user_messages, 0),
    assistant_messages: histories.reduce((sum, item) => sum + item.assistant_messages, 0),
    citations: histories.reduce((sum, item) => sum + item.citations, 0),
    visualizations: histories.reduce((sum, item) => sum + item.visualizations, 0)
  },
  pdf_direct_probe: pdfProbe,
  rename_test: "NOT_PERFORMED_READ_ONLY_BOUNDARY",
  delete_test: "NOT_PERFORMED_READ_ONLY_BOUNDARY"
};
await writeFile(path.join(OUTPUT_ROOT, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
