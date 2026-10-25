# EventLive Source Collection Report

- collected_at: 2026-10-25T07:54:41.747Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 28
- sources_attempted: 28
- sources_deferred: 20
- ended_min_year: 2022
- candidates_discovered: 180
- candidates_written: 385
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 312

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 25 | 0 | 0 | 15 | 10 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-10-25T07-54-41-747Z.json |  |
| moc-cultural-calendar | error | 4s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| mos-events | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; live browser recovery deferred by recent failed probe cooldown |
| experience-alula-events | ok | 1s | 10 | 0 | 3 | 0 | 10 | 0 | data/raw/source-snapshots/experience-alula-events-2026-10-25T07-54-41-747Z.html |  |
| mdlbeast-events | ok | 0s | 0 | 0 | 39 | 0 | 0 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-10-25T07-54-41-747Z.html | No future date-complete candidates found by the conservative extractor. |
| monshaat-events | error | 43s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-10-25T07-54-41-747Z.html |  |
| rfecc-whats-on | ok | 6s | 3 | 0 | 17 | 0 | 3 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-10-25T07-54-41-747Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | ok | 20s | 0 | 0 | 12 | 0 | 0 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-10-25T07-54-41-747Z.html | No future date-complete candidates found by the conservative extractor. |
| visit-saudi-seasons | ok | 0s | 15 | 0 | 0 | 0 | 15 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-10-25T07-54-41-747Z.json |  |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-10-25T07-54-41-747Z.html |  |
| dhahran-expo-calendar | ok | 0s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-10-25T07-54-41-747Z.html |  |
| ithra-events | ok | 1s | 71 | 0 | 182 | 0 | 71 | 0 | data/raw/source-snapshots/ithra-events-2026-10-25T07-54-41-747Z.json |  |
| misk-hub-events | ok | 2s | 0 | 0 | 5 | 0 | 0 | 0 | data/raw/source-snapshots/misk-hub-events-2026-10-25T07-54-41-747Z.html | No future date-complete candidates found by the conservative extractor. |
| saudi-pro-league-fixtures | error | 16s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [EAI_AGAIN] |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-10-25T07-54-41-747Z.json |  |
| visit-saudi-calendar-pdf | error | 120s | 0 | 0 | 0 | 0 | 0 | 0 | - | The operation was aborted due to timeout; page.goto: Download is starting |
| moc-cultural-subportals | error | 42s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| riyadh-city-events | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 502; live browser recovery deferred by recent failed probe cooldown |
| asharqia-chamber-events | ok | 18s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/asharqia-chamber-events-2026-10-25T07-54-41-747Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 404. No future date-complete candidates found by the conservative extractor. |
| qassim-chamber-events | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; live browser recovery deferred by recent failed probe cooldown |
| umm-al-qura-events | ok | 10s | 7 | 0 | 3 | 6 | 1 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-10-25T07-54-41-747Z.html |  |
| madinah-architecture-festival | ok | 2s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-10-25T07-54-41-747Z.html |  |
| hayy-jameel-events | ok | 365s | 12 | 0 | 0 | 0 | 12 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-10-25T07-54-41-747Z.html |  |
| saudicon-events | ok | 9s | 22 | 0 | 18 | 1 | 21 | 1 | data/raw/source-snapshots/saudicon-events-2026-10-25T07-54-41-747Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-10-30T07:39:03.063Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-10-30T07:39:03.063Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
| saudi-university-events | declared-cadence | 720h | 2026-11-15T07:17:51.157Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
| sdaia-calendar-events | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-10-30T07:39:03.063Z |
| scega-exhibitions-conferences | zero-yield-cooldown | 72h | 2026-10-27T07:35:39.282Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-10-30T07:39:03.063Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
| tabuk-chamber-events | zero-yield-cooldown | 168h | 2026-10-30T07:39:03.063Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
| qassim-university-events | declared-cadence | 168h | 2026-10-30T07:39:03.063Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-10-30T07:39:03.063Z |
| kau-events | zero-yield-cooldown | 72h | 2026-10-25T08:09:45.798Z |
