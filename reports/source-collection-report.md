# EventLive Source Collection Report

- collected_at: 2026-09-01T21:20:13.101Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 47
- sources_attempted: 47
- sources_deferred: 1
- ended_min_year: 2022
- candidates_discovered: 252
- candidates_written: 510
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 415

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 3s | 30 | 0 | 0 | 19 | 11 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-09-01T21-20-13-101Z.json |  |
| moc-cultural-calendar | error | 33s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| mos-events | error | 51s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.mos.gov.sa/en/media/events", waiting until "domcontentloaded"
 |
| experience-alula-events | ok | 5s | 5 | 0 | 3 | 0 | 5 | 0 | data/raw/source-snapshots/experience-alula-events-2026-09-01T21-20-13-101Z.html |  |
| mdlbeast-events | ok | 0s | 6 | 0 | 35 | 3 | 3 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-09-01T21-20-13-101Z.html |  |
| monshaat-events | error | 72s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-09-01T21-20-13-101Z.html |  |
| rfecc-whats-on | ok | 4s | 6 | 0 | 14 | 0 | 6 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-09-01T21-20-13-101Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | ok | 21s | 5 | 0 | 7 | 3 | 2 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-09-01T21-20-13-101Z.html |  |
| visit-saudi-seasons | ok | 0s | 19 | 0 | 0 | 1 | 18 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-09-01T21-20-13-101Z.json |  |
| code-mcit-programs | ok | 27s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/code-mcit-programs-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 2 | 3 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-09-01T21-20-13-101Z.html |  |
| dhahran-expo-calendar | ok | 1s | 15 | 0 | 8 | 2 | 13 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-09-01T21-20-13-101Z.html |  |
| ithra-events | ok | 1s | 65 | 0 | 165 | 47 | 18 | 0 | data/raw/source-snapshots/ithra-events-2026-09-01T21-20-13-101Z.json |  |
| sdaia-academy-programs | ok | 67s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/sdaia-academy-programs-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| misk-hub-events | ok | 2s | 0 | 0 | 5 | 0 | 0 | 0 | data/raw/source-snapshots/misk-hub-events-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| jcci-events-center | ok | 9s | 0 | 0 | 13 | 0 | 0 | 0 | data/raw/source-snapshots/jcci-events-center-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| saudi-pro-league-fixtures | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-09-01T21-20-13-101Z.json |  |
| visit-saudi-calendar-pdf | ok | 47s | 32 | 0 | 61 | 0 | 32 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-09-01T21-20-13-101Z.xml | Recovered via direct-pdf official evidence. |
| moc-cultural-subportals | error | 72s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| discover-aseer-events | ok | 8s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/discover-aseer-events-2026-09-01T21-20-13-101Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 404. No future date-complete candidates found by the conservative extractor. |
| saudi-water-authority-events | ok | 1s | 8 | 0 | 1 | 0 | 8 | 0 | data/raw/source-snapshots/saudi-water-authority-events-2026-09-01T21-20-13-101Z.html |  |
| sfda-events | ok | 20s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/sfda-events-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| riyadh-city-events | ok | 14s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 10s | 1 | 0 | 1 | 0 | 1 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-09-01T21-20-13-101Z.html |  |
| makkah-chamber-events | ok | 1s | 0 | 0 | 10 | 0 | 0 | 0 | data/raw/source-snapshots/makkah-chamber-events-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| scega-exhibitions-conferences | ok | 1s | 4 | 0 | 0 | 0 | 4 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-09-01T21-20-13-101Z.json |  |
| asharqia-chamber-events | ok | 2s | 4 | 0 | 11 | 0 | 4 | 0 | data/raw/source-snapshots/asharqia-chamber-events-2026-09-01T21-20-13-101Z.html |  |
| qassim-chamber-events | ok | 0s | 1 | 0 | 2 | 1 | 0 | 0 | data/raw/source-snapshots/qassim-chamber-events-2026-09-01T21-20-13-101Z.html | Recovered via browser-probe official evidence. |
| abha-chamber-events | ok | 1s | 0 | 0 | 5 | 0 | 0 | 0 | data/raw/source-snapshots/abha-chamber-events-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| northern-borders-chamber-events | ok | 23s | 0 | 0 | 4 | 0 | 0 | 0 | data/raw/source-snapshots/northern-borders-chamber-events-2026-09-01T21-20-13-101Z.json | No future date-complete candidates found by the conservative extractor. |
| tabuk-chamber-events | ok | 2s | 0 | 0 | 2 | 0 | 0 | 0 | data/raw/source-snapshots/tabuk-chamber-events-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| jazan-chamber-events | ok | 85s | 0 | 0 | 0 | 0 | 0 | 0 | - | No future date-complete candidates found by the conservative extractor. |
| najran-municipality-summer-events | ok | 21s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/najran-municipality-summer-events-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| umm-al-qura-events | ok | 11s | 10 | 0 | 0 | 10 | 0 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-09-01T21-20-13-101Z.html |  |
| qassim-university-events | ok | 2s | 2 | 0 | 1 | 1 | 1 | 0 | data/raw/source-snapshots/qassim-university-events-2026-09-01T21-20-13-101Z.html |  |
| jouf-university-programs | ok | 3s | 0 | 0 | 1 | 0 | 0 | 0 | data/raw/source-snapshots/jouf-university-programs-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| madinah-chamber-events | ok | 0s | 0 | 0 | 12 | 0 | 0 | 0 | data/raw/source-snapshots/madinah-chamber-events-2026-09-01T21-20-13-101Z.json | No future date-complete candidates found by the conservative extractor. |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-09-01T21-20-13-101Z.html |  |
| hayy-jameel-events | ok | 204s | 17 | 0 | 0 | 5 | 12 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-09-01T21-20-13-101Z.html |  |
| informa-connect-saudi-events | ok | 1s | 5 | 0 | 2 | 0 | 5 | 0 | data/raw/source-snapshots/informa-connect-saudi-events-2026-09-01T21-20-13-101Z.html |  |
| kau-events | ok | 8s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/kau-events-2026-09-01T21-20-13-101Z.html | No future date-complete candidates found by the conservative extractor. |
| saudicon-events | ok | 42s | 7 | 0 | 33 | 3 | 4 | 3 | data/raw/source-snapshots/saudicon-events-2026-09-01T21-20-13-101Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| saudi-university-events | declared-cadence | 720h | 2026-09-09T13:49:51.211Z |
