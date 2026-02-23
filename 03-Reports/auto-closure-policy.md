# Auto-Closure Policy — 24h Stability Cycle

To prevent follow-up gaps:
1. At the end of each 24h cycle, publish closure immediately (without waiting for request).
2. Closure must include: success/fail counts, run times, incidents, final decision.
3. Publish two files in `03-Reports/`:
   - detailed closure report
   - 5-line executive summary
4. If any failure appears, open incident in `04-Incidents/` in the same cycle.
