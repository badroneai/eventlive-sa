# EventLive Source Collection Report

- collected_at: 2026-09-27T08:30:27.285Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 32
- sources_attempted: 32
- sources_deferred: 16
- ended_min_year: 2022
- candidates_discovered: 239
- candidates_written: 441
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 331

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 29 | 0 | 0 | 16 | 13 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-09-27T08-30-27-285Z.json |  |
| moc-cultural-calendar | error | 2s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| mos-events | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; live browser recovery deferred by recent failed probe cooldown |
| experience-alula-events | ok | 2s | 8 | 0 | 3 | 0 | 8 | 0 | data/raw/source-snapshots/experience-alula-events-2026-09-27T08-30-27-285Z.html |  |
| mdlbeast-events | ok | 0s | 3 | 0 | 36 | 0 | 3 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-09-27T08-30-27-285Z.html |  |
| monshaat-events | error | 42s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-09-27T08-30-27-285Z.html |  |
| rfecc-whats-on | ok | 5s | 3 | 0 | 17 | 0 | 3 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-09-27T08-30-27-285Z.html |  |
| eye-of-riyadh-events | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 403 |
| eventbrite-saudi | skipped | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | Discovery-only source unavailable in this run: HTTP 405 |
| tuwaiq-academy-bootcamps | error | 0s | 0 | 0 | 0 | 0 | 0 | 0 | - | HTTP 403 |
| future-skills-catalog | error | 55s | 0 | 0 | 0 | 0 | 0 | 0 | - | The operation was aborted due to timeout; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://futureskills.mcit.gov.sa/ar/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_id=All&field_training_course_level_target_id=All&field_related_skills_target_id=All&field_course_type_value=All&field_training_delivery_value=All&field_training_city_target_id=All&field_job_market_target_id=All", waiting until "domcontentloaded"
 |
| visit-saudi-seasons | ok | 0s | 16 | 0 | 0 | 0 | 16 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-09-27T08-30-27-285Z.json |  |
| misk-hub-programs | ok | 2s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-09-27T08-30-27-285Z.html |  |
| dhahran-expo-calendar | ok | 0s | 11 | 0 | 11 | 0 | 11 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-09-27T08-30-27-285Z.html |  |
| ithra-events | ok | 1s | 75 | 0 | 181 | 5 | 70 | 0 | data/raw/source-snapshots/ithra-events-2026-09-27T08-30-27-285Z.json |  |
| misk-hub-events | ok | 1s | 0 | 0 | 5 | 0 | 0 | 0 | data/raw/source-snapshots/misk-hub-events-2026-09-27T08-30-27-285Z.html | No future date-complete candidates found by the conservative extractor. |
| saudi-pro-league-fixtures | error | 1s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-09-27T08-30-27-285Z.json |  |
| visit-saudi-calendar-pdf | ok | 28s | 35 | 0 | 27 | 0 | 35 | 0 | data/raw/source-snapshots/visit-saudi-calendar-pdf-2026-09-27T08-30-27-285Z.xml | Recovered via direct-pdf official evidence. |
| moc-cultural-subportals | error | 42s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; fetch failed |
| saudi-water-authority-events | ok | 11s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/saudi-water-authority-events-2026-09-27T08-30-27-285Z.html | No future date-complete candidates found by the conservative extractor. |
| riyadh-city-events | ok | 14s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-09-27T08-30-27-285Z.html | No future date-complete candidates found by the conservative extractor. |
| sdaia-calendar-events | ok | 11s | 0 | 0 | 2 | 0 | 0 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-09-27T08-30-27-285Z.html | No future date-complete candidates found by the conservative extractor. |
| scega-exhibitions-conferences | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-09-27T08-30-27-285Z.json |  |
| asharqia-chamber-events | ok | 4s | 4 | 0 | 11 | 0 | 4 | 0 | data/raw/source-snapshots/asharqia-chamber-events-2026-09-27T08-30-27-285Z.html |  |
| qassim-chamber-events | ok | 7s | 3 | 0 | 0 | 0 | 3 | 0 | data/raw/source-snapshots/qassim-chamber-events-2026-09-27T08-30-27-285Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 403. |
| umm-al-qura-events | ok | 10s | 3 | 0 | 6 | 3 | 0 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-09-27T08-30-27-285Z.html |  |
| jouf-university-programs | ok | 6s | 0 | 0 | 1 | 0 | 0 | 0 | data/raw/source-snapshots/jouf-university-programs-2026-09-27T08-30-27-285Z.html | No future date-complete candidates found by the conservative extractor. |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-09-27T08-30-27-285Z.html |  |
| hayy-jameel-events | ok | 241s | 11 | 0 | 0 | 1 | 10 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-09-27T08-30-27-285Z.html |  |
| saudicon-events | ok | 8s | 27 | 0 | 12 | 3 | 24 | 3 | data/raw/source-snapshots/saudicon-events-2026-09-27T08-30-27-285Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-09-29T15:58:13.006Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-09-28T23:12:37.041Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-09-29T15:58:13.006Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-09-28T23:12:37.041Z |
| saudi-university-events | declared-cadence | 720h | 2026-10-15T15:56:46.259Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-09-28T23:12:37.041Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-09-29T15:58:13.006Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-09-29T15:58:13.006Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-09-28T23:12:37.041Z |
| tabuk-chamber-events | zero-yield-cooldown | 72h | 2026-09-28T23:12:37.041Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-09-28T23:12:37.041Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-09-28T23:12:37.041Z |
| qassim-university-events | declared-cadence | 168h | 2026-09-29T15:58:13.006Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-09-28T23:12:37.041Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-09-29T15:58:13.006Z |
| kau-events | zero-yield-cooldown | 72h | 2026-09-28T23:12:37.041Z |
