# EventLive Source Collection Report

- collected_at: 2026-10-31T08:32:55.232Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 16
- sources_attempted: 16
- sources_deferred: 32
- ended_min_year: 2022
- candidates_discovered: 133
- candidates_written: 367
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 233

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 21 | 0 | 0 | 14 | 7 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-10-31T08-32-55-232Z.json |  |
| experience-alula-events | ok | 4s | 11 | 0 | 3 | 0 | 11 | 0 | data/raw/source-snapshots/experience-alula-events-2026-10-31T08-32-55-232Z.html |  |
| monshaat-events | error | 43s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 1s | 2 | 0 | 6 | 0 | 2 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-10-31T08-32-55-232Z.html |  |
| rfecc-whats-on | ok | 16s | 2 | 0 | 18 | 0 | 2 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-10-31T08-32-55-232Z.html |  |
| visit-saudi-seasons | ok | 0s | 14 | 0 | 0 | 1 | 13 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-10-31T08-32-55-232Z.json |  |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-10-31T08-32-55-232Z.html |  |
| dhahran-expo-calendar | ok | 0s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-10-31T08-32-55-232Z.html |  |
| ithra-events | ok | 1s | 52 | 0 | 172 | 0 | 52 | 0 | data/raw/source-snapshots/ithra-events-2026-10-31T08-32-55-232Z.json |  |
| misk-hub-events | ok | 2s | 0 | 0 | 5 | 0 | 0 | 0 | data/raw/source-snapshots/misk-hub-events-2026-10-31T08-32-55-232Z.html | No future date-complete candidates found by the conservative extractor. |
| saudi-space-agency-events | ok | 2s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-10-31T08-32-55-232Z.json |  |
| visit-saudi-calendar-pdf | ok | 11s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-10-31T08-32-55-232Z.xml | Recovered via direct-pdf official evidence. No future date-complete candidates found by the conservative extractor. |
| riyadh-city-events | ok | 12s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-10-31T08-32-55-232Z.html | No future date-complete candidates found by the conservative extractor. |
| umm-al-qura-events | ok | 11s | 9 | 0 | 1 | 7 | 2 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-10-31T08-32-55-232Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-10-31T08-32-55-232Z.html |  |
| hayy-jameel-events | ok | 388s | 10 | 0 | 0 | 1 | 9 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-10-31T08-32-55-232Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| moc-cultural-calendar | error-cooldown | 24h | 2026-10-31T09:08:30.368Z |
| mos-events | error-cooldown | 24h | 2026-10-31T09:08:30.368Z |
| mdlbeast-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| eye-of-riyadh-events | discovery-daily | 24h | 2026-10-31T09:08:30.368Z |
| eventbrite-saudi | discovery-daily | 24h | 2026-10-31T09:08:30.368Z |
| tuwaiq-academy-bootcamps | error-cooldown | 24h | 2026-10-31T09:08:30.368Z |
| future-skills-catalog | zero-yield-cooldown | 24h | 2026-10-31T09:08:30.368Z |
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-11-06T09:08:30.368Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-11-06T09:08:30.368Z |
| saudi-pro-league-fixtures | error-cooldown | 24h | 2026-10-31T09:08:30.368Z |
| moc-cultural-subportals | error-cooldown | 24h | 2026-10-31T09:08:30.368Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| saudi-university-events | declared-cadence | 720h | 2026-11-15T07:17:51.157Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| sdaia-calendar-events | zero-yield-cooldown | 24h | 2026-10-31T09:08:30.368Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-11-06T09:08:30.368Z |
| scega-exhibitions-conferences | zero-yield-cooldown | 72h | 2026-11-02T09:08:30.368Z |
| asharqia-chamber-events | error-cooldown | 24h | 2026-10-31T09:08:30.368Z |
| qassim-chamber-events | error-cooldown | 24h | 2026-10-31T09:08:30.368Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-11-06T09:08:30.368Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| tabuk-chamber-events | zero-yield-cooldown | 168h | 2026-11-06T09:08:30.368Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| qassim-university-events | declared-cadence | 168h | 2026-11-06T09:08:30.368Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-11-06T09:08:30.368Z |
| kau-events | zero-yield-cooldown | 72h | 2026-11-01T08:37:41.193Z |
| saudicon-events | discovery-daily | 24h | 2026-10-31T09:08:30.368Z |
