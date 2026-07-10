# EventLive Source Radars

Generated at: 2026-07-10T11:01:23.671Z

## Policy

- Radars are source-evidence and parser-lab jobs.
- They must not auto-publish catalog events.
- Scheduled failures are recorded as degraded evidence unless strict mode is enabled.

## Totals

- Radars: 3
- OK: 2
- Failed: 1
- Strict: false

## Runs

| Radar | Status | Duration | Policy | Reports |
| --- | --- | --- | --- | --- |
| Official Multi-Session Agenda Radar | ok | 2s | source-evidence; agenda readiness; no auto-publish | reports/source-official-agenda-radar.json, reports/source-official-agenda-radar.md |
| Strategic Platform Source Radar | ok | 11s | source-evidence; API-surface mapping; no auto-publish | reports/source-strategic-platform-radar.json, reports/source-strategic-platform-radar.md |
| GOV.SA / NEC Wayback Radar | failed | 60s | source-evidence; no auto-publish | reports/mygov-wayback-radar.json, reports/mygov-wayback-radar.md |
