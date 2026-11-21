# EventLive Source Collection Report

- collected_at: 2026-11-21T10:06:45.122Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 29
- sources_attempted: 29
- sources_deferred: 19
- ended_min_year: 2022
- candidates_discovered: 134
- candidates_written: 302
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 288

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 18 | 0 | 0 | 12 | 6 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-11-21T10-06-45-122Z.json |  |
| moc-cultural-calendar | error | 32s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| mos-events | error | 31s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; page.goto: Timeout 30000ms exceeded. |
| experience-alula-events | ok | 3s | 5 | 0 | 4 | 0 | 5 | 0 | data/raw/source-snapshots/experience-alula-events-2026-11-21T10-06-45-122Z.html |  |
| mdlbeast-events | ok | 0s | 2 | 0 | 37 | 2 | 0 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-11-21T10-06-45-122Z.html |  |
| monshaat-events | error | 72s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 0s | 0 | 0 | 8 | 0 | 0 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-11-21T10-06-45-122Z.html | No future date-complete candidates found by the conservative extractor. |
| rfecc-whats-on | ok | 17s | 2 | 0 | 18 | 0 | 2 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-11-21T10-06-45-122Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | ok | 21s | 0 | 0 | 12 | 0 | 0 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-11-21T10-06-45-122Z.html | No future date-complete candidates found by the conservative extractor. |
| visit-saudi-seasons | ok | 0s | 12 | 0 | 0 | 0 | 12 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-11-21T10-06-45-122Z.json |  |
| misk-hub-programs | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; live browser recovery deferred by recent failed probe cooldown |
| dhahran-expo-calendar | ok | 0s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-11-21T10-06-45-122Z.html |  |
| ithra-events | ok | 1s | 74 | 0 | 175 | 30 | 44 | 0 | data/raw/source-snapshots/ithra-events-2026-11-21T10-06-45-122Z.json |  |
| saudi-pro-league-fixtures | error | 20s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [EAI_AGAIN] |
| saudi-space-agency-events | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH] |
| visit-saudi-calendar-pdf | ok | 9s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-11-21T10-06-45-122Z.xml | Recovered via direct-pdf official evidence. No future date-complete candidates found by the conservative extractor. |
| moc-cultural-subportals | error | 32s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| riyadh-city-events | ok | 10s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-11-21T10-06-45-122Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 30s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-11-21T10-06-45-122Z.html | No future date-complete candidates found by the conservative extractor. |
| asharqia-chamber-events | ok | 18s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/asharqia-chamber-events-2026-11-21T10-06-45-122Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 404. No future date-complete candidates found by the conservative extractor. |
| qassim-chamber-events | error | 15s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; browser recovery encountered an access-protection page |
| jazan-chamber-events | ok | 2s | 0 | 0 | 4 | 0 | 0 | 0 | data/raw/source-snapshots/jazan-chamber-events-2026-11-21T10-06-45-122Z.json | No future date-complete candidates found by the conservative extractor. |
| umm-al-qura-events | ok | 12s | 3 | 0 | 7 | 0 | 3 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-11-21T10-06-45-122Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-11-21T10-06-45-122Z.html |  |
| hayy-jameel-events | ok | 292s | 6 | 0 | 0 | 0 | 6 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-11-21T10-06-45-122Z.html |  |
| saudicon-events | ok | 6s | 6 | 0 | 9 | 0 | 6 | 0 | data/raw/source-snapshots/saudicon-events-2026-11-21T10-06-45-122Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-11-27T10:08:37.957Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-11-22T10:44:07.541Z |
| misk-hub-events | zero-yield-cooldown | 72h | 2026-11-22T10:44:07.541Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-11-27T10:08:37.957Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-11-22T10:44:07.541Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-11-22T10:44:07.541Z |
| saudi-university-events | declared-cadence | 720h | 2026-12-15T09:47:53.470Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-11-22T10:44:07.541Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-11-27T10:08:37.957Z |
| scega-exhibitions-conferences | zero-yield-cooldown | 24h | 2026-11-21T10:08:37.957Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-11-27T10:08:37.957Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-11-22T10:44:07.541Z |
| tabuk-chamber-events | zero-yield-cooldown | 168h | 2026-11-27T10:08:37.957Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-11-22T10:44:07.541Z |
| qassim-university-events | declared-cadence | 168h | 2026-11-27T10:08:37.957Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-11-22T10:44:07.541Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-11-22T10:44:07.541Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-11-27T10:08:37.957Z |
| kau-events | zero-yield-cooldown | 72h | 2026-11-22T10:44:07.541Z |
