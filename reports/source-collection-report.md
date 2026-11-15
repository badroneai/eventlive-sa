# EventLive Source Collection Report

- collected_at: 2026-11-15T09:47:53.470Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 30
- sources_attempted: 30
- sources_deferred: 18
- ended_min_year: 2022
- candidates_discovered: 158
- candidates_written: 338
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 295

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 1s | 20 | 0 | 0 | 13 | 7 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-11-15T09-47-53-470Z.json |  |
| moc-cultural-calendar | error | 4s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| mos-events | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; live browser recovery deferred by recent failed probe cooldown |
| experience-alula-events | ok | 1s | 9 | 0 | 4 | 0 | 9 | 0 | data/raw/source-snapshots/experience-alula-events-2026-11-15T09-47-53-470Z.html |  |
| mdlbeast-events | ok | 0s | 1 | 0 | 38 | 0 | 1 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-11-15T09-47-53-470Z.html |  |
| monshaat-events | error | 42s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 1s | 1 | 0 | 7 | 0 | 1 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-11-15T09-47-53-470Z.html |  |
| rfecc-whats-on | ok | 19s | 2 | 0 | 18 | 0 | 2 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-11-15T09-47-53-470Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| visit-saudi-seasons | ok | 0s | 13 | 0 | 0 | 0 | 13 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-11-15T09-47-53-470Z.json |  |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-11-15T09-47-53-470Z.html |  |
| dhahran-expo-calendar | ok | 0s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-11-15T09-47-53-470Z.html |  |
| ithra-events | ok | 1s | 71 | 0 | 176 | 24 | 47 | 1 | data/raw/source-snapshots/ithra-events-2026-11-15T09-47-53-470Z.json |  |
| saudi-pro-league-fixtures | error | 20s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [EAI_AGAIN] |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-11-15T09-47-53-470Z.json |  |
| visit-saudi-calendar-pdf | ok | 9s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-11-15T09-47-53-470Z.xml | Recovered via direct-pdf official evidence. No future date-complete candidates found by the conservative extractor. |
| moc-cultural-subportals | error | 2s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| saudi-university-events | ok | 2s | 10 | 0 | 0 | 8 | 2 | 0 | data/raw/source-snapshots/saudi-university-events-2026-11-15T09-47-53-470Z.html |  |
| riyadh-city-events | ok | 12s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-11-15T09-47-53-470Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 12s | 1 | 0 | 7 | 0 | 1 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-11-15T09-47-53-470Z.html |  |
| scega-exhibitions-conferences | ok | 2s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-11-15T09-47-53-470Z.json | No future date-complete candidates found by the conservative extractor. |
| asharqia-chamber-events | ok | 18s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/asharqia-chamber-events-2026-11-15T09-47-53-470Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 404. No future date-complete candidates found by the conservative extractor. |
| qassim-chamber-events | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; live browser recovery deferred by recent failed probe cooldown |
| jazan-chamber-events | ok | 2s | 0 | 0 | 3 | 0 | 0 | 0 | data/raw/source-snapshots/jazan-chamber-events-2026-11-15T09-47-53-470Z.json | No future date-complete candidates found by the conservative extractor. |
| umm-al-qura-events | ok | 9s | 5 | 0 | 5 | 3 | 2 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-11-15T09-47-53-470Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-11-15T09-47-53-470Z.html |  |
| hayy-jameel-events | ok | 269s | 7 | 0 | 0 | 1 | 6 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-11-15T09-47-53-470Z.html |  |
| saudicon-events | ok | 4s | 6 | 0 | 9 | 0 | 6 | 0 | data/raw/source-snapshots/saudicon-events-2026-11-15T09-47-53-470Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| future-skills-catalog | zero-yield-cooldown | 72h | 2026-11-16T09:40:29.987Z |
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-11-20T09:40:29.987Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-11-16T09:40:29.987Z |
| misk-hub-events | zero-yield-cooldown | 72h | 2026-11-15T10:11:13.613Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-11-20T09:40:29.987Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-11-16T09:40:29.987Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-11-16T09:40:29.987Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-11-16T09:40:29.987Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-11-20T09:40:29.987Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-11-20T09:40:29.987Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-11-16T09:40:29.987Z |
| tabuk-chamber-events | zero-yield-cooldown | 168h | 2026-11-20T09:40:29.987Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-11-16T09:40:29.987Z |
| qassim-university-events | declared-cadence | 168h | 2026-11-20T09:40:29.987Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-11-16T09:40:29.987Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-11-16T09:40:29.987Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-11-20T09:40:29.987Z |
| kau-events | zero-yield-cooldown | 72h | 2026-11-16T09:40:29.987Z |
