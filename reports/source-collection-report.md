# EventLive Source Collection Report

- collected_at: 2026-10-21T07:59:11.225Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 29
- sources_attempted: 29
- sources_deferred: 19
- ended_min_year: 2022
- candidates_discovered: 220
- candidates_written: 406
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 321

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 27 | 0 | 0 | 16 | 11 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-10-21T07-59-11-225Z.json |  |
| moc-cultural-calendar | error | 33s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; fetch failed [ETIMEDOUT, ENETUNREACH] |
| mos-events | error | 31s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [ETIMEDOUT, ENETUNREACH]; page.goto: Timeout 30000ms exceeded. |
| experience-alula-events | ok | 3s | 11 | 0 | 3 | 0 | 11 | 0 | data/raw/source-snapshots/experience-alula-events-2026-10-21T07-59-11-225Z.html |  |
| mdlbeast-events | ok | 0s | 0 | 0 | 39 | 0 | 0 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-10-21T07-59-11-225Z.html | No future date-complete candidates found by the conservative extractor. |
| monshaat-events | error | 73s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-10-21T07-59-11-225Z.html |  |
| rfecc-whats-on | ok | 19s | 3 | 0 | 17 | 0 | 3 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-10-21T07-59-11-225Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | ok | 39s | 0 | 0 | 12 | 0 | 0 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-10-21T07-59-11-225Z.html | No future date-complete candidates found by the conservative extractor. |
| visit-saudi-seasons | ok | 0s | 16 | 0 | 0 | 0 | 16 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-10-21T07-59-11-225Z.json |  |
| misk-hub-programs | ok | 4s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-10-21T07-59-11-225Z.html |  |
| dhahran-expo-calendar | ok | 1s | 5 | 0 | 14 | 0 | 5 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-10-21T07-59-11-225Z.html |  |
| ithra-events | ok | 1s | 69 | 0 | 183 | 40 | 29 | 0 | data/raw/source-snapshots/ithra-events-2026-10-21T07-59-11-225Z.json |  |
| misk-hub-events | ok | 2s | 1 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/misk-hub-events-2026-10-21T07-59-11-225Z.html |  |
| saudi-pro-league-fixtures | error | 20s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [EAI_AGAIN] |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-10-21T07-59-11-225Z.json |  |
| visit-saudi-calendar-pdf | ok | 24s | 35 | 0 | 14 | 0 | 35 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-10-21T07-59-11-225Z.xml | Recovered via direct-pdf official evidence. |
| moc-cultural-subportals | error | 72s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| riyadh-city-events | ok | 14s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-10-21T07-59-11-225Z.html | No future date-complete candidates found by the conservative extractor. |
| scega-exhibitions-conferences | ok | 1s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-10-21T07-59-11-225Z.json | No future date-complete candidates found by the conservative extractor. |
| asharqia-chamber-events | ok | 17s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/asharqia-chamber-events-2026-10-21T07-59-11-225Z.html | Recovered via browser-probe official evidence. No future date-complete candidates found by the conservative extractor. |
| qassim-chamber-events | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; live browser recovery deferred by recent failed probe cooldown |
| umm-al-qura-events | ok | 10s | 8 | 0 | 2 | 0 | 8 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-10-21T07-59-11-225Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-10-21T07-59-11-225Z.html |  |
| hayy-jameel-events | ok | 367s | 13 | 0 | 0 | 0 | 13 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-10-21T07-59-11-225Z.html |  |
| saudicon-events | ok | 8s | 22 | 0 | 18 | 0 | 22 | 0 | data/raw/source-snapshots/saudicon-events-2026-10-21T07-59-11-225Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-10-23T07:17:51.157Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-10-23T07:17:51.157Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
| saudi-water-authority-events | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
| saudi-university-events | declared-cadence | 720h | 2026-11-15T07:17:51.157Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
| sdaia-calendar-events | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-10-23T07:17:51.157Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-10-23T07:17:51.157Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
| tabuk-chamber-events | zero-yield-cooldown | 168h | 2026-10-23T07:17:51.157Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
| qassim-university-events | declared-cadence | 168h | 2026-10-23T07:17:51.157Z |
| jouf-university-programs | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-10-23T07:17:51.157Z |
| kau-events | zero-yield-cooldown | 72h | 2026-10-22T08:08:36.027Z |
