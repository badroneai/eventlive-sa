# EventLive Source Collection Report

- collected_at: 2026-11-17T11:05:09.808Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 29
- sources_attempted: 29
- sources_deferred: 19
- ended_min_year: 2022
- candidates_discovered: 142
- candidates_written: 323
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 295

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 1s | 19 | 0 | 0 | 12 | 7 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-11-17T11-05-09-808Z.json |  |
| moc-cultural-calendar | error | 2s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| mos-events | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; live browser recovery deferred by recent failed probe cooldown |
| experience-alula-events | ok | 3s | 6 | 0 | 5 | 0 | 6 | 0 | data/raw/source-snapshots/experience-alula-events-2026-11-17T11-05-09-808Z.html |  |
| mdlbeast-events | ok | 0s | 2 | 0 | 37 | 0 | 2 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-11-17T11-05-09-808Z.html |  |
| monshaat-events | error | 42s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 1s | 1 | 0 | 7 | 0 | 1 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-11-17T11-05-09-808Z.html |  |
| rfecc-whats-on | ok | 20s | 2 | 0 | 18 | 0 | 2 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-11-17T11-05-09-808Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| visit-saudi-seasons | ok | 0s | 12 | 0 | 0 | 0 | 12 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-11-17T11-05-09-808Z.json |  |
| misk-hub-programs | ok | 4s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-11-17T11-05-09-808Z.html |  |
| dhahran-expo-calendar | ok | 1s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-11-17T11-05-09-808Z.html |  |
| ithra-events | ok | 1s | 70 | 0 | 176 | 30 | 40 | 0 | data/raw/source-snapshots/ithra-events-2026-11-17T11-05-09-808Z.json |  |
| saudi-pro-league-fixtures | error | 16s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [EAI_AGAIN] |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-11-17T11-05-09-808Z.json |  |
| visit-saudi-calendar-pdf | ok | 10s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-11-17T11-05-09-808Z.xml | Recovered via direct-pdf official evidence. No future date-complete candidates found by the conservative extractor. |
| moc-cultural-subportals | error | 3s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| riyadh-city-events | ok | 10s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-11-17T11-05-09-808Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 11s | 1 | 0 | 7 | 0 | 1 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-11-17T11-05-09-808Z.html |  |
| scega-exhibitions-conferences | error | 21s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| asharqia-chamber-events | error | 21s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; live browser recovery deferred by recent failed probe cooldown |
| qassim-chamber-events | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; live browser recovery deferred by recent failed probe cooldown |
| jazan-chamber-events | ok | 2s | 1 | 0 | 3 | 0 | 1 | 0 | data/raw/source-snapshots/jazan-chamber-events-2026-11-17T11-05-09-808Z.json |  |
| umm-al-qura-events | ok | 10s | 4 | 0 | 5 | 3 | 1 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-11-17T11-05-09-808Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-11-17T11-05-09-808Z.html |  |
| hayy-jameel-events | ok | 271s | 6 | 0 | 0 | 0 | 6 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-11-17T11-05-09-808Z.html |  |
| saudicon-events | ok | 4s | 6 | 0 | 9 | 6 | 0 | 6 | data/raw/source-snapshots/saudicon-events-2026-11-17T11-05-09-808Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| future-skills-catalog | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-11-20T09:40:29.987Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
| misk-hub-events | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-11-20T09:40:29.987Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
| saudi-university-events | declared-cadence | 720h | 2026-12-15T09:47:53.470Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-11-20T09:40:29.987Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-11-20T09:40:29.987Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
| tabuk-chamber-events | zero-yield-cooldown | 168h | 2026-11-20T09:40:29.987Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
| qassim-university-events | declared-cadence | 168h | 2026-11-20T09:40:29.987Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-11-20T09:40:29.987Z |
| kau-events | zero-yield-cooldown | 72h | 2026-11-19T10:09:16.202Z |
