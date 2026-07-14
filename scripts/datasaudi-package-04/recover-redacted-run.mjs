import { createHash } from "node:crypto";
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

const args = parseArgs(process.argv.slice(2));
if (!args.frames || !args["question-id"] || !args.corpus) {
  throw new Error("--frames, --question-id and --corpus are required");
}

const framesPath = path.resolve(String(args.frames));
const runRoot = path.dirname(framesPath);
const corpusPath = path.resolve(String(args.corpus));
const questionId = String(args["question-id"]);
const framesText = await readFile(framesPath, "utf8");
const frames = framesText.split("\n").filter(Boolean).map(line => JSON.parse(line));
const corpus = (await readFile(corpusPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
const question = corpus.find(item => item.id === questionId);
if (!question) throw new Error(`Question not found: ${questionId}`);
const queryFrame = frames.find(frame => frame.question_id === questionId && frame.direction === "out" && frame.payload?.query);
const terminalFrame = frames.findLast(frame => frame.question_id === questionId && ["answer_end", "error"].includes(frame.payload?.type));
if (!queryFrame) throw new Error(`Query frame not found: ${questionId}`);

const answer = frames
  .filter(frame => frame.question_id === questionId && frame.direction === "in" && frame.payload?.type === "content")
  .map(frame => String(frame.payload.text || ""))
  .filter(text => !text.trimStart().startsWith("urls:"))
  .join("");
const citations = frames
  .filter(frame => frame.question_id === questionId && frame.direction === "in" && frame.payload?.type === "link" && frame.payload.url)
  .map(frame => ({ text: frame.payload.text || "", href: frame.payload.url }));
const status = /Daily message limit|30 messages exceeded|الحد اليومي/i.test(answer)
  ? "QUOTA_BLOCKED"
  : /لا أستطيع إعطاء إجابة|cannot answer/i.test(answer)
    ? "OBSERVED_REFUSAL"
    : answer.trim() ? "OBSERVED_ANSWER" : "PLATFORM_ERROR";
const runStart = JSON.parse(await readFile(path.join(runRoot, "run-start.json"), "utf8"));
const completedAt = terminalFrame?.at_utc || new Date().toISOString();
const transcript = {
  schema_version: "1.0",
  recovery_mode: "REDACTED_WEBSOCKET_FRAMES_AFTER_DOM_WAIT_FAILURE",
  run_id: runStart.run_id,
  question_id: questionId,
  target_capability: question.target_capability,
  language: question.language,
  prompt: question.prompt,
  prompt_sha256: sha256(question.prompt),
  status,
  sent_at_utc: queryFrame.at_utc,
  completed_at_utc: completedAt,
  latency_total_ms: Date.parse(completedAt) - Date.parse(queryFrame.at_utc),
  session_id: queryFrame.payload.session_id || null,
  stable_user_fingerprint_sha256: runStart.stable_user_fingerprint_sha256,
  raw_answer: answer,
  raw_answer_sha256: sha256(answer),
  citations,
  terminal: {
    type: terminalFrame?.payload?.type || "missing",
    message: terminalFrame?.payload?.message || terminalFrame?.payload?.error || terminalFrame?.payload?.type || "missing"
  }
};
await writeFile(path.join(runRoot, "transcripts.jsonl"), `${JSON.stringify(transcript)}\n`);
const runEnd = {
  schema_version: "1.0",
  event_type: "run_recovered_and_closed",
  run_id: runStart.run_id,
  started_at_utc: runStart.started_at_utc,
  completed_at_utc: new Date().toISOString(),
  selected_count: runStart.selected_ids.length,
  attempted_count: 1,
  recovered_question_id: questionId,
  status_counts: { [status]: 1 },
  stopped_before_next_send: true,
  recovery_reason: "DOM count wait timed out after an answer_end frame; transport evidence was complete and redacted",
  auth_token_retained: false,
  frames_sha256: sha256(framesText),
  transcript_sha256: sha256(`${JSON.stringify(transcript)}\n`)
};
await writeFile(path.join(runRoot, "run-end.json"), `${JSON.stringify(runEnd, null, 2)}\n`);
console.log(JSON.stringify(runEnd));
