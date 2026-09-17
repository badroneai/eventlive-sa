# EventLive Source Collection Report

- collected_at: 2026-09-17T07:59:26.046Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 32
- sources_attempted: 32
- sources_deferred: 16
- ended_min_year: 2022
- candidates_discovered: 257
- candidates_written: 545
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 278

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 46 | 0 | 0 | 22 | 24 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-09-17T07-59-26-046Z.json |  |
| moc-cultural-calendar | error | 32s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| mos-events | error | 31s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.mos.gov.sa/en/media/events", waiting until "domcontentloaded"
 |
| experience-alula-events | ok | 2s | 5 | 0 | 3 | 0 | 5 | 0 | data/raw/source-snapshots/experience-alula-events-2026-09-17T07-59-26-046Z.html |  |
| mdlbeast-events | ok | 0s | 3 | 0 | 36 | 0 | 3 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-09-17T07-59-26-046Z.html |  |
| monshaat-events | error | 42s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-09-17T07-59-26-046Z.html |  |
| rfecc-whats-on | ok | 4s | 3 | 0 | 17 | 0 | 3 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-09-17T07-59-26-046Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | error | 54s | 0 | 0 | 0 | 0 | 0 | 0 | - | The operation was aborted due to timeout; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://futureskills.mcit.gov.sa/ar/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_id=All&field_training_course_level_target_id=All&field_related_skills_target_id=All&field_course_type_value=All&field_training_delivery_value=All&field_training_city_target_id=All&field_job_market_target_id=All", waiting until "domcontentloaded"
 |
| visit-saudi-seasons | ok | 0s | 19 | 0 | 0 | 3 | 16 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-09-17T07-59-26-046Z.json |  |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 1 | 4 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-09-17T07-59-26-046Z.html |  |
| dhahran-expo-calendar | ok | 0s | 11 | 0 | 11 | 0 | 11 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-09-17T07-59-26-046Z.html |  |
| ithra-events | ok | 1s | 102 | 0 | 156 | 31 | 71 | 0 | data/raw/source-snapshots/ithra-events-2026-09-17T07-59-26-046Z.json |  |
| misk-hub-events | ok | 2s | 0 | 0 | 5 | 0 | 0 | 0 | data/raw/source-snapshots/misk-hub-events-2026-09-17T07-59-26-046Z.html | No future date-complete candidates found by the conservative extractor. |
| saudi-pro-league-fixtures | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-09-17T07-59-26-046Z.json |  |
| moc-cultural-subportals | error | 73s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| discover-aseer-events | ok | 8s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/discover-aseer-events-2026-09-17T07-59-26-046Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 404. No future date-complete candidates found by the conservative extractor. |
| saudi-water-authority-events | ok | 12s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/saudi-water-authority-events-2026-09-17T07-59-26-046Z.html | No future date-complete candidates found by the conservative extractor. |
| riyadh-city-events | ok | 14s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-09-17T07-59-26-046Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 15s | 1 | 0 | 1 | 0 | 1 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-09-17T07-59-26-046Z.html |  |
| scega-exhibitions-conferences | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-09-17T07-59-26-046Z.json |  |
| asharqia-chamber-events | ok | 2s | 4 | 0 | 11 | 2 | 2 | 0 | data/raw/source-snapshots/asharqia-chamber-events-2026-09-17T07-59-26-046Z.html |  |
| qassim-chamber-events | ok | 7s | 3 | 0 | 0 | 0 | 3 | 0 | data/raw/source-snapshots/qassim-chamber-events-2026-09-17T07-59-26-046Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 403. |
| umm-al-qura-events | ok | 11s | 3 | 0 | 6 | 3 | 0 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-09-17T07-59-26-046Z.html |  |
| jouf-university-programs | ok | 3s | 0 | 0 | 1 | 0 | 0 | 0 | data/raw/source-snapshots/jouf-university-programs-2026-09-17T07-59-26-046Z.html | No future date-complete candidates found by the conservative extractor. |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-09-17T07-59-26-046Z.html |  |
| hayy-jameel-events | ok | 255s | 22 | 0 | 0 | 0 | 22 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-09-17T07-59-26-046Z.html |  |
| saudicon-events | ok | 37s | 24 | 0 | 12 | 23 | 1 | 1 | data/raw/source-snapshots/saudicon-events-2026-09-17T07-59-26-046Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-09-22T15:56:46.259Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-09-18T15:56:46.259Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-09-22T15:56:46.259Z |
| visit-saudi-calendar-pdf | declared-cadence | 168h | 2026-09-22T15:56:46.259Z |
| saudi-university-events | declared-cadence | 720h | 2026-10-15T15:56:46.259Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-09-18T15:56:46.259Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-09-22T15:56:46.259Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-09-22T15:56:46.259Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-09-18T15:56:46.259Z |
| tabuk-chamber-events | zero-yield-cooldown | 72h | 2026-09-18T15:56:46.259Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-09-18T15:56:46.259Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-09-18T15:56:46.259Z |
| qassim-university-events | declared-cadence | 168h | 2026-09-22T15:56:46.259Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-09-18T15:56:46.259Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-09-22T15:56:46.259Z |
| kau-events | zero-yield-cooldown | 72h | 2026-09-18T15:56:46.259Z |
