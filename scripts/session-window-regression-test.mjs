// Gate: a catalog row's public window must contain its own official sessions.
//
// Class of failure it blocks (2026-09-19): a same-source re-sync rolled `sessions` forward every
// run while starts_at/ends_at stayed frozen on the first live-schedule sync, so rows rendered as
// «منتهية» on every card surface with dozens of sessions still ahead. Three checks:
//   1. unit — reconcileSessionWindow extends ends_at to the latest official session, ignores
//      non-official sessions, never pulls ends_at back, never touches starts_at.
//   2. write path — a SECOND sync of an already live-ready row through the real
//      auto-publish script must move ends_at with the refreshed sessions (the first-sync case
//      was already covered by source-auto-publish-regression-test; this is the case it missed).
//   3. data — data/events_catalog.json has zero rows whose ends_at precedes an official session.
// Class: blocking-structural for 1–2, report-only-content for 3 is NOT acceptable here because
// the data is what the write path produces; a red 3 means the heal or the write path regressed.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findSessionWindowViolations, reconcileSessionWindow } from './event-session-window.mjs';

const root = process.cwd();

// 1. unit
{
  const row = {
    id: 'unit-row',
    starts_at: '2026-08-03T09:00:00+03:00',
    ends_at: '2026-08-03T21:00:00+03:00',
    sessions: [
      { id: 's1', session_type: 'official-program-session', starts_at: '2026-09-07T09:00:00+03:00', ends_at: '2026-09-07T11:30:00+03:00' },
      { id: 's2', session_type: 'official-program-session', starts_at: '2026-10-05T18:30:00+03:00', ends_at: '2026-10-05T21:00:00+03:00' },
      { id: 's3', session_type: 'opening-hours', starts_at: '2027-01-01T09:00:00+03:00', ends_at: '2027-01-01T21:00:00+03:00' },
      { id: 's4', session_type: 'official-program-session', starts_at: 'not a date', ends_at: 'not a date' }
    ]
  };
  const change = reconcileSessionWindow(row);
  assert.equal(row.ends_at, '2026-10-05T21:00:00+03:00', 'ends_at must extend to the latest OFFICIAL session end');
  assert.equal(row.starts_at, '2026-08-03T09:00:00+03:00', 'starts_at must never move');
  assert.equal(change.session_id, 's2', 'the change must name the session that set the new end');
  assert.equal(reconcileSessionWindow(row), null, 'reconcile must be idempotent');
  const declared = { id: 'declared', starts_at: '2026-08-01T09:00:00+03:00', ends_at: '2026-12-31T21:00:00+03:00', sessions: row.sessions };
  assert.equal(reconcileSessionWindow(declared), null, 'an organiser-declared later closing date must survive (never pull back)');
  assert.equal(declared.ends_at, '2026-12-31T21:00:00+03:00');
  assert.equal(reconcileSessionWindow({ id: 'none', ends_at: '2026-08-03T21:00:00+03:00', sessions: [] }), null, 'rows without sessions are untouched');
  assert.equal(reconcileSessionWindow({ id: 'att', ends_at: '2026-08-03T21:00:00+03:00', sessions: [{ session_type: 'attendance-window', starts_at: '2026-09-01T09:00:00+03:00', ends_at: '2026-09-01T21:00:00+03:00' }] }), null, 'attendance windows never move the window');
}

// 2. write path: second sync of an already live-ready row
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'session-window-'));
  const relTmp = path.relative(root, tmp);
  const sourceUrl = 'https://www.ithra.com/en/programme/2026/childrens-museum/free-monday';
  const existing = {
    id: 'event-second-sync-row',
    slug: 'second-sync-row',
    title: 'Second Sync Row',
    organizer: 'King Abdulaziz Center for World Culture / Ithra',
    city: 'Dhahran',
    venue: "Ithra - Children's Museum",
    venue_address: "Ithra - Children's Museum",
    category: 'family-entertainment',
    raw_category: 'family',
    summary: 'A monthly programme.',
    starts_at: '2099-08-03T09:00:00+03:00',
    ends_at: '2099-08-03T21:00:00+03:00',
    updated_at: '2099-08-03T00:00:00.000Z',
    sessions_count: 1,
    tracks_count: 0,
    rooms_count: 0,
    live_updates_count: 0,
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: 'Ithra Events',
    source_url: sourceUrl,
    evidence_url: sourceUrl,
    url: sourceUrl,
    source_confidence: 'approved-source',
    live_schedule_ready: true,
    tags: ['family'],
    audiences: ['families'],
    time_precision: 'exact',
    sessions: [
      { id: 'ithra-1-202608030900', title: 'Second Sync Row', starts_at: '2099-08-03T09:00:00+03:00', ends_at: '2099-08-03T21:00:00+03:00', session_type: 'official-program-session', track: 'Ithra', room: "Children's Museum", source_url: sourceUrl }
    ]
  };
  const candidate = {
    id: 'candidate-ithra-events-second-sync-row-20260907-deadbeef',
    title: 'Second Sync Row',
    organizer: existing.organizer,
    city: 'Dhahran',
    venue: existing.venue,
    category: 'family-entertainment',
    summary: 'A monthly programme.',
    starts_at: '2099-09-07T09:00:00+03:00',
    ends_at: '2099-11-02T21:00:00+03:00',
    source_type: 'venue-calendar',
    source_url: sourceUrl,
    source_label: 'Ithra Events',
    source_owner: existing.organizer,
    evidence_url: sourceUrl,
    raw_snapshot_path: 'data/raw/source-snapshots/ithra-events-test.json',
    discovered_at: '2099-09-07T00:00:00.000Z',
    discovery_method: 'official-public-algolia-index',
    confidence: 'official',
    review_status: 'approved-for-catalog',
    publication_gate: 'catalog-review',
    matched_catalog_event_id: existing.id,
    tags: ['family'],
    sessions: [
      { id: 'ithra-1-202609070900', title: 'Second Sync Row', starts_at: '2099-09-07T09:00:00+03:00', ends_at: '2099-09-07T11:30:00+03:00', session_type: 'official-program-session', track: 'Ithra', room: "Children's Museum", source_url: sourceUrl },
      { id: 'ithra-1-209910051830', title: 'Second Sync Row', starts_at: '2099-10-05T18:30:00+03:00', ends_at: '2099-10-05T21:00:00+03:00', session_type: 'official-program-session', track: 'Ithra', room: "Children's Museum", source_url: sourceUrl },
      { id: 'ithra-1-209911021830', title: 'Second Sync Row', starts_at: '2099-11-02T18:30:00+03:00', ends_at: '2099-11-02T21:00:00+03:00', session_type: 'official-program-session', track: 'Ithra', room: "Children's Museum", source_url: sourceUrl }
    ]
  };
  fs.writeFileSync(path.join(tmp, 'catalog.json'), JSON.stringify({ generated_for: 'test', notes: [], events: [existing] }, null, 2));
  fs.writeFileSync(path.join(tmp, 'candidates.json'), JSON.stringify({ generated_for: 'test', notes: [], candidates: [candidate] }, null, 2));
  const run = spawnSync(process.execPath, ['scripts/auto-publish-source-candidates.mjs'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      EVENTLIVE_EVENTS_CATALOG_FILE: path.join(relTmp, 'catalog.json'),
      EVENTLIVE_SOURCE_CANDIDATES_FILE: path.join(relTmp, 'candidates.json'),
      EVENTLIVE_AUTO_PUBLISH_REPORT_JSON: path.join(relTmp, 'report.json'),
      EVENTLIVE_AUTO_PUBLISH_REPORT_MD: path.join(relTmp, 'report.md')
    }
  });
  assert.equal(run.status, 0, `auto-publish must succeed on the fixture\n${run.stdout}\n${run.stderr}`);
  const after = JSON.parse(fs.readFileSync(path.join(tmp, 'catalog.json'), 'utf8')).events.find((event) => event.id === existing.id);
  assert.ok(after, 'the existing row must survive the second sync');
  assert.equal(after.sessions.length, 3, 'the second sync must adopt the refreshed sessions (pre-existing behaviour)');
  assert.equal(after.ends_at, '2099-11-02T21:00:00+03:00', 'ends_at must follow the refreshed sessions on a second sync (the frozen-window defect)');
  assert.equal(after.starts_at, '2099-08-03T09:00:00+03:00', 'starts_at stays as first published');
  assert.equal(after.time_precision, 'exact', 'time_precision must not be downgraded by the reconcile');
  const report = JSON.parse(fs.readFileSync(path.join(tmp, 'report.json'), 'utf8'));
  assert.equal(typeof report.totals.session_windows_reconciled, 'number', 'the report must count reconciled windows');
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 3. data
{
  const events = JSON.parse(fs.readFileSync(path.join(root, 'data', 'events_catalog.json'), 'utf8')).events || [];
  const violations = findSessionWindowViolations(events);
  assert.equal(violations.length, 0, `catalog rows whose ends_at precedes an official session (run node scripts/heal-session-windows.mjs):\n${violations.slice(0, 20).map((v) => `${v.event_id} ends_at=${v.ends_at} latest_session=${v.latest_official_session_end}`).join('\n')}`);
  console.log(`SESSION_WINDOW_OK events=${events.length} with_official_sessions=${events.filter((event) => (event.sessions || []).some((session) => String(session.session_type || '').startsWith('official-'))).length}`);
}
