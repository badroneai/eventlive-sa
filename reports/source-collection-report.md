# EventLive Source Collection Report

- collected_at: 2026-09-24T07:52:15.703Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 32
- sources_attempted: 32
- sources_deferred: 16
- ended_min_year: 2022
- candidates_discovered: 264
- candidates_written: 474
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 309

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 0s | 33 | 0 | 0 | 17 | 16 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-09-24T07-52-15-703Z.json |  |
| moc-cultural-calendar | error | 35s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| mos-events | error | 32s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.mos.gov.sa/en/media/events", waiting until "domcontentloaded"
 |
| experience-alula-events | ok | 2s | 8 | 0 | 3 | 2 | 6 | 0 | data/raw/source-snapshots/experience-alula-events-2026-09-24T07-52-15-703Z.html |  |
| mdlbeast-events | ok | 0s | 3 | 0 | 36 | 0 | 3 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-09-24T07-52-15-703Z.html |  |
| monshaat-events | error | 72s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-09-24T07-52-15-703Z.html |  |
| rfecc-whats-on | ok | 5s | 3 | 0 | 17 | 0 | 3 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-09-24T07-52-15-703Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | ok | 20s | 1 | 0 | 11 | 0 | 1 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-09-24T07-52-15-703Z.html |  |
| visit-saudi-seasons | ok | 2s | 17 | 0 | 0 | 0 | 17 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-09-24T07-52-15-703Z.json |  |
| misk-hub-programs | ok | 4s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-09-24T07-52-15-703Z.html |  |
| dhahran-expo-calendar | ok | 1s | 11 | 0 | 11 | 0 | 11 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-09-24T07-52-15-703Z.html |  |
| ithra-events | ok | 1s | 92 | 0 | 166 | 20 | 72 | 0 | data/raw/source-snapshots/ithra-events-2026-09-24T07-52-15-703Z.json |  |
| misk-hub-events | ok | 2s | 0 | 0 | 5 | 0 | 0 | 0 | data/raw/source-snapshots/misk-hub-events-2026-09-24T07-52-15-703Z.html | No future date-complete candidates found by the conservative extractor. |
| saudi-pro-league-fixtures | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-09-24T07-52-15-703Z.json |  |
| visit-saudi-calendar-pdf | ok | 33s | 44 | 0 | 18 | 0 | 44 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-09-24T07-52-15-703Z.xml | Recovered via direct-pdf official evidence. |
| moc-cultural-subportals | error | 72s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| saudi-water-authority-events | ok | 12s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/saudi-water-authority-events-2026-09-24T07-52-15-703Z.html | No future date-complete candidates found by the conservative extractor. |
| riyadh-city-events | ok | 15s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-09-24T07-52-15-703Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 13s | 0 | 0 | 2 | 0 | 0 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-09-24T07-52-15-703Z.html | No future date-complete candidates found by the conservative extractor. |
| scega-exhibitions-conferences | error | 3s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed |
| asharqia-chamber-events | error | 51s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/Pages/AllChamberEvents.aspx", waiting until "domcontentloaded"
 |
| qassim-chamber-events | ok | 6s | 3 | 0 | 0 | 0 | 3 | 0 | data/raw/source-snapshots/qassim-chamber-events-2026-09-24T07-52-15-703Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 403. |
| umm-al-qura-events | ok | 9s | 0 | 0 | 8 | 0 | 0 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-09-24T07-52-15-703Z.html | No future date-complete candidates found by the conservative extractor. |
| jouf-university-programs | ok | 5s | 0 | 0 | 1 | 0 | 0 | 0 | data/raw/source-snapshots/jouf-university-programs-2026-09-24T07-52-15-703Z.html | No future date-complete candidates found by the conservative extractor. |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-09-24T07-52-15-703Z.html |  |
| hayy-jameel-events | ok | 270s | 12 | 0 | 0 | 0 | 12 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-09-24T07-52-15-703Z.html |  |
| saudicon-events | ok | 7s | 27 | 0 | 12 | 0 | 27 | 0 | data/raw/source-snapshots/saudicon-events-2026-09-24T07-52-15-703Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-09-29T15:58:13.006Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-09-25T15:58:13.006Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-09-29T15:58:13.006Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-09-25T15:58:13.006Z |
| saudi-university-events | declared-cadence | 720h | 2026-10-15T15:56:46.259Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-09-25T15:58:13.006Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-09-29T15:58:13.006Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-09-29T15:58:13.006Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-09-25T15:58:13.006Z |
| tabuk-chamber-events | zero-yield-cooldown | 72h | 2026-09-25T15:58:13.006Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-09-25T15:58:13.006Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-09-25T15:58:13.006Z |
| qassim-university-events | declared-cadence | 168h | 2026-09-29T15:58:13.006Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-09-25T15:58:13.006Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-09-29T15:58:13.006Z |
| kau-events | zero-yield-cooldown | 72h | 2026-09-25T15:58:13.006Z |
