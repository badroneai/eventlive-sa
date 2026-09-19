// Gate: the second-opinion reporter must be unable to hurt anything.
//
// It talks to a metered external API from inside a cron job, so the failure modes that matter are
// not "is the judgement right" but "can it freeze the sync, spend without a ceiling, or change
// data". Four checks, all offline:
//   1. no key  -> exit 0, no network, a report that says why.
//   2. fixture -> the full path runs, flags what is below threshold, and touches no catalog byte.
//   3. cap     -> never more calls than EVENTLIVE_JEV_MAX_CALLS.
//   4. rules first -> a row a deterministic rule already settles is never asked about.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-reporter-'));
const rel = (name) => path.join(path.relative(root, tmp), name);

const realEvent = (id, extra = {}) => ({
  id,
  slug: id,
  title: `Event ${id}`,
  organizer: 'Official Organizer',
  city: 'Riyadh',
  venue: 'Riyadh Exhibition Centre',
  category: 'exhibitions-conferences',
  raw_category: 'exhibition',
  summary: 'An event.',
  starts_at: '2099-05-01T18:00:00+03:00',
  ends_at: '2099-05-01T21:00:00+03:00',
  updated_at: '2099-04-01T00:00:00.000Z',
  sessions_count: 0,
  tracks_count: 0,
  rooms_count: 0,
  live_updates_count: 0,
  approval_status: 'published',
  published_by: 'EventLive Auto Publisher',
  source_label: 'Official Source',
  source_url: 'https://example.gov.sa/event',
  source_confidence: 'approved-source',
  live_schedule_ready: false,
  tags: ['test'],
  ...extra
});

const events = [
  realEvent('event-clean-one'),
  realEvent('event-clean-two'),
  realEvent('event-clean-three'),
  // A row a deterministic rule already settles: it must never reach the model.
  realEvent('event-enrolment', { title: 'الترشح للدبلوم المتوسط في الأنظمة' })
];
fs.writeFileSync(path.join(tmp, 'catalog.json'), JSON.stringify({ generated_for: 'test', notes: [], events }, null, 2));
fs.writeFileSync(path.join(tmp, 'publish-report.json'), JSON.stringify({
  published: events.map((event) => ({ candidate_id: `c-${event.id}`, event_id: event.id })),
  linked_existing: []
}, null, 2));
const catalogBefore = fs.readFileSync(path.join(tmp, 'catalog.json'), 'utf8');

const baseEnv = {
  ...process.env,
  TYPESAFE_API_KEY: '',
  EVENTLIVE_EVENTS_CATALOG_FILE: rel('catalog.json'),
  EVENTLIVE_AUTO_PUBLISH_REPORT_JSON: rel('publish-report.json'),
  EVENTLIVE_JEV_REPORT_JSON: rel('report.json'),
  EVENTLIVE_JEV_REPORT_MD: rel('report.md')
};
const run = (env) => spawnSync(process.execPath, ['scripts/jev-quality-reporter.mjs'], { cwd: root, encoding: 'utf8', env: { ...baseEnv, ...env } });
const readReport = () => JSON.parse(fs.readFileSync(path.join(tmp, 'report.json'), 'utf8'));

// 1. no key
{
  const result = run({});
  assert.equal(result.status, 0, `must exit 0 without a key\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /JEV_QUALITY_SKIPPED/);
  const report = readReport();
  assert.equal(report.status, 'skipped');
  assert.match(report.reason, /TYPESAFE_API_KEY/, 'the report must say why it did nothing');
  assert.equal(report.asked, 0);
}

// 2. fixture path: flags what is below threshold, writes no data
{
  fs.writeFileSync(path.join(tmp, 'fixture.json'), JSON.stringify({
    default: { answers: { is_real_event: { type: 'noul', noul: 0.95 }, date_is_reliable: { type: 'noul', noul: 0.9 }, source_is_authoritative: { type: 'noul', noul: 0.95 } }, usage: { input_tokens: 100 } },
    'Event event-clean-two': { answers: { is_real_event: { type: 'noul', noul: 0.12 }, date_is_reliable: { type: 'noul', noul: 0.88 }, source_is_authoritative: { type: 'noul', noul: 0.91 } }, usage: { input_tokens: 100 } }
  }, null, 2));
  const result = run({ EVENTLIVE_JEV_FIXTURE: rel('fixture.json') });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = readReport();
  assert.equal(report.status, 'reported');
  assert.equal(report.asked, 3, 'the three clean rows are asked about');
  assert.equal(report.settled_by_rules, 1, 'the enrolment row is settled by a rule and never asked');
  assert.deepEqual(report.flagged, [{ id: 'event-clean-two', flag: 'is_real_event', probability: 0.12 }]);
  assert.equal(fs.readFileSync(path.join(tmp, 'catalog.json'), 'utf8'), catalogBefore, 'the reporter must not touch catalog data');
}

// 3. cap
{
  const result = run({ EVENTLIVE_JEV_FIXTURE: rel('fixture.json'), EVENTLIVE_JEV_MAX_CALLS: '1' });
  assert.equal(result.status, 0);
  const report = readReport();
  assert.equal(report.asked, 1, 'the cap is a hard ceiling on calls per run');
  assert.match(report.reason, /capped at 1/);
}

// 4. a zero cap asks nothing at all
{
  const result = run({ EVENTLIVE_JEV_FIXTURE: rel('fixture.json'), EVENTLIVE_JEV_MAX_CALLS: '0' });
  assert.equal(result.status, 0);
  assert.equal(readReport().asked, 0);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('JEV_QUALITY_REPORTER_OK no-key-skip + fixture-flag + cap + zero-cap');
