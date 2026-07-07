# EventLive Data QA (Production Gate) — Window 1
- Catalog validation: PASS (rows=5, errors=0, error_rate=0.0%)
- Public dist quality: PASS
- Events: 365
- Upcoming/active: 99
- Ended: 266
- Live-ready: 50
- Cities: 19
- Categories: 12
- Local images: 365

## Gate Decision
- PASS

## Notes
- This is the production publish gate for the canonical catalog and generated public site.
- The noisy-batch fail-closed check moved to `npm run qa:prod:noisy`.
