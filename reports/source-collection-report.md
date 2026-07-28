# EventLive Source Collection Report

- collected_at: 2026-07-28T15:43:30.242Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 33
- sources_attempted: 33
- sources_deferred: 15
- ended_min_year: 2022
- candidates_discovered: 401
- candidates_written: 559
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 290

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 0s | 33 | 0 | 0 | 20 | 13 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-07-28T15-43-30-242Z.json |  |
| moc-cultural-calendar | error | 32s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| mos-events | error | 51s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.mos.gov.sa/en/media/events", waiting until "domcontentloaded"
 |
| experience-alula-events | ok | 5s | 9 | 0 | 3 | 0 | 9 | 0 | data/raw/source-snapshots/experience-alula-events-2026-07-28T15-43-30-242Z.html |  |
| mdlbeast-events | ok | 0s | 5 | 0 | 36 | 0 | 5 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-07-28T15-43-30-242Z.html |  |
| monshaat-events | error | 73s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-07-28T15-43-30-242Z.html |  |
| rfecc-whats-on | ok | 5s | 6 | 0 | 14 | 0 | 6 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-07-28T15-43-30-242Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | ok | 1s | 12 | 0 | 0 | 0 | 12 | 0 | data/raw/source-snapshots/tuwaiq-academy-bootcamps-2026-07-28T15-43-30-242Z.json |  |
| future-skills-catalog | ok | 16s | 3 | 0 | 9 | 0 | 3 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-07-28T15-43-30-242Z.html |  |
| visit-saudi-seasons | ok | 2s | 20 | 0 | 0 | 0 | 20 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-07-28T15-43-30-242Z.json |  |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-07-28T15-43-30-242Z.html |  |
| dhahran-expo-calendar | ok | 1s | 16 | 0 | 7 | 0 | 16 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-07-28T15-43-30-242Z.html |  |
| ithra-events | ok | 1s | 79 | 0 | 149 | 0 | 79 | 0 | data/raw/source-snapshots/ithra-events-2026-07-28T15-43-30-242Z.json |  |
| sdaia-academy-programs | ok | 50s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/sdaia-academy-programs-2026-07-28T15-43-30-242Z.html | No future date-complete candidates found by the conservative extractor. |
| visit-saudi-calendar-pdf | ok | 8s | 67 | 0 | 32 | 0 | 67 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-07-28T15-43-30-242Z.xml | Recovered via direct-pdf official evidence. |
| moc-cultural-subportals | error | 72s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| discover-aseer-events | ok | 2s | 38 | 0 | 0 | 0 | 38 | 0 | data/raw/source-snapshots/discover-aseer-events-2026-07-28T15-43-30-242Z.html |  |
| saudi-water-authority-events | ok | 1s | 8 | 0 | 1 | 0 | 8 | 0 | data/raw/source-snapshots/saudi-water-authority-events-2026-07-28T15-43-30-242Z.html |  |
| sfda-events | ok | 8s | 5 | 0 | 4 | 0 | 5 | 0 | data/raw/source-snapshots/sfda-events-2026-07-28T15-43-30-242Z.html |  |
| riyadh-city-events | ok | 15s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-07-28T15-43-30-242Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | error | 7s | 0 | 0 | 0 | 0 | 0 | 0 | - | request-rejected; browser recovery encountered an access-protection page |
| scega-exhibitions-conferences | ok | 1s | 4 | 0 | 0 | 0 | 4 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-07-28T15-43-30-242Z.json |  |
| asharqia-chamber-events | error | 21s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; live browser recovery deferred by recent failed probe cooldown |
| qassim-chamber-events | error | 7s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; browser recovery encountered an access-protection page |
| northern-borders-chamber-events | ok | 24s | 0 | 0 | 4 | 0 | 0 | 0 | data/raw/source-snapshots/northern-borders-chamber-events-2026-07-28T15-43-30-242Z.json | No future date-complete candidates found by the conservative extractor. |
| jazan-chamber-events | ok | 85s | 0 | 0 | 0 | 0 | 0 | 0 | - | No future date-complete candidates found by the conservative extractor. |
| umm-al-qura-events | ok | 10s | 9 | 0 | 1 | 0 | 9 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-07-28T15-43-30-242Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-07-28T15-43-30-242Z.html |  |
| hayy-jameel-events | ok | 337s | 63 | 0 | 0 | 1 | 62 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-07-28T15-43-30-242Z.html |  |
| saudicon-events | ok | 13s | 15 | 0 | 25 | 0 | 15 | 0 | data/raw/source-snapshots/saudicon-events-2026-07-28T15-43-30-242Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-08-03T15:28:34.590Z |
| misk-hub-events | zero-yield-cooldown | 168h | 2026-08-03T15:28:34.590Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-08-03T15:28:34.590Z |
| saudi-pro-league-fixtures | zero-yield-cooldown | 168h | 2026-08-03T15:28:34.590Z |
| saudi-space-agency-events | zero-yield-cooldown | 72h | 2026-07-30T15:28:34.590Z |
| saudi-university-events | declared-cadence | 720h | 2026-08-10T09:22:14.505Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-08-03T15:28:34.590Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-08-03T15:28:34.590Z |
| tabuk-chamber-events | zero-yield-cooldown | 72h | 2026-07-30T15:28:34.590Z |
| najran-municipality-summer-events | zero-yield-cooldown | 24h | 2026-07-28T21:37:16.267Z |
| qassim-university-events | declared-cadence | 168h | 2026-08-03T15:28:34.590Z |
| jouf-university-programs | declared-cadence | 168h | 2026-08-03T15:28:34.590Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-07-30T15:28:34.590Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-08-03T15:28:34.590Z |
| kau-events | declared-cadence | 168h | 2026-08-03T15:28:34.590Z |
