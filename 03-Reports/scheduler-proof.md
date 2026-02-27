# Scheduler Proof — Sprint-2 Autopilot

## Mechanism
- **Type:** Windows Scheduled Task
- **Task name:** `EventLive-Sprint2-Tick`
- **Frequency:** every **15 minutes**
- **Command:**
  - `powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\pc\.openclaw\workspace\eventlive-sa\scripts\sprint2-runner.ps1`

## Setup Steps (applied)
1. Created task:
   - `schtasks /Create /SC MINUTE /MO 15 /TN "EventLive-Sprint2-Tick" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\pc\.openclaw\workspace\eventlive-sa\scripts\sprint2-runner.ps1" /F`
2. Triggered first automatic run:
   - `schtasks /Run /TN "EventLive-Sprint2-Tick"`
3. Verified task status/logs:
   - `schtasks /Query /TN "EventLive-Sprint2-Tick" /V /FO LIST`
   - log file: `ops/scheduler-task.log`

## How to Verify It Is Running
- Check scheduler metadata:
  - `schtasks /Query /TN "EventLive-Sprint2-Tick" /V /FO LIST`
  - expected: `Last Result: 0`, status `Ready`, and future `Next Run Time`.
- Check runtime log file:
  - `ops/scheduler-task.log`
  - expected markers: `TASK_START`, tick output, then `SCHEDULER_OK ✅`.

## Log Snippet (text evidence)
```text
[2026-02-28T00:06:20] TASK_START
LIVE_OPS_STATE_OK ops/live-ops-state.json
ALERT_RULES_EVAL_OK WARN
TICK 2026-02-27T21:06:20.384Z | status: WARN | last_commit: d732170 | alerts: 3
[2026-02-28T00:06:25] SCHEDULER_OK ✅
```

## Expected Timing
- Tick cadence: every 15 minutes.
- Generated artifacts per tick:
  - `ops/live-ops-state.json`
  - `reports/alerts-status.json`
  - `reports/alerts-status.md`
  - `03-Reports/live-ops-state.md`
  - `ops/scheduler-ticks.log`

## Telegram Output Note
- Tick summary line is emitted via `openclaw system event --mode now` when CLI route is available.
- Fallback evidence is persisted in `ops/scheduler-ticks.log`.
