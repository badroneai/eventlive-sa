# EventLive Source Collection Report

- collected_at: 2026-07-15T14:17:03.043Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 86
- sources_runnable: 46
- sources_due: 28
- sources_attempted: 28
- sources_deferred: 18
- ended_min_year: 2022
- candidates_discovered: 280
- candidates_written: 482
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 169

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 0s | 30 | 0 | 0 | 9 | 21 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-07-15T14-17-03-043Z.json |  |
| moc-cultural-calendar | error | 32s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| mos-events | error | 51s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.mos.gov.sa/en/media/events", waiting until "domcontentloaded"
 |
| experience-alula-events | ok | 1s | 9 | 0 | 2 | 0 | 9 | 0 | data/raw/source-snapshots/experience-alula-events-2026-07-15T14-17-03-043Z.html |  |
| mdlbeast-events | ok | 0s | 5 | 0 | 36 | 0 | 5 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-07-15T14-17-03-043Z.html |  |
| monshaat-events | error | 72s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-07-15T14-17-03-043Z.html |  |
| rfecc-whats-on | ok | 4s | 6 | 0 | 14 | 0 | 6 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-07-15T14-17-03-043Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | ok | 0s | 12 | 0 | 0 | 2 | 10 | 1 | data/raw/source-snapshots/eventbrite-saudi-2026-07-15T14-17-03-043Z.html |  |
| tuwaiq-academy-bootcamps | ok | 1s | 12 | 0 | 0 | 0 | 12 | 0 | data/raw/source-snapshots/tuwaiq-academy-bootcamps-2026-07-15T14-17-03-043Z.json |  |
| future-skills-catalog | ok | 25s | 5 | 0 | 7 | 0 | 5 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-07-15T14-17-03-043Z.html |  |
| visit-saudi-seasons | ok | 0s | 9 | 0 | 0 | 0 | 9 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-07-15T14-17-03-043Z.json |  |
| misk-hub-programs | ok | 4s | 5 | 0 | 0 | 2 | 3 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-07-15T14-17-03-043Z.html |  |
| dhahran-expo-calendar | ok | 1s | 16 | 0 | 7 | 0 | 16 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-07-15T14-17-03-043Z.html |  |
| ithra-events | ok | 1s | 129 | 0 | 92 | 2 | 127 | 0 | data/raw/source-snapshots/ithra-events-2026-07-15T14-17-03-043Z.json |  |
| moc-cultural-subportals | error | 73s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| discover-aseer-events | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/discover-aseer-events-2026-07-15T14-17-03-043Z.html |  |
| saudi-water-authority-events | ok | 1s | 8 | 0 | 1 | 0 | 8 | 0 | data/raw/source-snapshots/saudi-water-authority-events-2026-07-15T14-17-03-043Z.html |  |
| sfda-events | ok | 17s | 8 | 0 | 1 | 0 | 8 | 0 | data/raw/source-snapshots/sfda-events-2026-07-15T14-17-03-043Z.html |  |
| riyadh-city-events | ok | 14s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-07-15T14-17-03-043Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 14s | 2 | 0 | 1 | 0 | 2 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-07-15T14-17-03-043Z.html |  |
| scega-exhibitions-conferences | ok | 1s | 4 | 0 | 0 | 0 | 4 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-07-15T14-17-03-043Z.json |  |
| qassim-chamber-events | error | 7s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403; browser recovery encountered an access-protection page |
| jazan-chamber-events | ok | 85s | 0 | 0 | 0 | 0 | 0 | 0 | - | No future date-complete candidates found by the conservative extractor. |
| umm-al-qura-events | ok | 9s | 4 | 0 | 3 | 0 | 4 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-07-15T14-17-03-043Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-07-15T14-17-03-043Z.html |  |
| hayy-jameel-events | ok | 25s | 11 | 0 | 0 | 0 | 11 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-07-15T14-17-03-043Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-07-18T09:22:14.505Z |
| sdaia-academy-programs | zero-yield-cooldown | 24h | 2026-07-16T03:33:23.986Z |
| misk-hub-events | zero-yield-cooldown | 168h | 2026-07-18T09:22:14.505Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-07-18T09:22:14.505Z |
| saudi-pro-league-fixtures | zero-yield-cooldown | 168h | 2026-07-18T09:22:14.505Z |
| saudi-space-agency-events | zero-yield-cooldown | 72h | 2026-07-17T10:57:51.066Z |
| visit-saudi-calendar-pdf | declared-cadence | 168h | 2026-07-18T09:22:14.505Z |
| saudi-university-events | declared-cadence | 720h | 2026-08-10T09:22:14.505Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-07-18T09:22:14.505Z |
| asharqia-chamber-events | error-cooldown | 24h | 2026-07-16T03:33:23.986Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-07-18T09:22:14.505Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-07-17T10:57:51.066Z |
| tabuk-chamber-events | zero-yield-cooldown | 72h | 2026-07-17T10:57:51.066Z |
| najran-municipality-summer-events | declared-cadence | 168h | 2026-07-18T09:22:14.505Z |
| qassim-university-events | declared-cadence | 168h | 2026-07-18T09:22:14.505Z |
| jouf-university-programs | declared-cadence | 168h | 2026-07-18T09:22:14.505Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-07-17T10:57:51.066Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-07-19T12:50:26.746Z |
