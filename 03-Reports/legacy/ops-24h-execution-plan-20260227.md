# 24h Execution Plan — Product Value Track (2026-02-27)

## Objective (24h)
Ship real product value (not landing-only):
1. Live Ops state API + dashboard cards backed by real checks.
2. Alert rules engine with warning/critical thresholds and ack flow.
3. Incident timeline auto-log with exportable markdown report.

## Current Baseline (Started)
- Release-safety schema gates already enforced in CI.
- Environment matrix verification script added: `npm run env:matrix`.
- First run result:
  - ENV 001: OK (`https://badroneai.github.io/eventlive-sa/`)
  - ENV 002: NOT_CONFIGURED
  - ENV 003: NOT_CONFIGURED

## Execution Blocks (2-hour sprints)

### Sprint 1 (T+0 → T+2)
- Deliver environment matrix health check artifact.
- Define canonical env variables for 001/002/003.
- Emit report files:
  - `reports/environment-matrix-status.md`
  - `reports/environment-matrix-status.json`

**Done when:** 001/002/003 status is visible in one report.

### Sprint 2 (T+2 → T+4)
- Implement `scripts/live-ops-state.mjs` to aggregate:
  - uptime outcome
  - stability outcome
  - release verdict
  - schema suite outcome
- Output machine-readable `reports/live-ops-state.json`.

**Done when:** one command builds a real-time state snapshot.

### Sprint 3 (T+4 → T+6)
- Implement alert rule evaluator (`scripts/alert-rules-eval.mjs`).
- Rules v1:
  - env not configured / env down
  - release verdict != PASS
  - stability latency over threshold
- Emit alert feed markdown + json.

**Done when:** alerts generated automatically from current state.

### Sprint 4 (T+6 → T+8)
- Implement incident timeline generator (`scripts/incident-timeline.mjs`).
- Export markdown report in `04-Incidents/`.

**Done when:** one command creates a complete incident timeline template with observed events.

### Sprint 5 (T+8 → T+12)
- Add npm scripts + optional CI dry-run step for Live Ops + alerts.
- Add minimal dashboard binding (cards + alert list) to show real outputs.

**Done when:** UI reads generated files and shows current operational status.

### Sprint 6 (T+12 → T+24)
- Hardening: tests, failure injection, docs, and final ops report.
- Confirm env 002/003 once URLs are provided.

**Done when:** full flow demo (state → alert → incident report) works end-to-end.

## Alerting Cadence
- Progress update every 2 hours:
  - completed
  - in-progress
  - blockers
  - next sprint
- Immediate risk alerts:
  - sprint delay > 45 min
  - critical check failure
  - env outage > 10 min

## Required Inputs to Unblock Full Env Verification
- `EVENTLIVE_ENV_002_URL`
- `EVENTLIVE_ENV_003_URL`

Without these two values, only 001 can be verified as healthy.
