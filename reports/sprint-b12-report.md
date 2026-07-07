# EventLive Sprint B1.2 Report

Generated: 2026-07-05 (Asia/Riyadh)

Scope: execute the §13 B1.2 recovery pass for source yield, date/city quality, temporal pages, search, live schedule readiness, and gate reporting.

## Executive Verdict

Gate B1.2 is **NOT PASS**.

The platform is healthier technically: the source-yield diagnostic exists, the periodic source sync now includes it, date/city/search/live/dedupe regression gates exist, source collection is error-free, temporal pages are generated, and placeholder city leakage was removed.

The gate cannot honestly be marked green because the current public source supply still does not meet the B1.2 thresholds:

- Catalog: **66 / 120** required.
- Productive collectors: **11 / 18** required.
- Unique cities: **8 / 12** required.
- Live schedule ready events: **1 / 5** required.

This report intentionally does not inflate the catalog with discovery-only sources or blocked/protected sources.

## Gate B1.2

| Gate | Target | Current | Status |
|---|---:|---:|---|
| Catalog records | >= 120 | 66 | FAIL |
| Moment share | >= 55% | 63.6% | PASS |
| Productive collectors | >= 18 / 24 | 11 / 24 | FAIL |
| Zero-yield collectors | <= 6 | 13 | FAIL |
| Unique cities | >= 12 | 8 | FAIL |
| Placeholder city `Saudi Arabia` | <= 5% | 0% | PASS |
| Live schedule ready events | >= 5 | 1 | FAIL |
| Collector errors | 0 | 0 | PASS |
| Temporal pages | today / week / weekend | generated | PASS |
| Search regression | working | PASS | PASS |
| Event kind regression | no break | PASS | PASS |
| Audience regression | no break | PASS | PASS |

## Current Metrics

| Metric | Value |
|---|---:|
| Raw catalog events | 65 |
| Built catalog events | 66 |
| Source candidates | 97 |
| Candidate sources attempted | 24 |
| Productive sources | 11 |
| Zero-yield sources | 13 |
| Active collectors in health gate | 24 |
| Collection coverage | 44% |
| Candidates discovered in last full collection | 96 |
| Candidates written | 97 |

## City Coverage

| City | Events |
|---|---:|
| Riyadh | 36 |
| Dhahran | 15 |
| Online | 5 |
| Nationwide | 4 |
| Jeddah | 3 |
| Diriyah | 1 |
| Aseer | 1 |
| Dammam | 1 |

The previous generic placeholder `Saudi Arabia` is now zero in the built catalog. National holidays were normalized to `Nationwide`, and Misk Riyadh programs were normalized to `Riyadh`.

## Live Schedule Readiness

| Event | City | Sessions | Status |
|---|---|---:|---|
| ملتقى التحول الرقمي في القطاع الحكومي 2026 | Riyadh | 5 | ready |

Only one event currently has real session rows sufficient for `live_schedule_ready`. The new rule is deliberately strict: official/partner source plus at least three complete sessions, unless an existing explicit ready flag or live URL is present.

## Source Yield Before / After

The B1.2 pass began from the §13 diagnosis: **24 collectors, 13 zero-yield**. After the recovery pass, the diagnostic is integrated and repeatable, but source productivity remains **11 productive / 13 zero-yield**. The remaining misses are now visible with concrete drop reasons instead of silent failure.

| Source | Raw Extracted | Future Complete | Written | Result / Reason |
|---|---:|---:|---:|---|
| Visit Saudi Calendar | 9 | 9 | 9 | productive |
| Ministry of Culture Cultural Calendar | 0 | 0 | 0 | no rows detected by extractor |
| Ministry of Sport Events | 3 | 0 | 0 | past-date:3 |
| Experience AlUla Events | 1 | 0 | 0 | past-date:1 |
| MDLBEAST Events | 0 | 0 | 0 | date/content signals exist but no complete future rows |
| Monsha'at All Events | 12 | 0 | 0 | past-date:12 |
| RFECC What's On | 20 | 6 | 6 | productive |
| Eye of Riyadh Events | 16 | 16 | 16 | discovery only, not auto-published |
| Eventbrite Saudi Arabia | 16 | 16 | 16 | discovery only, not auto-published |
| Tuwaiq Academy Bootcamps and Programs | 12 | 12 | 12 | productive |
| Future Skills MCIT Catalogue | 12 | 4 | 4 | productive |
| Visit Saudi Seasons | 4 | 4 | 4 | productive |
| CODE MCIT Programs | 0 | 0 | 0 | no rows detected by extractor |
| Misk Hub Programs | 5 | 5 | 5 | productive |
| Dhahran Expo Calendar | 22 | 15 | 15 | productive |
| Ithra Events | 0 | 0 | 0 | 2 attempts documented; listing lacks complete date rows, detail fetch timed out/failed |
| SDAIA Academy Programs | 0 | 0 | 0 | date/content signals exist but no complete future rows |
| Misk Hub Events | 5 | 0 | 0 | past-date:5 |
| Jeddah Chamber Exhibitions and Events Center | 1 | 0 | 0 | past-date:1 |
| Saudi Pro League Fixtures | 100 | 0 | 0 | 2 attempts documented; official API returns only past 2025/26 fixtures |
| Ministry of Culture Commission Calendars | 0 | 0 | 0 | date/content signals exist but no complete future rows |
| Discover Aseer Events | 1 | 1 | 1 | productive |
| Saudi Water Authority Events | 9 | 8 | 8 | productive |
| SDAIA Calendar and Events | 0 | 0 | 0 | date/content signals exist but no complete future rows |

## Publication Policy Outcome

The pass preserved the automated publishing direction without weakening trust boundaries:

- Official / trusted sources are eligible for auto-publish when date, city, source, and event kind rules pass.
- Discovery-only sources remain candidates and evidence, not public catalog records.
- Bot-protected or 403 paths were not bypassed.
- GEA / Riyadh Season remain partnership or legitimate public API/browser-investigation lanes, not scraping targets.

## Implemented Work

- Added `sources:yield` diagnostic and integrated it into `sources:sync`.
- Raised collector default limit to improve real source yield.
- Added shared Arabic normalization, date parsing, city normalization, live-ready, search, and dedupe utilities.
- Added regression scripts: `test:date-parse`, `test:city`, `test:live-ready`, `test:search`, `test:dedupe`.
- Added optional `sessions[]` schema support for catalog and source candidates.
- Preserved sessions through candidate collection, auto-publish, and site generation.
- Generated `today-events.html`, `this-week.html`, and `weekend.html`.
- Generated `dist/search-index.json`.
- Added screenshots for the B1.2 surfaces.

## Verification

The extended verification chain was run and passed after implementation:

- `npm run test:event-kind`
- `npm run test:csv`
- `npm run validate`
- `npm run build`
- `npm run test:audience`
- `npm run test:date-parse`
- `npm run test:city`
- `npm run test:live-ready`
- `npm run test:search`
- `npm run test:dedupe`
- `npm run test:source-extractors`
- `npm run test:source-plan`
- `npm run test:validation`
- `npm run test:source-auto-publish`
- `npm run test:source-health-gate`
- `npm run sources:health-gate`

Latest health gate result:

- Active collectors: 24.
- Coverage: 44%.
- Productive collectors: 11.
- Collector errors: 0.
- Candidates discovered: 96.
- Candidates written: 97.

## Screenshots

| Surface | Screenshot |
|---|---|
| Home | `output/screenshots/b12-home.png` |
| Today | `output/screenshots/b12-today.png` |
| This Week | `output/screenshots/b12-this-week.png` |
| Search / events surface | `output/screenshots/b12-search-surface.png` |

## Remaining Work To Pass B1.2

1. Add at least 7 more productive collectors from the extractor backlog or partnership lanes.
2. Increase the catalog by at least 54 trusted events without using discovery-only publication.
3. Add city coverage beyond Riyadh/Dhahran/Online by prioritizing Jeddah, AlUla, Makkah, Madinah, Khobar, Taif, Tabuk, Hail, Qassim, and Abha sources.
4. Build true session-level extraction for at least 4 additional event/program sources.
5. Keep GEA/Riyadh Season as partnership or legitimate public-data work, not bot-protection bypass.

## Decision

The right product decision is to keep B1.2 open. The infrastructure is now strong enough to support automated periodic ingestion, but the source yield and live schedule density are not yet sufficient for the "first destination for live Saudi events" promise.
