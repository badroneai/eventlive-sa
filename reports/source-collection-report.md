# EventLive Source Collection Report

- collected_at: 2026-10-17T07:19:07.046Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 29
- sources_attempted: 29
- sources_deferred: 19
- ended_min_year: 2022
- candidates_discovered: 215
- candidates_written: 405
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 311

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 22 | 0 | 0 | 13 | 9 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-10-17T07-19-07-046Z.json |  |
| moc-cultural-calendar | error | 33s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| mos-events | error | 31s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; page.goto: Timeout 30000ms exceeded. |
| experience-alula-events | ok | 1s | 11 | 0 | 3 | 0 | 11 | 0 | data/raw/source-snapshots/experience-alula-events-2026-10-17T07-19-07-046Z.html |  |
| mdlbeast-events | ok | 0s | 0 | 0 | 39 | 0 | 0 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-10-17T07-19-07-046Z.html | No future date-complete candidates found by the conservative extractor. |
| monshaat-events | error | 43s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-10-17T07-19-07-046Z.html |  |
| rfecc-whats-on | ok | 21s | 3 | 0 | 17 | 0 | 3 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-10-17T07-19-07-046Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | error | 54s | 0 | 0 | 0 | 0 | 0 | 0 | - | The operation was aborted due to timeout; page.goto: Timeout 30000ms exceeded. |
| visit-saudi-seasons | ok | 0s | 13 | 0 | 0 | 2 | 11 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-10-17T07-19-07-046Z.json |  |
| misk-hub-programs | ok | 4s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-10-17T07-19-07-046Z.html |  |
| dhahran-expo-calendar | ok | 1s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-10-17T07-19-07-046Z.html |  |
| ithra-events | ok | 1s | 71 | 0 | 183 | 23 | 48 | 0 | data/raw/source-snapshots/ithra-events-2026-10-17T07-19-07-046Z.json |  |
| misk-hub-events | ok | 2s | 3 | 0 | 0 | 0 | 2 | 0 | data/raw/source-snapshots/misk-hub-events-2026-10-17T07-19-07-046Z.html |  |
| saudi-pro-league-fixtures | error | 20s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [EAI_AGAIN] |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-10-17T07-19-07-046Z.json |  |
| visit-saudi-calendar-pdf | ok | 29s | 36 | 0 | 13 | 0 | 36 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-10-17T07-19-07-046Z.xml | Recovered via direct-pdf official evidence. |
| moc-cultural-subportals | error | 72s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| riyadh-city-events | ok | 17s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-10-17T07-19-07-046Z.html | No future date-complete candidates found by the conservative extractor. |
| scega-exhibitions-conferences | ok | 6s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-10-17T07-19-07-046Z.json | No future date-complete candidates found by the conservative extractor. |
| asharqia-chamber-events | ok | 18s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/asharqia-chamber-events-2026-10-17T07-19-07-046Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 404. No future date-complete candidates found by the conservative extractor. |
| qassim-chamber-events | ok | 0s | 1 | 0 | 2 | 0 | 1 | 0 | data/raw/source-snapshots/qassim-chamber-events-2026-10-17T07-19-07-046Z.html | Recovered via browser-probe official evidence. |
| umm-al-qura-events | ok | 12s | 6 | 0 | 3 | 0 | 6 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-10-17T07-19-07-046Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-10-17T07-19-07-046Z.html |  |
| hayy-jameel-events | ok | 394s | 13 | 0 | 0 | 0 | 13 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-10-17T07-19-07-046Z.html |  |
| saudicon-events | ok | 7s | 21 | 0 | 18 | 0 | 21 | 0 | data/raw/source-snapshots/saudicon-events-2026-10-17T07-19-07-046Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-10-23T07:17:51.157Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-10-23T07:17:51.157Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
| saudi-university-events | declared-cadence | 720h | 2026-11-15T07:17:51.157Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
| sdaia-calendar-events | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-10-23T07:17:51.157Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-10-23T07:17:51.157Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
| tabuk-chamber-events | zero-yield-cooldown | 168h | 2026-10-23T07:17:51.157Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
| qassim-university-events | declared-cadence | 168h | 2026-10-23T07:17:51.157Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-10-23T07:17:51.157Z |
| kau-events | zero-yield-cooldown | 72h | 2026-10-19T07:17:51.157Z |
