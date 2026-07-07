# EventLive Data QA Negative Control — Noisy Batch
- Before: rows=5, errors=0, error_rate=0.0%
- Noisy batch: rows=2, errors=10, error_rate=500.0%
- Delta errors: 10

## Gate Decision
- PASS: noisy batch was blocked as expected.

## Notes
- This is a negative control, not the production publish gate.
- Use this to prove bad incoming batches fail closed before they reach the public catalog.
