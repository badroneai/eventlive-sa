# EventLive Data QA (Production Grade) — Window 1
- Before: rows=3, errors=0, error_rate=0.0%
- After: rows=8, errors=13, error_rate=162.5%
- Delta errors: 13

## Gate Decision
- FAIL (expected on noisy batch; use as hard gate for production inputs)

## Notes
- Required/schema/chronology checks are active via validate + threshold gate.
- Keep production feed blocked when error_rate > 0% unless explicit override.