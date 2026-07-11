# EventLive Source Radars

Generated at: 2026-07-11T04:49:42.364Z

## Policy

- Radars are source-evidence and parser-lab jobs.
- They must not auto-publish catalog events.
- Scheduled failures are recorded as degraded evidence unless strict mode is enabled.

## Totals

- Radars: 5
- OK: 3
- Failed: 2
- Strict: false

## Runs

| Radar | Status | Duration | Policy | Reports |
| --- | --- | --- | --- | --- |
| Platinumlist Saudi City Radar | timeout | 240s | candidate-only; city coverage evidence; no auto-publish | reports/platinumlist-platform-radar.json, reports/platinumlist-platform-radar.md |
| Platinumlist City Detail Radar | timeout | 240s | candidate-only; secondary official verification required; no auto-publish | reports/platinumlist-detail-radar.json, reports/platinumlist-detail-radar.md |
| Official Multi-Session Agenda Radar | ok | 2s | source-evidence; agenda readiness; no auto-publish | reports/source-official-agenda-radar.json, reports/source-official-agenda-radar.md |
| Strategic Platform Source Radar | ok | 48s | source-evidence; API-surface mapping; no auto-publish | reports/source-strategic-platform-radar.json, reports/source-strategic-platform-radar.md |
| GOV.SA / NEC Wayback Radar | ok | 12s | source-evidence; no auto-publish | reports/mygov-wayback-radar.json, reports/mygov-wayback-radar.md |
