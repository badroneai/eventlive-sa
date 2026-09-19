// A second opinion on what the sync just published — reported, never written.
//
// Three waves of the Event Quality Lab (~/code/eventlive-jev-poc) measured what a System One
// model is and is not good for on this catalog, against sealed hand-judged gold sets:
//
//   • As a FLAG it is strong. "Is this an attendable event?" 0.97 precision. "Does this page
//     contradict the stored start?" 13 flags, 13 real. Every fix shipped in #120–#131 began as
//     one of those flags.
//   • As a WRITER it failed. Asked to pick the correct start time from lines cut verbatim out of
//     the source page, it scored 0.22 precision, and on four unambiguous lines it answered
//     "unknown" with 0.98–0.99 confidence. Nothing here writes a field. Ever.
//
// So this reporter asks the flag questions about the rows this run touched, and writes a report.
// It changes no data, fails no build, and costs nothing when the key is absent.
//
// Design rules, each one paid for by an incident in this repo:
//   - No key, no network, no failure. Absent credentials are a soft skip with a stated reason —
//     the autonomous-translation precedent (2026-08-01): a sync must never freeze because an
//     external provider is unavailable.
//   - Deterministic rules run first and the model is only asked about what they cannot settle.
//     A rule is free, reproducible and already guarded by a gate; a model call is none of those.
//   - A hard cap on calls per run, printed in the summary. An unbounded loop against a metered
//     API inside a cron job is a bill waiting to happen.
//   - The report names rows by id with the reason, so a reader can act without rerunning it.
import fs from 'node:fs';
import path from 'node:path';
import { nonEventReason } from './non-event-record.mjs';

const root = process.cwd();
const catalogPath = path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE || 'data/events_catalog.json');
const publishReportPath = path.join(root, process.env.EVENTLIVE_AUTO_PUBLISH_REPORT_JSON || 'reports/source-auto-publish-report.json');
const reportJsonPath = path.join(root, process.env.EVENTLIVE_JEV_REPORT_JSON || 'reports/jev-quality-report.json');
const reportMdPath = path.join(root, process.env.EVENTLIVE_JEV_REPORT_MD || 'reports/jev-quality-report.md');
const fixturePath = process.env.EVENTLIVE_JEV_FIXTURE ? path.join(root, process.env.EVENTLIVE_JEV_FIXTURE) : '';
const maxCalls = Math.max(0, Number(process.env.EVENTLIVE_JEV_MAX_CALLS ?? 60));
const endpoint = process.env.EVENTLIVE_JEV_ENDPOINT || 'https://api.typesafe.ai/v1/systemone';
const model = process.env.EVENTLIVE_JEV_MODEL || 'jev-latest';
const apiKey = (process.env.TYPESAFE_API_KEY || '').trim();
const generatedAt = new Date().toISOString();

const QUESTIONS = {
  is_real_event: {
    type: 'noul',
    instructions: 'Does this record describe a real, specific, attendable event — something happening in a bounded time window, at a place or online, that a visitor could actually attend — as opposed to a placeholder, a multi-year initiative, an organisation page, an application or registration notice, a call for submissions, or a test record?',
    criteria: {
      true: 'A concrete event, show, workshop, course cohort, exhibition, festival edition or programme session a visitor can attend.',
      false: 'Not attendable: placeholder, standing initiative, organisation page, application call, open call, or test data.'
    }
  },
  date_is_reliable: {
    type: 'noul',
    instructions: 'Given `today`, do `starts_at` and `ends_at` look like the actual window of this specific event rather than something else — a registration period, a multi-year initiative window, or a year that contradicts the title?',
    criteria: {
      true: "A plausible window for this kind of event, consistent with the record's own title and description.",
      false: 'The window is an application period, spans years, starts long before today while still open, or contradicts a date stated in the title.'
    }
  },
  source_is_authoritative: {
    type: 'noul',
    instructions: 'Are `source_url` and `source_label` the first-party source for this event — the organiser, or an official government, university, cultural-institution or venue site — rather than an aggregator, reseller, news article or test catalogue?',
    criteria: {
      true: "The organiser's own domain, or an official institution or venue site that runs the event.",
      false: 'Aggregator, ticket reseller, news article, social post, archive copy, or a demo catalogue.'
    }
  }
};

function compact(event) {
  const keep = ['title', 'organizer', 'city', 'venue', 'category', 'starts_at', 'ends_at', 'time_precision', 'attendance_mode', 'source_label', 'source_url', 'source_confidence', 'sessions_count'];
  const state = { today: generatedAt.slice(0, 10) };
  for (const key of keep) if (event[key] !== undefined && event[key] !== null && event[key] !== '') state[key] = event[key];
  const description = String(event.description || '').trim();
  if (description) state.description = description.length > 600 ? `${description.slice(0, 600)}…` : description;
  return state;
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const lines = [
    '# EventLive Jev Quality Report',
    '',
    `- generated_at: ${report.generated_at}`,
    `- status: ${report.status}`,
    `- reason: ${report.reason || '-'}`,
    `- candidates considered: ${report.considered}`,
    `- settled by deterministic rules (not asked): ${report.settled_by_rules}`,
    `- asked: ${report.asked} (cap ${report.max_calls})`,
    `- errors: ${report.errors}`,
    `- input tokens: ${report.input_tokens}`,
    '',
    '> This report never changes catalog data. Three waves of measurement put this model at 0.97',
    '> precision as a flag and 0.22 as a writer, so it flags and a human or a rule decides.',
    '',
    '## Flagged',
    '',
    report.flagged.length ? '| id | flag | probability |' : '- none',
    ...(report.flagged.length ? ['|---|---|---|', ...report.flagged.map((row) => `| \`${row.id}\` | ${row.flag} | ${row.probability} |`)] : [])
  ];
  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');
}

function targets() {
  const events = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
  const byId = new Map(events.map((event) => [event.id, event]));
  if (!fs.existsSync(publishReportPath)) return [];
  const report = JSON.parse(fs.readFileSync(publishReportPath, 'utf8'));
  const ids = new Set([
    ...(report.published || []).map((row) => row.event_id || row.catalog_event_id || row.id),
    ...(report.linked_existing || []).map((row) => row.event_id || row.catalog_event_id)
  ].filter(Boolean));
  return [...ids].map((id) => byId.get(id)).filter(Boolean);
}

async function ask(state) {
  if (fixturePath) {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    return fixture[state.title] || fixture.default;
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ state, model, questions: QUESTIONS }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`status ${response.status}`);
  return response.json();
}

const report = {
  generated_at: generatedAt,
  status: 'skipped',
  reason: '',
  considered: 0,
  settled_by_rules: 0,
  asked: 0,
  errors: 0,
  input_tokens: 0,
  max_calls: maxCalls,
  flagged: []
};

if (!apiKey && !fixturePath) {
  report.reason = 'TYPESAFE_API_KEY is not set — no network call attempted. Set the secret to turn this on; nothing else changes.';
  writeReport(report);
  console.log(`JEV_QUALITY_SKIPPED ${report.reason}`);
  process.exit(0);
}

const considered = targets();
report.considered = considered.length;
// A rule is free, reproducible and already guarded. Only what it cannot settle is worth a call.
const askable = considered.filter((event) => {
  if (nonEventReason(event)) { report.settled_by_rules++; return false; }
  return true;
}).slice(0, maxCalls);

for (const event of askable) {
  try {
    const answer = await ask(compact(event));
    report.asked++;
    report.input_tokens += answer?.usage?.input_tokens || 0;
    for (const [flag, value] of Object.entries(answer?.answers || {})) {
      const probability = typeof value?.noul === 'number' ? value.noul : null;
      if (probability === null) continue;
      const suspicious = flag === 'is_real_event' || flag === 'date_is_reliable' || flag === 'source_is_authoritative'
        ? probability < 0.5
        : probability >= 0.7;
      if (suspicious) report.flagged.push({ id: event.id, flag, probability: Number(probability.toFixed(2)) });
    }
  } catch (error) {
    report.errors++;
    if (report.errors >= 3) { report.reason = `stopped after ${report.errors} errors: ${String(error?.message || error)}`; break; }
  }
}

report.status = report.asked ? 'reported' : 'nothing-to-ask';
if (!report.reason && considered.length > askable.length + report.settled_by_rules) {
  report.reason = `capped at ${maxCalls} calls`;
}
writeReport(report);
console.log(`JEV_QUALITY_OK considered=${report.considered} settled_by_rules=${report.settled_by_rules} asked=${report.asked} flagged=${report.flagged.length} errors=${report.errors} tokens=${report.input_tokens}`);
