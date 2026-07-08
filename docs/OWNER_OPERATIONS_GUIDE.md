# EventLive Owner Operations Guide

This guide keeps EventLive operated by evidence instead of verbal confidence.

## Daily Checks

| Check | Command | Expected |
| --- | --- | --- |
| Full local gate | `npm run pipeline` | Command exits 0. |
| Launch preflight | `npm run launch:preflight` | Reports PASS. |
| Source sync health | `npm run sources:state` | Source run state report updates. |
| Owner command center | `npm run owner:command-center` | Command center reflects latest reports. |

## Readiness Rule

Use `reports/delivery-readiness-standard-status.md` as the authority. The product is not fully ready while its release verdict is `NOT_READY`.

## Owner-Only Surfaces

The following remain owner/operator surfaces and should not be exposed in public navigation:

- `sources.html`
- `methodology.html`
- `trust.html`
- `events.json`
- candidate and resolver pages

## Release Rule

No commit/push/deploy should be treated as final until:

- `npm run pipeline` passes.
- `npm run launch:preflight` passes.
- The owner accepts any remaining non-PASS gates in writing.
