import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PACKAGE_ROOT = path.join(ROOT, "research/datasaudi-package-04-universe-exploration");
const DEFAULT_CORPUS = path.join(PACKAGE_ROOT, "02-live-campaign/prompts.jsonl");
const DEFAULT_OUTPUT_ROOT = path.join(PACKAGE_ROOT, "03-live-observations");

function parseArgs(argv) {
  const result = {};
  for (const item of argv) {
    if (!item.startsWith("--")) continue;
    const [key, ...rest] = item.slice(2).split("=");
    result[key] = rest.length ? rest.join("=") : true;
  }
  return result;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function runId() {
  return `p04-live-${nowIso().replaceAll(/[-:.]/g, "").replace("Z", "Z")}`;
}

function decodeFrame(payload) {
  const rawPayload = payload && typeof payload === "object" && "payload" in payload ? payload.payload : payload;
  const text = Buffer.isBuffer(rawPayload) ? rawPayload.toString("utf8") : String(rawPayload);
  try {
    const value = JSON.parse(text);
    if (value && typeof value === "object") {
      const redacted = structuredClone(value);
      if (redacted.type === "auth" && "token" in redacted) redacted.token = "[REDACTED]";
      if ("authorization" in redacted) redacted.authorization = "[REDACTED]";
      if ("token" in redacted) redacted.token = "[REDACTED]";
      return redacted;
    }
    return value;
  } catch {
    return { type: "unparseable", raw_text: text.slice(0, 20_000) };
  }
}

function statusFor(answer, pageText, terminalMessage = "") {
  const combined = `${answer}\n${pageText}\n${terminalMessage}`;
  if (/Daily message limit|30 messages exceeded|message limit exceeded|الحد اليومي|تجاوزت.*رسالة/i.test(combined)) return "QUOTA_BLOCKED";
  if (/لا أستطيع إعطاء إجابة|cannot answer/i.test(answer)) return "OBSERVED_REFUSAL";
  if (/تعذر استرجاع|غير متوفر|not available|unable to retrieve/i.test(answer)) return "OBSERVED_LIMITATION";
  if (answer.trim()) return "OBSERVED_ANSWER";
  return "PLATFORM_ERROR";
}

const args = parseArgs(process.argv.slice(2));
const storageStatePath = path.resolve(String(args["storage-state"] || ""));
if (!args["storage-state"]) throw new Error("--storage-state=/absolute/path is required");

const corpusPath = path.resolve(String(args.corpus || DEFAULT_CORPUS));
const outputRoot = path.resolve(String(args.output || DEFAULT_OUTPUT_ROOT));
const skip = new Set(String(args.skip || "").split(",").map(value => value.trim()).filter(Boolean));
const limit = Number.parseInt(String(args.limit || "30"), 10);
const timeoutMs = Number.parseInt(String(args["timeout-ms"] || "180000"), 10);
const headed = String(args.headed || "false") === "true";
if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error("--limit must be 1..30");

const corpusText = await readFile(corpusPath, "utf8");
const corpus = corpusText.split("\n").filter(Boolean).map(line => JSON.parse(line));
const selected = corpus.filter(item => !skip.has(item.id)).slice(0, limit);
if (!selected.length) throw new Error("No prompts selected");

const storageState = JSON.parse(await readFile(storageStatePath, "utf8"));
const dataSaudiOrigin = storageState.origins?.find(item => item.origin === "https://datasaudi.sa");
const userId = dataSaudiOrigin?.localStorage?.find(item => item.name === "chatbot-user-id")?.value;
if (!userId) throw new Error("Storage state has no DataSaudi chatbot-user-id");

const campaignRunId = String(args["run-id"] || runId());
const runRoot = path.join(outputRoot, "runs", campaignRunId);
const responsesRoot = path.join(runRoot, "responses");
const screenshotsRoot = path.join(runRoot, "screenshots");
const pdfRoot = path.join(runRoot, "pdf");
await Promise.all([
  mkdir(responsesRoot, { recursive: true }),
  mkdir(screenshotsRoot, { recursive: true }),
  mkdir(pdfRoot, { recursive: true })
]);

const framesPath = path.join(runRoot, "websocket-frames.jsonl");
const transcriptPath = path.join(runRoot, "transcripts.jsonl");
const eventsPath = path.join(runRoot, "events.jsonl");
let activeQuestionId = null;
let activeSessionId = null;
let activeCapture = null;
let frameSequence = 0;

async function appendJsonl(filePath, value) {
  await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

const runStart = {
  schema_version: "1.0",
  event_type: "run_started",
  run_id: campaignRunId,
  started_at_utc: nowIso(),
  page_url: "https://datasaudi.sa/ar/insaights",
  corpus_path: path.relative(ROOT, corpusPath),
  corpus_sha256: sha256(corpusText),
  selected_ids: selected.map(item => item.id),
  skipped_ids: [...skip],
  stable_user_fingerprint_sha256: sha256(userId),
  identity_policy: "one browser identity loaded from the legitimate UI session; no identity rotation",
  quota_policy: "stop immediately on an explicit daily-message-limit signal",
  capture_policy: "redacted WebSocket frames are authoritative; DOM answer, citations, HTML, screenshot and PDF are secondary evidence"
};
await writeFile(path.join(runRoot, "run-start.json"), `${JSON.stringify(runStart, null, 2)}\n`);
await appendJsonl(eventsPath, runStart);

const browser = await chromium.launch({
  headless: !headed,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});
const context = await browser.newContext({
  storageState,
  locale: "ar-SA",
  timezoneId: "Asia/Riyadh",
  viewport: { width: 1440, height: 1000 }
});
function attachPage(page) {
  page.on("websocket", socket => {
    socket.on("framesent", async payload => {
      const frame = decodeFrame(payload);
      if (frame?.query && activeQuestionId) {
        activeSessionId = frame.session_id || activeSessionId;
        if (activeCapture) activeCapture.sessionId = activeSessionId;
      }
      await appendJsonl(framesPath, {
        schema_version: "1.0",
        run_id: campaignRunId,
        sequence: ++frameSequence,
        at_utc: nowIso(),
        direction: "out",
        question_id: activeQuestionId,
        payload: frame
      });
    });
    socket.on("framereceived", async payload => {
      const frame = decodeFrame(payload);
      await appendJsonl(framesPath, {
        schema_version: "1.0",
        run_id: campaignRunId,
        sequence: ++frameSequence,
        at_utc: nowIso(),
        direction: "in",
        question_id: activeQuestionId,
        payload: frame
      });
      if (!activeCapture || activeCapture.questionId !== activeQuestionId) return;
      if (frame.type === "content" && !String(frame.text || "").trimStart().startsWith("urls:")) {
        activeCapture.answer += String(frame.text || "");
      }
      if (frame.type === "link" && frame.url) {
        activeCapture.citations.push({ text: frame.text || "", href: frame.url });
      }
      if (frame.type === "error" || frame.error) {
        activeCapture.terminalMessage = frame.message || frame.error || "platform_error";
        activeCapture.resolve({ type: "error", message: activeCapture.terminalMessage });
      } else if (frame.type === "answer_end") {
        activeCapture.resolve({ type: "answer_end", message: "answer_end" });
      }
    });
  });
}

let page = await context.newPage();
attachPage(page);

async function openFreshConversation() {
  await page.goto("https://datasaudi.sa/ar/insaights", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const disclaimer = page.getByRole("button", { name: /أفهم|أوافق|موافق|accept/i }).first();
  if (await disclaimer.isVisible().catch(() => false)) await disclaimer.click();
  await page.getByRole("textbox", { name: "اكتب سؤالك هنا" }).waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForFunction(() => document.body.innerText.includes("Connected"), null, { timeout: 60_000 }).catch(() => {});
}

async function capturePdf(label) {
  const button = page.getByRole("button", { name: "PDF" });
  if (!(await button.isVisible().catch(() => false)) || !(await button.isEnabled().catch(() => false))) {
    return { status: "NOT_AVAILABLE" };
  }
  try {
    const [response] = await Promise.all([
      page.waitForResponse(item => item.url().includes("/api/generate-pdf"), { timeout: 60_000 }),
      button.click()
    ]);
    const body = await response.body();
    const bodyPath = path.join(pdfRoot, `${label}.bin`);
    await writeFile(bodyPath, body);
    const metadata = {
      status: response.status(),
      ok: response.ok(),
      content_type: response.headers()["content-type"] || null,
      bytes: body.length,
      sha256: sha256(body),
      response_path: path.relative(ROOT, bodyPath)
    };
    await writeFile(path.join(pdfRoot, `${label}.json`), `${JSON.stringify(metadata, null, 2)}\n`);
    return metadata;
  } catch (error) {
    return { status: "CAPTURE_ERROR", error: error.message };
  }
}

async function ask(question) {
  activeQuestionId = question.id;
  activeSessionId = null;
  const startedAt = nowIso();
  const startedMs = Date.now();
  const textbox = page.getByRole("textbox", { name: "اكتب سؤالك هنا" });
  const botMessages = page.locator(".chatbot-message--bot");
  let resolveTerminal;
  const terminalPromise = new Promise(resolve => { resolveTerminal = resolve; });
  activeCapture = {
    questionId: question.id,
    answer: "",
    citations: [],
    sessionId: null,
    terminalMessage: null,
    resolve: resolveTerminal
  };
  await appendJsonl(eventsPath, {
    schema_version: "1.0",
    event_type: "question_started",
    run_id: campaignRunId,
    question_id: question.id,
    started_at_utc: startedAt,
    prompt_sha256: sha256(question.prompt)
  });

  await textbox.fill(question.prompt);
  await page.locator("#insaights-input").getByRole("button").click();
  let timeoutHandle;
  const timeoutPromise = new Promise(resolve => {
    timeoutHandle = setTimeout(() => resolve({ type: "timeout", message: `timeout_after_${timeoutMs}ms` }), timeoutMs);
  });
  const terminal = await Promise.race([terminalPromise, timeoutPromise]);
  clearTimeout(timeoutHandle);
  if (terminal.type === "timeout") activeCapture.terminalMessage = terminal.message;
  await page.waitForTimeout(500);
  await page.waitForFunction(() => {
    const input = document.querySelector("#insaights-input textarea, #insaights-input input");
    return Boolean(input && !input.disabled);
  }, null, { timeout: 10_000 }).catch(() => {});

  const lastBot = botMessages.last();
  const transportAnswer = activeCapture.answer;
  const domAnswer = await lastBot.innerText().catch(() => "");
  const answer = transportAnswer || domAnswer;
  const html = await lastBot.innerHTML().catch(() => "");
  const citations = activeCapture.citations;
  const pageText = await page.locator("body").innerText();
  const status = statusFor(answer, pageText, activeCapture.terminalMessage || terminal.message);
  const completedAt = nowIso();
  const responsePath = path.join(responsesRoot, `${question.id}.html`);
  const screenshotPath = path.join(screenshotsRoot, `${question.id}.png`);
  await writeFile(responsePath, `${html}\n`, "utf8");
  let screenshot = null;
  try {
    await lastBot.screenshot({ path: screenshotPath });
    const bytes = await readFile(screenshotPath);
    screenshot = { path: path.relative(ROOT, screenshotPath), sha256: sha256(bytes), bytes: bytes.length };
  } catch (error) {
    screenshot = { error: error.message };
  }

  const transcript = {
    schema_version: "1.0",
    run_id: campaignRunId,
    question_id: question.id,
    target_capability: question.target_capability,
    language: question.language,
    prompt: question.prompt,
    prompt_sha256: sha256(question.prompt),
    status,
    sent_at_utc: startedAt,
    completed_at_utc: completedAt,
    latency_total_ms: Date.now() - startedMs,
    session_id: activeCapture.sessionId || activeSessionId,
    stable_user_fingerprint_sha256: sha256(userId),
    raw_answer: answer,
    raw_answer_sha256: sha256(answer),
    raw_answer_transport_sha256: sha256(transportAnswer),
    raw_answer_dom_sha256: sha256(domAnswer),
    raw_answer_html_path: path.relative(ROOT, responsePath),
    raw_answer_html_sha256: sha256(html),
    citations,
    terminal: {
      type: terminal.type,
      message: activeCapture.terminalMessage || terminal.message
    },
    screenshot
  };
  await appendJsonl(transcriptPath, transcript);
  await appendJsonl(eventsPath, {
    schema_version: "1.0",
    event_type: "question_completed",
    run_id: campaignRunId,
    question_id: question.id,
    completed_at_utc: completedAt,
    status,
    latency_total_ms: transcript.latency_total_ms,
    raw_answer_sha256: transcript.raw_answer_sha256,
    citations_count: citations.length
  });
  console.log(JSON.stringify({ question_id: question.id, status, latency_ms: transcript.latency_total_ms, answer_chars: answer.length, citations: citations.length }));
  activeCapture = null;
  activeQuestionId = null;
  return transcript;
}

const results = [];
let quotaBlocked = false;
let pdfMain = null;
try {
  await openFreshConversation();
  for (const question of selected) {
    if (question.id === "P04-029" || question.id === "P04-030") {
      if (!pdfMain) pdfMain = await capturePdf("main-conversation");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.getByRole("textbox", { name: "اكتب سؤالك هنا" }).waitFor({ state: "visible", timeout: 60_000 });
    }
    const result = await ask(question);
    results.push(result);
    if (question.id === "P04-029" || question.id === "P04-030") {
      await capturePdf(question.id.toLowerCase());
    }
    if (result.status === "QUOTA_BLOCKED") {
      quotaBlocked = true;
      break;
    }
  }
  if (!pdfMain) pdfMain = await capturePdf("main-conversation");
} finally {
  activeQuestionId = null;
  activeCapture = null;
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}

const statusCounts = results.reduce((counts, item) => {
  counts[item.status] = (counts[item.status] || 0) + 1;
  return counts;
}, {});
const runEnd = {
  schema_version: "1.0",
  event_type: "run_completed",
  run_id: campaignRunId,
  started_at_utc: runStart.started_at_utc,
  completed_at_utc: nowIso(),
  selected_count: selected.length,
  attempted_count: results.length,
  status_counts: statusCounts,
  quota_blocked: quotaBlocked,
  stopped_on_quota: quotaBlocked,
  pdf_main: pdfMain,
  transcript_path: path.relative(ROOT, transcriptPath),
  frames_path: path.relative(ROOT, framesPath),
  trace_path: null,
  trace_policy: "disabled because browser traces retain ephemeral authentication tokens; redacted websocket frames are the durable transport evidence"
};
await writeFile(path.join(runRoot, "run-end.json"), `${JSON.stringify(runEnd, null, 2)}\n`);
await appendJsonl(eventsPath, runEnd);
console.log(JSON.stringify(runEnd));
