import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const reportJsonPath = path.join(root, 'reports', 'official-single-session-activation-report.json');
const reportMdPath = path.join(root, 'reports', 'official-single-session-activation-report.md');
const generatedAt = new Date().toISOString();
const maxDurationHours = Math.max(1, Number(process.env.EVENTLIVE_SINGLE_SESSION_MAX_HOURS || 8));

const allowedSources = new Map([
  ['Saudi Food and Drug Authority Events', 'official-online-workshop'],
  ['Qassim Chamber Events', 'official-business-workshop'],
  ['Saudi Universities and Technical Colleges', 'official-community-session'],
  ['MDLBEAST Events', 'official-entertainment-session']
]);

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function durationHours(event = {}) {
  const start = new Date(event.starts_at).getTime();
  const end = new Date(event.ends_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / 36e5;
}

function sessionRoom(event = {}) {
  return cleanText(event.venue || event.venue_address || event.city || '');
}

function sessionId(event = {}) {
  return `${event.id || 'event'}-official-session-1`
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function activationUrl(event = {}) {
  return cleanText(event.url || event.source_url || event.evidence_url || event.registration_url || event.ticket_url || '');
}

function isActivatable(event = {}) {
  const sourceType = allowedSources.get(event.source_label);
  const hours = durationHours(event);
  if (!sourceType) return false;
  if (event.approval_status !== 'published') return false;
  if (Array.isArray(event.sessions) && event.sessions.some((session) => {
    const type = String(session.session_type || '');
    return type && type !== 'attendance-window' && !type.startsWith('official-');
  })) return false;
  if (!event.starts_at || !event.ends_at || hours <= 0 || hours > maxDurationHours) return false;
  // A live-ready row owes a url — validate-data.mjs rejects the catalog outright
  // over `live_schedule_ready=true requires url`, and that rejection sits in the
  // collector step, BEFORE the deploy. One row activated without a resolvable
  // link froze publishing for six consecutive runs (2026-08-26 → 2026-08-30,
  // runs 33008969497 → 33310307179). activate() used to set live_schedule_ready
  // first and resolve the url after, so an event with no link of any kind was
  // committed to a state the schema forbids. Decide it here instead, while
  // declining is still free.
  if (!activationUrl(event)) return false;
  return ['approved-source', 'organizer-confirmed', 'official', 'partner'].includes(event.source_confidence || event.confidence || '');
}

function activate(event = {}) {
  const sessionType = allowedSources.get(event.source_label);
  const room = sessionRoom(event);
  const session = {
    id: sessionId(event),
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    session_type: sessionType,
    ...(room ? { room } : {})
  };
  event.sessions = [session];
  event.sessions_count = 1;
  event.tracks_count = 1;
  event.rooms_count = room ? 1 : 0;
  event.live_schedule_ready = true;
  event.url = activationUrl(event);
  event.updated_at = generatedAt;
  event.highlights = [
    ...new Set([
      ...(Array.isArray(event.highlights) ? event.highlights : []),
      'جدول حي مختصر: جلسة رسمية واحدة بوقت بداية ونهاية موثقين.',
      room ? `الموقع: ${room}` : ''
    ].map(cleanText).filter(Boolean))
  ].slice(0, 8);
  if (event.program_outline) {
    event.program_outline.source_method = event.program_outline.source_method || 'official-single-session';
    event.program_outline.faqs = {
      ...(event.program_outline.faqs || {}),
      live_schedule_status: 'Official single-session schedule: one timed session with verified event start and end.'
    };
    event.program_outline.features = [
      ...new Set([
        ...(Array.isArray(event.program_outline.features) ? event.program_outline.features : []),
        'جدول حي: جلسة رسمية واحدة',
        `الوقت: ${event.starts_at} إلى ${event.ends_at}`
      ].map(cleanText).filter(Boolean))
    ].slice(0, 8);
  }
  return session;
}

const catalog = readJson(catalogPath, { events: [] });
const events = Array.isArray(catalog.events) ? catalog.events : [];
const activated = [];
const skippedLong = [];

for (const event of events) {
  if (allowedSources.has(event.source_label) && durationHours(event) > maxDurationHours && !event.live_schedule_ready) {
    skippedLong.push({
      id: event.id,
      title: event.title,
      source_label: event.source_label,
      duration_hours: Number(durationHours(event).toFixed(2))
    });
  }
  if (!isActivatable(event)) continue;
  const session = activate(event);
  activated.push({
    id: event.id,
    title: event.title,
    source_label: event.source_label,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    duration_hours: Number(durationHours(event).toFixed(2)),
    session_type: session.session_type
  });
}

writeJson(catalogPath, catalog);

const report = {
  generated_at: generatedAt,
  max_duration_hours: maxDurationHours,
  totals: {
    activated: activated.length,
    skipped_long: skippedLong.length
  },
  activated,
  skipped_long: skippedLong
};

writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# EventLive Official Single-Session Activation',
  `- Generated at: ${generatedAt}`,
  `- Max duration hours: ${maxDurationHours}`,
  `- Activated: ${report.totals.activated}`,
  `- Skipped long events: ${report.totals.skipped_long}`,
  '',
  '| Source | Event | Duration | Type |',
  '|---|---|---:|---|',
  ...activated.map((row) => `| ${row.source_label} | ${row.title} | ${row.duration_hours}h | ${row.session_type} |`)
].join('\n') + '\n', 'utf8');

console.log('# EventLive Official Single-Session Activation');
console.log(`- Activated: ${report.totals.activated}`);
console.log(`- Skipped long events: ${report.totals.skipped_long}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
