# EventLive Sprint B1.3 Report

Generated: 2026-07-05 (Asia/Riyadh)

Scope: execute the §14 B1.3 recovery pass: dropped-row diagnostics, implicit-year verification, embedded JSON extraction, new official sources, feed/share surfaces, live schedule readiness, and gate reporting.

## Executive Verdict

Gate B1.3 is **NOT PASS**.

The platform improved materially and remains technically green: source diagnostics now show dropped samples, feeds and share links ship, collector errors are zero, and two official/public lanes were added or repaired:

- MDLBEAST embedded JSON now yields future events.
- Saudi university lane now includes KAUST API rows and KAU public event rows.
- Asharqia Chamber was added as an official Eastern Province source, with detail-page date correction to avoid broken SharePoint card dates.
- ICS subscription feeds and WhatsApp/X share actions are built and tested.
- Exhibition opening-hours sessions lift `live_schedule_ready` to 18.

The gate cannot honestly be marked green because source supply is still below the B1.3 thresholds:

- Catalog: **75 / 110** required.
- Productive collectors: **14 / 18** required.
- Unique cities: **9 / 12** required.
- Program-session live-ready events: **1 / 2** required.
- Zero-yield collectors: **12 / <=8** required.

No discovery-only source was promoted as trusted, and no bot-protection path was bypassed.

## Gate B1.3

| Gate | Target | Current | Status |
|---|---:|---:|---|
| Trusted catalog records | >= 110 | 75 | FAIL |
| Moment share | >= 55% | 68% | PASS |
| Productive collectors | >= 18 | 14 | FAIL |
| Zero-yield collectors | <= 8 | 12 | FAIL |
| Unique cities | >= 12 | 9 | FAIL |
| Live schedule ready events | >= 5 | 18 | PASS |
| Program-session live-ready events | >= 2 | 1 | FAIL |
| Feeds build + `test:feeds` | PASS | PASS | PASS |
| Share buttons on cards | present | present | PASS |
| Dropped samples in `sources:yield` | visible | visible | PASS |
| Collector errors | 0 | 0 | PASS |
| Source health gate | PASS | PASS | PASS |

## Before / After

| Metric | B1.2 Baseline | B1.3 Current | Delta |
|---|---:|---:|---:|
| Built catalog events | 66 | 75 | +9 |
| Raw catalog events | 65 | 74 | +9 |
| Source candidates | 97 | 107 | +10 |
| Source registry | 54 | 55 | +1 |
| Sources attempted in yield | 24 | 26 | +2 |
| Productive sources | 11 | 14 | +3 |
| Zero-yield sources | 13 | 12 | -1 |
| Cities | 8 | 9 | +1 |
| Moment events | 42 | 51 | +9 |
| Live schedule ready | 1 | 18 | +17 |
| Subscription feeds | 0 | 22 | +22 |

## Source Yield

| Source | Raw | Future | Result |
|---|---:|---:|---|
| visit-saudi-calendar | 9 | 9 | productive |
| mdlbeast-events | 41 | 3 | repaired via embedded JSON |
| rfecc-whats-on | 20 | 6 | productive |
| eye-of-riyadh-events | 16 | 16 | discovery candidate only |
| eventbrite-saudi | 17 | 17 | discovery candidate only |
| tuwaiq-academy-bootcamps | 12 | 12 | productive |
| future-skills-catalog | 12 | 4 | productive |
| visit-saudi-seasons | 4 | 4 | productive |
| misk-hub-programs | 5 | 5 | productive |
| dhahran-expo-calendar | 22 | 15 | productive |
| discover-aseer-events | 1 | 1 | productive |
| saudi-water-authority-events | 9 | 8 | productive |
| saudi-university-events | 14 | 4 | KAUST + KAU |
| asharqia-chamber-events | 15 | 2 | new official source |

## Zero / Failed Sources

| Source | What was tried | Why excluded or still zero |
|---|---|---|
| moc-cultural-calendar | Existing Sitecore/NextData extractor + embedded JSON helper. | No complete public future rows in current HTML snapshot. |
| mos-events | Existing Sitecore extraction. | All extracted rows are explicit 2024 past dates. |
| experience-alula-events | Landing page parse. | Current public page yielded one explicit February 2026 past event. |
| monshaat-events | Dropped samples + implicit-year hypothesis. | Hypothesis rejected: source rows are explicit 2018 archive dates. |
| code-mcit-programs | Existing HTML extractor and client-rendered scan. | No date/content rows exposed in fetched HTML. |
| ithra-events | Two documented attempts: listing hidden JSON/card inspection, then detail fetch. | Listing lacks date-complete rows; detail fetch timed out/failed from runtime. |
| sdaia-academy-programs | Academy page extractor and date-signal scan. | Date/content signals exist, but no complete future program row in fetched page. |
| misk-hub-events | Event card extraction. | Rows are valid but all currently past. |
| jcci-events-center | JCCI event-center card extraction. | One extracted row, explicit 2024 past date. |
| saudi-pro-league-fixtures | Official Pulselive API and adjacent season IDs. | Only ended 2025/26 fixtures available; seasonal exception, new season normally publishes later. |
| moc-cultural-subportals | Commission calendar scan via embedded JSON helper. | Signals exist, but no complete future public rows. |
| sdaia-calendar-events | Events page link/context extractor. | Signals exist, but no complete future public rows. |
| sfda-events | Probe + `/en/workshop` and `/en/news?tags=events`. | Public workshop list currently latest/past rows; no future complete rows found. |
| saudi-space-agency-events | Probe + public APIGW event search endpoint. | API works, but future-date query returned zero rows. |
| riyadh-city-events | Probe + manual Angular shell check. | Runtime fetch failed; manual shell exposes client app but no safe public extractor completed this round. |
| jeddah-season | Probe + official season URL attempt. | Fetch failed / inactive season lane; no bypass attempted. |
| diriyah-season | Probe. | Page is "Coming Soon"; no event rows. |
| historic-jeddah-albalad | Probe. | HTTP 403 / bot-protection; no bypass attempted. |
| ricec-events | Probe. | Fetch/DNS failure from runtime. |
| saudi-contractors-authority-events | Probe. | Fetch/DNS failure from runtime. |

## City Coverage

| City | Status |
|---|---|
| Riyadh | covered |
| Dhahran | covered |
| Online | covered |
| Nationwide | covered |
| Jeddah | covered |
| Diriyah | covered |
| Aseer | covered |
| Dammam | covered |
| Thuwal | new from KAUST |

Still missing for the gate: at least three more strong city lanes such as Makkah, Madinah, Khobar, Jubail, Qatif, Taif, Hail, Qassim, Tabuk, or Abha.

## Live Schedule Readiness

| Metric | Value |
|---|---:|
| Live-ready events | 18 |
| Program-session live-ready events | 1 |
| Opening-hours session support | yes |
| Program-session gap | one more event needed |

Opening-hours sessions are now generated for exhibition/venue events, which is useful for attendees. The remaining gap is true agenda/program sessions from event detail pages.

## Implemented Work

- Added dropped-row samples to `sources:yield`: raw date text, converted date, city, reason.
- Added implicit future-year regression in `test:date-parse`; Monsha'at was confirmed as archive data, not parser failure.
- Added `scripts/embedded-json-utils.mjs`.
- Repaired MDLBEAST extraction through embedded JSON traversal.
- Added KAUST event API extraction and KAU public events fallback under the Saudi university lane.
- Added Asharqia Chamber source and extractor with detail-page Arabic period correction.
- Added permanent ICS subscription feeds: all, city, and audience feeds.
- Added `test:feeds`.
- Added WhatsApp and X share actions to event cards.
- Added opening-hours sessions and live-ready regression coverage.
- Updated schemas for `session_type`.

## Verification

Passed after the final build:

- `npm run sources:yield`
- `npm run sources:collect`
- `npm run sources:auto-publish`
- `npm run validate`
- `npm run sources:ops`
- `npm run build`
- `npm run sources:health-gate`
- `npm run test:feeds`
- `npm run test:live-ready`
- `npm run test:source-extractors`
- `npm run test:event-kind`
- `npm run test:audience`
- `npm run test:date-parse`

Latest health gate:

`SOURCE_HEALTH_OK active_collectors=24 coverage=47% productive=14 collector_errors=0 candidates=107 probe_blocked_ratio=0.09`

## Screenshots

| Surface | Screenshot |
|---|---|
| Home | `reports/screenshots/sprint-b13-home.png` |
| Sources | `reports/screenshots/sprint-b13-sources.png` |
| Asharqia event detail | `reports/screenshots/sprint-b13-asharqia-event.png` |

## Decision

Keep B1.3 open. The ingestion machinery is stronger and safer, and the visitor-facing live utility improved, but the source network still lacks enough productive official collectors and true agenda-level sessions to claim the B1.3 gate.
