# EventLive Source Collection Report

- collected_at: 2026-10-07T09:04:15.938Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 28
- sources_attempted: 28
- sources_deferred: 20
- ended_min_year: 2022
- candidates_discovered: 207
- candidates_written: 403
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 334

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 23 | 0 | 0 | 11 | 12 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-10-07T09-04-15-938Z.json |  |
| moc-cultural-calendar | error | 2s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| mos-events | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; live browser recovery deferred by recent failed probe cooldown |
| experience-alula-events | ok | 2s | 11 | 0 | 3 | 0 | 11 | 0 | data/raw/source-snapshots/experience-alula-events-2026-10-07T09-04-15-938Z.html |  |
| mdlbeast-events | ok | 0s | 2 | 0 | 37 | 0 | 2 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-10-07T09-04-15-938Z.html |  |
| monshaat-events | error | 43s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-10-07T09-04-15-938Z.html |  |
| rfecc-whats-on | ok | 5s | 3 | 0 | 17 | 0 | 3 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-10-07T09-04-15-938Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | ok | 18s | 0 | 0 | 12 | 0 | 0 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-10-07T09-04-15-938Z.html | No future date-complete candidates found by the conservative extractor. |
| visit-saudi-seasons | ok | 0s | 11 | 0 | 0 | 0 | 11 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-10-07T09-04-15-938Z.json |  |
| misk-hub-programs | ok | 7s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-10-07T09-04-15-938Z.html |  |
| dhahran-expo-calendar | ok | 1s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-10-07T09-04-15-938Z.html |  |
| ithra-events | ok | 1s | 71 | 0 | 185 | 4 | 67 | 0 | data/raw/source-snapshots/ithra-events-2026-10-07T09-04-15-938Z.json |  |
| saudi-pro-league-fixtures | error | 20s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [EAI_AGAIN] |
| saudi-space-agency-events | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH] |
| visit-saudi-calendar-pdf | ok | 10s | 23 | 0 | 39 | 0 | 23 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-10-07T09-04-15-938Z.xml | Recovered via direct-pdf official evidence. |
| moc-cultural-subportals | error | 42s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| riyadh-city-events | ok | 17s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-10-07T09-04-15-938Z.html | No future date-complete candidates found by the conservative extractor. |
| scega-exhibitions-conferences | ok | 2s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-10-07T09-04-15-938Z.json |  |
| asharqia-chamber-events | ok | 21s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/asharqia-chamber-events-2026-10-07T09-04-15-938Z.html | Recovered via browser-probe official evidence. No future date-complete candidates found by the conservative extractor. |
| qassim-chamber-events | ok | 6s | 3 | 0 | 0 | 0 | 3 | 0 | data/raw/source-snapshots/qassim-chamber-events-2026-10-07T09-04-15-938Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 403. |
| umm-al-qura-events | ok | 14s | 3 | 0 | 7 | 1 | 2 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-10-07T09-04-15-938Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-10-07T09-04-15-938Z.html |  |
| hayy-jameel-events | ok | 342s | 18 | 0 | 0 | 2 | 16 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-10-07T09-04-15-938Z.html |  |
| saudicon-events | ok | 8s | 24 | 0 | 15 | 0 | 24 | 0 | data/raw/source-snapshots/saudicon-events-2026-10-07T09-04-15-938Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-10-07T10:32:17.197Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| misk-hub-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-10-07T10:32:17.197Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| saudi-university-events | declared-cadence | 720h | 2026-10-15T15:56:46.259Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| sdaia-calendar-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-10-07T10:32:17.197Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-10-07T10:32:17.197Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| tabuk-chamber-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| qassim-university-events | declared-cadence | 168h | 2026-10-07T10:32:17.197Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-10-07T10:32:17.197Z |
| kau-events | zero-yield-cooldown | 72h | 2026-10-09T01:21:58.700Z |
