# INC-001 — Core relay service is down (gateway/telegram).

Opened at: 2026-02-27T21:06:38.338Z

## Symptoms
- Core relay service is down (gateway/telegram).

## Suspected Cause
- To be validated by on-call.

## Impact
- Operational reporting may be degraded or delayed.

## Proposed Corrective Action
- Restore failing service (gateway/telegram) or refresh stale state path.
- Re-run scheduler tick and validate alerts clear.

## Verification Steps
- Confirm `ops/live-ops-state.json` updated in last 5 minutes.
- Confirm `reports/alerts-status.json` returns status OK/WARN (not CRIT).
- Confirm Telegram summary tick delivered to 03-Reports.

## Evidence Links
- `ops/live-ops-state.json`
- `reports/alerts-status.json`
- `reports/alerts-status.md`
