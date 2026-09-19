// Gate: a record that is not an attendable event must not be published as one.
//
// Wave 2 of the Event Quality Lab (2026-09-19) classified every public upcoming row with a typed
// question rather than a yes/no one: 109 of 372 came back as something other than an attendable
// event. Three families are unambiguous (checked by hand against their own source pages) and are
// refused at publication time by scripts/non-event-record.mjs. Three checks:
//   1. unit — each family is recognised, and the look-alikes are NOT (a 424-day entertainment
//      experience with real copy is an event; a concert is an event).
//   2. write path — a candidate of each family, otherwise perfectly publishable, is blocked by
//      the real auto-publish script with a reason that names the family.
//   3. ratchet — the number of live catalog rows in these families may shrink, never grow.
//      Unpublishing the ones already live is an owner decision, so this is debt, not a failure.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { nonEventReason } from './non-event-record.mjs';

const root = process.cwd();

// 1. unit
{
  assert.equal(nonEventReason({ title: 'الترشح للدبلوم المتوسط في أمن المعلومات في الجبيل' }), 'enrolment-announcement');
  assert.equal(nonEventReason({ title: 'التسجيل والسداد لدبلوم المتوسط (عن بعد) في أمن المعلومات' }), 'enrolment-announcement');
  assert.equal(nonEventReason({ title: 'نموذج التسجيل والسداد للدبلوم المتوسط في البصريات' }), 'enrolment-announcement');
  assert.equal(nonEventReason({ title: 'Application Deadline: Discover Your Path' }), 'enrolment-announcement');
  assert.equal(nonEventReason({ title: 'Discover Your Path Program', description: 'شروط القبول للدبلومات المدفوعة بالكلية التطبيقية يشترط للقبول ما يأتي' }), 'enrolment-announcement', 'the admission boilerplate settles it even when the title was overwritten');
  assert.equal(nonEventReason({ title: 'Hayy Cinema | Open Call: In Short: Film Programme' }), 'open-call');
  assert.equal(nonEventReason({ title: 'دعوة مفتوحة لتقديم الأفلام القصيرة' }), 'open-call');
  assert.equal(nonEventReason({ title: 'Urban transformation Initiative', starts_at: '2024-10-31T00:00:00+03:00', ends_at: '2026-11-01T00:00:00+03:00', description: 'Saudi Arabia Ministry of Culture', sessions_count: 0 }), 'standing-initiative');

  // Look-alikes that must stay publishable.
  assert.equal(nonEventReason({ title: 'Poppy Playtime', starts_at: '2025-10-10T10:00:00+03:00', ends_at: '2026-12-08T10:00:00+03:00', sessions_count: 0, description: 'At Boulevard City, step into the eerie world of Poppy Playtime, where the toys are alive and the factory hides a story for families and thrill seekers alike across several themed rooms.' }), '', 'a long-running experience with its own copy is an event');
  assert.equal(nonEventReason({ title: 'Mohamed Hamaki Concert', starts_at: '2026-07-17T21:00:00+03:00', ends_at: '2026-07-18T01:00:00+03:00', sessions_count: 1, description: 'A live concert.' }), '');
  assert.equal(nonEventReason({ title: 'معسكر طويق السيبراني', starts_at: '2026-09-13T08:00:00+03:00', ends_at: '2026-12-31T16:00:00+03:00', sessions_count: 0, description: 'معسكر تدريبي مكثف يمتد ثلاثة أشهر ويشمل مشاريع تطبيقية ومسارات تعلم متعددة للمتدربين المقبولين.' }), '', 'a three-month bootcamp is an event, not an initiative');
  assert.equal(nonEventReason({}), '');
}

// 2. write path
{
  const families = [
    { id: 'enrolment', title: 'الترشح للدبلوم المتوسط في الأنظمة', expect: 'enrolment-announcement', starts_at: '2099-11-02T08:00:00+03:00', ends_at: '2099-11-02T10:00:00+03:00' },
    { id: 'opencall', title: 'Test Cinema | Open Call: Shorts', expect: 'open-call', starts_at: '2099-11-02T08:00:00+03:00', ends_at: '2099-11-02T10:00:00+03:00' },
    { id: 'initiative', title: 'Test Standing Initiative', expect: 'standing-initiative', starts_at: '2099-01-01T09:00:00+03:00', ends_at: '2101-12-31T18:00:00+03:00' }
  ];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'non-event-'));
  const relTmp = path.relative(root, tmp);
  const candidates = families.map((family, index) => ({
    id: `candidate-non-event-${family.id}`,
    title: family.title,
    organizer: 'Official Organizer',
    city: 'Riyadh',
    venue: 'Test Venue',
    category: 'education-training',
    summary: 'Official row used by the non-event publication gate.',
    starts_at: family.starts_at,
    ends_at: family.ends_at,
    source_type: 'government-calendar',
    source_url: `https://uqu.edu.sa/App/Events/9000${index}`,
    source_label: 'Test Source',
    source_owner: 'Test Owner',
    evidence_url: `https://uqu.edu.sa/App/Events/9000${index}`,
    raw_snapshot_path: 'data/raw/source-snapshots/test.html',
    discovered_at: '2099-01-01T00:00:00.000Z',
    discovery_method: 'official-page',
    confidence: 'official',
    review_status: 'approved-for-catalog',
    publication_gate: 'catalog-review',
    tags: ['test']
  }));
  fs.writeFileSync(path.join(tmp, 'catalog.json'), JSON.stringify({ generated_for: 'test', notes: [], events: [] }, null, 2));
  fs.writeFileSync(path.join(tmp, 'candidates.json'), JSON.stringify({ generated_for: 'test', notes: [], candidates }, null, 2));
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
  const report = JSON.parse(fs.readFileSync(path.join(tmp, 'report.json'), 'utf8'));
  const published = JSON.parse(fs.readFileSync(path.join(tmp, 'catalog.json'), 'utf8')).events;
  assert.equal(published.length, 0, `no non-event may be published, got ${published.map((event) => event.id).join(', ')}`);
  for (const family of families) {
    const blocked = report.blocked.find((row) => row.candidate_id === `candidate-non-event-${family.id}`);
    assert.ok(blocked, `${family.id} candidate must appear in the blocked list`);
    assert.match(blocked.reason, new RegExp(family.expect), `${family.id} must be blocked with its family named, got "${blocked.reason}"`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 3. ratchet
{
  // Live rows in these families on 2026-09-19, when the classification ran. Unpublishing one is an
  // owner decision, so this number is allowed to fall and never to rise: a rise means the blocker
  // stopped working and a new non-event reached the catalog.
  const BASELINE = Number(process.env.EVENTLIVE_NON_EVENT_BASELINE || 56);
  const events = JSON.parse(fs.readFileSync(path.join(root, 'data', 'events_catalog.json'), 'utf8')).events || [];
  const matched = events.map((event) => ({ id: event.id, reason: nonEventReason(event) })).filter((row) => row.reason);
  assert.ok(
    matched.length <= BASELINE,
    `non-event rows in the catalog grew from ${BASELINE} to ${matched.length}; the publication blocker let one through:\n${matched.slice(0, 20).map((row) => `${row.id} [${row.reason}]`).join('\n')}`
  );
  const byReason = matched.reduce((acc, row) => ({ ...acc, [row.reason]: (acc[row.reason] || 0) + 1 }), {});
  console.log(`NON_EVENT_PUBLICATION_OK live_debt=${matched.length}/${BASELINE} ${JSON.stringify(byReason)}`);
}
