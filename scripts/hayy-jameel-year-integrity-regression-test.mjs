// Gate: Hayy Jameel dates must carry the year the page states.
//
// Class of failure it blocks (2026-09-19): "July 2026" in a page heading was read as day "20"
// (the day regex swallowed the first two digits of the year) and inferYear() then assumed next
// year, so 40 of 93 Hayy rows advertised 2027 for screenings that happened in 2026 (and 2024).
// Two checks:
//   1. unit — the real listing-from-detail extractor on three page shapes: a monthly programme
//      page whose day list lives in the body ("July 1, 2, 3 … 2026"), an archive page whose
//      side-nav lists "2 February 2024, 6:00pm" screenings, and a side-nav-only page whose only
//      "date-like" text is the heading "July 2026" (must yield NO date, never a guessed one).
//   2. data — no Hayy row in data/events_catalog.json whose source_url slug states a year that
//      contradicts both starts_at and ends_at. (Ithra slugs are evergreen and are NOT checked.)
// Class: blocking-structural. Wired into ci:site-gates and the source-sync Regression checks step.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { extractHayyJameelListingFromDetail } from './collect-source-candidates.mjs';

const root = process.cwd();
const source = { id: 'hayy-jameel-events', name: "Hayy Jameel What's On", url: 'https://hayyjameel.org/whats-on/', owner: 'Art Jameel / Hayy Jameel' };
const nav = (inner) => `<nav class="uk-background-default side-nav uk-hidden@m">${inner}</nav>`;

// 1a. monthly programme page: heading carries the month/year, the day list sits in the body
{
  const html = `<html><head><title>Hayy Cinema | July 2026 | Hayy Jameel</title></head><body>
    ${nav('<h1>Hayy Cinema | July 2026</h1><p>by: Hayy Cinema</p><p>Book your tickets online or in person via the on-site ticketing booth.</p>')}
    <div class="uk-container"><h2>July 2026 At Hayy Cinema</h2>
      <p><b>A Matter of Life and Death</b>July 1, 2, 3, 4, 8, 9, 10, 12 2026</p>
      <p><b>The Stories</b>July 1, 2, 3, 5, 8, 11, 12 2026</p>
      <div class="related"><a href="/whats-on/other/">Other Event</a><span>October 25, 2026</span></div>
    </div></body></html>`;
  const listing = extractHayyJameelListingFromDetail(html, 'https://hayyjameel.org/whats-on/hayy-cinema-july-2026/', source);
  assert.ok(listing, 'monthly programme page must yield a listing');
  assert.equal(listing.starts_at.slice(0, 10), '2026-07-01', 'the day list carries the year 2026 — never "July 20, 2027"');
  assert.equal(listing.ends_at.slice(0, 10), '2026-07-12', 'the window ends on the last listed day, not on a related card date');
}

// 1b. archive page: screenings with explicit years in the side-nav
{
  const html = `<html><body>${nav('<h1>Hayy Cinema | FISHy (2023)</h1><p>by: Hayy Cinema</p><ul><li>2 February 2024, 6:00pm</li><li>3 February 2024, 7:00pm</li><li>9 March 2024, 6:00pm</li></ul>')}<p>Director: Someone Year: 2022</p></body></html>`;
  const listing = extractHayyJameelListingFromDetail(html, 'https://hayyjameel.org/whats-on/fishy/', source);
  assert.ok(listing, 'archive page must yield a listing');
  assert.equal(listing.starts_at.slice(0, 10), '2024-02-02', 'day-first screening lines keep their stated year');
  assert.equal(listing.ends_at.slice(0, 10), '2024-03-09');
}

// 1c. heading-only page: "July 2026" is a month statement, not a day. The extractor must publish
//     the page's own month as an official month window — never "July 20, 2027".
{
  const html = `<html><body>${nav('<h1>Hayy Cinema | July 2026</h1><p>by: Hayy Cinema</p>')}<p>No dates here.</p></body></html>`;
  const listing = extractHayyJameelListingFromDetail(html, 'https://hayyjameel.org/whats-on/hayy-cinema-july-2026/', source);
  assert.ok(listing, 'a heading-only monthly page must still yield a listing');
  assert.equal(listing.starts_at.slice(0, 10), '2026-07-01', 'month window starts on the 1st of the stated month/year');
  assert.equal(listing.ends_at.slice(0, 10), '2026-07-31', 'month window ends on the last day of the stated month');
  assert.equal(listing.date_precision, 'official-month-window', 'the derived precision must be declared, not passed off as a day');
  assert.equal(listing.time_precision, 'date-only-defaulted');
  const twoMonths = extractHayyJameelListingFromDetail(`<html><body>${nav('<h1>Hayy Cinema | March &amp; April 2026</h1>')}</body></html>`, 'https://hayyjameel.org/whats-on/march-april-2026-at-hayy-cinema/', source);
  assert.equal(twoMonths.starts_at.slice(0, 10), '2026-03-01');
  assert.equal(twoMonths.ends_at.slice(0, 10), '2026-04-30', 'a "March & April" heading spans both months');
}

// 1d. a screening list states its year once: "6 December 2022, 8pm | 17 December, 8pm". Reading
//     each token independently gave the year-less ones a guessed FUTURE year, which is how three
//     December 2022 retrospectives came to sit on the live site dated 2026-12-20.
{
  const html = `<html><body>${nav('<h1>Hayy Cinema | Alexandria Why (1979)</h1><p>Screening Schedule: 6 December 2022, 8pm | 17 December, 8pm | 24 December, 8pm | 31 December, 8pm</p>')}</body></html>`;
  const listing = extractHayyJameelListingFromDetail(html, 'https://hayyjameel.org/whats-on/alexandria-why/', source);
  assert.ok(listing, 'a schedule-list page must yield a listing');
  assert.equal(listing.starts_at.slice(0, 10), '2022-12-06', 'the stated year opens the window');
  assert.equal(listing.ends_at.slice(0, 10), '2022-12-31', 'the year-less dates that follow inherit it — never a guessed future year');
}

// 2. data — the catalog AND the candidate pool. The pool is a second store of the same dates:
//    auto-publish re-applies a matched candidate's window to its catalog row on every sync, and
//    a source that is not re-collected that run keeps its old candidates. Healing only the catalog
//    let the 2027 windows come straight back on the next sync (run 35425674234, 2026-09-19).
{
  const slugYearViolations = (rows, label) => {
    const violations = [];
    for (const row of rows) {
      if (row.source_label !== source.name) continue;
      const match = String(row.source_url || '').match(/(?:^|[^\d])(20\d{2})(?!\d)/);
      if (!match) continue;
      const year = match[1];
      if (String(row.starts_at).slice(0, 4) !== year && String(row.ends_at).slice(0, 4) !== year) violations.push(`${label} ${row.id} slug=${year} starts_at=${String(row.starts_at).slice(0, 10)}`);
    }
    return violations;
  };
  const events = JSON.parse(fs.readFileSync(path.join(root, 'data', 'events_catalog.json'), 'utf8')).events || [];
  const candidates = JSON.parse(fs.readFileSync(path.join(root, 'data', 'source_candidates.json'), 'utf8')).candidates || [];
  const violations = [...slugYearViolations(events, 'catalog'), ...slugYearViolations(candidates, 'candidate')];
  assert.equal(violations.length, 0, `Hayy rows whose slug year contradicts their window (run node scripts/heal-hayy-jameel-year-shift.mjs):\n${violations.join('\n')}`);
  console.log(`HAYY_YEAR_INTEGRITY_OK hayy_rows=${events.filter((event) => event.source_label === source.name).length} hayy_candidates=${candidates.filter((row) => row.source_label === source.name).length}`);
}
