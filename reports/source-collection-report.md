# EventLive Source Collection Report

- collected_at: 2026-11-12T10:11:13.613Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 29
- sources_attempted: 29
- sources_deferred: 19
- ended_min_year: 2022
- candidates_discovered: 156
- candidates_written: 353
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 286

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 21 | 0 | 0 | 14 | 7 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-11-12T10-11-13-613Z.json |  |
| moc-cultural-calendar | error | 2s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| mos-events | error | 32s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; page.goto: Timeout 30000ms exceeded. |
| experience-alula-events | ok | 1s | 10 | 0 | 3 | 0 | 10 | 0 | data/raw/source-snapshots/experience-alula-events-2026-11-12T10-11-13-613Z.html |  |
| mdlbeast-events | ok | 0s | 2 | 0 | 37 | 0 | 2 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-11-12T10-11-13-613Z.html |  |
| monshaat-events | error | 73s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 1s | 2 | 0 | 6 | 0 | 2 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-11-12T10-11-13-613Z.html |  |
| rfecc-whats-on | ok | 18s | 2 | 0 | 18 | 0 | 2 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-11-12T10-11-13-613Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| visit-saudi-seasons | ok | 0s | 14 | 0 | 0 | 0 | 14 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-11-12T10-11-13-613Z.json |  |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-11-12T10-11-13-613Z.html |  |
| dhahran-expo-calendar | ok | 0s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-11-12T10-11-13-613Z.html |  |
| ithra-events | ok | 1s | 77 | 0 | 169 | 6 | 71 | 0 | data/raw/source-snapshots/ithra-events-2026-11-12T10-11-13-613Z.json |  |
| misk-hub-events | ok | 1s | 0 | 0 | 5 | 0 | 0 | 0 | data/raw/source-snapshots/misk-hub-events-2026-11-12T10-11-13-613Z.html | No future date-complete candidates found by the conservative extractor. |
| saudi-pro-league-fixtures | error | 16s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [EAI_AGAIN] |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 1 | 0 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-11-12T10-11-13-613Z.json |  |
| moc-cultural-subportals | error | 2s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| riyadh-city-events | ok | 10s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-11-12T10-11-13-613Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 11s | 1 | 0 | 7 | 0 | 1 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-11-12T10-11-13-613Z.html |  |
| scega-exhibitions-conferences | ok | 2s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-11-12T10-11-13-613Z.json | No future date-complete candidates found by the conservative extractor. |
| asharqia-chamber-events | ok | 18s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/asharqia-chamber-events-2026-11-12T10-11-13-613Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 404. No future date-complete candidates found by the conservative extractor. |
| qassim-chamber-events | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; live browser recovery deferred by recent failed probe cooldown |
| jazan-chamber-events | ok | 2s | 1 | 0 | 2 | 0 | 1 | 0 | data/raw/source-snapshots/jazan-chamber-events-2026-11-12T10-11-13-613Z.json |  |
| umm-al-qura-events | ok | 10s | 1 | 0 | 2 | 1 | 0 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-11-12T10-11-13-613Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-11-12T10-11-13-613Z.html |  |
| hayy-jameel-events | ok | 280s | 7 | 0 | 0 | 0 | 7 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-11-12T10-11-13-613Z.html |  |
| saudicon-events | ok | 4s | 6 | 0 | 9 | 0 | 6 | 0 | data/raw/source-snapshots/saudicon-events-2026-11-12T10-11-13-613Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| future-skills-catalog | zero-yield-cooldown | 72h | 2026-11-12T10:12:00.319Z |
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-11-13T09:31:59.431Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-11-12T10:12:00.319Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-11-13T09:31:59.431Z |
| visit-saudi-calendar-pdf | declared-cadence | 168h | 2026-11-14T09:10:00.727Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-11-12T10:12:00.319Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-11-12T10:12:00.319Z |
| saudi-university-events | declared-cadence | 720h | 2026-11-15T07:17:51.157Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-11-12T10:12:00.319Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-11-13T09:31:59.431Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-11-13T09:31:59.431Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-11-12T10:12:00.319Z |
| tabuk-chamber-events | zero-yield-cooldown | 168h | 2026-11-13T09:31:59.431Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-11-12T10:12:00.319Z |
| qassim-university-events | declared-cadence | 168h | 2026-11-13T09:31:59.431Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-11-12T10:12:00.319Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-11-12T10:12:00.319Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-11-13T09:31:59.431Z |
| kau-events | zero-yield-cooldown | 72h | 2026-11-12T10:12:00.319Z |
