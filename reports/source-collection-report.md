# EventLive Source Collection Report

- collected_at: 2026-10-30T09:08:30.368Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 36
- sources_attempted: 36
- sources_deferred: 12
- ended_min_year: 2022
- candidates_discovered: 160
- candidates_written: 369
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 303

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 23 | 0 | 0 | 15 | 8 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-10-30T09-08-30-368Z.json |  |
| moc-cultural-calendar | error | 2s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| mos-events | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; live browser recovery deferred by recent failed probe cooldown |
| experience-alula-events | ok | 2s | 11 | 0 | 3 | 0 | 11 | 0 | data/raw/source-snapshots/experience-alula-events-2026-10-30T09-08-30-368Z.html |  |
| monshaat-events | error | 73s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-10-30T09-08-30-368Z.html |  |
| rfecc-whats-on | ok | 7s | 2 | 0 | 18 | 0 | 2 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-10-30T09-08-30-368Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | ok | 23s | 0 | 0 | 12 | 0 | 0 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-10-30T09-08-30-368Z.html | No future date-complete candidates found by the conservative extractor. |
| visit-saudi-seasons | ok | 0s | 15 | 0 | 0 | 0 | 15 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-10-30T09-08-30-368Z.json |  |
| code-mcit-programs | ok | 29s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/code-mcit-programs-2026-10-30T09-08-30-368Z.html | No future date-complete candidates found by the conservative extractor. |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 2 | 3 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-10-30T09-08-30-368Z.html |  |
| dhahran-expo-calendar | ok | 1s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-10-30T09-08-30-368Z.html |  |
| ithra-events | ok | 1s | 52 | 0 | 172 | 0 | 52 | 0 | data/raw/source-snapshots/ithra-events-2026-10-30T09-08-30-368Z.json |  |
| misk-hub-events | ok | 2s | 0 | 0 | 5 | 0 | 0 | 0 | data/raw/source-snapshots/misk-hub-events-2026-10-30T09-08-30-368Z.html | No future date-complete candidates found by the conservative extractor. |
| jcci-events-center | ok | 4s | 0 | 0 | 13 | 0 | 0 | 0 | data/raw/source-snapshots/jcci-events-center-2026-10-30T09-08-30-368Z.html | No future date-complete candidates found by the conservative extractor. |
| saudi-pro-league-fixtures | error | 20s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [EAI_AGAIN] |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-10-30T09-08-30-368Z.json |  |
| visit-saudi-calendar-pdf | ok | 13s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-10-30T09-08-30-368Z.xml | Recovered via direct-pdf official evidence. No future date-complete candidates found by the conservative extractor. |
| moc-cultural-subportals | error | 42s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| riyadh-city-events | ok | 13s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-10-30T09-08-30-368Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 12s | 0 | 0 | 2 | 0 | 0 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-10-30T09-08-30-368Z.html | No future date-complete candidates found by the conservative extractor. |
| makkah-chamber-events | ok | 1s | 0 | 0 | 10 | 0 | 0 | 0 | data/raw/source-snapshots/makkah-chamber-events-2026-10-30T09-08-30-368Z.html | No future date-complete candidates found by the conservative extractor. |
| scega-exhibitions-conferences | ok | 2s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-10-30T09-08-30-368Z.json | No future date-complete candidates found by the conservative extractor. |
| asharqia-chamber-events | error | 51s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; page.goto: Timeout 30000ms exceeded. |
| qassim-chamber-events | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; live browser recovery deferred by recent failed probe cooldown |
| abha-chamber-events | ok | 1s | 0 | 0 | 5 | 0 | 0 | 0 | data/raw/source-snapshots/abha-chamber-events-2026-10-30T09-08-30-368Z.html | No future date-complete candidates found by the conservative extractor. |
| tabuk-chamber-events | ok | 2s | 0 | 0 | 2 | 0 | 0 | 0 | data/raw/source-snapshots/tabuk-chamber-events-2026-10-30T09-08-30-368Z.html | No future date-complete candidates found by the conservative extractor. |
| umm-al-qura-events | ok | 13s | 4 | 0 | 6 | 0 | 4 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-10-30T09-08-30-368Z.html |  |
| qassim-university-events | ok | 2s | 1 | 0 | 2 | 0 | 1 | 0 | data/raw/source-snapshots/qassim-university-events-2026-10-30T09-08-30-368Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-10-30T09-08-30-368Z.html |  |
| hayy-jameel-events | ok | 414s | 10 | 0 | 0 | 3 | 7 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-10-30T09-08-30-368Z.html |  |
| informa-connect-saudi-events | ok | 2s | 5 | 0 | 2 | 0 | 5 | 0 | data/raw/source-snapshots/informa-connect-saudi-events-2026-10-30T09-08-30-368Z.html |  |
| saudicon-events | ok | 11s | 22 | 0 | 18 | 3 | 19 | 3 | data/raw/source-snapshots/saudicon-events-2026-10-30T09-08-30-368Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| mdlbeast-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| saudi-university-events | declared-cadence | 720h | 2026-11-15T07:17:51.157Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| kau-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
