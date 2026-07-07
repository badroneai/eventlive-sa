# Source Acquisition Mechanism Transfer: Cafe Platforms To EventLive

Generated: 2026-07-05

## Why This Matters

The cafe projects did not treat HungerStation, TryOrder, Jahez, ToYou, or TheChefz as one-off scrapers. They used platform-specific experiments to learn source boundaries, fetchability, hidden payloads, tenant context, checkpoints, consolidation, and audit. EventLive needs the same operating discipline for event sources.

This report records the mechanisms inspected and the EventLive adaptations implemented.

For the new browser-level capability, see `reports/source-browser-acquisition-foundation.md`.

## Mechanisms Studied

| Cafe / HS mechanism | What it does | EventLive adaptation |
|---|---|---|
| Discovery wave | Finds vendors by city/district before any detail extraction. | Source collectors first discover official event rows and detail URLs. |
| Filtering wave | Filters coffee-relevant vendors before extraction. | EventLive filters for future, Saudi-relevant, date-complete event candidates. |
| Detail extraction | Vendor page payload is the production payload, not listing text. | Listing pages are discovery; official detail pages and embedded JSON are evidence. |
| One file per target | Each shop dump is independently saved, allowing resume and audit. | `reports/source-collection-checkpoint.json` is written after every source. |
| Consolidation | Raw dumps become canonical Master records only after normalization. | Raw source rows become source candidates, then guarded catalog events. |
| Delta/pulse | Re-reading a baseline shows new, refreshed, and missing records. | Source collection report now records `new_candidates`, `refreshed_candidates`, and `missing_from_latest_run`. |
| Chain dedupe | Same-chain menu duplication is reused but branch metadata is preserved. | EventLive uses stable candidate keys and preserves approved linked records when source listings change. |
| Audit before close | A wave is not done until sampled live evidence passes. | Source families should be marked stable only after source reports, state ledger, and sample checks pass. |
| Source policy | Protected/app-only lanes are not forced through scraping. | Partnership/API-only sources remain out of direct auto-publish collectors. |

## Implemented In EventLive

- `scripts/collect-source-candidates.mjs`
  - Writes `reports/source-collection-checkpoint.json` after every source attempt.
  - Computes per-source collection delta with baseline key `source_url + title + start_date`.
  - Preserves approved catalog-linked candidates even when no longer present in the latest source listing.

- `scripts/source-collection-delta-regression-test.mjs`
  - Protects new/refreshed/missing/approved-preserved delta behavior.

- `scripts/source-run-state.mjs`
  - Builds a durable per-source run ledger in `data/source_run_state.json`.

- `EVENTME-SOURCE-OPERATING-MODEL.md`
  - Defines the EventLive source wave:
    `discover -> filter -> extract -> consolidate -> report -> audit -> close`.

- `scripts/generate-site.mjs`
  - Publishes `dist/source-run-state.json` when the source state exists.

## Not Copied

- No bot-protection bypass was copied.
- No direct HungerStation-specific implementation was copied.
- No discovery-only source was moved into direct publication.

## Operating Decision

EventLive source acquisition should now be treated as periodic waves, not isolated extractor fixes. A source is ready only when it has:

1. allowed public collection boundary,
2. raw evidence/snapshot,
3. normalized future date-complete candidates,
4. per-run delta,
5. source run state,
6. candidate-level publication decision,
7. sample audit before being called stable.
