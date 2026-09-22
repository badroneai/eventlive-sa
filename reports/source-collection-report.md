# EventLive Source Collection Report

- collected_at: 2026-09-22T07:47:14.614Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 17
- sources_attempted: 17
- sources_deferred: 31
- ended_min_year: 2022
- candidates_discovered: 194
- candidates_written: 454
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 258

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 2s | 33 | 0 | 0 | 18 | 15 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-09-22T07-47-14-614Z.json |  |
| experience-alula-events | ok | 4s | 5 | 0 | 3 | 0 | 5 | 0 | data/raw/source-snapshots/experience-alula-events-2026-09-22T07-47-14-614Z.html |  |
| mdlbeast-events | ok | 0s | 3 | 0 | 36 | 1 | 2 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-09-22T07-47-14-614Z.html |  |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-09-22T07-47-14-614Z.html |  |
| rfecc-whats-on | ok | 17s | 3 | 0 | 17 | 0 | 3 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-09-22T07-47-14-614Z.html |  |
| visit-saudi-seasons | ok | 0s | 17 | 0 | 0 | 0 | 17 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-09-22T07-47-14-614Z.json |  |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-09-22T07-47-14-614Z.html |  |
| dhahran-expo-calendar | ok | 1s | 11 | 0 | 11 | 0 | 11 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-09-22T07-47-14-614Z.html |  |
| ithra-events | ok | 1s | 93 | 0 | 165 | 15 | 78 | 0 | data/raw/source-snapshots/ithra-events-2026-09-22T07-47-14-614Z.json |  |
| saudi-space-agency-events | ok | 1s | 1 | 0 | 14 | 0 | 1 | 0 | data/raw/source-snapshots/saudi-space-agency-events-2026-09-22T07-47-14-614Z.json |  |
| riyadh-city-events | ok | 14s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/riyadh-city-events-2026-09-22T07-47-14-614Z.html | No future date-complete candidates found by the conservative extractor. |
| scega-exhibitions-conferences | ok | 2s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-09-22T07-47-14-614Z.json |  |
| asharqia-chamber-events | error | 51s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/Pages/AllChamberEvents.aspx", waiting until "domcontentloaded"
 |
| qassim-chamber-events | ok | 7s | 3 | 0 | 0 | 0 | 3 | 0 | data/raw/source-snapshots/qassim-chamber-events-2026-09-22T07-47-14-614Z.html | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 403. |
| umm-al-qura-events | ok | 11s | 1 | 0 | 7 | 0 | 1 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-09-22T07-47-14-614Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-09-22T07-47-14-614Z.html |  |
| hayy-jameel-events | ok | 310s | 14 | 0 | 0 | 0 | 14 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-09-22T07-47-14-614Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| moc-cultural-calendar | error-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| mos-events | error-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| monshaat-events | error-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| eye-of-riyadh-events | discovery-daily | 24h | 2026-09-22T08:16:56.783Z |
| eventbrite-saudi | discovery-daily | 24h | 2026-09-22T08:16:56.783Z |
| tuwaiq-academy-bootcamps | error-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| future-skills-catalog | zero-yield-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-09-22T15:56:46.259Z |
| sdaia-academy-programs | zero-yield-cooldown | 72h | 2026-09-22T13:41:05.647Z |
| misk-hub-events | zero-yield-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-09-22T15:56:46.259Z |
| saudi-pro-league-fixtures | error-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| visit-saudi-calendar-pdf | declared-cadence | 168h | 2026-09-22T15:56:46.259Z |
| moc-cultural-subportals | error-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| discover-aseer-events | zero-yield-cooldown | 72h | 2026-09-22T13:41:05.647Z |
| saudi-water-authority-events | zero-yield-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| saudi-university-events | declared-cadence | 720h | 2026-10-15T15:56:46.259Z |
| sfda-events | zero-yield-cooldown | 72h | 2026-09-22T13:41:05.647Z |
| sdaia-calendar-events | zero-yield-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-09-22T15:56:46.259Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-09-22T15:56:46.259Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-09-22T13:41:05.647Z |
| tabuk-chamber-events | zero-yield-cooldown | 72h | 2026-09-22T13:41:05.647Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-09-22T13:41:05.647Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-09-22T13:41:05.647Z |
| qassim-university-events | declared-cadence | 168h | 2026-09-22T15:56:46.259Z |
| jouf-university-programs | zero-yield-cooldown | 24h | 2026-09-22T08:16:56.783Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-09-22T13:41:05.647Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-09-22T15:56:46.259Z |
| kau-events | zero-yield-cooldown | 72h | 2026-09-22T13:41:05.647Z |
| saudicon-events | discovery-daily | 24h | 2026-09-22T08:16:56.783Z |
