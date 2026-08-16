# EventLive Source Collection Report

- collected_at: 2026-08-16T07:16:31.258Z
- dry_run: false
- time_scope: current-and-upcoming-only
- ended_collection_enabled: false
- sources_seen: 88
- sources_runnable: 48
- sources_due: 20
- sources_attempted: 20
- sources_deferred: 28
- ended_min_year: 2022
- candidates_discovered: 234
- candidates_written: 581
- ended_events_discovered: 0
- ended_events_written: 0
- ended_events_preserved: 762
- past_rows_skipped: 241

| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | 0s | 28 | 0 | 0 | 18 | 10 | 0 | data/raw/source-snapshots/visit-saudi-calendar-2026-08-16T07-16-31-258Z.json |  |
| experience-alula-events | ok | 1s | 9 | 0 | 3 | 0 | 9 | 0 | data/raw/source-snapshots/experience-alula-events-2026-08-16T07-16-31-258Z.html |  |
| mdlbeast-events | ok | 0s | 3 | 0 | 38 | 0 | 3 | 0 | data/raw/source-snapshots/mdlbeast-events-2026-08-16T07-16-31-258Z.html |  |
| invest-saudi-events | ok | 1s | 3 | 0 | 5 | 0 | 3 | 0 | data/raw/source-snapshots/invest-saudi-events-2026-08-16T07-16-31-258Z.html |  |
| rfecc-whats-on | ok | 16s | 6 | 0 | 14 | 0 | 6 | 0 | data/raw/source-snapshots/rfecc-whats-on-2026-08-16T07-16-31-258Z.html |  |
| future-skills-catalog | ok | 18s | 3 | 0 | 9 | 0 | 3 | 0 | data/raw/source-snapshots/future-skills-catalog-2026-08-16T07-16-31-258Z.html |  |
| visit-saudi-seasons | ok | 0s | 18 | 0 | 0 | 0 | 18 | 0 | data/raw/source-snapshots/visit-saudi-seasons-2026-08-16T07-16-31-258Z.json |  |
| misk-hub-programs | ok | 3s | 5 | 0 | 0 | 0 | 5 | 0 | data/raw/source-snapshots/misk-hub-programs-2026-08-16T07-16-31-258Z.html |  |
| dhahran-expo-calendar | ok | 1s | 16 | 0 | 8 | 0 | 16 | 0 | data/raw/source-snapshots/dhahran-expo-calendar-2026-08-16T07-16-31-258Z.html |  |
| ithra-events | ok | 1s | 67 | 0 | 160 | 0 | 67 | 0 | data/raw/source-snapshots/ithra-events-2026-08-16T07-16-31-258Z.json |  |
| sdaia-academy-programs | ok | 65s | 0 | 0 | 0 | 0 | 0 | 0 | data/raw/source-snapshots/sdaia-academy-programs-2026-08-16T07-16-31-258Z.html | No future date-complete candidates found by the conservative extractor. |
| misk-hub-events | ok | 2s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/misk-hub-events-2026-08-16T07-16-31-258Z.html |  |
| discover-aseer-events | ok | 2s | 34 | 0 | 0 | 0 | 34 | 0 | data/raw/source-snapshots/discover-aseer-events-2026-08-16T07-16-31-258Z.html |  |
| saudi-water-authority-events | ok | 1s | 8 | 0 | 1 | 0 | 8 | 0 | data/raw/source-snapshots/saudi-water-authority-events-2026-08-16T07-16-31-258Z.html |  |
| sdaia-calendar-events | ok | 10s | 2 | 0 | 1 | 0 | 2 | 0 | data/raw/source-snapshots/sdaia-calendar-events-2026-08-16T07-16-31-258Z.html |  |
| scega-exhibitions-conferences | ok | 7s | 4 | 0 | 0 | 0 | 4 | 0 | data/raw/source-snapshots/scega-exhibitions-conferences-2026-08-16T07-16-31-258Z.json |  |
| asharqia-chamber-events | error | 51s | 0 | 0 | 0 | 0 | 0 | 0 | - | fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/Pages/AllChamberEvents.aspx", waiting until "domcontentloaded"
 |
| umm-al-qura-events | ok | 9s | 8 | 0 | 2 | 0 | 8 | 0 | data/raw/source-snapshots/umm-al-qura-events-2026-08-16T07-16-31-258Z.html |  |
| madinah-architecture-festival | ok | 1s | 1 | 0 | 0 | 0 | 1 | 0 | data/raw/source-snapshots/madinah-architecture-festival-2026-08-16T07-16-31-258Z.html |  |
| hayy-jameel-events | ok | 168s | 18 | 0 | 0 | 0 | 18 | 0 | data/raw/source-snapshots/hayy-jameel-events-2026-08-16T07-16-31-258Z.html |  |

## Deferred By Adaptive Cadence

| Source | Reason | Interval | Next due |
|---|---|---:|---|
| moc-cultural-calendar | error-cooldown | 24h | 2026-08-16T07:18:29.989Z |
| mos-events | error-cooldown | 24h | 2026-08-16T07:18:29.989Z |
| monshaat-events | error-cooldown | 24h | 2026-08-16T07:18:29.989Z |
| eye-of-riyadh-events | discovery-daily | 24h | 2026-08-16T07:18:29.989Z |
| eventbrite-saudi | discovery-daily | 24h | 2026-08-16T07:18:29.989Z |
| tuwaiq-academy-bootcamps | error-cooldown | 24h | 2026-08-16T07:18:29.989Z |
| code-mcit-programs | zero-yield-cooldown | 168h | 2026-08-18T02:32:28.692Z |
| jcci-events-center | zero-yield-cooldown | 168h | 2026-08-18T02:32:28.692Z |
| saudi-pro-league-fixtures | error-cooldown | 24h | 2026-08-16T07:18:29.989Z |
| saudi-space-agency-events | error-cooldown | 24h | 2026-08-16T07:18:29.989Z |
| visit-saudi-calendar-pdf | declared-cadence | 168h | 2026-08-16T19:20:58.392Z |
| moc-cultural-subportals | error-cooldown | 24h | 2026-08-16T07:18:29.989Z |
| saudi-university-events | declared-cadence | 720h | 2026-09-09T13:49:51.211Z |
| sfda-events | zero-yield-cooldown | 24h | 2026-08-16T18:51:37.461Z |
| riyadh-city-events | error-cooldown | 6h | 2026-08-16T08:01:20.453Z |
| makkah-chamber-events | zero-yield-cooldown | 168h | 2026-08-18T02:32:28.692Z |
| qassim-chamber-events | zero-yield-cooldown | 24h | 2026-08-16T07:18:29.989Z |
| abha-chamber-events | zero-yield-cooldown | 168h | 2026-08-18T02:32:28.692Z |
| northern-borders-chamber-events | zero-yield-cooldown | 72h | 2026-08-18T07:18:29.989Z |
| tabuk-chamber-events | zero-yield-cooldown | 72h | 2026-08-18T18:51:37.461Z |
| jazan-chamber-events | zero-yield-cooldown | 72h | 2026-08-18T18:51:37.461Z |
| najran-municipality-summer-events | zero-yield-cooldown | 72h | 2026-08-16T19:44:53.896Z |
| qassim-university-events | declared-cadence | 168h | 2026-08-18T02:32:28.692Z |
| jouf-university-programs | declared-cadence | 168h | 2026-08-18T02:32:28.692Z |
| madinah-chamber-events | zero-yield-cooldown | 72h | 2026-08-18T18:51:37.461Z |
| informa-connect-saudi-events | declared-cadence | 168h | 2026-08-18T02:32:28.692Z |
| kau-events | zero-yield-cooldown | 24h | 2026-08-16T07:18:29.989Z |
| saudicon-events | discovery-daily | 24h | 2026-08-16T07:18:29.989Z |
