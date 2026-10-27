# EventLive Source Collection Report

- collected_at: 2026-10-27T08:55:30.800Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 29
- sources_attempted: 29
- sources_deferred: 19
- ended_min_year: 2022
- candidates_discovered: 160
- candidates_written: 380
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 259

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 23 | 0 | 0 | 15 | 8 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-10-27T08-55-30-800Z.json |  |
| moc-cultural-calendar | error | 3s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| mos-events | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; live browser recovery deferred by recent failed probe cooldown |
| experience-alula-events | ok | 3s | 11 | 0 | 3 | 0 | 11 | 0 | data/raw/source-snapshots/experience-alula-events-2026-10-27T08-55-30-800Z.html |  |
| monshaat-events | error | 42s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-10-27T08-55-30-800Z.html |  |
| rfecc-whats-on | ok | 8s | 3 | 0 | 17 | 0 | 3 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-10-27T08-55-30-800Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | ok | 18s | 0 | 0 | 12 | 0 | 0 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-10-27T08-55-30-800Z.html | No future date-complete candidates found by the conservative extractor. |
| visit-saudi-seasons | ok | 0s | 15 | 0 | 0 | 0 | 15 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-10-27T08-55-30-800Z.json |  |
| misk-hub-programs | ok | 7s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-10-27T08-55-30-800Z.html |  |
| dhahran-expo-calendar | ok | 1s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-10-27T08-55-30-800Z.html |  |
| ithra-events | ok | 1s | 52 | 0 | 172 | 0 | 52 | 0 | data/raw/source-snapshots/ithra-events-2026-10-27T08-55-30-800Z.json |  |
| misk-hub-events | ok | 2s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/misk-hub-events-2026-10-27T08-55-30-800Z.html |  |
| saudi-pro-league-fixtures | error | 20s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [EAI_AGAIN] |
| saudi-space-agency-events | ok | 2s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-10-27T08-55-30-800Z.json |  |
| visit-saudi-calendar-pdf | ok | 18s | 0 | 0 | 0 | 0 | 0 | 2 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-10-27T08-55-30-800Z.xml | Recovered via direct-pdf official evidence. No future date-complete candidates found by the conservative extractor. |
| moc-cultural-subportals | error | 42s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| riyadh-city-events | ok | 17s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-10-27T08-55-30-800Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 11s | 0 | 0 | 2 | 0 | 0 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-10-27T08-55-30-800Z.html | No future date-complete candidates found by the conservative extractor. |
| scega-exhibitions-conferences | ok | 2s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-10-27T08-55-30-800Z.json | No future date-complete candidates found by the conservative extractor. |
| asharqia-chamber-events | error | 21s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; live browser recovery deferred by recent failed probe cooldown |
| qassim-chamber-events | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; live browser recovery deferred by recent failed probe cooldown |
| umm-al-qura-events | ok | 11s | 8 | 0 | 2 | 6 | 2 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-10-27T08-55-30-800Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-10-27T08-55-30-800Z.html |  |
| hayy-jameel-events | ok | 392s | 10 | 0 | 0 | 1 | 9 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-10-27T08-55-30-800Z.html |  |
| saudicon-events | ok | 12s | 22 | 0 | 18 | 0 | 22 | 0 | data/raw/source-snapshots/saudicon-events-2026-10-27T08-55-30-800Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| mdlbeast-events | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-10-30T07:39:03.063Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-10-30T07:39:03.063Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
| saudi-university-events | declared-cadence | 720h | 2026-11-15T07:17:51.157Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-10-30T07:39:03.063Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-10-30T07:39:03.063Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
| tabuk-chamber-events | zero-yield-cooldown | 168h | 2026-10-30T07:39:03.063Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
| qassim-university-events | declared-cadence | 168h | 2026-10-30T07:39:03.063Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-10-30T07:39:03.063Z |
| kau-events | zero-yield-cooldown | 72h | 2026-10-29T08:17:28.357Z |
