# EventLive Source Collection Report

- collected_at: 2026-08-17T13:13:35.733Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 31
- sources_attempted: 31
- sources_deferred: 17
- ended_min_year: 2022
- candidates_discovered: 314
- candidates_written: 631
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 277

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 0s | 38 | 0 | 0 | 25 | 13 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-08-17T13-13-35-733Z.json |  |
| moc-cultural-calendar | error | 35s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| mos-events | error | 51s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.mos.gov.sa/en/media/events", waiting until "domcontentloaded"
 |
| experience-alula-events | ok | 6s | 5 | 0 | 3 | 0 | 5 | 0 | data/raw/source-snapshots/experience-alula-events-2026-08-17T13-13-35-733Z.html |  |
| mdlbeast-events | ok | 0s | 3 | 0 | 38 | 0 | 3 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-08-17T13-13-35-733Z.html |  |
| monshaat-events | error | 73s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-08-17T13-13-35-733Z.html |  |
| rfecc-whats-on | ok | 7s | 6 | 0 | 14 | 0 | 6 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-08-17T13-13-35-733Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | ok | 19s | 6 | 0 | 6 | 0 | 6 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-08-17T13-13-35-733Z.html |  |
| visit-saudi-seasons | ok | 0s | 25 | 0 | 0 | 0 | 25 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-08-17T13-13-35-733Z.json |  |
| misk-hub-programs | ok | 4s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-08-17T13-13-35-733Z.html |  |
| dhahran-expo-calendar | ok | 1s | 16 | 0 | 8 | 0 | 16 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-08-17T13-13-35-733Z.html |  |
| ithra-events | ok | 1s | 65 | 0 | 160 | 0 | 65 | 0 | data/raw/source-snapshots/ithra-events-2026-08-17T13-13-35-733Z.json |  |
| misk-hub-events | ok | 2s | 2 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/misk-hub-events-2026-08-17T13-13-35-733Z.html |  |
| saudi-pro-league-fixtures | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed |
| saudi-space-agency-events | error | 2s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed |
| visit-saudi-calendar-pdf | ok | 5s | 81 | 0 | 12 | 0 | 81 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-08-17T13-13-35-733Z.xml | Recovered via direct-pdf official evidence. |
| moc-cultural-subportals | error | 72s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| saudi-water-authority-events | ok | 1s | 8 | 0 | 1 | 0 | 8 | 0 | data/raw/source-snapshots/saudi-water-authority-events-2026-08-17T13-13-35-733Z.html |  |
| riyadh-city-events | ok | 17s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-08-17T13-13-35-733Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 12s | 2 | 0 | 1 | 0 | 2 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-08-17T13-13-35-733Z.html |  |
| scega-exhibitions-conferences | ok | 2s | 4 | 0 | 0 | 0 | 4 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-08-17T13-13-35-733Z.json |  |
| qassim-chamber-events | ok | 7s | 0 | 0 | 3 | 0 | 0 | 0 | data/raw/source-snapshots/qassim-chamber-events-2026-08-17T13-13-35-733Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 403. No future date-complete candidates found by the conservative extractor. |
| umm-al-qura-events | ok | 9s | 10 | 0 | 0 | 2 | 8 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-08-17T13-13-35-733Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-08-17T13-13-35-733Z.html |  |
| hayy-jameel-events | ok | 208s | 20 | 0 | 0 | 0 | 20 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-08-17T13-13-35-733Z.html |  |
| kau-events | ok | 9s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/kau-events-2026-08-17T13-13-35-733Z.html | No future date-complete candidates found by the conservative extractor. |
| saudicon-events | ok | 28s | 14 | 0 | 26 | 1 | 13 | 1 | data/raw/source-snapshots/saudicon-events-2026-08-17T13-13-35-733Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-08-18T02:32:28.692Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-08-19T07:16:31.258Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-08-18T02:32:28.692Z |
| discover-aseer-events | zero-yield-cooldown | 6h | 2026-08-17T13:39:07.621Z |
| saudi-university-events | declared-cadence | 720h | 2026-09-09T13:49:51.211Z |
| sfda-events | zero-yield-cooldown | 24h | 2026-08-18T01:58:45.210Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-08-18T02:32:28.692Z |
| asharqia-chamber-events | error-cooldown | 24h | 2026-08-17T18:51:22.894Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-08-18T02:32:28.692Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-08-18T07:18:29.989Z |
| tabuk-chamber-events | zero-yield-cooldown | 72h | 2026-08-18T18:51:37.461Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-08-18T18:51:37.461Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-08-20T01:58:45.210Z |
| qassim-university-events | declared-cadence | 168h | 2026-08-18T02:32:28.692Z |
| jouf-university-programs | declared-cadence | 168h | 2026-08-18T02:32:28.692Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-08-18T18:51:37.461Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-08-18T02:32:28.692Z |
