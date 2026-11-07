# EventLive Source Collection Report

- collected_at: 2026-11-07T17:01:28.323Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 20
- sources_attempted: 20
- sources_deferred: 28
- ended_min_year: 2022
- candidates_discovered: 125
- candidates_written: 330
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 263

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 20 | 0 | 1 | 13 | 7 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-11-07T17-01-28-323Z.json |  |
| moc-cultural-calendar | error | 6s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UNABLE_TO_VERIFY_LEAF_SIGNATURE]; fetch failed [UNABLE_TO_VERIFY_LEAF_SIGNATURE] |
| experience-alula-events | ok | 5s | 10 | 0 | 3 | 0 | 10 | 0 | data/raw/source-snapshots/experience-alula-events-2026-11-07T17-01-28-323Z.html |  |
| mdlbeast-events | ok | 0s | 0 | 0 | 39 | 0 | 0 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-11-07T17-01-28-323Z.html | No future date-complete candidates found by the conservative extractor. |
| monshaat-events | ok | 20s | 2 | 0 | 0 | 0 | 2 | 0 | data/raw/source-snapshots/monshaat-events-2026-11-07T17-01-28-323Z.html |  |
| invest-saudi-events | ok | 2s | 2 | 0 | 6 | 0 | 2 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-11-07T17-01-28-323Z.html |  |
| rfecc-whats-on | ok | 19s | 2 | 0 | 18 | 0 | 2 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-11-07T17-01-28-323Z.html |  |
| visit-saudi-seasons | ok | 0s | 13 | 0 | 1 | 0 | 13 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-11-07T17-01-28-323Z.json |  |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-11-07T17-01-28-323Z.html |  |
| dhahran-expo-calendar | ok | 1s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-11-07T17-01-28-323Z.html |  |
| ithra-events | ok | 1s | 49 | 0 | 169 | 0 | 49 | 0 | data/raw/source-snapshots/ithra-events-2026-11-07T17-01-28-323Z.json |  |
| saudi-space-agency-events | error | 2s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH] |
| moc-cultural-subportals | error | 5s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UNABLE_TO_VERIFY_LEAF_SIGNATURE]; fetch failed [UNABLE_TO_VERIFY_LEAF_SIGNATURE] |
| riyadh-city-events | ok | 14s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-11-07T17-01-28-323Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 12s | 1 | 0 | 7 | 0 | 1 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-11-07T17-01-28-323Z.html |  |
| asharqia-chamber-events | error | 2s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 404; live browser recovery deferred by recent failed probe cooldown |
| jazan-chamber-events | ok | 2s | 1 | 0 | 2 | 0 | 1 | 0 | data/raw/source-snapshots/jazan-chamber-events-2026-11-07T17-01-28-323Z.json |  |
| umm-al-qura-events | ok | 13s | 7 | 0 | 3 | 0 | 7 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-11-07T17-01-28-323Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-11-07T17-01-28-323Z.html |  |
| hayy-jameel-events | ok | 304s | 7 | 0 | 0 | 0 | 7 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-11-07T17-01-28-323Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| mos-events | error-cooldown | 24h | 2026-11-08T09:10:00.727Z |
| eye-of-riyadh-events | discovery-daily | 24h | 2026-11-08T09:10:00.727Z |
| eventbrite-saudi | discovery-daily | 24h | 2026-11-08T09:10:00.727Z |
| tuwaiq-academy-bootcamps | error-cooldown | 24h | 2026-11-08T09:10:00.727Z |
| future-skills-catalog | zero-yield-cooldown | 72h | 2026-11-08T09:49:55.847Z |
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-11-13T09:31:59.431Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-11-08T09:49:55.847Z |
| misk-hub-events | zero-yield-cooldown | 24h | 2026-11-08T09:10:00.727Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-11-13T09:31:59.431Z |
| saudi-pro-league-fixtures | error-cooldown | 24h | 2026-11-08T09:10:00.727Z |
| visit-saudi-calendar-pdf | declared-cadence | 168h | 2026-11-14T09:10:00.727Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-11-08T09:49:55.847Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-11-08T09:49:55.847Z |
| saudi-university-events | declared-cadence | 720h | 2026-11-15T07:17:51.157Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-11-08T09:49:55.847Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-11-13T09:31:59.431Z |
| scega-exhibitions-conferences | zero-yield-cooldown | 24h | 2026-11-08T09:10:00.727Z |
| qassim-chamber-events | error-cooldown | 24h | 2026-11-08T09:10:00.727Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-11-13T09:31:59.431Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-11-08T09:49:55.847Z |
| tabuk-chamber-events | zero-yield-cooldown | 168h | 2026-11-13T09:31:59.431Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-11-08T09:49:55.847Z |
| qassim-university-events | declared-cadence | 168h | 2026-11-13T09:31:59.431Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-11-08T09:49:55.847Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-11-08T09:49:55.847Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-11-13T09:31:59.431Z |
| kau-events | zero-yield-cooldown | 72h | 2026-11-08T09:49:55.847Z |
| saudicon-events | discovery-daily | 24h | 2026-11-08T09:10:00.727Z |
